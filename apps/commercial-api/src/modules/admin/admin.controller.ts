import {
  Inject,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { MoneyCentsSchema } from "@camacho-pos-comercial/contracts";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { AdminGuard } from "../../common/auth/admin.guard.js";
import type { BridgedSession } from "../../common/auth/session-bridge.service.js";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AuditService } from "../audit/audit.service.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { ContentService } from "../content/content.service.js";
import { PromotionsService } from "../promotions/promotions.service.js";
import { SupportService } from "../support/support.service.js";

const LeadStatusFilter = z
  .enum(["NEW", "CONTACTED", "QUALIFIED", "DEMO_SCHEDULED", "WON", "LOST", "ARCHIVED"])
  .optional();
const OrderStatusFilter = z
  .enum([
    "PENDING_PAYMENT",
    "PAID",
    "PROVISIONING",
    "FULFILLED",
    "CANCELLED",
    "REFUNDED",
    "FAILED",
  ])
  .optional();
const PaymentStatusFilter = z
  .enum([
    "PENDING",
    "REQUIRES_ACTION",
    "AUTHORIZED",
    "PAID",
    "FAILED",
    "CANCELLED",
    "REFUNDED",
  ])
  .optional();

const UpdatePriceSchema = z
  .object({
    amountCents: MoneyCentsSchema,
    publish: z.boolean().optional().default(false),
  })
  .strict();

const PatchPlanSchema = z
  .object({
    name: z.string().min(1).optional(),
    tagline: z.string().nullable().optional(),
    description: z.string().min(1).optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict();

const UpsertFeatureSchema = z
  .object({
    code: z.string().min(1),
    label: z.string().min(1),
    description: z.string().nullable().optional(),
    commercialStatus: z
      .enum(["AVAILABLE", "IN_CERTIFICATION", "COMING_SOON", "UNPUBLISHED"])
      .optional(),
    claimNote: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict();

const ProductCreateSchema = z
  .object({
    slug: z.string().min(1),
    sku: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    kind: z.enum(["SOFTWARE_LICENSE", "HARDWARE", "KIT", "ACCESSORY", "SERVICE"]),
    categoryId: z.string().nullable().optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    sortOrder: z.number().int().optional(),
    imageUrl: z.string().optional(),
    imageAlt: z.string().optional(),
    /** Flat fields from admin forms (preferred over nested `variant`). */
    variantSku: z.string().min(1).optional(),
    variantName: z.string().min(1).optional(),
    variantAmountCents: MoneyCentsSchema.optional(),
    quantityOnHand: z.number().int().optional(),
    variant: z
      .object({
        sku: z.string().min(1),
        name: z.string().min(1),
        amountCents: MoneyCentsSchema,
        quantityOnHand: z.number().int().optional(),
      })
      .optional(),
  })
  .strict()
  .transform((raw) => {
    const {
      variantSku,
      variantName,
      variantAmountCents,
      quantityOnHand,
      variant,
      ...rest
    } = raw;
    const resolvedVariant =
      variant ??
      (variantSku && variantName && variantAmountCents != null
        ? {
            sku: variantSku,
            name: variantName,
            amountCents: variantAmountCents,
            ...(quantityOnHand != null ? { quantityOnHand } : {}),
          }
        : undefined);
    return { ...rest, ...(resolvedVariant ? { variant: resolvedVariant } : {}) };
  });

const ProductPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    sortOrder: z.number().int().optional(),
    categoryId: z.string().nullable().optional(),
  })
  .strict();

const ImageSchema = z
  .object({
    url: z.string().min(1),
    alt: z.string().optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict();

const StockSchema = z
  .object({
    quantityOnHand: z.number().int().optional(),
    quantityReserved: z.number().int().optional(),
    trackInventory: z.boolean().optional(),
  })
  .strict();

const KitItemInputSchema = z
  .object({
    productVariantId: z.string().min(1),
    quantity: z.number().int().positive(),
  })
  .strict();

const KitCreateSchema = z
  .object({
    slug: z.string().min(1),
    sku: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    amountCents: MoneyCentsSchema,
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    imageUrl: z.string().optional(),
    imageAlt: z.string().optional(),
    items: z.array(KitItemInputSchema).min(1),
  })
  .strict();

const KitItemsReplaceSchema = z
  .object({
    items: z.array(KitItemInputSchema).min(1),
  })
  .strict();

const KitPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    amountCents: MoneyCentsSchema.optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .strict();

const OrderActionSchema = z
  .object({
    action: z.enum([
      "PREPARE_SHIPMENT",
      "MARK_READY",
      "SHIP",
      "DELIVER",
      "CANCEL",
      "MARK_RETURN_RECEIVED",
      "MANUAL_REFUND_MARK",
    ]),
    carrier: z.string().min(1).optional(),
    trackingCode: z.string().min(1).optional(),
    reason: z.string().max(2000).optional(),
  })
  .strict();

const PromotionCreateSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
  })
  .strict();

const PromotionPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
  })
  .strict();

const CouponCreateSchema = z
  .object({
    code: z.string().min(1),
    type: z.enum(["PERCENT", "FIXED_AMOUNT"]),
    percentOff: z.number().int().min(0).max(100).nullable().optional(),
    amountOffCents: MoneyCentsSchema.nullable().optional(),
    minSubtotalCents: MoneyCentsSchema.nullable().optional(),
    maxRedemptions: z.number().int().nullable().optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    active: z.boolean().optional(),
    promotionId: z.string().nullable().optional(),
  })
  .strict();

const CouponPatchSchema = CouponCreateSchema.partial().omit({ code: true }).strict();

const SettingsPatchSchema = z
  .object({
    brandName: z.string().min(1).optional(),
    whatsappNumber: z.string().min(1).optional(),
    supportEmail: z.string().email().optional(),
    logoUrl: z.string().nullable().optional(),
    promoBannerMessage: z.string().nullable().optional(),
    promoBannerHref: z.string().nullable().optional(),
    promoBannerCta: z.string().nullable().optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
  })
  .strict();

const SocialSchema = z
  .object({
    id: z.string().optional(),
    platform: z.string().min(1),
    url: z.string().url(),
    sortOrder: z.number().int().optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .strict();

const LeadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO_SCHEDULED",
  "WON",
  "LOST",
  "ARCHIVED",
]);

const CrmStatusPatchSchema = z
  .object({
    status: LeadStatusSchema,
    notes: z.string().max(4000).optional(),
  })
  .strict();

const LeadActivityCreateSchema = z
  .object({
    body: z.string().min(1).max(4000),
    type: z.enum(["NOTE", "CALL", "EMAIL", "WHATSAPP", "DEMO"]).optional().default("NOTE"),
  })
  .strict();

const FaqCreateSchema = z
  .object({
    slug: z.string().min(1).max(120),
    question: z.string().min(1),
    answer: z.string().min(1),
    category: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .strict();

const FaqPatchSchema = z
  .object({
    question: z.string().min(1).optional(),
    answer: z.string().min(1).optional(),
    category: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .strict();

const BlogCreateSchema = z
  .object({
    slug: z.string().min(1).max(120),
    title: z.string().min(1),
    body: z.string().min(1),
    excerpt: z.string().nullable().optional(),
    coverImageUrl: z.string().nullable().optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .strict();

const BlogPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    excerpt: z.string().nullable().optional(),
    body: z.string().min(1).optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    publishedAt: z.string().nullable().optional(),
  })
  .strict();

const LegalPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    version: z.string().min(1).optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .strict();

const SeoSchema = z
  .object({
    path: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    ogImageUrl: z.string().nullable().optional(),
    canonicalUrl: z.string().nullable().optional(),
    robots: z.string().nullable().optional(),
  })
  .strict();

const TicketReplySchema = z
  .object({
    body: z.string().min(1),
    status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
  })
  .strict();

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(PromotionsService) private readonly promotions: PromotionsService,
    @Inject(SupportService) private readonly support: SupportService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  private actor(req: { commercialSession?: BridgedSession }): string {
    return req.commercialSession?.subjectId ?? "unknown";
  }

  // ─── Catalog / planes / precios ───────────────────────────────────────────

  @Get("catalog/plans")
  listPlans() {
    return this.catalog.listPlans();
  }

  @Patch("catalog/plans/:id")
  async patchPlan(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = PatchPlanSchema.parse(body);
    const updated = await this.catalog.updatePlanMeta(id, input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PLAN_UPDATED",
      entityType: "Plan",
      entityId: id,
      metadata: input,
    });
    return updated;
  }

  @Post("catalog/plans/:id/features")
  async upsertFeature(
    @Param("id") planId: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = UpsertFeatureSchema.parse(body);
    const feature = await this.catalog.upsertPlanFeature({ planId, ...input });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PLAN_FEATURE_UPSERTED",
      entityType: "PlanFeature",
      entityId: feature.id,
      metadata: input,
    });
    return feature;
  }

  @Patch("catalog/plan-prices/:id")
  async updatePlanPrice(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = UpdatePriceSchema.parse(body);
    const updated = await this.catalog.updatePlanPriceAmount({
      planPriceId: id,
      amountCents: input.amountCents,
      adminId: this.actor(req),
      publish: input.publish,
    });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PLAN_PRICE_UPDATED",
      entityType: "PlanPrice",
      entityId: updated.id,
      metadata: { amountCents: input.amountCents, publish: input.publish, version: updated.version },
    });
    return updated;
  }

  @Get("catalog/kits")
  listKits() {
    return this.catalog.listKits();
  }

  @Post("catalog/kits")
  async createKit(
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = KitCreateSchema.parse(body);
    const created = await this.catalog.createKit({ ...input, adminId: this.actor(req) });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "KIT_CREATED",
      entityType: "Kit",
      entityId: created.id,
      metadata: {
        slug: input.slug,
        amountCents: input.amountCents,
        itemCount: input.items.length,
      },
    });
    return created;
  }

  @Patch("catalog/kits/:id")
  async patchKit(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = KitPatchSchema.parse(body);
    const updated = await this.catalog.updateKit(id, { ...input, adminId: this.actor(req) });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "KIT_UPDATED",
      entityType: "Kit",
      entityId: id,
      metadata: input,
    });
    return updated;
  }

  @Put("catalog/kits/:id/items")
  async replaceKitItems(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = KitItemsReplaceSchema.parse(body);
    const updated = await this.catalog.replaceKitItems(id, input.items);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "KIT_ITEMS_REPLACED",
      entityType: "Kit",
      entityId: id,
      metadata: { itemCount: input.items.length },
    });
    return updated;
  }

  @Get("catalog/products")
  listProducts() {
    return this.catalog.listProductsAdmin();
  }

  @Post("catalog/products")
  async createProduct(
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = ProductCreateSchema.parse(body);
    const created = await this.catalog.createProduct(input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: created.id,
      metadata: { sku: created.sku },
    });
    return created;
  }

  @Patch("catalog/products/:id")
  async patchProduct(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = ProductPatchSchema.parse(body);
    const updated = await this.catalog.updateProduct(id, input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: id,
      metadata: input,
    });
    return updated;
  }

  @Delete("catalog/products/:id")
  async deleteProduct(
    @Param("id") id: string,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const deleted = await this.catalog.softDeleteProduct(id);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PRODUCT_DELETED",
      entityType: "Product",
      entityId: id,
    });
    return deleted;
  }

  @Post("catalog/products/:id/images")
  async addImage(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = ImageSchema.parse(body);
    const image = await this.catalog.addProductImage(id, input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PRODUCT_IMAGE_ADDED",
      entityType: "ProductImage",
      entityId: image.id,
    });
    return image;
  }

  @Delete("catalog/product-images/:id")
  async deleteImage(
    @Param("id") id: string,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const result = await this.catalog.deleteProductImage(id);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PRODUCT_IMAGE_DELETED",
      entityType: "ProductImage",
      entityId: id,
    });
    return result;
  }

  @Patch("catalog/variants/:id/price")
  async patchVariantPrice(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = UpdatePriceSchema.parse(body);
    const updated = await this.catalog.updateVariantPrice({
      variantId: id,
      amountCents: input.amountCents,
      adminId: this.actor(req),
      publish: input.publish,
    });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "VARIANT_PRICE_UPDATED",
      entityType: "ProductVariant",
      entityId: id,
      metadata: input,
    });
    return updated;
  }

  @Get("catalog/inventory")
  listInventory() {
    return this.catalog.listInventory();
  }

  @Patch("catalog/inventory/:variantId")
  async patchInventory(
    @Param("variantId") variantId: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = StockSchema.parse(body);
    const updated = await this.catalog.updateStock(variantId, input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "INVENTORY_UPDATED",
      entityType: "ProductStock",
      entityId: updated.id,
      metadata: input,
    });
    return updated;
  }

  // ─── Pedidos / pagos / clientes ──────────────────────────────────────────

  @Get("pedidos")
  listOrders(@Query("status") statusRaw?: string) {
    const status = OrderStatusFilter.safeParse(statusRaw || undefined).data;
    return this.prisma.order.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      include: {
        customer: { select: { id: true, fullName: true, email: true } },
        items: true,
        payments: {
          select: {
            id: true,
            status: true,
            amountCents: true,
            referenceCode: true,
            provider: true,
            environment: true,
          },
        },
        shipments: true,
        provisioning: { select: { id: true, status: true, lastError: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  @Patch("pedidos/:id")
  async applyOrderAction(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = OrderActionSchema.parse(body);
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        payments: true,
        shipments: { orderBy: { createdAt: "desc" } },
        items: true,
      },
    });
    if (!order) throw new NotFoundException({ code: "ORDER_NOT_FOUND" });

    const actorId = this.actor(req);
    const latestShipment = order.shipments[0] ?? null;
    const hasHardware = order.items.some(
      (item) => Boolean(item.productId) || Boolean(item.productVariantId) || Boolean(item.kitId),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      switch (input.action) {
        case "PREPARE_SHIPMENT":
        case "MARK_READY": {
          if (!["PAID", "PROVISIONING", "FULFILLED"].includes(order.status)) {
            throw new BadRequestException({ code: "ORDER_NOT_READY_FOR_SHIPMENT" });
          }
          if (!hasHardware) {
            throw new BadRequestException({ code: "ORDER_HAS_NO_HARDWARE_LINES" });
          }
          if (latestShipment && !["PENDING", "READY", "CANCELLED"].includes(latestShipment.status)) {
            throw new BadRequestException({ code: "SHIPMENT_ALREADY_IN_TRANSIT" });
          }
          const shipment =
            latestShipment && latestShipment.status !== "CANCELLED"
              ? await tx.shipment.update({
                  where: { id: latestShipment.id },
                  data: {
                    status: "READY",
                    ...(input.carrier ? { carrier: input.carrier } : {}),
                    ...(input.trackingCode ? { trackingCode: input.trackingCode } : {}),
                  },
                })
              : await tx.shipment.create({
                  data: {
                    orderId: order.id,
                    status: "READY",
                    carrier: input.carrier ?? null,
                    trackingCode: input.trackingCode ?? null,
                    amountCents: order.shippingCents,
                  },
                });
          return { order, shipment };
        }
        case "SHIP": {
          if (!latestShipment || !["PENDING", "READY"].includes(latestShipment.status)) {
            throw new BadRequestException({ code: "SHIPMENT_NOT_READY" });
          }
          if (!input.trackingCode && !latestShipment.trackingCode) {
            throw new BadRequestException({ code: "TRACKING_CODE_REQUIRED" });
          }
          const shipment = await tx.shipment.update({
            where: { id: latestShipment.id },
            data: {
              status: "SHIPPED",
              shippedAt: new Date(),
              ...(input.carrier ? { carrier: input.carrier } : {}),
              ...(input.trackingCode ? { trackingCode: input.trackingCode } : {}),
            },
          });
          return { order, shipment };
        }
        case "DELIVER": {
          if (!latestShipment || latestShipment.status !== "SHIPPED") {
            throw new BadRequestException({ code: "SHIPMENT_NOT_SHIPPED" });
          }
          const shipment = await tx.shipment.update({
            where: { id: latestShipment.id },
            data: { status: "DELIVERED", deliveredAt: new Date() },
          });
          const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: { status: "FULFILLED" },
          });
          return { order: updatedOrder, shipment };
        }
        case "CANCEL": {
          if (!["PENDING_PAYMENT", "PAID", "PROVISIONING"].includes(order.status)) {
            throw new BadRequestException({ code: "ORDER_NOT_CANCELLABLE" });
          }
          if (latestShipment && ["SHIPPED", "DELIVERED"].includes(latestShipment.status)) {
            throw new BadRequestException({ code: "SHIPPED_ORDER_NOT_CANCELLABLE" });
          }
          if (latestShipment && latestShipment.status !== "CANCELLED") {
            await tx.shipment.update({
              where: { id: latestShipment.id },
              data: { status: "CANCELLED" },
            });
          }
          const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });
          return { order: updatedOrder, shipment: latestShipment };
        }
        case "MARK_RETURN_RECEIVED": {
          if (!latestShipment || latestShipment.status !== "DELIVERED") {
            throw new BadRequestException({ code: "RETURN_REQUIRES_DELIVERED_SHIPMENT" });
          }
          // Local logistics only — does not move money at Factus.
          const shipment = await tx.shipment.update({
            where: { id: latestShipment.id },
            data: {
              status: "CANCELLED",
              trackingCode: latestShipment.trackingCode
                ? `${latestShipment.trackingCode}|RETURN:${input.reason ?? "received"}`
                : `RETURN:${input.reason ?? "received"}`,
            },
          });
          return { order, shipment, note: "RETURN_RECEIVED_LOCAL_ONLY" };
        }
        case "MANUAL_REFUND_MARK": {
          const paid = order.payments.find((p) => p.status === "PAID") ?? order.payments[0];
          if (!paid) throw new BadRequestException({ code: "PAYMENT_NOT_FOUND" });
          if (paid.provider === "FACTUS_PAY") {
            throw new BadRequestException({
              code: "FACTUS_REFUND_UNSUPPORTED",
              message:
                "Factus Pay no expone reembolso automatizado en este portal. No se simula cobro inverso.",
            });
          }
          if (!["MANUAL", "SANDBOX_MOCK"].includes(paid.provider)) {
            throw new BadRequestException({ code: "REFUND_PROVIDER_NOT_MANUAL" });
          }
          await tx.payment.update({
            where: { id: paid.id },
            data: { status: "REFUNDED" },
          });
          const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: { status: "REFUNDED" },
          });
          return { order: updatedOrder, paymentId: paid.id };
        }
        default:
          throw new BadRequestException({ code: "UNKNOWN_ORDER_ACTION" });
      }
    });

    await this.audit.record({
      actorType: "ADMIN",
      actorId,
      action: `ORDER_${input.action}`,
      entityType: "Order",
      entityId: id,
      metadata: {
        action: input.action,
        reason: input.reason ?? null,
        trackingCode: input.trackingCode ?? null,
      },
    });
    return result;
  }

  @Get("pagos")
  listPayments(@Query("status") statusRaw?: string) {
    const status = PaymentStatusFilter.safeParse(statusRaw || undefined).data;
    return this.prisma.payment.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      include: {
        customer: { select: { id: true, fullName: true, email: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  @Get("clientes")
  async listCustomers(
    @Query("status") statusRaw?: string,
    @Query("q") qRaw?: string,
  ) {
    const status = LeadStatusFilter.safeParse(statusRaw || undefined).data;
    const q = (qRaw ?? "").trim();
    const textFilter = q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};
    const leadWhere = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...textFilter,
    };
    const [contacts, leads, demos, customers] = await Promise.all([
      this.prisma.contactRequest.findMany({
        where: leadWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.lead.findMany({
        where: leadWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.demoRequest.findMany({
        where: leadWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.commercialCustomer.findMany({
        where: {
          deletedAt: null,
          ...(q
            ? {
                OR: [
                  { fullName: { contains: q, mode: "insensitive" as const } },
                  { email: { contains: q, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    return { contacts, leads, demos, customers };
  }

  @Patch("clientes/leads/:id")
  async patchLeadStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = CrmStatusPatchSchema.parse(body);
    const existing = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: "LEAD_NOT_FOUND" });
    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.notes != null ? { notes: input.notes } : {}),
      },
    });
    if (existing.status !== input.status) {
      await this.prisma.leadActivity.create({
        data: {
          leadId: id,
          type: "STATUS_CHANGE",
          body: `Estado ${existing.status} → ${input.status}`,
          actorType: "ADMIN",
          actorId: this.actor(req),
        },
      });
    }
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "LEAD_STATUS_UPDATED",
      entityType: "Lead",
      entityId: id,
      metadata: { from: existing.status, to: input.status },
    });
    return updated;
  }

  @Post("clientes/leads/:id/activities")
  async createLeadActivity(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = LeadActivityCreateSchema.parse(body);
    const existing = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: "LEAD_NOT_FOUND" });
    const activity = await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        type: input.type,
        body: input.body,
        actorType: "ADMIN",
        actorId: this.actor(req),
      },
    });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "LEAD_ACTIVITY_CREATED",
      entityType: "LeadActivity",
      entityId: activity.id,
      metadata: { leadId: id, type: input.type },
    });
    return activity;
  }

  @Patch("clientes/contacts/:id")
  async patchContactStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = CrmStatusPatchSchema.parse(body);
    const existing = await this.prisma.contactRequest.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: "CONTACT_NOT_FOUND" });
    const updated = await this.prisma.contactRequest.update({
      where: { id },
      data: { status: input.status },
    });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "CONTACT_STATUS_UPDATED",
      entityType: "ContactRequest",
      entityId: id,
      metadata: { from: existing.status, to: input.status },
    });
    return updated;
  }

  @Patch("clientes/demos/:id")
  async patchDemoStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = CrmStatusPatchSchema.parse(body);
    const existing = await this.prisma.demoRequest.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: "DEMO_NOT_FOUND" });
    const updated = await this.prisma.demoRequest.update({
      where: { id },
      data: { status: input.status },
    });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "DEMO_STATUS_UPDATED",
      entityType: "DemoRequest",
      entityId: id,
      metadata: { from: existing.status, to: input.status },
    });
    return updated;
  }

  // ─── Promociones / cupones ────────────────────────────────────────────────

  @Get("promociones")
  listPromotions() {
    return this.promotions.listAllAdmin();
  }

  @Post("promociones")
  async createPromotion(
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = PromotionCreateSchema.parse(body);
    const created = await this.promotions.createPromotion(input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PROMOTION_CREATED",
      entityType: "Promotion",
      entityId: created.id,
    });
    return created;
  }

  @Patch("promociones/:id")
  async patchPromotion(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = PromotionPatchSchema.parse(body);
    const updated = await this.promotions.updatePromotion(id, input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PROMOTION_UPDATED",
      entityType: "Promotion",
      entityId: id,
      metadata: input,
    });
    return updated;
  }

  @Delete("promociones/:id")
  async deletePromotion(
    @Param("id") id: string,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const deleted = await this.promotions.softDeletePromotion(id);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "PROMOTION_DELETED",
      entityType: "Promotion",
      entityId: id,
    });
    return deleted;
  }

  @Get("cupones")
  listCoupons() {
    return this.promotions.listCouponsAdmin();
  }

  @Post("cupones")
  async createCoupon(
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = CouponCreateSchema.parse(body);
    const created = await this.promotions.createCoupon(input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "COUPON_CREATED",
      entityType: "Coupon",
      entityId: created.id,
    });
    return created;
  }

  @Patch("cupones/:id")
  async patchCoupon(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = CouponPatchSchema.parse(body);
    const updated = await this.promotions.updateCoupon(id, input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "COUPON_UPDATED",
      entityType: "Coupon",
      entityId: id,
      metadata: input,
    });
    return updated;
  }

  @Delete("cupones/:id")
  async deleteCoupon(
    @Param("id") id: string,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const deleted = await this.promotions.softDeleteCoupon(id);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "COUPON_DELETED",
      entityType: "Coupon",
      entityId: id,
    });
    return deleted;
  }

  // ─── Contenidos / ajustes / SEO / tickets ─────────────────────────────────

  @Get("contenidos")
  async listContents() {
    const [faqs, blog, legal, seo, social] = await Promise.all([
      this.content.listFaqsAdmin(),
      this.content.listBlogAdmin(),
      this.content.listLegalAdmin(),
      this.content.listSeoAdmin(),
      this.content.listSocialLinksAdmin(),
    ]);
    return { faqs, blog, legal, seo, social };
  }

  @Post("contenidos/faqs")
  async createFaq(
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = FaqCreateSchema.parse(body);
    const created = await this.content.createFaq(input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "FAQ_CREATED",
      entityType: "Faq",
      entityId: created.id,
      metadata: { slug: input.slug },
    });
    return created;
  }

  @Patch("contenidos/faqs/:id")
  async patchFaq(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = FaqPatchSchema.parse(body);
    const updated = await this.content.updateFaq(id, input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "FAQ_UPDATED",
      entityType: "Faq",
      entityId: id,
    });
    return updated;
  }

  @Post("contenidos/blog")
  async createBlog(
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = BlogCreateSchema.parse(body);
    const created = await this.content.createBlog(input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "BLOG_CREATED",
      entityType: "BlogPost",
      entityId: created.id,
      metadata: { slug: input.slug },
    });
    return created;
  }

  @Patch("contenidos/blog/:id")
  async patchBlog(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = BlogPatchSchema.parse(body);
    const updated = await this.content.updateBlog(id, input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "BLOG_UPDATED",
      entityType: "BlogPost",
      entityId: id,
    });
    return updated;
  }

  @Patch("contenidos/legal/:id")
  async patchLegal(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = LegalPatchSchema.parse(body);
    const updated = await this.content.updateLegal(id, input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "LEGAL_UPDATED",
      entityType: "LegalDocument",
      entityId: id,
    });
    return updated;
  }

  @Post("contenidos/seo")
  async upsertSeo(
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = SeoSchema.parse(body);
    const updated = await this.content.upsertSeo(input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "SEO_UPSERTED",
      entityType: "SeoMetadata",
      entityId: updated.id,
      metadata: { path: input.path },
    });
    return updated;
  }

  @Get("ajustes")
  async listSettings() {
    const settings = await this.content.getSettings();
    const social = await this.content.listSocialLinksAdmin();
    return { settings, social };
  }

  @Patch("ajustes")
  async patchSettings(
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = SettingsPatchSchema.parse(body);
    const updated = await this.content.patchSiteSettings(input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "SITE_SETTINGS_UPDATED",
      entityType: "SiteSettings",
      entityId: updated.id,
      metadata: input,
    });
    return updated;
  }

  @Post("ajustes/social")
  async upsertSocial(
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = SocialSchema.parse(body);
    const updated = await this.content.upsertSocialLink(input);
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "SOCIAL_LINK_UPSERTED",
      entityType: "SocialLink",
      entityId: updated.id,
    });
    return updated;
  }

  @Get("tickets")
  listTickets() {
    return this.support.listTicketsAdmin();
  }

  @Post("tickets/:id/reply")
  async replyTicket(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = TicketReplySchema.parse(body);
    const updated = await this.support.replyTicket(id, {
      body: input.body,
      adminId: this.actor(req),
      ...(input.status ? { status: input.status } : {}),
    });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: this.actor(req),
      action: "TICKET_REPLY",
      entityType: "SupportTicket",
      entityId: id,
    });
    return updated;
  }
}
