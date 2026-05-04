export type {
  StaticPageDefinition,
  StaticPageSlug,
  StaticPageEditorType,
  LegalPageSlug,
} from "./services/pages-catalog.service";
export type {
  AboutPageContent,
  ContactPageContent,
  LegalPageContent,
  FaqEntryContent,
  HomePageContent,
} from "./services/pages-fallbacks.service";
export type { StaticPageFormState } from "./services/pages-admin.service";

export {
  getAboutPage,
  getContactPage,
  getLegalDocument,
  getFaqEntries,
  getHomeMedia,
} from "./services/pages-public.service";

export {
  staticPageCatalog,
  getStaticPageDefinition,
  isStaticPageSlug,
  isLegalPageSlug,
} from "./services/pages-catalog.service";

export {
  aboutPageFallbacks,
  contactPageFallbacks,
  legalPageFallbacks,
  faqFallbacks,
  homePageFallbacks,
} from "./services/pages-fallbacks.service";

export {
  findAboutByLocale,
  findContactByLocale,
  findLegalBySlugAndLocale,
  findFaqById,
  findHomeByStoreId,
} from "./services/pages-admin.service";

export {
  saveAboutPage,
  saveLegalDocument,
  saveContactPage,
  createFaqEntry,
  updateFaqEntry,
  deleteFaqEntry,
  saveHomeMedia,
  removeHomeMedia,
} from "./actions";

export {
  StaticPageHero,
  DocumentShell,
  AboutStorySection,
  ContactInfoSection,
  FaqSection,
} from "./components/public/static-pages";
export { MarkdownContent } from "./components/public/markdown-content";
export { HeroMedia } from "./components/public/hero-media";

export { AboutForm } from "./components/admin/about-form";
export { ContactForm } from "./components/admin/contact-form";
export { MarkdownForm } from "./components/admin/markdown-form";
export { FaqManager } from "./components/admin/faq-manager";
export { HomeForm } from "./components/admin/home-form";
export { EditorCard, PagesEditorShell } from "./components/admin/editor-shell";
