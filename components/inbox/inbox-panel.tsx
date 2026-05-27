"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, MessageCircle, RefreshCcw, ShieldCheck, Send, UserRound, Tags, StickyNote, Save, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  stage?: string | null;
  priority?: string | null;
  unread_count: number;
  last_message_at?: string | null;
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

function tagsToInput(tags?: string[] | null) {
  return (tags || []).join(", ");
}

export function InboxPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
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
  const [syncLimit, setSyncLimit] = useState(50);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  function hydrateForms(conversation: Conversation | null) {
    const contact = conversation?.crm_contacts;
    setContactName(contact?.name || "");
    setContactEmail(contact?.email || "");
    setContactCompany(contact?.company || "");
    setContactConsent(contact?.consent_status || "unknown");
    setContactTags(tagsToInput(contact?.tags));
    setConversationStatus(conversation?.status || "open");
    setConversationStage(conversation?.stage || "novo");
    setConversationPriority(conversation?.priority || "normal");
  }

  async function loadConversations(keepSelection = true) {
    setLoading("conversations");
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; conversations: Conversation[] }>("/api/inbox/conversations");
      const list = data.conversations || [];
      setConversations(list);
      const nextId = keepSelection && selectedConversationId ? selectedConversationId : list[0]?.id || "";
      if (nextId) {
        setSelectedConversationId(nextId);
        const conversation = list.find((item) => item.id === nextId) || null;
        hydrateForms(conversation);
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

  async function syncSelectedConversationMessages() {
    if (!selectedConversation) return;
    setLoading("sync");
    setError(null);
    setSuccess(null);
    try {
      const data = await readJson<{ ok: boolean; savedMessages: number; scanned: number }>("/api/whatsapp-web/sync-chat-messages", {
        method: "POST",
        body: JSON.stringify({ chatId: selectedConversation.external_chat_id, limit: syncLimit }),
      });
      setSuccess(`Sincronização concluída: ${data.savedMessages} mensagens salvas de ${data.scanned} lidas.`);
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar conversa");
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
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" />Inbox completo</CardTitle>
              <CardDescription>Atendimento manual com leitura, resposta, sincronização, CRM, notas, tags, consentimento e status.</CardDescription>
            </div>
            <Button onClick={() => loadConversations(true)} disabled={Boolean(loading)} variant="outline" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" />Modo seguro</div>
            <p className="mt-1">O Inbox não importa conversas pessoais automaticamente. Ele exibe e opera apenas conversas/mensagens já salvas manualmente.</p>
          </div>
        </CardContent>
      </Card>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{success}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle>Conversas</CardTitle>
            <CardDescription>{conversations.length} conversa(s) no banco.</CardDescription>
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
                          <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.external_chat_id}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(conversation.last_message_at)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant={conversation.is_group ? "secondary" : "outline"}>{conversation.is_group ? "Grupo" : "Contato"}</Badge>
                        <Badge variant="outline">{conversation.status}</Badge>
                        <Badge variant="secondary">{conversation.stage || "novo"}</Badge>
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
                  <input type="number" min={10} max={200} value={syncLimit} onChange={(event) => setSyncLimit(Number(event.target.value))} className="w-24 rounded-xl border px-3 py-2 text-sm" />
                  <Button onClick={syncSelectedConversationMessages} disabled={Boolean(loading)} size="sm" variant="outline"><RotateCw className="mr-2 h-4 w-4" />Sincronizar esta conversa</Button>
                </div>

                <div className="flex-1 space-y-3 overflow-auto bg-slate-50 p-4">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">Sem mensagens salvas. Clique em “Sincronizar esta conversa”.</div>
                  ) : messages.map((message) => {
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
                  <input value={selectedConversation.crm_contacts?.phone || ""} disabled className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm" placeholder="Telefone" />
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
                <option value="open">Aberta</option>
                <option value="pending">Pendente</option>
                <option value="resolved">Resolvida</option>
                <option value="archived">Arquivada</option>
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
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
              <Button onClick={saveConversationStatus} disabled={Boolean(loading) || !selectedConversation} className="w-full">Atualizar status</Button>
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
