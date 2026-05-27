"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Save, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ChatItem = { id: string; name: string; isGroup: boolean; unreadCount?: number; lastMessageAt?: string };
type SyncedMessage = {
  id: string;
  chatId: string;
  chatName?: string;
  isGroup?: boolean;
  from?: string;
  to?: string;
  body?: string;
  timestamp?: number;
  direction: "inbound" | "outbound";
  contactName?: string;
  phone?: string;
  type?: string;
};

type Result = { ok: boolean; saved?: number; received?: number; error?: string };

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha na operação");
  return data;
}

function formatMessageTime(timestamp?: number) {
  if (!timestamp) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp * 1000));
  } catch {
    return String(timestamp);
  }
}

export function WhatsappReaderPanel() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messages, setMessages] = useState<SyncedMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const selectedMessages = useMemo(() => messages.filter((message) => selectedMessageIds.includes(message.id)), [messages, selectedMessageIds]);
  const selectedChat = useMemo(() => chats.find((chat) => chat.id === selectedChatId), [chats, selectedChatId]);

  async function loadChats() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; chats: ChatItem[] }>("/api/whatsapp-web/chats");
      setChats(data.chats || []);
      const firstId = selectedChatId || data.chats?.[0]?.id || "";
      setSelectedChatId(firstId);
      if (firstId) await loadMessages(firstId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(chatId = selectedChatId) {
    if (!chatId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedMessageIds([]);
    try {
      const data = await readJson<{ ok: boolean; messages: SyncedMessage[] }>(`/api/whatsapp-web/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }

  function toggleMessage(messageId: string) {
    setSelectedMessageIds((current) => current.includes(messageId) ? current.filter((id) => id !== messageId) : [...current, messageId]);
  }

  function selectAll() {
    setSelectedMessageIds(messages.map((message) => message.id));
  }

  function clearSelection() {
    setSelectedMessageIds([]);
  }

  async function saveSelected() {
    if (selectedMessages.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<Result>("/api/whatsapp-web/messages/save-selected", {
        method: "POST",
        body: JSON.stringify({ messages: selectedMessages }),
      });
      setResult(data);
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar mensagens selecionadas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" />WhatsApp Web Reader</CardTitle>
              <CardDescription>Leia mensagens visíveis no WhatsApp Web e salve manualmente apenas o que fizer sentido para o CRM.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={loadChats} disabled={loading} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar conversas</Button>
              <Button onClick={saveSelected} disabled={loading || selectedMessages.length === 0}><Save className="mr-2 h-4 w-4" />Salvar selecionadas</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Conversas</p><p className="text-2xl font-semibold">{chats.length}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Mensagens lidas</p><p className="text-2xl font-semibold">{messages.length}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Selecionadas</p><p className="text-2xl font-semibold">{selectedMessages.length}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Modo</p><p className="text-2xl font-semibold">Manual</p></div>
          </div>
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {result ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Mensagens salvas: {result.saved || 0}.</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Conversas do aparelho</CardTitle>
            <CardDescription>Escolha uma conversa para carregar o histórico recente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              <option value={25}>Últimas 25 mensagens</option>
              <option value={50}>Últimas 50 mensagens</option>
              <option value={100}>Últimas 100 mensagens</option>
              <option value={200}>Últimas 200 mensagens</option>
            </select>
            <div className="max-h-[640px] space-y-2 overflow-auto pr-1">
              {chats.map((chat) => (
                <button key={chat.id} onClick={() => { setSelectedChatId(chat.id); loadMessages(chat.id); }} className={`w-full rounded-2xl border p-3 text-left text-sm hover:bg-slate-50 ${selectedChatId === chat.id ? "border-emerald-300 bg-emerald-50" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-950">{chat.name || chat.id}</p>
                    {chat.isGroup ? <Badge variant="secondary">Grupo</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Não salvas automaticamente</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{selectedChat?.name || "Mensagens"}</CardTitle>
                <CardDescription>Marque uma ou mais mensagens e salve apenas as selecionadas.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={selectAll} disabled={messages.length === 0} variant="outline" size="sm">Selecionar todas</Button>
                <Button onClick={clearSelection} disabled={selectedMessages.length === 0} variant="ghost" size="sm">Limpar</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[720px] space-y-3 overflow-auto pr-1">
              {messages.map((message) => {
                const checked = selectedMessageIds.includes(message.id);
                const outbound = message.direction === "outbound";
                return (
                  <label key={message.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-3 hover:bg-slate-50 ${checked ? "border-emerald-300 bg-emerald-50" : "bg-white"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleMessage(message.id)} className="mt-1 h-4 w-4" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={outbound ? "outline" : "secondary"}>{outbound ? "Enviada" : "Recebida"}</Badge>
                        <span className="text-xs text-muted-foreground">{formatMessageTime(message.timestamp)}</span>
                        {message.type && message.type !== "text" ? <Badge variant="outline">{message.type}</Badge> : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-900">{message.body || "Mensagem sem texto."}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{message.contactName || message.phone || message.from || "Contato sem identificação"}</p>
                    </div>
                  </label>
                );
              })}
              {messages.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma mensagem carregada ainda.</div> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
