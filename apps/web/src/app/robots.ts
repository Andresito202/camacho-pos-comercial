import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/carrito", "/checkout", "/checkout/"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
