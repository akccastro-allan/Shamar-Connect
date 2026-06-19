"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, MessageCircle, RefreshCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DiagnosticsData = {
  ok: boolean;
  checkedAt: string;
  gateway: {
    status: Record<string, unknown> | null;
    error: string | null;
    online: boolean;
  };
  conversations: { total: number; requiresHuman: number; slaBreached: number };
  messages: { total: number };
  recentWatchdogEvents: Array<{ id: string; event_type: string; description: string; created_at: string }>;
  recentAutomationEvents: Array<{ id: string; event_type: string; description: string; created_at: string; conversation_id: string }>;
  recentAutoMessages: Array<{ id: string; body: string | null; created_at: string; to_id: string | null }>;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

export function WhatsappDiagnosticsPanel() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchdogRunning, setWatchdogRunning] = useState(false);
  const [automationRunning, setAutomationRunning] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDiagnostics() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp-web/diagnostics", { cache: "no-store" });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar diagnóstico");
    } finally {
      setLoading(false);
    }
  }

  async function runWatchdog() {
    setWatchdogRunning(true);
    setActionResult(null);
    try {
      const response = await fetch("/api/whatsapp-web/watchdog?staleMinutes=5", { cache: "no-store" });
      const result = await response.json();
      setActionResult(`Watchdog: ${result.scannedConversations} conversas verificadas, ${result.requiresHuman} precisam humano, ${result.breached} com SLA estourado.`);
      await loadDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao rodar watchdog");
    } finally {
      setWatchdogRunning(false);
    }
  }

  async function runAutomationDryRun() {
    setAutomationRunning(true);
    setActionResult(null);
    try {
      const response = await fetch("/api/whatsapp-web/automation/process?dryRun=1&limit=20", { cache: "no-store" });
      const result = await response.json();
      setActionResult(`Automação (dryRun): ${result.processed} processadas, ${result.skipped} puladas, ${result.failed ?? 0} erros. Nenhuma mensagem foi enviada.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao rodar automação");
    } finally {
      setAutomationRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button onClick={loadDiagnostics} disabled={loading} className="bg-emerald-700 hover:bg-emerald-800">
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Carregando..." : "Carregar diagnóstico"}
        </Button>
        <Button onClick={runWatchdog} disabled={watchdogRunning} variant="outline">
          <Clock className="mr-2 h-4 w-4" />
          {watchdogRunning ? "Verificando..." : "Rodar watchdog"}
        </Button>
        <Button onClick={runAutomationDryRun} disabled={automationRunning} variant="outline">
          {automationRunning ? "Simulando..." : "Automação dryRun"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/whatsapp-messages"><MessageCircle className="mr-2 h-4 w-4" />Abrir central</Link>
        </Button>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {actionResult ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{actionResult}</div> : null}

      {data && (
        <>
          {/* Gateway */}
          <Card className={data.gateway.online ? "border-emerald-200" : "border-red-200"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Gateway WhatsApp
                <Badge className={data.gateway.online ? "bg-emerald-600" : "bg-red-600"}>
                  {data.gateway.online ? "Online" : "Offline"}
                </Badge>
              </CardTitle>
              <CardDescription>Verificado em {formatDate(data.checkedAt)}</CardDescription>
            </CardHeader>
            {data.gateway.error ? (
              <CardContent><p className="text-sm text-red-700">{data.gateway.error}</p></CardContent>
            ) : (
              <CardContent>
                <pre className="overflow-auto rounded-xl bg-slate-50 p-3 text-xs">{JSON.stringify(data.gateway.status, null, 2)}</pre>
              </CardContent>
            )}
          </Card>

          {/* Counts */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs text-muted-foreground">Conversas</p>
              <p className="text-3xl font-semibold">{data.conversations.total}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs text-muted-foreground">Mensagens</p>
              <p className="text-3xl font-semibold">{data.messages.total}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs text-amber-700">Precisa humano</p>
              <p className="text-3xl font-semibold text-amber-800">{data.conversations.requiresHuman}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs text-red-700">SLA estourado</p>
              <p className="text-3xl font-semibold text-red-800">{data.conversations.slaBreached}</p>
            </div>
          </div>

          {/* Recent automation events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos eventos da automação</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentAutomationEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {data.recentAutomationEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <Badge variant="outline" className="mr-2">{event.event_type}</Badge>
                        <span className="text-muted-foreground">{event.description}</span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent watchdog events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Últimos eventos do watchdog</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentWatchdogEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {data.recentWatchdogEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <Badge variant="outline" className="mr-2">{event.event_type}</Badge>
                        <span className="text-muted-foreground">{event.description}</span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent auto messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas mensagens automáticas enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentAutoMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma mensagem automática recente.</p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {data.recentAutoMessages.map((msg) => (
                    <div key={msg.id} className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{msg.to_id}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-slate-700">{msg.body || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!data && !loading && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Clique em "Carregar diagnóstico" para ver o estado atual do gateway e das conversas.
        </div>
      )}
    </div>
  );
}
