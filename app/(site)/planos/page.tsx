import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos — ShamarConnect",
  description:
    "Essencial, Professional e Business. Mensalidade + implantação assistida. Recursos opcionais como transcrição de áudios, gravação de ligações e Shamar Agent.",
};

const plans = [
  {
    slug: "essencial",
    name: "Essencial",
    price: "97",
    setup: "297",
    label: "Para começar com organização",
    description:
      "Para pequenas operações que querem organizar a entrada dos clientes e ter histórico sem depender da memória de ninguém.",
    users: "Até 2 usuários incluídos",
    whatsapp: "1 canal conectado incluído",
    activation: "7 dias de suporte de ativação",
    training: "Treinamento remoto de até 30 minutos",
    quickReplies: "Até 10 mensagens rápidas iniciais",
    highlight: false,
    agentAvailable: false,
    includes: [
      "1 empresa cadastrada",
      "Até 2 usuários",
      "1 canal conectado (número de WhatsApp)",
      "Histórico permanente de conversas",
      "Mensagens apagadas preservadas",
      "Texto, imagem, áudio, vídeo, documento e sticker",
      "Setores simples",
      "Mensagens rápidas",
      "Notas por contato ou conversa",
      "Implantação assistida",
      "7 dias de suporte de ativação",
    ],
    setupIncludes: [
      "Cadastro da empresa",
      "Criação do administrador",
      "Cadastro de até 2 usuários",
      "Configuração do número de WhatsApp",
      "Teste de envio e recebimento",
      "Criação de até 10 mensagens rápidas",
      "Treinamento remoto de até 30 minutos",
    ],
    notIncluded: [
      "Integração com sistema local",
      "Importação de histórico antigo",
      "Automações personalizadas",
      "Treinamento presencial",
      "Canais extras sem contratação adicional",
    ],
    extras: [
      "Canal extra: R$ 79/mês",
      "Usuário extra: R$ 29/mês",
      "Transcrição de áudios: a partir de R$ 29/mês",
      "Armazenamento adicional: a partir de R$ 19/mês",
    ],
  },
  {
    slug: "professional",
    name: "Professional",
    price: "197",
    setup: "497",
    label: "Mais indicado para vender melhor",
    description:
      "Para equipes que precisam dividir atendimento por setor, ter responsáveis definidos e parar de perder retorno e orçamento.",
    users: "Até 5 usuários incluídos",
    whatsapp: "1 canal conectado incluído",
    activation: "15 dias de suporte de ativação",
    training: "Treinamento remoto de até 60 minutos",
    quickReplies: "Até 20 mensagens rápidas iniciais",
    highlight: true,
    agentAvailable: false,
    includes: [
      "1 empresa cadastrada",
      "Até 5 usuários",
      "1 canal conectado (número de WhatsApp)",
      "Histórico permanente completo",
      "Mensagens apagadas preservadas",
      "Mídias no histórico",
      "Filas por setor",
      "Responsável por conversa",
      "Status e pendências",
      "Mensagens rápidas com variáveis",
      "Supervisão básica",
      "Notas e lembretes",
      "Implantação e treinamento da equipe",
      "15 dias de suporte de ativação",
    ],
    setupIncludes: [
      "Cadastro completo da empresa",
      "Criação do administrador",
      "Cadastro de até 5 usuários",
      "Configuração do número de WhatsApp",
      "Teste de texto, mídia e mensagem apagada",
      "Configuração de setores e filas",
      "Criação de até 20 mensagens rápidas",
      "Treinamento remoto de até 60 minutos",
    ],
    notIncluded: [
      "Integração com sistema local",
      "Importação massiva de base desorganizada",
      "Automações complexas sob medida",
      "Disparo em massa",
      "Treinamento presencial",
      "Shamar Agent",
    ],
    extras: [
      "Canal extra: R$ 97/mês",
      "Usuário extra: R$ 39/mês",
      "Transcrição de áudios: a partir de R$ 29/mês",
      "Gravação de ligações: a partir de R$ 79/mês",
      "Armazenamento adicional: a partir de R$ 19/mês",
    ],
  },
  {
    slug: "business",
    name: "Business",
    price: "397",
    setup: "997",
    label: "Para operações maiores",
    description:
      "Para clínicas, grupos e empresas com várias marcas que precisam de múltiplos canais, permissões por equipe e recursos avançados.",
    users: "Até 15 usuários incluídos",
    whatsapp: "Até 3 canais incluídos",
    activation: "30 dias de suporte de ativação",
    training: "2 treinamentos remotos de até 60 minutos",
    quickReplies: "Até 30 mensagens rápidas iniciais",
    highlight: false,
    agentAvailable: true,
    includes: [
      "Múltiplas empresas/marcas",
      "Até 15 usuários",
      "Até 3 canais conectados",
      "Tudo do Professional",
      "Permissões por equipe",
      "Visão de gestor",
      "Relatórios exportáveis",
      "Configuração avançada de setores e prioridades",
      "Descontos em recursos opcionais",
      "Shamar Agent disponível (contratado à parte)",
      "30 dias de suporte de ativação",
    ],
    setupIncludes: [
      "Cadastro completo da empresa",
      "Criação do administrador",
      "Cadastro de até 15 usuários",
      "Configuração de até 3 canais de WhatsApp",
      "Teste individual de cada canal",
      "Configuração de setores e permissões",
      "Criação de até 30 mensagens rápidas",
      "2 treinamentos remotos de até 60 minutos",
      "Análise inicial do fluxo de atendimento",
    ],
    notIncluded: [
      "Integração com ERP ou sistema externo",
      "Migração complexa de dados",
      "Shamar Agent incluso (contratado separadamente)",
      "Treinamento presencial",
      "Desenvolvimento exclusivo",
    ],
    extras: [
      "Canal extra: R$ 127/mês",
      "Usuário extra: R$ 49/mês",
      "Transcrição de áudios: a partir de R$ 24/mês (desconto Business)",
      "Gravação de ligações: a partir de R$ 59/mês (desconto Business)",
      "Armazenamento adicional: a partir de R$ 19/mês",
      "Shamar Agent: R$ 149/mês por agente + implantação a partir de R$ 497",
    ],
  },
];

const comparison = [
  ["Mensalidade", "R$ 97", "R$ 197", "R$ 397"],
  ["Implantação", "R$ 297", "R$ 497", "R$ 997"],
  ["Usuários incluídos", "Até 2", "Até 5", "Até 15"],
  ["Canais incluídos", "1", "1", "Até 3"],
  ["Empresas/marcas", "1", "1", "Múltiplas"],
  ["Histórico permanente", "Incluído", "Incluído", "Incluído"],
  ["Mensagens apagadas preservadas", "Incluído", "Incluído", "Incluído"],
  ["Mídias no histórico", "Incluído", "Incluído", "Incluído"],
  ["Filas por setor", "Básico", "Completo", "Completo"],
  ["Responsável por conversa", "—", "Incluído", "Incluído"],
  ["Permissões por equipe", "—", "—", "Incluído"],
  ["Visão de gestor", "—", "—", "Incluído"],
  ["Relatórios exportáveis", "—", "—", "Incluído"],
  ["Shamar Agent", "Não disponível", "Não disponível", "Disponível (à parte)"],
  ["Suporte de ativação", "7 dias", "15 dias", "30 dias"],
  ["Treinamento", "30 min", "60 min", "2 x 60 min"],
];

const addonsData = [
  {
    id: "transcricao",
    title: "Transcrição de Áudios",
    icon: "🎙️",
    description:
      "Transforme áudios recebidos no WhatsApp em texto para sua equipe atender mais rápido, mesmo quando não puder usar fone.",
    notes: [
      "Transcrição sob demanda — acionada pelo atendente no momento certo",
      "Não transcreve automaticamente todos os áudios",
      "Áudio original continua disponível para ouvir",
      "Minutos adicionais ou pacotes extras podem ser contratados conforme uso",
    ],
    tiers: [
      {
        label: "Planos Essencial e Professional",
        rows: [
          ["Até 1.000 minutos/mês", "R$ 29/mês"],
          ["Até 10.000 minutos/mês", "R$ 449/mês"],
        ],
      },
      {
        label: "Plano Business (desconto incluso)",
        rows: [
          ["Até 1.000 minutos/mês", "R$ 24/mês"],
          ["Até 10.000 minutos/mês", "R$ 399/mês"],
        ],
      },
    ],
  },
  {
    id: "ligacoes",
    title: "Controle de Ligações",
    icon: "📞",
    description:
      "Escolha se sua equipe vai receber ligações pela central ou manter o atendimento apenas por mensagens.",
    notes: [
      "Configurável por empresa ou canal",
      "Ativado ou desativado conforme a rotina da equipe",
      "Ideal para clínicas, vendas e suporte",
      "Pode ficar desativado para operações que preferem só mensagens",
    ],
    tiers: [
      {
        label: "Todos os planos",
        rows: [["Disponibilidade e preço", "Sob consulta"]],
      },
    ],
  },
  {
    id: "gravacao",
    title: "Gravação de Ligações",
    icon: "⏺️",
    description:
      "Grave chamadas importantes para auditoria, treinamento e conferência interna.",
    notes: [
      "Com controle de acesso e retenção configurável",
      "Indicado para clínica, financeiro, vendas e suporte",
      "Exige atenção à privacidade e consentimento dos participantes",
    ],
    tiers: [
      {
        label: "Planos Essencial e Professional",
        rows: [
          ["Até 100h/mês", "R$ 79/mês"],
          ["Até 500h/mês", "R$ 249/mês"],
          ["Até 1.000h/mês", "R$ 399/mês"],
          ["Hora extra", "R$ 0,49/h"],
        ],
      },
      {
        label: "Plano Business (desconto incluso)",
        rows: [
          ["Até 100h/mês", "R$ 59/mês"],
          ["Até 500h/mês", "R$ 199/mês"],
          ["Até 1.000h/mês", "R$ 349/mês"],
          ["Hora extra", "R$ 0,39/h"],
        ],
      },
    ],
  },
  {
    id: "storage",
    title: "Armazenamento Adicional",
    icon: "💾",
    description:
      "Amplie o espaço para guardar mídias, documentos, áudios e gravações.",
    notes: [
      "O armazenamento padrão cobre o uso operacional normal",
      "Retenção longa, muitos documentos e alto volume de mídia podem exigir expansão",
    ],
    tiers: [
      {
        label: "Todos os planos",
        rows: [
          ["+10 GB", "R$ 19/mês"],
          ["+50 GB", "R$ 79/mês"],
          ["+100 GB", "R$ 139/mês"],
        ],
      },
    ],
  },
  {
    id: "agent",
    title: "Shamar Agent",
    icon: "🤖",
    description:
      "Agente assistivo para classificar conversas, sugerir respostas, organizar pendências e apoiar a equipe sem tirar o humano do controle.",
    notes: [
      "Disponível apenas a partir do plano Business",
      "Não é um robô autônomo — o humano continua no controle",
      "Não substitui equipe nem toma decisões automáticas",
      "Implantação e configuração incluídas no pacote de ativação",
    ],
    tiers: [
      {
        label: "Plano Business (exclusivo)",
        rows: [
          ["Shamar Agent Assistivo", "R$ 149/mês por agente"],
          ["Implantação e configuração", "A partir de R$ 497"],
        ],
      },
    ],
  },
];

const addonComparison = [
  ["Transcrição — 1.000 min/mês", "R$ 29/mês", "R$ 24/mês"],
  ["Transcrição — 10.000 min/mês", "R$ 449/mês", "R$ 399/mês"],
  ["Gravação — 100h/mês", "R$ 79/mês", "R$ 59/mês"],
  ["Gravação — 500h/mês", "R$ 249/mês", "R$ 199/mês"],
  ["Gravação — 1.000h/mês", "R$ 399/mês", "R$ 349/mês"],
  ["Armazenamento +10 GB", "R$ 19/mês", "R$ 19/mês"],
  ["Shamar Agent Assistivo", "Não disponível", "R$ 149/mês por agente"],
];

const faqs = [
  [
    "A implantação é obrigatória?",
    "Sim. Ela cobre a configuração inicial, conexão do número, mensagens rápidas, setores, testes e treinamento. Isso evita que a empresa contrate e fique sem operação configurada.",
  ],
  [
    "Posso cancelar depois?",
    "Sim. O cancelamento pode ser solicitado pelo canal oficial. Serviços já executados, como implantação iniciada, podem não ser reembolsáveis, exceto quando a lei obrigar.",
  ],
  [
    "Existe direito de arrependimento?",
    "Em contratações pela internet, o cliente pode exercer o direito de arrependimento em até 7 dias, conforme o Código de Defesa do Consumidor.",
  ],
  [
    "Transcrição de áudio inclui todos os áudios automaticamente?",
    "Não. A transcrição é sob demanda — o atendente decide quando ativar para cada mensagem. O áudio original continua disponível independente da transcrição.",
  ],
  [
    "Ligações estão incluídas em todos os planos?",
    "Não. O controle de ligações é um recurso configurável por empresa. A disponibilidade e o preço são definidos conforme a implantação.",
  ],
  [
    "O Shamar Agent substitui a equipe?",
    "Não. O Shamar Agent é assistivo — sugere, classifica e organiza, mas o atendimento humano continua no controle. Disponível apenas a partir do plano Business.",
  ],
  [
    "O que acontece se eu atrasar o pagamento?",
    "O acesso pode ser limitado, suspenso ou bloqueado após vencimento e tentativas de cobrança, conforme os Termos de Uso.",
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center md:px-8 md:py-28">
          <div className="mx-auto inline-flex rounded-full border border-[#2ABFAB]/20 bg-[#2ABFAB]/10 px-4 py-2 text-sm font-black text-[#13796D]">
            Planos, recursos opcionais e implantação assistida
          </div>
          <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Nem toda empresa precisa dos mesmos recursos.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-xl">
            Comece organizando o atendimento e adicione transcrição, gravação, armazenamento ou agente conforme a operação amadurece. Todos os planos incluem implantação assistida.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <a href="#planos" className="rounded-full bg-[#2ABFAB] px-7 py-4 text-base font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl">
              Ver planos
            </a>
            <a href="#addons" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Ver recursos opcionais
            </a>
            <Link href="/contato" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Falar com especialista
            </Link>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Planos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Mensalidade + implantação assistida
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            A implantação é cobrada no início porque envolve configuração, testes, conexão do número, mensagens rápidas, setores e treinamento.
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
              <p className="mt-4 min-h-[5rem] text-sm leading-6 text-slate-600">{plan.description}</p>

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
                {plan.agentAvailable && (
                  <span className="text-[#2ABFAB]">Shamar Agent disponível (à parte)</span>
                )}
              </div>

              <Link
                href="/contato"
                className={
                  plan.highlight
                    ? "mt-7 flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                    : "mt-7 flex w-full justify-center rounded-2xl bg-[#1B2F5B] px-5 py-4 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                }
              >
                Falar com especialista
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
                <h4 className="text-sm font-black text-[#1B2F5B]">Recursos opcionais disponíveis</h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {plan.extras.map((extra) => (
                    <li key={extra}>• {extra}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Implantação */}
      <section id="implantacao" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Implantação</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              O que entregamos na implantação
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              A implantação é um serviço técnico e operacional. Não inclui desenvolvimento personalizado nem integrações com sistemas locais, salvo contratação específica.
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
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckIcon />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7 rounded-3xl bg-white p-5">
                  <h4 className="text-sm font-black text-[#1B2F5B]">Não inclui</h4>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {plan.notIncluded.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Comparativo de planos */}
      <section id="comparativo" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Comparativo</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Compare antes de contratar
          </h2>
        </div>
        <div className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-4 bg-[#1B2F5B] px-5 py-4 text-sm font-black text-white">
            <div>Item</div>
            <div className="text-center">Essencial</div>
            <div className="text-center">Professional</div>
            <div className="text-center">Business</div>
          </div>
          {comparison.map(([feature, essencial, professional, business]) => (
            <div key={feature} className="grid grid-cols-4 border-t border-slate-100 px-5 py-4 text-sm">
              <div className="font-bold text-slate-700">{feature}</div>
              <div className="text-center text-slate-600">{essencial}</div>
              <div className="text-center text-slate-600">{professional}</div>
              <div className="text-center text-slate-600">{business}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recursos opcionais */}
      <section id="addons" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Recursos opcionais</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Contrate apenas o que sua operação precisa
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Comece organizando o atendimento e adicione recursos conforme a operação amadurece. Nenhum add-on é obrigatório.
            </p>
          </div>

          <div className="mt-14 space-y-10">
            {addonsData.map((addon) => (
              <article key={addon.id} className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-8">
                <div className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{addon.icon}</span>
                      <h3 className="text-2xl font-black text-[#1B2F5B]">{addon.title}</h3>
                    </div>
                    <p className="mt-4 text-base leading-7 text-slate-600">{addon.description}</p>
                    <ul className="mt-5 space-y-2">
                      {addon.notes.map((note) => (
                        <li key={note} className="flex items-start gap-2 text-sm text-slate-500">
                          <span className="mt-0.5 text-[#2ABFAB]">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-5">
                    {addon.tiers.map((tier) => (
                      <div key={tier.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{tier.label}</p>
                        <table className="mt-3 w-full">
                          <tbody>
                            {tier.rows.map(([desc, price]) => (
                              <tr key={desc} className="border-t border-slate-100 first:border-0">
                                <td className="py-2 text-sm text-slate-600">{desc}</td>
                                <td className="py-2 text-right text-sm font-black text-[#1B2F5B]">{price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Tabela comparativa add-ons */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Comparativo de recursos opcionais</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-4xl">
            Preços por plano
          </h2>
        </div>
        <div className="mt-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-3 bg-[#1B2F5B] px-5 py-4 text-sm font-black text-white">
            <div>Recurso</div>
            <div className="text-center">Essencial / Professional</div>
            <div className="text-center">Business</div>
          </div>
          {addonComparison.map(([feature, standard, business]) => (
            <div key={feature} className="grid grid-cols-3 border-t border-slate-100 px-5 py-4 text-sm">
              <div className="font-bold text-slate-700">{feature}</div>
              <div className="text-center text-slate-600">{standard}</div>
              <div className="text-center text-slate-600">{business}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Regras comerciais */}
      <section className="bg-white py-10 pb-20">
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
              <Link href="/termos" className="rounded-full bg-[#1B2F5B] px-5 py-3 text-sm font-black text-white">Termos de Uso</Link>
              <Link href="/privacidade" className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#1B2F5B]">Privacidade</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
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

      {/* CTA final */}
      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#1B2F5B] px-6 py-16 text-center text-white shadow-2xl md:px-12">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">ShamarConnect</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Contrate com clareza e comece com a operação configurada.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Escolha o plano certo, adicione recursos conforme a necessidade e conte com implantação assistida desde o primeiro dia.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contato"
              className="rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Falar com especialista
            </Link>
            <Link
              href="/contato"
              className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Agendar demonstração
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
