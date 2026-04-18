import { notFound } from "next/navigation";

import { FaqSection, StaticPageHero } from "@/features/pages";
import { siteConfig } from "@/lib/config/site";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getFaqEntries } from "@/features/pages";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const { data: items } = await getFaqEntries(locale as Locale);
  const copy =
    locale === "es"
      ? {
          title: "Preguntas frecuentes",
          subtitle:
            `Todo lo que necesitas saber sobre la renta de equipo para fiestas con ${siteConfig.name}.`,
          ctaTitle: "¿Aún tienes dudas?",
          ctaSubtitle:
            "Escríbenos y con gusto te ayudamos a elegir el mejor montaje para tu evento.",
          ctaButtonLabel: "Contáctanos",
        }
      : {
          title: "Frequently Asked Questions",
          subtitle:
            `Everything you need to know about renting party equipment with ${siteConfig.name}.`,
          ctaTitle: "Still have questions?",
          ctaSubtitle:
            "Reach out and our team will gladly help you choose the right setup for your event.",
          ctaButtonLabel: "Contact us",
        };

  return (
    <>
      <StaticPageHero title={copy.title} subtitle={copy.subtitle} />
      <FaqSection
        items={items}
        locale={locale}
        ctaTitle={copy.ctaTitle}
        ctaSubtitle={copy.ctaSubtitle}
        ctaButtonLabel={copy.ctaButtonLabel}
      />
    </>
  );
}
