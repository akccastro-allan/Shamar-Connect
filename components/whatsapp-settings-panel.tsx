"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, RefreshCcw, Smartphone, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProviderStatus } from "@/types/messaging-provider";

type SessionId = string;

function statusVariant(status?: string) {
  if (status === "ready" || status === "authenticated") return "success";
  if (status === "qr" || status === "connecting") return "warning";
  if (status === "error" || status === "disconnected") return "destructive";
  return "secondary";
}

function statusMessage(status?: string) {
  if (status === "ready") return "WhatsApp conectado e pronto para uso.";
  if (status === "authenticated") return "WhatsApp autenticado. Aguarde alguns segundos até ficar pronto.";
  if (status === "qr") return "QR Code disponível. Escaneie no celular.";
  if (status === "connecting") return "Conexão em andamento.";
  if (status === "disconnected") return "WhatsApp desconectado.";
  if (status === "error") return "Erro no gateway. Verifique os logs do Railway.";
  return "Gateway aguardando conexão.";
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Request failed");
  return data;
}

type SessionOption = { id: string; label: string };

export function WhatsappSettingsPanel({ allowedSessions }: { allowedSessions: SessionOption[] }) {
  const [session, setSession] = useState<SessionId>(allowedSessions[0]?.id ?? "hall-main");
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const data = await readJson<ProviderStatus>(`/api/whatsapp-web/status?sessionId=${encodeURIComponent(session)}`);
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar status");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  async function startConnection() {
    setLoading(true);
    setError(null);
    try {
      await readJson<ProviderStatus>("/api/whatsapp-web/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session }),
      });
      const qr = await readJson<ProviderStatus>(`/api/whatsapp-web/pairing-code?sessionId=${encodeURIComponent(session)}`);
      setStatus(qr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar conexão");
    } finally {
      setLoading(false);
    }
  }

  async function loadPairingCode() {
    const currentStatus = status?.status;
    if (!currentStatus || currentStatus === "idle" || currentStatus === "disconnected" || currentStatus === "error") {
      return startConnection();
    }
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<ProviderStatus>(`/api/whatsapp-web/pairing-code?sessionId=${encodeURIComponent(session)}`);
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar QR Code");
    } finally {
      setLoading(false);
    }
  }

  // Reload when session changes
  useEffect(() => {
    setStatus(null);
    loadStatus();
  }, [session]);

  async function syncConversations() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const data = await readJson<{ syncedChats?: number; savedMessages?: number; ok?: boolean; error?: string }>(
        `/api/whatsapp-web/sync-chat-messages?sessionId=${encodeURIComponent(session)}&chatLimit=30&limit=50`,
      );
      if (!data.ok) throw new Error(data.error || "Falha no sync");
      setSyncResult(`Sync concluído: ${data.syncedChats ?? 0} conversas, ${data.savedMessages ?? 0} mensagens importadas.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  // Auto-refresh every 5s
  useEffect(() => {
    const interval = window.setInterval(() => loadStatus({ silent: true }), 5000);
    return () => window.clearInterval(interval);
  }, [session]);

  const sessionInfo = allowedSessions.find((s) => s.id === session) ?? allowedSessions[0]!;
  const isConnected = status?.status === "ready" || status?.status === "authenticated";

  return (
    <div className="space-y-6">
      {/* Quick-start instructions */}
      <Card className="border-[#2ABFAB]/30 bg-[#2ABFAB]/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1B2F5B]">Como conectar o WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-slate-700">
            {[
              { step: "1", text: "Clique em Conectar abaixo (ou Mostrar QR Code)." },
              { step: "2", text: "Abra o WhatsApp no celular → toque em Dispositivos conectados → Conectar dispositivo." },
              { step: "3", text: "Escaneie o QR Code que aparecerá na tela." },
              { step: "4", text: "Aguarde o status mudar para Conectado." },
              { step: "5", text: "Clique em Sincronizar conversas para importar o histórico." },
            ].map(({ step, text }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2ABFAB] text-xs font-black text-white">
                  {step}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Session selector */}
      {allowedSessions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selecionar unidade</CardTitle>
            <CardDescription>Cada unidade tem sua própria sessão WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allowedSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSession(s.id)}
                  className={`rounded-2xl border px-5 py-3 text-left transition ${session === s.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  <p className="text-sm font-bold">{s.label}</p>
                  <p className={`text-xs ${session === s.id ? "text-emerald-100" : "text-muted-foreground"}`}>{s.id}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Conexão — {sessionInfo.label}</CardTitle>
                <CardDescription>Sessão: <code className="font-mono text-xs">{session}</code></CardDescription>
              </div>
              <Badge variant={statusVariant(status?.status)}>{status?.status || "carregando"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                Sessão {sessionInfo.label} conectada. Nenhuma ação necessária.
              </div>
            )}

            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                {isConnected ? <Wifi className="h-4 w-4 text-emerald-700" /> : <WifiOff className="h-4 w-4 text-amber-700" />}
                Status atual
              </div>
              <p className="mt-2 text-sm text-slate-700">{statusMessage(status?.status)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Telefone: {status?.phone || "—"}</p>
              <p className="text-sm text-muted-foreground">Última sync: {status?.lastSyncAt || "—"}</p>
            </div>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

            {syncResult && (
              <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {syncResult}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => loadStatus()} disabled={loading} variant="outline" size="sm">
                <RefreshCcw className="mr-2 h-4 w-4" />Atualizar status
              </Button>
              {!isConnected && (
                <Button onClick={startConnection} disabled={loading} size="sm">
                  <Smartphone className="mr-2 h-4 w-4" />Conectar
                </Button>
              )}
              <Button onClick={loadPairingCode} disabled={loading} variant="secondary" size="sm">
                {status?.qrCode ? "Atualizar QR" : "Mostrar QR Code"}
              </Button>
              <Button onClick={syncConversations} disabled={syncing || !isConnected} variant="outline" size="sm">
                <RefreshCcw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar conversas"}
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/whatsapp-diagnostics">Diagnóstico avançado</Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">Status atualiza automaticamente a cada 5 segundos.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code — {sessionInfo.label}</CardTitle>
            <CardDescription>Escaneie pelo WhatsApp em Dispositivos conectados.</CardDescription>
          </CardHeader>
          <CardContent>
            {status?.qrCode && !isConnected ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-6">
                <img src={status.qrCode} alt={`QR Code ${sessionInfo.label}`} className="h-72 w-72 rounded-xl border p-2" />
                <p className="max-w-md text-center text-sm text-muted-foreground">
                  Sessão: <strong>{sessionInfo.label}</strong>. Abra o WhatsApp no celular, toque em Dispositivos conectados e escaneie este código.
                </p>
              </div>
            ) : isConnected ? (
              <div className="rounded-2xl border bg-emerald-50 p-8 text-center text-sm text-emerald-800">
                {sessionInfo.label} conectado. Pode usar a central de atendimento.
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Clique em Conectar ou Mostrar QR Code para iniciar a sessão {sessionInfo.label}.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
