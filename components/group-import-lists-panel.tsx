"use client";

import { useEffect, useState } from "react";
import { Check, Download, RefreshCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ImportedList = {
  id: string;
  name: string;
  status: string;
  total_participants: number;
  unique_contacts: number;
  duplicates_removed: number;
  created_at: string;
};

type ImportedItem = {
  id: string;
  name: string;
  phone: string;
  source_group_name?: string;
  consent_status: string;
  crm_status: string;
  review_status: "pending" | "approved" | "rejected";
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha na operação");
  return data;
}

export function GroupImportListsPanel() {
  const [lists, setLists] = useState<ImportedList[]>([]);
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLists() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; lists: ImportedList[] }>("/api/group-contact-lists");
      setLists(data.lists || []);
      const firstId = selectedListId || data.lists?.[0]?.id || "";
      setSelectedListId(firstId);
      if (firstId) await loadItems(firstId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar listas");
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(listId: string) {
    if (!listId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; items: ImportedItem[] }>(`/api/group-contact-lists/${listId}/items`);
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar contatos");
    } finally {
      setLoading(false);
    }
  }

  async function updateReview(itemId: string, reviewStatus: "approved" | "rejected" | "pending") {
    if (!selectedListId) return;
    setError(null);
    try {
      await readJson(`/api/group-contact-lists/${selectedListId}/items`, {
        method: "PATCH",
        body: JSON.stringify({ itemId, reviewStatus }),
      });
      await loadItems(selectedListId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar contato");
    }
  }

  useEffect(() => {
    loadLists();
  }, []);

  const approved = items.filter((item) => item.review_status === "approved").length;
  const rejected = items.filter((item) => item.review_status === "rejected").length;
  const pending = items.filter((item) => item.review_status === "pending").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Listas importadas de grupos</CardTitle>
              <CardDescription>Visualize contatos extraídos, aprove/reprove registros e exporte CSV real.</CardDescription>
            </div>
            <Button onClick={loadLists} disabled={loading} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Listas</p><p className="text-2xl font-semibold">{lists.length}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-semibold">{pending}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Aprovados</p><p className="text-2xl font-semibold">{approved}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Reprovados</p><p className="text-2xl font-semibold">{rejected}</p></div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <select value={selectedListId} onChange={(event) => { setSelectedListId(event.target.value); loadItems(event.target.value); }} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {lists.map((list) => <option key={list.id} value={list.id}>{list.name} • {list.unique_contacts} contatos</option>)}
            </select>
            {selectedListId ? <Button asChild variant="outline"><a href={`/api/group-contact-lists/${selectedListId}/export.csv`}><Download className="mr-2 h-4 w-4" />Exportar CSV</a></Button> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contatos da lista</CardTitle>
          <CardDescription>Aprovar não significa opt-in automático. Serve para qualificação interna antes de qualquer ação comercial.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Grupo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{item.phone}</td>
                    <td className="px-4 py-3">{item.source_group_name || "—"}</td>
                    <td className="px-4 py-3"><Badge variant={item.review_status === "approved" ? "success" : item.review_status === "rejected" ? "destructive" : "secondary"}>{item.review_status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateReview(item.id, "approved")}><Check className="mr-1 h-3 w-3" />Aprovar</Button>
                        <Button size="sm" variant="outline" onClick={() => updateReview(item.id, "rejected")}><X className="mr-1 h-3 w-3" />Reprovar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>Nenhuma lista carregada ainda.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
