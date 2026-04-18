import { z } from "zod";

export const localeSchema = z.enum(["en", "es"]);

export const aboutSchema = z.object({
  eyebrow: z.string().min(1, "Eyebrow is required"),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  storyTitle: z.string().min(1, "Story title is required"),
  storyBody: z.string().min(1, "Story body is required"),
  valuesTitle: z.string().min(1, "Values title is required"),
  valuesBody: z.string().min(1, "Values body is required"),
});

export const markdownSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  body: z.string().min(1, "Markdown content is required"),
});

export const contactSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  location: z.string().min(1, "Location is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.email("Valid email is required"),
  businessHours: z.string().min(1, "Business hours are required"),
});

export const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  sortOrder: z.coerce.number().int().min(0, "Sort order must be 0 or more"),
});

export type AboutInput = z.infer<typeof aboutSchema>;
export type MarkdownInput = z.infer<typeof markdownSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type FaqInput = z.infer<typeof faqSchema>;

export function parseAboutForm(formData: FormData) {
  return aboutSchema.safeParse({
    eyebrow: formData.get("eyebrow"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    storyTitle: formData.get("storyTitle"),
    storyBody: formData.get("storyBody"),
    valuesTitle: formData.get("valuesTitle"),
    valuesBody: formData.get("valuesBody"),
  });
}

export function parseMarkdownForm(formData: FormData) {
  return markdownSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    body: formData.get("body"),
  });
}

export function parseContactForm(formData: FormData) {
  return contactSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    location: formData.get("location"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    businessHours: formData.get("businessHours"),
  });
}

export function parseFaqPayload(payload: unknown) {
  return faqSchema.safeParse(payload);
}
