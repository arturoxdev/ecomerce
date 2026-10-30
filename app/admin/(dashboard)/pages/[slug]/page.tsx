import { notFound } from "next/navigation";

import {
  AboutForm,
  ContactForm,
  PageMediaForm,
  HomeHeroTextsForm,
  MarkdownForm,
  FaqManager,
  EditorCard,
  PagesEditorShell,
  saveAboutPage,
  saveContactPage,
  saveHomeMedia,
  removeHomeMedia,
  saveAboutMedia,
  removeAboutMedia,
  saveHomeHeroTexts,
  saveLegalDocument,
  findAboutByLocale,
  findAboutMediaByStoreId,
  findContactByLocale,
  findHomeByStoreId,
  findHomeHeroTextsByLocale,
  findLegalBySlugAndLocale,
  getHomeHeroTextsFallback,
} from "@/features/pages";
import { canWriteData, getSessionUser } from "@/lib/services/auth";
import { getFaqEntries } from "@/features/pages";
import {
  getStaticPageDefinition,
  isLegalPageSlug,
  isStaticPageSlug,
} from "@/features/pages";
import {
  aboutPageFallbacks,
  aboutPageMediaFallbacks,
  contactPageFallbacks,
  homePageFallbacks,
  legalPageFallbacks,
} from "@/features/pages";
import { isLocale, type Locale } from "@/lib/i18n/config";

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

  if (definition.editorType === "home") {
    let heroMediaUrl: string | null = null;
    try {
      const row = await findHomeByStoreId();
      heroMediaUrl = row?.heroMediaUrl ?? null;
    } catch {}

    let heroTexts = getHomeHeroTextsFallback(locale);
    try {
      heroTexts = (await findHomeHeroTextsByLocale(locale)) ?? heroTexts;
    } catch {}

    const boundTextsAction = saveHomeHeroTexts.bind(null, locale);

    return (
      <PagesEditorShell title={definition.title} locale={locale}>
        <div className="space-y-6">
          <EditorCard className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Textos del hero ({locale.toUpperCase()})
              </h2>
              <p className="text-sm text-slate-500">
                Cada idioma tiene sus propios textos. Cambia de idioma arriba a
                la derecha.
              </p>
            </div>
            <HomeHeroTextsForm
              key={locale}
              action={boundTextsAction}
              defaultValues={heroTexts}
              canWrite={canWrite}
            />
          </EditorCard>
          <EditorCard className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Imagen o video del hero
              </h2>
              <p className="text-sm text-slate-500">
                El medio es el mismo para todos los idiomas.
              </p>
            </div>
            <PageMediaForm
              saveAction={saveHomeMedia}
              removeAction={removeHomeMedia}
              defaultMediaUrl={heroMediaUrl}
              fallbackMediaUrl={homePageFallbacks.heroMediaUrl}
              canWrite={canWrite}
              fieldName="heroMediaUrl"
              uploadPrefix="home"
              allowVideo
              copy={{
                saved: "Hero del Home actualizado",
                removed: "Hero restablecido al medio por defecto",
                previewAlt: "Hero del Home",
                removeTitle: "¿Eliminar el medio del hero?",
              }}
            />
          </EditorCard>
        </div>
      </PagesEditorShell>
    );
  }

  if (definition.editorType === "about") {
    let content = {
        slug: "about",
        locale,
        ...aboutPageFallbacks[locale],
      };
    try {
      content = (await findAboutByLocale(locale)) ?? content;
    } catch {}

    let storyImageUrl: string | null = null;
    try {
      const row = await findAboutMediaByStoreId();
      storyImageUrl = row?.storyImageUrl ?? null;
    } catch {}

    const boundAction = saveAboutPage.bind(null, locale);

    return (
      <PagesEditorShell title={definition.title} locale={locale}>
        <div className="space-y-6">
          <EditorCard className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Textos ({locale.toUpperCase()})
              </h2>
              <p className="text-sm text-slate-500">
                Cada idioma tiene sus propios textos. Cambia de idioma arriba a
                la derecha.
              </p>
            </div>
            <AboutForm action={boundAction} defaultValues={content} canWrite={canWrite} />
          </EditorCard>
          <EditorCard className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Imagen de &quot;Nuestra historia&quot;
              </h2>
              <p className="text-sm text-slate-500">
                La imagen es la misma para todos los idiomas.
              </p>
            </div>
            <PageMediaForm
              saveAction={saveAboutMedia}
              removeAction={removeAboutMedia}
              defaultMediaUrl={storyImageUrl}
              fallbackMediaUrl={aboutPageMediaFallbacks.storyImageUrl}
              canWrite={canWrite}
              fieldName="storyImageUrl"
              uploadPrefix="about"
              allowVideo={false}
              copy={{
                saved: "Imagen de About actualizada",
                removed: "Imagen restablecida a la imagen por defecto",
                previewAlt: "Imagen de Nuestra historia",
                removeTitle: "¿Eliminar la imagen de Nuestra historia?",
              }}
            />
          </EditorCard>
        </div>
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
      content = (await findContactByLocale(locale)) ?? content;
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
      content = (await findLegalBySlugAndLocale(slug, locale)) ?? content;
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
    const { data: items } = await getFaqEntries(locale);

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
