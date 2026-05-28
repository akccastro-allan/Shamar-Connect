"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, RefreshCcw, XCircle } from "lucide-react";
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
  name?: string;
  phone: string;
  source_group_name?: string;
  consent_status: string;
  crm_status: string;
  review_status: "pending" | "approved" | "rejected";
  created_at: string;
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha na operação");
  return data;
}

export function GroupListsReviewPanel() {
  const [lists, setLists] = useState<ImportedList[]>([]);
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedList = useMemo(() => lists.find((list) => list.id === selectedListId), [lists, selectedListId]);
  const counters = useMemo(() => ({
    pending: items.filter((item) => item.review_status === "pending").length,
    approved: items.filter((item) => item.review_status === "approved").length,
    rejected: items.filter((item) => item.review_status === "rejected").length,
  }), [items]);

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
      setError(err instanceof Error ? err.message : "Erro ao carregar contatos da lista");
    } finally {
      setLoading(false);
    }
  }

  async function updateItem(itemId: string, reviewStatus: ImportedItem["review_status"]) {
    if (!selectedListId) return;
    setError(null);
    try {
      await readJson(`/api/group-contact-lists/${selectedListId}/items`, {
        method: "PATCH",
        body: JSON.stringify({ itemId, reviewStatus }),
      });
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, review_status: reviewStatus } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar contato");
    }
  }

  function exportCsv(status?: ImportedItem["review_status"]) {
    if (!selectedListId) return;
    const suffix = status ? `?reviewStatus=${status}` : "";
    window.open(`/api/group-contact-lists/${selectedListId}/export-csv${suffix}`, "_blank");
  }

  useEffect(() => {
    loadLists();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Listas importadas de grupos</CardTitle>
              <CardDescription>Revise contatos extraídos de grupos, aprove/reprove e exporte CSV real.</CardDescription>
            </div>
            <Button onClick={loadLists} disabled={loading} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <select value={selectedListId} onChange={(event) => { setSelectedListId(event.target.value); loadItems(event.target.value); }} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
            <Button onClick={() => exportCsv()} disabled={!selectedListId} className="w-full"><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Únicos</p><p className="text-2xl font-semibold">{selectedList?.unique_contacts || 0}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-semibold">{counters.pending}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Aprovados</p><p className="text-2xl font-semibold text-emerald-700">{counters.approved}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Reprovados</p><p className="text-2xl font-semibold text-red-700">{counters.rejected}</p></div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => exportCsv("approved")} disabled={!selectedListId} variant="outline">Exportar aprovados</Button>
            <Button onClick={() => exportCsv("pending")} disabled={!selectedListId} variant="outline">Exportar pendentes</Button>
            <Button onClick={() => exportCsv("rejected")} disabled={!selectedListId} variant="outline">Exportar reprovados</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contatos da lista</CardTitle>
          <CardDescription>A aprovação aqui é uma revisão interna. O consentimento continua separado como regra comercial.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.name || "Contato sem nome"}</td>
                    <td className="px-4 py-3">{item.phone}</td>
                    <td className="px-4 py-3">{item.source_group_name || "—"}</td>
                    <td className="px-4 py-3"><Badge variant={item.review_status === "approved" ? "success" : item.review_status === "rejected" ? "destructive" : "secondary"}>{item.review_status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateItem(item.id, "approved")}><CheckCircle2 className="mr-1 h-4 w-4" />Aprovar</Button>
                        <Button size="sm" variant="outline" onClick={() => updateItem(item.id, "rejected")}><XCircle className="mr-1 h-4 w-4" />Reprovar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum contato encontrado.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
