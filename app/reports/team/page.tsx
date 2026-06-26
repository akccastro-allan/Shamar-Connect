"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type MemberStat = {
  app_user_id: string;
  name: string;
  email: string;
  role: string;
  department: { name: string; color: string } | null;
  active_conversations: number;
  resolved_30d: number;
};

type DeptQueue = { name: string; color: string; count: number };

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  attendant: "Atendente",
};

export default function TeamReportPage() {
  const [stats, setStats] = useState<MemberStat[]>([]);
  const [queueByDept, setQueueByDept] = useState<DeptQueue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/team", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Erro ao carregar");
      setStats(data.stats || []);
      setQueueByDept(data.queue_by_dept || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalActive = stats.reduce((s, m) => s + m.active_conversations, 0);
  const totalResolved = stats.reduce((s, m) => s + m.resolved_30d, 0);
  const totalQueue = queueByDept.reduce((s, d) => s + d.count, 0);

  return (
    <AppShell active="reports/team">
      <PageHeader
        title="Relatório da equipe"
        description="Conversas ativas, resolvidas nos últimos 30 dias e fila de espera por setor."
        badge="Relatório"
      />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-4">
          {[
            { label: "Em atendimento", value: totalActive },
            { label: "Resolvidas (30 dias)", value: totalResolved },
            { label: "Aguardando atendente", value: totalQueue },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-black text-[#1B2F5B]">{loading ? "—" : card.value}</p>
            </div>
          ))}
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCcw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Tabela por atendente */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-[#1B2F5B]">Por atendente</h2>
          {loading && stats.length === 0 ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : stats.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">Nenhum membro ativo.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Atendente</th>
                    <th className="px-4 py-3">Setor</th>
                    <th className="px-4 py-3 text-right">Ativas</th>
                    <th className="px-4 py-3 text-right">Resolvidas 30d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.map((m) => (
                    <tr key={m.app_user_id}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{m.name}</p>
                        <p className="text-xs text-slate-500">{ROLE_LABEL[m.role] || m.role}</p>
                      </td>
                      <td className="px-4 py-3">
                        {m.department ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                            style={{ backgroundColor: `${m.department.color}1A`, color: m.department.color }}>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.department.color }} />
                            {m.department.name}
                          </span>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-black ${m.active_conversations > 0 ? "text-[#1B2F5B]" : "text-slate-400"}`}>
                          {m.active_conversations}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-black ${m.resolved_30d > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                          {m.resolved_30d}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fila por setor */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-[#1B2F5B]">Fila por setor</h2>
          <p className="mb-4 text-xs text-slate-500">Conversas abertas sem atendente atribuído.</p>
          {loading && queueByDept.length === 0 ? (
            <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : queueByDept.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">Fila vazia.</p>
          ) : (
            <div className="space-y-2">
              {queueByDept.map((d) => (
                <div key={d.name} className="flex items-center justify-between rounded-2xl border bg-white p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm font-bold text-slate-800">{d.name}</span>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                    {d.count} aguardando
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
