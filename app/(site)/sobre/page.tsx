import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça a Moriah Systems e o propósito do ShamarConnect.",
};

export default function SobrePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-5 py-20 text-center md:px-8 md:py-28">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Sobre</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Construímos o sistema que gostaríamos de ter usado.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            O ShamarConnect nasceu da experiência direta com equipes que vendem e atendem pelo WhatsApp — e da frustração com ferramentas genéricas que não entendem essa realidade.
          </p>
        </div>
      </section>

      {/* Missão */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Nossa missão</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Dar estrutura e processo para quem atende pelo WhatsApp
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Acreditamos que empresas pequenas e médias merecem a mesma organização operacional das grandes — sem complexidade desnecessária, sem custo proibitivo.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              O ShamarConnect é uma plataforma brasileira, construída para a realidade do mercado nacional: WhatsApp como canal principal, equipes enxutas, e a necessidade de crescer com controle.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {[
              { label: "Central única", text: "WhatsApp, CRM, pipeline e campanhas num só painel." },
              { label: "IA supervisionada", text: "Sugestões inteligentes com controle humano obrigatório." },
              { label: "Multiempresa", text: "Uma plataforma para gerenciar várias operações." },
              { label: "Implantação incluída", text: "Todo plano vem com configuração assistida da operação." },
            ].map((item) => (
              <article key={item.label} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-black text-[#1B2F5B]">{item.label}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Propósito */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1fr] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Propósito</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
                Tirar o atendimento do improviso
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Quando uma empresa atende pelo WhatsApp sem organização, oportunidades se perdem. O ShamarConnect centraliza conversas, contatos, funil e dados para a equipe trabalhar com clareza.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                { label: "Processo", text: "Organizar atendimento, vendas e acompanhamento em uma rotina clara." },
                { label: "Simplicidade", text: "Entregar tecnologia acessível para pequenas e médias empresas." },
                { label: "Crescimento", text: "Ajudar empresas a atender melhor, responder mais rápido e vender mais." },
                { label: "Controle", text: "Transformar conversas soltas em dados, histórico e próximas ações." },
              ].map((item) => (
                <article key={item.label} className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-6">
                  <h3 className="text-xl font-black text-[#1B2F5B]">{item.label}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">Produto</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            WhatsApp, CRM e IA no mesmo fluxo
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            O foco não é apenas responder mensagens. É transformar cada conversa em relacionamento, oportunidade e venda acompanhada.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { label: "WhatsApp", color: "#2ABFAB", text: "Canal principal de relacionamento com clientes." },
            { label: "CRM", color: "#1B2F5B", text: "Funil, contatos, oportunidades e histórico comercial." },
            { label: "IA", color: "#C9952A", text: "Apoio ao atendimento sem substituir o controle humano." },
          ].map((item) => (
            <article key={item.label} className="rounded-[2rem] bg-[#F8FAFC] p-8 text-center ring-1 ring-slate-200">
              <h3 className="text-2xl font-black" style={{ color: item.color }}>{item.label}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Empresa */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Empresa responsável</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">Moriah Systems</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Moriah Systems Serviços Ltda é uma empresa brasileira, sediada no Rio de Janeiro, focada no desenvolvimento de software para operações comerciais e de atendimento.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
            <dl className="grid gap-5 text-sm sm:grid-cols-2">
              {[
                { label: "Empresa", value: "Moriah Systems Serviços Ltda" },
                { label: "País", value: "Brasil" },
                { label: "Sede", value: "Rio de Janeiro, RJ" },
                { label: "Produto", value: "ShamarConnect" },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">{item.label}</dt>
                  <dd className="mt-1 font-bold text-[#1B2F5B]">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#1B2F5B] px-6 py-16 text-center text-white shadow-2xl md:px-12">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">Próximo passo</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Conheça os planos e comece a operar
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Todos os planos incluem implantação assistida. Sua empresa começa com a operação configurada.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/planos" className="rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl">
              Ver planos
            </Link>
            <Link href="/contato" className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15">
              Falar com especialista
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
