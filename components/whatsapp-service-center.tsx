"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bot, Clock, Download, FileText, GitBranch, MessageCircle, RefreshCcw, Search, Send, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactCreateDialog } from "@/components/contact-create-dialog";
import { phoneFromChatId } from "@/lib/phone";

type Conversation = {
  id: string;
  external_chat_id: string;
  name: string | null;
  is_group: boolean;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  last_message_direction?: "inbound" | "outbound" | string | null;
  requires_human?: boolean | null;
  pending_reason?: string | null;
  sla_status?: "pending" | "breached" | "ok" | string | null;
  sla_due_at?: string | null;
  watchdog_checked_at?: string | null;
  crm_contacts?: { id: string; name: string | null; phone: string | null; email: string | null; company: string | null; consent_status: string | null } | null;
  latest_message?: { body: string | null; direction: "inbound" | "outbound"; created_at: string } | null;
};

type RawPayload = {
  type?: string;
  mediaType?: string;
  mimeType?: string;
  hasMedia?: boolean;
  media?: {
    data?: string;
    mimetype?: string;
    mimeType?: string;
    filename?: string;
    caption?: string;
    dataOmitted?: boolean;
    dataLength?: number;
  } | null;
} | null;

type Message = {
  id: string;
  external_message_id: string | null;
  direction: "inbound" | "outbound";
  from_id: string | null;
  to_id: string | null;
  body: string | null;
  message_type: string | null;
  raw_payload?: RawPayload;
  media_summary?: string | null;
  has_media?: boolean | null;
  created_at: string;
};

type QuickReply = {
  id: string;
  title: string;
  body: string;
  category: string;
  tags?: string[];
  usage_count?: number;
};

type FlowStep = {
  id: string;
  step_order: number;
  title: string;
  message_body: string;
  wait_minutes: number;
  step_type: string;
};

type ConversationFlow = {
  id: string;
  name: string;
  description?: string | null;
  trigger_type: string;
  status: string;
  tags?: string[];
  conversation_flow_steps?: FlowStep[];
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha ao carregar dados");
  return data;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function getConversationName(conversation?: Conversation | null) {
  if (!conversation) return "Selecione uma conversa";
  return conversation.crm_contacts?.name || conversation.name || conversation.external_chat_id;
}

function personalize(text: string, conversation?: Conversation | null) {
  return text
    .replaceAll("{nome}", getConversationName(conversation))
    .replaceAll("{telefone}", conversation?.crm_contacts?.phone || conversation?.external_chat_id || "")
    .replaceAll("{empresa}", conversation?.crm_contacts?.company || "");
}

function getInlineMediaSource(message: Message) {
  const rawPayload = message.raw_payload;
  const media = rawPayload?.media;
  const data = media?.data;
  if (!data) return null;

  const mimeType = media?.mimetype || media?.mimeType || rawPayload?.mimeType || "image/webp";
  return data.startsWith("data:") ? data : `data:${mimeType};base64,${data}`;
}

function getMediaLabel(message: Message) {
  const type = message.message_type || message.raw_payload?.mediaType || message.raw_payload?.type;
  if (type === "sticker") return "Figurinha";
  if (type === "image") return "Imagem";
  if (type === "audio" || type === "ptt") return "Áudio";
  if (type === "video") return "Vídeo";
  if (type === "document") return "Documento";
  return message.media_summary || "Mídia";
}

function parseTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function minutesSince(value?: string | null) {
  const time = parseTime(value);
  if (!time) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 60000));
}

function formatWaiting(value?: string | null) {
  const minutes = minutesSince(value);
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function getPendingReasonLabel(reason?: string | null) {
  if (reason === "unanswered_inbound") return "Cliente sem resposta";
  if (reason === "media_requires_human") return "Mídia recebida sem resposta";
  if (reason === "sticker_requires_human") return "Figurinha recebida sem resposta";
  if (reason === "non_text_requires_human") return "Conteúdo exige atendimento humano";
  return reason || "Precisa de atendimento humano";
}

function isUnanswered(conversation: Conversation) {
  const inbound = parseTime(conversation.last_inbound_at || (conversation.latest_message?.direction === "inbound" ? conversation.latest_message.created_at : null));
  const outbound = parseTime(conversation.last_outbound_at || (conversation.latest_message?.direction === "outbound" ? conversation.latest_message.created_at : null));
  return inbound > 0 && inbound > outbound;
}

function getQueueDate(conversation: Conversation) {
  return conversation.last_inbound_at || conversation.sla_due_at || conversation.last_message_at || conversation.latest_message?.created_at || null;
}

function getQueueRank(conversation: Conversation) {
  if (conversation.sla_status === "breached") return 0;
  if (isUnanswered(conversation)) return 1;
  if (conversation.requires_human) return 2;
  if (conversation.sla_status === "pending") return 3;
  return 4;
}

function sortConversationsForQueue(items: Conversation[]) {
  return [...items].sort((a, b) => {
    const rankDiff = getQueueRank(a) - getQueueRank(b);
    if (rankDiff !== 0) return rankDiff;

    const aTime = parseTime(getQueueDate(a));
    const bTime = parseTime(getQueueDate(b));
    if (aTime && bTime && aTime !== bTime) return aTime - bTime;
    if (aTime !== bTime) return aTime ? -1 : 1;
    return getConversationName(a).localeCompare(getConversationName(b), "pt-BR");
  });
}

function playAlertSound() {
  if (typeof window === "undefined") return;
  const AudioContextConstructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;

  const audioContext = new AudioContextConstructor();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.12);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.32);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.34);
}

export function WhatsappServiceCenter() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [conversationFlows, setConversationFlows] = useState<ConversationFlow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [query, setQuery] = useState("");
  const [queueFilter, setQueueFilter] = useState<"all" | "breached" | "human" | "unanswered" | "groups" | "individuals">("all");
  const [quickReplyQuery, setQuickReplyQuery] = useState("");
  const [flowQuery, setFlowQuery] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [watchdogRunning, setWatchdogRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastAlertKey, setLastAlertKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveContactOpen, setSaveContactOpen] = useState(false);

  const selectedConversation = useMemo(() => conversations.find((conversation) => conversation.id === selectedConversationId) || conversations[0], [conversations, selectedConversationId]);

  const queueStats = useMemo(() => {
    const breached = conversations.filter((item) => item.sla_status === "breached").length;
    const requiresHuman = conversations.filter((item) => item.requires_human).length;
    const unanswered = conversations.filter(isUnanswered).length;
    const waitingConversations = conversations.filter((item) => item.sla_status === "breached" || item.requires_human || isUnanswered(item));
    const oldest = waitingConversations
      .map((item) => parseTime(getQueueDate(item)))
      .filter(Boolean)
      .sort((a, b) => a - b)[0];

    return {
      breached,
      requiresHuman,
      unanswered,
      oldestWaitingLabel: oldest ? formatWaiting(new Date(oldest).toISOString()) : "—",
    };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    let items = conversations;

    if (queueFilter === "breached") items = items.filter((conversation) => conversation.sla_status === "breached");
    if (queueFilter === "human") items = items.filter((conversation) => conversation.requires_human);
    if (queueFilter === "unanswered") items = items.filter(isUnanswered);
    if (queueFilter === "groups") items = items.filter((conversation) => conversation.is_group);
    if (queueFilter === "individuals") items = items.filter((conversation) => !conversation.is_group);

    if (term) {
      items = items.filter((conversation) => [conversation.name, conversation.external_chat_id, conversation.crm_contacts?.name, conversation.crm_contacts?.phone, conversation.latest_message?.body, conversation.pending_reason]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term));
    }

    return sortConversationsForQueue(items);
  }, [conversations, query, queueFilter]);

  const filteredQuickReplies = useMemo(() => {
    const term = quickReplyQuery.trim().toLowerCase();
    if (!term) return quickReplies.slice(0, 8);
    return quickReplies.filter((reply) => [reply.title, reply.body, reply.category, ...(reply.tags || [])].join(" ").toLowerCase().includes(term)).slice(0, 8);
  }, [quickReplies, quickReplyQuery]);

  const filteredFlows = useMemo(() => {
    const term = flowQuery.trim().toLowerCase();
    const activeFlows = conversationFlows.filter((flow) => flow.status === "active");
    if (!term) return activeFlows.slice(0, 5);
    return activeFlows.filter((flow) => [flow.name, flow.description, flow.trigger_type, ...(flow.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(term)).slice(0, 5);
  }, [conversationFlows, flowQuery]);

  async function loadConversations() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; conversations: Conversation[] }>("/api/whatsapp-messages/conversations");
      const sorted = sortConversationsForQueue(data.conversations || []);
      setConversations(sorted);
      const firstId = selectedConversationId || sorted[0]?.id || "";
      setSelectedConversationId(firstId);
      if (firstId) await loadMessages(firstId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuickReplies() {
    try {
      const data = await readJson<{ ok: boolean; quickReplies: QuickReply[] }>("/api/quick-replies");
      setQuickReplies(data.quickReplies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar respostas rápidas");
    }
  }

  async function loadConversationFlows() {
    try {
      const data = await readJson<{ ok: boolean; flows: ConversationFlow[] }>("/api/conversation-flows");
      setConversationFlows(data.flows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar fluxos de conversa");
    }
  }

  async function loadMessages(conversationId: string) {
    if (!conversationId) return;
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; messages: Message[] }>(`/api/whatsapp-messages/conversations/${conversationId}/messages`);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar mensagens");
    }
  }

  async function selectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setReplyBody("");
    setNotice(null);
    await loadMessages(conversationId);
  }

  async function syncSelectedHistory() {
    if (!selectedConversation?.external_chat_id) return;
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      await readJson("/api/whatsapp-web/chats/import-history", {
        method: "POST",
        body: JSON.stringify({ chatId: selectedConversation.external_chat_id, limit: 100 }),
      });
      await loadConversations();
      setNotice("Histórico sincronizado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar histórico");
    } finally {
      setSyncing(false);
    }
  }

  async function runWatchdog() {
    setWatchdogRunning(true);
    setError(null);
    setNotice(null);
    try {
      const data = await readJson<{ ok: boolean; checkedAt: string; staleMinutes: number; scannedConversations: number; requiresHuman: number; breached: number; pending: number }>("/api/whatsapp-web/watchdog?staleMinutes=5");
      await loadConversations();
      const alertKey = `${data.breached}:${data.requiresHuman}:${data.pending}:${data.checkedAt}`;
      if (soundEnabled && alertKey !== lastAlertKey && (data.breached > 0 || data.requiresHuman > 0)) {
        playAlertSound();
        setLastAlertKey(alertKey);
      }
      setNotice(`Pendências verificadas: ${data.breached} atrasada(s), ${data.requiresHuman} precisa(m) humano.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao verificar pendências");
    } finally {
      setWatchdogRunning(false);
    }
  }

  function enableSound() {
    setSoundEnabled(true);
    playAlertSound();
    setNotice("Alertas sonoros ativados nesta aba.");
  }

  async function applyQuickReply(reply: QuickReply) {
    setReplyBody((current) => current ? `${current}\n\n${personalize(reply.body, selectedConversation)}` : personalize(reply.body, selectedConversation));
    setNotice(`Resposta rápida aplicada: ${reply.title}`);
    try {
      await readJson("/api/quick-replies/use", {
        method: "POST",
        body: JSON.stringify({ id: reply.id }),
      });
      setQuickReplies((current) => current.map((item) => item.id === reply.id ? { ...item, usage_count: Number(item.usage_count || 0) + 1 } : item));
    } catch {
      // uso não é crítico para o envio; não bloquear a operação
    }
  }

  async function applyFlowStep(flow: ConversationFlow, step: FlowStep) {
    if (!selectedConversation?.id) return;
    setReplyBody((current) => current ? `${current}\n\n${personalize(step.message_body, selectedConversation)}` : personalize(step.message_body, selectedConversation));
    setNotice(`Fluxo aplicado: ${flow.name} • etapa ${step.step_order}`);
    try {
      await readJson(`/api/conversation-flows/${flow.id}/start`, {
        method: "POST",
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          contactId: selectedConversation.crm_contacts?.id || null,
          metadata: { appliedStepId: step.id, appliedFrom: "whatsapp_service_center" },
        }),
      });
    } catch {
      // iniciar sessão é útil, mas não deve bloquear a aplicação da mensagem
    }
  }

  function attendNext() {
    const next = filteredConversations[0];
    if (next) selectConversation(next.id);
  }

  async function sendReply() {
    if (!selectedConversation?.id || !replyBody.trim()) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const data = await readJson<{ ok: boolean; message: Message }>(`/api/whatsapp-messages/conversations/${selectedConversation.id}/send`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      setMessages((current) => [...current, data.message]);
      setReplyBody("");
      setNotice("Mensagem enviada e registrada no Supabase.");
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    loadConversations();
    loadQuickReplies();
    loadConversationFlows();
  }, []);

  return (
    <div className="space-y-6">
      <ContactCreateDialog
        open={saveContactOpen}
        onClose={() => setSaveContactOpen(false)}
        onSaved={(contact, existing) => {
          setSaveContactOpen(false);
          setNotice(existing ? "Este contato já existe na base." : `Contato "${contact.name || contact.phone}" salvo.`);
          loadConversations();
        }}
        initialPhone={selectedConversation?.external_chat_id ? phoneFromChatId(selectedConversation.external_chat_id) : ""}
        initialName={selectedConversation?.crm_contacts?.name || selectedConversation?.name || ""}
        defaultSource="whatsapp"
        defaultTags={["whatsapp"]}
      />
      <Card className="border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/70">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl"><MessageCircle className="h-6 w-6 text-emerald-700" />Central de atendimento WhatsApp</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">Fila operacional por SLA: conversas antigas e atrasadas aparecem primeiro; chamadas novas entram no final da fila.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={attendNext} disabled={filteredConversations.length === 0} className="bg-emerald-700 hover:bg-emerald-800"><UserPlus className="mr-2 h-4 w-4" />Atender próximo</Button>
              <Button onClick={loadConversations} disabled={loading} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
              <Button onClick={runWatchdog} disabled={watchdogRunning} variant="outline"><Clock className="mr-2 h-4 w-4" />Verificar pendências</Button>
              <Button onClick={enableSound} disabled={soundEnabled} variant="outline">{soundEnabled ? "Som ativo" : "Ativar som"}</Button>
              <Button asChild variant="outline"><Link href="/whatsapp-import"><Download className="mr-2 h-4 w-4" />Importar WhatsApp</Link></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-6">
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Conversas</p><p className="text-2xl font-semibold">{conversations.length}</p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Grupos</p><p className="text-2xl font-semibold">{conversations.filter((item) => item.is_group).length}</p></div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-xs text-red-700">SLA estourado</p><p className="text-2xl font-semibold text-red-800">{queueStats.breached}</p></div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-amber-700">Precisa humano</p><p className="text-2xl font-semibold text-amber-800">{queueStats.requiresHuman}</p></div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs text-orange-700">Sem resposta</p><p className="text-2xl font-semibold text-orange-800">{queueStats.unanswered}</p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Mais antigo</p><p className="text-2xl font-semibold">{queueStats.oldestWaitingLabel}</p></div>
          </div>
          {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {notice ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div> : null}
        </CardContent>
      </Card>

      <div className="grid min-h-[760px] gap-6 xl:grid-cols-[360px_1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Fila de atendimento</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conversa" className="w-full rounded-xl border bg-white py-2 pl-9 pr-3 text-sm" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant={queueFilter === "all" ? "default" : "outline"} onClick={() => setQueueFilter("all")}>Todas</Button>
              <Button size="sm" variant={queueFilter === "breached" ? "default" : "outline"} onClick={() => setQueueFilter("breached")}>Atrasadas</Button>
              <Button size="sm" variant={queueFilter === "human" ? "default" : "outline"} onClick={() => setQueueFilter("human")}>Precisa humano</Button>
              <Button size="sm" variant={queueFilter === "unanswered" ? "default" : "outline"} onClick={() => setQueueFilter("unanswered")}>Sem resposta</Button>
              <Button size="sm" variant={queueFilter === "groups" ? "default" : "outline"} onClick={() => setQueueFilter("groups")}>Grupos</Button>
              <Button size="sm" variant={queueFilter === "individuals" ? "default" : "outline"} onClick={() => setQueueFilter("individuals")}>Individuais</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[680px] divide-y overflow-auto">
              {filteredConversations.map((conversation) => {
                const selected = selectedConversation?.id === conversation.id;
                const isBreached = conversation.sla_status === "breached";
                const needsHuman = conversation.requires_human;
                const lastInboundIsLatest = conversation.latest_message?.direction === "inbound";
                const waitingRef = conversation.last_inbound_at || (lastInboundIsLatest ? conversation.latest_message?.created_at : null);
                const waitLabel = formatWaiting(waitingRef);

                let rowBg = selected ? "bg-emerald-50" : "bg-white";
                if (isBreached) rowBg = selected ? "bg-red-100" : "bg-red-50";

                return (
                  <button key={conversation.id} onClick={() => selectConversation(conversation.id)} className={`w-full border-l-4 p-4 text-left transition hover:brightness-95 ${rowBg} ${isBreached ? "border-l-red-500" : needsHuman ? "border-l-amber-400" : conversation.is_group ? "border-l-blue-400" : "border-l-transparent"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">{getConversationName(conversation)}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{conversation.latest_message?.body || "Sem mensagem salva ainda"}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">{formatDate(conversation.last_message_at || conversation.latest_message?.created_at)}</span>
                        {waitLabel !== "—" ? <span className={`text-[11px] font-medium ${isBreached ? "text-red-600" : "text-amber-600"}`}>esperando há {waitLabel}</span> : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {conversation.is_group ? <Badge variant="outline" className="border-blue-300 text-blue-700">Grupo</Badge> : <Badge variant="secondary">Contato</Badge>}
                      {isBreached ? <Badge className="bg-red-600 text-white">SLA estourado</Badge> : null}
                      {needsHuman && !isBreached ? <Badge className="bg-amber-500 text-white">Precisa humano</Badge> : null}
                      {lastInboundIsLatest && !needsHuman && !isBreached ? <Badge variant="outline" className="border-orange-300 text-orange-700">Aguardando resposta</Badge> : null}
                      {conversation.unread_count ? <Badge variant="destructive">{conversation.unread_count}</Badge> : null}
                    </div>
                  </button>
                );
              })}
              {filteredConversations.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</div> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{getConversationName(selectedConversation)}</CardTitle>
                <CardDescription>{selectedConversation?.external_chat_id || "Selecione uma conversa"}</CardDescription>
              </div>
              <Button onClick={syncSelectedHistory} disabled={syncing || !selectedConversation} variant="outline"><Download className="mr-2 h-4 w-4" />Sincronizar histórico</Button>
            </div>
          </CardHeader>
          <CardContent className="bg-slate-50 p-4">
            <div className="max-h-[460px] space-y-3 overflow-auto pr-2">
              {messages.map((message) => {
                const outbound = message.direction === "outbound";
                const mediaSource = getInlineMediaSource(message);
                const mediaLabel = getMediaLabel(message);
                return (
                  <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${outbound ? "bg-emerald-600 text-white" : "bg-white text-slate-900"}`}>
                      {mediaSource ? (
                        <div className="space-y-2">
                          <img src={mediaSource} alt={mediaLabel} className="max-h-48 max-w-[220px] rounded-xl object-contain" />
                          {message.body && !message.body.startsWith("[") ? <p className="whitespace-pre-wrap leading-6">{message.body}</p> : null}
                        </div>
                      ) : message.has_media ? (
                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/70 p-3 text-sm text-slate-700">
                          <FileText className="h-4 w-4" />
                          <span>{message.body || `[${mediaLabel} recebida]`}</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-6">{message.body || "Mensagem sem texto"}</p>
                      )}
                      <p className={`mt-2 text-[11px] ${outbound ? "text-emerald-50" : "text-muted-foreground"}`}>{formatDate(message.created_at)} • {message.message_type || "text"}</p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">Nenhuma mensagem salva para esta conversa. Use “Sincronizar histórico”.</div> : null}
            </div>
            <div className="mt-4 rounded-2xl border bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-muted-foreground">Responder pela central</label>
                <Link href="/quick-replies" className="text-xs font-medium text-emerald-700">Gerenciar respostas</Link>
              </div>
              <textarea value={replyBody} onChange={(event) => setReplyBody(event.target.value)} rows={4} maxLength={4000} placeholder="Digite a mensagem para enviar pelo WhatsApp conectado..." className="mt-2 w-full resize-none rounded-xl border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">{replyBody.length}/4000 caracteres</span>
                <Button onClick={sendReply} disabled={sending || !selectedConversation || !replyBody.trim()}><Send className="mr-2 h-4 w-4" />Enviar mensagem</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5" />Controle anti-vácuo</CardTitle>
              <CardDescription>Esta conversa só sai da fila quando houver resposta ou resolução registrada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">SLA</p><p className="font-medium">{selectedConversation?.sla_status || "—"}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Motivo</p><p className="font-medium">{getPendingReasonLabel(selectedConversation?.pending_reason)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Última entrada</p><p className="font-medium">{formatDate(selectedConversation?.last_inbound_at)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Última saída</p><p className="font-medium">{formatDate(selectedConversation?.last_outbound_at)}</p></div>
              <Button onClick={runWatchdog} disabled={watchdogRunning} variant="outline" className="w-full"><Clock className="mr-2 h-4 w-4" />Verificar pendências</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5" />Contato / conversa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{getConversationName(selectedConversation)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Telefone/Chat ID</p><p className="break-all font-medium">{selectedConversation?.crm_contacts?.phone || selectedConversation?.external_chat_id || "—"}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Empresa</p><p className="font-medium">{selectedConversation?.crm_contacts?.company || "—"}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Consentimento</p><p className="font-medium">{selectedConversation?.crm_contacts?.consent_status || "unknown"}</p></div>
              {!selectedConversation?.crm_contacts && selectedConversation?.external_chat_id && (
                <Button onClick={() => setSaveContactOpen(true)} className="w-full bg-emerald-700 hover:bg-emerald-800">
                  <UserPlus className="mr-2 h-4 w-4" />Salvar contato
                </Button>
              )}
              <Button asChild variant="outline" className="w-full"><Link href="/contacts"><UserPlus className="mr-2 h-4 w-4" />Abrir contatos</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><GitBranch className="h-5 w-5" />Fluxos de conversa</CardTitle>
              <CardDescription>Aplique etapas do fluxo no campo de resposta.</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input value={flowQuery} onChange={(event) => setFlowQuery(event.target.value)} placeholder="Buscar fluxo" className="w-full rounded-xl border bg-white py-2 pl-9 pr-3 text-sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredFlows.map((flow) => (
                <div key={flow.id} className="rounded-2xl border bg-white p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-950">{flow.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{flow.description || "Sem descrição"}</p>
                    </div>
                    <Badge variant="outline">{flow.conversation_flow_steps?.length || 0}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(flow.conversation_flow_steps || []).slice(0, 3).map((step) => (
                      <button key={step.id} onClick={() => applyFlowStep(flow, step)} className="w-full rounded-xl border bg-slate-50 p-2 text-left text-xs transition hover:bg-emerald-50">
                        <span className="font-medium">{step.step_order}. {step.title}</span>
                        <span className="block text-muted-foreground">{step.step_type} • aguarda {step.wait_minutes} min</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filteredFlows.length === 0 ? <div className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">Nenhum fluxo encontrado.</div> : null}
              <Button asChild variant="outline" className="w-full justify-start"><Link href="/conversation-flows"><GitBranch className="mr-2 h-4 w-4" />Gerenciar fluxos</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" />Respostas rápidas</CardTitle>
              <CardDescription>Clique para aplicar no campo de resposta.</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input value={quickReplyQuery} onChange={(event) => setQuickReplyQuery(event.target.value)} placeholder="Buscar resposta" className="w-full rounded-xl border bg-white py-2 pl-9 pr-3 text-sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredQuickReplies.map((reply) => (
                <button key={reply.id} onClick={() => applyQuickReply(reply)} className="w-full rounded-2xl border bg-white p-3 text-left text-sm transition hover:bg-emerald-50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-950">{reply.title}</p>
                    <Badge variant="outline">{reply.category}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{reply.body}</p>
                </button>
              ))}
              {filteredQuickReplies.length === 0 ? <div className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">Nenhuma resposta rápida encontrada.</div> : null}
              <Button variant="outline" className="w-full justify-start" disabled><Bot className="mr-2 h-4 w-4" />Gerar resposta com IA</Button>
              <Button variant="outline" className="w-full justify-start" disabled>Criar tarefa de follow-up</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5" />Fluxo recomendado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Sincronize o histórico da conversa.</p>
              <p>2. Confira se o contato está no CRM.</p>
              <p>3. Aplique um fluxo, resposta rápida ou escreva manualmente.</p>
              <p>4. Revise e envie resposta individual pela central.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
