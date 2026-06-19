"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCcw } from "lucide-react";

type StageSummary = {
  id: string;
  name: string;
  color: string;
  count: number;
  totalValue: number;
};

type Totals = {
  items: number;
  active: number;
  closed: number;
  lost: number;
  value: number;
  conversionRate: number;
};

type ChannelFilter = {
  id: string;
  name: string;
  color: string;
};

const PERIOD_OPTIONS = [
  { label: "Hoje", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

export default function SalesDashboardPanel() {
  const [stages, setStages] = useState<StageSummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [channels, setChannels] = useState<ChannelFilter[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedDays, setSelectedDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, channelsRes] = await Promise.all([
        fetch(`/api/pipeline/summary?days=${selectedDays}${selectedChannel ? `&channelId=${selectedChannel}` : ""}`),
        fetch("/api/channels"),
      ]);
      const [summaryData, channelsData] = await Promise.all([summaryRes.json(), channelsRes.json()]);
      if (summaryData.ok) {
        setStages(summaryData.stages);
        setTotals(summaryData.totals);
      }
      if (channelsData.ok) setChannels(channelsData.channels);
    } finally {
      setLoading(false);
    }
  }, [selectedDays, selectedChannel]);

  useEffect(() => { load(); }, [load]);

  const fmtCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const SUMMARY_CARDS = totals
    ? [
        { label: "Leads totais", value: totals.items, color: "text-blue-400", bg: "bg-blue-900/20 border-blue-900" },
        { label: "Em andamento", value: totals.active, color: "text-purple-400", bg: "bg-purple-900/20 border-purple-900" },
        { label: "Fechados", value: totals.closed, color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-900" },
        { label: "Perdidos", value: totals.lost, color: "text-zinc-400", bg: "bg-zinc-800/50 border-zinc-700" },
        { label: "Conversão", value: `${totals.conversionRate}%`, color: "text-amber-400", bg: "bg-amber-900/20 border-amber-900" },
        { label: "Valor total", value: fmtCurrency(totals.value), color: "text-teal-400", bg: "bg-teal-900/20 border-teal-900" },
      ]
    : [];

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard de Vendas</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Visão consolidada por período e canal</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filter */}
          <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 gap-0.5">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.days}
                onClick={() => setSelectedDays(o.days)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedDays === o.days ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
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
            onClick={load}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 text-zinc-500 text-sm">Carregando…</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {SUMMARY_CARDS.map((card) => (
              <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                <div className="text-xs text-zinc-400 mt-1">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Stage breakdown */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Por etapa</h2>
            <div className="flex flex-col gap-2">
              {stages
                .filter((s) => s.count > 0)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((stage) => {
                  const maxCount = Math.max(...stages.map((s) => s.count), 1);
                  const pct = Math.round((stage.count / maxCount) * 100);
                  return (
                    <div key={stage.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          <span className="text-sm font-medium text-zinc-200">{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-zinc-300 font-semibold">{stage.count}</span>
                          {stage.totalValue > 0 && (
                            <span className="text-emerald-400 text-xs">{fmtCurrency(stage.totalValue)}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: stage.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              {stages.every((s) => s.count === 0) && (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  Nenhuma oportunidade no período selecionado.
                </div>
              )}
            </div>
          </div>

          {/* Channels breakdown */}
          {channels.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">Canais ativos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {channels.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.id === selectedChannel ? "" : ch.id)}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${
                      selectedChannel === ch.id
                        ? "border-white/30 bg-zinc-800"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                      <span className="text-xs font-medium text-zinc-200 truncate">{ch.name}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">{ch.id.slice(0, 8)}…</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
