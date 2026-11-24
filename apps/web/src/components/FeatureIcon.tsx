import Image from "next/image";

const ICONS = [
  "caja",
  "inventario",
  "balanza",
  "facturacion",
  "clientes",
  "soporte",
  "equipos",
  "seguridad",
  "reportes",
] as const;

export type FeatureIconName = (typeof ICONS)[number];

export function FeatureIcon({
  name,
  label,
  size = 48,
}: {
  name: FeatureIconName;
  label: string;
  size?: number;
}) {
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt={label}
      width={size}
      height={size}
      className="shrink-0"
    />
  );
}

export const featureIconCatalog: Array<{ name: FeatureIconName; label: string; href: string }> = [
  { name: "caja", label: "Caja", href: "/software-pos" },
  { name: "inventario", label: "Inventario", href: "/software-pos" },
  { name: "balanza", label: "Balanza", href: "/soluciones/avicolas" },
  { name: "facturacion", label: "Facturación", href: "/software-pos" },
  { name: "clientes", label: "Clientes", href: "/software-pos" },
  { name: "soporte", label: "Soporte", href: "/soporte" },
  { name: "equipos", label: "Equipos", href: "/equipos" },
  { name: "seguridad", label: "Seguridad", href: "/nosotros" },
  { name: "reportes", label: "Reportes", href: "/software-pos" },
];
