import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

const footerLinks = [
  { href: "/", label: "Início" },
  { href: "/planos", label: "Planos" },
  { href: "/sobre", label: "Sobre" },
  { href: "/login", label: "Entrar" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_0.8fr] md:px-8">
        <div>
          <Link href="/" className="block w-48" aria-label="ShamarConnect">
            <BrandLogo className="h-auto w-full" />
          </Link>
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
            WhatsApp, CRM, automações e IA para empresas que querem atender melhor e vender com processo.
          </p>
          <div className="mt-6 inline-flex rounded-full bg-[#2ABFAB]/10 px-4 py-2 text-sm font-black text-[#1B2F5B]">
            WhatsApp • CRM • IA
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1B2F5B]">Navegação</h3>
          <ul className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-[#2ABFAB]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
          <p>© 2026 ShamarConnect. Todos os direitos reservados.</p>
          <p>Moriah Systems Serviços Ltda</p>
        </div>
      </div>
    </footer>
  );
}
