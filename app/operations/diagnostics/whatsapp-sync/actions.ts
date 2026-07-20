"use server";

import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { createDefaultOpenWaSyncProvider } from "@/lib/whatsapp-sync/providers/openwa-sync-provider-default";
import {
  LIPS_ACTIVATION_CONFIRMATION,
  canPreflightActivateLipsOfficialSession,
  evaluateLipsOfficialSession,
  sanitizeAuditMetadata,
} from "@/lib/lips/day-one-readiness";

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

export type LipsOfficialNumberAction =
  | "check_current_session"
  | "check_connected_number"
  | "refresh_status"
  | "verify_6108"
  | "prepare_official_session"
  | "generate_qr"
  | "cancel_attempt"
  | "activate_lips_official_session"
  | "restore_previous_lips_session";

export type LipsOfficialNumberActionState = {
  ok: boolean;
  error?: string;
  result?: Record<string, unknown>;
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

function safeOfficialNumberAction(value: FormDataEntryValue | null): LipsOfficialNumberAction {
  const action = String(value || "check_current_session");
  if (
    [
      "check_current_session",
      "check_connected_number",
      "refresh_status",
      "verify_6108",
      "prepare_official_session",
      "generate_qr",
      "cancel_attempt",
      "activate_lips_official_session",
      "restore_previous_lips_session",
    ].includes(action)
  ) return action as LipsOfficialNumberAction;
  return "check_current_session";
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

export async function runLipsOfficialNumberAction(
  _previous: LipsOfficialNumberActionState,
  formData: FormData,
): Promise<LipsOfficialNumberActionState> {
  const db = createSupabaseWriteClient();
  try {
    await requireWhatsappSyncDiagnosticsOperator(db);
    const action = safeOfficialNumberAction(formData.get("action"));

    if (["check_current_session", "check_connected_number", "refresh_status", "verify_6108"].includes(action)) {
      const status = await getLipsWhatsappReadOnlyStatus(db);
      const sessionStatus = String(status?.providerStatus || "unknown");
      const evaluation = evaluateLipsOfficialSession({ status: sessionStatus, phone: null });
      return {
        ok: true,
        result: sanitizeAuditMetadata({
          action,
          sessionId: "lips-main",
          status: sessionStatus,
          state: evaluation.state,
          officialPhoneMasked: "5521***6108",
          messageSent: false,
          syncExecuted: false,
        }),
      };
    }

    if (action === "activate_lips_official_session") {
      const preflight = canPreflightActivateLipsOfficialSession({
        confirmation: String(formData.get("confirmation") || ""),
        sessionStatus: String(formData.get("sessionStatus") || ""),
        phone: String(formData.get("phone") || ""),
        tenantId: String(formData.get("tenantId") || ""),
        organizationId: String(formData.get("organizationId") || ""),
        channelId: String(formData.get("channelId") || ""),
        noActiveRuns: formData.get("noActiveRuns") === "true",
        noLocks: formData.get("noLocks") === "true",
        featureExecute: formData.get("featureExecute") === "true",
      });
      if (!preflight.ok) return { ok: false, error: `Ativação bloqueada: ${preflight.blockers.join(", ")}` };
      return { ok: false, error: `Preflight aprovado, mas cutover transacional exige revisão antes de executar. Confirmação exigida: ${LIPS_ACTIVATION_CONFIRMATION}.` };
    }

    return {
      ok: false,
      error: "Ação futura preparada, mas bloqueada até o aparelho oficial estar presente e a revisão transacional ser aprovada.",
      result: sanitizeAuditMetadata({ action, messageSent: false, syncExecuted: false, qrPersisted: false }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no fluxo do número oficial.";
    return { ok: false, error: message.replace(/https?:\/\/\S+/g, "[url-redacted]").slice(0, 240) };
  }
}
