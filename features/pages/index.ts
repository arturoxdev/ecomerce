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
} from "./services/pages-fallbacks.service";
export type { StaticPageFormState } from "./services/pages-admin.service";

export {
  getAboutPage,
  getContactPage,
  getLegalDocument,
  getFaqEntries,
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
} from "./services/pages-fallbacks.service";

export {
  findAboutByLocale,
  findContactByLocale,
  findLegalBySlugAndLocale,
  findFaqById,
} from "./services/pages-admin.service";

export {
  saveAboutPage,
  saveLegalDocument,
  saveContactPage,
  createFaqEntry,
  updateFaqEntry,
  deleteFaqEntry,
} from "./actions";

export {
  StaticPageHero,
  DocumentShell,
  AboutStorySection,
  ContactInfoSection,
  FaqSection,
} from "./components/public/static-pages";
export { MarkdownContent } from "./components/public/markdown-content";

export { AboutForm } from "./components/admin/about-form";
export { ContactForm } from "./components/admin/contact-form";
export { MarkdownForm } from "./components/admin/markdown-form";
export { FaqManager } from "./components/admin/faq-manager";
export { EditorCard, PagesEditorShell } from "./components/admin/editor-shell";
