"use server";

import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { createDefaultOpenWaSyncProvider } from "@/lib/whatsapp-sync/providers/openwa-sync-provider-default";
import {
  canExecuteSyncDiagnostics,
  getLipsWhatsappReadOnlyStatus,
  isReadOnlySyncDiagnosticsAction,
  requireWhatsappSyncDiagnosticsOperator,
  runLipsWhatsappSyncDiagnostics,
  type SyncDiagnosticsAction,
} from "@/lib/whatsapp-sync/diagnostics";

export type WhatsappSyncDiagnosticsActionState = {
  ok: boolean;
  error?: string;
  result?: any;
};

function safeAction(value: FormDataEntryValue | null): SyncDiagnosticsAction {
  const action = String(value || "status");
  if (["diagnostic", "bootstrap", "incremental", "reconciliation", "process_next"].includes(action)) return action as SyncDiagnosticsAction;
  return "status";
}

export async function runWhatsappSyncDiagnosticsAction(_previous: WhatsappSyncDiagnosticsActionState, formData: FormData): Promise<WhatsappSyncDiagnosticsActionState> {
  const db = createSupabaseWriteClient();
  try {
    const operator = await requireWhatsappSyncDiagnosticsOperator(db);
    const action = safeAction(formData.get("action"));
    if (isReadOnlySyncDiagnosticsAction(action)) {
      return { ok: true, result: await getLipsWhatsappReadOnlyStatus(db) };
    }

    if (!canExecuteSyncDiagnostics({ vercelEnv: process.env.VERCEL_ENV, metadata: operator.metadata })) {
      return { ok: false, error: "Execução bloqueada em Production sem flag interna explícita." };
    }

    const result = await runLipsWhatsappSyncDiagnostics(db, createDefaultOpenWaSyncProvider, { action, actorUserId: operator.appUserId });
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na homologação interna.";
    const safeMessage = message === "UNAUTHORIZED" || message === "FORBIDDEN" ? "Acesso restrito ao Centro de Comando interno." : message;
    return { ok: false, error: safeMessage.replace(/https?:\/\/\S+/g, "[url-redacted]").slice(0, 240) };
  }
}
