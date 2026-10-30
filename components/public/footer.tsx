import { Facebook, Instagram } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

type Props = {
  locale: Locale;
  socialLinks: {
    facebookUrl: string | null;
    instagramUrl: string | null;
  };
  rights: string;
  links: {
    about: string;
    contact: string;
    faq: string;
    terms: string;
    privacy: string;
    refundPolicy: string;
  };
};

export function PublicFooter({ locale, socialLinks, rights, links }: Props) {
  // Solo se muestran las redes que el owner configuró en Ajustes → Redes sociales.
  const socials = [
    { href: socialLinks.facebookUrl, label: "Facebook", Icon: Facebook },
    { href: socialLinks.instagramUrl, label: "Instagram", Icon: Instagram },
  ].filter((social): social is typeof social & { href: string } => !!social.href);

  const footerLinks = [
    { href: `/${locale}/about`, label: links.about },
    { href: `/${locale}/contact`, label: links.contact },
    { href: `/${locale}/faq`, label: links.faq },
    { href: `/${locale}/terms`, label: links.terms },
    { href: `/${locale}/privacy`, label: links.privacy },
    { href: `/${locale}/refund-policy`, label: links.refundPolicy },
  ];

  return (
    <footer className="border-t border-slate-200 bg-[#f8fafc]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-8 py-8 lg:px-20">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-500">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {socials.length > 0 ? (
            <div className="flex justify-center space-x-6 md:order-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  className="text-slate-400 hover:text-slate-500"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sr-only">{label}</span>
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </a>
              ))}
            </div>
          ) : null}
          <div className="md:order-1">
            <p className="text-center text-xs leading-5 text-slate-500 md:text-left">
              {rights}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
