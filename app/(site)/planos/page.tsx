import Link from "next/link";
import type { Metadata } from "next";
import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Planos — Shamar Connect",
  description:
    "Planos base, implantação assistida e recursos opcionais do Shamar Connect.",
};

const plans = [
  {
    slug: "starter",
    name: "Essencial",
    eyebrow: "Para começar organizado",
    description:
      "Para pequenas operações que precisam centralizar atendimento, histórico e respostas rápidas.",
    price: "R$ 149",
    setup: "Implantação R$ 297",
    highlight: false,
    bestFor: "negócios com poucos atendentes",
    features: [
      "1 empresa",
      "1 canal inicial",
      "até 2 usuários",
      "histórico de atendimento",
      "respostas rápidas",
      "notas internas",
      "implantação assistida",
    ],
  },
  {
    slug: "professional",
    name: "Professional",
    eyebrow: "Mais indicado",
    description:
      "Para equipes que precisam dividir atendimento, controlar responsáveis, acompanhar orçamento, retorno e pós-venda.",
    price: "R$ 297",
    setup: "Implantação R$ 497",
    highlight: true,
    bestFor: "equipes comerciais e atendimento diário",
    features: [
      "múltiplos atendentes",
      "setores e filas",
      "responsável por conversa",
      "status de atendimento",
      "histórico por cliente",
      "funil comercial",
      "métricas básicas",
      "implantação e treinamento",
    ],
  },
  {
    slug: "business",
    name: "Business",
    eyebrow: "Para operações maiores",
    description:
      "Para empresas com vários canais, marcas, equipes, add-ons e necessidade de integração.",
    price: "R$ 597",
    setup: "Implantação R$ 997",
    highlight: false,
    bestFor: "operações com volume e gestão",
    features: [
      "múltiplos canais",
      "múltiplas equipes ou marcas",
      "visão de gestor",
      "permissões avançadas",
      "relatórios e acompanhamento",
      "descontos em add-ons selecionados",
      "preparação para Shamar Agent",
      "implantação assistida avançada",
    ],
  },
];

const addOns = [
  ["IA assistiva", "Sugestões e apoio inteligente", "R$ 79,90/mês"],
  ["Transcrição Start", "Áudios em texto até 1.000 min/mês", "R$ 29/mês"],
  ["Transcrição Volume", "Áudios em texto até 10.000 min/mês", "R$ 449/mês"],
  ["Gravação 100h", "Chamadas para conferência e treinamento", "R$ 79/mês"],
  ["Gravação 500h", "Pacote intermediário de chamadas", "R$ 249/mês"],
  ["Gravação 1.000h", "Pacote avançado de chamadas", "R$ 399/mês"],
  ["Armazenamento +10 GB", "Mídias, documentos e gravações", "R$ 29/mês"],
  ["Armazenamento +50 GB", "Mais retenção e volume de mídia", "R$ 119/mês"],
  ["Armazenamento +100 GB", "Alto volume e retenção maior", "R$ 199/mês"],
  ["Shamar Agent Local", "Conector local para dados autorizados", "R$ 149/mês por conector"],
];

const services = [
  ["Diagnóstico técnico", "R$ 497", "Análise do ambiente, sistema atual, acesso, riscos e viabilidade."],
  ["Implantação de integração", "A partir de R$ 1.500", "Instalação, configuração e validação do Shamar Agent."],
  ["Integração customizada", "Sob orçamento", "Projeto conforme sistema, e-commerce, API, banco ou arquivo do cliente."],
];

const faqs = [
  [
    "O Shamar Connect substitui meu sistema atual?",
    "Não. O Shamar Connect organiza atendimento, relacionamento e vendas. O sistema atual da empresa continua cuidando da gestão interna.",
  ],
  [
    "O que é o Shamar Agent?",
    "É um aplicativo/conector local instalado no ambiente do cliente para integrar sistemas internos ao Shamar Connect e buscar dados autorizados para apoiar o atendimento.",
  ],
  [
    "O Agent é IA ou chatbot?",
    "Não. O Agent não é IA, chatbot, atendente virtual nem robô de conversa. Ele é uma ponte técnica de integração.",
  ],
  [
    "A transcrição de áudios é automática?",
    "Não prometemos transcrição automática em tempo real. A proposta comercial é transcrição sob demanda, acionada quando o recurso estiver contratado e habilitado.",
  ],
  [
    "Gravação de ligações vem inclusa?",
    "Não. Gravação de ligações é recurso opcional, com controle de acesso, retenção configurável e atenção à privacidade.",
  ],
];

type PlanosPageProps = {
  searchParams?: Promise<{ reason?: string }>;
};

function CheckIcon() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ABFAB]/12 text-[#13796D]">
      <CheckCircle2 className="h-3.5 w-3.5" />
    </span>
  );
}

function PlanMiniPreview() {
  return (
    <div className="relative mx-auto max-w-[520px]">
      <div className="absolute -left-4 top-10 hidden rounded-2xl bg-white px-4 py-3 shadow-2xl shadow-black/20 md:block">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Plano atual</p>
        <p className="mt-1 text-sm font-black text-[#132B57]">Professional</p>
      </div>
      <div className="absolute -right-4 bottom-12 hidden rounded-2xl bg-white px-4 py-3 shadow-2xl shadow-black/20 lg:block">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Implantação</p>
        <p className="mt-1 text-sm font-black text-[#13796D]">Assistida</p>
      </div>

      <div className="rounded-[2.25rem] bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur">
        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-black/25">
          <div className="border-b border-slate-100 bg-[#F7F9FC] px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#13796D]">Contratação</p>
            <p className="mt-1 text-sm font-black text-[#132B57]">Resumo do plano</p>
          </div>

          <div className="space-y-3 p-5">
            {[
              ["Essencial", "R$ 149/mês", false],
              ["Professional", "R$ 297/mês", true],
              ["Business", "R$ 597/mês", false],
            ].map(([name, price, active]) => (
              <div
                key={String(name)}
                className={`rounded-2xl border p-4 ${
                  active ? "border-[#2ABFAB]/35 bg-[#2ABFAB]/7" : "border-slate-100 bg-[#F8FAFC]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-[#132B57]">{name}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">Implantação assistida</p>
                  </div>
                  <p className="font-black text-[#132B57]">{price}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 p-5">
            {[
              ["Canal", "WhatsApp"],
              ["Equipe", "Setores"],
              ["Status", "Ativo"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#F7F9FC] p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-xs font-black text-[#132B57]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 left-1/2 h-16 w-[78%] -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
    </div>
  );
}

export default async function PlanosPage({ searchParams }: PlanosPageProps) {
  const params = await searchParams;
  const showUnauthorizedNotice = params?.reason === "not-authorized";

  return (
    <>
      {showUnauthorizedNotice ? (
        <section className="border-b border-[#C9952A]/20 bg-[#FFF7E8] px-5 py-5 text-center md:px-8">
          <p className="mx-auto max-w-3xl text-sm font-bold leading-6 text-[#8A5D12]">
            Seu e-mail ainda não possui acesso ao Shamar Connect. Para usar o sistema, escolha um plano ou fale com nossa equipe para ativar sua conta.
          </p>
        </section>
      ) : null}

      <section className="relative overflow-hidden bg-[#0B1220] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(42,191,171,0.22),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.10),transparent_28%)]" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rotate-12 rounded-[3rem] bg-white/5" />
        <div className="absolute right-24 top-24 h-52 w-52 rotate-12 rounded-[2.5rem] bg-[#2ABFAB]/10" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-black text-[#86F2E2] ring-1 ring-white/10">
              <Sparkles className="h-4 w-4" />
              Planos base · Implantação assistida
            </div>

            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
              Escolha o plano para organizar seu atendimento.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              O pagamento confirma a contratação. A liberação é feita com implantação assistida para evitar configuração errada e começar com a operação organizada.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#planos"
                className="inline-flex items-center justify-center rounded-full bg-[#2ABFAB] px-7 py-4 text-sm font-black text-white shadow-xl shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:bg-[#22A898]"
              >
                Escolher plano
              </a>
              <Link
                href="/checkout?plan=professional"
                className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/8 px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/12"
              >
                Ir direto para checkout
              </Link>
              <Link
                href="/contato"
                className="inline-flex items-center justify-center rounded-full px-7 py-4 text-sm font-black text-white/80 transition hover:bg-white/8"
              >
                Falar antes
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2">
              {["Sem auto-provisionamento", "Checkout seguro", "Ativação assistida", "Add-ons opcionais"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/7 px-4 py-3 ring-1 ring-white/10">
                  <CheckIcon />
                  <span className="text-sm font-bold text-white/82">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <PlanMiniPreview />
        </div>
      </section>

      <section id="planos" className="bg-[#F6F8FC] py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Planos</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#132B57] md:text-5xl">
                Três formas simples de começar.
              </h2>
            </div>
            <p className="text-base leading-8 text-slate-600">
              O plano base organiza o atendimento. Os recursos opcionais entram quando a empresa realmente precisa de mais volume, gravação, transcrição ou integração.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.slug}
                className={`relative rounded-[2rem] border bg-white p-7 shadow-sm ${
                  plan.highlight ? "border-[#2ABFAB] shadow-xl shadow-[#2ABFAB]/10" : "border-slate-200"
                }`}
              >
                {plan.highlight ? (
                  <div className="absolute -top-4 left-7 rounded-full bg-[#C9952A] px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
                    Mais indicado
                  </div>
                ) : null}

                <p className="text-sm font-black uppercase tracking-wide text-[#13796D]">{plan.eyebrow}</p>
                <h3 className="mt-3 text-3xl font-black text-[#132B57]">{plan.name}</h3>
                <p className="mt-4 min-h-20 text-sm leading-6 text-slate-600">{plan.description}</p>

                <div className="mt-7 rounded-3xl bg-[#F7F9FC] p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Plano base</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tight text-[#132B57]">{plan.price}</span>
                    <span className="pb-1 text-sm font-bold text-slate-500">/mês</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">{plan.setup}</p>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Ideal para</p>
                  <p className="mt-2 text-sm font-black text-[#132B57]">{plan.bestFor}</p>
                </div>

                <Link
                  href={`/checkout?plan=${plan.slug}`}
                  className={`mt-7 inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-black transition hover:-translate-y-0.5 ${
                    plan.highlight
                      ? "bg-[#2ABFAB] text-white shadow-lg shadow-[#2ABFAB]/20 hover:bg-[#22A898]"
                      : "bg-[#132B57] text-white shadow-md shadow-[#132B57]/10 hover:bg-[#0E2147]"
                  }`}
                >
                  Contratar {plan.name}
                </Link>

                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="addons" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Add-ons</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#132B57] md:text-5xl">
              Recursos opcionais, sem empurrar pacote desnecessário.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Transcrição, gravação, armazenamento e Agent entram conforme o volume e a necessidade real da operação.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {addOns.map(([title, description, price]) => (
              <article key={title} className="rounded-[1.6rem] border border-slate-200 bg-[#F8FAFC] p-5 shadow-sm">
                <p className="font-black text-[#132B57]">{title}</p>
                <p className="mt-2 min-h-10 text-sm leading-6 text-slate-600">{description}</p>
                <p className="mt-4 text-lg font-black text-[#13796D]">{price}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-[#C9952A]/20 bg-[#FFF7E8] p-7 text-sm leading-7 text-[#8A5D12]">
            <strong>Importante:</strong> gravação de ligações exige configuração, controle de acesso e retenção definida. Transcrição é sob demanda. O Shamar Agent é integração técnica e não substitui o sistema atual.
          </div>
        </div>
      </section>

      <section className="bg-[#F6F8FC] py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#132B57] p-8 text-white shadow-2xl shadow-[#132B57]/15 md:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2ABFAB]/15 text-[#2ABFAB]">
                <Zap className="h-7 w-7" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#86F2E2]">Integrações</p>
              <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
                Shamar Agent é conector local, não chatbot.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/70">
                O Agent conecta sistemas internos ao Shamar Connect para buscar dados autorizados e apoiar o atendimento.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {services.map(([title, price, description]) => (
              <article key={title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-xl font-black text-[#132B57]">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                  <p className="shrink-0 text-right text-lg font-black text-[#C9952A]">{price}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">FAQ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#132B57] md:text-5xl">
              Perguntas frequentes
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group rounded-3xl border border-slate-200 bg-[#F8FAFC] p-6 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-[#132B57]">
                  {question}
                  <ShieldCheck className="h-5 w-5 shrink-0 text-[#13796D]" />
                </summary>
                <p className="mt-4 text-sm leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#0B1220] px-6 py-16 text-center text-white shadow-2xl shadow-[#132B57]/20 md:px-12">
          <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2ABFAB]/15 text-[#2ABFAB]">
              <Zap className="h-7 w-7" />
            </div>
            <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
              Escolha o plano e comece com implantação assistida.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
              O Shamar Connect organiza a entrada do cliente, registra histórico, define responsáveis e dá visibilidade para o gestor.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="#planos"
                className="rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#22A898]"
              >
                Ver planos
              </a>
              <Link
                href="/contato"
                className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Falar com especialista
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
