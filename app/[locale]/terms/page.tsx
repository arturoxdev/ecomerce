import { notFound } from "next/navigation";

import { MarkdownContent } from "@/features/static-pages";
import {
  DocumentShell,
  StaticPageHero,
} from "@/features/static-pages";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLegalDocument } from "@/features/static-pages";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const content = await getLegalDocument("terms", locale as Locale);

  return (
    <>
      <StaticPageHero title={content.title} subtitle={content.subtitle} />
      <DocumentShell>
        <MarkdownContent markdown={content.body} />
      </DocumentShell>
    </>
  );
}
