"use client";

import { useEffect, useState } from "react";

const METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de crédito",
  boleto: "Boleto bancário",
};

const PLAN_LABEL: Record<string, string> = {
  starter: "Essencial",
  professional: "Professional",
  business: "Business",
};

type CheckoutDetail = {
  id: string;
  plan_slug: string | null;
  billing_cycle: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_document: string | null;
  payment_method: string | null;
  final_amount: number | null;
  paid_at: string | null;
  metadata: { selectedAddons?: Array<{ name?: string }> } | null;
};

function money(value: number | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function date(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export function CheckoutDetailPanel({ checkoutId }: { checkoutId: string }) {
  const [checkout, setCheckout] = useState<CheckoutDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/implantacao/${checkoutId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (!data?.ok) {
          setError(data?.error ?? "Checkout não encontrado na fila de implantação.");
          return;
        }
        setCheckout(data.data as CheckoutDetail);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os dados do checkout.");
      });
    return () => {
      active = false;
    };
  }, [checkoutId]);

  if (error) {
    return <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>;
  }

  if (!checkout) {
    return <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Carregando dados do checkout…</div>;
  }

  const addons = checkout.metadata?.selectedAddons?.map((addon) => addon.name).filter(Boolean).join(", ");

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm space-y-2">
      <Row label="Cliente" value={checkout.customer_name ?? "—"} />
      <Row label="E-mail" value={checkout.customer_email ?? "—"} />
      <Row label="Documento" value={checkout.customer_document ?? "—"} />
      <Row label="Plano" value={PLAN_LABEL[checkout.plan_slug ?? ""] ?? checkout.plan_slug ?? "—"} />
      <Row label="Ciclo" value={checkout.billing_cycle === "annual" ? "Anual" : "Mensal"} />
      <Row label="Pagamento" value={METHOD_LABEL[checkout.payment_method ?? ""] ?? checkout.payment_method ?? "—"} />
      <Row label="Valor" value={money(checkout.final_amount)} />
      <Row label="Pago em" value={date(checkout.paid_at)} />
      {addons ? <Row label="Add-ons" value={addons} /> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="break-all text-right text-slate-700">{value}</span>
    </div>
  );
}
