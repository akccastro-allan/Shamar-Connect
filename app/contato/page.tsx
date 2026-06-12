import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SiteFooter } from "@/components/site/site-footer";

const contactItems = [
  {
    title: "Suporte e atendimento",
    value: "suporte@shamarconnect.com.br",
    text: "Canal oficial para dúvidas comerciais, suporte técnico, privacidade e solicitações relacionadas ao ShamarConnect.",
  },
  {
    title: "Empresa responsável",
    value: "Moriah Systems Serviços Ltda",
    text: "CNPJ: 66.912.118/0001-02. Rio de Janeiro, RJ — Brasil.",
  },
  {
    title: "Produto",
    value: "ShamarConnect",
    text: "WhatsApp, CRM, automações e IA para empresas que querem profissionalizar o atendimento comercial.",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="block w-44 md:w-56">
            <BrandLogo className="h-auto w-full" />
          </Link>
          <Link
            href="/planos"
            className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white"
          >
            Ver planos
          </Link>
        </div>
      </header>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
            Contato
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Fale com a Moriah Systems
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Use os canais abaixo para falar sobre contratação, suporte técnico, privacidade, dados, integrações ou solicitações relacionadas ao ShamarConnect.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 md:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {contactItems.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-[#1B2F5B]">{item.title}</h2>
              <p className="mt-4 text-sm font-black text-[#2ABFAB]">{item.value}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] bg-[#1B2F5B] p-8 text-white md:p-10">
          <h2 className="text-2xl font-black md:text-3xl">Canal oficial de suporte</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
            Para solicitações sobre dados pessoais, revogação de permissões, exclusão de conta, suporte ou dúvidas comerciais, envie uma mensagem para o e-mail oficial.
          </p>
          <a
            href="mailto:suporte@shamarconnect.com.br"
            className="mt-7 inline-flex rounded-full bg-[#2ABFAB] px-7 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Enviar e-mail
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
