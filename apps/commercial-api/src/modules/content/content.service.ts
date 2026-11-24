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
}
