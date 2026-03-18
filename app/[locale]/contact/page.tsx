import { notFound } from "next/navigation";

import {
  ContactInfoSection,
  StaticPageHero,
} from "@/components/public/static-pages";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getContactPage } from "@/lib/static-pages/service";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const content = await getContactPage(locale as Locale);

  return (
    <>
      <StaticPageHero title={content.title} subtitle={content.subtitle} />
      <ContactInfoSection
        locale={locale}
        location={content.location}
        phone={content.phone}
        email={content.email}
        businessHours={content.businessHours}
      />
    </>
  );
}
