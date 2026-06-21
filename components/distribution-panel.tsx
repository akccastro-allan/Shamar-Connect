"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCcw, Send, FileText, MessageCircle } from "lucide-react";
import { buildBroadcastMessage } from "@/lib/distribution/content-message-builder";

type DistributionChannel = {
  id: string;
  name: string;
  provider: string;
  external_id: string | null;
  is_broadcast_only: boolean;
  allow_replies: boolean;
  description: string | null;
};

type BroadcastTarget = {
  id: string;
  status: string;
  distribution_channel_id: string;
  published_at: string | null;
  error: string | null;
  distribution_channels: { id: string; name: string; provider: string } | null;
};

type Broadcast = {
  id: string;
  title: string;
  source_type: string | null;
  source_url: string | null;
  source_title: string | null;
  message_text: string;
  status: string;
  published_at: string | null;
  created_at: string;
  content_broadcast_targets: BroadcastTarget[];
};

const PROVIDER_LABELS: Record<string, string> = {
  whatsapp_group: "WhatsApp Grupo",
  whatsapp_channel: "WhatsApp Canal",
  telegram_group: "Telegram Grupo",
  telegram_channel: "Telegram Canal",
  instagram: "Instagram",
};

const PROVIDER_COLORS: Record<string, string> = {
  whatsapp_group: "#25D366",
  whatsapp_channel: "#25D366",
  telegram_group: "#2AABEE",
  telegram_channel: "#2AABEE",
  instagram: "#E1306C",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  ready: "bg-blue-100 text-blue-700",
  published: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

type FormState = {
  title: string;
  sourceType: "article" | "event" | "manual";
  sourceUrl: string;
  sourceTitle: string;
  messageText: string;
  channelIds: string[];
};

const EMPTY_FORM: FormState = {
  title: "",
  sourceType: "manual",
  sourceUrl: "",
  sourceTitle: "",
  messageText: "",
  channelIds: [],
};

export default function DistributionPanel() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [channels, setChannels] = useState<DistributionChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/distribution/broadcasts"),
        fetch("/api/distribution/channels"),
      ]);
      const [bData, cData] = await Promise.all([bRes.json(), cRes.json()]);
      if (bData.ok) setBroadcasts(bData.broadcasts);
      if (cData.ok) setChannels(cData.channels);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-generate message when sourceType / sourceTitle / sourceUrl change
  useEffect(() => {
    if (form.sourceType !== "manual" && (form.sourceTitle || form.title) && !form.messageText) {
      const text = buildBroadcastMessage(form.sourceType, {
        title: form.sourceTitle || form.title,
        url: form.sourceUrl,
      });
      setForm((f) => ({ ...f, messageText: text }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sourceType, form.sourceTitle, form.sourceUrl]);

  const toggleChannel = (id: string) => {
    setForm((f) => ({
      ...f,
      channelIds: f.channelIds.includes(id)
        ? f.channelIds.filter((c) => c !== id)
        : [...f.channelIds, id],
    }));
  };

  const createBroadcast = async () => {
    if (!form.title.trim() || !form.messageText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/distribution/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          sourceType: form.sourceType,
          sourceUrl: form.sourceUrl || null,
          sourceTitle: form.sourceTitle || null,
          messageText: form.messageText,
          channelIds: form.channelIds,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || "Erro ao criar"); return; }
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const publishBroadcast = async (broadcastId: string) => {
    setPublishing(broadcastId);
    setError(null);
    try {
      const res = await fetch(`/api/distribution/broadcasts/${broadcastId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) setError(data.error || "Erro ao publicar");
      else load();
    } finally {
      setPublishing(null);
    }
  };

  const copyMessage = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const stats = {
    draft: broadcasts.filter((b) => b.status === "draft").length,
    ready: broadcasts.filter((b) => b.status === "ready").length,
    published: broadcasts.filter((b) => b.status === "published").length,
  };

  const telegramChannels = channels.filter((c) => c.provider.startsWith("telegram"));
  const whatsappChannels = channels.filter((c) => c.provider.startsWith("whatsapp"));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[#1B2F5B]">Central de Distribuição</h1>
          <p className="text-sm text-slate-500 mt-0.5">Publique artigos e eventos nos canais informativos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-slate-500 hover:text-[#1B2F5B] hover:bg-slate-100 rounded-lg transition-colors">
            <RefreshCcw size={16} />
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#2ABFAB] hover:bg-[#24aa98] text-white text-sm font-black px-4 py-2 rounded-full transition-colors"
          >
            <Plus size={16} />
            Nova divulgação
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <p className="text-xs text-slate-500">Rascunhos</p>
          <p className="text-2xl font-black text-[#1B2F5B] mt-1">{stats.draft}</p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <p className="text-xs text-slate-500">Prontos</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{stats.ready}</p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <p className="text-xs text-slate-500">Publicados</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{stats.published}</p>
        </div>
      </div>

      {/* Channels overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">Canais Telegram</h2>
          {telegramChannels.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum canal Telegram cadastrado</p>
          ) : (
            <div className="space-y-2">
              {telegramChannels.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[c.provider] }} />
                  <span className="text-sm text-slate-700">{c.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">{c.external_id ? "configurado" : "sem ID"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">Canais WhatsApp</h2>
          {whatsappChannels.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum grupo/canal WhatsApp cadastrado</p>
          ) : (
            <div className="space-y-2">
              {whatsappChannels.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[c.provider] }} />
                  <span className="text-sm text-slate-700">{c.name}</span>
                  <span className="text-xs text-[#C9952A] ml-auto">cópia manual</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* New broadcast form */}
      {showForm && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
          <h2 className="font-black text-[#1B2F5B]">Nova divulgação</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Título interno *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Artigo — Melhores trilhas do RS"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#2ABFAB]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tipo</label>
              <select
                value={form.sourceType}
                onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value as FormState["sourceType"], messageText: "" }))}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#2ABFAB]/30"
              >
                <option value="article">Artigo</option>
                <option value="event">Evento</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Título do conteúdo</label>
              <input
                value={form.sourceTitle}
                onChange={(e) => setForm((f) => ({ ...f, sourceTitle: e.target.value, messageText: "" }))}
                placeholder="Título do artigo/evento"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#2ABFAB]/30"
              />
            </div>
            {form.sourceType !== "manual" && (
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">URL do conteúdo</label>
                <input
                  value={form.sourceUrl}
                  onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value, messageText: "" }))}
                  placeholder="https://viciadosemtrilhas.com.br/..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#2ABFAB]/30"
                />
              </div>
            )}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">Mensagem *</label>
                {form.sourceType !== "manual" && (form.sourceTitle || form.title) && (
                  <button
                    onClick={() => {
                      const text = buildBroadcastMessage(form.sourceType, {
                        title: form.sourceTitle || form.title,
                        url: form.sourceUrl,
                      });
                      setForm((f) => ({ ...f, messageText: text }));
                    }}
                    className="text-xs font-bold text-[#2ABFAB] hover:underline"
                  >
                    Gerar automaticamente
                  </button>
                )}
              </div>
              <textarea
                value={form.messageText}
                onChange={(e) => setForm((f) => ({ ...f, messageText: e.target.value }))}
                rows={8}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono resize-y outline-none focus:ring-2 focus:ring-[#2ABFAB]/30"
                placeholder="Texto da divulgação..."
              />
            </div>
          </div>

          {/* Channel selection */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Canais destino</label>
            <div className="flex flex-wrap gap-2">
              {channels.map((c) => {
                const selected = form.channelIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleChannel(c.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      selected ? "border-transparent text-white" : "border-slate-300 text-slate-600 hover:border-slate-400"
                    }`}
                    style={selected ? { backgroundColor: PROVIDER_COLORS[c.provider] + "cc", borderColor: PROVIDER_COLORS[c.provider] } : {}}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[c.provider] }} />
                    {c.name}
                    {c.provider.startsWith("whatsapp") && (
                      <span className="text-[10px] opacity-70">(cópia)</span>
                    )}
                  </button>
                );
              })}
              {channels.length === 0 && (
                <span className="text-sm text-slate-400">Nenhum canal cadastrado</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Cancelar
            </button>
            <button
              onClick={createBroadcast}
              disabled={saving || !form.title.trim() || !form.messageText.trim()}
              className="px-4 py-1.5 text-sm bg-[#2ABFAB] hover:bg-[#24aa98] disabled:opacity-50 text-white font-black rounded-full transition-colors"
            >
              {saving ? "Salvando…" : "Salvar rascunho"}
            </button>
          </div>
        </div>
      )}

      {/* Broadcasts list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {broadcasts.length === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="text-sm font-bold text-slate-700">Nenhuma divulgação criada ainda</p>
              <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }} className="mt-2 text-sm font-bold text-[#2ABFAB] hover:underline">
                Criar primeira divulgação
              </button>
            </div>
          )}
          {broadcasts.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{b.title}</p>
                  {b.source_url && (
                    <a href={b.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2ABFAB] hover:underline truncate block max-w-sm">
                      {b.source_url}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] || "bg-slate-100 text-slate-500"}`}>
                    {b.status}
                  </span>
                </div>
              </div>

              {/* Message preview */}
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                {b.message_text}
              </pre>

              {/* Targets */}
              {b.content_broadcast_targets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {b.content_broadcast_targets.map((t) => (
                    <span
                      key={t.id}
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        t.status === "published" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                        t.status === "failed" ? "bg-red-50 border-red-200 text-red-700" :
                        "bg-slate-100 border-slate-200 text-slate-500"
                      }`}
                      title={t.error || undefined}
                    >
                      {t.distribution_channels?.name || "canal"} · {t.status}
                    </span>
                  ))}
                </div>
              )}

              {/* WhatsApp copy notice */}
              {b.content_broadcast_targets.some((t) =>
                t.distribution_channels?.provider?.startsWith("whatsapp")
              ) && (
                <div className="bg-[#C9952A]/10 border border-[#C9952A]/30 rounded-lg p-3 text-xs text-[#8a6516]">
                  Publicação automática em grupos WhatsApp será ativada depois de validação. Por enquanto, copie a mensagem.
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyMessage(b.message_text, b.id)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <FileText size={12} />
                  {copied === b.id ? "Copiado!" : "Copiar mensagem"}
                </button>
                {b.status !== "published" && b.content_broadcast_targets.some((t) => t.status === "pending") && (
                  <button
                    onClick={() => publishBroadcast(b.id)}
                    disabled={publishing === b.id}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#1B2F5B] hover:bg-[#16264a] disabled:opacity-50 text-white transition-colors"
                  >
                    <Send size={12} />
                    {publishing === b.id ? "Publicando…" : "Publicar no Telegram"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
