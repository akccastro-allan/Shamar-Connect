import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça a Moriah Systems e o propósito do ShamarConnect.",
};

const values = [
  ["Processo", "Organizar atendimento, vendas e acompanhamento comercial em uma rotina clara."],
  ["Simplicidade", "Entregar tecnologia acessível para pequenas e médias empresas."],
  ["Crescimento", "Ajudar empresas a atender melhor, responder mais rápido e vender mais."],
  ["Controle", "Transformar conversas soltas em dados, histórico e próximas ações."],
];

const pillars = [
  ["WhatsApp", "Canal principal de relacionamento com clientes."],
  ["CRM", "Funil, contatos, oportunidades e histórico comercial."],
  ["IA", "Apoio ao atendimento sem substituir o controle humano."],
];

export default function SobrePage() {
  return (
    <main>
      <section className="bg-[#1B2F5B] px-6 py-20 text-white lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2ABFAB]">Sobre</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Tecnologia para empresas que vendem pelo atendimento</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">O ShamarConnect nasceu dentro da Moriah Systems para resolver uma dor simples: empresas dependem do WhatsApp, mas muitas ainda atendem sem processo, sem CRM e sem visão comercial.</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9952A]">Moriah Systems</p>
            <h2 className="mt-4 text-3xl font-black">Software com foco em operação real</h2>
            <p className="mt-5 leading-8 text-slate-200">A proposta é criar ferramentas práticas para empresas brasileiras organizarem atendimento, vendas, automações e dados em um único ambiente.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#C9952A]">Propósito</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#1B2F5B] sm:text-5xl">Tirar o atendimento do improviso</h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">Quando uma empresa atende pelo WhatsApp sem organização, oportunidades se perdem. O ShamarConnect centraliza conversas, contatos, funil, tarefas e dados para a equipe trabalhar com clareza.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {values.map(([title, text]) => (
              <article key={title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                <h3 className="text-xl font-black text-[#1B2F5B]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2ABFAB]">Produto</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#1B2F5B] sm:text-5xl">WhatsApp, CRM e IA no mesmo fluxo</h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">O foco não é apenas responder mensagens. É transformar cada conversa em relacionamento, oportunidade e venda acompanhada.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pillars.map(([title, text]) => (
              <article key={title} className="rounded-[2rem] bg-[#F8FAFC] p-8 text-center ring-1 ring-slate-200">
                <h3 className="text-2xl font-black text-[#2ABFAB]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#1B2F5B] p-10 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-black">Quer organizar seu atendimento comercial?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">Comece pelo ShamarConnect e evolua sua operação com processo, dados e automações.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-[#10233F]">Ver planos</Link>
        </div>
      </section>
    </main>
  );
}
