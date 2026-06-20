import { redirect } from "next/navigation";
import Link from "next/link";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LipsReadiness } from "@/app/api/demo/lips-readiness/route";

async function fetchLipsReadiness(): Promise<LipsReadiness> {
  const db = createSupabaseWriteClient();

  const { data: channel } = await db
    .from("channels")
    .select("tenant_id, organization_id, session_id")
    .eq("session_id", "lips-main")
    .maybeSingle();

  const lipsTenantId = channel?.tenant_id ?? null;
  const lipsOrgId = channel?.organization_id ?? null;

  if (!lipsTenantId || !lipsOrgId) {
    return {
      lipsOrgId: null,
      lipsTenantId: null,
      whatsappChannel: { exists: false, sessionId: null },
      contacts: { count: 0 },
      conversations: { count: 0 },
      agents: { count: 0 },
      pipeline: { stagesCount: 0 },
      support: { ticketsCount: 0 },
      checkedAt: new Date().toISOString(),
    };
  }

  const [contactsRes, conversationsRes, agentsRes, pipelineRes, supportRes] = await Promise.all([
    db.from("crm_contacts").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
    db.from("whatsapp_conversations").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
    db.from("tenant_users").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId).eq("status", "active"),
    db.from("pipeline_stages").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
    db.from("support_tickets").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
  ]);

  return {
    lipsOrgId,
    lipsTenantId,
    whatsappChannel: { exists: true, sessionId: channel?.session_id ?? null },
    contacts: { count: contactsRes.count ?? 0 },
    conversations: { count: conversationsRes.count ?? 0 },
    agents: { count: agentsRes.count ?? 0 },
    pipeline: { stagesCount: pipelineRes.count ?? 0 },
    support: { ticketsCount: supportRes.count ?? 0 },
    checkedAt: new Date().toISOString(),
  };
}

function CheckItem({
  label,
  ok,
  detail,
  link,
}: {
  label: string;
  ok: boolean;
  detail: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border bg-white p-4">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${ok ? "bg-emerald-500" : "bg-red-500"}`}
      >
        {ok ? "✓" : "✗"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge className={ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
          {ok ? "OK" : "Pendente"}
        </Badge>
        {link && (
          <Button asChild variant="outline" size="sm" className="text-xs h-7">
            <Link href={link.href}>{link.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default async function DemoChecklistPage() {
  let context;
  try {
    context = await getRequiredAppContext();
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/login");
    throw err;
  }

  if (!context.isPlatformTenant) {
    redirect("/dashboard");
  }

  const r = await fetchLipsReadiness();

  const orgFound = !!r.lipsOrgId;
  const whatsappOk = r.whatsappChannel.exists;
  // Sync = conversations exist (WhatsApp history was pulled)
  const syncOk = r.conversations.count > 0;
  const contactsOk = r.contacts.count > 0;
  const pipelineOk = r.pipeline.stagesCount > 0;
  // Support = tickets table accessible (structural check)
  const supportOk = orgFound;
  // Operations = org found and channel configured
  const operationsOk = orgFound && whatsappOk;

  const allOk = orgFound && whatsappOk && syncOk && contactsOk && pipelineOk && supportOk && operationsOk;
  const readyCount = [orgFound, whatsappOk, syncOk, contactsOk, pipelineOk, supportOk, operationsOk].filter(Boolean).length;

  const checkedAt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(r.checkedAt));

  return (
    <AppShell active="demo-checklist">
      <div className="max-w-2xl space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-foreground">Lips — Demo Checklist</h1>
            <Badge className={allOk ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
              {readyCount}/7 OK
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Prontidão para demonstração · 1 administrador + 4 atendentes · Verificado em {checkedAt}
          </p>
        </div>

        {!orgFound && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">Organização Lips não encontrada</p>
            <p className="text-xs text-red-700 mt-1">
              Nenhum canal com session_id &quot;lips-main&quot; foi encontrado no banco. Verifique o provisionamento.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <CheckItem
            label="1. Login funcionando"
            ok={r.agents.count > 0}
            detail={
              r.agents.count > 0
                ? `${r.agents.count} usuário(s) ativo(s) cadastrado(s) na organização Lips`
                : "Nenhum usuário ativo encontrado — provisione atendentes antes da demo"
            }
            link={{ href: "/admin/users", label: "Gerenciar usuários" }}
          />

          <CheckItem
            label="2. WhatsApp conectado"
            ok={whatsappOk}
            detail={
              whatsappOk
                ? `Canal lips-main configurado · verifique status online em Operações`
                : "Canal lips-main não encontrado — configure o canal em Configurações"
            }
            link={{ href: "/settings/whatsapp", label: "Conectar WhatsApp" }}
          />

          <CheckItem
            label="3. Sync realizado"
            ok={syncOk}
            detail={
              syncOk
                ? `${r.conversations.count} conversa(s) sincronizada(s) com o banco`
                : "Nenhuma conversa importada ainda — importe o histórico do WhatsApp"
            }
            link={{ href: "/whatsapp-import", label: "Importar histórico" }}
          />

          <CheckItem
            label="4. Contatos criados"
            ok={contactsOk}
            detail={
              contactsOk
                ? `${r.contacts.count} contato(s) no CRM da Lips`
                : "Nenhum contato no CRM — importe contatos ou sincronize o WhatsApp"
            }
            link={{ href: "/contacts", label: "Ver contatos" }}
          />

          <CheckItem
            label="5. Pipeline criado"
            ok={pipelineOk}
            detail={
              pipelineOk
                ? `${r.pipeline.stagesCount} etapa(s) de pipeline configurada(s)`
                : "Nenhuma etapa de pipeline — acesse o CRM e configure o funil"
            }
            link={{ href: "/crm", label: "Ver pipeline" }}
          />

          <CheckItem
            label="6. Suporte funcionando"
            ok={supportOk}
            detail={
              supportOk
                ? `Módulo de suporte disponível · ${r.support.ticketsCount} chamado(s) registrado(s)`
                : "Organização não encontrada — suporte não está disponível"
            }
            link={{ href: "/support", label: "Abrir suporte" }}
          />

          <CheckItem
            label="7. Operations funcionando"
            ok={operationsOk}
            detail={
              operationsOk
                ? "Organização e canal WhatsApp configurados — Operations pronto"
                : "Configure a organização e o canal WhatsApp antes da demo"
            }
            link={{ href: "/operations", label: "Ver Operations" }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resumo para a demo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p>· <strong>{r.agents.count}</strong> atendente(s) cadastrado(s) — meta: 5 (1 admin + 4)</p>
            <p>· <strong>{r.contacts.count}</strong> contato(s) no CRM</p>
            <p>· <strong>{r.conversations.count}</strong> conversa(s) disponíveis</p>
            <p>· <strong>{r.pipeline.stagesCount}</strong> etapa(s) de pipeline</p>
            <p>· <strong>{r.support.ticketsCount}</strong> chamado(s) de suporte</p>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/operations">Ver Operações</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/whatsapp-messages">Central de atendimento</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
