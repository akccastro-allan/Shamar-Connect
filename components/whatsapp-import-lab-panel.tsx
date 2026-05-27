"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCcw, Save, Users, MessageSquareText, ShieldCheck } from "lucide-react";
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
  mode?: string;
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
      return { ok: true, total: list.length, mode: "list_only_no_database_write" };
    });
  }

  async function loadGroups() {
    await runOperation("load-groups", async () => {
      const data = await readJson<{ ok: boolean; groups?: Group[] }>("/api/whatsapp-web/groups");
      const list = data.groups || [];
      setGroups(list);
      return { ok: true, total: list.length, mode: "list_only_no_database_write" };
    });
  }

  async function saveSelectedChatOnly() {
    if (!selectedChatId) {
      setError("Escolha uma conversa antes de salvar no banco.");
      return;
    }

    await runOperation("sync-selected-chat", () => readJson<OperationResult>("/api/whatsapp-web/sync-chats", {
      method: "POST",
      body: JSON.stringify({ chatIds: [selectedChatId] }),
    }));
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Operação WhatsApp Web estilo WaSeller</CardTitle>
            <CardDescription>
              Liste dados do WhatsApp Web sem salvar tudo. Só entra no banco aquilo que você escolher manualmente.
            </CardDescription>
          </div>
          <Badge variant="warning">Manual • Seleção obrigatória</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" />Modo seguro ativado</div>
          <p className="mt-1">Listar conversas e listar grupos não grava nada no Supabase. O banco só recebe dados quando você clica em salvar a conversa selecionada, salvar mensagens da conversa selecionada ou exportar contatos do grupo selecionado.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <MessageSquareText className="h-4 w-4" /> Conversas do aparelho
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Carrega os chats visíveis no WhatsApp Web apenas para escolha. Não salva automaticamente.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={loadChats} disabled={Boolean(loading)} size="sm" variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Listar conversas</Button>
              <Button onClick={saveSelectedChatOnly} disabled={Boolean(loading) || !selectedChatId} size="sm">Salvar conversa selecionada</Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Save className="h-4 w-4" /> Salvar mensagens
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Escolha uma conversa e salve somente as últimas mensagens dessa conversa.</p>
            <div className="mt-4 space-y-3">
              <select value={selectedChatId} onChange={(event) => setSelectedChatId(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="">Escolha uma conversa</option>
                {chats.map((chat) => <option key={chat.id} value={chat.id}>{chat.name || chat.id}{chat.isGroup ? " • Grupo" : ""}</option>)}
              </select>
              <input type="number" min={10} max={200} value={messageLimit} onChange={(event) => setMessageLimit(Number(event.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
              <Button onClick={syncSelectedChatMessages} disabled={Boolean(loading) || !selectedChatId} size="sm" className="w-full">Salvar mensagens da conversa selecionada</Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Users className="h-4 w-4" /> Grupos e contatos
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Liste grupos sem salvar. Exporte contatos apenas do grupo escolhido.</p>
            <div className="mt-4 space-y-3">
              <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="">Escolha um grupo</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name || group.id} • {group.participantCount || 0} contatos</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                <Button onClick={loadGroups} disabled={Boolean(loading)} size="sm" variant="outline">Listar grupos</Button>
                <Button onClick={exportSelectedGroupContacts} disabled={Boolean(loading) || !selectedGroupId} size="sm"><Download className="mr-2 h-4 w-4" />Exportar grupo selecionado</Button>
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
              {result.mode ? <span>Modo: {result.mode}</span> : null}
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
