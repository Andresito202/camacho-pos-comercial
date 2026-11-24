-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "promoBannerMessage" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "promoBannerHref" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "promoBannerCta" TEXT;
