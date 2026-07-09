import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { resolveSessionClient } from "@/lib/providers/resolve-session";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const metadata = { title: "Centro de Comando — ShamarConnect" };
export const dynamic = "force-dynamic";

const LIPS_ORGANIZATION_ID = "8f074193-bf58-4537-9842-720619a9f259";
const LIPS_CHANNEL_ID = "1f65f8d2-2609-42d9-ae57-709aecdb43da";
const LIPS_SESSION_ID = "lips-main";

type QueryResult<T> = {
  data: T;
  error: string | null;
};

type OperationCard = {
  name: string;
  type: string;
  channel: string;
  status: "OK" | "Atenção" | "Pendente";
  conversations: string | number;
  messages24h: string | number;
  pendingJobs: string | number;
  errorJobs: string | number;
  lastService: string;
  primaryHref: string;
  secondaryHref: string;
  note?: string;
};

type LipsChannel = {
  id: string;
  provider: string | null;
  provider_type: string | null;
  session_id: string | null;
  external_instance: string | null;
  slug: string | null;
  is_active: boolean | null;
};

type ProviderEventRow = {
  id: string;
  processing_status: string | null;
  provider: string | null;
  external_event_id: string | null;
  channel_id: string | null;
  created_at: string | null;
};

type MessageRow = {
  id: string;
  direction: string | null;
  body: string | null;
  provider: string | null;
  conversation_id: string | null;
  channel_id: string | null;
  created_at: string | null;
};

type JobRow = {
  id: string;
  status: string | null;
  agent_type: string | null;
  response_type: string | null;
  sent_to_evolution: boolean | null;
  error_message: string | null;
  created_at: string | null;
};

type CooldownRow = {
  id: string;
  conversation_id: string | null;
  last_automated_response_at: string | null;
  last_response_text: string | null;
};

type ConversationRow = {
  id: string;
  name: string | null;
  status: string | null;
  stage: string | null;
  requires_human: boolean | null;
  pending_reason: string | null;
  sla_status: string | null;
  last_message_at: string | null;
};

async function safeQuery<T>(fallback: T, query: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<QueryResult<T>> {
  try {
    const result = await query;
    if (result.error) return { data: fallback, error: result.error.message };
    return { data: result.data ?? fallback, error: null };
  } catch (error) {
    return { data: fallback, error: error instanceof Error ? error.message : "Erro ao consultar dados." };
  }
}

async function safeCount(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  try {
    const result = await query;
    return { count: result.error ? 0 : result.count ?? 0, error: result.error?.message ?? null };
  } catch (error) {
    return { count: 0, error: error instanceof Error ? error.message : "Erro ao contar dados." };
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function preview(value?: string | null, size = 90) {
  if (!value) return "Sem texto";
  return value.length > size ? `${value.slice(0, size)}...` : value;
}

function statusClass(status: OperationCard["status"] | string | null | undefined) {
  if (status === "OK" || status === "processed" || status === "sent" || status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "Atenção" || status === "error" || status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#1B2F5B]">{value}</p>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function CardGrid({ cards }: { cards: OperationCard[] }) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.name} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{card.type}</p>
              <h3 className="mt-1 text-lg font-black text-[#1B2F5B]">{card.name}</h3>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(card.status)}`}>{card.status}</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">{card.channel}</p>
          {card.note && <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">{card.note}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">Conversas</p>
              <p className="font-black text-slate-800">{card.conversations}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">Msgs 24h</p>
              <p className="font-black text-slate-800">{card.messages24h}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">Jobs pend.</p>
              <p className="font-black text-slate-800">{card.pendingJobs}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">Jobs erro</p>
              <p className="font-black text-slate-800">{card.errorJobs}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Último atendimento: {card.lastService}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={card.primaryHref} className="rounded-full bg-[#2ABFAB] px-4 py-2 text-xs font-black text-white hover:bg-[#229d8e]">
              Abrir fila
            </Link>
            <Link href={card.secondaryHref} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
              Canal
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function DataTable<T>({
  title,
  error,
  rows,
  columns,
  empty,
}: {
  title: string;
  error: string | null;
  rows: T[];
  columns: Array<{ label: string; render: (row: T) => React.ReactNode }>;
  empty: string;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-black text-[#1B2F5B]">{title}</h3>
        {error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Indisponível</span>}
      </div>
      {error ? <p className="mt-3 text-sm text-slate-500">Não foi possível carregar estes dados agora.</p> : null}
      {!error && rows.length === 0 ? <p className="mt-3 text-sm text-slate-500">{empty}</p> : null}
      {!error && rows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.label} className="px-4 py-3">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.label} className="px-4 py-3 align-top text-slate-600">{column.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

async function getGatewayStatus() {
  const resolved = resolveSessionClient(LIPS_SESSION_ID);
  if (!resolved) return { online: false, status: "sessão inválida", error: "Sessão não permitida." };

  try {
    const status = (await resolved.client.getStatus()) as { status?: string; phone?: string } | null;
    return { online: true, status: status?.status || "online", phone: status?.phone || null, error: null };
  } catch (error) {
    return { online: false, status: "indisponível", phone: null, error: error instanceof Error ? error.message : "Gateway indisponível." };
  }
}

export default async function OperationsPage() {
  try {
    const context = await getRequiredAppContext();
    if (!context.isPlatformTenant || !["owner", "admin"].includes(context.role)) redirect("/dashboard");
  } catch (error) {
    if (isUnauthorizedError(error)) redirect("/login");
    throw error;
  }

  const db = createSupabaseWriteClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    channel,
    providerEvents,
    messages,
    jobs,
    cooldowns,
    conversations,
    openConversations,
    messages24h,
    pendingJobs,
    errorJobs,
    gateway,
  ] = await Promise.all([
    safeQuery<LipsChannel | null>(
      null,
      db
        .from("channels")
        .select("id, provider, provider_type, session_id, external_instance, slug, is_active")
        .eq("slug", LIPS_SESSION_ID)
        .maybeSingle(),
    ),
    safeQuery<ProviderEventRow[]>(
      [],
      db
        .from("provider_events")
        .select("id, processing_status, provider, external_event_id, channel_id, created_at")
        .eq("provider", "openwa")
        .order("created_at", { ascending: false })
        .limit(10),
    ),
    safeQuery<MessageRow[]>(
      [],
      db
        .from("whatsapp_messages")
        .select("id, direction, body, provider, conversation_id, channel_id, created_at")
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .order("created_at", { ascending: false })
        .limit(20),
    ),
    safeQuery<JobRow[]>(
      [],
      db
        .from("agent_automation_jobs")
        .select("id, status, agent_type, response_type, sent_to_evolution, error_message, created_at")
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .order("created_at", { ascending: false })
        .limit(20),
    ),
    safeQuery<CooldownRow[]>(
      [],
      db
        .from("agent_automation_cooldown")
        .select("id, conversation_id, last_automated_response_at, last_response_text")
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .order("last_automated_response_at", { ascending: false })
        .limit(5),
    ),
    safeQuery<ConversationRow[]>(
      [],
      db
        .from("whatsapp_conversations")
        .select("id, name, status, stage, requires_human, pending_reason, sla_status, last_message_at")
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(10),
    ),
    safeCount(
      db
        .from("whatsapp_conversations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .eq("requires_human", true),
    ),
    safeCount(
      db
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .gte("created_at", since24h),
    ),
    safeCount(
      db
        .from("agent_automation_jobs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .in("status", ["pending", "queued", "processing"]),
    ),
    safeCount(
      db
        .from("agent_automation_jobs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", LIPS_ORGANIZATION_ID)
        .in("status", ["error", "failed"]),
    ),
    getGatewayStatus(),
  ]);

  const lastOutbound = messages.data.find((message) => message.direction === "outbound");
  const lastInbound = messages.data.find((message) => message.direction === "inbound");
  const lastConversation = conversations.data[0];
  const lipsStatus: OperationCard["status"] = channel.data?.is_active && gateway.online && errorJobs.count === 0 ? "OK" : channel.data?.is_active ? "Atenção" : "Pendente";

  const ownOperations: OperationCard[] = [
    {
      name: "Moriah Systems",
      type: "Operação própria",
      channel: "Gestão interna e implantação",
      status: "OK",
      conversations: "—",
      messages24h: "—",
      pendingJobs: "—",
      errorJobs: "—",
      lastService: "Controle interno",
      primaryHref: "/admin",
      secondaryHref: "/settings/team",
      note: "Empresa responsável pelo Shamar Connect e pela operação assistida.",
    },
    {
      name: "MK Shalom",
      type: "Operação própria",
      channel: "WhatsApp em preparação",
      status: "Pendente",
      conversations: "—",
      messages24h: "—",
      pendingJobs: "—",
      errorJobs: "—",
      lastService: "Não configurado ainda",
      primaryHref: "/inbox",
      secondaryHref: "/settings/whatsapp",
    },
    {
      name: "Viciados em Trilhas",
      type: "Operação própria",
      channel: "CRM e distribuição",
      status: "Pendente",
      conversations: "—",
      messages24h: "—",
      pendingJobs: "—",
      errorJobs: "—",
      lastService: "Aguardando próxima etapa",
      primaryHref: "/distribution",
      secondaryHref: "/settings/whatsapp",
    },
    {
      name: "Pessoal Allan",
      type: "Operação própria",
      channel: "Uso pessoal e acompanhamento",
      status: "Pendente",
      conversations: "—",
      messages24h: "—",
      pendingJobs: "—",
      errorJobs: "—",
      lastService: "Não configurado ainda",
      primaryHref: "/dashboard",
      secondaryHref: "/settings/profile",
    },
  ];

  const products: OperationCard[] = [
    {
      name: "Shamar Connect",
      type: "Produto Moriah",
      channel: "Central WhatsApp, CRM e atendimento",
      status: "OK",
      conversations: openConversations.count,
      messages24h: messages24h.count,
      pendingJobs: pendingJobs.count,
      errorJobs: errorJobs.count,
      lastService: formatDateTime(lastConversation?.last_message_at),
      primaryHref: "/inbox",
      secondaryHref: "/settings/whatsapp",
      note: "Produto usado pela Lips no go-live atual.",
    },
    {
      name: "Shamar ERP",
      type: "Produto Moriah",
      channel: "Gestão empresarial",
      status: "Pendente",
      conversations: "—",
      messages24h: "—",
      pendingJobs: "—",
      errorJobs: "—",
      lastService: "Fora do escopo atual",
      primaryHref: "/dashboard",
      secondaryHref: "/settings/billing",
    },
    {
      name: "Shamar Kids",
      type: "Produto Moriah",
      channel: "Cloud API em preparação",
      status: "Pendente",
      conversations: "—",
      messages24h: "—",
      pendingJobs: "—",
      errorJobs: "—",
      lastService: "Não mexer agora",
      primaryHref: "/dashboard",
      secondaryHref: "/settings/whatsapp-cloud",
    },
    {
      name: "OriahFin",
      type: "Produto Moriah",
      channel: "Financeiro em preparação",
      status: "Pendente",
      conversations: "—",
      messages24h: "—",
      pendingJobs: "—",
      errorJobs: "—",
      lastService: "Fora do escopo atual",
      primaryHref: "/financeiro",
      secondaryHref: "/settings/billing",
    },
  ];

  const clients: OperationCard[] = [
    {
      name: "Lips",
      type: "Cliente Shamar Connect",
      channel: gateway.online ? "OpenWA / WhatsApp conectado" : "OpenWA / verificar gateway",
      status: lipsStatus,
      conversations: openConversations.count,
      messages24h: messages24h.count,
      pendingJobs: pendingJobs.count,
      errorJobs: errorJobs.count,
      lastService: formatDateTime(lastConversation?.last_message_at),
      primaryHref: "/inbox",
      secondaryHref: "/settings/whatsapp",
      note: "Cliente ativo / Go-live. Auto-resposta por regra, catálogo consultivo e pendências humanas monitoradas.",
    },
    {
      name: "Futuros clientes",
      type: "Clientes Shamar Connect",
      channel: "Igrejas, clínicas, autopeças e negócios locais",
      status: "Pendente",
      conversations: "—",
      messages24h: "—",
      pendingJobs: "—",
      errorJobs: "—",
      lastService: "Aguardando implantação",
      primaryHref: "/admin/implantacao",
      secondaryHref: "/admin/clients",
      note: "Espaço reservado para próximos clientes sem misturar com operações próprias.",
    },
  ];

  const tests = [
    {
      title: "Teste 1 — Cotação",
      message: "tem pastilha de freio do Corolla 2015?",
      expected: "Inbound salvo, catálogo consultado, resposta enviada, outbound salvo e cooldown registrado.",
    },
    {
      title: "Teste 2 — Cotação em sequência",
      message: "quanto custa amortecedor do gol?",
      expected: "Responde nova cotação mesmo em menos de 5 minutos quando for cotação diferente.",
    },
    {
      title: "Teste 3 — Interesse humano",
      message: "quero sim",
      expected: "Direciona humano, sem vender, reservar ou enviar pagamento.",
    },
    {
      title: "Teste 4 — Oficina",
      message: "quero agendar troca de óleo",
      expected: "Direciona Oficina, SLA 10 min e não confirma horário automaticamente.",
    },
    {
      title: "Teste 5 — Compra/pagamento",
      message: "manda o pix que vou pagar",
      expected: "Direciona Supervisor, sem enviar PIX e sem fechar venda.",
    },
  ];

  return (
    <AppShell active="operations">
      <div className="space-y-10">
        <header className="rounded-[2rem] bg-[#1B2F5B] p-8 text-white shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2ABFAB]">Operação Allan / Moriah</p>
          <h1 className="mt-3 text-3xl font-black md:text-4xl">Centro de Comando</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Painel operacional para administrar empresas próprias, produtos Moriah e clientes do Shamar Connect. A Lips aparece como primeiro cliente real em go-live, separada das operações da Moriah.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/inbox" className="rounded-full bg-[#2ABFAB] px-5 py-3 text-sm font-black text-white hover:bg-[#229d8e]">Abrir fila de atendimento</Link>
            <Link href="/settings/whatsapp" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">Configurações WhatsApp</Link>
          </div>
        </header>

        <section>
          <SectionTitle title="Empresas / Operações Próprias" description="Operações do Allan e da Moriah. Clientes não entram nesta seção." />
          <CardGrid cards={ownOperations} />
        </section>

        <section>
          <SectionTitle title="Produtos Moriah" description="Produtos próprios que podem atender múltiplos clientes e operações." />
          <CardGrid cards={products} />
        </section>

        <section>
          <SectionTitle title="Clientes" description="Empresas atendidas pelo Shamar Connect. A Lips é o primeiro cliente real monitorado aqui." />
          <CardGrid cards={clients} />
        </section>

        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#C9952A]">Cliente ativo / Go-live</p>
              <h2 className="mt-1 text-2xl font-black text-[#1B2F5B]">Lips — Go-Live OpenWA</h2>
              <p className="mt-2 text-sm text-slate-500">Cliente Shamar Connect com auto-resposta por regra e catálogo consultivo.</p>
            </div>
            <span className={`w-fit rounded-full border px-4 py-2 text-xs font-black ${statusClass(lipsStatus)}`}>{lipsStatus}</span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Provider esperado" value="openwa" />
            <MiniStat label="Session" value={LIPS_SESSION_ID} />
            <MiniStat label="Channel ID" value={channel.data?.id === LIPS_CHANNEL_ID ? "validado" : "verificar"} />
            <MiniStat label="Gateway" value={gateway.online ? gateway.status : "atenção"} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-black text-slate-800">Canal OpenWA</p>
              <div className="mt-3 space-y-2 text-slate-600">
                <p>provider: <strong>{channel.data?.provider || "—"}</strong></p>
                <p>provider_type: <strong>{channel.data?.provider_type || "—"}</strong></p>
                <p>session_id: <strong>{channel.data?.session_id || "—"}</strong></p>
                <p>slug: <strong>{channel.data?.slug || "—"}</strong></p>
                <p>ativo no banco: <strong>{channel.data?.is_active ? "sim" : "não"}</strong></p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-black text-slate-800">Fila de atendimento</p>
              <div className="mt-3 space-y-2 text-slate-600">
                <p>pendências humanas: <strong>{openConversations.count}</strong></p>
                <p>último inbound: <strong>{formatDateTime(lastInbound?.created_at)}</strong></p>
                <p>último outbound: <strong>{formatDateTime(lastOutbound?.created_at)}</strong></p>
                <p>última auto-resposta: <strong>{formatDateTime(cooldowns.data[0]?.last_automated_response_at)}</strong></p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-black text-slate-800">Auto-resposta por regra</p>
              <div className="mt-3 space-y-2 text-slate-600">
                <p>jobs pendentes: <strong>{pendingJobs.count}</strong></p>
                <p>jobs com erro: <strong>{errorJobs.count}</strong></p>
                <p>catálogo consultivo: <strong>ativo</strong></p>
                <p>cooldown: <strong>{cooldowns.data[0] ? "registrado" : "sem registro recente"}</strong></p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <DataTable<ProviderEventRow>
            title="Últimos eventos OpenWA"
            error={providerEvents.error}
            rows={providerEvents.data}
            empty="Nenhum evento OpenWA recente."
            columns={[
              { label: "Status", render: (row) => <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(row.processing_status)}`}>{row.processing_status || "—"}</span> },
              { label: "Evento", render: (row) => preview(row.external_event_id, 36) },
              { label: "Criado", render: (row) => formatDateTime(row.created_at) },
            ]}
          />
          <DataTable<JobRow>
            title="Últimos jobs de auto-resposta"
            error={jobs.error}
            rows={jobs.data}
            empty="Nenhum job recente."
            columns={[
              { label: "Status", render: (row) => <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(row.status)}`}>{row.status || "—"}</span> },
              { label: "Tipo", render: (row) => row.response_type || row.agent_type || "—" },
              { label: "Erro", render: (row) => preview(row.error_message, 40) },
              { label: "Criado", render: (row) => formatDateTime(row.created_at) },
            ]}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <DataTable<MessageRow>
            title="Últimas mensagens Lips"
            error={messages.error}
            rows={messages.data}
            empty="Nenhuma mensagem recente da Lips."
            columns={[
              { label: "Direção", render: (row) => <span className="font-black">{row.direction || "—"}</span> },
              { label: "Mensagem", render: (row) => preview(row.body) },
              { label: "Criado", render: (row) => formatDateTime(row.created_at) },
            ]}
          />
          <DataTable<CooldownRow>
            title="Últimos cooldowns"
            error={cooldowns.error}
            rows={cooldowns.data}
            empty="Nenhum cooldown recente."
            columns={[
              { label: "Último envio", render: (row) => formatDateTime(row.last_automated_response_at) },
              { label: "Resposta", render: (row) => preview(row.last_response_text) },
            ]}
          />
        </section>

        <section>
          <SectionTitle title="Checklist de Teste Lips" description="Testes manuais para validar o go-live sem acionar ações perigosas pelo painel." />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {tests.map((test) => (
              <div key={test.title} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="font-black text-[#1B2F5B]">{test.title}</h3>
                <p className="mt-3 rounded-2xl bg-slate-950 p-3 font-mono text-sm text-white">{test.message}</p>
                <p className="mt-3 text-sm text-slate-500">Esperado: {test.expected}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
