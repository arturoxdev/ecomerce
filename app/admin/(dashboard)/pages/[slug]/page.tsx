import { notFound } from "next/navigation";

import { canWriteData } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { getFaqEntries } from "@/lib/static-pages/service";
import {
  getStaticPageDefinition,
  isLegalPageSlug,
  isStaticPageSlug,
} from "@/lib/static-pages/catalog";
import {
  aboutPageFallbacks,
  contactPageFallbacks,
  legalPageFallbacks,
} from "@/lib/static-pages/fallbacks";
import * as aboutPageRepo from "@/lib/repositories/about-page";
import * as contactPageRepo from "@/lib/repositories/contact-page";
import * as legalDocumentRepo from "@/lib/repositories/legal-document";
import { isLocale, type Locale } from "@/lib/i18n/config";

import { AboutForm } from "../about-form";
import { saveAboutPage, saveContactPage, saveLegalDocument } from "../actions";
import { ContactForm } from "../contact-form";
import { EditorCard, PagesEditorShell } from "../editor-shell";
import { FaqManager } from "../faq-manager";
import { MarkdownForm } from "../markdown-form";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
};

function resolveLocale(value?: string): Locale {
  return isLocale(value ?? "") ? (value as Locale) : "en";
}

export default async function AdminStaticPagePage({ params, searchParams }: Props) {
  const user = await getSessionUser();
  const canWrite = canWriteData(user.role);
  const { slug } = await params;
  const { locale: localeParam } = await searchParams;
  const locale = resolveLocale(localeParam);

  if (!isStaticPageSlug(slug)) {
    notFound();
  }

  const definition = getStaticPageDefinition(slug);
  if (!definition) {
    notFound();
  }

  if (definition.editorType === "about") {
    let content = {
        slug: "about",
        locale,
        ...aboutPageFallbacks[locale],
      };
    try {
      content = (await aboutPageRepo.findByLocale(locale)) ?? content;
    } catch {}

    const boundAction = saveAboutPage.bind(null, locale);

    return (
      <PagesEditorShell title={definition.title} locale={locale}>
        <EditorCard>
          <AboutForm action={boundAction} defaultValues={content} canWrite={canWrite} />
        </EditorCard>
      </PagesEditorShell>
    );
  }

  if (definition.editorType === "contact") {
    let content = {
        slug: "contact",
        locale,
        ...contactPageFallbacks[locale],
      };
    try {
      content = (await contactPageRepo.findByLocale(locale)) ?? content;
    } catch {}

    const boundAction = saveContactPage.bind(null, locale);

    return (
      <PagesEditorShell title={definition.title} locale={locale}>
        <EditorCard>
          <ContactForm
            action={boundAction}
            defaultValues={content}
            canWrite={canWrite}
          />
        </EditorCard>
      </PagesEditorShell>
    );
  }

  if (definition.editorType === "markdown" && isLegalPageSlug(slug)) {
    let content = {
        slug,
        locale,
        ...legalPageFallbacks[slug][locale],
      };
    try {
      content = (await legalDocumentRepo.findBySlugAndLocale(slug, locale)) ?? content;
    } catch {}

    const boundAction = saveLegalDocument.bind(null, slug, locale);

    return (
      <PagesEditorShell title={definition.title} locale={locale}>
        <EditorCard>
          <MarkdownForm
            action={boundAction}
            defaultValues={content}
            canWrite={canWrite}
          />
        </EditorCard>
      </PagesEditorShell>
    );
  }

  if (definition.editorType === "faq") {
    const items = await getFaqEntries(locale);

    return (
      <PagesEditorShell title={definition.title} locale={locale}>
        <EditorCard className="space-y-6">
          <FaqManager locale={locale} items={items} canWrite={canWrite} />
        </EditorCard>
      </PagesEditorShell>
    );
  }

  notFound();
}
