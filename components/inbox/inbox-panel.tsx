"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, MessageCircle, RefreshCcw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Conversation = {
  id: string;
  provider: string;
  external_chat_id: string;
  name?: string | null;
  is_group: boolean;
  status: string;
  unread_count: number;
  last_message_at?: string | null;
  crm_contacts?: { id: string; name?: string | null; phone?: string | null } | null;
};

type Message = {
  id: string;
  external_message_id?: string | null;
  conversation_id?: string | null;
  contact_id?: string | null;
  direction: "inbound" | "outbound";
  from_id?: string | null;
  to_id?: string | null;
  body?: string | null;
  message_type?: string | null;
  created_at: string;
  crm_contacts?: { id: string; name?: string | null; phone?: string | null } | null;
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Erro ao carregar dados");
  return data;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getConversationName(conversation: Conversation) {
  return conversation.crm_contacts?.name || conversation.name || conversation.external_chat_id;
}

export function InboxPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  async function loadConversations() {
    setLoading("conversations");
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; conversations: Conversation[] }>("/api/inbox/conversations");
      const list = data.conversations || [];
      setConversations(list);
      if (!selectedConversationId && list[0]?.id) {
        setSelectedConversationId(list[0].id);
        await loadMessages(list[0].id);
      }
      if (selectedConversationId) {
        await loadMessages(selectedConversationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(null);
    }
  }

  async function loadMessages(conversationId: string) {
    if (!conversationId) return;
    setLoading("messages");
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; messages: Message[] }>(`/api/inbox/messages?conversationId=${encodeURIComponent(conversationId)}`);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(null);
    }
  }

  async function selectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    await loadMessages(conversationId);
  }

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" />Inbox</CardTitle>
              <CardDescription>Leitura das conversas e mensagens que você salvou manualmente no Supabase.</CardDescription>
            </div>
            <Button onClick={loadConversations} disabled={Boolean(loading)} variant="outline" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" />Modo seguro</div>
            <p className="mt-1">O Inbox não puxa conversas pessoais automaticamente. Ele exibe somente conversas e mensagens já salvas manualmente pelo Feature Lab.</p>
          </div>
        </CardContent>
      </Card>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle>Conversas salvas</CardTitle>
            <CardDescription>{conversations.length} conversa(s) disponíveis no banco.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa salva ainda. Vá em Feature Lab, liste conversas e salve uma conversa selecionada.</div>
            ) : (
              <div className="max-h-[650px] divide-y overflow-auto">
                {conversations.map((conversation) => {
                  const selected = conversation.id === selectedConversationId;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => selectConversation(conversation.id)}
                      className={`w-full px-4 py-4 text-left transition hover:bg-slate-50 ${selected ? "bg-emerald-50" : "bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{getConversationName(conversation)}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.external_chat_id}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(conversation.last_message_at)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant={conversation.is_group ? "secondary" : "outline"}>{conversation.is_group ? "Grupo" : "Contato"}</Badge>
                        <Badge variant="outline">{conversation.status}</Badge>
                        {conversation.unread_count ? <Badge variant="warning">{conversation.unread_count} não lidas</Badge> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" />Mensagens</CardTitle>
                <CardDescription>{selectedConversation ? getConversationName(selectedConversation) : "Selecione uma conversa"}</CardDescription>
              </div>
              {selectedConversation ? <Badge variant={selectedConversation.is_group ? "secondary" : "outline"}>{selectedConversation.is_group ? "Grupo" : "Contato"}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedConversation ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Selecione uma conversa para ler as mensagens.</div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Essa conversa foi salva, mas ainda não possui mensagens salvas. Use “Salvar mensagens da conversa selecionada” no Feature Lab.</div>
            ) : (
              <div className="max-h-[650px] space-y-3 overflow-auto bg-slate-50 p-4">
                {messages.map((message) => {
                  const outbound = message.direction === "outbound";
                  return (
                    <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] rounded-3xl border px-4 py-3 text-sm shadow-sm ${outbound ? "bg-emerald-600 text-white" : "bg-white text-slate-900"}`}>
                        <p className="whitespace-pre-wrap leading-6">{message.body || "Mensagem sem conteúdo textual."}</p>
                        <div className={`mt-2 flex items-center justify-between gap-3 text-[11px] ${outbound ? "text-emerald-50" : "text-muted-foreground"}`}>
                          <span>{outbound ? "Enviada" : "Recebida"}</span>
                          <span>{formatDate(message.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
