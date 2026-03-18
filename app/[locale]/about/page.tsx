import { notFound } from "next/navigation";

import {
  AboutStorySection,
  StaticPageHero,
} from "@/components/public/static-pages";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAboutPage } from "@/lib/static-pages/service";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const content = await getAboutPage(locale as Locale);

  return (
    <>
      <StaticPageHero
        eyebrow={content.eyebrow}
        title={content.title}
        subtitle={content.subtitle}
      />
      <AboutStorySection
        locale={locale}
        storyTitle={content.storyTitle}
        storyBody={content.storyBody}
        valuesTitle={content.valuesTitle}
        valuesBody={content.valuesBody}
      />
    </>
  );
}
