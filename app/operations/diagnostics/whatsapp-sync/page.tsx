import { AppShell } from "@/components/app-shell";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { createDefaultOpenWaSyncProvider } from "@/lib/whatsapp-sync/providers/openwa-sync-provider-default";
import { canExecuteSyncDiagnostics, getLipsWhatsappSyncDiagnostics, requireWhatsappSyncDiagnosticsOperator } from "@/lib/whatsapp-sync/diagnostics";
import { WhatsappSyncDiagnosticsClient } from "./whatsapp-sync-diagnostics-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export const metadata = { title: "Sincronização WhatsApp — Centro de Comando" };

export default async function OperationsWhatsappSyncDiagnosticsPage() {
  const db = createSupabaseWriteClient();
  const operator = await requireWhatsappSyncDiagnosticsOperator(db);
  const snapshot = await getLipsWhatsappSyncDiagnostics(db, createDefaultOpenWaSyncProvider);
  const canExecute = canExecuteSyncDiagnostics({ vercelEnv: process.env.VERCEL_ENV, metadata: operator.metadata });

  return (
    <AppShell active="operations/diagnostics/whatsapp-sync">
      <WhatsappSyncDiagnosticsClient initialSnapshot={snapshot} canExecute={canExecute} vercelEnv={process.env.VERCEL_ENV || "development"} />
    </AppShell>
  );
}
