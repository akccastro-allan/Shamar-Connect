"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Users, RefreshCcw } from "lucide-react";

type Stage = {
  id: string;
  name: string;
  position: number;
  color: string;
};

type Contact = {
  id: string;
  name: string | null;
  phone: string;
  company: string | null;
} | null;

type Channel = {
  id: string;
  name: string;
  slug: string;
  color: string;
} | null;

type PipelineItem = {
  id: string;
  stage_id: string;
  title: string;
  notes: string | null;
  value: number | null;
  created_at: string;
  crm_contacts: Contact;
  channels: Channel;
};

type ChannelFilter = {
  id: string;
  name: string;
  color: string;
};

type NewItemForm = {
  title: string;
  notes: string;
  value: string;
  stageId: string;
};

const EMPTY_FORM: NewItemForm = { title: "", notes: "", value: "", stageId: "" };

export default function PipelinePanel() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [channels, setChannels] = useState<ChannelFilter[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewItemForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stagesRes, itemsRes, channelsRes] = await Promise.all([
        fetch("/api/pipeline/stages"),
        fetch(`/api/pipeline/items${selectedChannel ? `?channelId=${selectedChannel}` : ""}`),
        fetch("/api/channels"),
      ]);
      const [stagesData, itemsData, channelsData] = await Promise.all([
        stagesRes.json(),
        itemsRes.json(),
        channelsRes.json(),
      ]);
      if (stagesData.ok) setStages(stagesData.stages);
      if (itemsData.ok) setItems(itemsData.items);
      if (channelsData.ok) setChannels(channelsData.channels);
    } catch {
      setError("Falha ao carregar pipeline.");
    } finally {
      setLoading(false);
    }
  }, [selectedChannel]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const itemsByStage = (stageId: string) => items.filter((i) => i.stage_id === stageId);

  const moveItem = async (itemId: string, targetStageId: string, targetStageName: string) => {
    setMovingId(itemId);
    try {
      await fetch(`/api/pipeline/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: targetStageId, stageName: targetStageName }),
      });
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, stage_id: targetStageId } : i));
    } finally {
      setMovingId(null);
    }
  };

  const createItem = async () => {
    if (!form.title.trim() || !form.stageId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pipeline/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          notes: form.notes || null,
          value: form.value ? Number(form.value) : null,
          stageId: form.stageId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setForm(EMPTY_FORM);
        setShowForm(false);
        loadAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    await fetch(`/api/pipeline/items/${itemId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const fmtCurrency = (v: number | null) =>
    v != null ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null;

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline de Vendas</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{items.length} oportunidades no total</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Channel filter */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-1.5 rounded-lg"
          >
            <option value="">Todos os canais</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={loadAll}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCcw size={16} />
          </button>
          <button
            onClick={() => { setForm({ ...EMPTY_FORM, stageId: stages[0]?.id || "" }); setShowForm(true); }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nova oportunidade
          </button>
        </div>
      </div>

      {/* New item form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-white text-sm">Nova oportunidade</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Título *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Trilha Serra Gaúcha – 3 pax"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Etapa *</label>
              <select
                value={form.stageId}
                onChange={(e) => setForm((f) => ({ ...f, stageId: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Valor estimado (R$)</label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={createItem}
              disabled={saving || !form.title.trim() || !form.stageId}
              className="px-4 py-1.5 text-sm bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? "Salvando…" : "Criar"}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 text-zinc-500 text-sm">Carregando…</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {stages.map((stage) => {
            const stageItems = itemsByStage(stage.id);
            return (
              <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col gap-2">
                {/* Stage header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold text-zinc-200">{stage.name}</span>
                  </div>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{stageItems.length}</span>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-2 min-h-[80px]">
                  {stageItems.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 transition-opacity ${movingId === item.id ? "opacity-50" : ""}`}
                    >
                      <div className="text-sm font-medium text-white leading-snug">{item.title}</div>

                      {item.crm_contacts && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Users size={11} />
                          <span>{item.crm_contacts.name || item.crm_contacts.phone}</span>
                        </div>
                      )}

                      {item.channels && (
                        <span
                          className="self-start text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: item.channels.color + "22", color: item.channels.color }}
                        >
                          {item.channels.name}
                        </span>
                      )}

                      {item.value != null && (
                        <div className="text-xs font-semibold text-emerald-400">{fmtCurrency(item.value)}</div>
                      )}

                      {/* Move controls */}
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {stages
                          .filter((s) => s.id !== stage.id)
                          .map((s) => (
                            <button
                              key={s.id}
                              onClick={() => moveItem(item.id, s.id, s.name)}
                              disabled={movingId === item.id}
                              className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors disabled:opacity-40"
                            >
                              → {s.name}
                            </button>
                          ))}
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-800 transition-colors ml-auto"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}

                  {stageItems.length === 0 && (
                    <div className="border border-dashed border-zinc-800 rounded-xl h-16 flex items-center justify-center text-xs text-zinc-600">
                      Sem oportunidades
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
