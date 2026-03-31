export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "My Store",
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? "",
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL ?? "",
  adminTitle: process.env.NEXT_PUBLIC_ADMIN_TITLE ?? "Admin",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@example.com",
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@example.com",
} as const;
