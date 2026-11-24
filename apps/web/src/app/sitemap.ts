import type { MetadataRoute } from "next";
import { getBlogPosts, getCoverage, getEquipmentList, getPlans, getSolutions } from "@/lib/api";
import { getSiteUrl, isStaging } from "@/lib/env";

const STATIC = [
  "/",
  "/software-pos",
  "/planes",
  "/equipos",
  "/soluciones",
  "/promociones",
  "/cobertura",
  "/contratar",
  "/prueba-5-dias",
  "/contacto",
  "/nosotros",
  "/soporte",
  "/preguntas-frecuentes",
  "/descargas",
  "/blog",
  "/buscar",
  "/legal/privacidad",
  "/legal/cookies",
  "/legal/terminos",
  "/legal/garantias",
  "/legal/envios",
  "/legal/devoluciones",
  "/legal/tratamiento-de-datos",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Staging must not advertise URLs for crawling.
  if (isStaging()) return [];

  const site = getSiteUrl();
  const [plans, equipment, coverage, solutions, blog] = await Promise.all([
    getPlans().catch(() => ({ data: [] })),
    getEquipmentList().catch(() => ({ data: [] })),
    getCoverage().catch(() => ({ data: [] })),
    getSolutions().catch(() => ({ data: [] })),
    getBlogPosts().catch(() => ({ data: [] })),
  ]);

  const dynamic = [
    ...plans.data.map((plan) => `/planes/${plan.slug}`),
    ...equipment.data.map((item) => `/equipos/${item.slug}`),
    ...coverage.data.map((city) => `/cobertura/${city.slug}`),
    ...solutions.data.map((item) => `/soluciones/${item.slug}`),
    ...blog.data.map((post) => `/blog/${post.slug}`),
  ];

  return [...STATIC, ...dynamic].map((path) => ({
    url: `${site}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
