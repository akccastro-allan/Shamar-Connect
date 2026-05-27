"use client";

import { useEffect, useState } from "react";
import { RefreshCcw, Smartphone, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProviderStatus } from "@/types/messaging-provider";

function statusVariant(status?: string) {
  if (status === "ready" || status === "authenticated") return "success";
  if (status === "qr" || status === "connecting") return "warning";
  if (status === "error" || status === "disconnected") return "destructive";
  return "secondary";
}

function statusMessage(status?: string) {
  if (status === "ready") return "WhatsApp conectado e pronto para uso.";
  if (status === "authenticated") return "WhatsApp autenticado. Aguarde alguns segundos até ficar pronto.";
  if (status === "qr") return "QR Code disponível. Escaneie no celular ou aguarde a confirmação.";
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

export function WhatsappSettingsPanel() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const data = await readJson<ProviderStatus>("/api/whatsapp-web/status");
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
      await readJson<ProviderStatus>("/api/whatsapp-web/start", { method: "POST" });
      const pairing = await readJson<ProviderStatus>("/api/whatsapp-web/pairing-code");
      setStatus(pairing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar conexão");
    } finally {
      setLoading(false);
    }
  }

  async function loadPairingCode() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<ProviderStatus>("/api/whatsapp-web/pairing-code");
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar QR Code");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    const interval = window.setInterval(() => {
      loadStatus({ silent: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Conexão WhatsApp Web</CardTitle>
              <CardDescription>Gateway experimental via Railway usando whatsapp-web.js.</CardDescription>
            </div>
            <Badge variant={statusVariant(status?.status)}>{status?.status || "carregando"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {status?.status === "ready" || status?.status === "authenticated" ? <Wifi className="h-4 w-4 text-emerald-700" /> : <WifiOff className="h-4 w-4 text-amber-700" />}
              Status atual
            </div>
            <p className="mt-2 text-sm text-slate-700">{statusMessage(status?.status)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Provider: {status?.provider || "whatsapp_web"}</p>
            <p className="text-sm text-muted-foreground">Telefone: {status?.phone || "conectado sem telefone identificado ainda"}</p>
            <p className="text-sm text-muted-foreground">Última sincronização: {status?.lastSyncAt || "—"}</p>
          </div>

          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => loadStatus()} disabled={loading} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar status</Button>
            <Button onClick={startConnection} disabled={loading}><Smartphone className="mr-2 h-4 w-4" />Conectar</Button>
            <Button onClick={loadPairingCode} disabled={loading} variant="secondary">Mostrar QR Code</Button>
          </div>

          <p className="text-xs text-muted-foreground">A tela atualiza automaticamente a cada 5 segundos.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
          <CardDescription>Escaneie pelo WhatsApp em Dispositivos conectados.</CardDescription>
        </CardHeader>
        <CardContent>
          {status?.qrCode && status.status !== "ready" && status.status !== "authenticated" ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-6">
              <img src={status.qrCode} alt="QR Code para conectar WhatsApp Web" className="h-72 w-72 rounded-xl border p-2" />
              <p className="max-w-md text-center text-sm text-muted-foreground">Abra o WhatsApp no celular, toque em Dispositivos conectados e escaneie este código.</p>
            </div>
          ) : status?.status === "ready" || status?.status === "authenticated" ? (
            <div className="rounded-2xl border bg-emerald-50 p-8 text-center text-sm text-emerald-800">
              WhatsApp conectado. Agora podemos avançar para listar chats, grupos e mensagens.
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Clique em Conectar ou Mostrar QR Code para carregar o código.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
