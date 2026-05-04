import { siteConfig } from "@/lib/config/site";
import type { Locale } from "@/lib/i18n/config";
import type { LegalPageSlug } from "./pages-catalog.service";

export type AboutPageContent = {
  locale: Locale;
  eyebrow: string;
  title: string;
  subtitle: string;
  storyTitle: string;
  storyBody: string;
  valuesTitle: string;
  valuesBody: string;
};

export type ContactPageContent = {
  locale: Locale;
  title: string;
  subtitle: string;
  location: string;
  phone: string;
  email: string;
  businessHours: string;
};

export type LegalPageContent = {
  locale: Locale;
  title: string;
  subtitle: string;
  body: string;
};

export type FaqEntryContent = {
  locale: Locale;
  question: string;
  answer: string;
  sortOrder: number;
};

export type HomePageContent = {
  heroMediaUrl: string | null;
};

export const homePageFallbacks: { heroMediaUrl: string } = {
  heroMediaUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCWQyE9DMg-JDkm060LzSQqQ2STADSY1PSRyBso20F6UfgOrYYyfTGz0UYRmvgQilpWxSMynslYC6gXD48d6oFNC8-lC7FAHN0uQeizdgkJE4imQ6I4d-apMwbW8aiPU60-OFjPstMwtZi-fsmpiRD_6c59p4f7WNAUJU7lwYdyfsW-UYhr1-XH5NFAUVmB7P1D7Y5YOSjunk3Hy0ne5yzgtqcMQLcUpw04tr2K-_seDR3Xtv0lmhIx05dHSizEREp582Nk4xlQcDVA",
};

export const aboutPageFallbacks: Record<Locale, Omit<AboutPageContent, "locale">> = {
  en: {
    eyebrow: "Family-owned party rentals",
    title: "Making celebrations special since day one",
    subtitle:
      `${siteConfig.name} helps families and event planners create memorable moments with dependable party equipment and warm service.`,
    storyTitle: "Our story",
    storyBody:
      "We started with a simple promise: make event planning easier for busy families. From bounce houses to tables and chairs, we focus on clean equipment, punctual delivery, and support that feels personal.",
    valuesTitle: "What we stand for",
    valuesBody:
      "Reliability, safety, and honest service guide every rental. We prepare each order carefully so your event feels smooth from booking to pickup.",
  },
  es: {
    eyebrow: "Renta de fiestas familiar",
    title: "Haciendo cada celebración especial desde el primer día",
    subtitle:
      `${siteConfig.name} ayuda a familias y organizadores a crear momentos memorables con equipo confiable y atención cercana.`,
    storyTitle: "Nuestra historia",
    storyBody:
      "Empezamos con una promesa sencilla: facilitar la planeación de eventos para familias ocupadas. Desde brincolines hasta mesas y sillas, nos enfocamos en equipo limpio, entregas puntuales y una atención personalizada.",
    valuesTitle: "Lo que nos mueve",
    valuesBody:
      "La confianza, la seguridad y el servicio honesto guían cada renta. Preparamos cada pedido con cuidado para que tu evento fluya desde la reservación hasta la recolección.",
  },
};

export const contactPageFallbacks: Record<
  Locale,
  Omit<ContactPageContent, "locale">
> = {
  en: {
    title: "Get in touch",
    subtitle:
      "Have questions about availability, packages, or a custom event setup? We would love to help.",
    location: "Houston, Texas, United States",
    phone: "+1 (713) 555-0198",
    email: siteConfig.supportEmail,
    businessHours: "Monday to Saturday, 9:00 AM to 6:00 PM",
  },
  es: {
    title: "Ponte en contacto",
    subtitle:
      "¿Tienes dudas sobre disponibilidad, paquetes o una instalación especial? Con gusto te ayudamos.",
    location: "Houston, Texas, Estados Unidos",
    phone: "+1 (713) 555-0198",
    email: siteConfig.supportEmail,
    businessHours: "Lunes a sábado, 9:00 AM a 6:00 PM",
  },
};

export const legalPageFallbacks: Record<
  LegalPageSlug,
  Record<Locale, Omit<LegalPageContent, "locale">>
> = {
  terms: {
    en: {
      title: "Terms & Conditions",
      subtitle: "Last updated: March 2026. Please review these terms carefully.",
      body: `## Reservations

Reservations are confirmed once the required deposit is received.

## Equipment Use

Customers agree to supervise the equipment responsibly and follow the setup guidance provided by our team.

## Payments and Cancellations

Remaining balances are due before or at delivery unless otherwise agreed in writing.

## Liability

We reserve the right to pause or cancel delivery when weather or safety conditions make installation unsafe.`,
    },
    es: {
      title: "Términos y condiciones",
      subtitle:
        "Última actualización: marzo de 2026. Revisa estos términos con atención.",
      body: `## Reservaciones

Las reservaciones se confirman una vez recibido el anticipo requerido.

## Uso del equipo

El cliente se compromete a supervisar el equipo de forma responsable y seguir las indicaciones de instalación entregadas por nuestro equipo.

## Pagos y cancelaciones

El saldo restante debe cubrirse antes o al momento de la entrega, salvo acuerdo distinto por escrito.

## Responsabilidad

Nos reservamos el derecho de pausar o cancelar una entrega cuando el clima o las condiciones de seguridad hagan riesgosa la instalación.`,
    },
  },
  privacy: {
    en: {
      title: "Privacy Policy",
      subtitle: "Last updated: March 2026. Your information matters to us.",
      body: `## Information We Collect

We collect the contact and booking details needed to manage reservations and customer support.

## How We Use Information

Your information is used to coordinate deliveries, payments, and service communications.

## Data Sharing

We do not sell personal data. We only share it with service providers involved in processing your order when necessary.

## Contact

If you have privacy questions, contact us through the details shown on our contact page.`,
    },
    es: {
      title: "Política de privacidad",
      subtitle:
        "Última actualización: marzo de 2026. Tu información es importante para nosotros.",
      body: `## Información que recopilamos

Recopilamos los datos de contacto y reservación necesarios para gestionar pedidos y soporte.

## Cómo usamos la información

Usamos tu información para coordinar entregas, pagos y comunicaciones de servicio.

## Compartición de datos

No vendemos datos personales. Solo los compartimos con proveedores involucrados en el procesamiento de tu pedido cuando es necesario.

## Contacto

Si tienes dudas de privacidad, contáctanos con los datos mostrados en la página de contacto.`,
    },
  },
  "refund-policy": {
    en: {
      title: "Refund Policy",
      subtitle: "Last updated: March 2026. We aim for fair and clear resolutions.",
      body: `## Deposits

Deposits may be transferred to a new date when notice is given with reasonable time and availability allows.

## Service Issues

If delivery is not completed due to an issue on our side, we will review the order and issue an appropriate refund or credit.

## Weather and Safety

When severe weather prevents safe setup, we will work with you on rescheduling or a suitable refund path.

## Contact Us

Please contact our team within 48 hours of your event if you believe a refund review is needed.`,
    },
    es: {
      title: "Política de reembolso",
      subtitle:
        "Última actualización: marzo de 2026. Buscamos resolver cada caso con claridad y justicia.",
      body: `## Anticipos

Los anticipos pueden transferirse a una nueva fecha cuando se avisa con tiempo razonable y hay disponibilidad.

## Incidencias del servicio

Si la entrega no se completa por una causa atribuible a nuestro equipo, revisaremos el pedido y emitiremos el reembolso o crédito correspondiente.

## Clima y seguridad

Cuando el clima impide una instalación segura, trabajaremos contigo en una reprogramación o una ruta adecuada de reembolso.

## Contáctanos

Comunícate con nuestro equipo dentro de las 48 horas posteriores a tu evento si consideras necesaria una revisión de reembolso.`,
    },
  },
};

export const faqFallbacks: Record<Locale, FaqEntryContent[]> = {
  en: [
    {
      locale: "en",
      question: "How far in advance should I book?",
      answer:
        "We recommend booking at least one to two weeks in advance, especially for weekends and seasonal dates.",
      sortOrder: 0,
    },
    {
      locale: "en",
      question: "Do you deliver and set up the equipment?",
      answer:
        "Yes. We coordinate delivery, setup, and pickup so you can focus on the event itself.",
      sortOrder: 1,
    },
    {
      locale: "en",
      question: "What happens if it rains?",
      answer:
        "Safety comes first. If weather makes setup unsafe, we will help reschedule or review the best available resolution.",
      sortOrder: 2,
    },
  ],
  es: [
    {
      locale: "es",
      question: "¿Con cuánto tiempo debo reservar?",
      answer:
        "Recomendamos reservar con una o dos semanas de anticipación, especialmente para fines de semana y temporadas altas.",
      sortOrder: 0,
    },
    {
      locale: "es",
      question: "¿Incluyen entrega e instalación?",
      answer:
        "Sí. Coordinamos la entrega, instalación y recolección para que puedas concentrarte en tu evento.",
      sortOrder: 1,
    },
    {
      locale: "es",
      question: "¿Qué pasa si llueve?",
      answer:
        "La seguridad es primero. Si el clima vuelve insegura la instalación, te ayudaremos a reprogramar o revisar la mejor solución disponible.",
      sortOrder: 2,
    },
  ],
};
