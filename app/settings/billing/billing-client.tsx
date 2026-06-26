"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Addon = { slug: string; name: string; price: number };

type Subscription = {
  id: string;
  plan_slug: string;
  billing_cycle: string;
  status: string;
  total_amount: number;
  base_amount: number;
  addons: Addon[];
  storage_quota_gb: number;
  message_retention_days: number;
  started_at: string;
  current_period_end: string | null;
  billing_provider: string;
};

const PLAN_LABEL: Record<string, string> = {
  starter: "Essencial",
  professional: "Professional",
  business: "Business",
};

const CYCLE_LABEL: Record<string, string> = {
  monthly: "Mensal",
  annual: "Anual",
};

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function retentionLabel(days: number) {
  if (days >= 365) return `${Math.round(days / 365)} ano${days >= 730 ? "s" : ""}`;
  return `${days} dias`;
}

export function BillingClient() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/billing", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Erro ao carregar");
      setSub(data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCcw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {loading && !sub ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : !sub ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-bold text-slate-700">Nenhuma assinatura ativa encontrada.</p>
          <p className="mt-2 text-sm text-slate-500">
            Para contratar, acesse <a href="/planos" className="font-bold text-[#2ABFAB] hover:underline">/planos</a> ou fale com a equipe Shamar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Plano atual</p>
                <p className="mt-1 text-2xl font-black text-[#1B2F5B]">
                  {PLAN_LABEL[sub.plan_slug] || sub.plan_slug}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {CYCLE_LABEL[sub.billing_cycle] || sub.billing_cycle} · ativo desde {fmtDate(sub.started_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor</p>
                <p className="mt-1 text-2xl font-black text-[#1B2F5B]">{fmt(sub.total_amount)}</p>
                <p className="mt-1 text-xs text-slate-500">/{sub.billing_cycle === "annual" ? "ano" : "mês"}</p>
              </div>
            </div>
            {sub.current_period_end && (
              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">
                Próxima renovação: {fmtDate(sub.current_period_end)}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Armazenamento</p>
              <p className="mt-2 text-3xl font-black text-[#1B2F5B]">{sub.storage_quota_gb} GB</p>
              <p className="mt-1 text-xs text-slate-500">Inclui base (5 GB) + add-ons</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Retenção de mensagens</p>
              <p className="mt-2 text-3xl font-black text-[#1B2F5B]">{retentionLabel(sub.message_retention_days)}</p>
              <p className="mt-1 text-xs text-slate-500">Histórico garantido por este período</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-black text-[#1B2F5B]">Add-ons contratados</h2>
            {!sub.addons || sub.addons.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum add-on contratado.</p>
            ) : (
              <div className="space-y-2">
                {sub.addons.map((addon) => (
                  <div key={addon.slug} className="flex items-center justify-between rounded-2xl border bg-slate-50 px-4 py-3">
                    <span className="text-sm font-bold text-slate-800">{addon.name || addon.slug}</span>
                    <span className="text-sm font-black text-[#1B2F5B]">{fmt(addon.price)}/mês</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#2ABFAB]/20 bg-[#2ABFAB]/5 p-6">
            <p className="text-sm font-bold text-[#13796D]">
              Precisa de upgrade, adicionar canais ou alterar o plano?
            </p>
            <p className="mt-1 text-sm text-[#13796D]/80">
              Fale com a equipe Shamar — mudanças são feitas com implantação assistida.
            </p>
            <a
              href="/contato"
              className="mt-4 inline-block rounded-full bg-[#2ABFAB] px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
            >
              Falar com a equipe
            </a>
          </div>
        </div>
      )}
    </>
  );
}
