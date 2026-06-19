"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, RefreshCcw } from "lucide-react";

type Ticket = {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  description: string;
};

const CATEGORIES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "crm", label: "CRM" },
  { value: "campanhas", label: "Campanhas" },
  { value: "ia", label: "IA" },
  { value: "financeiro", label: "Financeiro" },
  { value: "acesso", label: "Acesso" },
  { value: "outro", label: "Outro" },
];

const PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

function priorityVariant(p: string) {
  if (p === "urgent") return "destructive";
  if (p === "high") return "warning" as any;
  return "secondary";
}

function statusVariant(s: string) {
  if (s === "open") return "secondary";
  if (s === "in_progress") return "warning" as any;
  if (s === "resolved" || s === "closed") return "success" as any;
  return "outline";
}

function statusLabel(s: string) {
  if (s === "open") return "Aberto";
  if (s === "in_progress") return "Em andamento";
  if (s === "resolved") return "Resolvido";
  if (s === "closed") return "Fechado";
  return s;
}

function formatDate(v: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
  } catch {
    return v;
  }
}

export function SupportPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("whatsapp");
  const [priority, setPriority] = useState("normal");

  async function loadTickets() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support/tickets", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setTickets(data.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar chamados");
    } finally {
      setLoading(false);
    }
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, priority }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSuccess("Chamado aberto com sucesso!");
      setTitle("");
      setDescription("");
      setCategory("whatsapp");
      setPriority("normal");
      setShowForm(false);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir chamado");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { loadTickets(); }, []);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { setShowForm(!showForm); setError(null); setSuccess(null); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo chamado
        </Button>
        <Button onClick={loadTickets} disabled={loading} variant="outline">
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>}

      {/* New ticket form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo chamado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitTicket} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Descreva o problema em uma linha"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#2ABFAB] focus:ring-1 focus:ring-[#2ABFAB]"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#2ABFAB]"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#2ABFAB]"
                  >
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Descreva o problema com detalhes: o que aconteceu, quando, e qual o impacto."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#2ABFAB] focus:ring-1 focus:ring-[#2ABFAB]"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar chamado"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ticket list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meus chamados ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!loading && tickets.length === 0 && (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhum chamado aberto ainda. Clique em "Novo chamado" para reportar um problema.
            </div>
          )}
          {tickets.length > 0 && (
            <div className="divide-y rounded-xl border">
              {tickets.map((t) => (
                <div key={t.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{t.title}</p>
                    <div className="flex gap-2">
                      <Badge variant={priorityVariant(t.priority)}>
                        {PRIORITIES.find((p) => p.value === t.priority)?.label ?? t.priority}
                      </Badge>
                      <Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>{CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category}</span>
                    <span>·</span>
                    <span>{formatDate(t.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
