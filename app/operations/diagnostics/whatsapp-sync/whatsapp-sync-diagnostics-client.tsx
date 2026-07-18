"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Download, RefreshCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  runWhatsappSyncDiagnosticsAction,
  type WhatsappSyncDiagnosticsActionState,
} from "./actions";

type Snapshot = NonNullable<
  WhatsappSyncDiagnosticsActionState["result"]
>["snapshot"];

const INTEGRITY_COUNT_FIELDS = [
  "syncState",
  "syncRuns",
  "pendingRuns",
  "failedRuns",
  "conversations",
  "messages",
  "queueStatusNull",
  "locks",
] as const;

function integrityFileName(capturedAt?: string | null) {
  const date = capturedAt ? new Date(capturedAt) : new Date();
  const stamp = Number.isNaN(date.getTime())
    ? "unknown"
    : date
        .toISOString()
        .slice(0, 16)
        .replaceAll("-", "")
        .replaceAll(":", "")
        .replace("T", "");
  return `lips-go-live-integrity-${stamp}.json`;
}

function compareLocalIntegritySnapshots(baseline: any, current: any) {
  const deltas = Object.fromEntries(
    INTEGRITY_COUNT_FIELDS.map((field) => [
      field,
      Number(current?.integrity?.[field] || 0) -
        Number(baseline?.integrity?.[field] || 0),
    ]),
  );
  const blocked =
    Number(deltas.conversations || 0) < 0 ||
    Number(deltas.messages || 0) < 0 ||
    Number(deltas.syncRuns || 0) < 0 ||
    Number(current?.integrity?.locks || 0) > 0;
  const warning =
    Number(current?.integrity?.pendingRuns || 0) > 0 ||
    Number(deltas.failedRuns || 0) > 0 ||
    Number(deltas.queueStatusNull || 0) > 0;

  return {
    baselineCapturedAt: baseline?.capturedAt || null,
    currentCapturedAt: current?.capturedAt || null,
    deltas,
    decision: {
      level: blocked ? "blocked" : warning ? "review" : "approved",
      summary: blocked
        ? "Comparação local bloqueada: houve perda de contagem ou lock ativo."
        : warning
          ? "Comparação local exige revisão manual."
          : "Comparação local aprovada.",
    },
  };
}

function downloadIntegritySnapshot(snapshot: any, comparison: any) {
  const payload = {
    snapshot,
    localComparison: comparison || null,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = integrityFileName(snapshot?.capturedAt);
  anchor.click();
  URL.revokeObjectURL(url);
}

function SubmitButton({
  children,
  confirmText,
  disabled,
  pendingLabel = "Executando...",
}: {
  children: React.ReactNode;
  confirmText?: string;
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const status = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={disabled || status.pending}
      onClick={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
      }}
      className="w-full rounded-full bg-[#1B2F5B] px-5 font-black text-white hover:bg-[#16284d] disabled:opacity-50 md:w-auto"
    >
      {status.pending ? pendingLabel : children}
    </Button>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-lg font-black text-[#1B2F5B]">
        {value || "—"}
      </p>
    </div>
  );
}

function SnapshotCards({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle className="text-lg font-black text-[#1B2F5B]">
            Status da sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Stat label="Empresa" value="Auto Peças e Auto Center Lips" />
          <Stat label="Canal" value={snapshot.channel.sessionId} />
          <Stat label="Provider" value="OpenWA" />
          <Stat label="Ambiente" value="Preview" />
          <Stat label="Modo" value="Homologação interna" />
          <Stat
            label="Conectado"
            value={snapshot.connection.connected ? "sim" : "não"}
          />
        </CardContent>
      </Card>
      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle className="text-lg font-black text-[#1B2F5B]">
            Estado da sincronização
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Stat label="Sync" value={snapshot.state?.syncStatus || "idle"} />
          <Stat
            label="Status provider"
            value={snapshot.connection.providerStatus || "não consultado"}
          />
          <Stat
            label="Último sucesso"
            value={snapshot.state?.lastSuccessAt || "nunca"}
          />
          <Stat
            label="Último erro seguro"
            value={snapshot.state?.lastError || "—"}
          />
          <Stat label="Último modo" value={snapshot.state?.lastMode || "—"} />
          <Stat
            label="Próxima reconciliação"
            value={snapshot.state?.nextReconciliationAt || "—"}
          />
        </CardContent>
      </Card>
      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle className="text-lg font-black text-[#1B2F5B]">
            Checkpoint
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Stat label="Chat" value={snapshot.state?.checkpoint.chat || "—"} />
          <Stat
            label="Mensagem"
            value={snapshot.state?.checkpoint.message || "—"}
          />
          <Stat label="Lock" value={snapshot.state?.lock ? "ativo" : "livre"} />
          <Stat
            label="Expiração"
            value={snapshot.state?.lock?.expiresAt || "—"}
          />
        </CardContent>
      </Card>
      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle className="text-lg font-black text-[#1B2F5B]">
            Última execução
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Stat
            label="Run"
            value={snapshot.lastRun?.id || snapshot.state?.lastRunId || "—"}
          />
          <Stat label="Status" value={snapshot.lastRun?.status || "—"} />
          <Stat
            label="Chats"
            value={
              snapshot.lastRun
                ? `${snapshot.lastRun.chatsSynced}/${snapshot.lastRun.chatsScanned}`
                : "—"
            }
          />
          <Stat
            label="Grupos ignorados"
            value={snapshot.lastRun?.chatsSkipped ?? "—"}
          />
          <Stat
            label="Mensagens examinadas"
            value={snapshot.lastRun?.messagesScanned ?? "—"}
          />
          <Stat label="Erros" value={snapshot.lastRun?.errorsCount ?? "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function GatewayStatusCard({ status }: { status: any }) {
  if (!status) return null;
  const stateLabel =
    status.code === "ok"
      ? "conectado"
      : status.code === "gateway_token_missing"
        ? "credencial ausente"
        : status.code === "session_not_found"
          ? "sessão não encontrada"
          : status.code === "gateway_unauthorized"
            ? "não autorizado"
            : "gateway indisponível";
  return (
    <Card className="rounded-[2rem] border-[#2ABFAB]/30 bg-[#2ABFAB]/5">
      <CardHeader>
        <CardTitle className="text-lg font-black text-[#1B2F5B]">
          Status live do gateway
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Estado" value={stateLabel} />
        <Stat
          label="Gateway"
          value={`${status.gateway?.name || "Gateway"} · ${status.gateway?.status || "unknown"}`}
        />
        <Stat
          label="Health"
          value={
            status.health?.httpStatus
              ? `HTTP ${status.health.httpStatus} · ${status.health.latencyMs}ms`
              : "não consultado"
          }
        />
        <Stat
          label="Readiness"
          value={
            status.readiness?.httpStatus
              ? `HTTP ${status.readiness.httpStatus} · ${status.readiness.latencyMs}ms`
              : "não consultado"
          }
        />
        <Stat label="Versão" value={status.version || "não disponível"} />
        <Stat label="Sessões" value={status.sessions?.total ?? 0} />
        <Stat
          label="lips-main"
          value={
            status.sessions?.lipsMainFound
              ? status.sessions.lipsMainStatus || "encontrada"
              : "não encontrada"
          }
        />
        <Stat label="Telefone" value={status.sessions?.phoneMasked || "—"} />
        <Stat label="Consultado em" value={status.checkedAt || "—"} />
        <Stat label="Erro seguro" value={status.error || "—"} />
      </CardContent>
    </Card>
  );
}

function ProbeChatsCard({ result }: { result: any }) {
  if (result?.action !== "probe_chats") return null;
  return (
    <Card className="rounded-[2rem] border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-lg font-black text-[#1B2F5B]">
          Teste read-only de chats
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Resultado"
          value={result.ok ? "sucesso" : result.code || "falha"}
        />
        <Stat label="Duração" value={`${result.durationMs ?? 0}ms`} />
        <Stat label="Limite solicitado" value={result.requestedLimit ?? 5} />
        <Stat label="Limite máximo probe" value={result.maxLimit ?? 10} />
        <Stat label="Quantidade retornada" value={result.returned ?? 0} />
        <Stat
          label="Paginação/limite"
          value={
            result.paginationIgnored
              ? "ignorada"
              : result.paginationAvailable
                ? "aparentemente aplicado"
                : "não confirmado"
          }
        />
        <Stat label="Timeout" value={`${result.timeoutMs ?? 0}ms`} />
        <Stat label="Consultado em" value={result.checkedAt || "—"} />
        <Stat label="Erro seguro" value={result.error || "—"} />
      </CardContent>
    </Card>
  );
}

function PaginationValidationCard({ result }: { result: any }) {
  if (result?.action !== "validate_chat_pagination") return null;
  const page1 = result.pages?.page1;
  const page2 = result.pages?.page2;
  const comparison = result.comparison || {};
  const stateLabel =
    result.status || (result.ok ? "aprovado" : "paginação não comprovada");
  return (
    <Card className="rounded-[2rem] border-[#2ABFAB]/30 bg-[#2ABFAB]/5">
      <CardHeader>
        <CardTitle className="text-lg font-black text-[#1B2F5B]">
          Validação de paginação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Estado" value={stateLabel} />
          <Stat
            label="Limite respeitado"
            value={comparison.limit_respected ? "sim" : "não"}
          />
          <Stat
            label="Páginas distintas"
            value={comparison.distinct_pages ? "sim" : "não comprovado"}
          />
          <Stat label="Itens repetidos" value={comparison.overlap_count ?? 0} />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="font-black text-[#1B2F5B]">Página 1</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="Offset" value={page1?.offset ?? 0} />
              <Stat label="Quantidade" value={page1?.count ?? 0} />
              <Stat label="Duração" value={`${page1?.duration_ms ?? 0}ms`} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="font-black text-[#1B2F5B]">Página 2</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="Offset" value={page2?.offset ?? 5} />
              <Stat label="Quantidade" value={page2?.count ?? 0} />
              <Stat label="Duração" value={`${page2?.duration_ms ?? 0}ms`} />
            </div>
          </div>
        </div>
        {!comparison.enough_volume ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Volume insuficiente para provar uma segunda página completa de 5
            chats. Isto não é falha automática se o gateway retornou menos de 10
            chats distintos.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LipsIntegrityCard({
  snapshot,
  baseline,
  comparison,
  onResetBaseline,
}: {
  snapshot: any;
  baseline: any;
  comparison: any;
  onResetBaseline: () => void;
}) {
  if (snapshot?.action !== "capture_lips_integrity_snapshot") return null;
  const decision = comparison?.decision || snapshot.decision;
  const decisionClass =
    decision?.level === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : decision?.level === "blocked"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <Card className="rounded-[2rem] border-[#1B2F5B]/20 bg-white">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-lg font-black text-[#1B2F5B]">
              Integridade do Go-Live da Lips
            </CardTitle>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Snapshot read-only com escopo fixo Production: Lips, lips-main,
              OpenWA.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => downloadIntegritySnapshot(snapshot, comparison)}
              className="rounded-full bg-[#2ABFAB] font-black text-white hover:bg-[#239f91]"
            >
              <Download className="mr-2 h-4 w-4" /> Baixar JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onResetBaseline}
              className="rounded-full font-black"
            >
              Resetar baseline local
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={`rounded-2xl border p-4 text-sm font-black ${decisionClass}`}>
          {decision?.summary || "Snapshot capturado."}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Capturado em" value={snapshot.capturedAt || "—"} />
          <Stat label="Baseline local" value={baseline?.capturedAt || "primeira captura"} />
          <Stat label="Sessão" value={snapshot.scope?.sessionId || "lips-main"} />
          <Stat label="Gateway" value={snapshot.gatewayStatus?.code || "—"} />
          <Stat label="Sync state" value={snapshot.integrity?.syncState ?? 0} />
          <Stat label="Runs" value={snapshot.integrity?.syncRuns ?? 0} />
          <Stat label="Conversas" value={snapshot.integrity?.conversations ?? 0} />
          <Stat label="Mensagens" value={snapshot.integrity?.messages ?? 0} />
          <Stat label="Fila null" value={snapshot.integrity?.queueStatusNull ?? 0} />
          <Stat label="Locks" value={snapshot.integrity?.locks ?? 0} />
          <Stat label="Runs pendentes" value={snapshot.integrity?.pendingRuns ?? 0} />
          <Stat label="Runs failed" value={snapshot.integrity?.failedRuns ?? 0} />
        </div>
        {comparison?.deltas ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="font-black text-[#1B2F5B]">Delta contra baseline local</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {INTEGRITY_COUNT_FIELDS.map((field) => (
                <Stat key={field} label={field} value={comparison.deltas[field] ?? 0} />
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {(snapshot.decision?.checks || []).map((check: any) => (
            <div
              key={check.code}
              className="rounded-2xl border border-slate-100 bg-white p-4 text-sm"
            >
              <p className="font-black text-[#1B2F5B]">
                {check.code}: {check.status}
              </p>
              <p className="mt-1 text-slate-600">{check.message}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          Read-only preservado: {snapshot.readOnly?.preserved ? "sim" : "não"}.
          Mensagens enviadas: não. Secrets retornados: não.
        </div>
      </CardContent>
    </Card>
  );
}

export function WhatsappSyncDiagnosticsClient({
  initialSnapshot,
  canExecute,
  vercelEnv,
}: {
  initialSnapshot: Snapshot;
  canExecute: boolean;
  vercelEnv: string;
}) {
  const [state, formAction] = useActionState(runWhatsappSyncDiagnosticsAction, {
    ok: true,
  } as WhatsappSyncDiagnosticsActionState);
  const result = state.result;
  const snapshot = result?.snapshot || initialSnapshot;
  const integritySnapshot =
    result?.action === "capture_lips_integrity_snapshot" ? result : null;
  const [integrityBaseline, setIntegrityBaseline] = useState<any>(null);

  useEffect(() => {
    if (
      integritySnapshot &&
      (integritySnapshot.captureRole === "baseline" || !integrityBaseline)
    )
      setIntegrityBaseline(integritySnapshot);
  }, [integritySnapshot, integrityBaseline]);

  const integrityComparison = integritySnapshot
    ? compareLocalIntegritySnapshots(
        integrityBaseline || integritySnapshot,
        integritySnapshot,
      )
    : null;

  return (
    <div className="space-y-8">
      <header className="rounded-[2rem] bg-[#1B2F5B] p-7 text-white shadow-sm md:p-9">
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-white/70">
          <Link href="/operations" className="hover:text-white">
            Centro de Comando
          </Link>
          <span>→</span>
          <span>Diagnósticos</span>
          <span>→</span>
          <span className="text-white">Sincronização WhatsApp</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge className="border-white/20 bg-white/10 text-white">
            Uso interno
          </Badge>
          <Badge className="border-white/20 bg-white/10 text-white">
            Ambiente: {vercelEnv === "preview" ? "Preview" : vercelEnv}
          </Badge>
          <Badge className="border-white/20 bg-white/10 text-white">
            Modo: Homologação interna
          </Badge>
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
          Sincronização WhatsApp
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200 md:text-base">
          Diagnóstico interno dos canais e da sincronização automática.
        </p>
        <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-black text-white">
          Esta ferramenta não envia mensagens para clientes.
        </div>
      </header>

      {!canExecute ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          Execução bloqueada neste ambiente. Em Production, ações exigem flag
          interna explícita.
        </div>
      ) : null}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
        Consultas de status são somente leitura. Execução de sincronização está
        desabilitada quando a flag interna não está ativa.
      </div>
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {state.error}
        </div>
      ) : null}
      {result ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          Ação: {result.action}. Fila preservada:{" "}
          {result.queuePreserved ? "sim" : "não"}. Mensagem enviada: não. Secret
          retornado: não.
        </div>
      ) : null}

      <SnapshotCards snapshot={snapshot} />
      <GatewayStatusCard status={result?.gatewayStatus} />
      <ProbeChatsCard result={result} />
      <PaginationValidationCard result={result} />
      <LipsIntegrityCard
        snapshot={integritySnapshot}
        baseline={integrityBaseline}
        comparison={integrityComparison}
        onResetBaseline={() => setIntegrityBaseline(integritySnapshot)}
      />

      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black text-[#1B2F5B]">
            <RefreshCcw className="h-5 w-5" /> Ações de homologação
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <form action={formAction}>
            <input type="hidden" name="action" value="status" />
            <SubmitButton pendingLabel="Consultando...">
              Verificar status
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input type="hidden" name="action" value="probe_chats" />
            <SubmitButton pendingLabel="Testando...">
              Testar leitura de chats
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input
              type="hidden"
              name="action"
              value="validate_chat_pagination"
            />
            <SubmitButton pendingLabel="Validando...">
              Validar paginação
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input
              type="hidden"
              name="action"
              value="capture_lips_integrity_snapshot"
            />
            <input type="hidden" name="captureRole" value="baseline" />
            <SubmitButton pendingLabel="Capturando...">
              Capturar baseline
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input
              type="hidden"
              name="action"
              value="capture_lips_integrity_snapshot"
            />
            <input type="hidden" name="captureRole" value="current" />
            <SubmitButton pendingLabel="Capturando...">
              Capturar estado atual
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input type="hidden" name="action" value="diagnostic" />
            <SubmitButton
              disabled={!canExecute}
              confirmText="Executar diagnóstico? Será processado no máximo um run, sem envio de mensagens."
            >
              Executar diagnóstico
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input type="hidden" name="action" value="bootstrap" />
            <SubmitButton
              disabled={!canExecute}
              confirmText="Executar bootstrap controlado? Serão consultados chats e mensagens recentes da Lips. Nenhuma mensagem será enviada."
            >
              Bootstrap controlado
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input type="hidden" name="action" value="incremental" />
            <SubmitButton
              disabled={!canExecute}
              confirmText="Executar incremental usando checkpoints existentes? Nenhuma mensagem será enviada."
            >
              Incremental
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input type="hidden" name="action" value="reconciliation" />
            <SubmitButton
              disabled={!canExecute}
              confirmText="Executar reconciliação? Nenhuma mensagem será enviada."
            >
              Reconciliation
            </SubmitButton>
          </form>
          <form action={formAction}>
            <input type="hidden" name="action" value="process_next" />
            <SubmitButton
              disabled={!canExecute}
              confirmText="Processar próximo job de lips-main? Não executa em paralelo."
            >
              Processar próximo job
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      {result?.runs?.length ? (
        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1B2F5B]">
              Contadores
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {result.runs.map((run: any) => (
              <div
                key={`${run.id}-${run.status}`}
                className="rounded-2xl border border-slate-100 bg-white p-4"
              >
                <p className="font-black text-[#1B2F5B]">Run {run.id}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Status: {run.status}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Chats: {run.chatsSynced}/{run.chatsScanned} · grupos ignorados{" "}
                  {run.chatsSkipped}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Mensagens: {run.messagesScanned} examinadas ·{" "}
                  {run.messagesSaved} salvas · {run.messagesUpdated} atualizadas
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Erros: {run.errorsCount}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-[2rem]">
          <CardContent className="flex gap-3 p-5 text-sm text-slate-600">
            <ShieldCheck className="mt-1 h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-black text-slate-900">Segurança</p>
              <p>
                Somente tenant plataforma, owner/admin, membership global e
                command_center. Cliente Lips e usuários com organização não
                executam.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem]">
          <CardContent className="flex gap-3 p-5 text-sm text-slate-600">
            <RefreshCcw className="mt-1 h-5 w-5 text-[#1B2F5B]" />
            <div>
              <p className="font-black text-slate-900">Idempotência</p>
              <p>
                Duplicações são medidas por contadores de salvas/atualizadas e
                IDs técnicos mascarados. Conteúdo das mensagens não é exibido.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem]">
          <CardContent className="flex gap-3 p-5 text-sm text-slate-600">
            <ShieldCheck className="mt-1 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-black text-slate-900">Fila preservada</p>
              <p>
                Campos críticos da fila são comparados antes/depois. Se houver
                alteração indevida, a execução retorna falha.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />
        Escopo fixo nesta fase: Empresa Auto Peças e Auto Center Lips, Canal
        lips-main, Provider OpenWA, Ambiente Preview, Modo Homologação interna.
      </div>
    </div>
  );
}
