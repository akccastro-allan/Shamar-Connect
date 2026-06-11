import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const plans = [
  {
    name: "Starter",
    price: "149",
    description: "Para empresas que querem sair da bagunça do WhatsApp e organizar contatos, histórico e oportunidades.",
    target: "Ideal para começar com controle",
    highlight: false,
    features: [
      "1 empresa",
      "2 usuários/atendentes",
      "WhatsApp Central com 1 número",
      "CRM básico com contatos e histórico",
      "Respostas rápidas",
      "Importação de contatos",
      "Suporte por e-mail",
    ],
  },
  {
    name: "Professional",
    price: "297",
    description: "Para equipes comerciais que precisam de multiatendimento, funil, fluxos e mais visibilidade sobre as vendas.",
    target: "Mais escolhido para vender melhor",
    highlight: true,
    features: [
      "1 empresa",
      "5 usuários/atendentes",
      "WhatsApp Central com 1 número",
      "CRM completo com funil e oportunidades",
      "Respostas rápidas ilimitadas",
      "Fluxos de conversa",
      "Relatórios básicos",
      "Suporte prioritário por e-mail",
    ],
  },
  {
    name: "Business",
    price: "597",
    description: "Para operações que precisam de automação, múltiplos números, catálogo, integração local e gestão avançada.",
    target: "Para operações em expansão",
    highlight: false,
    features: [
      "3 empresas",
      "15 usuários/atendentes",
      "WhatsApp Central com até 3 números",
      "CRM completo com vendas e oportunidades",
      "Fluxos de conversa avançados",
      "Shamar Agent para integração local",
      "Catálogo de produtos sincronizado",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
  },
];

const comparison: Array<[string, string, string, string]> = [
  ["Preço mensal", "R$ 149", "R$ 297", "R$ 597"],
  ["Empresas", "1", "1", "3"],
  ["Usuários", "2", "5", "15"],
  ["WhatsApp", "1 número", "1 número", "até 3 números"],
  ["CRM", "Básico", "Completo", "Completo"],
  ["Fluxos de conversa", "—", "Incluído", "Avançado"],
  ["Shamar Agent", "—", "—", "Incluído"],
  ["Catálogo sincronizado", "—", "—", "Incluído"],
  ["Relatórios", "—", "Básico", "Avançado"],
  ["Suporte", "E-mail", "Prioritário", "Prioritário"],
];

const aiFeatures = [
  "Sugestão de resposta para o atendente",
  "Transcrição de áudio do cliente",
  "Resumo automático de conversa",
  "Classificação de intenção do cliente",
  "Detecção de urgência",
  "Pontuação de lead",
];

const faqs = [
  [
    "Qual plano devo escolher?",
    "Para a maioria das empresas, o Professional é o melhor ponto de partida porque une WhatsApp Central, CRM completo, funil, fluxos e relatórios.",
  ],
  [
    "O ShamarConnect substitui meu WhatsApp?",
    "Não. Ele organiza a operação comercial e o atendimento em torno do WhatsApp da sua empresa, trazendo CRM, histórico, equipe e controle.",
  ],
  [
    "O Módulo IA está incluso nos planos?",
    "O Módulo IA é um add-on avulso de R$ 79,90/mês e pode ser contratado junto com qualquer plano.",
  ],
  [
    "O Business é indicado para qual empresa?",
    "O Business é indicado para empresas com mais atendentes, mais números de WhatsApp, necessidade de catálogo sincronizado e integração com sistema local via Shamar Agent.",
  ],
  [
    "Posso começar com um plano menor e evoluir depois?",
    "Sim. Você pode começar com o plano mais adequado para o momento atual e evoluir conforme a operação comercial crescer.",
  ],
];

function CheckIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ABFAB]/10 text-xs font-black text-[#2ABFAB]">
      ✓
    </span>
  );
}

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="block w-44 md:w-56">
            <BrandLogo className="h-auto w-full" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="hover:text-[#1B2F5B]">
              Início
            </Link>
            <a href="#planos" className="hover:text-[#1B2F5B]">
              Planos
            </a>
            <a href="#comparativo" className="hover:text-[#1B2F5B]">
              Comparativo
            </a>
            <a href="#faq" className="hover:text-[#1B2F5B]">
              FAQ
            </a>
          </nav>

          <Link
            href="/login"
            className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-[#1B2F5B]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center md:px-8 md:py-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#2ABFAB]/20 bg-[#2ABFAB]/10 px-4 py-2 text-sm font-black text-[#13796D]">
            Planos profissionais para empresas que vendem pelo WhatsApp
          </div>

          <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Atendimento, CRM, automação e IA para sua equipe vender com mais controle
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-xl">
            O ShamarConnect centraliza conversas, organiza contatos, acompanha oportunidades comerciais e prepara sua empresa para uma operação mais profissional.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="#planos"
              className="rounded-full bg-[#2ABFAB] px-7 py-4 text-base font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Ver planos
            </a>

            <Link
              href="/login"
              className="rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Falar com especialista
            </Link>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
            Planos
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Escolha o plano certo para o momento da sua empresa
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Os valores públicos posicionam o ShamarConnect como uma solução profissional. Condições de implantação podem ser negociadas conforme o projeto.
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
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#C9952A] px-5 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg">
                  Mais popular
                </div>
              )}

              <div className="flex min-h-40 flex-col">
                <p className="text-sm font-black uppercase tracking-wide text-[#2ABFAB]">
                  {plan.target}
                </p>

                <h3 className="mt-3 text-3xl font-black text-[#1B2F5B]">
                  {plan.name}
                </h3>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {plan.description}
                </p>
              </div>

              <div className="mt-7 rounded-3xl bg-slate-50 p-5">
                <div className="flex items-end gap-1">
                  <span className="text-lg font-black text-slate-500">R$</span>
                  <span className="text-5xl font-black tracking-tight text-[#1B2F5B]">
                    {plan.price}
                  </span>
                  <span className="mb-2 text-sm font-bold text-slate-500">/mês</span>
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Plano mensal para operar com previsibilidade.
                </p>
              </div>

              <Link
                href="/login"
                className={
                  plan.highlight
                    ? "mt-7 flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                    : "mt-7 flex w-full justify-center rounded-2xl bg-[#1B2F5B] px-5 py-4 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                }
              >
                Escolher plano
              </Link>

              <div className="mt-7 border-t border-slate-100 pt-7">
                <p className="mb-4 text-sm font-black text-[#1B2F5B]">
                  Inclui:
                </p>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
              Módulo IA
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Inteligência artificial como plano avulso para acelerar o atendimento
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              O Módulo IA pode ser contratado junto com qualquer plano. Ele ajuda o atendente com respostas, transcrição, resumo e classificação comercial das conversas.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="font-black text-[#1B2F5B]">Sugestões</p>
                <p className="mt-2 text-sm text-slate-500">Respostas mais rápidas</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="font-black text-[#1B2F5B]">Resumo</p>
                <p className="mt-2 text-sm text-slate-500">Contexto sem retrabalho</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="font-black text-[#1B2F5B]">Áudio</p>
                <p className="mt-2 text-sm text-slate-500">Transcrição de mensagens</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wide text-[#2ABFAB]">
              Plano avulso de IA
            </p>

            <div className="mt-5 flex items-end gap-1">
              <span className="text-lg font-black text-slate-500">+</span>
              <span className="text-lg font-black text-slate-500">R$</span>
              <span className="text-5xl font-black text-[#1B2F5B]">79,90</span>
              <span className="mb-2 text-sm font-bold text-slate-500">/mês</span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Add-on disponível para todos os planos do ShamarConnect.
            </p>

            <ul className="mt-7 space-y-3 text-sm text-slate-700">
              {aiFeatures.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="comparativo" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
            Comparativo
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Compare os recursos antes de contratar
          </h2>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-4 bg-[#1B2F5B] px-5 py-4 text-sm font-black text-white">
            <div>Recurso</div>
            <div className="text-center">Starter</div>
            <div className="text-center">Professional</div>
            <div className="text-center">Business</div>
          </div>

          {comparison.map(([feature, starter, professional, business]) => (
            <div
              key={feature}
              className="grid grid-cols-4 border-t border-slate-100 px-5 py-4 text-sm"
            >
              <div className="font-bold text-slate-700">{feature}</div>
              <div className="text-center text-slate-600">{starter}</div>
              <div className="text-center text-slate-600">{professional}</div>
              <div className="text-center text-slate-600">{business}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
              FAQ
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Perguntas frequentes
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map(([question, answer]) => (
              <details
                key={question}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <summary className="cursor-pointer list-none text-base font-black text-[#1B2F5B]">
                  {question}
                </summary>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#1B2F5B] px-6 py-16 text-center text-white shadow-2xl md:px-12">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">
            ShamarConnect
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Sua empresa não precisa atender no improviso
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Organize contatos, conversas, oportunidades e integrações em uma estrutura profissional para vender melhor pelo WhatsApp.
          </p>

          <Link
            href="/login"
            className="mt-9 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Falar com especialista
          </Link>
        </div>
      </section>
    </main>
  );
}
