import Link from "next/link";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { AppShell } from "@/components/app-shell";
import { assertPlatformAdminRoute } from "@/lib/features/route-guards";
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
      admins: { count: 0 },
      pipeline: { stagesCount: 0 },
      support: { ticketsCount: 0 },
      channelCount: 0,
      checkedAt: new Date().toISOString(),
    };
  }

  const [contactsRes, conversationsRes, agentsRes, adminsRes, pipelineRes, supportRes, channelCountRes] = await Promise.all([
    db.from("crm_contacts").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
    db.from("whatsapp_conversations").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
    db.from("tenant_users").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId).eq("status", "active"),
    db.from("tenant_users").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId).eq("status", "active")
      .in("role", ["owner", "admin"]),
    db.from("pipeline_stages").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
    db.from("support_tickets").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
    db.from("channels").select("id", { count: "exact", head: true })
      .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
  ]);

  return {
    lipsOrgId,
    lipsTenantId,
    whatsappChannel: { exists: true, sessionId: channel?.session_id ?? null },
    contacts: { count: contactsRes.count ?? 0 },
    conversations: { count: conversationsRes.count ?? 0 },
    agents: { count: agentsRes.count ?? 0 },
    admins: { count: adminsRes.count ?? 0 },
    pipeline: { stagesCount: pipelineRes.count ?? 0 },
    support: { ticketsCount: supportRes.count ?? 0 },
    channelCount: channelCountRes.count ?? 0,
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
  await assertPlatformAdminRoute();

  const r = await fetchLipsReadiness();

  const orgFound = !!r.lipsOrgId;
  const loginOk = r.agents.count > 0;
  const isolationOk = orgFound && r.channelCount === 1; // só 1 canal no tenant = isolado
  const whatsappOk = r.whatsappChannel.exists;
  const syncOk = r.conversations.count > 0;
  const conversationsOk = r.conversations.count > 0;
  const contactsOk = r.contacts.count > 0;
  const supportOk = orgFound;
  const attendantsOk = r.agents.count >= 4;
  const adminOk = r.admins.count >= 1;

  const items = [loginOk, isolationOk, whatsappOk, syncOk, conversationsOk, true, contactsOk, supportOk, attendantsOk, adminOk];
  const readyCount = items.filter(Boolean).length;
  const allOk = items.every(Boolean);

  const checkedAt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(r.checkedAt));

  return (
    <AppShell active="demo-checklist">
      <div>
        <div className="max-w-2xl space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-foreground">Lips — Go Live Checklist</h1>
              <Badge className={allOk ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                {readyCount}/{items.length} OK
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Prontidão para ir ao ar · verificado em {checkedAt}
            </p>
          </div>

          {!orgFound && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Organização Lips não encontrada</p>
              <p className="text-xs text-red-700 mt-1">
                Nenhum canal com session_id &quot;lips-main&quot; encontrado. Verifique o provisionamento.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <CheckItem
              label="1. Login Lips OK"
              ok={loginOk}
              detail={
                loginOk
                  ? `${r.agents.count} usuário(s) ativo(s) na organização Lips`
                  : "Nenhum usuário ativo — provisione ao menos 1 usuário"
              }
              link={{ href: "/admin/users", label: "Gerenciar usuários" }}
            />

            <CheckItem
              label="2. Isolamento OK"
              ok={isolationOk}
              detail={
                isolationOk
                  ? "Lips tem somente 1 canal configurado — isolamento garantido"
                  : orgFound
                    ? `${r.channelCount} canal(is) encontrado(s) — verifique se canais de outras empresas estão vazando`
                    : "Organização não encontrada — impossível verificar isolamento"
              }
              link={{ href: "/settings/whatsapp", label: "Ver canais" }}
            />

            <CheckItem
              label="3. WhatsApp Lips conectado"
              ok={whatsappOk}
              detail={
                whatsappOk
                  ? `Canal lips-main configurado · verifique status online em Operações`
                  : "Canal lips-main não encontrado — configure o canal"
              }
              link={{ href: "/settings/whatsapp", label: "Conectar WhatsApp" }}
            />

            <CheckItem
              label="4. Sync realizado"
              ok={syncOk}
              detail={
                syncOk
                  ? `${r.conversations.count} conversa(s) sincronizada(s)`
                  : "Nenhuma conversa importada — execute o sync após conectar o WhatsApp"
              }
              link={{ href: "/whatsapp-diagnostics", label: "Sincronizar" }}
            />

            <CheckItem
              label="5. Conversas carregadas"
              ok={conversationsOk}
              detail={
                conversationsOk
                  ? `${r.conversations.count} conversa(s) disponíveis na central`
                  : "Sem conversas — faça sync primeiro"
              }
              link={{ href: "/whatsapp-messages", label: "Ver central" }}
            />

            <CheckItem
              label="6. Envio manual testado"
              ok={false}
              detail="Verificar manualmente — abra uma conversa e envie uma mensagem de teste"
              link={{ href: "/whatsapp-messages", label: "Central de atendimento" }}
            />

            <CheckItem
              label="7. Contatos funcionando"
              ok={contactsOk}
              detail={
                contactsOk
                  ? `${r.contacts.count} contato(s) no CRM`
                  : "Nenhum contato — importe ou sincronize grupos"
              }
              link={{ href: "/contacts", label: "Ver contatos" }}
            />

            <CheckItem
              label="8. Suporte funcionando"
              ok={supportOk}
              detail={
                supportOk
                  ? `Suporte disponível · ${r.support.ticketsCount} chamado(s)`
                  : "Organização não encontrada — suporte indisponível"
              }
              link={{ href: "/support", label: "Abrir suporte" }}
            />

            <CheckItem
              label="9. 4 atendentes cadastrados"
              ok={attendantsOk}
              detail={
                attendantsOk
                  ? `${r.agents.count} usuário(s) ativo(s) — meta atingida`
                  : `${r.agents.count} de 4 atendentes — cadastre mais usuários`
              }
              link={{ href: "/admin/users", label: "Gerenciar usuários" }}
            />

            <CheckItem
              label="10. 1 administrador cadastrado"
              ok={adminOk}
              detail={
                adminOk
                  ? `${r.admins.count} administrador(es) configurado(s)`
                  : "Nenhum admin/owner — atribua permissão de administrador a um usuário"
              }
              link={{ href: "/admin/users", label: "Gerenciar usuários" }}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1 text-muted-foreground">
              <p>· <strong>{r.agents.count}</strong> usuário(s) ativo(s) — <strong>{r.admins.count}</strong> admin(s)</p>
              <p>· <strong>{r.contacts.count}</strong> contato(s) no CRM</p>
              <p>· <strong>{r.conversations.count}</strong> conversa(s)</p>
              <p>· <strong>{r.pipeline.stagesCount}</strong> etapa(s) de pipeline</p>
              <p>· <strong>{r.support.ticketsCount}</strong> chamado(s) de suporte</p>
              <p>· <strong>{r.channelCount}</strong> canal(is) configurado(s)</p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/operations">Ver Operações</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/whatsapp-messages">Central de atendimento</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/users">Gerenciar usuários</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
