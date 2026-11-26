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
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            slug: true,
            publicationStatus: true,
            images: { orderBy: { sortOrder: "asc" }, take: 3 },
          },
        },
        items: {
          include: {
            variant: {
              include: {
                stock: true,
                product: { select: { id: true, name: true, sku: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async listPublishedProducts() {
    return this.prisma.product.findMany({
      where: { publicationStatus: "PUBLISHED", deletedAt: null, kind: { not: "KIT" } },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
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
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
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

  async updatePlanMeta(
    planId: string,
    input: {
      name?: string;
      tagline?: string | null;
      description?: string;
      publicationStatus?: PublicationStatus;
      sortOrder?: number;
    },
  ) {
    const plan = await this.prisma.plan.findFirst({ where: { id: planId, deletedAt: null } });
    if (!plan) throw new NotFoundException({ code: "PLAN_NOT_FOUND" });
    return this.prisma.plan.update({
      where: { id: planId },
      data: {
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
        ...(input.description != null ? { description: input.description } : {}),
        ...(input.publicationStatus != null
          ? { publicationStatus: input.publicationStatus }
          : {}),
        ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
      },
      include: {
        features: { orderBy: { sortOrder: "asc" } },
        prices: { orderBy: [{ billingInterval: "asc" }, { version: "desc" }] },
      },
    });
  }

  async upsertPlanFeature(input: {
    planId: string;
    code: string;
    label: string;
    description?: string | null;
    commercialStatus?: "AVAILABLE" | "IN_CERTIFICATION" | "COMING_SOON" | "UNPUBLISHED";
    claimNote?: string | null;
    sortOrder?: number;
  }) {
    const plan = await this.prisma.plan.findFirst({ where: { id: input.planId, deletedAt: null } });
    if (!plan) throw new NotFoundException({ code: "PLAN_NOT_FOUND" });
    return this.prisma.planFeature.upsert({
      where: { planId_code: { planId: input.planId, code: input.code } },
      create: {
        planId: input.planId,
        code: input.code,
        label: input.label,
        description: input.description ?? null,
        commercialStatus: input.commercialStatus ?? "UNPUBLISHED",
        claimNote: input.claimNote ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
      update: {
        label: input.label,
        description: input.description ?? null,
        ...(input.commercialStatus != null ? { commercialStatus: input.commercialStatus } : {}),
        ...(input.claimNote !== undefined ? { claimNote: input.claimNote } : {}),
        ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
      },
    });
  }

  async listProductsAdmin() {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: {
          where: { deletedAt: null },
          include: { stock: true },
          orderBy: { version: "desc" },
        },
        kitAsKit: true,
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createProduct(input: {
    slug: string;
    sku: string;
    name: string;
    description: string;
    kind: "SOFTWARE_LICENSE" | "HARDWARE" | "KIT" | "ACCESSORY" | "SERVICE";
    categoryId?: string | null;
    publicationStatus?: PublicationStatus;
    sortOrder?: number;
    imageUrl?: string;
    imageAlt?: string;
    variant?: {
      sku: string;
      name: string;
      amountCents: number;
      quantityOnHand?: number;
    };
  }) {
    return this.prisma.product.create({
      data: {
        slug: input.slug,
        sku: input.sku,
        name: input.name,
        description: input.description,
        kind: input.kind,
        categoryId: input.categoryId ?? null,
        publicationStatus: input.publicationStatus ?? "DRAFT",
        sortOrder: input.sortOrder ?? 0,
        ...(input.imageUrl
          ? {
              images: {
                create: {
                  url: input.imageUrl,
                  alt: input.imageAlt ?? input.name,
                  sortOrder: 0,
                },
              },
            }
          : {}),
        ...(input.variant
          ? {
              variants: {
                create: {
                  sku: input.variant.sku,
                  name: input.variant.name,
                  amountCents: input.variant.amountCents,
                  version: 1,
                  publicationStatus: input.publicationStatus ?? "DRAFT",
                  stock: {
                    create: {
                      quantityOnHand: input.variant.quantityOnHand ?? 0,
                      trackInventory: true,
                    },
                  },
                  history: {
                    create: {
                      amountCents: input.variant.amountCents,
                      reason: "admin-create",
                      changedBy: "admin",
                    },
                  },
                },
              },
            }
          : {}),
      },
      include: {
        images: true,
        variants: { include: { stock: true } },
      },
    });
  }

  async updateProduct(
    id: string,
    input: {
      name?: string;
      description?: string;
      publicationStatus?: PublicationStatus;
      sortOrder?: number;
      categoryId?: string | null;
    },
  ) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException({ code: "PRODUCT_NOT_FOUND" });
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.description != null ? { description: input.description } : {}),
        ...(input.publicationStatus != null
          ? { publicationStatus: input.publicationStatus }
          : {}),
        ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      },
      include: {
        images: true,
        variants: { include: { stock: true } },
      },
    });
  }

  async softDeleteProduct(id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException({ code: "PRODUCT_NOT_FOUND" });
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), publicationStatus: "ARCHIVED" },
    });
  }

  async addProductImage(productId: string, input: { url: string; alt?: string; sortOrder?: number }) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundException({ code: "PRODUCT_NOT_FOUND" });
    return this.prisma.productImage.create({
      data: {
        productId,
        url: input.url,
        alt: input.alt ?? product.name,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async deleteProductImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException({ code: "PRODUCT_IMAGE_NOT_FOUND" });
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { ok: true, id: imageId };
  }

  async updateVariantPrice(input: {
    variantId: string;
    amountCents: number;
    adminId: string;
    publish?: boolean;
  }) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: input.variantId, deletedAt: null },
    });
    if (!variant) throw new NotFoundException({ code: "VARIANT_NOT_FOUND" });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({
        where: { id: input.variantId },
        data: {
          amountCents: input.amountCents,
          version: variant.version + 1,
          publicationStatus: input.publish ? "PUBLISHED" : "DRAFT",
        },
      });
      await tx.productPriceHistory.create({
        data: {
          productVariantId: updated.id,
          amountCents: input.amountCents,
          changedBy: input.adminId,
          reason: "admin-price-update",
        },
      });
      return updated;
    });
  }

  async updateStock(variantId: string, input: { quantityOnHand?: number; quantityReserved?: number; trackInventory?: boolean }) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, deletedAt: null },
      include: { stock: true },
    });
    if (!variant) throw new NotFoundException({ code: "VARIANT_NOT_FOUND" });
    if (!variant.stock) {
      return this.prisma.productStock.create({
        data: {
          productVariantId: variantId,
          quantityOnHand: input.quantityOnHand ?? 0,
          quantityReserved: input.quantityReserved ?? 0,
          trackInventory: input.trackInventory ?? true,
        },
      });
    }
    return this.prisma.productStock.update({
      where: { productVariantId: variantId },
      data: {
        ...(input.quantityOnHand != null ? { quantityOnHand: input.quantityOnHand } : {}),
        ...(input.quantityReserved != null ? { quantityReserved: input.quantityReserved } : {}),
        ...(input.trackInventory != null ? { trackInventory: input.trackInventory } : {}),
      },
    });
  }

  async createKit(input: {
    slug: string;
    sku: string;
    name: string;
    description: string;
    amountCents: number;
    publicationStatus?: PublicationStatus;
    imageUrl?: string;
    imageAlt?: string;
    adminId?: string;
    items: Array<{ productVariantId: string; quantity: number }>;
  }) {
    if (!input.items.length) {
      throw new BadRequestException({ code: "KIT_ITEMS_REQUIRED" });
    }
    const variantIds = input.items.map((item) => item.productVariantId);
    if (new Set(variantIds).size !== variantIds.length) {
      throw new BadRequestException({ code: "KIT_ITEMS_DUPLICATE_VARIANT" });
    }
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, deletedAt: null },
      include: { stock: true, product: { select: { id: true, kind: true, name: true } } },
    });
    if (variants.length !== variantIds.length) {
      throw new BadRequestException({ code: "KIT_ITEM_VARIANT_NOT_FOUND" });
    }
    for (const variant of variants) {
      if (variant.product.kind === "KIT") {
        throw new BadRequestException({ code: "KIT_CANNOT_NEST_KIT" });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug: input.slug,
          sku: input.sku,
          name: input.name,
          description: input.description,
          kind: "KIT",
          publicationStatus: input.publicationStatus ?? "DRAFT",
          sortOrder: 0,
          ...(input.imageUrl
            ? {
                images: {
                  create: {
                    url: input.imageUrl,
                    alt: input.imageAlt ?? input.name,
                    sortOrder: 0,
                  },
                },
              }
            : {}),
        },
      });
      const kit = await tx.kit.create({
        data: {
          productId: product.id,
          slug: input.slug,
          name: input.name,
          description: input.description,
          amountCents: input.amountCents,
          priceVersion: 1,
          publicationStatus: input.publicationStatus ?? "DRAFT",
          items: {
            create: input.items.map((item) => ({
              productVariantId: item.productVariantId,
              quantity: item.quantity,
            })),
          },
          history: {
            create: {
              amountCents: input.amountCents,
              changedBy: input.adminId ?? "admin",
              reason: "admin-kit-create",
            },
          },
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              slug: true,
              publicationStatus: true,
              images: true,
            },
          },
          items: {
            include: {
              variant: {
                include: {
                  stock: true,
                  product: { select: { id: true, name: true, sku: true, slug: true } },
                },
              },
            },
          },
        },
      });
      return kit;
    });
  }

  async updateKit(
    kitId: string,
    input: {
      name?: string;
      description?: string;
      amountCents?: number;
      publicationStatus?: PublicationStatus;
      adminId?: string;
    },
  ) {
    const kit = await this.prisma.kit.findFirst({ where: { id: kitId, deletedAt: null } });
    if (!kit) throw new NotFoundException({ code: "KIT_NOT_FOUND" });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.kit.update({
        where: { id: kitId },
        data: {
          ...(input.name != null ? { name: input.name } : {}),
          ...(input.description != null ? { description: input.description } : {}),
          ...(input.amountCents != null
            ? { amountCents: input.amountCents, priceVersion: kit.priceVersion + 1 }
            : {}),
          ...(input.publicationStatus != null
            ? { publicationStatus: input.publicationStatus }
            : {}),
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  stock: true,
                  product: { select: { id: true, name: true, sku: true } },
                },
              },
            },
          },
        },
      });
      if (input.name != null || input.description != null || input.publicationStatus != null) {
        await tx.product.update({
          where: { id: kit.productId },
          data: {
            ...(input.name != null ? { name: input.name } : {}),
            ...(input.description != null ? { description: input.description } : {}),
            ...(input.publicationStatus != null
              ? { publicationStatus: input.publicationStatus }
              : {}),
          },
        });
      }
      if (input.amountCents != null) {
        await tx.kitPriceHistory.create({
          data: {
            kitId,
            amountCents: input.amountCents,
            changedBy: input.adminId ?? "admin",
            reason: "admin-kit-price-update",
          },
        });
      }
      return updated;
    });
  }

  async replaceKitItems(
    kitId: string,
    items: Array<{ productVariantId: string; quantity: number }>,
  ) {
    if (!items.length) {
      throw new BadRequestException({ code: "KIT_ITEMS_REQUIRED" });
    }
    const kit = await this.prisma.kit.findFirst({ where: { id: kitId, deletedAt: null } });
    if (!kit) throw new NotFoundException({ code: "KIT_NOT_FOUND" });
    const variantIds = items.map((item) => item.productVariantId);
    if (new Set(variantIds).size !== variantIds.length) {
      throw new BadRequestException({ code: "KIT_ITEMS_DUPLICATE_VARIANT" });
    }
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, deletedAt: null },
      include: { product: { select: { kind: true } } },
    });
    if (variants.length !== variantIds.length) {
      throw new BadRequestException({ code: "KIT_ITEM_VARIANT_NOT_FOUND" });
    }
    for (const variant of variants) {
      if (variant.product.kind === "KIT") {
        throw new BadRequestException({ code: "KIT_CANNOT_NEST_KIT" });
      }
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.kitItem.deleteMany({ where: { kitId } });
      await tx.kitItem.createMany({
        data: items.map((item) => ({
          kitId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
        })),
      });
      return tx.kit.findUniqueOrThrow({
        where: { id: kitId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  stock: true,
                  product: { select: { id: true, name: true, sku: true, slug: true } },
                },
              },
            },
          },
        },
      });
    });
  }

  async listInventory() {
    return this.prisma.productStock.findMany({
      include: {
        variant: {
          include: { product: { select: { id: true, name: true, sku: true, slug: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}
