import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Primeiros Passos — ShamarConnect" };

async function getChecklistData(tenantId: string, organizationId: string) {
  const db = createSupabaseWriteClient();

  const [channels, conversations, contacts] = await Promise.all([
    db
      .from("channels")
      .select("id, session_id, name")
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .not("session_id", "is", null),
    db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId),
    db
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId),
  ]);

  const channelList = channels.data ?? [];
  const hasChannel = channelList.length > 0;
  const hasSynced = (conversations.count ?? 0) > 0;
  const hasContacts = (contacts.count ?? 0) > 0;

  return {
    loggedIn: true,
    hasChannel,
    hasSynced,
    hasContacts,
    conversationCount: conversations.count ?? 0,
    contactCount: contacts.count ?? 0,
  };
}

function Step({
  number,
  title,
  description,
  done,
  actionLabel,
  actionHref,
}: {
  number: number;
  title: string;
  description: string;
  done: boolean;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className={`flex gap-5 rounded-3xl border p-6 transition ${done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="mt-0.5 shrink-0">
        {done ? (
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-300 text-sm font-black text-slate-400">
            {number}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`font-bold ${done ? "text-emerald-800" : "text-slate-900"}`}>{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {actionLabel && actionHref && !done && (
            <Button asChild size="sm" className="shrink-0">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          )}
          {done && (
            <Badge className="shrink-0 bg-emerald-600 text-white">Concluído</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function GettingStartedPage() {
  let context;
  try {
    context = await getRequiredAppContext();
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/login");
    throw err;
  }

  if (!context.organizationId) redirect("/admin");

  const data = await getChecklistData(context.tenantId, context.organizationId);
  const doneCount = [data.loggedIn, data.hasChannel, data.hasSynced, data.hasContacts].filter(Boolean).length;
  const total = 6;

  return (
    <AppShell active="getting-started">
      <div>
        <div className="mb-2">
          <Badge className="bg-[#2ABFAB] text-white">{doneCount}/{total} concluídos</Badge>
        </div>
        <h1 className="text-3xl font-black text-[#1B2F5B]">Primeiros Passos</h1>
        <p className="mt-2 text-muted-foreground">
          Siga os passos abaixo para configurar sua central de atendimento e começar a atender clientes.
        </p>

        <div className="mt-8 space-y-4">
          <Step
            number={1}
            title="Entrar na conta"
            description="Você já está logado. Sua conta está ativa e pronta para uso."
            done={data.loggedIn}
          />

          <Step
            number={2}
            title="Conectar WhatsApp"
            description={
              data.hasChannel
                ? "Canal WhatsApp encontrado. Verifique se está conectado em Configurações."
                : "Você ainda não tem um canal WhatsApp configurado. Acesse Configurações para conectar."
            }
            done={false}
            actionLabel="Configurar WhatsApp"
            actionHref="/settings/whatsapp"
          />

          <Step
            number={3}
            title="Sincronizar conversas"
            description={
              data.hasSynced
                ? `${data.conversationCount} conversa${data.conversationCount !== 1 ? "s" : ""} sincronizada${data.conversationCount !== 1 ? "s" : ""}.`
                : "Após conectar o WhatsApp, sincronize para importar conversas existentes."
            }
            done={data.hasSynced}
            actionLabel="Sincronizar conversas"
            actionHref="/settings/whatsapp"
          />

          <Step
            number={4}
            title="Criar ou salvar primeiro contato"
            description={
              data.hasContacts
                ? `${data.contactCount} contato${data.contactCount !== 1 ? "s" : ""} registrado${data.contactCount !== 1 ? "s" : ""} no CRM.`
                : "Salve o primeiro contato para organizar seus clientes no CRM."
            }
            done={data.hasContacts}
            actionLabel="Ir para Contatos"
            actionHref="/contacts"
          />

          <Step
            number={5}
            title="Responder primeira conversa"
            description="Abra uma conversa e envie uma mensagem manual para testar o atendimento."
            done={false}
            actionLabel="Central de Atendimento"
            actionHref="/whatsapp-messages"
          />

          <Step
            number={6}
            title="Abrir chamado de suporte se precisar"
            description="Precisa de ajuda? Abra um chamado e nossa equipe responde em breve."
            done={false}
            actionLabel="Abrir Suporte"
            actionHref="/support"
          />
        </div>

        <div className="mt-10 rounded-3xl border border-[#2ABFAB]/30 bg-[#2ABFAB]/5 p-6">
          <p className="font-bold text-[#1B2F5B]">Precisa de ajuda?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nossa equipe está disponível para auxiliar na configuração. Abra um chamado em{" "}
            <Link href="/support" className="font-semibold text-[#2ABFAB] hover:underline">
              Suporte
            </Link>{" "}
            ou entre em contato direto com o responsável da sua conta.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
