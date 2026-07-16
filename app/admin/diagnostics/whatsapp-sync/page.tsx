import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { createDefaultOpenWaSyncProvider } from "@/lib/whatsapp-sync/providers/openwa-sync-provider-default";
import { canExecuteSyncDiagnostics, getLipsWhatsappSyncDiagnostics, requireWhatsappSyncDiagnosticsOperator } from "@/lib/whatsapp-sync/diagnostics";
import { WhatsappSyncDiagnosticsClient } from "./whatsapp-sync-diagnostics-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Homologação WhatsApp Sync — Admin" };

export default async function WhatsappSyncDiagnosticsPage() {
  const db = createSupabaseWriteClient();
  const operator = await requireWhatsappSyncDiagnosticsOperator(db);
  const snapshot = await getLipsWhatsappSyncDiagnostics(db, createDefaultOpenWaSyncProvider);
  const canExecute = canExecuteSyncDiagnostics({ vercelEnv: process.env.VERCEL_ENV, metadata: operator.metadata });

  return <WhatsappSyncDiagnosticsClient initialSnapshot={snapshot} canExecute={canExecute} vercelEnv={process.env.VERCEL_ENV || "development"} />;
}
