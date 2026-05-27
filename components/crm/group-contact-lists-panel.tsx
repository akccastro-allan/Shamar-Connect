"use client";

import { useEffect, useState } from "react";
import { ClipboardList, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GroupContactList = {
  id: string;
  name: string;
  status: string;
  total_participants: number;
  unique_contacts: number;
  duplicates_removed: number;
  created_at: string;
  whatsapp_groups?: { name?: string | null; external_group_id?: string | null } | null;
};

async function loadLists() {
  const response = await fetch("/api/crm/group-contact-lists", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Erro ao carregar listas");
  return (data.lists || []) as GroupContactList[];
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

export function GroupContactListsPanel() {
  const [lists, setLists] = useState<GroupContactList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setLists(await loadLists());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Listas extraídas de grupos</CardTitle>
            <CardDescription>Listas criadas somente quando você exporta manualmente um grupo selecionado.</CardDescription>
          </div>
          <Button onClick={refresh} disabled={loading} variant="outline" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
        {lists.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma lista extraída ainda.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {lists.map((list) => (
              <div key={list.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{list.status}</Badge>
                  <Badge variant="secondary">{formatDate(list.created_at)}</Badge>
                </div>
                <p className="mt-3 font-semibold text-slate-950">{list.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">Grupo: {list.whatsapp_groups?.name || "—"}</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Participantes</p><p className="text-xl font-semibold">{list.total_participants}</p></div>
                  <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Únicos</p><p className="text-xl font-semibold">{list.unique_contacts}</p></div>
                  <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Duplicados</p><p className="text-xl font-semibold">{list.duplicates_removed}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
