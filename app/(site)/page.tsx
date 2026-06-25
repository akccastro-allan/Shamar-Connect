import Link from "next/link";
import type { Metadata } from "next";

import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "ShamarConnect — Central de atendimento para empresas que vivem no WhatsApp",
  description:
    "Pare de perder clientes por falta de organização no atendimento. O Shamar Connect reúne conversas, histórico, equipe e setores em uma central organizada.",
  openGraph: {
    title: "ShamarConnect — Atendimento organizado pelo WhatsApp",
    description:
      "Conversas organizadas, responsáveis definidos, histórico completo. Central de atendimento para equipes que vivem no WhatsApp.",
    url: "https://shamarconnect.com.br",
    type: "website",
  },
};

const pains = [
  {
    icon: "⏳",
    title: "Cliente esperando resposta",
    problem:
      "O cliente chama no WhatsApp e fica esperando porque ninguém assumiu o atendimento.",
    solution:
      "O Shamar mostra quem está aguardando, há quanto tempo e quem precisa responder.",
  },
  {
    icon: "📱",
    title: "Conversas espalhadas",
    problem:
      "As mensagens ficam em celulares diferentes, sem controle de quem atendeu o quê.",
    solution:
      "Reunimos tudo em uma central organizada com histórico, filtros e responsáveis.",
  },
  {
    icon: "👥",
    title: "Ninguém sabe quem assumiu",
    problem: "Duas pessoas respondem o mesmo cliente ou ninguém responde.",
    solution:
      "Cada conversa pode ter setor, status e responsável visível para toda a equipe.",
  },
  {
    icon: "🎒",
    title: "O dono carrega tudo nas costas",
    problem:
      "O gestor precisa lembrar de retorno, orçamento, pendência e cobrança manualmente.",
    solution:
      "A equipe passa a operar com filas, próximos passos e acompanhamento visível.",
  },
  {
    icon: "💸",
    title: "Orçamentos esquecidos",
    problem: "O cliente pede orçamento, ninguém acompanha e a venda esfria.",
    solution:
      "O atendimento ganha status, responsável e próximo passo claro para a equipe.",
  },
  {
    icon: "🤖",
    title: "Robô atrapalhando",
    problem:
      "O cliente escreve diferente, o robô não entende e demora para chamar um humano.",
    solution:
      "A automação ajuda, mas o atendimento humano continua no controle.",
  },
  {
    icon: "🎧",
    title: "Áudios difíceis de atender",
    problem:
      "Clientes mandam áudio, mas nem sempre o atendente pode usar fone no momento.",
    solution:
      "O Shamar toca o áudio na central e, quando contratado, transforma áudio em texto.",
  },
];

const segments = [
  {
    icon: "🔧",
    title: "Oficinas e autopeças",
    text: "Organiza a entrada, o pré-orçamento e o retorno ao cliente — sem substituir o sistema que a empresa já usa.",
  },
  {
    icon: "🍕",
    title: "Restaurantes e delivery",
    text: "Pedidos organizados por atendente com histórico do cliente e status de cada conversa.",
  },
  {
    icon: "🏥",
    title: "Clínicas",
    text: "Cada atendente vê só seu setor. Agendamento, financeiro e triagem em filas separadas.",
  },
  {
    icon: "⛪",
    title: "Igrejas e eventos",
    text: "Inscrições, confirmações e comunicados organizados com múltiplos canais e equipe.",
  },
  {
    icon: "🏢",
    title: "Empresas com várias marcas",
    text: "Uma central para gerenciar múltiplas operações com histórico isolado por empresa.",
  },
  {
    icon: "🎙️",
    title: "Equipes com alto volume de áudios",
    text: "Central organizada com player de áudio e transcrição contratável conforme necessidade.",
  },
];

const planCards = [
  {
    slug: "essencial",
    name: "Essencial",
    price: "97",
    label: "Para começar com organização",
    description: "Para pequenas operações que querem organizar a entrada dos clientes.",
    features: [
      "1 empresa",
      "1 canal conectado",
      "Até 2 usuários",
      "Histórico de atendimento",
      "Setores simples",
      "Mensagens rápidas",
      "Implantação assistida",
    ],
    highlight: false,
  },
  {
    slug: "professional",
    name: "Professional",
    price: "197",
    label: "Mais indicado",
    description: "Para equipes que precisam dividir atendimento e parar de perder retorno.",
    features: [
      "Múltiplos atendentes",
      "Filas por setor",
      "Responsável por conversa",
      "Status e pendências",
      "Histórico por cliente",
      "Supervisão básica",
      "Implantação e treinamento",
    ],
    highlight: true,
  },
  {
    slug: "business",
    name: "Business",
    price: "397",
    label: "Para operações maiores",
    description:
      "Para clínicas, grupos e empresas com várias marcas que precisam de recursos avançados.",
    features: [
      "Múltiplos canais",
      "Múltiplas empresas",
      "Permissões por equipe",
      "Visão de gestor",
      "Recursos avançados",
      "Descontos em add-ons",
      "Shamar Agent disponível",
    ],
    highlight: false,
  },
];

const addons = [
  {
    icon: "🎙️",
    title: "Transcrição de Áudios",
    text: "Transforme áudios recebidos no WhatsApp em texto para sua equipe atender mais rápido, mesmo quando não puder usar fone.",
    note: "Transcrição sob demanda, acionada pelo atendente. Áudio original sempre disponível.",
    from: "A partir de R$ 29/mês",
  },
  {
    icon: "📞",
    title: "Controle de Ligações",
    text: "Escolha se sua equipe vai receber ligações pela central ou manter o atendimento apenas por mensagens.",
    note: "Ativado ou desativado conforme a rotina da equipe. Ideal para clínicas, vendas e suporte.",
    from: "Sob consulta",
  },
  {
    icon: "⏺️",
    title: "Gravação de Ligações",
    text: "Grave chamadas importantes para auditoria, treinamento e conferência interna.",
    note: "Com controle de acesso e retenção configurável. Exige atenção à privacidade e consentimento.",
    from: "A partir de R$ 59/mês",
  },
  {
    icon: "💾",
    title: "Armazenamento Adicional",
    text: "Amplie o espaço para guardar mídias, documentos, áudios e gravações.",
    note: "O armazenamento padrão cobre o uso operacional. Alto volume de mídia pode exigir expansão.",
    from: "A partir de R$ 19/mês",
  },
  {
    icon: "🤖",
    title: "Shamar Agent",
    text: "Agente assistivo para classificar conversas, sugerir respostas e apoiar a equipe sem tirar o humano do controle.",
    note: "Disponível a partir do plano Business. O humano continua no controle — sempre.",
    from: "R$ 149/mês por agente",
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#2ABFAB]/15 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[#1B2F5B]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-7 inline-flex rounded-full border border-[#2ABFAB]/25 bg-[#2ABFAB]/10 px-5 py-2 text-sm font-black text-[#13796D]">
              Central de atendimento · Equipe organizada · Histórico completo
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-[#1B2F5B] md:text-6xl lg:text-7xl">
              Pare de perder clientes por falta de organização no atendimento.
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              O Shamar Connect transforma mensagens soltas em atendimentos organizados — com
              responsável, setor, histórico e próximo passo claro.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/planos"
                className="rounded-full bg-[#2ABFAB] px-8 py-4 text-base font-black text-white shadow-lg shadow-[#2ABFAB]/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Quero organizar meu atendimento
              </Link>
              <Link
                href={isAuthenticated ? "/operations" : "/login"}
                className="rounded-full border border-[#1B2F5B] bg-white px-8 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1B2F5B] hover:text-white hover:shadow-md"
              >
                {isAuthenticated ? "Abrir central" : "Entrar na central"}
              </Link>
              <Link
                href="/contato"
                className="rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-black text-[#1B2F5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Falar com especialista
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6 rounded-[2rem] border border-slate-200 bg-slate-50 px-6 py-6 md:px-10">
            <div className="text-center">
              <p className="text-3xl font-black text-[#1B2F5B]">6+</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Empresas na central</p>
            </div>
            <div className="border-x border-slate-200 text-center">
              <p className="text-3xl font-black text-[#1B2F5B]">100%</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Histórico preservado</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-[#1B2F5B]">0</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Respostas automáticas sem revisão</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dores que curamos */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Dores que curamos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Reconhece alguma dessas situações?
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pains.map((p) => (
            <article key={p.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-3xl">{p.icon}</span>
              <h3 className="mt-4 text-base font-black text-[#1B2F5B]">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{p.problem}</p>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-black uppercase tracking-wide text-[#2ABFAB]">Como resolvemos</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{p.solution}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-10 text-center text-base font-bold text-slate-500">
          O ShamarConnect resolve tudo isso — em uma central só.
        </p>
      </section>

      {/* Segmentos */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Para quem é</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Feito para quem atende pelo WhatsApp
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Qualquer operação que vive no WhatsApp ganha estrutura, histórico e processo com o Shamar Connect.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((seg) => (
              <article key={seg.title} className="flex gap-5 rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-6">
                <span className="text-3xl">{seg.icon}</span>
                <div>
                  <h3 className="font-black text-[#1B2F5B]">{seg.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{seg.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Oficinas e autopeças — seção dedicada */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white">
          <div className="grid gap-0 md:grid-cols-[1fr_1fr]">
            <div className="bg-[#1B2F5B] px-8 py-12 md:px-12 md:py-14">
              <div className="inline-flex rounded-full bg-[#2ABFAB]/20 px-4 py-2 text-sm font-black text-[#2ABFAB]">
                Oficinas e autopeças
              </div>
              <h2 className="mt-5 text-2xl font-black leading-tight tracking-tight text-white md:text-4xl">
                Organiza a entrada. Trabalha junto com o sistema que você já usa.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/70">
                O Shamar Connect não substitui o ERP ou sistema de gestão da oficina. O objetivo é parar de perder clientes na entrada, organizar orçamentos, definir responsáveis e acompanhar retornos.
              </p>
              <p className="mt-4 text-base leading-8 text-white/70">
                Conforme a operação amadurece, o Shamar pode integrar com o sistema atual da empresa — estoque, produtos, pedidos e serviços.
              </p>
            </div>
            <div className="px-8 py-12 md:px-12 md:py-14">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C9952A]">O que organizamos primeiro</p>
              <ul className="mt-6 space-y-4">
                {[
                  { icon: "📥", title: "Atendimento de entrada", text: "Toda mensagem recebida tem responsável e status visível para a equipe." },
                  { icon: "📋", title: "Pré-orçamento", text: "O cliente que pede orçamento entra na fila com próximo passo definido." },
                  { icon: "🧍", title: "Cliente presencial registrado", text: "Quem aparece na loja também pode ser registrado com histórico e retorno agendado." },
                  { icon: "🔁", title: "Retorno de orçamento", text: "Nenhuma venda esfria por esquecimento — a equipe acompanha cada pendência." },
                  { icon: "🔗", title: "Integração futura com sistema atual", text: "Quando a operação estiver pronta, o Shamar conversa com o sistema de gestão da oficina." },
                  { icon: "🛒", title: "E-commerce de peças e serviços", text: "Fase adicional para quem quer ampliar o canal de vendas digital." },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-4">
                    <span className="mt-0.5 text-xl">{item.icon}</span>
                    <div>
                      <p className="text-sm font-black text-[#1B2F5B]">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Como funciona</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Operacional em dias, não semanas
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {[
            { step: "1", title: "Escolha o plano", text: "Contrate e finalize a implantação assistida com nossa equipe." },
            { step: "2", title: "Conecte o número", text: "Escaneie o QR Code e a fila já começa a aparecer na central." },
            { step: "3", title: "Configure a equipe", text: "Cadastre atendentes, defina setores e mensagens rápidas." },
            { step: "4", title: "Opere com controle", text: "Histórico, responsáveis, status e acompanhamento prontos." },
          ].map((item) => (
            <article key={item.step} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1B2F5B] text-sm font-black text-white">
                {item.step}
              </div>
              <h3 className="mt-5 text-lg font-black text-[#1B2F5B]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Automação com controle */}
      <section className="mx-auto max-w-7xl px-5 py-10 pb-20 md:px-8">
        <div className="overflow-hidden rounded-[2.5rem] bg-[#1B2F5B]">
          <div className="grid gap-10 px-8 py-14 md:grid-cols-[1.2fr_0.8fr] md:px-14 md:py-16 lg:items-center">
            <div>
              <div className="inline-flex rounded-full bg-[#2ABFAB]/20 px-4 py-2 text-sm font-black text-[#2ABFAB]">
                Automação com controle humano
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
                A automação ajuda. O atendente decide. Sempre.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/70">
                O Shamar sugere, classifica e organiza — mas nenhuma resposta sai sem revisão humana. Grupos nunca recebem resposta automática.
              </p>
            </div>
            <div className="rounded-[2rem] bg-white/10 p-7">
              <ul className="space-y-5">
                {[
                  { icon: "💬", text: "Sugestões revisáveis antes de enviar" },
                  { icon: "🚫", text: "Nunca responde automaticamente em grupos" },
                  { icon: "👤", text: "Atendimento humano sempre no controle" },
                  { icon: "📋", text: "Histórico de tudo que foi feito pela equipe" },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-4 text-sm font-semibold text-white/85">
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Planos resumo */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Planos</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Comece com o que precisa agora
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Todos os planos incluem implantação assistida para começar com a operação configurada.
            </p>
          </div>
          <div className="mt-12 grid gap-7 lg:grid-cols-3">
            {planCards.map((plan) => (
              <article
                key={plan.slug}
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
                <p className="mt-3 text-sm leading-6 text-slate-500">{plan.description}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-base font-black text-slate-500">R$</span>
                  <span className="text-5xl font-black tracking-tight text-[#1B2F5B]">{plan.price}</span>
                  <span className="mb-1.5 text-sm font-bold text-slate-500">/mês</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckMark />
                      <span>{f}</span>
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
          <p className="mt-8 text-center text-sm text-slate-500">
            Todos os planos incluem implantação assistida.{" "}
            <Link href="/planos" className="font-black text-[#2ABFAB] hover:underline">
              Ver detalhes e recursos opcionais →
            </Link>
          </p>
        </div>
      </section>

      {/* Recursos opcionais */}
      <section id="recursos-opcionais" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Recursos opcionais</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Contrate apenas o que sua operação precisa
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Nem toda empresa precisa dos mesmos recursos. Comece com o plano base e adicione
            transcrição, gravação, armazenamento ou agente conforme a operação amadurece.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {addons.map((addon) => (
            <article key={addon.title} className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-6">
              <span className="text-3xl">{addon.icon}</span>
              <h3 className="mt-4 text-base font-black text-[#1B2F5B]">{addon.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{addon.text}</p>
              <p className="mt-3 text-xs leading-5 text-slate-400">{addon.note}</p>
              <p className="mt-4 text-sm font-black text-[#2ABFAB]">{addon.from}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/planos#addons"
            className="rounded-full border border-[#2ABFAB] px-8 py-4 text-sm font-black text-[#2ABFAB] transition hover:bg-[#2ABFAB] hover:text-white"
          >
            Ver recursos opcionais e preços →
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#1B2F5B] px-6 py-16 text-center text-white shadow-2xl md:px-12">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">ShamarConnect</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Sua equipe merece uma central organizada.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
            Comece com o plano certo para o momento da sua empresa. Implantação assistida inclusa em todos os planos.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/planos"
              className="rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Montar minha implantação
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
