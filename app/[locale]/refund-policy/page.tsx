import { notFound } from "next/navigation";

import { MarkdownContent } from "@/features/pages";
import {
  DocumentShell,
  StaticPageHero,
} from "@/features/pages";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLegalDocument } from "@/features/pages";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function RefundPolicyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const { data: content } = await getLegalDocument(
    "refund-policy",
    locale as Locale,
  );

  return (
    <>
      <StaticPageHero title={content.title} subtitle={content.subtitle} />
      <DocumentShell>
        <MarkdownContent markdown={content.body} />
      </DocumentShell>
    </>
  );
}
