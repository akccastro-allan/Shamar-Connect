import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { getCurrentSession } from "@/lib/auth/session";

const navLinks = [
  { href: "/#produto", label: "Produto" },
  { href: "/#segmentos", label: "Segmentos" },
  { href: "/planos", label: "Planos" },
  { href: "/blog", label: "Blog" },
  { href: "/contato", label: "Contato" },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://shamarconnect.com.br"),
  title: {
    default: "Shamar Connect — Atendimento, CRM e vendas no WhatsApp",
    template: "%s | Shamar Connect",
  },
  description:
    "Centralize atendimento, histórico, equipe, CRM e vendas em uma plataforma profissional para empresas que vivem no WhatsApp.",
  keywords: [
    "CRM WhatsApp",
    "atendimento WhatsApp",
    "central de atendimento WhatsApp",
    "sistema WhatsApp empresa",
    "CRM para pequenas empresas",
    "Shamar Connect",
  ],
};

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  const isAuthenticated = session !== null;

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="Shamar Connect" className="flex items-center">
            <span className="text-xl font-black tracking-tight text-[#132B57] md:text-2xl">
              Shamar Connect
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 lg:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-[#132B57]">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={isAuthenticated ? "/operations" : "/login"}
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-[#132B57] shadow-sm transition hover:-translate-y-0.5 hover:border-[#2ABFAB] hover:text-[#13796D] sm:inline-flex"
            >
              {isAuthenticated ? "Abrir plataforma" : "Entrar"}
            </Link>
            <Link
              href="/planos"
              className="rounded-full bg-[#132B57] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#132B57]/15 transition hover:-translate-y-0.5 hover:bg-[#0E2147]"
            >
              Ver planos
            </Link>
          </div>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-slate-200/70 px-5 py-3 text-sm font-bold text-slate-600 lg:hidden">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[#132B57]">
              {link.label}
            </Link>
          ))}
          <Link href={isAuthenticated ? "/operations" : "/login"} className="font-black text-[#13796D]">
            {isAuthenticated ? "Plataforma" : "Entrar"}
          </Link>
        </nav>
      </header>

      {children}
      <SiteFooter />
    </div>
  );
}
