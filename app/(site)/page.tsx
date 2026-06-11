import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const pains = [
  "Mensagens importantes perdidas no WhatsApp",
  "Cliente sem histórico centralizado",
  "Equipe respondendo sem padrão",
  "Oportunidades comerciais sem acompanhamento",
];

const features = [
  {
    title: "WhatsApp Central",
    text: "Organize conversas comerciais em um painel único para sua equipe acompanhar cada atendimento com mais controle.",
  },
  {
    title: "CRM Comercial",
    text: "Cadastre contatos, registre oportunidades, acompanhe funis e veja o histórico de relacionamento com cada cliente.",
  },
  {
    title: "Fluxos e respostas rápidas",
    text: "Padronize abordagens, reduza retrabalho e acelere respostas sem perder qualidade no atendimento.",
  },
  {
    title: "IA para atendimento",
    text: "Use sugestões de resposta, resumo de conversa, classificação de intenção e transcrição de áudio como módulo adicional.",
  },
];

const steps = [
  {
    title: "Organize o atendimento",
    text: "Centralize conversas e reduza a dependência de celulares soltos ou atendimentos sem histórico.",
  },
  {
    title: "Controle oportunidades",
    text: "Transforme mensagens em contatos, negociações e etapas comerciais acompanháveis.",
  },
  {
    title: "Evolua com automação e IA",
    text: "Adicione fluxos, relatórios, integrações locais e inteligência artificial conforme a operação crescer.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "R$ 149/mês",
    text: "Para começar com atendimento organizado, CRM básico e respostas rápidas.",
  },
  {
    name: "Professional",
    price: "R$ 297/mês",
    text: "Plano mais popular para equipes que precisam de CRM completo, funil e fluxos.",
  },
  {
    name: "Business",
    price: "R$ 597/mês",
    text: "Para operações com múltiplos atendentes, automação, catálogo e Shamar Agent.",
  },
];

const faqs = [
  [
    "O ShamarConnect é só mais um CRM?",
    "Não. Ele une atendimento comercial via WhatsApp, CRM, funil, histórico, equipe, automações e módulos de IA em uma operação mais simples para pequenas e médias empresas.",
  ],
  [
    "Preciso trocar meu WhatsApp atual?",
    "Não. A proposta é organizar a operação ao redor do WhatsApp que sua empresa já usa, trazendo mais controle, histórico e gestão comercial.",
  ],
  [
    "A IA já vem inclusa?",
    "O Módulo IA é um add-on avulso de R$ 79,90/mês, com sugestões de resposta, transcrição, resumo e classificação de intenção.",
  ],
  [
    "O sistema serve para pequena empresa?",
    "Sim. O ShamarConnect foi pensado para empresas que vendem pelo WhatsApp e precisam sair do improviso sem contratar uma estrutura complexa.",
  ],
];

function CheckIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ABFAB]/10 text-xs font-black text-[#2ABFAB]">
      ✓
    </span>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="block w-44 md:w-56">
            <BrandLogo className="h-auto w-full" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#solucao" className="hover:text-[#1B2F5B]">
              Solução
            </a>
            <a href="#funcionalidades" className="hover:text-[#1B2F5B]">
              Funcionalidades
            </a>
            <a href="#planos" className="hover:text-[#1B2F5B]">
              Planos
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
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-[#1B2F5B]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#C9952A]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2ABFAB]/20 bg-[#2ABFAB]/10 px-4 py-2 text-sm font-black text-[#13796D]">
              CRM, WhatsApp e IA para empresas que vendem pelo atendimento
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
              Pare de vender no improviso pelo WhatsApp
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-xl">
              O ShamarConnect centraliza conversas, organiza contatos, acompanha oportunidades e dá à sua equipe uma operação comercial mais profissional.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/planos"
                className="rounded-full bg-[#2ABFAB] px-7 py-4 text-center text-base font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Ver planos
              </Link>

              <Link
                href="/login"
                className="rounded-full border border-slate-300 bg-white px-7 py-4 text-center text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Falar com especialista
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-2xl font-black text-[#1B2F5B]">CRM</p>
                <p className="mt-1 text-sm text-slate-500">Contatos e funil</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-2xl font-black text-[#1B2F5B]">WhatsApp</p>
                <p className="mt-1 text-sm text-slate-500">Atendimento centralizado</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-2xl font-black text-[#1B2F5B]">IA</p>
                <p className="mt-1 text-sm text-slate-500">Add-on comercial</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70 md:p-6">
            <div className="rounded-[1.5rem] bg-[#1B2F5B] p-5 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white/60">Painel comercial</p>
                  <h2 className="mt-2 text-2xl font-black">Atendimento em controle</h2>
                </div>

                <span className="rounded-full bg-[#2ABFAB] px-4 py-2 text-xs font-black text-white">
                  online
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">36</p>
                  <p className="mt-1 text-xs text-white/60">atendimentos</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">18</p>
                  <p className="mt-1 text-xs text-white/60">oportunidades</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">7</p>
                  <p className="mt-1 text-xs text-white/60">negociações</p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["Novo lead recebido", "Triagem"],
                ["Orçamento enviado", "Negociação"],
                ["Cliente pronto para fechar", "Venda"],
              ].map(([title, status]) => (
                <div
                  key={title}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-black text-[#1B2F5B]">{title}</p>
                    <p className="mt-1 text-xs text-slate-500">WhatsApp comercial</p>
                  </div>

                  <span className="rounded-full bg-[#2ABFAB]/10 px-3 py-1 text-xs font-black text-[#2ABFAB]">
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
              O problema
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              O WhatsApp vende, mas sem gestão ele também bagunça sua operação
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Quando o atendimento fica espalhado, a empresa perde histórico, deixa clientes sem retorno e não sabe quais conversas podem virar venda.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pains.map((pain) => (
              <div key={pain} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-sm font-black text-red-500">
                  !
                </div>
                <p className="font-black text-[#1B2F5B]">{pain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solucao" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
              A solução
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Um painel para atendimento, CRM e vendas trabalharem juntos
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              O ShamarConnect foi pensado para empresas que dependem do WhatsApp, mas precisam de processo, controle e acompanhamento comercial.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2ABFAB]/10 text-sm font-black text-[#2ABFAB]">
                  {index + 1}
                </span>

                <h3 className="mt-6 text-xl font-black text-[#1B2F5B]">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
            Funcionalidades
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Estrutura profissional para vender melhor pelo WhatsApp
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <CheckIcon />
              <h3 className="mt-5 text-lg font-black text-[#1B2F5B]">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#1B2F5B] py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">
              Módulo IA
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              IA como apoio ao atendente, não como improviso
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              Com o módulo avulso de IA, sua equipe pode receber sugestões, transcrever áudios, resumir conversas e classificar intenções comerciais.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-7 backdrop-blur">
            <p className="text-sm font-black uppercase tracking-wide text-[#2ABFAB]">
              Plano avulso
            </p>
            <p className="mt-4 text-5xl font-black">+ R$ 79,90/mês</p>
            <ul className="mt-7 space-y-3 text-sm text-white/80">
              {["Sugestão de resposta", "Transcrição de áudio", "Resumo de conversa", "Classificação de intenção", "Pontuação de lead"].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="font-black text-[#2ABFAB]">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
            Planos
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Planos para diferentes fases da sua operação
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <h3 className="text-2xl font-black text-[#1B2F5B]">{plan.name}</h3>
              <p className="mt-4 text-4xl font-black text-[#2ABFAB]">{plan.price}</p>
              <p className="mt-4 min-h-20 text-sm leading-7 text-slate-600">{plan.text}</p>
              <Link
                href="/planos"
                className="mt-7 inline-flex rounded-2xl bg-[#1B2F5B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                Ver detalhes
              </Link>
            </article>
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
              <details key={question} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <summary className="cursor-pointer list-none text-base font-black text-[#1B2F5B]">
                  {question}
                </summary>
                <p className="mt-4 text-sm leading-7 text-slate-600">{answer}</p>
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
            Sua empresa pode atender melhor, vender mais e operar com controle
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Construa uma operação comercial mais profissional em cima do canal que seus clientes já usam todos os dias.
          </p>

          <Link
            href="/planos"
            className="mt-9 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Conhecer os planos
          </Link>
        </div>
      </section>
    </main>
  );
}
