import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/public/markdown-content";
import {
  DocumentShell,
  StaticPageHero,
} from "@/components/public/static-pages";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLegalDocument } from "@/lib/static-pages/service";

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
