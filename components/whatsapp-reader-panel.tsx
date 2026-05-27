"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Save, Search, Send, Smartphone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ChatFilter = "all" | "private" | "groups";
type ChatItem = { id: string; name: string; isGroup: boolean; unreadCount?: number; lastMessageAt?: string };
type SyncedMessage = { id: string; chatId: string; chatName?: string; isGroup?: boolean; from?: string; to?: string; body?: string; timestamp?: number; direction: "inbound" | "outbound"; contactName?: string; phone?: string; type?: string };
type QuickReply = { id: string; title: string; body: string; category: string; is_active?: boolean };
type ChatNote = { id: string; note: string; created_at: string };
type GatewayStatus = { provider?: string; status?: string; phone?: string; error?: string };
type Result = { ok: boolean; saved?: number; received?: number; id?: string; status?: string; error?: string };

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha na operação");
  return data;
}

function formatMessageTime(timestamp?: number) {
  if (!timestamp) return "—";
  try { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp * 1000)); } catch { return String(timestamp); }
}

function formatIsoDate(value?: string) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); } catch { return value; }
}

function normalizeSearch(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function onlyDigits(value?: string) { return String(value || "").replace(/\D/g, ""); }
function firstName(value?: string) { return String(value || "").trim().split(/\s+/)[0] || ""; }

export function WhatsappReaderPanel() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messages, setMessages] = useState<SyncedMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [notes, setNotes] = useState<ChatNote[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const selectedMessages = useMemo(() => messages.filter((message) => selectedMessageIds.includes(message.id)), [messages, selectedMessageIds]);
  const selectedChat = useMemo(() => chats.find((chat) => chat.id === selectedChatId), [chats, selectedChatId]);
  const lastInboundMessage = useMemo(() => [...messages].reverse().find((message) => message.direction === "inbound"), [messages]);
  const contactPhone = selectedChat?.isGroup ? "" : onlyDigits(lastInboundMessage?.phone || selectedChatId);
  const displayName = selectedChat?.name || lastInboundMessage?.contactName || selectedChatId;

  const filteredChats = useMemo(() => {
    const term = normalizeSearch(chatSearch);
    return chats.filter((chat) => {
      const matchesType = chatFilter === "all" || (chatFilter === "groups" && chat.isGroup) || (chatFilter === "private" && !chat.isGroup);
      const matchesSearch = !term || normalizeSearch(`${chat.name || ""} ${chat.id}`).includes(term);
      return matchesType && matchesSearch;
    });
  }, [chats, chatFilter, chatSearch]);

  const filteredMessages = useMemo(() => {
    const term = normalizeSearch(messageSearch);
    if (!term) return messages;
    return messages.filter((message) => normalizeSearch(`${message.body || ""} ${message.contactName || ""} ${message.phone || ""}`).includes(term));
  }, [messages, messageSearch]);

  async function loadGatewayStatus() {
    try { setGatewayStatus(await readJson<GatewayStatus>("/api/whatsapp-web/status")); } catch (err) { setGatewayStatus({ status: "error", error: err instanceof Error ? err.message : "Erro" }); }
  }

  async function loadQuickReplies() {
    try { const data = await readJson<{ ok: boolean; quickReplies: QuickReply[] }>("/api/quick-replies"); setQuickReplies((data.quickReplies || []).filter((item) => item.is_active !== false)); } catch { setQuickReplies([]); }
  }

  async function loadNotes(chatId = selectedChatId) {
    if (!chatId) return;
    try { const data = await readJson<{ ok: boolean; notes: ChatNote[] }>(`/api/chat-notes?externalChatId=${encodeURIComponent(chatId)}`); setNotes(data.notes || []); } catch { setNotes([]); }
  }

  async function saveNote() {
    if (!selectedChatId || !noteText.trim()) return;
    try {
      await readJson("/api/chat-notes", { method: "POST", body: JSON.stringify({ externalChatId: selectedChatId, note: noteText }) });
      setNoteText("");
      await loadNotes(selectedChatId);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar nota"); }
  }

  async function loadChats(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      await loadGatewayStatus();
      const data = await readJson<{ ok: boolean; chats: ChatItem[] }>("/api/whatsapp-web/chats");
      setChats(data.chats || []);
      const firstId = selectedChatId || data.chats?.[0]?.id || "";
      setSelectedChatId(firstId);
      if (firstId && messages.length === 0) await loadMessages(firstId, options);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao carregar conversas"); }
    finally { if (!options?.silent) setLoading(false); }
  }

  async function loadMessages(chatId = selectedChatId, options?: { silent?: boolean }) {
    if (!chatId) return;
    if (!options?.silent) setLoading(true);
    setError(null);
    if (!options?.silent) setResult(null);
    if (!options?.silent) setSelectedMessageIds([]);
    try {
      const data = await readJson<{ ok: boolean; messages: SyncedMessage[] }>(`/api/whatsapp-web/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`);
      setMessages(data.messages || []);
      await loadNotes(chatId);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao carregar mensagens"); }
    finally { if (!options?.silent) setLoading(false); }
  }

  function toggleMessage(messageId: string) { setSelectedMessageIds((current) => current.includes(messageId) ? current.filter((id) => id !== messageId) : [...current, messageId]); }
  function selectAll() { setSelectedMessageIds(filteredMessages.map((message) => message.id)); }
  function clearSelection() { setSelectedMessageIds([]); }

  async function saveMessages(messagesToSave: SyncedMessage[]) {
    if (messagesToSave.length === 0) return;
    setLoading(true); setError(null);
    try { const data = await readJson<Result>("/api/whatsapp-web/messages/save-selected", { method: "POST", body: JSON.stringify({ messages: messagesToSave }) }); setResult(data); clearSelection(); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar mensagens"); }
    finally { setLoading(false); }
  }

  async function saveSelected() { await saveMessages(selectedMessages); }
  async function saveFullConversation() { if (messages.length === 0) return; if (!window.confirm(`Salvar ${messages.length} mensagens desta conversa no CRM?`)) return; await saveMessages(messages); }

  function applyQuickReply(template: string) {
    const text = template.replaceAll("{nome}", firstName(displayName) || "").replaceAll("{telefone}", contactPhone || "");
    setReplyText(text);
  }

  async function sendReply() {
    if (!selectedChatId || !replyText.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await readJson<Result>("/api/whatsapp-web/messages/send", { method: "POST", body: JSON.stringify({ to: selectedChatId, body: replyText, chatName: selectedChat?.name || selectedChatId, isGroup: Boolean(selectedChat?.isGroup) }) });
      setResult(data); setReplyText(""); await loadMessages(selectedChatId);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao enviar mensagem"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadQuickReplies(); loadGatewayStatus(); loadChats(); }, []);
  useEffect(() => { if (!autoRefresh || !selectedChatId) return; const interval = window.setInterval(() => { loadGatewayStatus(); loadChats({ silent: true }); loadMessages(selectedChatId, { silent: true }); }, 8000); return () => window.clearInterval(interval); }, [autoRefresh, selectedChatId, limit]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div><CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" />WhatsApp Web Reader</CardTitle><CardDescription>Leia, converse, use respostas rápidas, notas internas e salve mensagens ou conversas inteiras no CRM.</CardDescription></div>
            <div className="flex flex-wrap gap-2"><Button onClick={() => loadChats()} disabled={loading} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button><Button onClick={saveSelected} disabled={loading || selectedMessages.length === 0}><Save className="mr-2 h-4 w-4" />Salvar selecionadas</Button><Button onClick={saveFullConversation} disabled={loading || messages.length === 0} variant="outline"><Save className="mr-2 h-4 w-4" />Salvar conversa</Button></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5"><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Gateway</p><p className="text-xl font-semibold">{gatewayStatus?.status || "—"}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Conversas</p><p className="text-2xl font-semibold">{filteredChats.length}/{chats.length}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Mensagens</p><p className="text-2xl font-semibold">{filteredMessages.length}/{messages.length}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Selecionadas</p><p className="text-2xl font-semibold">{selectedMessages.length}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Auto</p><p className="text-2xl font-semibold">{autoRefresh ? "ON" : "OFF"}</p></div></div>
          {gatewayStatus?.error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Gateway: {gatewayStatus.error}</div> : null}
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {result ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Operação concluída. {result.saved !== undefined ? `Mensagens salvas: ${result.saved}. ` : ""}{result.status ? `Envio: ${result.status}.` : ""}</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr_320px]">
        <Card><CardHeader><CardTitle>Conversas do aparelho</CardTitle><CardDescription>Filtre, pesquise e escolha uma conversa privada ou grupo.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} className="w-full rounded-xl border bg-white py-2 pl-9 pr-3 text-sm" placeholder="Buscar conversa..." /></div><div className="grid grid-cols-3 gap-2"><Button size="sm" variant={chatFilter === "all" ? "default" : "outline"} onClick={() => setChatFilter("all")}>Todas</Button><Button size="sm" variant={chatFilter === "private" ? "default" : "outline"} onClick={() => setChatFilter("private")}>Privadas</Button><Button size="sm" variant={chatFilter === "groups" ? "default" : "outline"} onClick={() => setChatFilter("groups")}>Grupos</Button></div><select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 text-sm"><option value={25}>Últimas 25 mensagens</option><option value={50}>Últimas 50 mensagens</option><option value={100}>Últimas 100 mensagens</option><option value={200}>Últimas 200 mensagens</option></select><label className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />Atualizar automaticamente a cada 8 segundos</label><div className="max-h-[640px] space-y-2 overflow-auto pr-1">{filteredChats.map((chat) => (<button key={chat.id} onClick={() => { setSelectedChatId(chat.id); loadMessages(chat.id); }} className={`w-full rounded-2xl border p-3 text-left text-sm hover:bg-slate-50 ${selectedChatId === chat.id ? "border-emerald-300 bg-emerald-50" : "bg-white"}`}><div className="flex items-start justify-between gap-2"><p className="font-medium text-slate-950">{chat.name || chat.id}</p>{chat.isGroup ? <Badge variant="secondary">Grupo</Badge> : <Badge variant="outline">Privado</Badge>}</div><p className="mt-1 truncate text-xs text-muted-foreground">{chat.id}</p>{chat.unreadCount ? <p className="mt-1 text-xs font-medium text-emerald-700">{chat.unreadCount} não lidas</p> : null}</button>))}{filteredChats.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</div> : null}</div></CardContent></Card>

        <Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>{selectedChat?.name || "Mensagens"}</CardTitle><CardDescription>Converse por aqui e marque mensagens para salvar no CRM.</CardDescription></div><div className="flex flex-wrap gap-2"><Button onClick={selectAll} disabled={filteredMessages.length === 0} variant="outline" size="sm">Selecionar visíveis</Button><Button onClick={clearSelection} disabled={selectedMessages.length === 0} variant="ghost" size="sm">Limpar</Button></div></div></CardHeader><CardContent><div className="relative mb-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} className="w-full rounded-xl border bg-white py-2 pl-9 pr-3 text-sm" placeholder="Buscar dentro da conversa..." /></div><div className="max-h-[520px] space-y-3 overflow-auto rounded-2xl bg-slate-100 p-4">{filteredMessages.map((message) => { const checked = selectedMessageIds.includes(message.id); const outbound = message.direction === "outbound"; return (<label key={message.id} className={`flex cursor-pointer gap-3 ${outbound ? "justify-end" : "justify-start"}`}><input type="checkbox" checked={checked} onChange={() => toggleMessage(message.id)} className="mt-3 h-4 w-4" /><div className={`max-w-[82%] rounded-2xl border px-4 py-3 shadow-sm ${checked ? "ring-2 ring-emerald-300" : ""} ${outbound ? "bg-emerald-100" : "bg-white"}`}><div className="mb-1 flex flex-wrap items-center gap-2"><Badge variant={outbound ? "outline" : "secondary"}>{outbound ? "Enviada" : "Recebida"}</Badge><span className="text-xs text-muted-foreground">{formatMessageTime(message.timestamp)}</span>{message.type && message.type !== "text" ? <Badge variant="outline">{message.type}</Badge> : null}</div><p className="whitespace-pre-wrap text-sm leading-6 text-slate-900">{message.body || "Mensagem sem texto."}</p><p className="mt-2 text-xs text-muted-foreground">{message.contactName || message.phone || message.from || "Contato sem identificação"}</p></div></label>); })}{filteredMessages.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">Nenhuma mensagem encontrada.</div> : null}</div><div className="mt-4 rounded-2xl border bg-slate-50 p-3"><label className="text-sm font-medium text-slate-800">Responder nesta conversa</label>{quickReplies.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{quickReplies.slice(0, 8).map((reply) => <Button key={reply.id} type="button" size="sm" variant="outline" onClick={() => applyQuickReply(reply.body)}>{reply.title}</Button>)}</div> : null}<textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border bg-white p-3 text-sm" placeholder="Digite sua mensagem..." /><div className="mt-3 flex justify-end"><Button onClick={sendReply} disabled={loading || !selectedChatId || !replyText.trim()}><Send className="mr-2 h-4 w-4" />Enviar mensagem</Button></div></div></CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />Contato / conversa</CardTitle><CardDescription>Resumo rápido e notas internas.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Nome</p><p className="mt-1 font-semibold text-slate-950">{displayName || "Nenhuma conversa"}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Tipo</p><p className="mt-1 font-semibold text-slate-950">{selectedChat?.isGroup ? "Grupo" : "Conversa privada"}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Telefone/ID</p><p className="mt-1 break-all text-sm font-medium text-slate-950">{contactPhone || selectedChatId || "—"}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-muted-foreground">Última recebida</p><p className="mt-1 text-sm text-slate-700">{lastInboundMessage?.body || "Sem mensagem recebida carregada."}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm font-medium text-slate-800">Nota interna</p><textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border bg-white p-3 text-sm" placeholder="Escreva uma nota interna..." /><Button className="mt-2 w-full" variant="outline" onClick={saveNote} disabled={!selectedChatId || !noteText.trim()}>Salvar nota</Button></div><div className="space-y-2">{notes.map((note) => <div key={note.id} className="rounded-xl border bg-slate-50 p-3 text-sm"><p className="text-slate-700">{note.note}</p><p className="mt-1 text-xs text-muted-foreground">{formatIsoDate(note.created_at)}</p></div>)}{notes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma nota interna.</p> : null}</div><div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900">Salvar conversa inteira exige confirmação. Mensagens lidas não entram no CRM automaticamente.</div></CardContent></Card>
      </div>
    </div>
  );
}
