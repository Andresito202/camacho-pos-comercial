import type {
  BlogPost,
  CoverageCity,
  Equipment,
  FaqItem,
  FeatureFlag,
  Plan,
  Promotion,
  SiteSettings,
  SolutionSector,
} from "./types";

/** DRAFT preview content — used only when commercial-api is unreachable and NODE_ENV !== production. */
export const draftSettings: SiteSettings = {
  promoBar: {
    message: "Kit de apertura con instalación remota incluida este mes.",
    href: "/promociones",
    cta: "Ver promoción",
  },
  whatsappNumber: "573001112233",
  supportEmail: "soporte@camachoposcolombia.com",
  supportPhone: "+57 300 111 2233",
  maintenanceMode: false,
};

export const draftPlans: Plan[] = [
  {
    id: "plan-caja-esencial",
    slug: "caja-esencial",
    name: "Caja Esencial",
    tagline: "Para un solo punto de venta que necesita vender sin depender de Internet.",
    description:
      "Licencia local-first para cajero, inventario básico, cierre de caja y soporte por canal comercial. Ideal para tiendas de barrio y panaderías que arrancan digitalización.",
    priceMonthly: { amountCents: 8900000, currency: "COP" },
    priceYearly: { amountCents: 89000000, currency: "COP" },
    highlights: [
      "Venta local-first en Electron o Android",
      "Inventario y arqueo de caja",
      "Actualizaciones de seguridad incluidas",
      "Capacitación remota de arranque",
    ],
    includesHardwareHint: "Puede contratarse solo software o con kit de hardware.",
    status: "disponible",
    featured: true,
  },
  {
    id: "plan-negocio",
    slug: "negocio",
    name: "Negocio",
    tagline: "Multi-caja, reportes y control por sucursal para comercios en crecimiento.",
    description:
      "Agrega supervisión, reportes comerciales, catálogo ampliado y preparación para facturación electrónica según el estado de certificación del tenant.",
    priceMonthly: { amountCents: 14900000, currency: "COP" },
    priceYearly: { amountCents: 149000000, currency: "COP" },
    highlights: [
      "Varias cajas por sucursal",
      "Roles administrador / supervisor / cajero",
      "Reportes de ventas e inventario",
      "Sincronización central cuando hay conectividad",
    ],
    status: "disponible",
    featured: true,
  },
  {
    id: "plan-empresa",
    slug: "empresa",
    name: "Empresa",
    tagline: "Operación multi-sucursal con acompañamiento comercial dedicado.",
    description:
      "Pensado para redes de droguerías, supermercados pequeños y grupos con varias sedes. Incluye onboarding guiado y canal prioritario de soporte.",
    priceMonthly: { amountCents: 24900000, currency: "COP" },
    highlights: [
      "Multi-sucursal con segregación de datos",
      "Onboarding y checklist de puesta en marcha",
      "Soporte prioritario en horario hábil",
      "Integración con kits certificados por sector",
    ],
    status: "en_certificacion",
  },
];

export const draftEquipment: Equipment[] = [
  {
    id: "eq-terminal-tactil",
    slug: "terminal-tactil-15",
    name: "Terminal táctil 15\"",
    category: "Punto de venta",
    summary: "All-in-one para mostrador con pantalla capacitiva y montaje estable.",
    description:
      "Composición de referencia para kits de caja. El modelo comercial exacto se confirma en la orden según disponibilidad de proveedor homologado.",
    price: { amountCents: 189000000, currency: "COP" },
    image: "/images/hardware/terminal-tactil.svg",
    status: "disponible",
    featured: true,
    specs: ["Pantalla 15\"", "SSD", "Windows 11 IoT o equivalente homologado", "Puertos USB/serie para periféricos"],
  },
  {
    id: "eq-impresora-termica",
    slug: "impresora-termica-80mm",
    name: "Impresora térmica 80 mm",
    category: "Impresión",
    summary: "Impresión de tiquetes y comandas para mostrador y cocina.",
    description: "Compatible con el canal de impresión del POS Local Service. Incluye guía de cableado en la instalación remota.",
    price: { amountCents: 32000000, currency: "COP" },
    image: "/images/hardware/impresora-termica.svg",
    status: "disponible",
    featured: true,
    specs: ["80 mm", "USB / Ethernet según kit", "Corte automático"],
  },
  {
    id: "eq-lector-barras",
    slug: "lector-codigo-barras",
    name: "Lector de código de barras",
    category: "Captura",
    summary: "Escaneo 1D/2D para mostrador y recepción de mercancía.",
    description: "Periférico de kit. La homologación exacta depende del lote comercial vigente.",
    price: { amountCents: 18000000, currency: "COP" },
    image: "/images/hardware/lector-barras.svg",
    status: "disponible",
    specs: ["1D/2D", "USB HID", "Soporte de mostrador opcional"],
  },
  {
    id: "eq-balanza",
    slug: "balanza-comercial",
    name: "Balanza comercial",
    category: "Pesaje",
    summary: "Para avícolas, panaderías y mostradores de peso variable.",
    description:
      "Integración de balanza en certificación sectorial. No se ofrece como disponible comercial hasta cerrar el adapter del kit correspondiente.",
    price: { amountCents: 75000000, currency: "COP" },
    image: "/images/hardware/balanza.svg",
    status: "en_certificacion",
    specs: ["Puerto serie/USB", "Modo peso-precio", "Requiere kit sectorial"],
  },
  {
    id: "eq-cajon",
    slug: "cajon-monedero",
    name: "Cajón monedero",
    category: "Efectivo",
    summary: "Apertura por impresora o relay según configuración del kit.",
    description: "Complemento físico para arqueos y control de efectivo en caja.",
    price: { amountCents: 22000000, currency: "COP" },
    image: "/images/hardware/cajon-monedero.svg",
    status: "disponible",
    featured: true,
    specs: ["Apertura eléctrica", "Bandeja de billetes y monedas"],
  },
];

export const draftPromotions: Promotion[] = [
  {
    id: "promo-kit-apertura",
    slug: "kit-apertura",
    title: "Kit de apertura",
    summary: "Plan Caja Esencial + terminal + impresora con instalación remota incluida.",
    validUntil: "2026-12-31",
    ctaHref: "/contratar?plan=caja-esencial",
    ctaLabel: "Contratar kit",
    status: "disponible",
  },
  {
    id: "promo-demo-guiada",
    slug: "demo-guiada",
    title: "Demo guiada sin compromiso",
    summary: "Agenda una sesión con un asesor comercial para revisar tu sector y el kit recomendado.",
    ctaHref: "/solicitar-demo",
    ctaLabel: "Solicitar demo",
    status: "disponible",
  },
];

export const draftCoverage: CoverageCity[] = [
  {
    slug: "bogota",
    name: "Bogotá",
    department: "Cundinamarca",
    summary: "Instalación remota inmediata y logística de equipos con aliados en la ciudad.",
    leadTimeDays: 3,
    status: "disponible",
  },
  {
    slug: "medellin",
    name: "Medellín",
    department: "Antioquia",
    summary: "Cobertura comercial para tiendas, panaderías y droguerías del Valle de Aburrá.",
    leadTimeDays: 4,
    status: "disponible",
  },
  {
    slug: "cali",
    name: "Cali",
    department: "Valle del Cauca",
    summary: "Acompañamiento comercial y envío de kits homologados.",
    leadTimeDays: 5,
    status: "disponible",
  },
  {
    slug: "barranquilla",
    name: "Barranquilla",
    department: "Atlántico",
    summary: "Operación costa con tiempos de tránsito de hardware publicados por pedido.",
    leadTimeDays: 6,
    status: "disponible",
  },
  {
    slug: "bucaramanga",
    name: "Bucaramanga",
    department: "Santander",
    summary: "Cobertura en expansión; confirma lead time al contratar.",
    leadTimeDays: 7,
    status: "proximamente",
  },
];

export const draftSolutions: SolutionSector[] = [
  {
    slug: "tiendas",
    name: "Tiendas",
    headline: "Caja rápida para el mostrador de barrio",
    summary:
      "Vende con código de barras, controla inventario corto y cierra caja sin depender de la nube en cada ticket.",
    challenges: ["Filas en horas pico", "Merma por desorden de stock", "Cajeros rotativos"],
    capabilities: ["Venta local-first", "Arqueo", "Catálogo sencillo", "Reportes diarios"],
    image: "/images/sectors/tiendas.svg",
  },
  {
    slug: "supermercados",
    name: "Supermercados",
    headline: "Varias cajas con control por sucursal",
    summary: "Opera líneas de caja, receptores y supervisión con segregación de datos por sede.",
    challenges: ["Multi-caja", "Turnos", "Recepción de mercancía"],
    capabilities: ["Roles", "Inventario", "Sincronización central", "Kits de hardware"],
    image: "/images/sectors/supermercados.svg",
  },
  {
    slug: "droguerias",
    name: "Droguerías",
    headline: "Trazabilidad y disciplina de inventario",
    summary: "Enfoque en lotes, alertas de stock y venta controlada según permisos del rol.",
    challenges: ["Lotes y vencimientos", "Auditoría", "Atención ágil"],
    capabilities: ["Inventario fino", "Roles estrictos", "Soporte comercial"],
    image: "/images/sectors/droguerias.svg",
  },
  {
    slug: "avicolas",
    name: "Avícolas",
    headline: "Peso variable en mostrador",
    summary: "Preparación sectorial para balanza y etiquetas; el estado de certificación se muestra con transparencia.",
    challenges: ["Pesaje", "Etiquetado", "Merma"],
    capabilities: ["Balanza en certificación", "Tickets", "Inventario por peso"],
    image: "/images/sectors/avicolas.svg",
  },
  {
    slug: "panaderias",
    name: "Panaderías",
    headline: "Mostrador, comandas y producción corta",
    summary: "Combina venta rápida con impresión de comandas y control de insumos.",
    challenges: ["Picos mañana/tarde", "Comandas", "Insumos"],
    capabilities: ["Caja rápida", "Impresión", "Inventario básico"],
    image: "/images/sectors/panaderias.svg",
  },
  {
    slug: "pastelerias",
    name: "Pastelerías",
    headline: "Pedidos, catálogo y mostrador",
    summary: "Ideal para catálogo visual, anticipos y entrega en mostrador o domicilio coordinado.",
    challenges: ["Pedidos anticipados", "Variantes", "Fechas de entrega"],
    capabilities: ["Catálogo", "Caja", "Clientes", "Reportes"],
    image: "/images/sectors/pastelerias.svg",
  },
];

export const draftFaq: FaqItem[] = [
  {
    id: "faq-local-first",
    question: "¿Puedo vender si se cae Internet?",
    answer:
      "Sí. El POS local está diseñado local-first: una venta ordinaria autorizada no depende de Internet. La sincronización con Central ocurre cuando hay conectividad.",
    category: "Producto",
  },
  {
    id: "faq-cajero-web",
    question: "¿El cajero opera desde este sitio web?",
    answer:
      "No. Los cajeros usan la aplicación Electron en Windows o la app Android del kit contratado. Este sitio es comercial: planes, equipos, contratación y soporte.",
    category: "Acceso",
  },
  {
    id: "faq-facturacion",
    question: "¿Incluye facturación electrónica DIAN?",
    answer:
      "La facturación electrónica se integra por adapters (por ejemplo Factus) y su disponibilidad se muestra según estado: Disponible, En certificación o Próximamente. Nunca se publica como disponible si aún no lo está.",
    category: "Fiscal",
  },
  {
    id: "faq-instalacion",
    question: "¿Cómo se instala el software de caja?",
    answer:
      "Tras contratar, recibes el camino de instalación Electron (Windows) o Android según tu kit. La puesta en marcha la acompaña el canal comercial; no se habilita un POS web para cajero.",
    category: "Instalación",
  },
  {
    id: "faq-pago",
    question: "¿Cómo pago un plan o un kit?",
    answer:
      "Puedes iniciar la contratación en línea, revisar el carrito y completar el checkout. El estado del pago se consulta en /checkout/estado. También puedes escribir por WhatsApp con el mensaje armado desde el plan elegido.",
    category: "Comercial",
  },
  {
    id: "faq-soporte",
    question: "¿Qué canales de soporte existen?",
    answer:
      "Soporte comercial por WhatsApp, correo y el centro de ayuda. Incidentes de operación se atienden según el plan contratado y el horario publicado.",
    category: "Soporte",
  },
];

export const draftFeatures: FeatureFlag[] = [
  {
    id: "feat-caja",
    name: "Caja local-first",
    description: "Venta, arqueo y operación offline-capable en Electron/Android.",
    status: "disponible",
  },
  {
    id: "feat-inventario",
    name: "Inventario",
    description: "Existencias, movimientos y alertas básicas.",
    status: "disponible",
  },
  {
    id: "feat-balanza",
    name: "Balanza",
    description: "Adapter de pesaje para sectores de peso variable.",
    status: "en_certificacion",
  },
  {
    id: "feat-facturacion",
    name: "Facturación electrónica",
    description: "Emisión vía provider fiscal homologado.",
    status: "en_certificacion",
  },
  {
    id: "feat-clientes",
    name: "Clientes",
    description: "Ficha comercial y búsqueda en caja.",
    status: "disponible",
  },
  {
    id: "feat-reportes",
    name: "Reportes",
    description: "Ventas, caja e inventario por periodo.",
    status: "disponible",
  },
];

export const draftBlog: BlogPost[] = [
  {
    slug: "local-first-en-el-mostrador",
    title: "Por qué local-first importa en el mostrador colombiano",
    excerpt:
      "Una caída de Internet no debería frenar la fila. Explicamos cómo Camacho POS separa la venta local de la sincronización central.",
    publishedAt: "2026-11-10",
    readingMinutes: 6,
    tags: ["Producto", "Operación"],
    body: [
      "En muchos barrios la conectividad es intermitente. Un POS que exige nube para cada ticket convierte un corte breve en pérdida de venta y filas.",
      "Camacho POS Colombia opera con POS Local Service como único escritor de SQLite local. La venta autorizada continúa; el outbox sincroniza después.",
      "Este enfoque no elimina la nube: la pone en el lugar correcto — autoridad comercial, licencias y consolidación — sin bloquear el mostrador.",
    ],
  },
  {
    slug: "kits-por-sector",
    title: "Kits por sector: tienda, droguería, panadería y más",
    excerpt: "No todos los mostradores necesitan la misma balanza ni el mismo flujo. Cómo elegimos kits sin sobrevender capacidades.",
    publishedAt: "2026-11-15",
    readingMinutes: 5,
    tags: ["Equipos", "Sectores"],
    body: [
      "Un kit de tienda prioriza lector, impresora y cajón. Una avícola necesita balanza en certificación. Una droguería exige disciplina de inventario.",
      "En este sitio cada capacidad muestra su estado real: Disponible, En certificación, Próximamente o No publicada.",
      "Así el comercio contrata con evidencia, no con promesas genéricas de catálogo.",
    ],
  },
  {
    slug: "cajero-no-usa-la-web",
    title: "El cajero no opera en la web comercial",
    excerpt: "La web vende y contrata. La caja corre en Electron o Android. Esta separación evita confusiones de rol y seguridad.",
    publishedAt: "2026-11-18",
    readingMinutes: 4,
    tags: ["Acceso", "Seguridad"],
    body: [
      "Superadministrador comercial gestiona licencias con autoridad GLOBAL. No es cajero ni recibe carrito de mostrador.",
      "Tras iniciar sesión en Central, el destino depende del rol. Cajeros reciben el camino de instalación de la app de caja.",
      "Mantener esa frontera reduce riesgo y deja clara la responsabilidad de cada perfil.",
    ],
  },
];
