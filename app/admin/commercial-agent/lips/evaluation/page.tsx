import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assertPlatformAdminRoute } from "@/lib/features/route-guards";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { LipsEvaluationClient, type LipsEvaluationConversation } from "./evaluation-client";

export const metadata = { title: "Avaliação Agente Comercial Lips" };
export const dynamic = "force-dynamic";

export default async function LipsCommercialAgentEvaluationPage() {
  await assertPlatformAdminRoute();
  const db = createSupabaseWriteClient();

  const { data: lipsChannel } = await db
    .from("channels")
    .select("tenant_id, organization_id")
    .eq("session_id", "lips-main")
    .maybeSingle();

  const tenantId = lipsChannel?.tenant_id ?? "";
  const organizationId = lipsChannel?.organization_id ?? "";

  const [analysisResult, suggestionsResult, profileResult] = tenantId && organizationId ? await Promise.all([
    db
      .from("commercial_conversation_analysis")
      .select("id, conversation_id, status, analysis, request_status, latency_ms, input_tokens, output_tokens, total_tokens, estimated_cost_usd, guardrail_reasons, created_at")
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("commercial_response_suggestions")
      .select("id, status, request_status, latency_ms, total_tokens, estimated_cost_usd, guardrail_reasons, rejection_reason, created_at")
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("commercial_agent_profiles")
      .select("id, enabled, stage, response_mode, pricing_authority, stock_authority")
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("name", "lips-commercial-observer")
      .maybeSingle(),
  ]) : [{ data: [] }, { data: [] }, { data: null }];

  const { data: lipsChannelFull } = tenantId && organizationId ? await db
    .from("channels")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("organization_id", organizationId)
    .eq("session_id", "lips-main")
    .maybeSingle() : { data: null };

  const { data: rawConversations } = lipsChannelFull?.id ? await db
    .from("whatsapp_conversations")
    .select("id, name, status, last_message_at, updated_at, crm_contacts(name, phone)")
    .eq("tenant_id", tenantId)
    .eq("organization_id", organizationId)
    .eq("channel_id", lipsChannelFull.id)
    .eq("is_group", false)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(12) : { data: [] };

  const conversationIds = (rawConversations ?? []).map((conversation) => conversation.id);
  const { data: latestMessages } = conversationIds.length > 0 ? await db
    .from("whatsapp_messages")
    .select("conversation_id, body, created_at")
    .eq("tenant_id", tenantId)
    .eq("organization_id", organizationId)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(60) : { data: [] };

  const analyses = analysisResult.data ?? [];
  const suggestions = suggestionsResult.data ?? [];
  const unsafe = suggestions.filter((item) => item.status === "unsafe_suggestion" || (item.guardrail_reasons ?? []).length > 0);
  const rejected = suggestions.filter((item) => item.status === "rejected");
  const avgLatency = average(analyses.map((item) => Number(item.latency_ms || 0)).filter(Boolean));
  const totalTokens = analyses.reduce((sum, item) => sum + Number(item.total_tokens || 0), 0) + suggestions.reduce((sum, item) => sum + Number(item.total_tokens || 0), 0);
  const totalCost = analyses.reduce((sum, item) => sum + Number(item.estimated_cost_usd || 0), 0) + suggestions.reduce((sum, item) => sum + Number(item.estimated_cost_usd || 0), 0);
  const analyzedConversationIds = new Set(analyses.map((item) => item.conversation_id).filter(Boolean));
  const latestMessageByConversation = new Map<string, string>();
  for (const message of latestMessages ?? []) {
    if (!latestMessageByConversation.has(message.conversation_id)) latestMessageByConversation.set(message.conversation_id, summarize(message.body));
  }
  const conversations: LipsEvaluationConversation[] = (rawConversations ?? []).map((conversation) => {
    const contact = Array.isArray(conversation.crm_contacts) ? conversation.crm_contacts[0] : conversation.crm_contacts;
    return {
      id: conversation.id,
      contactLabel: maskContact(contact?.name || conversation.name || "Contato Lips", contact?.phone),
      lastMessageSummary: latestMessageByConversation.get(conversation.id) ?? "Sem mensagem recente disponível.",
      status: conversation.status ?? "sem status",
      lastMessageAt: conversation.last_message_at ?? conversation.updated_at ?? null,
      analyzed: analyzedConversationIds.has(conversation.id),
    };
  });

  return (
    <AppShell active="admin">
      <div className="space-y-6">
        <div>
          <Badge className="bg-[#2ABFAB]/10 text-[#13796D] hover:bg-[#2ABFAB]/10">Lips · observer</Badge>
          <h1 className="mt-4 text-3xl font-black text-slate-950">Avaliação do Agente Comercial Lips</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Diagnóstico interno para análises manuais, sugestões, guardrails, latência, tokens e custo estimado. Não envia mensagens.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Metric title="Análises" value={analyses.length} />
          <Metric title="Sugestões" value={suggestions.length} />
          <Metric title="Rejeições" value={rejected.length} />
          <Metric title="Guardrails" value={unsafe.length} />
          <Metric title="Custo estimado" value={`US$ ${totalCost.toFixed(6)}`} />
        </div>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Perfil real persistido para a Lips.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <Info label="enabled" value={String(profileResult.data?.enabled ?? false)} />
            <Info label="stage" value={profileResult.data?.stage ?? "não encontrado"} />
            <Info label="response mode" value={profileResult.data?.response_mode ?? "não encontrado"} />
            <Info label="price" value={profileResult.data?.pricing_authority ?? "não encontrado"} />
            <Info label="stock" value={profileResult.data?.stock_authority ?? "não encontrado"} />
            <Info label="avg latency" value={avgLatency ? `${avgLatency.toFixed(0)}ms` : "sem dados"} />
            <Info label="tokens" value={String(totalTokens)} />
          </CardContent>
        </Card>

        <LipsEvaluationClient conversations={conversations} />

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle>Últimas análises</CardTitle>
            <CardDescription>Sem prompt, sem JSON bruto e sem chain of thought.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyses.length === 0 ? <Empty text="Nenhuma análise executada." /> : analyses.map((item) => {
              const analysis = item.analysis as { summary?: string; intent?: string; stage?: string; temperature?: string; objections?: string[] } | null;
              return (
                <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{analysis?.temperature ?? "sem temperatura"}</Badge>
                    <Badge variant="outline">{analysis?.stage ?? "sem estágio"}</Badge>
                    <Badge variant="outline">{item.request_status ?? "sem status"}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">{analysis?.summary ?? "Sem resumo."}</p>
                  <p className="mt-2 text-xs text-slate-500">Objeções: {(analysis?.objections ?? []).join(", ") || "nenhuma"}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-black text-[#1B2F5B]">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-100 p-3"><p className="text-xs font-black uppercase text-slate-400">{label}</p><p className="mt-1 font-black text-slate-900">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-500">{text}</div>;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarize(value?: string | null) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "Mensagem sem texto.";
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function maskContact(name: string, phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 4) return `${name} · ***${digits.slice(-4)}`;
  return name;
}
