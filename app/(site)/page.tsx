import Link from "next/link";
import type { Metadata } from "next";

import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "ShamarConnect — Pare de perder clientes por falta de organização",
  description:
    "Organize atendimentos em WhatsApp, Instagram e Facebook com equipe, histórico, responsáveis e próximos passos em uma central simples.",
  openGraph: {
    title: "ShamarConnect — Atendimento organizado para empresas reais",
    description: "Transforme mensagens soltas em atendimentos organizados.",
    url: "https://shamarconnect.com.br",
    type: "website",
  },
};

const painCards = [
  {
    icon: "⏱️",
    title: "Cliente esperando resposta",
    pain: "A conversa chega, ninguém assume e o cliente procura outro lugar.",
    cure: "Mostramos quem está aguardando, há quanto tempo e quem precisa responder.",
  },
  {
    icon: "📱",
    title: "Conversas espalhadas",
    pain: "WhatsApp, Instagram, Facebook e celulares diferentes deixam tudo fora de controle.",
    cure: "Reunimos os canais em uma central com histórico, filtros e responsáveis.",
  },
  {
    icon: "👥",
    title: "Ninguém sabe quem assumiu",
    pain: "Duas pessoas respondem o mesmo cliente ou ninguém responde.",
    cure: "Cada conversa tem setor, status e responsável visível para a equipe.",
  },
  {
    icon: "🔥",
    title: "O dono apaga incêndio",
    pain: "Retornos, orçamentos e pendências ficam na cabeça do gestor.",
    cure: "A equipe opera com filas, próximos passos e acompanhamento.",
  },
  {
    icon: "💸",
    title: "Orçamento que esfria",
    pain: "O cliente pede preço, ninguém acompanha e a venda morre no caminho.",
    cure: "O atendimento ganha status, lembrete de retorno e histórico do combinado.",
  },
  {
    icon: "🤖",
    title: "Robô atrapalhando",
    pain: "O cliente escreve diferente, o robô insiste e demora para chamar humano.",
    cure: "Automação ajuda, mas o atendimento humano sempre pode assumir.",
  },
];

const segments = [
  { icon: "🔧", title: "Oficinas e autopeças", text: "Pré-atendimento, orçamento, veículo, responsável e retorno para não perder oportunidades." },
  { icon: "🍩", title: "Restaurantes e delivery", text: "Pedidos, dúvidas, pagamentos, entregas e retornos em uma fila simples para a equipe." },
  { icon: "🏥", title: "Clínicas", text: "Recepção, agendamento, convênios, exames e financeiro com fila e supervisão humana." },
  { icon: "⛪", title: "Igrejas e eventos", text: "Comunicados, chamadas e lembretes para responsáveis, voluntários e participantes." },
  { icon: "🏢", title: "Várias marcas", text: "Empresas, canais e equipes separados, com clareza de quem está respondendo." },
  { icon: "🎧", title: "Centrais com muitos áudios", text: "Base preparada para mídia e transcrição, ajudando atendentes que nem sempre podem usar fone." },
];

const steps = [
  { step: "1", title: "Mapeamos a dor", text: "Identificamos onde a empresa perde cliente: entrada, orçamento, agendamento, retorno ou equipe." },
  { step: "2", title: "Configuramos a operação", text: "Canais, setores, usuários, mensagens rápidas, status e fluxo inicial de atendimento." },
  { step: "3", title: "A equipe começa simples", text: "O atendente vê quem chamou, de onde veio, quem assumiu e qual é o próximo passo." },
  { step: "4", title: "Evoluímos por etapas", text: "Depois da entrada organizada, avançamos para automações, mídia, transcrição, relatórios e integrações." },
];

const plans = [
  { name: "Essencial", label: "Para organizar a entrada", features: ["1 empresa", "1 canal inicial", "Até 2 usuários", "Setores simples", "Histórico", "Implantação assistida"] },
  { name: "Equipes", label: "Mais indicado", features: ["Múltiplos atendentes", "Filas por setor", "Responsável por conversa", "Supervisão", "Status e pendências", "Treinamento"] },
  { name: "Portfólio", label: "Para várias marcas", features: ["Múltiplas empresas", "Vários canais", "Visão do gestor", "Marcas separadas", "Permissões por equipe", "Implantação personalizada"] },
];

function CheckMark() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ABFAB]/15 text-xs font-black text-[#2ABFAB]">
      ✓
    </span>
  );
}

export default async function HomePage() {
  const session = await getCurrentSession();
  const isAuthenticated = session !== null;

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#2ABFAB]/15 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[#1B2F5B]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-32">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto mb-7 inline-flex rounded-full border border-[#2ABFAB]/25 bg-[#2ABFAB]/10 px-5 py-2 text-sm font-black text-[#13796D]">
              WhatsApp · Instagram · Facebook · Equipe · Histórico
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-[#1B2F5B] md:text-6xl lg:text-7xl">
              Pare de perder clientes por falta de organização no atendimento.
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              O Shamar Connect transforma mensagens soltas em atendimentos organizados, com responsável, setor, histórico e próximo passo claro.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/contato" className="rounded-full bg-[#2ABFAB] px-8 py-4 text-base font-black text-white shadow-lg shadow-[#2ABFAB]/25 transition hover:-translate-y-0.5 hover:shadow-xl">
                Quero organizar meu atendimento
              </Link>
              <Link href="/planos" className="rounded-full border border-[#1B2F5B] bg-white px-8 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1B2F5B] hover:text-white hover:shadow-md">
                Ver implantação assistida
              </Link>
              <Link href={isAuthenticated ? "/operations" : "/login"} className="rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                {isAuthenticated ? "Abrir plataforma" : "Entrar"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Dores que curamos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Seu cliente não quer esperar. Sua equipe precisa saber o que fazer.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            O site agora vende o que realmente importa: menos cliente perdido, menos improviso e mais controle para a equipe.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {painCards.map((item) => (
            <article key={item.title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <span className="text-3xl">{item.icon}</span>
              <h3 className="mt-4 text-xl font-black text-[#1B2F5B]">{item.title}</h3>
              <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#C9952A]">A dor</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.pain}</p>
              <p className="mt-4 text-sm font-bold uppercase tracking-wide text-[#2ABFAB]">Como resolvemos</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{item.cure}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">A solução</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Uma central simples para transformar conversa em atendimento.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              O sistema organiza a entrada dos clientes, mostra pendências, separa setores e ajuda sua equipe a dar retorno sem depender da memória do dono.
            </p>
            <div className="mt-8 grid gap-3">
              {["Canais reunidos em uma central", "Conversas por empresa, marca, setor e responsável", "Histórico e contexto para responder melhor", "Status de envio, falha e pendência", "Implantação assistida para operar de verdade"].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 text-sm font-semibold text-slate-700">
                  <CheckMark />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2.5rem] border border-slate-200 bg-[#F8FAFC] p-6 shadow-sm">
            <div className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#2ABFAB]">Atendimento aguardando</p>
                  <h3 className="mt-1 text-xl font-black text-[#1B2F5B]">Cliente pediu orçamento</h3>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Precisa de você</span>
              </div>
              <div className="mt-5 grid gap-3">
                {[["Canal", "WhatsApp Lips"], ["Setor", "Oficina / Orçamento"], ["Responsável", "Ainda sem atendente"], ["Próxima ação", "Coletar veículo e retornar avaliação"]].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 font-bold text-[#1B2F5B]">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-[#2ABFAB]/10 p-4 text-sm font-semibold text-[#13796D]">
                Respondendo como: Lips Autopeças — WhatsApp Principal
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Para quem é</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Cada operação tem sua dor. A base é atendimento organizado.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((item) => (
            <article key={item.title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <span className="text-3xl">{item.icon}</span>
              <h3 className="mt-4 text-xl font-black text-[#1B2F5B]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#1B2F5B] py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">Como funciona</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              Implantação assistida, sem jogar o sistema no colo da equipe.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {steps.map((item) => (
              <article key={item.step} className="rounded-[2rem] border border-white/10 bg-white/10 p-7">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2ABFAB] text-sm font-black text-white">{item.step}</div>
                <h3 className="mt-5 text-lg font-black text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/70">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Planos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Comece pela dor que mais custa caro.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Primeiro organizamos a entrada dos clientes. Depois evoluímos para automações, mídia, transcrição, relatórios e integrações.
          </p>
        </div>
        <div className="mt-12 grid gap-7 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={plan.label === "Mais indicado" ? "relative rounded-[2rem] border-2 border-[#2ABFAB] bg-white p-7 shadow-2xl shadow-[#2ABFAB]/10" : "rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"}>
              <p className="text-sm font-black uppercase tracking-wide text-[#2ABFAB]">{plan.label}</p>
              <h3 className="mt-2 text-3xl font-black text-[#1B2F5B]">{plan.name}</h3>
              <p className="mt-5 text-2xl font-black text-[#1B2F5B]">sob consulta</p>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckMark />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/contato" className={plan.label === "Mais indicado" ? "mt-7 flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5" : "mt-7 flex w-full justify-center rounded-2xl bg-[#1B2F5B] px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5"}>
                Conversar sobre esse plano
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#1B2F5B] px-6 py-16 text-center text-white shadow-2xl md:px-12">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">ShamarConnect</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Cliente perdido por falta de resposta é dinheiro saindo pela porta.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Organize a entrada, distribua responsabilidades e dê para sua equipe uma central bonita, simples e feita para o trabalho real.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/contato" className="rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl">
              Quero uma demonstração
            </Link>
            <Link href="/planos" className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15">
              Ver planos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
