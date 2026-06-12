import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

const plans = [
  {
    name: "Starter",
    price: "97",
    label: "Para começar com organização",
    description:
      "Ideal para pequenas empresas que precisam tirar o atendimento do improviso e organizar contatos, conversas e oportunidades.",
    highlight: false,
    features: ["1 empresa", "2 usuários", "WhatsApp central", "CRM básico", "Respostas rápidas", "Importação de contatos"],
  },
  {
    name: "Professional",
    price: "197",
    label: "Mais indicado para vender melhor",
    description:
      "O plano principal para equipes comerciais que precisam de multiatendimento, CRM completo, respostas rápidas e relatórios.",
    highlight: true,
    features: ["1 empresa", "Multiatendente", "CRM completo", "Funil de vendas", "Respostas rápidas", "Relatórios"],
  },
  {
    name: "Business",
    price: "397",
    label: "Para operação em expansão",
    description:
      "Para empresas que precisam de automações, catálogo, integração local via Agent e uma operação comercial mais avançada.",
    highlight: false,
    features: ["Tudo do Professional", "Shamar Agent local", "Catálogo", "Automações", "Integração local", "Relatórios avançados"],
  },
];

const comparison = [
  ["Preço mensal", "R$ 97", "R$ 197", "R$ 397"],
  ["Empresa", "1", "1", "Conforme operação"],
  ["Usuários", "2", "Equipe comercial", "Equipe ampliada"],
  ["WhatsApp central", "Incluído", "Incluído", "Incluído"],
  ["CRM", "Básico", "Completo", "Completo"],
  ["Respostas rápidas", "Incluído", "Incluído", "Incluído"],
  ["Relatórios", "Básico", "Incluído", "Avançado"],
  ["Shamar Agent local", "—", "—", "Incluído"],
  ["Catálogo", "—", "—", "Incluído"],
  ["Automações", "—", "—", "Incluído"],
];

const faqs = [
  [
    "Qual plano devo escolher?",
    "Para a maioria das empresas, o Professional é o melhor ponto de partida porque une multiatendimento, CRM completo, respostas rápidas e relatórios.",
  ],
  [
    "O Starter já organiza meu WhatsApp?",
    "Sim. Ele foi pensado para empresas que querem centralizar atendimento, contatos e histórico em uma estrutura simples.",
  ],
  [
    "Quando faz sentido usar o Business?",
    "Quando a operação precisa de automações, catálogo, integração local via Shamar Agent e processos comerciais mais avançados.",
  ],
  [
    "A IA está inclusa nos planos?",
    "O Módulo IA é um add-on de R$ 79/mês e pode ser contratado junto com qualquer plano.",
  ],
  [
    "Posso mudar de plano depois?",
    "Sim. A empresa pode começar em um plano menor e evoluir conforme o atendimento e as vendas crescerem.",
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
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
          <Link href="/" className="flex items-center" aria-label="ShamarConnect">
            <BrandLogo variant="mark" className="h-11 w-auto object-contain md:h-12" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="hover:text-[#1B2F5B]">Início</Link>
            <a href="#planos" className="hover:text-[#1B2F5B]">Planos</a>
            <a href="#comparativo" className="hover:text-[#1B2F5B]">Comparativo</a>
            <a href="#faq" className="hover:text-[#1B2F5B]">FAQ</a>
          </nav>

          <Link href="/login" className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            Entrar
          </Link>
        </div>
      </header>

      {showUnauthorizedNotice ? (
        <section className="border-b border-[#C9952A]/20 bg-[#FFF7E8] px-5 py-5 text-center md:px-8">
          <p className="mx-auto max-w-3xl text-sm font-bold leading-6 text-[#8A5D12]">
            Seu e-mail ainda não possui acesso ao ShamarConnect. Para usar o sistema, escolha um plano ou fale com nossa equipe para ativar sua conta.
          </p>
        </section>
      ) : null}

      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-[#1B2F5B]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center md:px-8 md:py-28">
          <div className="mx-auto inline-flex rounded-full border border-[#2ABFAB]/20 bg-[#2ABFAB]/10 px-4 py-2 text-sm font-black text-[#13796D]">
            Planos para empresas que vendem pelo WhatsApp
          </div>

          <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Escolha o plano ideal para organizar atendimento, CRM e vendas
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-xl">
            O ShamarConnect centraliza conversas, organiza contatos, acompanha oportunidades comerciais e prepara sua empresa para crescer com processo.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <a href="#planos" className="rounded-full bg-[#2ABFAB] px-7 py-4 text-base font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl">
              Ver planos
            </a>
            <Link href="/login" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Começar agora
            </Link>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Planos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Planos simples para diferentes fases da operação
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Comece com organização, evolua para CRM completo e avance para automações e integração local quando sua empresa precisar.
          </p>
        </div>

        <div className="mt-14 grid gap-7 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={plan.highlight ? "relative rounded-[2rem] border-2 border-[#2ABFAB] bg-white p-7 shadow-2xl shadow-[#2ABFAB]/10" : "rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"}>
              {plan.highlight ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#C9952A] px-5 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg">
                  Mais popular
                </div>
              ) : null}

              <p className="text-sm font-black uppercase tracking-wide text-[#2ABFAB]">{plan.label}</p>
              <h3 className="mt-3 text-3xl font-black text-[#1B2F5B]">{plan.name}</h3>
              <p className="mt-4 min-h-24 text-sm leading-6 text-slate-600">{plan.description}</p>

              <div className="mt-7 rounded-3xl bg-slate-50 p-5">
                <div className="flex items-end gap-1">
                  <span className="text-lg font-black text-slate-500">R$</span>
                  <span className="text-5xl font-black tracking-tight text-[#1B2F5B]">{plan.price}</span>
                  <span className="mb-2 text-sm font-bold text-slate-500">/mês</span>
                </div>
              </div>

              <Link href="/login" className={plan.highlight ? "mt-7 flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl" : "mt-7 flex w-full justify-center rounded-2xl bg-[#1B2F5B] px-5 py-4 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"}>
                Escolher plano
              </Link>

              <ul className="mt-7 space-y-3 border-t border-slate-100 pt-7">
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
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Módulo IA</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              IA como apoio ao atendente por + R$ 79/mês
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              O Módulo IA adiciona sugestões de resposta, transcrição de áudio e resumo de conversa para acelerar o atendimento sem perder controle humano.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wide text-[#2ABFAB]">Add-on disponível para todos os planos</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="text-lg font-black text-slate-500">+</span>
              <span className="text-lg font-black text-slate-500">R$</span>
              <span className="text-5xl font-black text-[#1B2F5B]">79</span>
              <span className="mb-2 text-sm font-bold text-slate-500">/mês</span>
            </div>
          </div>
        </div>
      </section>

      <section id="comparativo" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Comparativo</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Compare antes de contratar
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
            <div key={feature} className="grid grid-cols-4 border-t border-slate-100 px-5 py-4 text-sm">
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
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">FAQ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Perguntas frequentes
            </h2>
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
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">ShamarConnect</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Sua empresa não precisa atender no improviso
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Organize contatos, conversas, oportunidades e integrações em uma estrutura profissional para vender melhor pelo WhatsApp.
          </p>
          <Link href="/login" className="mt-9 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl">
            Começar agora
          </Link>
        </div>
      </section>
    </main>
  );
}
