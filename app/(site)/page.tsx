import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShamarConnect — WhatsApp + CRM + IA para empresas",
  description:
    "Atendimento, CRM e vendas em uma central inteligente para empresas que vivem no WhatsApp. Histórico permanente, CRM/Kanban, automações e IA supervisionada.",
  openGraph: {
    title: "ShamarConnect — WhatsApp + CRM + IA",
    description: "Central de atendimento, CRM e automação para empresas que vendem pelo WhatsApp.",
    url: "https://shamarconnect.com.br",
    type: "website",
  },
};

const segments = [
  { icon: "🛍️", title: "Lojas e e-commerce", text: "Centralize pedidos, dúvidas e pós-venda em uma fila organizada por atendente." },
  { icon: "🔧", title: "Prestadores de serviço", text: "Acompanhe cada cliente no pipeline: orçamento, aprovação, execução e cobrança." },
  { icon: "📣", title: "Agências e consultorias", text: "Gerencie vários clientes no mesmo painel sem misturar conversas ou históricos." },
  { icon: "⛪", title: "Igrejas e eventos", text: "Organize inscrições, confirmações e comunicados com múltiplos canais e equipes." },
  { icon: "🥾", title: "Turismo e experiências", text: "Distribua conteúdo para grupos informativos e atenda individualmente no WhatsApp." },
  { icon: "💼", title: "Equipes comerciais", text: "Pipeline visual, SLA e dashboard para o gestor acompanhar oportunidades em tempo real." },
];

const problems = [
  { icon: "😵", title: "Conversas espalhadas em vários celulares", text: "Histórico perdido quando o atendente sai. Clientes repetindo tudo do início." },
  { icon: "📋", title: "CRM em planilha ou na cabeça", text: "Ninguém sabe em que etapa está cada oportunidade. Vendas caem por falta de follow-up." },
  { icon: "🤖", title: "Bot genérico respondendo tudo", text: "IA sem supervisão gera respostas erradas e afasta clientes. Falta controle humano." },
  { icon: "🗂️", title: "Conteúdo publicado na mão a cada vez", text: "Copiar e colar para cinco grupos toda semana. Sem histórico, sem controle, sem rastreio." },
];

const modules = [
  {
    badge: "WhatsApp e atendimento",
    title: "Fila unificada para toda a equipe",
    text: "Receba mensagens de múltiplos números em um painel central. Atribua conversas, registre notas e preserve o histórico completo — incluindo mensagens apagadas.",
    bullets: ["Multi-atendente com fila organizada", "Histórico permanente", "Mensagens apagadas preservadas", "Respostas rápidas com variáveis"],
    color: "#2ABFAB",
  },
  {
    badge: "CRM e contatos",
    title: "Cada cliente tem um perfil completo",
    text: "Registre contatos, segmentos, notas e histórico de interações. Listas organizadas por status, etiqueta ou etapa do funil.",
    bullets: ["Perfil de contato unificado", "Segmentação e etiquetas", "Notas e lembretes por cliente", "Importação em lote"],
    color: "#1B2F5B",
  },
  {
    badge: "Pipeline comercial",
    title: "Kanban visual do seu funil de vendas",
    text: "Mova oportunidades entre etapas, registre valores, defina responsáveis e acompanhe conversão. Dashboard com total por canal e por período.",
    bullets: ["Etapas personalizadas", "Valor por oportunidade", "Conversão por canal", "Fechamento com motivo registrado"],
    color: "#C9952A",
  },
  {
    badge: "Campanhas e distribuição",
    title: "Conteúdo publicado em múltiplos canais",
    text: "Crie uma divulgação, selecione os canais (Telegram, WhatsApp informativo) e publique com histórico de envio por canal.",
    bullets: ["Geração automática do texto", "Telegram via bot", "WhatsApp: cópia com um clique", "Log de publicações"],
    color: "#2ABFAB",
  },
  {
    badge: "IA supervisionada",
    title: "Sugestões inteligentes, controle humano",
    text: "A IA sugere respostas e classifica conversas. O atendente revisa e decide. Nunca responde automaticamente em grupos.",
    bullets: ["Sugestões revisáveis", "Bloqueio em grupos", "Logs de auditoria", "Sem disparo automático sem aprovação"],
    color: "#1B2F5B",
  },
  {
    badge: "Dashboard e SLA",
    title: "Visão executiva da operação",
    text: "Acompanhe tempo médio de resposta, conversas abertas, oportunidades por etapa e performance por atendente em um único painel.",
    bullets: ["Tempo de resposta", "Volume por canal", "SLA por prioridade", "Exportação de relatórios"],
    color: "#C9952A",
  },
];

const planCards = [
  {
    slug: "starter",
    name: "Starter",
    price: "149",
    label: "Para começar com organização",
    features: ["1 empresa", "2 usuários", "1 canal WhatsApp", "CRM básico", "Pipeline", "Histórico permanente"],
    highlight: false,
  },
  {
    slug: "professional",
    name: "Professional",
    price: "297",
    label: "Mais indicado",
    features: ["1 empresa", "5 usuários", "1 canal WhatsApp", "CRM/Kanban completo", "IA supervisionada", "SLA e métricas"],
    highlight: true,
  },
  {
    slug: "business",
    name: "Business",
    price: "597",
    label: "Para operação em expansão",
    features: ["1 empresa", "10 usuários", "2 canais WhatsApp", "Relatórios exportáveis", "Múltiplos atendentes", "Suporte prioritário 30 dias"],
    highlight: false,
  },
];

function CheckMark() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ABFAB]/15 text-xs font-black text-[#2ABFAB]">
      ✓
    </span>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#2ABFAB]/15 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[#1B2F5B]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-7 inline-flex rounded-full border border-[#2ABFAB]/25 bg-[#2ABFAB]/10 px-5 py-2 text-sm font-black text-[#13796D]">
              WhatsApp · CRM · IA supervisionada · Pipeline
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-[#1B2F5B] md:text-6xl lg:text-7xl">
              Atendimento, CRM e vendas em uma central inteligente para empresas que vivem no WhatsApp.
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Organize conversas, contatos, equipes, campanhas e oportunidades em um só lugar — com IA supervisionada e controle humano.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/planos"
                className="rounded-full bg-[#2ABFAB] px-8 py-4 text-base font-black text-white shadow-lg shadow-[#2ABFAB]/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Ver planos
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

      {/* Problemas */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">O problema</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Reconhece alguma dessas situações?
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p) => (
            <article key={p.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-3xl">{p.icon}</span>
              <h3 className="mt-4 text-base font-black text-[#1B2F5B]">{p.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{p.text}</p>
            </article>
          ))}
        </div>
        <p className="mt-10 text-center text-base font-bold text-slate-500">
          O ShamarConnect resolve os quatro — em uma central só.
        </p>
      </section>

      {/* Módulos */}
      <section id="modulos" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Módulos</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Tudo conectado na mesma plataforma
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Cada módulo funciona sozinho — juntos, formam uma operação comercial completa.
            </p>
          </div>
          <div className="mt-14 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
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
                  {mod.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckMark />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
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
            { step: "1", title: "Escolha o plano", text: "Contrate e finalize a implantação assistida." },
            { step: "2", title: "Conecte o WhatsApp", text: "Escaneie o QR Code e a fila já começa a aparecer." },
            { step: "3", title: "Configure a equipe", text: "Cadastre atendentes, defina filas e respostas rápidas." },
            { step: "4", title: "Opere com controle", text: "CRM, pipeline, campanhas e IA prontos para uso." },
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

      {/* Segmentos */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Segmentos</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Feito para quem atende pelo WhatsApp
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Qualquer operação que vive no WhatsApp ganha estrutura, histórico e processo com o ShamarConnect.
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

      {/* IA supervisionada */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="overflow-hidden rounded-[2.5rem] bg-[#1B2F5B]">
          <div className="grid gap-10 px-8 py-14 md:grid-cols-[1.2fr_0.8fr] md:px-14 md:py-16 lg:items-center">
            <div>
              <div className="inline-flex rounded-full bg-[#2ABFAB]/20 px-4 py-2 text-sm font-black text-[#2ABFAB]">
                Inteligência artificial
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
                IA com supervisão humana, não robô solto.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/70">
                A IA ajuda a sugerir respostas, classificar conversas e acelerar o atendimento. O controle continua com a equipe.
              </p>
            </div>
            <div className="rounded-[2rem] bg-white/10 p-7">
              <ul className="space-y-5">
                {[
                  { icon: "💬", text: "Sugestões revisáveis antes de enviar" },
                  { icon: "🚫", text: "Bloqueio automático em grupos" },
                  { icon: "📋", text: "Logs de auditoria de todas as ações da IA" },
                  { icon: "👤", text: "Atendimento humano sempre no controle" },
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

      {/* Multiempresa */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Escala</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Multiempresa e multicanal na mesma central
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Uma única plataforma para administrar empresas, números, equipes e dashboards diferentes.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "👥", title: "Vários atendentes", text: "Uma empresa com equipe inteira na mesma fila, com visibilidade e atribuição." },
              { icon: "📱", title: "Vários números", text: "Diferentes operações com WhatsApps distintos, histórico separado por canal." },
              { icon: "🏢", title: "Vários clientes", text: "Agências que gerenciam múltiplas contas veem cada empresa isolada no mesmo painel." },
              { icon: "📊", title: "Visão de gestor", text: "Dashboard com performance por empresa, canal e atendente — tudo num relance." },
            ].map((item) => (
              <article key={item.title} className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-6">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="mt-4 font-black text-[#1B2F5B]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Planos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
            Planos transparentes com implantação incluída
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
            Ver detalhes completos →
          </Link>
        </p>
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
              Começar agora
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
