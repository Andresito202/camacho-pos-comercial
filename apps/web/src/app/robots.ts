import type { MetadataRoute } from "next";
import { getSiteUrl, isStaging } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  // Staging and private transactional surfaces must not be indexed.
  if (isStaging()) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      host: site,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/carrito",
          "/carrito/",
          "/checkout",
          "/checkout/",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
