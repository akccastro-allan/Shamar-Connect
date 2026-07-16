"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, RefreshCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runWhatsappSyncDiagnosticsAction, type WhatsappSyncDiagnosticsActionState } from "./actions";

type Snapshot = NonNullable<WhatsappSyncDiagnosticsActionState["result"]>["snapshot"];

function SubmitButton({ children, confirmText, disabled }: { children: React.ReactNode; confirmText?: string; disabled?: boolean }) {
  const status = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={disabled || status.pending}
      onClick={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
      }}
      className="rounded-full bg-[#1B2F5B] px-5 font-black text-white hover:bg-[#16284d] disabled:opacity-50"
    >
      {status.pending ? "Executando..." : children}
    </Button>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-[#1B2F5B]">{value || "—"}</p></div>;
}

function SnapshotCards({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-[2rem]">
        <CardHeader><CardTitle className="text-lg font-black text-[#1B2F5B]">Conexão OpenWA</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Stat label="Sessão" value={snapshot.channel.sessionId} />
          <Stat label="Provider" value={snapshot.channel.provider} />
          <Stat label="Status provider" value={snapshot.connection.providerStatus || "não consultado"} />
          <Stat label="Conectado" value={snapshot.connection.connected ? "sim" : "não"} />
        </CardContent>
      </Card>
      <Card className="rounded-[2rem]">
        <CardHeader><CardTitle className="text-lg font-black text-[#1B2F5B]">Estado da sincronização</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Stat label="Sync" value={snapshot.state?.syncStatus || "idle"} />
          <Stat label="Último sucesso" value={snapshot.state?.lastSuccessAt || "nunca"} />
          <Stat label="Último modo" value={snapshot.state?.lastMode || "—"} />
          <Stat label="Próxima reconciliação" value={snapshot.state?.nextReconciliationAt || "—"} />
          <Stat label="Checkpoint chat" value={snapshot.state?.checkpoint.chat || "—"} />
          <Stat label="Checkpoint mensagem" value={snapshot.state?.checkpoint.message || "—"} />
        </CardContent>
      </Card>
      <Card className="rounded-[2rem] lg:col-span-2">
        <CardHeader><CardTitle className="text-lg font-black text-[#1B2F5B]">Última execução</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
          <Stat label="Run" value={snapshot.lastRun?.id || snapshot.state?.lastRunId || "—"} />
          <Stat label="Status" value={snapshot.lastRun?.status || "—"} />
          <Stat label="Chats" value={snapshot.lastRun ? `${snapshot.lastRun.chatsSynced}/${snapshot.lastRun.chatsScanned}` : "—"} />
          <Stat label="Ignorados" value={snapshot.lastRun?.chatsSkipped ?? "—"} />
          <Stat label="Mensagens" value={snapshot.lastRun?.messagesScanned ?? "—"} />
          <Stat label="Salvas" value={snapshot.lastRun?.messagesSaved ?? "—"} />
          <Stat label="Atualizadas" value={snapshot.lastRun?.messagesUpdated ?? "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

export function WhatsappSyncDiagnosticsClient({ initialSnapshot, canExecute, vercelEnv }: { initialSnapshot: Snapshot; canExecute: boolean; vercelEnv: string }) {
  const [state, formAction] = useActionState(runWhatsappSyncDiagnosticsAction, { ok: true } as WhatsappSyncDiagnosticsActionState);
  const result = state.result;
  const snapshot = result?.snapshot || initialSnapshot;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-slate-950 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] bg-[#1B2F5B] p-7 text-white shadow-sm md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/20 bg-white/10 text-white">Uso interno</Badge>
            <Badge className="border-white/20 bg-white/10 text-white">Preview: {vercelEnv === "preview" ? "ações habilitadas" : vercelEnv}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Homologação WhatsApp Sync</h1>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200 md:text-base">Diagnóstico, bootstrap controlado e incremental da sessão <strong>lips-main</strong>. Esta ferramenta não envia mensagens ao cliente e não exibe secrets, QR, cookies, tokens, conteúdo de mensagens ou telefones completos.</p>
        </header>

        {!canExecute ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Execução bloqueada neste ambiente. Em Production, ações exigem flag interna explícita.</div> : null}
        {state.error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{state.error}</div> : null}
        {result ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Ação: {result.action}. Fila preservada: {result.queuePreserved ? "sim" : "não"}. Mensagem enviada: não. Secret retornado: não.</div> : null}

        <SnapshotCards snapshot={snapshot} />

        <Card className="rounded-[2rem]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg font-black text-[#1B2F5B]"><RefreshCcw className="h-5 w-5" /> Ações de homologação</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <form action={formAction}><input type="hidden" name="action" value="diagnostic" /><SubmitButton disabled={!canExecute} confirmText="Executar diagnóstico? Será processado no máximo um run, sem envio de mensagens.">Executar diagnóstico</SubmitButton></form>
            <form action={formAction}><input type="hidden" name="action" value="bootstrap" /><SubmitButton disabled={!canExecute} confirmText="Executar bootstrap controlado? Serão consultados chats e mensagens recentes da Lips. Nenhuma mensagem será enviada.">Bootstrap controlado</SubmitButton></form>
            <form action={formAction}><input type="hidden" name="action" value="incremental" /><SubmitButton disabled={!canExecute} confirmText="Executar incremental usando checkpoints existentes? Nenhuma mensagem será enviada.">Incremental</SubmitButton></form>
            <form action={formAction}><input type="hidden" name="action" value="process_next" /><SubmitButton disabled={!canExecute} confirmText="Processar próximo job de lips-main? Não executa em paralelo.">Processar próximo job</SubmitButton></form>
          </CardContent>
        </Card>

        {result?.runs?.length ? (
          <Card className="rounded-[2rem]">
            <CardHeader><CardTitle className="text-lg font-black text-[#1B2F5B]">Contadores seguros</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.runs.map((run: any) => (
                <div key={`${run.id}-${run.status}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="font-black text-[#1B2F5B]">Run {run.id}</p>
                  <p className="mt-1 text-sm text-slate-600">Status: {run.status}</p>
                  <p className="mt-1 text-sm text-slate-600">Chats: {run.chatsSynced}/{run.chatsScanned} · grupos ignorados {run.chatsSkipped}</p>
                  <p className="mt-1 text-sm text-slate-600">Mensagens: {run.messagesScanned} examinadas · {run.messagesSaved} salvas · {run.messagesUpdated} atualizadas</p>
                  <p className="mt-1 text-sm text-slate-600">Erros: {run.errorsCount}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-[2rem]"><CardContent className="flex gap-3 p-5 text-sm text-slate-600"><ShieldCheck className="mt-1 h-5 w-5 text-emerald-600" /><div><p className="font-black text-slate-900">Segurança</p><p>Somente tenant plataforma, owner/admin, membership global e command_center. Cliente Lips e usuários com organização não executam.</p></div></CardContent></Card>
          <Card className="rounded-[2rem]"><CardContent className="flex gap-3 p-5 text-sm text-slate-600"><RefreshCcw className="mt-1 h-5 w-5 text-[#1B2F5B]" /><div><p className="font-black text-slate-900">Idempotência</p><p>Duplicações são medidas por contadores de salvas/atualizadas e IDs técnicos mascarados. Conteúdo das mensagens não é exibido.</p></div></CardContent></Card>
          <Card className="rounded-[2rem]"><CardContent className="flex gap-3 p-5 text-sm text-slate-600"><ShieldCheck className="mt-1 h-5 w-5 text-amber-600" /><div><p className="font-black text-slate-900">Fila preservada</p><p>Campos críticos da fila são comparados antes/depois. Se houver alteração indevida, a execução retorna falha.</p></div></CardContent></Card>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />Escopo fixo: Lips, session_id lips-main, provider OpenWA. O browser não envia tenant, organização, token, URL de gateway nem sessão arbitrária.</div>
      </div>
    </div>
  );
}
