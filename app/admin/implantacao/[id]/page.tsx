"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { CheckoutDetailPanel } from "./checkout-detail-panel";

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

type Params = Promise<{ id: string }>;

export default function ImplantacaoDetailPage({ params }: { params: Params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleProvision() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/implantacao/${id}/provision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessions: [] }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Falha no provisionamento.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-5 py-10 md:px-8">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.push("/admin/implantacao")}
          className="mb-6 text-sm font-bold text-slate-500 hover:text-[#1B2F5B]"
        >
          ← Voltar para a lista
        </button>

        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-[#C9952A]">Implantação</p>
          <h1 className="mt-2 text-2xl font-black text-[#1B2F5B]">Checkout #{id.slice(0, 8)}</h1>

          {!result ? <CheckoutDetailPanel checkoutId={id} /> : null}

          {!result && (
            <>
              <p className="mt-4 text-sm text-slate-600">
                Ao clicar em <strong>Provisionar e ativar</strong>, o sistema irá:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>• Criar o tenant e a organização do cliente</li>
                <li>• Criar o usuário administrador com senha temporária</li>
                <li>• Marcar o checkout como ativo</li>
              </ul>

              <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                Esta ação não pode ser desfeita. Confirme os dados do cliente antes de prosseguir.
              </div>

              {error && (
                <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleProvision}
                disabled={loading}
                className="mt-6 w-full rounded-full bg-[#1B2F5B] py-3 text-sm font-black text-white disabled:opacity-60 hover:bg-[#1B2F5B]/90"
              >
                {loading ? "Provisionando…" : "Provisionar e ativar"}
              </button>
            </>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                Cliente provisionado e ativado com sucesso.
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm space-y-2">
                <Row label="Tenant ID" value={String(result.tenantId ?? "—")} />
                <Row label="Organization ID" value={String(result.organizationId ?? "—")} />
                <Row label="Auth User ID" value={String(result.authUserId ?? "—")} />
                <Row label="E-mail" value={String(result.email ?? "—")} />
                <Row label="Senha temporária" value={String(result.tempPassword ?? "—")} highlight />
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 text-xs text-amber-800">
                Guarde a senha temporária — ela não será exibida novamente. Envie ao cliente e oriente a troca no primeiro acesso.
              </div>

              <button
                onClick={() => router.push("/admin/implantacao")}
                className="mt-2 w-full rounded-full border border-slate-200 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Voltar para a lista
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="font-bold text-slate-500">{label}</span>
      <span className={highlight ? "font-black text-[#1B2F5B] break-all" : "text-slate-700 break-all"}>{value}</span>
    </div>
  );
}
