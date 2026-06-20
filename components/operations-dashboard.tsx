"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SessionStatus = {
  sessionId: string;
  label: string;
  online: boolean;
  gatewayStatus: string | null;
  phone: string | null;
  error: string | null;
  conversations: { total: number; requiresHuman: number; slaBreached: number };
  messages: { total: number };
  checkedAt: string | null;
};


function statusColor(status: string | null) {
  if (status === "ready" || status === "authenticated") return "bg-emerald-600";
  if (status === "qr" || status === "connecting") return "bg-amber-500";
  if (status === "disconnected" || status === "error") return "bg-red-600";
  return "bg-slate-400";
}

function statusLabel(status: string | null, online: boolean) {
  if (!online) return "offline";
  return status || "—";
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

type ChannelRow = { id: string; name: string; slug: string; session_id: string; color: string; active: boolean };

export function OperationsDashboard() {
  const [sessions, setSessions] = useState<SessionStatus[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [contactsToday, setContactsToday] = useState<number | null>(null);

  async function fetchSessionStatus(sessionId: string, label: string): Promise<SessionStatus> {
    try {
      const response = await fetch(`/api/whatsapp-web/diagnostics?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      const data = await response.json();
      return {
        sessionId,
        label,
        online: data.gateway?.online ?? false,
        gatewayStatus: (data.gateway?.status as any)?.status ?? null,
        phone: (data.gateway?.status as any)?.phone ?? null,
        error: data.gateway?.error ?? null,
        conversations: data.conversations ?? { total: 0, requiresHuman: 0, slaBreached: 0 },
        messages: data.messages ?? { total: 0 },
        checkedAt: data.checkedAt ?? null,
      };
    } catch (err) {
      return {
        sessionId,
        label,
        online: false,
        gatewayStatus: null,
        phone: null,
        error: err instanceof Error ? err.message : "Erro ao carregar",
        conversations: { total: 0, requiresHuman: 0, slaBreached: 0 },
        messages: { total: 0 },
        checkedAt: null,
      };
    }
  }

  async function fetchContactsToday() {
    try {
      const response = await fetch("/api/crm/contacts?limit=200", { cache: "no-store" });
      const data = await response.json();
      const today = new Date().toISOString().slice(0, 10);
      const count = (data.contacts || []).filter((c: { created_at: string }) => c.created_at?.startsWith(today)).length;
      setContactsToday(count);
    } catch {
      setContactsToday(null);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const channelsRes = await fetch("/api/channels");
      const channelsData = await channelsRes.json();
      const tenantChannels: ChannelRow[] = channelsData.ok ? channelsData.channels : [];
      if (channelsData.ok) setChannels(tenantChannels);

      const statuses = await Promise.all(
        tenantChannels.map((ch) => fetchSessionStatus(ch.session_id, ch.name))
      );
      setSessions(statuses);
      setLastChecked(new Date().toISOString());
      await fetchContactsToday();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const interval = window.setInterval(loadAll, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const totalConversations = sessions.reduce((s, item) => s + item.conversations.total, 0);
  const totalRequiresHuman = sessions.reduce((s, item) => s + item.conversations.requiresHuman, 0);
  const totalSlaBreached = sessions.reduce((s, item) => s + item.conversations.slaBreached, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Última atualização: {formatTime(lastChecked)}</p>
        <Button onClick={loadAll} disabled={loading} variant="outline" size="sm">
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Session cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sessions.map((s) => (
          <Card key={s.sessionId} className={s.online ? "border-emerald-200" : "border-red-200"}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{s.label}</CardTitle>
                <Badge className={statusColor(s.gatewayStatus)}>
                  {statusLabel(s.gatewayStatus, s.online)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {s.sessionId} · {s.phone ? `+${s.phone}` : "sem telefone"} · verificado {formatTime(s.checkedAt)}
              </p>
            </CardHeader>
            <CardContent>
              {s.error && <p className="mb-3 text-xs text-red-700">{s.error}</p>}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border bg-white p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Conversas</p>
                  <p className="text-xl font-semibold">{s.conversations.total}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-center">
                  <p className="text-[10px] text-amber-700">Precisa humano</p>
                  <p className="text-xl font-semibold text-amber-800">{s.conversations.requiresHuman}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-center">
                  <p className="text-[10px] text-red-700">SLA estourado</p>
                  <p className="text-xl font-semibold text-red-800">{s.conversations.slaBreached}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link href={`/whatsapp-diagnostics?session=${s.sessionId}`}>Ver diagnóstico</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link href="/whatsapp-messages">Central</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total conversas</p>
          <p className="text-3xl font-semibold">{totalConversations}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs text-orange-700">Sem resposta / humano</p>
          <p className="text-3xl font-semibold text-orange-800">{totalRequiresHuman}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">SLA estourado</p>
          <p className="text-3xl font-semibold text-red-800">{totalSlaBreached}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Contatos importados hoje</p>
          <p className="text-3xl font-semibold">{contactsToday ?? "—"}</p>
        </div>
      </div>

      {/* All channels */}
      {channels.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Canais cadastrados</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((ch) => {
              const linked = sessions.find((s) => s.sessionId === ch.session_id);
              return (
                <div
                  key={ch.id}
                  className="rounded-xl border bg-white p-3 flex items-start gap-3"
                  style={{ borderLeftColor: ch.color, borderLeftWidth: 4 }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ch.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{ch.session_id}</p>
                    {linked && (
                      <p className={`text-xs mt-1 font-medium ${linked.online ? "text-emerald-600" : "text-red-500"}`}>
                        {linked.online ? `Conectado · ${linked.phone || "sem número"}` : "Desconectado"}
                      </p>
                    )}
                    {!linked && (
                      <p className="text-xs mt-1 text-zinc-400">Aguardando configuração</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ações rápidas</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/whatsapp-messages">Central de atendimento</Link></Button>
          <Button asChild variant="outline"><Link href="/whatsapp-diagnostics">Diagnóstico</Link></Button>
          <Button asChild variant="outline"><Link href="/settings/whatsapp">Conectar WhatsApp</Link></Button>
          <Button asChild variant="outline"><Link href="/whatsapp-import">Importar histórico</Link></Button>
          <Button asChild variant="outline"><Link href="/contacts">Contatos CRM</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
