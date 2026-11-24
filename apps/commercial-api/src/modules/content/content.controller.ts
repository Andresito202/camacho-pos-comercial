import { Inject, Controller, Get, Param, Query } from "@nestjs/common";
import { ContentService } from "./content.service.js";

@Controller("content")
export class ContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Get("faqs")
  faqs() {
    return this.content.listFaqs();
  }

  @Get("blog")
  blog() {
    return this.content.listBlogPosts();
  }

  @Get("legal/:slug")
  legal(@Param("slug") slug: string) {
    return this.content.getLegal(slug);
  }

  @Get("settings")
  settings() {
    return this.content.getSettings();
  }

  @Get("seo")
  seo(@Query("path") path = "/") {
    return this.content.getSeo(path);
  }

  @Get("social")
  social() {
    return this.content.listSocialLinks();
  }
}
