import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const plans = [
  {
    name: "Starter",
    price: "R$ 97",
    period: "/mês",
    description: "Para pequenas empresas que querem organizar o atendimento.",
    highlight: false,
    features: [
      "1 empresa",
      "2 usuários",
      "CRM básico",
      "Contatos e oportunidades",
      "Respostas rápidas",
      "Suporte em português",
    ],
  },
  {
    name: "Professional",
    price: "R$ 197",
    period: "/mês",
    description: "Para equipes que precisam vender mais com multiatendimento.",
    highlight: true,
    features: [
      "Multiatendente",
      "CRM completo",
      "Funil de vendas",
      "Histórico de conversas",
      "Templates de atendimento",
      "Relatórios comerciais",
    ],
  },
  {
    name: "Business",
    price: "R$ 397",
    period: "/mês",
    description: "Para operações que precisam de automações e recursos avançados.",
    highlight: false,
    features: [
      "Agent",
      "Catálogo",
      "Automações",
      "Gestão avançada",
      "Integrações",
      "Suporte prioritário",
    ],
  },
];

const benefits = [
  "Centralize o WhatsApp da equipe",
  "Evite perder clientes por falta de resposta",
  "Organize contatos e oportunidades",
  "Acompanhe o funil de vendas",
  "Padronize respostas comerciais",
  "Prepare sua empresa para usar IA no atendimento",
];

const faqs = [
  [
    "Preciso de número oficial?",
    "Não. O ShamarConnect pode funcionar com operação baseada em WhatsApp Web.",
  ],
  [
    "Quantos usuários posso ter?",
    "Depende do plano contratado. O Starter atende operações menores, enquanto Professional e Business são indicados para equipes.",
  ],
  [
    "O plano Professional é o mais indicado?",
    "Sim. Para a maioria das empresas, ele tem o melhor equilíbrio entre preço, atendimento e CRM completo.",
  ],
  [
    "O Módulo IA está incluso?",
    "O Módulo IA é um add-on por R$ 79/mês, com recursos como sugestões de resposta, transcrição e resumo de conversa.",
  ],
  [
    "Posso cancelar quando quiser?",
    "Sim. A proposta é simples, sem fidelidade obrigatória.",
  ],
];

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="block w-48">
          <BrandLogo className="h-auto w-full" />
        </Link>

        <Link
          href="/login"
          className="rounded-xl bg-[#1B2F5B] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="mx-auto mb-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2ABFAB] shadow-sm">
          Planos do ShamarConnect
        </p>

        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-[#1B2F5B] md:text-6xl">
          Escolha o plano ideal para organizar seu atendimento e vender mais
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Comece com CRM, WhatsApp centralizado e recursos para transformar conversas em oportunidades reais de venda.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={
                plan.highlight
                  ? "relative rounded-3xl border-2 border-[#2ABFAB] bg-white p-8 shadow-lg"
                  : "rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
              }
            >
              {plan.highlight && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#C9952A] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
                  Mais popular
                </span>
              )}

              <h2 className="text-2xl font-bold text-[#1B2F5B]">{plan.name}</h2>

              <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                {plan.description}
              </p>

              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-bold text-[#2ABFAB]">
                  {plan.price}
                </span>
                <span className="mb-1 text-slate-500">{plan.period}</span>
              </div>

              <Link
                href="/login"
                className={
                  plan.highlight
                    ? "mt-6 flex w-full justify-center rounded-xl bg-[#2ABFAB] px-5 py-3 font-semibold text-white hover:opacity-90"
                    : "mt-6 flex w-full justify-center rounded-xl bg-[#1B2F5B] px-5 py-3 font-semibold text-white hover:opacity-90"
                }
              >
                Começar agora
              </Link>

              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="font-bold text-[#2ABFAB]">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-semibold text-[#C9952A]">Add-on de IA</p>

              <h2 className="mt-2 text-3xl font-bold text-[#1B2F5B] md:text-4xl">
                Turbine o atendimento com inteligência artificial
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Adicione o Módulo IA por R$ 79/mês e tenha sugestões de resposta,
                transcrição de áudio e resumo de conversas para sua equipe ganhar tempo.
              </p>
            </div>

            <div className="rounded-3xl bg-[#F8FAFC] p-8">
              <p className="text-sm font-semibold text-slate-500">Módulo IA</p>
              <p className="mt-3 text-4xl font-bold text-[#2ABFAB]">
                + R$ 79/mês
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li>✓ Sugestões de resposta</li>
                <li>✓ Transcrição de áudio</li>
                <li>✓ Resumo de conversa</li>
                <li>✓ Apoio ao atendimento comercial</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="font-semibold text-[#C9952A]">Benefícios</p>
          <h2 className="mt-2 text-3xl font-bold text-[#1B2F5B] md:text-4xl">
            Mais controle para sua equipe comercial
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit} className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="font-semibold text-[#1B2F5B]">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center">
          <p className="font-semibold text-[#C9952A]">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold text-[#1B2F5B] md:text-4xl">
            Perguntas frequentes
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map(([question, answer]) => (
            <details key={question} className="rounded-2xl bg-white p-5 shadow-sm">
              <summary className="cursor-pointer font-semibold text-[#1B2F5B]">
                {question}
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-3xl bg-[#1B2F5B] px-6 py-12 text-center text-white">
          <h2 className="text-3xl font-bold md:text-4xl">
            Pronto para começar?
          </h2>

          <p className="mt-4 text-white/75">
            Organize seu atendimento e transforme conversas em vendas.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex rounded-xl bg-[#2ABFAB] px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            Criar minha conta
          </Link>
        </div>
      </section>
    </main>
  );
}