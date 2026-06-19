"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ChatItem = { id: string; name: string; isGroup: boolean; unreadCount?: number; lastMessageAt?: string };
type GroupItem = { id: string; name: string; participantCount?: number };

type Result = {
  ok: boolean;
  error?: string;
  total?: number;
  saved?: number;
  uniqueContacts?: number;
  totalParticipants?: number;
  duplicatesRemoved?: number;
  created?: number;
  updated?: number;
  skipped?: number;
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha na operação");
  return data;
}

export function WhatsappImportPanel() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadChats() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; chats: ChatItem[] }>("/api/whatsapp-web/chats");
      setChats(data.chats || []);
      if (!selectedChatId && data.chats?.[0]?.id) setSelectedChatId(data.chats[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  }

  async function loadGroups() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; groups: GroupItem[] }>("/api/whatsapp-web/groups");
      setGroups(data.groups || []);
      if (!selectedGroupId && data.groups?.[0]?.id) setSelectedGroupId(data.groups[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  }

  async function syncChats() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<Result>("/api/whatsapp-web/sync-chats", { method: "POST" });
      setResult(data);
      await loadChats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar conversas");
    } finally {
      setLoading(false);
    }
  }

  async function importHistory() {
    if (!selectedChatId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<Result>("/api/whatsapp-web/chats/import-history", {
        method: "POST",
        body: JSON.stringify({ chatId: selectedChatId, limit }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar histórico");
    } finally {
      setLoading(false);
    }
  }

  async function exportGroupContacts() {
    if (!selectedGroupId) return;
    setLoading(true);
    setError(null);
    const group = groups.find((item) => item.id === selectedGroupId);
    try {
      const data = await readJson<Result>("/api/whatsapp-web/groups/export-contacts", {
        method: "POST",
        body: JSON.stringify({ groupId: selectedGroupId, groupName: group?.name }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar contatos");
    } finally {
      setLoading(false);
    }
  }

  async function importGroupLeads() {
    if (!selectedGroupId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<Result>("/api/whatsapp-web/sync-group-contacts", {
        method: "POST",
        body: JSON.stringify({ groupId: selectedGroupId }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar contatos do grupo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChats();
    loadGroups();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importação WhatsApp Web</CardTitle>
          <CardDescription>Salve conversas visíveis no WhatsApp Web, exporte contatos de grupos e envie para o CRM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={syncChats} disabled={loading}><RefreshCcw className="mr-2 h-4 w-4" />Sincronizar conversas</Button>
            <Button onClick={loadGroups} disabled={loading} variant="outline"><Users className="mr-2 h-4 w-4" />Atualizar grupos</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Conversas</p><p className="text-2xl font-semibold">{chats.length}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Grupos</p><p className="text-2xl font-semibold">{groups.length}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Modo</p><p className="text-2xl font-semibold">Manual</p></div>
          </div>
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {result ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Operação concluída. {result.total ? `Conversas: ${result.total}. ` : ""}{result.saved ? `Mensagens salvas: ${result.saved}. ` : ""}{result.created != null ? `Contatos criados: ${result.created}. ` : ""}{result.updated != null ? `Atualizados: ${result.updated}. ` : ""}{result.skipped != null ? `Ignorados: ${result.skipped}. ` : ""}{result.uniqueContacts ? `Contatos únicos: ${result.uniqueContacts}. ` : ""}{result.duplicatesRemoved ? `Duplicados removidos: ${result.duplicatesRemoved}.` : ""}</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salvar histórico de uma conversa</CardTitle>
            <CardDescription>Escolha uma conversa que aparece no WhatsApp Web e salve as últimas mensagens na base.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select value={selectedChatId} onChange={(event) => setSelectedChatId(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {chats.map((chat) => <option key={chat.id} value={chat.id}>{chat.name || chat.id}{chat.isGroup ? " • Grupo" : ""}</option>)}
            </select>
            <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              <option value={25}>Últimas 25 mensagens</option>
              <option value={50}>Últimas 50 mensagens</option>
              <option value={100}>Últimas 100 mensagens</option>
              <option value={200}>Últimas 200 mensagens</option>
            </select>
            <Button onClick={importHistory} disabled={loading || !selectedChatId} className="w-full"><Download className="mr-2 h-4 w-4" />Salvar histórico selecionado</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exportar contatos de grupo</CardTitle>
            <CardDescription>Cria uma lista rascunho, remove duplicados e salva os participantes no CRM.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name || group.id}</option>)}
            </select>
            <div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900">
              Grupos são usados somente para captação de leads. O bot nunca responde automaticamente em grupos.
              Use os botões abaixo para salvar participantes como contatos no CRM.
            </div>
            <div className="flex flex-wrap gap-2"><Badge variant="secondary">Captação de leads</Badge><Badge variant="outline">CRM</Badge><Badge variant="outline">Sem duplicados</Badge></div>
            <div className="flex flex-col gap-2">
              <Button onClick={importGroupLeads} disabled={loading || !selectedGroupId} className="w-full bg-emerald-700 hover:bg-emerald-800">
                <Users className="mr-2 h-4 w-4" />Importar contatos deste grupo
              </Button>
              <Button onClick={exportGroupContacts} disabled={loading || !selectedGroupId} variant="outline" className="w-full">
                <Users className="mr-2 h-4 w-4" />Exportar para lista rascunho
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
