export const staticPageCatalog = [
  {
    slug: "home",
    title: "Home",
    description: "Hero media (foto o video) que se muestra en la página principal.",
    editorType: "home",
  },
  {
    slug: "about",
    title: "About Us",
    description: "Storytelling page about the brand and service values.",
    editorType: "about",
  },
  {
    slug: "contact",
    title: "Contact",
    description: "Structured contact details for location, phone, email, and hours.",
    editorType: "contact",
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    description: "Legal markdown document shown on the public site.",
    editorType: "markdown",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: "Legal markdown document shown on the public site.",
    editorType: "markdown",
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    description: "Legal markdown document shown on the public site.",
    editorType: "markdown",
  },
  {
    slug: "faq",
    title: "FAQ",
    description: "Question and answer collection rendered as a public accordion.",
    editorType: "faq",
  },
] as const;

export type StaticPageDefinition = (typeof staticPageCatalog)[number];
export type StaticPageSlug = StaticPageDefinition["slug"];
export type StaticPageEditorType = StaticPageDefinition["editorType"];
export type LegalPageSlug = Extract<
  StaticPageDefinition,
  { editorType: "markdown" }
>["slug"];

export function getStaticPageDefinition(slug: string) {
  return staticPageCatalog.find((page) => page.slug === slug);
}

export function isStaticPageSlug(slug: string): slug is StaticPageSlug {
  return staticPageCatalog.some((page) => page.slug === slug);
}

export function isLegalPageSlug(slug: string): slug is LegalPageSlug {
  return staticPageCatalog.some(
    (page) => page.slug === slug && page.editorType === "markdown",
  );
}
