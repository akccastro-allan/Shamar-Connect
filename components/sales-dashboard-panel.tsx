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
        { label: "Leads totais", value: totals.items, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
        { label: "Em andamento", value: totals.active, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
        { label: "Fechados", value: totals.closed, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
        { label: "Perdidos", value: totals.lost, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
        { label: "Conversão", value: `${totals.conversionRate}%`, color: "text-[#C9952A]", bg: "bg-[#C9952A]/10 border-[#C9952A]/30" },
        { label: "Valor total", value: fmtCurrency(totals.value), color: "text-[#2ABFAB]", bg: "bg-[#2ABFAB]/10 border-[#2ABFAB]/30" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[#1B2F5B]">Dashboard de Vendas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visão consolidada por período e canal</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filter */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.days}
                onClick={() => setSelectedDays(o.days)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  selectedDays === o.days ? "bg-[#1B2F5B] text-white" : "text-slate-500 hover:text-[#1B2F5B]"
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
            className="bg-white border border-slate-200 text-slate-900 text-sm px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-[#2ABFAB]/30"
          >
            <option value="">Todos os canais</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="p-2 text-slate-500 hover:text-[#1B2F5B] hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {SUMMARY_CARDS.map((card) => (
              <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
                <div className={`text-2xl font-black ${card.color}`}>{card.value}</div>
                <div className="text-xs text-slate-500 mt-1">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Stage breakdown */}
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 mb-3">Por etapa</h2>
            <div className="flex flex-col gap-2">
              {stages
                .filter((s) => s.count > 0)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((stage) => {
                  const maxCount = Math.max(...stages.map((s) => s.count), 1);
                  const pct = Math.round((stage.count / maxCount) * 100);
                  return (
                    <div key={stage.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          <span className="text-sm font-bold text-slate-800">{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-700 font-bold">{stage.count}</span>
                          {stage.totalValue > 0 && (
                            <span className="text-emerald-600 text-xs font-bold">{fmtCurrency(stage.totalValue)}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: stage.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              {stages.every((s) => s.count === 0) && (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nenhuma oportunidade no período selecionado.
                </div>
              )}
            </div>
          </div>

          {/* Channels breakdown */}
          {channels.length > 0 && (
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 mb-3">Canais ativos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChannel(ch.id === selectedChannel ? "" : ch.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selectedChannel === ch.id
                        ? "border-[#2ABFAB] bg-[#2ABFAB]/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                      <span className="text-xs font-bold text-slate-800 truncate">{ch.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
