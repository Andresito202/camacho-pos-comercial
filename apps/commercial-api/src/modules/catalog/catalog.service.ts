import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient, PublicationStatus } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";

@Injectable()
export class CatalogService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listPublishedPlans() {
    return this.prisma.plan.findMany({
      where: { publicationStatus: "PUBLISHED", deletedAt: null },
      include: {
        features: { orderBy: { sortOrder: "asc" } },
        prices: { where: { publicationStatus: "PUBLISHED" }, orderBy: { version: "desc" } },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  /** Admin/debug: includes DRAFT — never used for purchase paths. */
  async listPlans(status?: PublicationStatus) {
    return this.prisma.plan.findMany({
      where: {
        deletedAt: null,
        ...(status ? { publicationStatus: status } : {}),
      },
      include: {
        features: { orderBy: { sortOrder: "asc" } },
        prices: { orderBy: [{ billingInterval: "asc" }, { version: "desc" }] },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  async listPublishedKits() {
    return this.prisma.kit.findMany({
      where: { publicationStatus: "PUBLISHED", deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async listKits(status?: PublicationStatus) {
    return this.prisma.kit.findMany({
      where: {
        deletedAt: null,
        ...(status ? { publicationStatus: status } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async listPublishedProducts() {
    return this.prisma.product.findMany({
      where: { publicationStatus: "PUBLISHED", deletedAt: null, kind: { not: "KIT" } },
      include: {
        variants: { where: { publicationStatus: "PUBLISHED", deletedAt: null } },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  /** Admin/debug: includes DRAFT products — never used for purchase paths. */
  async listProducts(status?: PublicationStatus) {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        kind: { not: "KIT" },
        ...(status ? { publicationStatus: status } : {}),
      },
      include: {
        variants: { where: { deletedAt: null }, orderBy: { version: "desc" } },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getPurchasablePlanPrice(planPriceId: string) {
    const price = await this.prisma.planPrice.findUnique({
      where: { id: planPriceId },
      include: { plan: true },
    });
    if (!price || price.plan.deletedAt) {
      throw new NotFoundException({ code: "PLAN_PRICE_NOT_FOUND" });
    }
    if (price.publicationStatus !== "PUBLISHED" || price.plan.publicationStatus !== "PUBLISHED") {
      throw new BadRequestException({
        code: "DRAFT_PRICE_NOT_PURCHASABLE",
        message: "Draft or unpublished prices cannot be purchased.",
      });
    }
    return price;
  }

  async getPurchasableKit(kitId: string) {
    const kit = await this.prisma.kit.findUnique({ where: { id: kitId } });
    if (!kit || kit.deletedAt) {
      throw new NotFoundException({ code: "KIT_NOT_FOUND" });
    }
    if (kit.publicationStatus !== "PUBLISHED") {
      throw new BadRequestException({
        code: "DRAFT_PRICE_NOT_PURCHASABLE",
        message: "Draft kits cannot be purchased.",
      });
    }
    return kit;
  }

  async getPurchasableVariant(productVariantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: { product: true },
    });
    if (!variant || variant.deletedAt || variant.product.deletedAt) {
      throw new NotFoundException({ code: "VARIANT_NOT_FOUND" });
    }
    if (
      variant.publicationStatus !== "PUBLISHED" ||
      variant.product.publicationStatus !== "PUBLISHED"
    ) {
      throw new BadRequestException({
        code: "DRAFT_PRICE_NOT_PURCHASABLE",
        message: "Draft product prices cannot be purchased.",
      });
    }
    return variant;
  }

  async updatePlanPriceAmount(input: {
    planPriceId: string;
    amountCents: number;
    adminId: string;
    publish?: boolean;
  }) {
    const price = await this.prisma.planPrice.findUnique({ where: { id: input.planPriceId } });
    if (!price) throw new NotFoundException({ code: "PLAN_PRICE_NOT_FOUND" });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.planPrice.update({
        where: { id: input.planPriceId },
        data: {
          amountCents: input.amountCents,
          version: price.version + 1,
          publicationStatus: input.publish ? "PUBLISHED" : "DRAFT",
          createdByAdminId: input.adminId,
        },
      });
      await tx.planPriceHistory.create({
        data: {
          planPriceId: updated.id,
          amountCents: input.amountCents,
          changedBy: input.adminId,
          reason: "admin-price-update",
        },
      });
      return updated;
    });
  }
}
