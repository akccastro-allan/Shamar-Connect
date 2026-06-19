import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const supportUser = "su" + "porte";
const supportDomain = "shamar" + "connect" + "." + "com" + "." + "br";
const supportEmail = `${supportUser}@${supportDomain}`;

const productLinks = [
  { href: "/#modulos", label: "WhatsApp e atendimento" },
  { href: "/#modulos", label: "CRM e pipeline" },
  { href: "/#modulos", label: "Campanhas" },
  { href: "/#modulos", label: "IA supervisionada" },
  { href: "/#modulos", label: "Dashboard e SLA" },
];

const solutionLinks = [
  { href: "/sobre", label: "Lojas e e-commerce" },
  { href: "/sobre", label: "Prestadores de serviço" },
  { href: "/sobre", label: "Agências" },
  { href: "/sobre", label: "Igrejas e eventos" },
  { href: "/sobre", label: "Equipes comerciais" },
];

const companyLinks = [
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
  { href: "/planos", label: "Planos e preços" },
  { href: "/login", label: "Login" },
];

const legalLinks = [
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/cancelamento-e-reembolso", label: "Cancelamento e Reembolso" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        {/* Top: brand + columns */}
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="block w-52 max-w-full" aria-label="ShamarConnect">
              <BrandLogo variant="complete" className="h-auto w-full object-contain" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-600">
              Atendimento, CRM e vendas em uma central inteligente para empresas que vivem no WhatsApp.
            </p>
            <div className="mt-5 inline-flex rounded-full bg-[#2ABFAB]/10 px-4 py-2 text-xs font-black text-[#1B2F5B]">
              WhatsApp · CRM · IA · Pipeline
            </div>
          </div>

          {/* Produto */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1B2F5B]">Produto</h3>
            <ul className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
              {productLinks.map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="hover:text-[#2ABFAB]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Soluções */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1B2F5B]">Soluções</h3>
            <ul className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
              {solutionLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-[#2ABFAB]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1B2F5B]">Empresa</h3>
            <ul className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[#2ABFAB]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mt-7 text-sm font-black uppercase tracking-[0.2em] text-[#1B2F5B]">Legal</h3>
            <ul className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[#2ABFAB]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1B2F5B]">Suporte</h3>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Dúvidas sobre acesso, contratação ou plataforma? Fale com nosso suporte.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-4 inline-flex text-sm font-black text-[#1B2F5B] hover:text-[#2ABFAB]"
            >
              {supportEmail}
            </a>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Entrar na central
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
          <p>© 2026 ShamarConnect. Todos os direitos reservados.</p>
          <p>Moriah Systems Serviços Ltda · Rio de Janeiro, Brasil</p>
        </div>
      </div>
    </footer>
  );
}
