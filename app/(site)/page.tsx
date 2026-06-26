import Link from "next/link";
import type { Metadata } from "next";

import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Shamar Connect — Central de atendimento, relacionamento e vendas",
  description:
    "Organize WhatsApp, Instagram, Facebook, atendentes, setores, histórico e retornos em uma central de atendimento com humano no controle.",
  openGraph: {
    title: "Shamar Connect — Atendimento organizado para sua equipe",
    description:
      "Centralize canais, organize responsáveis e pare de perder clientes por falta de processo no atendimento.",
    url: "https://shamarconnect.com.br",
    type: "website",
  },
};

const pains = [
  {
    icon: "⏳",
    title: "Cliente esperando resposta",
    text: "O cliente chama, ninguém assume e a oportunidade esfria antes de virar venda.",
  },
  {
    icon: "📱",
    title: "Conversas espalhadas",
    text: "WhatsApp, Instagram, Facebook e balcão ficam sem histórico centralizado.",
  },
  {
    icon: "👥",
    title: "Ninguém sabe quem assumiu",
    text: "Duas pessoas respondem o mesmo cliente ou ninguém responde porque a fila não está clara.",
  },
  {
    icon: "🔥",
    title: "Dono apagando incêndio",
    text: "O gestor precisa lembrar de orçamento, retorno, pendência e pós-venda na cabeça.",
  },
  {
    icon: "💸",
    title: "Orçamento esquecido",
    text: "O cliente pediu preço, a equipe não acompanhou e a venda foi embora.",
  },
  {
    icon: "🎧",
    title: "Áudios difíceis de atender",
    text: "O cliente manda áudio, mas nem sempre o atendente pode ouvir na hora.",
  },
];

const connectModules = [
  {
    badge: "Atendimento",
    title: "Fila organizada para sua equipe",
    text: "Cada conversa pode ter setor, responsável, status e histórico. Sua equipe sabe o que responder e o gestor sabe o que está parado.",
    bullets: ["Responsável por conversa", "Setores e filas", "Histórico do cliente", "Status e pendências"],
    color: "#2ABFAB",
  },
  {
    badge: "Relacionamento",
    title: "Histórico para não começar do zero",
    text: "Mensagens, mídias, notas internas e contexto ficam no atendimento para a equipe continuar sem depender da memória de alguém.",
    bullets: ["Notas internas", "Respostas rápidas", "Assinatura do atendente", "Pós-venda e retorno"],
    color: "#1B2F5B",
  },
  {
    badge: "Vendas",
    title: "Pré-orçamento e follow-up com controle",
    text: "Transforme interesse em próximo passo: orçamento, aguardando cliente, aprovado, finalizado ou pós-venda.",
    bullets: ["Funil comercial", "Etapas por operação", "Acompanhamento de retorno", "Visão de gestor"],
    color: "#C9952A",
  },
  {
    badge: "Mídias",
    title: "Texto, imagem, figurinha e áudio no mesmo lugar",
    text: "O atendimento não pode quebrar quando o cliente manda áudio ou mídia. O Shamar organiza a conversa como ela acontece de verdade.",
    bullets: ["Áudio na central", "Imagem e documento", "Figurinha", "Transcrição como add-on"],
    color: "#2ABFAB",
  },
  {
    badge: "Integração",
    title: "Shamar Agent conecta sistemas internos",
    text: "O Agent é um conector local para buscar dados autorizados no sistema do cliente e levar informação útil para o atendimento.",
    bullets: ["Consulta de preços", "Produtos e estoque", "Agenda e serviços", "Escrita futura com auditoria"],
    color: "#1B2F5B",
  },
  {
    badge: "Gestão",
    title: "Humano no controle, processo visível",
    text: "O Shamar não substitui sua equipe nem seu sistema interno. Ele organiza a entrada do cliente e dá controle para quem atende.",
    bullets: ["Sem robô solto", "Sem trocar ERP", "Implantação assistida", "Operação acompanhada"],
    color: "#C9952A",
  },
];

const segments = [
  {
    icon: "🔧",
    title: "Oficinas e autopeças",
    text: "Organize atendimento, pré-orçamentos, retorno e consultas ao sistema atual sem substituir o ERP da empresa.",
  },
  {
    icon: "🍔",
    title: "Restaurantes e delivery",
    text: "Centralize pedidos, dúvidas, reclamações e pós-venda em uma fila clara para a equipe.",
  },
  {
    icon: "🏥",
    title: "Clínicas",
    text: "Evite paciente preso em robô, organize setores e acompanhe solicitações com atendimento humano rápido.",
  },
  {
    icon: "⛪",
    title: "Igrejas e eventos",
    text: "Organize inscrições, confirmações, dúvidas e comunicação com equipes diferentes.",
  },
  {
    icon: "🏢",
    title: "Empresas com várias marcas",
    text: "Separe canais, empresas, históricos e equipes sem misturar atendimentos.",
  },
  {
    icon: "🛒",
    title: "E-commerce e vendas online",
    text: "Transforme a loja virtual em porta de entrada para atendimento, orçamento e acompanhamento.",
  },
];

const optionalResources = [
  {
    title: "Transcrição de áudios",
    text: "Áudios podem virar texto sob demanda quando contratado, sem prometer transcrição automática em tempo real.",
    price: "A partir de R$ 29/mês",
  },
  {
    title: "Gravação de ligações",
    text: "Recurso opcional para auditoria, treinamento e conferência, com controle de acesso e retenção configurável.",
    price: "A partir de R$ 79/mês",
  },
  {
    title: "Armazenamento adicional",
    text: "Espaço extra para guardar mídias, documentos, áudios e gravações conforme o volume da operação.",
    price: "+10 GB por R$ 29/mês",
  },
  {
    title: "Shamar Agent",
    text: "Conector local para buscar informações autorizadas em sistemas internos e disponibilizar no atendimento.",
    price: "A partir de R$ 149/mês por conector",
  },
];

const planCards = [
  {
    name: "Essencial",
    label: "Para começar organizado",
    description: "Pequenas operações que precisam centralizar atendimento, histórico e respostas rápidas.",
    features: ["1 canal inicial", "Até 2 usuários", "Histórico de atendimento", "Mensagens rápidas", "Implantação assistida"],
  },
  {
    name: "Professional",
    label: "Mais indicado",
    description: "Equipes que precisam dividir atendimento, acompanhar retornos e parar de perder orçamento.",
    features: ["Múltiplos atendentes", "Setores e responsáveis", "Status de atendimento", "Funil comercial", "Métricas básicas"],
    highlight: true,
  },
  {
    name: "Business",
    label: "Operações maiores",
    description: "Empresas com mais canais, marcas, integrações e necessidade de recursos avançados.",
    features: ["Múltiplos canais", "Visão de gestor", "Descontos em add-ons", "Preparação para Agent", "Projetos de integração"],
  },
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
    <>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#2ABFAB]/15 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[#1B2F5B]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-7 inline-flex rounded-full border border-[#2ABFAB]/25 bg-[#2ABFAB]/10 px-5 py-2 text-sm font-black text-[#13796D]">
              Atendimento · Relacionamento · Vendas · Integração
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-[#1B2F5B] md:text-6xl lg:text-7xl">
              Pare de perder clientes por falta de organização no atendimento.
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              O Shamar Connect transforma mensagens soltas em atendimentos organizados, com responsável, setor, histórico e próximo passo claro.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/planos"
                className="rounded-full bg-[#2ABFAB] px-8 py-4 text-base font-black text-white shadow-lg shadow-[#2ABFAB]/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Ver planos e contratar
              </Link>
              <Link
                href="/contato"
                className="rounded-full border border-[#1B2F5B] bg-white px-8 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1B2F5B] hover:text-white hover:shadow-md"
              >
                Falar com especialista
              </Link>
              <Link
                href={isAuthenticated ? "/operations" : "/login"}
                className="rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {isAuthenticated ? "Abrir Plataforma" : "Entrar na Plataforma"}
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-5 rounded-[2rem] border border-slate-200 bg-slate-50 px-6 py-6 md:grid-cols-3 md:px-10">
            <div className="text-center">
              <p className="text-3xl font-black text-[#1B2F5B]">1</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Central para canais e equipe</p>
            </div>
            <div className="border-y border-slate-200 py-4 text-center md:border-x md:border-y-0 md:py-0">
              <p className="text-3xl font-black text-[#1B2F5B]">0</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">ERP substituído à força</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-[#1B2F5B]">100%</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Humano no controle</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Dores que curamos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            O problema não é falta de mensagem. É falta de processo.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pains.map((pain) => (
            <article key={pain.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-3xl">{pain.icon}</span>
              <h3 className="mt-4 text-base font-black text-[#1B2F5B]">{pain.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{pain.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="modulos" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Shamar Connect</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Central de atendimento, relacionamento e vendas
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              O Shamar organiza a entrada do cliente. O sistema atual da empresa continua cuidando da gestão interna.
            </p>
          </div>
          <div className="mt-14 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {connectModules.map((mod) => (
              <article key={mod.badge} className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-7">
                <span
                  className="inline-block rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wide text-white"
                  style={{ backgroundColor: mod.color }}
                >
                  {mod.badge}
                </span>
                <h3 className="mt-5 text-xl font-black text-[#1B2F5B]">{mod.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{mod.text}</p>
                <ul className="mt-5 space-y-2.5">
                  {mod.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckMark />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="overflow-hidden rounded-[2.5rem] bg-[#1B2F5B]">
          <div className="grid gap-10 px-8 py-14 md:grid-cols-[1fr_1fr] md:px-14 md:py-16 lg:items-center">
            <div>
              <div className="inline-flex rounded-full bg-[#2ABFAB]/20 px-4 py-2 text-sm font-black text-[#2ABFAB]">
                Shamar Agent
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
                O conector local entre o sistema do cliente e o Shamar Connect.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/70">
                O Agent é um aplicativo/conector instalado no ambiente da empresa para buscar informações autorizadas, como produtos, preços, estoque, veículos, agendamentos ou status de serviços.
              </p>
            </div>
            <div className="rounded-[2rem] bg-white/10 p-7">
              <ul className="space-y-5">
                {[
                  "Hoje: leitura de dados autorizados para apoiar o atendimento.",
                  "Amanhã: escrita controlada com permissão, auditoria e registro.",
                  "Não substitui ERP, sistema fiscal, estoque completo ou financeiro.",
                  "Não é IA, chatbot ou atendente virtual.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-4 text-sm font-semibold text-white/85">
                    <span className="text-xl">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Segmentos</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Para empresas que atendem, vendem e precisam dar retorno
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((segment) => (
              <article key={segment.title} className="flex gap-5 rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-6">
                <span className="text-3xl">{segment.icon}</span>
                <div>
                  <h3 className="font-black text-[#1B2F5B]">{segment.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{segment.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Recursos opcionais</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Contrate apenas o que sua operação realmente precisa
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {optionalResources.map((resource) => (
            <article key={resource.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-[#1B2F5B]">{resource.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{resource.text}</p>
              <p className="mt-5 rounded-2xl bg-[#2ABFAB]/10 px-4 py-3 text-sm font-black text-[#13796D]">
                {resource.price}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Planos</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Planos base + implantação assistida + add-ons
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Você começa organizando o atendimento e adiciona integração, transcrição, gravação ou armazenamento conforme a operação amadurece.
            </p>
          </div>
          <div className="mt-12 grid gap-7 lg:grid-cols-3">
            {planCards.map((plan) => (
              <article
                key={plan.name}
                className={
                  plan.highlight
                    ? "relative rounded-[2rem] border-2 border-[#2ABFAB] bg-white p-7 shadow-2xl shadow-[#2ABFAB]/10"
                    : "rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"
                }
              >
                {plan.highlight ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#C9952A] px-5 py-2 text-xs font-black uppercase tracking-wide text-white shadow">
                    Mais indicado
                  </div>
                ) : null}
                <p className="text-sm font-black uppercase tracking-wide text-[#2ABFAB]">{plan.label}</p>
                <h3 className="mt-2 text-3xl font-black text-[#1B2F5B]">{plan.name}</h3>
                <p className="mt-4 min-h-20 text-sm leading-6 text-slate-600">{plan.description}</p>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckMark />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/planos"
                  className={
                    plan.highlight
                      ? "mt-7 flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5"
                      : "mt-7 flex w-full justify-center rounded-2xl bg-[#1B2F5B] px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5"
                  }
                >
                  Ver plano completo
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#1B2F5B] px-6 py-16 text-center text-white shadow-2xl md:px-12">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">Shamar Connect</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Organize o atendimento, escolha um plano e comece com implantação assistida.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            O Shamar Connect não substitui sua equipe nem seu sistema atual. Ele organiza a entrada do cliente, registra histórico, define responsáveis e dá visibilidade para o gestor.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/planos"
              className="rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Ver planos
            </Link>
            <Link
              href="/contato"
              className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Falar com especialista
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
