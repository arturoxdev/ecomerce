import { z } from "zod";

export const localeSchema = z.enum(["en", "es"]);

export const aboutSchema = z.object({
  eyebrow: z.string().min(1, "El eyebrow es requerido"),
  title: z.string().min(1, "El título es requerido"),
  subtitle: z.string().min(1, "El subtítulo es requerido"),
  storyTitle: z.string().min(1, "El título de la historia es requerido"),
  storyBody: z.string().min(1, "El cuerpo de la historia es requerido"),
  valuesTitle: z.string().min(1, "El título de los valores es requerido"),
  valuesBody: z.string().min(1, "El cuerpo de los valores es requerido"),
});

export const markdownSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  subtitle: z.string().min(1, "El subtítulo es requerido"),
  body: z.string().min(1, "El contenido Markdown es requerido"),
});

export const contactSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  subtitle: z.string().min(1, "El subtítulo es requerido"),
  location: z.string().min(1, "La ubicación es requerida"),
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.email("El correo electrónico no es válido"),
  businessHours: z.string().min(1, "El horario de atención es requerido"),
});

export const faqSchema = z.object({
  question: z.string().min(1, "La pregunta es requerida"),
  answer: z.string().min(1, "La respuesta es requerida"),
  sortOrder: z.coerce.number().int().min(0, "El orden debe ser 0 o mayor"),
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
