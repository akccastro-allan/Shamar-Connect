"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCcw } from "lucide-react";

type Ticket = {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  description: string;
};

const CATEGORIES: Record<string, string> = {
  whatsapp: "WhatsApp", crm: "CRM", campanhas: "Campanhas",
  ia: "IA", financeiro: "Financeiro", acesso: "Acesso", outro: "Outro",
};

const PRIORITIES: Record<string, string> = {
  low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente",
};

const STATUSES: Record<string, string> = {
  open: "Aberto", in_progress: "Em andamento", resolved: "Resolvido", closed: "Fechado",
};

function priorityColor(p: string) {
  if (p === "urgent") return "bg-red-600";
  if (p === "high") return "bg-orange-500";
  if (p === "normal") return "bg-blue-500";
  return "bg-slate-400";
}

function statusColor(s: string) {
  if (s === "open") return "bg-amber-500";
  if (s === "in_progress") return "bg-blue-600";
  if (s === "resolved" || s === "closed") return "bg-emerald-600";
  return "bg-slate-400";
}

function formatDate(v: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(v));
  } catch { return v; }
}

export function AdminSupportPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("open");

  async function loadTickets() {
    setLoading(true);
    setError(null);
    try {
      const params = filterStatus !== "all" ? `?status=${filterStatus}` : "";
      const res = await fetch(`/api/support/tickets${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setTickets(data.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTickets(); }, [filterStatus]);

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    urgent: tickets.filter((t) => t.priority === "urgent").length,
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Abertos (filtro atual)</p>
          <p className="text-3xl font-semibold">{tickets.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Abertos</p>
          <p className="text-3xl font-semibold text-amber-800">{counts.open}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">Urgentes</p>
          <p className="text-3xl font-semibold text-red-800">{counts.urgent}</p>
        </div>
      </div>

      {/* Filters + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: "open", label: "Abertos" },
          { value: "in_progress", label: "Em andamento" },
          { value: "resolved", label: "Resolvidos" },
          { value: "all", label: "Todos" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              filterStatus === f.value
                ? "border-[#1B2F5B] bg-[#1B2F5B] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
        <Button onClick={loadTickets} disabled={loading} variant="outline" size="sm" className="ml-auto">
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chamados ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!loading && tickets.length === 0 && (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhum ticket encontrado com este filtro.
            </div>
          )}
          {tickets.length > 0 && (
            <div className="divide-y rounded-xl border">
              {tickets.map((t) => (
                <div key={t.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{t.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className="flex gap-1.5">
                        <Badge className={priorityColor(t.priority)}>
                          {PRIORITIES[t.priority] ?? t.priority}
                        </Badge>
                        <Badge className={statusColor(t.status)}>
                          {STATUSES[t.status] ?? t.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {CATEGORIES[t.category] ?? t.category}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
