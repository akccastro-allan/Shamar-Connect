"use server";

import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { createDefaultOpenWaSyncProvider } from "@/lib/whatsapp-sync/providers/openwa-sync-provider-default";
import {
  canExecuteSyncDiagnostics,
  captureLipsGoLiveIntegritySnapshotReadOnly,
  getLipsWhatsappReadOnlyStatus,
  isReadOnlySyncDiagnosticsAction,
  probeLipsWhatsappChatsReadOnly,
  requireWhatsappSyncDiagnosticsOperator,
  runLipsWhatsappSyncDiagnostics,
  validateLipsWhatsappChatPaginationReadOnly,
  type SyncDiagnosticsAction,
} from "@/lib/whatsapp-sync/diagnostics";

export type WhatsappSyncDiagnosticsActionState = {
  ok: boolean;
  error?: string;
  result?: any;
};

function safeAction(value: FormDataEntryValue | null): SyncDiagnosticsAction {
  const action = String(value || "status");
  if (
    [
      "probe_chats",
      "validate_chat_pagination",
      "capture_lips_integrity_snapshot",
      "diagnostic",
      "bootstrap",
      "incremental",
      "reconciliation",
      "process_next",
    ].includes(action)
  )
    return action as SyncDiagnosticsAction;
  return "status";
}

function safeCaptureRole(value: FormDataEntryValue | null) {
  return String(value || "") === "baseline" ? "baseline" : "current";
}

export async function runWhatsappSyncDiagnosticsAction(
  _previous: WhatsappSyncDiagnosticsActionState,
  formData: FormData,
): Promise<WhatsappSyncDiagnosticsActionState> {
  const db = createSupabaseWriteClient();
  try {
    const operator = await requireWhatsappSyncDiagnosticsOperator(db);
    const action = safeAction(formData.get("action"));
    if (isReadOnlySyncDiagnosticsAction(action)) {
      if (action === "probe_chats")
        return {
          ok: true,
          result: await probeLipsWhatsappChatsReadOnly(
            db,
            createDefaultOpenWaSyncProvider,
            { limit: 5 },
          ),
        };
      if (action === "validate_chat_pagination")
        return {
          ok: true,
          result: await validateLipsWhatsappChatPaginationReadOnly(
            db,
            createDefaultOpenWaSyncProvider,
          ),
        };
      if (action === "capture_lips_integrity_snapshot")
        return {
          ok: true,
          result: {
            ...(await captureLipsGoLiveIntegritySnapshotReadOnly(db)),
            captureRole: safeCaptureRole(formData.get("captureRole")),
          },
        };
      return { ok: true, result: await getLipsWhatsappReadOnlyStatus(db) };
    }

    if (
      !canExecuteSyncDiagnostics({
        vercelEnv: process.env.VERCEL_ENV,
        metadata: operator.metadata,
      })
    ) {
      return {
        ok: false,
        error: "Execução bloqueada em Production sem flag interna explícita.",
      };
    }

    const result = await runLipsWhatsappSyncDiagnostics(
      db,
      createDefaultOpenWaSyncProvider,
      { action, actorUserId: operator.appUserId },
    );
    return { ok: true, result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha na homologação interna.";
    const safeMessage =
      message === "UNAUTHORIZED" || message === "FORBIDDEN"
        ? "Acesso restrito ao Centro de Comando interno."
        : message;
    return {
      ok: false,
      error: safeMessage
        .replace(/https?:\/\/\S+/g, "[url-redacted]")
        .slice(0, 240),
    };
  }
}
