"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QuickReply = {
  id: string;
  title: string;
  body: string;
  category: string;
  tags?: string[];
  usage_count?: number;
  is_active: boolean;
  created_at: string;
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha na operação");
  return data;
}

export function QuickRepliesManager() {
  const [items, setItems] = useState<QuickReply[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("atendimento");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.title, item.body, item.category, ...(item.tags || [])].join(" ").toLowerCase().includes(term));
  }, [items, query]);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; quickReplies: QuickReply[] }>("/api/quick-replies");
      setItems(data.quickReplies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar respostas rápidas");
    } finally {
      setLoading(false);
    }
  }

  async function createItem() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const data = await readJson<{ ok: boolean; quickReply: QuickReply }>("/api/quick-replies", {
        method: "POST",
        body: JSON.stringify({ title, category, body }),
      });
      setItems((current) => [...current, data.quickReply].sort((a, b) => a.title.localeCompare(b.title)));
      setTitle("");
      setBody("");
      setNotice("Resposta rápida criada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar resposta rápida");
    } finally {
      setLoading(false);
    }
  }

  async function deactivateItem(id: string) {
    setError(null);
    try {
      await readJson("/api/quick-replies", {
        method: "PATCH",
        body: JSON.stringify({ id, is_active: false }),
      });
      setItems((current) => current.filter((item) => item.id !== id));
      setNotice("Resposta rápida arquivada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao arquivar resposta rápida");
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Respostas rápidas</CardTitle>
              <CardDescription>Cadastre mensagens prontas para usar na central de atendimento WhatsApp.</CardDescription>
            </div>
            <Button onClick={loadItems} disabled={loading} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div> : null}

          <div className="grid gap-3 lg:grid-cols-[1fr_200px]">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar resposta rápida" className="rounded-xl border bg-white px-3 py-2 text-sm" />
            <Badge variant="secondary" className="flex items-center justify-center">{filtered.length} respostas</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Criar nova resposta</CardTitle>
            <CardDescription>Use textos curtos e fáceis de adaptar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              <option value="atendimento">Atendimento</option>
              <option value="comercial">Comercial</option>
              <option value="relacionamento">Relacionamento</option>
              <option value="suporte">Suporte</option>
              <option value="geral">Geral</option>
            </select>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={7} placeholder="Mensagem pronta" className="w-full rounded-2xl border bg-white p-3 text-sm" />
            <Button onClick={createItem} disabled={loading || !title.trim() || !body.trim()} className="w-full"><Plus className="mr-2 h-4 w-4" />Criar resposta</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Biblioteca de respostas</CardTitle>
            <CardDescription>Essas respostas aparecem na central WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[620px] space-y-3 overflow-auto pr-2">
              {filtered.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{item.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2"><Badge variant="outline">{item.category}</Badge><Badge variant="secondary">usos: {item.usage_count || 0}</Badge></div>
                    </div>
                    <Button onClick={() => deactivateItem(item.id)} variant="outline" size="sm">Arquivar</Button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.body}</p>
                </div>
              ))}
              {filtered.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma resposta encontrada.</div> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
