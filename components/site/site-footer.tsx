import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const footerLinks = [
  { href: "/", label: "Início" },
  { href: "/planos", label: "Planos" },
  { href: "/terms", label: "Termos de Uso" },
  { href: "/privacy", label: "Política de Privacidade" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:px-8">
        <div>
          <Link href="/" className="block w-48">
            <BrandLogo className="h-auto w-full" />
          </Link>

          <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
            O ShamarConnect é uma solução da Moriah Systems para empresas que querem organizar atendimento, CRM, WhatsApp, automações e IA comercial em uma operação mais profissional.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
            <p className="font-black text-[#1B2F5B]">Moriah Systems Serviços Ltda</p>
            <p>CNPJ: 66.912.118/0001-02</p>
            <p>Rio de Janeiro, RJ — Brasil</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1B2F5B]">
            Navegação
          </h3>

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

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1B2F5B]">
            Suporte
          </h3>

          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <p>
              E-mail:{" "}
              <a
                href="mailto:suporte@shamarconnect.com.br"
                className="font-bold text-[#1B2F5B] hover:text-[#2ABFAB]"
              >
                suporte@shamarconnect.com.br
              </a>
            </p>

            <p>Atendimento para dúvidas comerciais, suporte técnico e solicitações sobre dados.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
          <p>© 2026 Moriah Systems Serviços Ltda. Todos os direitos reservados.</p>
          <p>ShamarConnect — WhatsApp • CRM • IA</p>
        </div>
      </div>
    </footer>
  );
}
