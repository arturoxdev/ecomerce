import { notFound } from "next/navigation";

import {
  AboutStorySection,
  StaticPageHero,
} from "@/features/pages";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAboutMedia, getAboutPage } from "@/features/pages";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const [{ data: content }, { data: media }] = await Promise.all([
    getAboutPage(locale as Locale),
    getAboutMedia(),
  ]);

  return (
    <>
      <StaticPageHero
        eyebrow={content.eyebrow}
        title={content.title}
        subtitle={content.subtitle}
      />
      <AboutStorySection
        locale={locale}
        imageUrl={media.storyImageUrl}
        storyTitle={content.storyTitle}
        storyBody={content.storyBody}
        valuesTitle={content.valuesTitle}
        valuesBody={content.valuesBody}
      />
    </>
  );
}
