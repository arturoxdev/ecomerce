import { Facebook, Instagram } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

type Props = {
  locale: Locale;
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

export function PublicFooter({ locale, rights, links }: Props) {
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
          <div className="flex justify-center space-x-6 md:order-2">
          <a className="text-slate-400 hover:text-slate-500" href="#">
            <span className="sr-only">Facebook</span>
            <Facebook aria-hidden="true" className="h-6 w-6" />
          </a>
          <a className="text-slate-400 hover:text-slate-500" href="#">
            <span className="sr-only">Instagram</span>
            <Instagram aria-hidden="true" className="h-6 w-6" />
          </a>
          </div>
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
