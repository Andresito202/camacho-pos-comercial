import {
  Inject,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
    variant: z
      .object({
        sku: z.string().min(1),
        name: z.string().min(1),
        amountCents: MoneyCentsSchema,
        quantityOnHand: z.number().int().optional(),
      })
      .optional(),
  })
  .strict();

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

const KitPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    amountCents: MoneyCentsSchema.optional(),
    publicationStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
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

const FaqPatchSchema = z
  .object({
    question: z.string().min(1).optional(),
    answer: z.string().min(1).optional(),
    category: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
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
  listOrders() {
    return this.prisma.order.findMany({
      where: { deletedAt: null },
      include: {
        customer: { select: { id: true, fullName: true, email: true } },
        items: true,
        payments: { select: { id: true, status: true, amountCents: true, referenceCode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  @Get("pagos")
  listPayments() {
    return this.prisma.payment.findMany({
      include: {
        customer: { select: { id: true, fullName: true, email: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  @Get("clientes")
  async listCustomers() {
    const [contacts, leads, demos, customers] = await Promise.all([
      this.prisma.contactRequest.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.lead.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.demoRequest.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.commercialCustomer.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    return { contacts, leads, demos, customers };
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
