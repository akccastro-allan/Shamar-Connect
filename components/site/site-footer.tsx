import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const supportUser = "su" + "porte";
const supportDomain = "shamar" + "connect" + "." + "com" + "." + "br";
const supportEmail = `${supportUser}@${supportDomain}`;

const productLinks = [
  { href: "/#produto", label: "Produto" },
  { href: "/planos", label: "Planos" },
  { href: "/blog", label: "Blog" },
  { href: "/contato", label: "Contato" },
];

const legalLinks = [
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/cancelamento-e-reembolso", label: "Cancelamento e Reembolso" },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#0E2147] text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
          <div>
            <Link href="/" className="inline-flex rounded-2xl bg-white px-4 py-3" aria-label="Shamar Connect">
              <BrandLogo variant="complete" className="h-10 w-auto object-contain" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
              Atendimento, CRM e vendas em uma central profissional para empresas que vivem no WhatsApp.
            </p>
            <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-[#2ABFAB]">
              WhatsApp · CRM · Atendimento · Vendas
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-white/80">Produto</h3>
            <ul className="mt-5 space-y-3 text-sm font-semibold text-white/60">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[#2ABFAB]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-white/80">Legal</h3>
            <ul className="mt-5 space-y-3 text-sm font-semibold text-white/60">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[#2ABFAB]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-white/80">Suporte</h3>
            <p className="mt-5 text-sm leading-7 text-white/60">
              Dúvidas sobre acesso, contratação ou plataforma? Fale com nosso suporte.
            </p>
            <a href={`mailto:${supportEmail}`} className="mt-4 inline-flex text-sm font-black text-[#2ABFAB] hover:text-white">
              {supportEmail}
            </a>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex rounded-full bg-[#2ABFAB] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#22A898]"
              >
                Entrar na central
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-white/45 md:flex-row md:items-center md:justify-between md:px-8">
          <p>© 2026 Shamar Connect. Todos os direitos reservados.</p>
          <p>Moriah Systems Serviços Ltda · Rio de Janeiro, Brasil</p>
        </div>
      </div>
    </footer>
  );
}
