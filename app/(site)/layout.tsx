import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { SiteFooter } from "@/components/site/site-footer";

const navLinks = [
  { href: "/", label: "Início" },
  { href: "/planos", label: "Planos" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://shamarconnect.com.br"),
  title: {
    default: "ShamarConnect — WhatsApp + CRM + IA",
    template: "%s | ShamarConnect",
  },
  description:
    "Atenda melhor, organize contatos, acompanhe oportunidades e profissionalize sua operação comercial no WhatsApp com CRM, automações e IA.",
  keywords: [
    "CRM WhatsApp",
    "atendimento WhatsApp",
    "sistema WhatsApp empresa",
    "CRM para pequenas empresas",
    "WhatsApp com IA",
    "automação WhatsApp",
    "ShamarConnect",
  ],
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
          <Link href="/" aria-label="ShamarConnect" className="flex items-center">
            <BrandLogo variant="mark" className="h-20 w-auto object-contain" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-[#1B2F5B]">
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/login"
            className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#132344]"
          >
            Entrar
          </Link>
        </div>

        <nav className="flex justify-center gap-6 border-t border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 md:hidden">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[#1B2F5B]">
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}
      <SiteFooter />
    </div>
  );
}
