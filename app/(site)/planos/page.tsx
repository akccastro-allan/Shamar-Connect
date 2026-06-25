import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos — Shamar Connect",
  description:
    "Planos base, implantação assistida e recursos opcionais do Shamar Connect.",
};

const plans = [
  {
    slug: "starter",
    name: "Essencial",
    checkoutName: "Starter",
    label: "Para começar com organização",
    price: "149",
    setup: "297",
    description:
      "Para pequenas operações que precisam centralizar atendimento, histórico e respostas rápidas.",
    features: [
      "1 empresa",
      "1 canal inicial",
      "até 2 usuários",
      "histórico de atendimento",
      "respostas rápidas",
      "notas internas",
      "implantação assistida",
    ],
    notIncluded: [
      "integração com sistema interno",
      "transcrição de áudios",
      "gravação de ligações",
      "armazenamento adicional",
      "customizações",
    ],
  },
  {
    slug: "professional",
    name: "Professional",
    checkoutName: "Professional",
    label: "Mais indicado",
    price: "297",
    setup: "497",
    description:
      "Para equipes que precisam dividir atendimento, controlar responsáveis, acompanhar orçamento, retorno e pós-venda.",
    highlight: true,
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
    notIncluded: [
      "substituição do sistema atual",
      "Shamar Agent incluso no plano base",
      "integração sem diagnóstico",
      "transcrição, gravação e armazenamento extra",
      "desenvolvimento exclusivo",
    ],
  },
  {
    slug: "business",
    name: "Business",
    checkoutName: "Business",
    label: "Para operações maiores",
    price: "597",
    setup: "997",
    description:
      "Para empresas com vários canais, marcas, equipes, add-ons e necessidade de integração.",
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
    notIncluded: [
      "instalação do Shamar Agent sem contratação",
      "integrações customizadas sem orçamento",
      "substituição de sistema interno",
      "gravação sem configuração",
      "ações automáticas sem auditoria",
    ],
  },
];

const addOns = [
  ["Transcrição Start", "Áudios em texto sob demanda", "R$ 29/mês até 1.000 min", "R$ 24/mês até 1.000 min"],
  ["Transcrição Volume", "Para maior volume de áudio", "R$ 449/mês até 10.000 min", "R$ 399/mês até 10.000 min"],
  ["Gravação 100h", "Chamadas para conferência e treinamento", "R$ 79/mês", "R$ 59/mês"],
  ["Gravação 500h", "Pacote intermediário de chamadas", "R$ 249/mês", "R$ 199/mês"],
  ["Gravação 1.000h", "Pacote avançado de chamadas", "R$ 399/mês", "R$ 349/mês"],
  ["Armazenamento +10 GB", "Mídias, documentos, áudios e gravações", "R$ 19/mês", "R$ 19/mês"],
  ["Armazenamento +50 GB", "Mais retenção e volume de mídia", "R$ 79/mês", "R$ 79/mês"],
  ["Armazenamento +100 GB", "Alto volume e retenção maior", "R$ 139/mês", "R$ 139/mês"],
  ["Shamar Agent Local", "Conector local para buscar dados autorizados", "R$ 149/mês por conector", "R$ 149/mês por conector"],
  ["Agent com ações controladas", "Ações futuras com permissão e auditoria", "R$ 249/mês por conector", "R$ 249/mês por conector"],
];

const services = [
  ["Diagnóstico técnico", "R$ 497", "Análise do ambiente, sistema atual, acesso, riscos e viabilidade."],
  ["Implantação de integração", "A partir de R$ 1.500", "Instalação, configuração e validação do Shamar Agent."],
  ["Integração customizada", "Sob orçamento", "Projeto conforme sistema, e-commerce, API, banco ou arquivo do cliente."],
];

const faqs = [
  [
    "Posso comprar pelo site?",
    "Sim. Os planos base podem ser contratados pelo checkout seguro. Projetos com Shamar Agent, integração, e-commerce ou customização devem passar por diagnóstico/proposta.",
  ],
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

function CheckIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ABFAB]/10 text-xs font-black text-[#2ABFAB]">
      ✓
    </span>
  );
}

type PlanosPageProps = {
  searchParams?: Promise<{ reason?: string }>;
};

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

      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center md:px-8 md:py-28">
          <div className="mx-auto inline-flex rounded-full border border-[#2ABFAB]/20 bg-[#2ABFAB]/10 px-4 py-2 text-sm font-black text-[#13796D]">
            Planos base · Checkout seguro · Add-ons opcionais
          </div>
          <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Escolha um plano e comece sua implantação.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-xl">
            Os planos base podem ser contratados pelo site. Integrações, Shamar Agent, e-commerce e projetos customizados entram por proposta separada.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <a href="#planos" className="rounded-full bg-[#2ABFAB] px-7 py-4 text-base font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl">
              Comprar plano
            </a>
            <a href="#addons" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Ver add-ons
            </a>
            <Link href="/contato" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Falar com especialista
            </Link>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Planos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Planos base com implantação assistida
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Compre o plano base pelo checkout. Recursos opcionais e integrações podem ser adicionados depois conforme a operação amadurece.
          </p>
        </div>

        <div className="mt-14 grid gap-7 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={
                plan.highlight
                  ? "relative rounded-[2rem] border-2 border-[#2ABFAB] bg-white p-7 shadow-2xl shadow-[#2ABFAB]/10"
                  : "rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"
              }
            >
              {plan.highlight ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#C9952A] px-5 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg">
                  Mais indicado
                </div>
              ) : null}
              <p className="text-sm font-black uppercase tracking-wide text-[#2ABFAB]">{plan.label}</p>
              <h3 className="mt-3 text-3xl font-black text-[#1B2F5B]">{plan.name}</h3>
              <p className="mt-4 min-h-24 text-sm leading-6 text-slate-600">{plan.description}</p>

              <div className="mt-7 rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Mensalidade</p>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-lg font-black text-slate-500">R$</span>
                  <span className="text-5xl font-black tracking-tight text-[#1B2F5B]">{plan.price}</span>
                  <span className="mb-2 text-sm font-bold text-slate-500">/mês</span>
                </div>
                <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#8A5D12]">
                  Implantação assistida: R$ {plan.setup}
                </p>
              </div>

              <Link href={`/checkout?plan=${plan.slug}`} className={plan.highlight ? "mt-7 flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl" : "mt-7 flex w-full justify-center rounded-2xl bg-[#1B2F5B] px-5 py-4 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"}>
                Contratar {plan.checkoutName}
              </Link>

              <Link href="/contato" className="mt-3 flex w-full justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#1B2F5B] transition hover:-translate-y-0.5 hover:border-[#2ABFAB]/50">
                Falar antes de contratar
              </Link>

              <div className="mt-7 border-t border-slate-100 pt-7">
                <h4 className="text-sm font-black text-[#1B2F5B]">Inclui</h4>
                <ul className="mt-4 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7 rounded-3xl bg-slate-50 p-5">
                <h4 className="text-sm font-black text-[#1B2F5B]">Não inclui no plano base</h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {plan.notIncluded.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="addons" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Add-ons</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Recursos opcionais com preço separado
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Transcrição, gravação, armazenamento e Agent não precisam ser contratados por todos.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-4 bg-[#1B2F5B] px-5 py-4 text-sm font-black text-white">
            <div>Recurso</div>
            <div>Descrição</div>
            <div className="text-center">Planos abaixo do Business</div>
            <div className="text-center">Business ou superior</div>
          </div>
          {addOns.map(([title, description, standard, business]) => (
            <div key={title} className="grid grid-cols-4 border-t border-slate-100 px-5 py-4 text-sm">
              <div className="font-black text-[#1B2F5B]">{title}</div>
              <div className="text-slate-600">{description}</div>
              <div className="text-center font-bold text-slate-700">{standard}</div>
              <div className="text-center font-bold text-slate-700">{business}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#C9952A]/20 bg-[#FFF7E8] p-7 text-sm leading-7 text-[#8A5D12]">
          <strong>Importante:</strong> gravação de ligações exige configuração, controle de acesso e retenção definida. Transcrição é sob demanda. O Shamar Agent é integração técnica e não substitui o sistema atual.
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Integrações</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Shamar Agent é conector local, não chatbot
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              O Agent conecta sistemas internos ao Shamar Connect para trazer dados úteis ao atendimento.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {services.map(([title, price, description]) => (
              <article key={title} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7">
                <h3 className="text-xl font-black text-[#1B2F5B]">{title}</h3>
                <p className="mt-3 text-2xl font-black text-[#C9952A]">{price}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-[2rem] bg-[#1B2F5B] p-8 text-white md:p-10">
            <h3 className="text-2xl font-black">O que o Shamar Connect organiza — e o que não substitui</h3>
            <p className="mt-4 text-sm leading-7 text-white/75">
              O Shamar Connect organiza atendimento, relacionamento e vendas. O Shamar Agent busca informações autorizadas no sistema atual. O sistema atual continua cuidando da gestão interna.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="py-20">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">FAQ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">Perguntas frequentes</h2>
          </div>
          <div className="mt-12 space-y-4">
            {faqs.map(([question, answer]) => (
              <details key={question} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <summary className="cursor-pointer list-none text-base font-black text-[#1B2F5B]">{question}</summary>
                <p className="mt-4 text-sm leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#1B2F5B] px-6 py-16 text-center text-white shadow-2xl md:px-12">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">Shamar Connect</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Quer integração, Agent ou e-commerce junto do plano?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Compre um plano base pelo checkout ou fale com a equipe para montar uma proposta com implantação, add-ons e integrações.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/checkout?plan=professional" className="rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl">
              Contratar Professional
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
