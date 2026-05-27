"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw, Save, Users, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Chat = {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount?: number;
  lastMessageAt?: string;
};

type Group = {
  id: string;
  name: string;
  participantCount?: number;
};

type OperationResult = {
  ok: boolean;
  error?: string;
  total?: number;
  scanned?: number;
  savedMessages?: number;
  totalParticipants?: number;
  uniqueContacts?: number;
  duplicatesRemoved?: number;
  groupName?: string;
  listId?: string;
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha na operação");
  return data;
}

export function WhatsappImportLabPanel() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [messageLimit, setMessageLimit] = useState(50);
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<OperationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedGroup = useMemo(() => groups.find((group) => group.id === selectedGroupId), [groups, selectedGroupId]);
  const selectedChat = useMemo(() => chats.find((chat) => chat.id === selectedChatId), [chats, selectedChatId]);

  async function runOperation<T extends OperationResult>(name: string, operation: () => Promise<T>) {
    setLoading(name);
    setError(null);
    setResult(null);
    try {
      const data = await operation();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(null);
    }
  }

  async function loadChats() {
    await runOperation("load-chats", async () => {
      const data = await readJson<{ ok: boolean; chats?: Chat[] }>("/api/whatsapp-web/chats");
      const list = data.chats || [];
      setChats(list);
      if (!selectedChatId && list[0]?.id) setSelectedChatId(list[0].id);
      return { ok: true, total: list.length };
    });
  }

  async function loadGroups() {
    await runOperation("load-groups", async () => {
      const data = await readJson<{ ok: boolean; groups?: Group[] }>("/api/whatsapp-web/groups");
      const list = data.groups || [];
      setGroups(list);
      if (!selectedGroupId && list[0]?.id) setSelectedGroupId(list[0].id);
      return { ok: true, total: list.length };
    });
  }

  async function syncChats() {
    await runOperation("sync-chats", () => readJson<OperationResult>("/api/whatsapp-web/sync-chats", { method: "POST" }));
    await loadChats();
  }

  async function syncSelectedChatMessages() {
    if (!selectedChatId) {
      setError("Escolha uma conversa antes de salvar mensagens.");
      return;
    }

    await runOperation("sync-chat-messages", () => readJson<OperationResult>("/api/whatsapp-web/sync-chat-messages", {
      method: "POST",
      body: JSON.stringify({ chatId: selectedChatId, limit: messageLimit }),
    }));
  }

  async function exportSelectedGroupContacts() {
    if (!selectedGroupId) {
      setError("Escolha um grupo antes de exportar contatos.");
      return;
    }

    await runOperation("export-group", () => readJson<OperationResult>("/api/whatsapp-web/groups/export-contacts", {
      method: "POST",
      body: JSON.stringify({ groupId: selectedGroupId, groupName: selectedGroup?.name }),
    }));
  }

  useEffect(() => {
    loadChats();
    loadGroups();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Operação WhatsApp Web estilo WaSeller</CardTitle>
            <CardDescription>
              Sincronize conversas visíveis no aparelho, salve histórico no Supabase, exporte contatos de grupos e alimente o CRM.
            </CardDescription>
          </div>
          <Badge variant="warning">WhatsApp Web Lab</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <MessageSquareText className="h-4 w-4" /> Conversas do aparelho
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Busca os chats que aparecem no WhatsApp Web conectado e salva as conversas no banco.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={syncChats} disabled={Boolean(loading)} size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Sincronizar conversas</Button>
              <Button onClick={loadChats} disabled={Boolean(loading)} size="sm" variant="outline">Atualizar lista</Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Save className="h-4 w-4" /> Salvar mensagens
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Escolha uma conversa e salve as últimas mensagens que estão visíveis no histórico do WhatsApp Web.</p>
            <div className="mt-4 space-y-3">
              <select value={selectedChatId} onChange={(event) => setSelectedChatId(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="">Escolha uma conversa</option>
                {chats.map((chat) => <option key={chat.id} value={chat.id}>{chat.name || chat.id}{chat.isGroup ? " • Grupo" : ""}</option>)}
              </select>
              <input type="number" min={10} max={200} value={messageLimit} onChange={(event) => setMessageLimit(Number(event.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
              <Button onClick={syncSelectedChatMessages} disabled={Boolean(loading) || !selectedChatId} size="sm" className="w-full">Salvar mensagens da conversa</Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Users className="h-4 w-4" /> Grupos e contatos
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Liste os grupos, exporte participantes, remova duplicados e salve os contatos no CRM.</p>
            <div className="mt-4 space-y-3">
              <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="">Escolha um grupo</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name || group.id} • {group.participantCount || 0} contatos</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                <Button onClick={loadGroups} disabled={Boolean(loading)} size="sm" variant="outline">Listar grupos</Button>
                <Button onClick={exportSelectedGroupContacts} disabled={Boolean(loading) || !selectedGroupId} size="sm"><Download className="mr-2 h-4 w-4" />Exportar para CRM</Button>
              </div>
            </div>
          </div>
        </div>

        {selectedChat ? (
          <div className="rounded-2xl border p-4 text-sm">
            <p className="font-medium">Conversa selecionada</p>
            <p className="mt-1 text-muted-foreground">{selectedChat.name || selectedChat.id} {selectedChat.isGroup ? "• Grupo" : "• Contato"}</p>
          </div>
        ) : null}

        {selectedGroup ? (
          <div className="rounded-2xl border p-4 text-sm">
            <p className="font-medium">Grupo selecionado</p>
            <p className="mt-1 text-muted-foreground">{selectedGroup.name || selectedGroup.id} • {selectedGroup.participantCount || 0} participantes</p>
          </div>
        ) : null}

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

        {result ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">Operação concluída</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              {typeof result.total === "number" ? <span>Total: {result.total}</span> : null}
              {typeof result.scanned === "number" ? <span>Mensagens lidas: {result.scanned}</span> : null}
              {typeof result.savedMessages === "number" ? <span>Mensagens salvas: {result.savedMessages}</span> : null}
              {typeof result.uniqueContacts === "number" ? <span>Contatos únicos: {result.uniqueContacts}</span> : null}
              {typeof result.duplicatesRemoved === "number" ? <span>Duplicados removidos: {result.duplicatesRemoved}</span> : null}
              {result.groupName ? <span>Grupo: {result.groupName}</span> : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Regra de segurança e uso</p>
          <p className="mt-1">Contatos exportados de grupos entram como rascunho e consentimento desconhecido. Antes de campanhas em massa, revise a base e respeite contexto, opt-in e boas práticas de uso do WhatsApp.</p>
        </div>
      </CardContent>
    </Card>
  );
}
