import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { SiteFooter } from "@/components/site/site-footer";

const contactItems = [
  {
    title: "Contratação",
    value: "Conhecer os planos",
    text: "Para começar com o ShamarConnect, acesse os planos e escolha a estrutura mais adequada para sua operação.",
    href: "/planos",
  },
  {
    title: "Acesso ao sistema",
    value: "Entrar na plataforma",
    text: "Clientes e equipes cadastradas podem acessar o painel pelo login do ShamarConnect.",
    href: "/login",
  },
  {
    title: "Empresa responsável",
    value: "Moriah Systems Serviços Ltda",
    text: "Empresa brasileira, sediada no Rio de Janeiro, responsável pelo desenvolvimento do ShamarConnect.",
    href: "/sobre",
  },
];

const reasons = [
  "Organizar atendimento comercial pelo WhatsApp",
  "Escolher um plano para sua empresa",
  "Entender CRM, automações e Módulo IA",
  "Avaliar integração local via Shamar Agent",
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="block w-44 md:w-56" aria-label="ShamarConnect">
            <BrandLogo className="h-auto w-full" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="hover:text-[#1B2F5B]">Início</Link>
            <Link href="/planos" className="hover:text-[#1B2F5B]">Planos</Link>
            <Link href="/sobre" className="hover:text-[#1B2F5B]">Sobre</Link>
          </nav>

          <Link href="/login" className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            Entrar
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-[#1B2F5B]/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-5 py-20 text-center md:px-8 md:py-28">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Contato</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Vamos organizar o atendimento da sua empresa
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            O ShamarConnect ajuda empresas que vendem pelo WhatsApp a centralizar conversas, acompanhar oportunidades e trabalhar com CRM, automações e IA.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {contactItems.map((item) => (
            <article key={item.title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <p className="text-sm font-black uppercase tracking-wide text-[#2ABFAB]">{item.title}</p>
              <h2 className="mt-4 text-2xl font-black text-[#1B2F5B]">{item.value}</h2>
              <p className="mt-4 min-h-24 text-sm leading-7 text-slate-600">{item.text}</p>
              <Link href={item.href} className="mt-6 inline-flex rounded-full bg-[#1B2F5B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg">
                Acessar
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Quando falar conosco</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Use esta página como ponto de partida para avançar com o ShamarConnect
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              A contratação começa pela escolha do plano. Depois, a empresa acessa o painel e configura sua operação de atendimento e vendas.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-8">
            <ul className="space-y-4">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-3 text-sm leading-7 text-slate-700">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ABFAB]/10 text-xs font-black text-[#2ABFAB]">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#1B2F5B] px-6 py-16 text-center text-white shadow-2xl md:px-12">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">Próximo passo</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Conheça os planos e comece com a estrutura certa
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Escolha entre Starter, Professional e Business conforme o momento da sua empresa.
          </p>
          <Link href="/planos" className="mt-9 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl">
            Ver planos
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
