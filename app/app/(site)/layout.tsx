import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

export const metadata: Metadata = {
  metadataBase: new URL("https://shamarconnect.com.br"),
  title: {
    default: "ShamarConnect — WhatsApp + CRM + IA",
    template: "%s | ShamarConnect",
  },
  description:
    "Atenda mais, venda mais e organize seu WhatsApp com CRM, automações e IA. Planos a partir de R$ 97/mês.",
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
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <BrandLogo className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/planos" className="text-sm font-medium text-slate-600 hover:text-[#1B2F5B]">Planos</Link>
            <Link href="/sobre" className="text-sm font-medium text-slate-600 hover:text-[#1B2F5B]">Sobre</Link>
            <Link href="/contato" className="text-sm font-medium text-slate-600 hover:text-[#1B2F5B]">Contato</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[#1B2F5B]">
              Entrar
            </Link>
            <Link href="/planos" className="bg-[#2ABFAB] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#239f90] transition">
              Escolher plano
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">{children}</main>

      <footer className="bg-[#1B2F5B] text-white mt-20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <BrandLogo className="h-8 w-auto brightness-0 invert mb-4" />
              <p className="text-slate-300 text-sm">WhatsApp • CRM • IA</p>
              <p className="text-slate-400 text-xs mt-4">CNPJ: 66.912.118/0001-02</p>
              <p className="text-slate-400 text-xs">Moriah Systems Serviços Ltda</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><Link href="/planos" className="hover:text-white">Planos</Link></li>
                <li><Link href="/login" className="hover:text-white">Entrar</Link></li>
                <li><Link href="/planos" className="hover:text-white">Criar conta</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><Link href="/sobre" className="hover:text-white">Sobre</Link></li>
                <li><Link href="/contato" className="hover:text-white">Contato</Link></li>
                <li><a href="mailto:suporte@shamarconnect.com.br" className="hover:text-white">Suporte</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><Link href="/terms" className="hover:text-white">Termos de Uso</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">© 2026 Moriah Systems Serviços Ltda. Todos os direitos reservados.</p>
            <a href="mailto:suporte@shamarconnect.com.br" className="text-slate-400 text-sm hover:text-white">
              suporte@shamarconnect.com.br
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
