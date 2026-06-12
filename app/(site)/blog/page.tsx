import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Conteudos sobre atendimento pelo WhatsApp, CRM, vendas, automacao comercial e inteligencia artificial para pequenas e medias empresas.",
};

const topics = [
  "CRM para WhatsApp",
  "Atendimento comercial",
  "Automacao de vendas",
  "Inteligencia artificial no atendimento",
  "Organizacao de contatos",
  "Funil de vendas para pequenas empresas",
];

export default function BlogPage() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">
            Blog ShamarConnect
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Conteudos para vender mais e atender melhor pelo WhatsApp
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Artigos sobre CRM, WhatsApp, atendimento, vendas, automacao e IA para empresas que querem transformar conversas em oportunidades reais.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <article key={topic} className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-7 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C9952A]">
                Em breve
              </p>
              <h2 className="mt-4 text-xl font-black text-[#1B2F5B]">{topic}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Conteudo em preparacao para ajudar gestores, vendedores e equipes de atendimento a organizarem melhor a operacao comercial.
              </p>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black md:text-4xl">Quer organizar seu atendimento agora?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Enquanto os artigos estao sendo preparados, conheca os planos do ShamarConnect e veja como centralizar sua operacao comercial.
          </p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">
            Ver planos
          </Link>
        </div>
      </section>
    </main>
  );
}
