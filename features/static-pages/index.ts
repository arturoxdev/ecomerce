// Data
export {
  getAboutPage,
  getContactPage,
  getLegalDocument,
  getFaqEntries,
} from "./data";

// Catalog
export {
  staticPageCatalog,
  getStaticPageDefinition,
  isStaticPageSlug,
  isLegalPageSlug,
} from "./catalog";
export type {
  StaticPageDefinition,
  StaticPageSlug,
  StaticPageEditorType,
  LegalPageSlug,
} from "./catalog";

// Fallbacks
export {
  aboutPageFallbacks,
  contactPageFallbacks,
  legalPageFallbacks,
  faqFallbacks,
} from "./fallbacks";
export type {
  AboutPageContent,
  ContactPageContent,
  LegalPageContent,
  FaqEntryContent,
} from "./fallbacks";

// Components
export { StaticPageHero, DocumentShell, AboutStorySection, ContactInfoSection, FaqSection } from "./components/static-pages";
export { MarkdownContent } from "./components/markdown-content";
