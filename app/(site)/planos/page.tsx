import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos — ShamarConnect",
  description:
    "Starter, Professional e Business. Mensalidade + implantação assistida. Conecte WhatsApp, CRM e IA com suporte de ativação incluído.",
};

const plans = [
  {
    slug: "starter",
    name: "Starter",
    price: "149",
    setup: "297",
    label: "Para começar com organização",
    description: "Para pequenas empresas que precisam organizar o atendimento do WhatsApp, registrar histórico e começar a usar CRM básico.",
    users: "2 usuários incluídos",
    whatsapp: "1 conexão WhatsApp incluída",
    activation: "7 dias de suporte de ativação",
    training: "Treinamento remoto de até 30 minutos",
    quickReplies: "Até 10 respostas rápidas iniciais",
    highlight: false,
    includes: [
      "1 empresa cadastrada",
      "2 usuários incluídos",
      "1 conexão WhatsApp incluída",
      "Histórico permanente de conversas",
      "Preservação de mensagens apagadas pelo remetente",
      "Texto, imagem, áudio, vídeo, documento, sticker, localização e contato compartilhado",
      "CRM básico com contatos e conversas",
      "Respostas rápidas",
      "Notas por contato ou conversa",
      "Exportação TXT",
      "Suporte de ativação por 7 dias",
    ],
    setupIncludes: [
      "Cadastro da empresa",
      "Criação do administrador",
      "Cadastro de até 2 usuários",
      "Configuração de 1 WhatsApp",
      "Teste de envio e recebimento",
      "Criação de até 10 respostas rápidas",
      "Funil básico",
      "Treinamento remoto de até 30 minutos",
    ],
    notIncluded: [
      "Integração com sistema local",
      "Importação grande de histórico antigo",
      "Automações personalizadas",
      "Treinamento presencial",
      "WhatsApps extras sem contratação adicional",
    ],
    extras: ["WhatsApp extra: R$ 79/mês", "Usuário extra: R$ 29/mês", "Módulo IA: R$ 79,90/mês"],
  },
  {
    slug: "professional",
    name: "Professional",
    price: "297",
    setup: "497",
    label: "Mais indicado para vender melhor",
    description: "O plano principal para empresas que precisam de atendimento organizado, CRM/Kanban, equipe comercial e controle de rotina.",
    users: "5 usuários incluídos",
    whatsapp: "1 conexão WhatsApp incluída",
    activation: "15 dias de suporte de ativação",
    training: "Treinamento remoto de até 60 minutos",
    quickReplies: "Até 20 respostas rápidas iniciais",
    highlight: true,
    includes: [
      "1 empresa cadastrada",
      "5 usuários incluídos",
      "1 conexão WhatsApp incluída",
      "Histórico permanente completo",
      "Preservação de mensagens apagadas pelo remetente",
      "Mídias recebidas no histórico",
      "CRM/Kanban completo",
      "Funil de vendas por etapas",
      "Respostas rápidas com variáveis",
      "Assinatura do atendente",
      "Notas e lembretes",
      "Exportação TXT, HTML e CSV",
      "Métricas básicas",
      "Modo invisível/privacidade",
      "Suporte de ativação por 15 dias",
    ],
    setupIncludes: [
      "Cadastro completo da empresa",
      "Criação do administrador",
      "Cadastro de até 5 usuários",
      "Configuração de 1 WhatsApp",
      "Teste de texto, mídia e mensagem apagada",
      "Configuração do Kanban comercial",
      "Criação de até 20 respostas rápidas",
      "Configuração de assinatura dos atendentes",
      "Treinamento remoto de até 60 minutos",
    ],
    notIncluded: [
      "Integração com sistema local",
      "Importação massiva de base desorganizada",
      "Automações complexas sob medida",
      "Disparo em massa",
      "Treinamento presencial",
      "Desenvolvimento personalizado",
    ],
    extras: ["WhatsApp extra: R$ 97/mês", "Usuário extra: R$ 39/mês", "Módulo IA: R$ 79,90/mês"],
  },
  {
    slug: "business",
    name: "Business",
    price: "597",
    setup: "997",
    label: "Para operação em expansão",
    description: "Para empresas que precisam de mais conexões, equipe maior, relatórios, integração local e apoio avançado na implantação.",
    users: "10 usuários incluídos",
    whatsapp: "2 conexões WhatsApp incluídas",
    activation: "30 dias de suporte de ativação",
    training: "2 treinamentos remotos de até 60 minutos",
    quickReplies: "Até 30 respostas rápidas iniciais",
    highlight: false,
    includes: [
      "1 empresa cadastrada",
      "10 usuários incluídos",
      "2 conexões WhatsApp incluídas",
      "Tudo do Professional",
      "Métricas avançadas",
      "Relatórios exportáveis",
      "Múltiplos atendentes",
      "Configuração avançada de etiquetas e prioridades",
      "Análise inicial do processo comercial",
      "Preparação para Shamar Agent local",
      "Suporte prioritário de ativação por 30 dias",
    ],
    setupIncludes: [
      "Cadastro completo da empresa",
      "Criação do administrador",
      "Cadastro de até 10 usuários",
      "Configuração de até 2 WhatsApps",
      "Teste individual de cada conexão",
      "Configuração do Kanban completo",
      "Criação de até 30 respostas rápidas",
      "Configuração de métricas iniciais",
      "2 treinamentos remotos de até 60 minutos",
      "Análise inicial do fluxo comercial",
    ],
    notIncluded: [
      "Instalação do Shamar Agent local",
      "Integração com CPlus, Firebird, ERP ou sistema externo",
      "Migração complexa de dados",
      "Chatbot personalizado",
      "Treinamento presencial",
      "Desenvolvimento exclusivo",
    ],
    extras: ["WhatsApp extra: R$ 127/mês", "Usuário extra: R$ 49/mês", "Módulo IA: R$ 79,90/mês"],
  },
];

const comparison = [
  ["Mensalidade", "R$ 149", "R$ 297", "R$ 597"],
  ["Implantação", "R$ 297", "R$ 497", "R$ 997"],
  ["Usuários incluídos", "2", "5", "10"],
  ["WhatsApps incluídos", "1", "1", "2"],
  ["Histórico permanente", "Incluído", "Incluído", "Incluído"],
  ["Mensagens apagadas preservadas", "Incluído", "Incluído", "Incluído"],
  ["Mídias no histórico", "Incluído", "Incluído", "Incluído"],
  ["CRM/Kanban", "Básico", "Completo", "Completo + métricas"],
  ["Exportação", "TXT", "TXT, HTML e CSV", "TXT, HTML, CSV e relatórios"],
  ["Suporte de ativação", "7 dias", "15 dias", "30 dias"],
  ["Treinamento", "30 min", "60 min", "2 encontros de 60 min"],
];

const faqs = [
  [
    "A implantação é obrigatória?",
    "Sim. Ela cobre a configuração inicial, conexão do WhatsApp, respostas rápidas iniciais, funil, testes e treinamento. Isso evita que o cliente contrate e fique sem operação pronta.",
  ],
  [
    "Posso cancelar depois?",
    "Sim. O cancelamento pode ser solicitado pelo canal oficial. Serviços já executados, como implantação iniciada, podem não ser reembolsáveis, exceto quando a lei obrigar.",
  ],
  [
    "Existe direito de arrependimento?",
    "Em contratações pela internet, o cliente pode exercer o direito de arrependimento em até 7 dias, conforme o Código de Defesa do Consumidor. As regras completas estão na Política de Cancelamento e Reembolso.",
  ],
  [
    "O que acontece se eu atrasar o pagamento?",
    "O acesso pode ser limitado, suspenso ou bloqueado após vencimento e tentativas de cobrança, conforme os Termos de Uso.",
  ],
  [
    "WhatsApp Web é oficial da Meta?",
    "O WhatsApp Web depende da sessão autenticada do próprio cliente. Para uso definitivo e oficial em larga escala, podemos evoluir para Meta WhatsApp Cloud API conforme disponibilidade e necessidade.",
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
            Seu e-mail ainda não possui acesso ao ShamarConnect. Para usar o sistema, escolha um plano ou fale com nossa equipe para ativar sua conta.
          </p>
        </section>
      ) : null}

      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center md:px-8 md:py-28">
          <div className="mx-auto inline-flex rounded-full border border-[#2ABFAB]/20 bg-[#2ABFAB]/10 px-4 py-2 text-sm font-black text-[#13796D]">
            Planos, implantação e checkout transparente
          </div>
          <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Escolha o plano e saiba exatamente o que está contratando
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-xl">
            O ShamarConnect centraliza WhatsApp, histórico, contatos, CRM e rotina comercial. Todos os planos incluem implantação assistida para sua empresa começar com a operação configurada.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <a href="#planos" className="rounded-full bg-[#2ABFAB] px-7 py-4 text-base font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl">
              Ver planos
            </a>
            <Link href="/cancelamento-e-reembolso" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Regras de cancelamento
            </Link>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Planos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Mensalidade + implantação assistida
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            A implantação é cobrada no início porque envolve configuração, testes, conexão do WhatsApp, respostas rápidas, funil e treinamento.
          </p>
        </div>

        <div className="mt-14 grid gap-7 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={plan.highlight ? "relative rounded-[2rem] border-2 border-[#2ABFAB] bg-white p-7 shadow-2xl shadow-[#2ABFAB]/10" : "rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"}>
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

              <div className="mt-6 grid gap-3 text-sm font-bold text-slate-700">
                <span>{plan.users}</span>
                <span>{plan.whatsapp}</span>
                <span>{plan.training}</span>
                <span>{plan.activation}</span>
              </div>

              <Link href={`/checkout?plan=${plan.slug}`} className={plan.highlight ? "mt-7 flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl" : "mt-7 flex w-full justify-center rounded-2xl bg-[#1B2F5B] px-5 py-4 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"}>
                Contratar {plan.name}
              </Link>

              <div className="mt-7 border-t border-slate-100 pt-7">
                <h4 className="text-sm font-black text-[#1B2F5B]">Inclui</h4>
                <ul className="mt-4 space-y-3">
                  {plan.includes.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7 rounded-3xl bg-slate-50 p-5">
                <h4 className="text-sm font-black text-[#1B2F5B]">Adicionais</h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {plan.extras.map((extra) => <li key={extra}>{extra}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="implantacao" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Implantação</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              O que entregamos na implantação
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              A implantação é um serviço técnico e operacional. Ela não inclui desenvolvimento personalizado nem integrações locais, salvo contratação específica.
            </p>
          </div>

          <div className="mt-14 grid gap-7 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.slug} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7">
                <h3 className="text-2xl font-black text-[#1B2F5B]">Implantação {plan.name}</h3>
                <p className="mt-2 text-lg font-black text-[#C9952A]">R$ {plan.setup}</p>
                <p className="mt-4 text-sm font-bold text-slate-600">{plan.quickReplies}</p>
                <ul className="mt-6 space-y-3">
                  {plan.setupIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-700"><CheckIcon /><span>{item}</span></li>
                  ))}
                </ul>
                <div className="mt-7 rounded-3xl bg-white p-5">
                  <h4 className="text-sm font-black text-[#1B2F5B]">Não inclui</h4>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {plan.notIncluded.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              </article>
            ))}
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
            <div>Item</div><div className="text-center">Starter</div><div className="text-center">Professional</div><div className="text-center">Business</div>
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

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="rounded-[2rem] border border-[#C9952A]/20 bg-[#FFF7E8] p-8 md:p-10">
            <h2 className="text-3xl font-black text-[#1B2F5B]">Regras comerciais importantes</h2>
            <div className="mt-6 grid gap-5 text-sm leading-7 text-[#8A5D12] md:grid-cols-2">
              <p>O pagamento é processado pelo Asaas. A ativação depende da confirmação do pagamento e validação dos dados informados.</p>
              <p>O direito de arrependimento pode ser exercido em até 7 dias em contratações pela internet, conforme a legislação brasileira aplicável.</p>
              <p>Serviços de implantação já iniciados ou executados podem não ser reembolsáveis, exceto quando a lei obrigar.</p>
              <p>Inadimplência pode gerar limitação, suspensão ou bloqueio de acesso conforme os Termos de Uso.</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/terms" className="rounded-full bg-[#1B2F5B] px-5 py-3 text-sm font-black text-white">Termos de Uso</Link>
              <Link href="/privacy" className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#1B2F5B]">Privacidade</Link>
              <Link href="/cancelamento-e-reembolso" className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#1B2F5B]">Cancelamento e Reembolso</Link>
            </div>
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
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">ShamarConnect</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Contrate com clareza e comece com a operação configurada
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Escolha um plano, revise implantação e adicionais, aceite as regras comerciais e siga para pagamento seguro pelo Asaas.
          </p>
          <Link href="/checkout?plan=professional" className="mt-9 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl">
            Ir para checkout
          </Link>
        </div>
      </section>
    </>
  );
}
