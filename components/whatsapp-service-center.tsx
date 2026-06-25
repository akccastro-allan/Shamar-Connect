"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Clock, Download, FileText, GitBranch, MessageCircle, RefreshCcw, Search, Send, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactCreateDialog } from "@/components/contact-create-dialog";
import { phoneFromChatId, formatPhoneDisplay } from "@/lib/phone";

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
  channel_id?: string | null;
  provider?: string | null;
  crm_contacts?: { id: string; name: string | null; phone: string | null; email: string | null; company: string | null; consent_status: string | null } | null;
  channels?: { id: string; name: string; slug: string; color: string; transcription_enabled?: boolean | null } | null;
  latest_message?: { body: string | null; direction: "inbound" | "outbound"; created_at: string } | null;
  assigned_to?: string | null;
  assigned_name?: string | null;
  department_id?: string | null;
  departments?: { id: string; name: string; color: string } | null;
};

type MeInfo = { appUserId: string; role: string; departmentId: string | null; isSupervisor: boolean };
type Department = { id: string; name: string; color: string };

type ChannelFilter = { id: string; name: string; color: string };

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
  media_kind?: string | null;
  media_status?: string | null;
  media_duration_seconds?: number | null;
  media_mime_type?: string | null;
  transcription_status?: string | null;
  transcription_text?: string | null;
  transcription_error?: string | null;
  delivery_status?: string | null;
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
  return conversation.crm_contacts?.name || conversation.name || phoneFromChatId(conversation.external_chat_id) || conversation.external_chat_id;
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

/** Hook que busca signed URL para mídia. retry() recarrega. */
function useMediaUrl(messageId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!messageId) return;
    setLoading(true);
    setError(null);
    setUrl(null);
    fetch(`/api/whatsapp-messages/media/${messageId}`)
      .then((r) => r.json() as Promise<{ ok: boolean; url?: string; error?: string }>)
      .then((data) => {
        if (data.ok && data.url) setUrl(data.url);
        else setError(data.error || "Não foi possível carregar a mídia agora.");
      })
      .catch(() => setError("Não foi possível carregar a mídia agora."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  return { url, loading, error, retry };
}

/**
 * Card de áudio com player + transcrição sob demanda.
 * "Ver transcrição" / "Reprocessar" disparam POST /transcribe.
 * Nunca transcreve automaticamente ao abrir.
 */
function AudioCard({
  message,
  url,
  loading,
  onRetryMedia,
  duration,
  transcriptionEnabled,
}: {
  message: Message;
  url: string | null;
  loading: boolean;
  onRetryMedia: () => void;
  duration: string;
  transcriptionEnabled: boolean;
}) {
  const [transcribing, setTranscribing] = useState(false);
  const [localText, setLocalText] = useState<string | null>(message.transcription_text || null);
  const [localStatus, setLocalStatus] = useState<string | null>(message.transcription_status || null);
  const [localError, setLocalError] = useState<string | null>(message.transcription_error || null);

  async function requestTranscription() {
    setTranscribing(true);
    setLocalStatus("processing");
    setLocalError(null);
    try {
      const r = await fetch(`/api/whatsapp-messages/messages/${message.id}/transcribe`, {
        method: "POST",
      });
      const data = (await r.json()) as { ok: boolean; status?: string; text?: string | null; error?: string | null };
      if (data.ok && data.text) {
        setLocalText(data.text);
        setLocalStatus("done");
      } else {
        setLocalStatus("failed");
        setLocalError(data.error || "Não foi possível transcrever.");
      }
    } catch {
      setLocalStatus("failed");
      setLocalError("Não foi possível transcrever. Tente novamente.");
    } finally {
      setTranscribing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-blue-50 p-3">
      <span className="text-xs font-medium text-slate-700">🎧 Áudio recebido — {duration}</span>

      {url ? (
        <audio controls className="h-8 w-full">
          <source src={url} type={message.media_mime_type || "audio/ogg"} />
          Seu navegador não suporta áudio.
        </audio>
      ) : loading ? (
        <p className="text-xs text-slate-500">Carregando áudio…</p>
      ) : (
        <MediaError onRetry={onRetryMedia} />
      )}

      {/* Seção de transcrição — só visível quando habilitada no canal */}
      {transcriptionEnabled && (
        <>
          {localStatus === "done" && localText ? (
            <div className="rounded-lg bg-white p-2 text-xs">
              <p className="text-slate-700">{localText}</p>
              <p className="mt-1 text-[10px] italic text-slate-500">
                Transcrição automática. Confira o áudio em caso de dúvida.
              </p>
              <button
                onClick={requestTranscription}
                disabled={transcribing}
                className="mt-1 text-[10px] font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                Reprocessar
              </button>
            </div>
          ) : localStatus === "processing" || transcribing ? (
            <p className="text-xs text-slate-600">Transcrevendo…</p>
          ) : localStatus === "failed" ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-red-600">{localError || "Falha ao transcrever."}</p>
              <button
                onClick={requestTranscription}
                disabled={transcribing}
                className="self-start text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                Reprocessar
              </button>
            </div>
          ) : (
            <button
              onClick={requestTranscription}
              disabled={transcribing}
              className="self-start text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
            >
              Ver transcrição
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Bloco de erro padrão para todas as mídias. */
function MediaError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed bg-slate-50 p-3 text-center">
      <p className="text-xs text-slate-600">Mídia recebida, mas não foi possível carregar agora.</p>
      <button
        onClick={onRetry}
        className="mx-auto rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
      >
        Tentar novamente
      </button>
    </div>
  );
}

/**
 * Componente MediaCard — renderiza figurinha/imagem/áudio/documento com signed URL.
 * Recebe message.id (whatsapp_messages.id); a rota /media/[id] resolve o message_media.
 * transcriptionEnabled: controlado por channels.transcription_enabled (add-on pago).
 */
function MediaCard({ message, transcriptionEnabled = false }: { message: Message; transcriptionEnabled?: boolean }) {
  const { url, loading, error, retry } = useMediaUrl(message.id);
  const kind = message.media_kind || message.message_type;

  if (kind === "sticker") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-slate-50 p-4">
        {url ? (
          <img src={url} alt="Figurinha" className="h-24 w-24 object-contain" />
        ) : loading ? (
          <p className="text-xs text-slate-500">Figurinha (carregando…)</p>
        ) : (
          <MediaError onRetry={retry} />
        )}
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="flex flex-col gap-2">
        {url ? (
          <img src={url} alt="Imagem" className="max-h-48 max-w-[220px] rounded-xl object-contain" />
        ) : loading ? (
          <p className="text-xs text-slate-500">Imagem (carregando…)</p>
        ) : (
          <MediaError onRetry={retry} />
        )}
        {message.body && !message.body.startsWith("[") ? (
          <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
        ) : null}
      </div>
    );
  }

  if (kind === "audio" || kind === "ptt") {
    const duration = message.media_duration_seconds ? `${Math.round(message.media_duration_seconds)}s` : "—";
    return (
      <AudioCard
        message={message}
        url={url}
        loading={loading}
        onRetryMedia={retry}
        duration={duration}
        transcriptionEnabled={transcriptionEnabled}
      />
    );
  }

  if (kind === "document") {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-amber-50 p-3">
        <FileText className="h-5 w-5 text-amber-600" />
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-700">Documento recebido</p>
          <p className="text-[10px] text-slate-500">{message.media_mime_type || "Tipo desconhecido"}</p>
        </div>
        {url ? (
          <a href={url} download className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100">
            Baixar
          </a>
        ) : loading ? (
          <p className="text-xs text-slate-500">Carregando…</p>
        ) : (
          <button onClick={retry} className="text-xs font-medium text-blue-600 hover:underline">
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed bg-slate-50 p-3 text-xs text-slate-600">
      <FileText className="h-4 w-4" />
      <span>Mídia recebida</span>
    </div>
  );
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

function getSlaLabel(status?: string | null) {
  if (status === "breached") return "Atrasada";
  if (status === "pending") return "Aguardando";
  if (status === "ok") return "Em dia";
  return "—";
}

// Um telefone real tem 10–13 dígitos. IDs de @lid (14+) e de grupo (18) são
// descartados para nunca aparecerem como se fossem telefone.
function isRealPhone(raw?: string | null) {
  const d = String(raw || "").replace(/\D/g, "");
  return d.length >= 10 && d.length <= 13;
}

// Telefone legível da conversa. Grupos não têm número individual.
// O WhatsApp pode mascarar o número com @lid; nesse caso só exibimos um número
// que seja de fato válido — nunca os dígitos do @lid/ID de grupo.
function getConversationPhone(conversation?: Conversation | null) {
  if (!conversation || conversation.is_group) return "";
  if (isRealPhone(conversation.crm_contacts?.phone)) return formatPhoneDisplay(conversation.crm_contacts!.phone!);
  if (conversation.external_chat_id?.endsWith("@c.us")) {
    const fromChat = phoneFromChatId(conversation.external_chat_id);
    if (isRealPhone(fromChat)) return formatPhoneDisplay(fromChat);
  }
  return "";
}

function getConsentLabel(status?: string | null) {
  if (status === "granted" || status === "opt_in") return "Autorizado";
  if (status === "denied" || status === "opt_out") return "Não autorizado";
  return "Não informado";
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
  const [availableChannels, setAvailableChannels] = useState<ChannelFilter[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const selectedIdRef = useRef("");
  const [query, setQuery] = useState("");
  const [queueFilter, setQueueFilter] = useState<"all" | "breached" | "human" | "unanswered" | "groups" | "individuals">("all");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [me, setMe] = useState<MeInfo | null>(null);
  const [assignTab, setAssignTab] = useState<"mine" | "waiting" | "all">("waiting");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
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

  // Supervised AI state
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLogId, setAiLogId] = useState<string | null>(null);
  const [aiRiskLevel, setAiRiskLevel] = useState<string | null>(null);
  const [aiIntent, setAiIntent] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEditMode, setAiEditMode] = useState(false);
  const [aiEditBody, setAiEditBody] = useState("");

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

    if (channelFilter) items = items.filter((conversation) => conversation.channel_id === channelFilter);
    if (deptFilter) items = items.filter((conversation) => conversation.department_id === deptFilter);
    if (assignTab === "mine") items = items.filter((conversation) => conversation.assigned_to && conversation.assigned_to === me?.appUserId);
    else if (assignTab === "waiting") items = items.filter((conversation) => !conversation.assigned_to);
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
  }, [conversations, query, queueFilter, channelFilter, deptFilter, assignTab, me]);

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
      const [convData, channelsData] = await Promise.all([
        readJson<{ ok: boolean; conversations: Conversation[]; me?: MeInfo }>("/api/whatsapp-messages/conversations"),
        fetch("/api/channels").then((r) => r.json()).catch(() => ({ ok: false, channels: [] })),
      ]);
      if (convData.me) setMe(convData.me);
      const sorted = sortConversationsForQueue(convData.conversations || []);
      setConversations(sorted);
      if (channelsData.ok && channelsData.channels?.length) {
        setAvailableChannels(channelsData.channels);
      }
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

  async function loadMessages(conversationId: string, opts?: { silent?: boolean }) {
    if (!conversationId) return;
    if (!opts?.silent) setError(null);
    try {
      const data = await readJson<{ ok: boolean; messages: Message[] }>(`/api/whatsapp-messages/conversations/${conversationId}/messages`);
      setMessages(data.messages || []);
    } catch (err) {
      if (!opts?.silent) setError(err instanceof Error ? err.message : "Erro ao carregar mensagens");
    }
  }

  // Atualização automática em segundo plano: mantém a fila e a conversa aberta
  // sempre frescas sem o usuário precisar apertar "Atualizar". Não mexe no texto
  // que está sendo digitado nem na conversa selecionada.
  async function refreshSilently() {
    try {
      const [convData, channelsData] = await Promise.all([
        readJson<{ ok: boolean; conversations: Conversation[]; me?: MeInfo }>("/api/whatsapp-messages/conversations"),
        fetch("/api/channels").then((r) => r.json()).catch(() => ({ ok: false, channels: [] })),
      ]);
      if (convData.me) setMe(convData.me);
      setConversations(sortConversationsForQueue(convData.conversations || []));
      if (channelsData.ok && channelsData.channels?.length) {
        setAvailableChannels(channelsData.channels);
      }
      const currentId = selectedIdRef.current;
      if (currentId) await loadMessages(currentId, { silent: true });
    } catch {
      // Silencioso: falhas transitórias não devem incomodar quem está atendendo.
    }
  }

  async function loadDepartments() {
    try {
      const data = await readJson<{ ok: boolean; departments: Department[] }>("/api/departments");
      setDepartments((data.departments || []).filter((d) => (d as { is_active?: boolean }).is_active !== false));
    } catch {
      // setor é opcional; não bloqueia o atendimento.
    }
  }

  // Atribui (pega/solta) ou transfere de setor a conversa selecionada.
  async function assignConversation(payload: { assignTo?: string | null; departmentId?: string | null; requiresHuman?: boolean }) {
    if (!selectedConversation) return;
    setAssigning(true);
    setError(null);
    try {
      await readJson(`/api/whatsapp-messages/conversations/${selectedConversation.id}/assign`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atribuir conversa");
    } finally {
      setAssigning(false);
    }
  }

  async function selectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setReplyBody("");
    setNotice(null);
    setAiSuggestion(null);
    setAiLogId(null);
    setAiRiskLevel(null);
    setAiIntent(null);
    setAiEditMode(false);
    setAiEditBody("");
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

  async function suggestAiReply() {
    if (!selectedConversation?.id) return;
    setAiLoading(true);
    setAiSuggestion(null);
    setAiLogId(null);
    setAiEditMode(false);
    try {
      const data = await readJson<{
        ok: boolean;
        blocked?: boolean;
        blockedReason?: string;
        suggestion?: string;
        logId?: string;
        riskLevel?: string;
        intent?: string;
        error?: string;
      }>("/api/ai/whatsapp/suggest-reply", {
        method: "POST",
        body: JSON.stringify({ conversationId: selectedConversation.id, mode: "copilot" }),
      });
      if (!data.ok) throw new Error(data.error);
      if (data.blocked) {
        setNotice("IA bloqueada: " + (data.blockedReason || "grupo ou regra de segurança"));
        return;
      }
      setAiSuggestion(data.suggestion ?? null);
      setAiLogId(data.logId ?? null);
      setAiRiskLevel(data.riskLevel ?? null);
      setAiIntent(data.intent ?? null);
      setAiEditBody(data.suggestion ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar sugestão de IA");
    } finally {
      setAiLoading(false);
    }
  }

  async function sendAiReply(edited: boolean) {
    if (!aiLogId) return;
    const body = edited ? aiEditBody.trim() : (aiSuggestion || "");
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; messageId?: string; error?: string; requiresConfirmation?: boolean }>("/api/ai/whatsapp/send-approved", {
        method: "POST",
        body: JSON.stringify({ logId: aiLogId, finalResponse: body, editedFromSuggestion: edited }),
      });
      if (!data.ok) throw new Error(data.error);
      setAiSuggestion(null);
      setAiLogId(null);
      setAiEditMode(false);
      setAiEditBody("");
      setNotice("Resposta de IA aprovada e enviada.");
      await loadConversations();
      await loadMessages(selectedConversation!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar resposta de IA");
    } finally {
      setSending(false);
    }
  }

  async function ignoreAiReply() {
    setAiSuggestion(null);
    setAiLogId(null);
    setAiEditMode(false);
    setAiEditBody("");
    // Best-effort update log status to ignored
    if (aiLogId) {
      fetch("/api/ai/logs/ignore", {
        method: "POST",
        body: JSON.stringify({ logId: aiLogId }),
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }).catch(() => undefined);
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
    selectedIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    loadConversations();
    loadQuickReplies();
    loadConversationFlows();
    loadDepartments();
  }, []);

  // Polling automático: atualiza fila e conversa aberta a cada ~6s, somente com a
  // aba visível, para o atendente ver mensagens novas sem apertar nenhum botão.
  // Um único interval (deps []), limpo no unmount — sem duplicar.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshSilently();
    }, 6000);
    return () => window.clearInterval(interval);
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
              <CardDescription className="mt-2 max-w-3xl">As conversas que esperam há mais tempo aparecem no topo. Atenda de cima para baixo.</CardDescription>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Conversas</p><p className="text-2xl font-semibold">{conversations.length}</p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Grupos</p><p className="text-2xl font-semibold">{conversations.filter((item) => item.is_group).length}</p></div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-xs text-red-700">Atrasadas</p><p className="text-2xl font-semibold text-red-800">{queueStats.breached}</p></div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-amber-700">Precisam de você</p><p className="text-2xl font-semibold text-amber-800">{queueStats.requiresHuman}</p></div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs text-orange-700">Sem resposta</p><p className="text-2xl font-semibold text-orange-800">{queueStats.unanswered}</p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Espera mais longa</p><p className="text-2xl font-semibold">{queueStats.oldestWaitingLabel}</p></div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCcw className="h-3 w-3" />A fila e as conversas se atualizam sozinhas a cada poucos segundos.</p>
          {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {notice ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:min-h-[760px] xl:grid-cols-[360px_1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Fila de atendimento</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conversa" className="w-full rounded-xl border bg-white py-2 pl-9 pr-3 text-sm" />
            </div>

            {/* Abas por atribuição */}
            <div className="mt-3 inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
              {([["mine", "Minha fila"], ["waiting", "Aguardando"], ...(me?.isSupervisor ? [["all", "Todas"]] : [])] as [typeof assignTab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setAssignTab(key)}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${assignTab === key ? "bg-white text-[#1B2F5B] shadow-sm" : "text-slate-500 hover:text-[#1B2F5B]"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Chips de setor */}
            {departments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setDeptFilter("")}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${!deptFilter ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600 hover:border-slate-500"}`}
                >
                  Todos os setores
                </button>
                {departments.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDeptFilter(deptFilter === d.id ? "" : d.id)}
                    className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                    style={deptFilter === d.id ? { backgroundColor: d.color, borderColor: d.color, color: "#fff" } : { borderColor: d.color + "66", color: d.color }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}

            {availableChannels.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setChannelFilter("")}
                  className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${!channelFilter ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600 hover:border-slate-500"}`}
                >
                  Todos
                </button>
                {availableChannels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setChannelFilter(channelFilter === ch.id ? "" : ch.id)}
                    className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors`}
                    style={channelFilter === ch.id
                      ? { backgroundColor: ch.color, borderColor: ch.color, color: "#fff" }
                      : { borderColor: ch.color + "66", color: ch.color }}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant={queueFilter === "all" ? "default" : "outline"} onClick={() => setQueueFilter("all")}>Todas</Button>
              <Button size="sm" variant={queueFilter === "breached" ? "default" : "outline"} onClick={() => setQueueFilter("breached")}>Atrasadas</Button>
              <Button size="sm" variant={queueFilter === "human" ? "default" : "outline"} onClick={() => setQueueFilter("human")}>Precisam de você</Button>
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
                        {getConversationPhone(conversation) ? (
                          <p className="truncate text-xs font-medium text-emerald-700">{getConversationPhone(conversation)}</p>
                        ) : null}
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{conversation.latest_message?.body || "Sem mensagem salva ainda"}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">{formatDate(conversation.last_message_at || conversation.latest_message?.created_at)}</span>
                        {waitLabel !== "—" ? <span className={`text-[11px] font-medium ${isBreached ? "text-red-600" : "text-amber-600"}`}>esperando há {waitLabel}</span> : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {conversation.is_group ? <Badge variant="outline" className="border-blue-300 text-blue-700">Grupo</Badge> : <Badge variant="secondary">Contato</Badge>}
                      {conversation.departments && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: conversation.departments.color + "22", color: conversation.departments.color }}>
                          {conversation.departments.name}
                        </span>
                      )}
                      {conversation.assigned_to ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {conversation.assigned_to === me?.appUserId ? "Você" : conversation.assigned_name || "Em atendimento"}
                        </span>
                      ) : null}
                      {conversation.channels && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: conversation.channels.color + "22", color: conversation.channels.color }}
                        >
                          {conversation.channels.name}
                        </span>
                      )}
                      {conversation.provider === "whatsapp_cloud" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Cloud API
                        </span>
                      )}
                      {conversation.provider === "instagram" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border" style={{ backgroundColor: "#E1306C1A", color: "#E1306C", borderColor: "#E1306C40" }}>
                          Instagram
                        </span>
                      )}
                      {conversation.provider === "messenger" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border" style={{ backgroundColor: "#1877F21A", color: "#1877F2", borderColor: "#1877F240" }}>
                          Messenger
                        </span>
                      )}
                      {conversation.provider === "evolution" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          WhatsApp
                        </span>
                      )}
                      {isBreached ? <Badge className="bg-red-600 text-white">Atrasada</Badge> : null}
                      {needsHuman && !isBreached ? <Badge className="bg-amber-500 text-white">Precisa de você</Badge> : null}
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
                <CardDescription>
                  {selectedConversation
                    ? getConversationPhone(selectedConversation) || (selectedConversation.is_group ? "Grupo do WhatsApp" : "Número indisponível pelo WhatsApp")
                    : "Selecione uma conversa"}
                </CardDescription>
              </div>
              <Button onClick={syncSelectedHistory} disabled={syncing || !selectedConversation} variant="outline"><Download className="mr-2 h-4 w-4" />Sincronizar histórico</Button>
            </div>

            {selectedConversation && !selectedConversation.is_group && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                {selectedConversation.assigned_to ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    <UserPlus className="h-3.5 w-3.5" />
                    Em atendimento por {selectedConversation.assigned_to === me?.appUserId ? "você" : (selectedConversation.assigned_name || "outro atendente")}
                  </span>
                ) : (
                  <Button size="sm" onClick={() => assignConversation({ assignTo: "me" })} disabled={assigning} className="bg-emerald-700 hover:bg-emerald-800">
                    <UserPlus className="mr-2 h-4 w-4" />Pegar conversa
                  </Button>
                )}
                {selectedConversation.assigned_to && (selectedConversation.assigned_to === me?.appUserId || me?.isSupervisor) ? (
                  <Button size="sm" variant="outline" onClick={() => assignConversation({ assignTo: null })} disabled={assigning}>Liberar</Button>
                ) : null}
                {departments.length > 0 && (
                  <select
                    value={selectedConversation.department_id || ""}
                    onChange={(event) => assignConversation({ departmentId: event.target.value || null })}
                    disabled={assigning}
                    title="Transferir de setor"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">Transferir p/ setor…</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="bg-slate-50 p-4">
            <div className="max-h-[460px] space-y-3 overflow-auto pr-2">
              {messages.map((message) => {
                const outbound = message.direction === "outbound";
                const mediaSource = getInlineMediaSource(message);
                const mediaLabel = getMediaLabel(message);
                // Regra: se tem has_media=true (novo), usar MediaCard com signed URL.
                // Fallback para old inline media (raw_payload.media.data com base64 embutido).
                const showNewMediaCard = message.has_media && message.media_kind;
                const transcriptionEnabled = selectedConversation?.channels?.transcription_enabled === true;
                return (
                  <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${outbound ? "bg-emerald-600 text-white" : "bg-white text-slate-900"}`}>
                      {showNewMediaCard ? (
                        <MediaCard message={message} transcriptionEnabled={transcriptionEnabled} />
                      ) : mediaSource ? (
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
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5" />Status da conversa</CardTitle>
              <CardDescription>Esta conversa fica na fila até você responder ou marcar como resolvida.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Situação</p><p className="font-medium">{getSlaLabel(selectedConversation?.sla_status)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Motivo</p><p className="font-medium">{getPendingReasonLabel(selectedConversation?.pending_reason)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Última mensagem do cliente</p><p className="font-medium">{formatDate(selectedConversation?.last_inbound_at)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Sua última resposta</p><p className="font-medium">{formatDate(selectedConversation?.last_outbound_at)}</p></div>
              <Button onClick={runWatchdog} disabled={watchdogRunning} variant="outline" className="w-full"><Clock className="mr-2 h-4 w-4" />Verificar pendências</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5" />Contato / conversa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{getConversationName(selectedConversation)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Telefone</p><p className="break-all font-medium">{getConversationPhone(selectedConversation) || "—"}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Empresa</p><p className="font-medium">{selectedConversation?.crm_contacts?.company || "—"}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Permissão de contato</p><p className="font-medium">{getConsentLabel(selectedConversation?.crm_contacts?.consent_status)}</p></div>
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
              {/* Supervised AI block */}
              {selectedConversation?.is_group ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground">
                  <Bot className="mb-1.5 h-4 w-4" />
                  IA desativada em grupos. Grupos são usados apenas para captação de leads.
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={suggestAiReply}
                    disabled={aiLoading || !selectedConversation}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    {aiLoading ? "Gerando sugestão..." : "Sugerir resposta com IA"}
                  </Button>
                  {aiSuggestion && !aiEditMode && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Bot className="h-3.5 w-3.5 text-blue-700" />
                        <span className="text-xs font-semibold text-blue-800">Sugestão de IA</span>
                        {aiRiskLevel && <span className={`text-[10px] rounded px-1.5 py-0.5 text-white ${aiRiskLevel === "high" ? "bg-red-600" : aiRiskLevel === "medium" ? "bg-amber-500" : "bg-emerald-600"}`}>{aiRiskLevel}</span>}
                        {aiIntent && <span className="text-[10px] rounded border px-1.5 py-0.5 text-slate-700">{aiIntent}</span>}
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-5">{aiSuggestion}</p>
                      <p className="text-[10px] text-amber-700 font-medium">IA supervisionada: revise antes de enviar.</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" onClick={() => sendAiReply(false)} disabled={sending} className="bg-emerald-700 hover:bg-emerald-800 text-xs h-7 px-3">Enviar sugestão</Button>
                        <Button size="sm" variant="outline" onClick={() => { setAiEditMode(true); setAiEditBody(aiSuggestion); }} className="text-xs h-7 px-3">Editar</Button>
                        <Button size="sm" variant="ghost" onClick={ignoreAiReply} className="text-xs h-7 px-3 text-muted-foreground">Ignorar</Button>
                      </div>
                    </div>
                  )}
                  {aiEditMode && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-800">Editando sugestão de IA</p>
                      <textarea value={aiEditBody} onChange={(e) => setAiEditBody(e.target.value)} rows={4} className="w-full resize-none rounded-xl border bg-white p-2 text-xs outline-none focus:ring-2 focus:ring-amber-200" />
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" onClick={() => sendAiReply(true)} disabled={sending || !aiEditBody.trim()} className="bg-emerald-700 hover:bg-emerald-800 text-xs h-7 px-3">Enviar editada</Button>
                        <Button size="sm" variant="ghost" onClick={ignoreAiReply} className="text-xs h-7 px-3 text-muted-foreground">Cancelar</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chamar humano — sempre visível: o paciente nunca fica preso na IA. */}
              {selectedConversation && (
                selectedConversation.requires_human ? (
                  <Button
                    variant="outline"
                    onClick={() => assignConversation({ requiresHuman: false })}
                    disabled={assigning}
                    className="w-full justify-start border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />Resolvido — tirar da fila humana
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => assignConversation({ requiresHuman: true })}
                    disabled={assigning}
                    className="w-full justify-start border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />Chamar humano
                  </Button>
                )
              )}
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
