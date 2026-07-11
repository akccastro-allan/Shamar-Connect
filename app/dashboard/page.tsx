import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DashboardOperationalPanel } from "@/components/dashboard-operational-panel";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const metadata = { title: "Dashboard — ShamarConnect" };

async function getDashboardMetrics(tenantId: string, organizationId: string) {
  const db = createSupabaseWriteClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const [contacts, openConversations, pendingConversations, assignedConversations, resolvedToday, inboundToday, channels, activeAutomations] = await Promise.all([
    db
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId),
    db
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    db
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    db
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("status", "open")
      .not("assigned_to", "is", null),
    db
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("status", "resolved")
      .gte("updated_at", todayIso),
    db
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("direction", "inbound")
      .gte("created_at", todayIso),
    db
      .from("channels")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("active", true)
      .not("session_id", "is", null),
    db
      .from("conversation_flows")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
  ]);

  return {
    contactCount: contacts.count ?? 0,
    openConversationCount: openConversations.count ?? 0,
    pendingConversationCount: pendingConversations.count ?? 0,
    assignedConversationCount: assignedConversations.count ?? 0,
    resolvedTodayCount: resolvedToday.count ?? 0,
    inboundTodayCount: inboundToday.count ?? 0,
    connectedChannelCount: channels.count ?? 0,
    activeAutomationCount: activeAutomations.count ?? 0,
  };
}

export default async function DashboardPage() {
  let context;
  try {
    context = await getRequiredAppContext();
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/login");
    throw err;
  }

  const metrics = await getDashboardMetrics(context.tenantId, context.organizationId);
  const firstName = (context.name || "").trim().split(" ")[0];

  return (
    <AppShell active="dashboard">
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : "Seu painel"}
        description="Acompanhe os atendimentos do WhatsApp da sua empresa em um só lugar."
        badge="Visão geral"
      />
      <DashboardOperationalPanel metrics={metrics} />
    </AppShell>
  );
}
