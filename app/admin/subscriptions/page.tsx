"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

type Sub = {
  id: string;
  tenant_id: string;
  organization_id: string;
  plan_slug: string;
  billing_cycle: string;
  status: string;
  total_amount: number;
  current_period_end: string | null;
  billing_provider: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  cancelled: "bg-red-50 text-red-700",
  expired: "bg-slate-100 text-slate-500",
};

const PLAN_LABEL: Record<string, string> = {
  starter: "Essencial",
  professional: "Professional",
  business: "Business",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Erro ao carregar");
      setSubs(data.subscriptions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(id: string, status: string, label: string) {
    if (!confirm(`Confirmar: ${label} esta assinatura?`)) return;
    setActing(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Falha");
      setNotice(`Assinatura ${label.toLowerCase()}da com sucesso.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setActing(null);
    }
  }

  return (
    <AppShell active="admin">
      <PageHeader
        title="Assinaturas"
        description="Gestão de assinaturas ativas, pausadas e canceladas."
        badge="Admin"
      />

      <div className="mb-4 flex justify-end">
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCcw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}

      {loading && subs.length === 0 ? (
        <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : subs.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">Nenhuma assinatura encontrada.</p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Plano</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Próxima renovação</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.map((sub) => (
                <tr key={sub.id}>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800 text-xs">{sub.organization_id.slice(0, 8)}…</p>
                    <p className="text-xs text-slate-400">{sub.billing_provider}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800">{PLAN_LABEL[sub.plan_slug] || sub.plan_slug}</p>
                    <p className="text-xs text-slate-400">{sub.billing_cycle === "annual" ? "Anual" : "Mensal"}</p>
                  </td>
                  <td className="px-5 py-4 font-black text-[#1B2F5B]">{fmt(sub.total_amount)}</td>
                  <td className="px-5 py-4 text-slate-600">{fmtDate(sub.current_period_end)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_COLOR[sub.status] || "bg-slate-100 text-slate-500"}`}>
                      {STATUS_LABEL[sub.status] || sub.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {sub.status === "active" && (
                        <>
                          <Button size="sm" variant="outline" disabled={acting === sub.id}
                            onClick={() => changeStatus(sub.id, "paused", "Pausar")}>
                            Pausar
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={acting === sub.id}
                            onClick={() => changeStatus(sub.id, "cancelled", "Cancelar")}>
                            Cancelar
                          </Button>
                        </>
                      )}
                      {sub.status === "paused" && (
                        <>
                          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={acting === sub.id}
                            onClick={() => changeStatus(sub.id, "active", "Reativar")}>
                            Reativar
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={acting === sub.id}
                            onClick={() => changeStatus(sub.id, "cancelled", "Cancelar")}>
                            Cancelar
                          </Button>
                        </>
                      )}
                      {sub.status === "cancelled" && (
                        <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={acting === sub.id}
                          onClick={() => changeStatus(sub.id, "active", "Reativar")}>
                          Reativar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
