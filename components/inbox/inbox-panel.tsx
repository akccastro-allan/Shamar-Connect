"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, MessageCircle, RefreshCcw, Send, Tags, StickyNote, Save, RotateCw, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isUnassignedConversation, normalizeQueueStatus } from "@/lib/lips/day-one-readiness";

type Contact = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  consent_status?: string | null;
  tags?: string[] | null;
  source?: string | null;
};

type Conversation = {
  id: string;
  provider: string;
  external_chat_id: string;
  name?: string | null;
  is_group: boolean;
  status: string;
  queue_status?: string | null;
  stage?: string | null;
  priority?: string | null;
  unread_count: number;
  last_message_at?: string | null;
  queue_entered_at?: string | null;
  sla_due_at?: string | null;
  sla_status?: string | null;
  pending_reason?: string | null;
  queue_reason?: string | null;
  requires_human?: boolean | null;
  assigned_user_id?: string | null;
  assigned_to?: string | null;
  assigned_name?: string | null;
  department_id?: string | null;
  channel_id?: string | null;
  channels?: { id: string; session_id?: string | null; provider?: string | null; name?: string | null } | null;
  departments?: { id: string; name: string; color: string } | null;
  latest_message?: { body: string | null; direction: "inbound" | "outbound" | string; created_at: string } | null;
  crm_contacts?: Contact | null;
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
  deleted_by_sender?: boolean | null;
  deleted_at?: string | null;
  has_media?: boolean | null;
  media_count?: number | null;
  media_summary?: string | null;
  crm_contacts?: Contact | null;
};

type QuickReply = {
  id: string;
  title: string;
  body: string;
  category: string;
};

type ContactNote = {
  id: string;
  contact_id?: string | null;
  conversation_id?: string | null;
  note: string;
  created_by?: string | null;
  created_at: string;
};

type Availability = {
  status: "available" | "paused" | "offline";
  accepting_new_conversations: boolean;
  current_load?: number | null;
};

type SyncStatus = {
  status: "ready" | "syncing" | "stale" | "disconnected";
  connected: boolean;
  lastSuccessAt?: string | null;
  lastEventAt?: string | null;
  lastChatSyncAt?: string | null;
  lastMessageSyncAt?: string | null;
  isStale: boolean;
  label: string;
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
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

function getConversationPhone(conversation: Conversation | null) {
  if (!conversation) return "";
  if (conversation.crm_contacts?.phone) return conversation.crm_contacts.phone;
  return conversation.external_chat_id || "";
}

function queueStatusToLabel(status?: string | null) {
  if (status === "waiting") return "Aguardando atendimento";
  if (status === "in_progress") return "Em atendimento";
  if (status === "awaiting_customer") return "Aguardando cliente";
  if (status === "resolved") return "Resolvida";
  if (status === "closed") return "Encerrada";
  if (status === "open") return "Aberta";
  if (status === "pending") return "Pendente";
  if (status === "archived") return "Arquivada";
  return "Aguardando atendimento";
}

function availabilityLabel(status?: string | null) {
  if (status === "available") return "Disponível";
  if (status === "paused") return "Pausado";
  return "Offline";
}

function syncStatusLabel(status?: string | null) {
  if (status === "syncing") return "Sincronizando";
  if (status === "stale") return "Atualização atrasada";
  if (status === "disconnected") return "WhatsApp desconectado";
  return "Atualizado agora";
}

function tagsToInput(tags?: string[] | null) {
  return (tags || []).join(", ");
}

export function InboxPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [availability, setAvailability] = useState<Availability>({ status: "offline", accepting_new_conversations: false, current_load: 0 });
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactConsent, setContactConsent] = useState("unknown");
  const [contactTags, setContactTags] = useState("");
  const [conversationStatus, setConversationStatus] = useState("open");
  const [conversationStage, setConversationStage] = useState("novo");
  const [conversationPriority, setConversationPriority] = useState("normal");
  const [queueFilter, setQueueFilter] = useState("all");
  const [transferReason, setTransferReason] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const queueStats = useMemo(() => ({
    unassigned: conversations.filter(isUnassignedConversation).length,
    critical: conversations.filter((conversation) => conversation.sla_status === "breached").length,
    active: conversations.filter((conversation) => ["waiting", "in_progress", "awaiting_customer"].includes(normalizeQueueStatus(conversation.queue_status))).length,
    resolved: conversations.filter((conversation) => conversation.queue_status === "resolved").length,
  }), [conversations]);

  function hydrateForms(conversation: Conversation | null) {
    const contact = conversation?.crm_contacts;
    setContactName(contact?.name || "");
    setContactEmail(contact?.email || "");
    setContactCompany(contact?.company || "");
    setContactConsent(contact?.consent_status || "unknown");
    setContactTags(tagsToInput(contact?.tags));
    setConversationStatus(conversation?.queue_status || "waiting");
    setConversationStage(conversation?.stage || "novo");
    setConversationPriority(conversation?.priority || "normal");
  }

  async function loadConversations(keepSelection = true) {
    setLoading("conversations");
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; conversations: Conversation[] }>(`/api/inbox/queue?filter=${encodeURIComponent(queueFilter)}`);
      const list = data.conversations || [];
      setConversations(list);
      const nextId = keepSelection && selectedConversationId ? selectedConversationId : list[0]?.id || "";
      if (nextId) {
        setSelectedConversationId(nextId);
        const conversation = list.find((item) => item.id === nextId) || null;
        hydrateForms(conversation);
        await loadSyncStatus(conversation?.channel_id || null);
        await loadMessages(nextId);
        await loadNotes(conversation);
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

  async function loadQuickReplies() {
    try {
      const data = await readJson<{ ok: boolean; quickReplies: QuickReply[] }>("/api/inbox/quick-replies");
      setQuickReplies(data.quickReplies || []);
    } catch {
      setQuickReplies([]);
    }
  }

  async function loadAvailability() {
    try {
      const data = await readJson<{ ok: boolean; availability: Availability }>("/api/inbox/availability");
      setAvailability(data.availability || { status: "offline", accepting_new_conversations: false, current_load: 0 });
    } catch {
      setAvailability({ status: "offline", accepting_new_conversations: false, current_load: 0 });
    }
  }

  async function loadSyncStatus(channelId?: string | null) {
    if (!channelId) {
      setSyncStatus(null);
      return;
    }

    try {
      const data = await readJson<{ ok: boolean; status: SyncStatus | null }>(`/api/whatsapp-web/sync-status?channelId=${encodeURIComponent(channelId)}`);
      setSyncStatus(data.status || null);
    } catch {
      setSyncStatus(null);
    }
  }

  async function updateAvailability(status: Availability["status"]) {
    setLoading("availability");
    setError(null);
    setSuccess(null);
    try {
      const data = await readJson<{ ok: boolean; availability: Availability }>("/api/inbox/availability", {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setAvailability(data.availability);
      setSuccess(`Disponibilidade alterada para ${availabilityLabel(status)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar disponibilidade");
    } finally {
      setLoading(null);
    }
  }

  async function loadNotes(conversation: Conversation | null) {
    if (!conversation) return;
    const contactId = conversation.crm_contacts?.id;
    const query = contactId ? `contactId=${encodeURIComponent(contactId)}` : `conversationId=${encodeURIComponent(conversation.id)}`;
    try {
      const data = await readJson<{ ok: boolean; notes: ContactNote[] }>(`/api/inbox/contact-notes?${query}`);
      setNotes(data.notes || []);
    } catch {
      setNotes([]);
    }
  }

  async function selectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    const conversation = conversations.find((item) => item.id === conversationId) || null;
    hydrateForms(conversation);
    await loadSyncStatus(conversation?.channel_id || null);
    await loadMessages(conversationId);
    await loadNotes(conversation);
  }

  async function sendMessage() {
    if (!selectedConversation || !replyBody.trim()) return;
    setLoading("send");
    setError(null);
    setSuccess(null);
    try {
      await readJson<{ ok: boolean }>("/api/inbox/send-message", {
        method: "POST",
        body: JSON.stringify({ conversationId: selectedConversation.id, body: replyBody.trim() }),
      });
      setReplyBody("");
      setSuccess("Mensagem enviada e salva no histórico.");
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setLoading(null);
    }
  }

  async function saveConversationStatus() {
    if (!selectedConversation) return;
    setLoading("status");
    setError(null);
    setSuccess(null);
    try {
      await readJson<{ ok: boolean }>("/api/inbox/conversation-status", {
        method: "PATCH",
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          status: conversationStatus,
          stage: conversationStage,
          priority: conversationPriority,
        }),
      });
      setSuccess("Status da conversa atualizado.");
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar status");
    } finally {
      setLoading(null);
    }
  }

  async function queueAction(action: "claim" | "resolve" | "reopen" | "awaiting_customer" | "closed") {
    if (!selectedConversation) return;
    setLoading(action);
    setError(null);
    setSuccess(null);
    try {
      if (action === "awaiting_customer" || action === "closed") {
        await readJson<{ ok: boolean }>(`/api/inbox/conversations/${selectedConversation.id}/status`, {
          method: "POST",
          body: JSON.stringify({ status: action }),
        });
      } else {
        await readJson<{ ok: boolean }>(`/api/inbox/conversations/${selectedConversation.id}/${action}`, { method: "POST" });
      }
      setSuccess("Fila atualizada.");
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar fila");
    } finally {
      setLoading(null);
    }
  }

  async function transferToQueue() {
    if (!selectedConversation || !transferReason.trim()) return;
    setLoading("transfer");
    setError(null);
    setSuccess(null);
    try {
      await readJson<{ ok: boolean }>(`/api/inbox/conversations/${selectedConversation.id}/transfer`, {
        method: "POST",
        body: JSON.stringify({ departmentId: selectedConversation.department_id || null, assignTo: null, reason: transferReason.trim() }),
      });
      setTransferReason("");
      setSuccess("Atendimento transferido para a fila.");
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao transferir");
    } finally {
      setLoading(null);
    }
  }

  async function saveContact() {
    const contactId = selectedConversation?.crm_contacts?.id;
    if (!contactId) {
      setError("Essa conversa ainda não tem contato vinculado. Sincronize as mensagens primeiro.");
      return;
    }
    setLoading("contact");
    setError(null);
    setSuccess(null);
    try {
      await readJson<{ ok: boolean }>("/api/inbox/contact", {
        method: "PATCH",
        body: JSON.stringify({
          contactId,
          name: contactName,
          email: contactEmail,
          company: contactCompany,
          consentStatus: contactConsent,
          tags: contactTags,
        }),
      });
      setSuccess("Contato atualizado no CRM.");
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar contato");
    } finally {
      setLoading(null);
    }
  }

  async function saveNote() {
    if (!selectedConversation || !noteBody.trim()) return;
    setLoading("note");
    setError(null);
    setSuccess(null);
    try {
      await readJson<{ ok: boolean }>("/api/inbox/contact-notes", {
        method: "POST",
        body: JSON.stringify({
          contactId: selectedConversation.crm_contacts?.id || null,
          conversationId: selectedConversation.id,
          note: noteBody.trim(),
        }),
      });
      setNoteBody("");
      setSuccess("Nota salva no contato/conversa.");
      await loadNotes(selectedConversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar nota");
    } finally {
      setLoading(null);
    }
  }

  useEffect(() => {
    loadConversations(false);
    loadQuickReplies();
    loadAvailability();
  }, [queueFilter]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" />Inbox completo</CardTitle>
              <CardDescription>Atendimento manual com leitura, resposta, sincronização, CRM, notas, tags, consentimento e status.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={availability.status === "available" ? "default" : "outline"}>{availabilityLabel(availability.status)}</Badge>
              <Button onClick={() => updateAvailability("available")} disabled={Boolean(loading)} variant={availability.status === "available" ? "default" : "outline"} size="sm">Disponível</Button>
              <Button onClick={() => updateAvailability("paused")} disabled={Boolean(loading)} variant={availability.status === "paused" ? "default" : "outline"} size="sm">Pausado</Button>
              <Button onClick={() => updateAvailability("offline")} disabled={Boolean(loading)} variant={availability.status === "offline" ? "default" : "outline"} size="sm">Offline</Button>
              <Button onClick={() => loadConversations(true)} disabled={Boolean(loading)} variant="outline" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-medium"><MessageCircle className="h-4 w-4" />Central WhatsApp</div>
            <p className="mt-1">Conversas e mensagens processadas automaticamente a partir dos eventos do gateway.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["all", "Todas"],
              ["mine", "Minha fila"],
              ["unassigned", "Não atribuídas"],
              ["critical", "SLA crítico"],
              ["awaiting_customer", "Aguardando cliente"],
              ["resolved", "Resolvidas"],
            ].map(([value, label]) => (
              <Button key={value} size="sm" variant={queueFilter === value ? "default" : "outline"} onClick={() => setQueueFilter(value)}>{label}</Button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Não atribuídas</p><p className="text-2xl font-black text-[#1B2F5B]">{queueStats.unassigned}</p></div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4"><p className="text-xs text-red-700">SLA crítico</p><p className="text-2xl font-black text-red-800">{queueStats.critical}</p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Ativas</p><p className="text-2xl font-black text-[#1B2F5B]">{queueStats.active}</p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Resolvidas</p><p className="text-2xl font-black text-[#1B2F5B]">{queueStats.resolved}</p></div>
          </div>
        </CardContent>
      </Card>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{success}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle>Conversas</CardTitle>
            <CardDescription>{conversations.length} conversa(s) na fila filtrada.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa salva ainda. Use o Feature Lab para salvar uma conversa selecionada.</div>
            ) : (
              <div className="max-h-[760px] divide-y overflow-auto">
                {conversations.map((conversation) => {
                  const selected = conversation.id === selectedConversationId;
                  return (
                    <button key={conversation.id} onClick={() => selectConversation(conversation.id)} className={`w-full px-4 py-4 text-left transition hover:bg-slate-50 ${selected ? "bg-emerald-50" : "bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{getConversationName(conversation)}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.departments?.name || "Sem departamento"} · {conversation.assigned_name || "Não atribuída"}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{conversation.latest_message?.body || "Sem última mensagem textual"}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(conversation.last_message_at)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant={conversation.is_group ? "secondary" : "outline"}>{conversation.is_group ? "Grupo" : "Contato"}</Badge>
                        <Badge variant="outline">{queueStatusToLabel(normalizeQueueStatus(conversation.queue_status) || conversation.status)}</Badge>
                        <Badge variant="secondary">{conversation.priority || "normal"}</Badge>
                        <Badge variant={conversation.sla_status === "breached" ? "destructive" : "outline"}>SLA {conversation.sla_status || "on_time"}</Badge>
                        {conversation.requires_human ? <Badge variant="destructive">humano</Badge> : null}
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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
            ) : (
              <div className="flex h-[760px] flex-col">
                <div className="flex items-center gap-2 border-b bg-white p-3">
                  <Badge variant={syncStatus?.status === "disconnected" || syncStatus?.status === "stale" ? "outline" : "secondary"}>{syncStatus?.label || syncStatusLabel(syncStatus?.status)}</Badge>
                  <Button onClick={() => queueAction("claim")} disabled={Boolean(loading)} size="sm">Assumir</Button>
                  <Button onClick={() => queueAction("resolve")} disabled={Boolean(loading)} size="sm" variant="outline">Resolver</Button>
                  <Button onClick={() => queueAction("reopen")} disabled={Boolean(loading)} size="sm" variant="outline">Reabrir</Button>
                </div>

                <div className="flex-1 space-y-3 overflow-auto bg-slate-50 p-4">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">Sem mensagens salvas ainda. A sincronização automática continuará em segundo plano.</div>
                  ) : messages.map((message) => {
                    const outbound = message.direction === "outbound";
                    const deleted = Boolean(message.deleted_by_sender);
                    const hasMedia = Boolean(message.has_media);
                    return (
                      <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[82%] rounded-3xl border px-4 py-3 text-sm shadow-sm ${outbound ? "bg-emerald-600 text-white" : "bg-white text-slate-900"}`}>
                          {deleted ? (
                            <div className={`mb-2 flex items-center gap-2 rounded-2xl px-3 py-2 text-xs ${outbound ? "bg-emerald-700 text-emerald-50" : "bg-red-50 text-red-700"}`}>
                              <RotateCw className="h-3.5 w-3.5" />
                              <span>Mensagem deletada pelo remetente</span>
                            </div>
                          ) : null}
                          {hasMedia ? (
                            <div className={`mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${outbound ? "bg-emerald-700 text-emerald-50" : "bg-slate-100 text-slate-700"}`}>
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>{message.media_summary || message.message_type || "mídia"}{message.media_count ? ` · ${message.media_count}` : ""}</span>
                            </div>
                          ) : null}
                          <p className="whitespace-pre-wrap leading-6">{message.body || (hasMedia ? "Mensagem com mídia." : "Mensagem sem conteúdo textual.")}</p>
                          <div className={`mt-2 flex items-center justify-between gap-3 text-[11px] ${outbound ? "text-emerald-50" : "text-muted-foreground"}`}>
                            <span>{outbound ? "Enviada" : "Recebida"}</span>
                            <span>{formatDate(deleted ? message.deleted_at || message.created_at : message.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 border-t bg-white p-3">
                  {quickReplies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((reply) => <Button key={reply.id} type="button" variant="outline" size="sm" onClick={() => setReplyBody(reply.body)}>{reply.title}</Button>)}
                    </div>
                  ) : null}
                  <textarea value={replyBody} onChange={(event) => setReplyBody(event.target.value)} className="min-h-24 w-full rounded-2xl border px-4 py-3 text-sm" placeholder="Digite sua resposta manual..." />
                  <Button onClick={sendMessage} disabled={Boolean(loading) || !replyBody.trim()} className="w-full"><Send className="mr-2 h-4 w-4" />Enviar resposta</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />Contato</CardTitle>
              <CardDescription>Dados comerciais vinculados à conversa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedConversation ? <p className="text-sm text-muted-foreground">Selecione uma conversa.</p> : (
                <>
                  <input value={contactName} onChange={(event) => setContactName(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Nome" />
                  <input value={getConversationPhone(selectedConversation)} disabled className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm" placeholder="Telefone ou ID WhatsApp" />
                  <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="E-mail" />
                  <input value={contactCompany} onChange={(event) => setContactCompany(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Empresa" />
                  <select value={contactConsent} onChange={(event) => setContactConsent(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                    <option value="unknown">Consentimento desconhecido</option>
                    <option value="opted_in">Opt-in</option>
                    <option value="opted_out">Opt-out</option>
                  </select>
                  <div className="flex items-center gap-2"><Tags className="h-4 w-4 text-muted-foreground" /><input value={contactTags} onChange={(event) => setContactTags(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="tags separadas por vírgula" /></div>
                  <Button onClick={saveContact} disabled={Boolean(loading)} className="w-full"><Save className="mr-2 h-4 w-4" />Salvar contato</Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status CRM</CardTitle>
              <CardDescription>Organização da conversa no atendimento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <select value={conversationStatus} onChange={(event) => setConversationStatus(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="waiting">Aguardando atendimento</option>
                <option value="in_progress">Em atendimento</option>
                <option value="awaiting_customer">Aguardando cliente</option>
                <option value="resolved">Resolvida</option>
                <option value="closed">Encerrada</option>
              </select>
              <select value={conversationStage} onChange={(event) => setConversationStage(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="novo">Novo</option>
                <option value="qualificacao">Qualificação</option>
                <option value="proposta">Proposta</option>
                <option value="negociacao">Negociação</option>
                <option value="cliente">Cliente</option>
                <option value="perdido">Perdido</option>
              </select>
              <select value={conversationPriority} onChange={(event) => setConversationPriority(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
              <Button onClick={saveConversationStatus} disabled={Boolean(loading) || !selectedConversation} className="w-full">Atualizar status</Button>
              <Button onClick={() => queueAction("awaiting_customer")} disabled={Boolean(loading) || !selectedConversation} variant="outline" className="w-full">Marcar aguardando cliente</Button>
              <Button onClick={() => queueAction("closed")} disabled={Boolean(loading) || !selectedConversation} variant="outline" className="w-full">Encerrar conversa</Button>
              <input value={transferReason} onChange={(event) => setTransferReason(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Motivo da transferência" />
              <Button onClick={transferToQueue} disabled={Boolean(loading) || !selectedConversation || transferReason.trim().length < 3} variant="outline" className="w-full">Transferir para fila</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5" />Notas</CardTitle>
              <CardDescription>Observações internas do atendimento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} className="min-h-24 w-full rounded-2xl border px-4 py-3 text-sm" placeholder="Adicionar nota interna..." />
              <Button onClick={saveNote} disabled={Boolean(loading) || !noteBody.trim() || !selectedConversation} className="w-full">Salvar nota</Button>
              <div className="space-y-2">
                {notes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p> : notes.map((note) => (
                  <div key={note.id} className="rounded-xl border bg-slate-50 p-3 text-sm">
                    <p>{note.note}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(note.created_at)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
