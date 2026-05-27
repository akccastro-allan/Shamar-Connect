"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type QuickReply = { id: string; title: string; body: string; category: string; is_active: boolean };

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha na operação");
  return data;
}

export function QuickRepliesManagerPanel() {
  const [items, setItems] = useState<QuickReply[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("atendimento");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; quickReplies: QuickReply[] }>("/api/quick-replies");
      setItems(data.quickReplies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar respostas");
    } finally {
      setLoading(false);
    }
  }

  async function createItem() {
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await readJson("/api/quick-replies", { method: "POST", body: JSON.stringify({ title, body, category }) });
      setTitle("");
      setBody("");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar resposta");
    } finally {
      setLoading(false);
    }
  }

  async function toggleItem(item: QuickReply) {
    setLoading(true);
    setError(null);
    try {
      await readJson("/api/quick-replies", { method: "PATCH", body: JSON.stringify({ id: item.id, is_active: !item.is_active }) });
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar resposta");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItems(); }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Respostas rápidas</CardTitle>
            <CardDescription>Cadastre textos reutilizáveis para atendimento.</CardDescription>
          </div>
          <Button onClick={loadItems} disabled={loading} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
        <div className="grid gap-3 lg:grid-cols-[220px_180px_1fr_auto]">
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm" placeholder="Título" />
          <input value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm" placeholder="Categoria" />
          <input value={body} onChange={(event) => setBody(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm" placeholder="Texto" />
          <Button onClick={createItem} disabled={loading || !title.trim() || !body.trim()}><Plus className="mr-2 h-4 w-4" />Criar</Button>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.title}</p><Badge variant={item.is_active ? "secondary" : "outline"}>{item.is_active ? "ativa" : "inativa"}</Badge><Badge variant="outline">{item.category}</Badge></div>
                  <p className="mt-2 text-sm text-slate-700">{item.body}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleItem(item)}>{item.is_active ? "Desativar" : "Ativar"}</Button>
              </div>
            </div>
          ))}
          {items.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma resposta rápida cadastrada.</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
