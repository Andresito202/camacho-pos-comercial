import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";

@Injectable()
export class ContentService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  listFaqs() {
    return this.prisma.faq.findMany({
      where: { publicationStatus: "PUBLISHED", deletedAt: null },
      orderBy: { sortOrder: "asc" },
    });
  }

  listBlogPosts() {
    return this.prisma.blogPost.findMany({
      where: { publicationStatus: "PUBLISHED", deletedAt: null },
      orderBy: { publishedAt: "desc" },
    });
  }

  async getLegal(slug: string) {
    const doc = await this.prisma.legalDocument.findUnique({ where: { slug } });
    if (!doc || doc.publicationStatus !== "PUBLISHED") {
      // DRAFT legal docs are not publicly served as binding.
      throw new NotFoundException({ code: "LEGAL_NOT_PUBLISHED" });
    }
    return doc;
  }

  /** Returns site settings even when DRAFT for bootstrap; flags status clearly. */
  async getSettings() {
    const settings = await this.prisma.siteSettings.findUnique({ where: { key: "default" } });
    if (!settings) throw new NotFoundException({ code: "SITE_SETTINGS_MISSING" });
    return {
      ...settings,
      whatsappIsDevPlaceholder: settings.whatsappNumber.includes("DEV_PLACEHOLDER"),
    };
  }

  getSeo(path: string) {
    return this.prisma.seoMetadata.findUnique({ where: { path } });
  }

  listSocialLinks() {
    return this.prisma.socialLink.findMany({
      where: { publicationStatus: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
    });
  }

  listSocialLinksAdmin() {
    return this.prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } });
  }

  listFaqsAdmin() {
    return this.prisma.faq.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
    });
  }

  listBlogAdmin() {
    return this.prisma.blogPost.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  listLegalAdmin() {
    return this.prisma.legalDocument.findMany({ orderBy: { type: "asc" } });
  }

  listSeoAdmin() {
    return this.prisma.seoMetadata.findMany({ orderBy: { path: "asc" } });
  }

  async patchSiteSettings(input: {
    brandName?: string;
    whatsappNumber?: string;
    supportEmail?: string;
    logoUrl?: string | null;
    promoBannerMessage?: string | null;
    promoBannerHref?: string | null;
    promoBannerCta?: string | null;
    publicationStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  }) {
    const existing = await this.prisma.siteSettings.findUnique({ where: { key: "default" } });
    if (!existing) throw new NotFoundException({ code: "SITE_SETTINGS_MISSING" });
    return this.prisma.siteSettings.update({
      where: { key: "default" },
      data: {
        ...(input.brandName != null ? { brandName: input.brandName } : {}),
        ...(input.whatsappNumber != null ? { whatsappNumber: input.whatsappNumber } : {}),
        ...(input.supportEmail != null ? { supportEmail: input.supportEmail } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.promoBannerMessage !== undefined
          ? { promoBannerMessage: input.promoBannerMessage }
          : {}),
        ...(input.promoBannerHref !== undefined ? { promoBannerHref: input.promoBannerHref } : {}),
        ...(input.promoBannerCta !== undefined ? { promoBannerCta: input.promoBannerCta } : {}),
        ...(input.publicationStatus != null
          ? { publicationStatus: input.publicationStatus }
          : {}),
        ...(input.primaryColor != null ? { primaryColor: input.primaryColor } : {}),
        ...(input.secondaryColor != null ? { secondaryColor: input.secondaryColor } : {}),
        ...(input.accentColor != null ? { accentColor: input.accentColor } : {}),
      },
    });
  }

  async upsertSocialLink(input: {
    id?: string;
    platform: string;
    url: string;
    sortOrder?: number;
    publicationStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }) {
    if (input.id) {
      return this.prisma.socialLink.update({
        where: { id: input.id },
        data: {
          platform: input.platform,
          url: input.url,
          ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
          ...(input.publicationStatus != null
            ? { publicationStatus: input.publicationStatus }
            : {}),
        },
      });
    }
    return this.prisma.socialLink.upsert({
      where: { platform_url: { platform: input.platform, url: input.url } },
      create: {
        platform: input.platform,
        url: input.url,
        sortOrder: input.sortOrder ?? 0,
        publicationStatus: input.publicationStatus ?? "DRAFT",
      },
      update: {
        sortOrder: input.sortOrder ?? 0,
        publicationStatus: input.publicationStatus ?? "DRAFT",
      },
    });
  }

  async updateFaq(
    id: string,
    input: {
      question?: string;
      answer?: string;
      category?: string | null;
      sortOrder?: number;
      publicationStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    },
  ) {
    const faq = await this.prisma.faq.findFirst({ where: { id, deletedAt: null } });
    if (!faq) throw new NotFoundException({ code: "FAQ_NOT_FOUND" });
    return this.prisma.faq.update({
      where: { id },
      data: {
        ...(input.question != null ? { question: input.question } : {}),
        ...(input.answer != null ? { answer: input.answer } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
        ...(input.publicationStatus != null
          ? { publicationStatus: input.publicationStatus }
          : {}),
      },
    });
  }

  async updateBlog(
    id: string,
    input: {
      title?: string;
      excerpt?: string | null;
      body?: string;
      publicationStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      publishedAt?: string | null;
    },
  ) {
    const post = await this.prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException({ code: "BLOG_NOT_FOUND" });
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
        ...(input.body != null ? { body: input.body } : {}),
        ...(input.publicationStatus != null
          ? { publicationStatus: input.publicationStatus }
          : {}),
        ...(input.publishedAt !== undefined
          ? { publishedAt: input.publishedAt ? new Date(input.publishedAt) : null }
          : {}),
      },
    });
  }

  async updateLegal(
    id: string,
    input: {
      title?: string;
      body?: string;
      version?: string;
      publicationStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    },
  ) {
    const doc = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException({ code: "LEGAL_NOT_FOUND" });
    return this.prisma.legalDocument.update({
      where: { id },
      data: {
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.body != null ? { body: input.body } : {}),
        ...(input.version != null ? { version: input.version } : {}),
        ...(input.publicationStatus != null
          ? {
              publicationStatus: input.publicationStatus,
              publishedAt: input.publicationStatus === "PUBLISHED" ? new Date() : doc.publishedAt,
            }
          : {}),
      },
    });
  }

  async upsertSeo(input: {
    path: string;
    title: string;
    description: string;
    ogImageUrl?: string | null;
    canonicalUrl?: string | null;
    robots?: string | null;
  }) {
    return this.prisma.seoMetadata.upsert({
      where: { path: input.path },
      create: {
        path: input.path,
        title: input.title,
        description: input.description,
        ogImageUrl: input.ogImageUrl ?? null,
        canonicalUrl: input.canonicalUrl ?? null,
        robots: input.robots ?? "index,follow",
      },
      update: {
        title: input.title,
        description: input.description,
        ...(input.ogImageUrl !== undefined ? { ogImageUrl: input.ogImageUrl } : {}),
        ...(input.canonicalUrl !== undefined ? { canonicalUrl: input.canonicalUrl } : {}),
        ...(input.robots !== undefined ? { robots: input.robots } : {}),
      },
    });
  }
}
