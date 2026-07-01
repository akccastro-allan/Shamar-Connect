"use client";

import { useState } from "react";
import { Search, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";

type AssistResult = {
  intent: string;
  department: string | null;
  slaMinutes: number | null;
  suggestedReply: string;
  missingFields: string[];
  outOfHoursMessage: string | null;
  items: {
    id: string;
    name: string;
    sku: string | null;
    price: number | null;
    brand: string | null;
    stock_available: number | null;
  }[];
};

type CatalogAssistPanelProps = {
  onUseReply: (text: string) => void;
  disabled?: boolean;
};

export function CatalogAssistPanel({ onUseReply, disabled }: CatalogAssistPanelProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssistResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    const text = message.trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const r = await fetch("/api/catalog/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await r.json() as { ok: boolean; error?: string } & Partial<AssistResult>;
      if (!data.ok) { setError(data.error || "Falha ao analisar mensagem."); return; }
      setResult({
        intent: data.intent ?? "unknown",
        department: data.department ?? null,
        slaMinutes: data.slaMinutes ?? null,
        suggestedReply: data.suggestedReply ?? "",
        missingFields: data.missingFields ?? [],
        outOfHoursMessage: data.outOfHoursMessage ?? null,
        items: data.items ?? [],
      });
    } catch {
      setError("Não foi possível conectar ao assistente de catálogo.");
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(p: number | null) {
    if (p == null) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p);
  }

  const intentLabel: Record<string, string> = {
    parts: "Peças / Balcão",
    workshop: "Oficina / Serviço",
    greeting: "Saudação",
    unknown: "Não identificado",
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
        <Search className="h-3.5 w-3.5" />
        Assistente de catálogo
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analyze(); }}
          placeholder="Cole a mensagem do cliente..."
          rows={3}
          disabled={disabled || loading}
          className="w-full resize-none rounded-xl border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-200 disabled:opacity-60"
        />
        <Button
          size="sm"
          onClick={analyze}
          disabled={disabled || loading || !message.trim()}
          className="h-7 w-full bg-teal-700 text-xs hover:bg-teal-800"
        >
          {loading ? "Analisando…" : "Analisar mensagem"}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {result && (
        <div className="flex flex-col gap-2">
          {/* Intenção + roteamento */}
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-slate-700">
              {intentLabel[result.intent] ?? result.intent}
            </span>
            {result.department && (
              <span className="rounded-full border border-teal-300 bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                {result.department}
              </span>
            )}
            {result.slaMinutes && (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                SLA {result.slaMinutes} min
              </span>
            )}
          </div>

          {/* Fora do horário */}
          {result.outOfHoursMessage && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {result.outOfHoursMessage}
            </div>
          )}

          {/* Itens do catálogo */}
          {result.items.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Itens encontrados</p>
              {result.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-slate-900">{item.name}</span>
                    {item.brand && <span className="text-[10px] text-slate-500">{item.brand}</span>}
                    {item.sku && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Tags className="h-2.5 w-2.5" />{item.sku}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-semibold text-teal-700">{formatPrice(item.price)}</span>
                    {item.stock_available !== null && item.stock_available <= 0 && (
                      <span className="text-[10px] text-red-600">Sem estoque</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Campos faltando */}
          {result.missingFields.length > 0 && (
            <p className="text-[10px] italic text-amber-700">
              Perguntar ao cliente: {result.missingFields.join(", ")}.
            </p>
          )}

          {/* Resposta sugerida */}
          {result.suggestedReply && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-teal-700">Resposta sugerida</p>
              <p className="text-xs leading-5 text-slate-700 whitespace-pre-wrap">{result.suggestedReply}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUseReply(result.suggestedReply)}
                className="mt-1 h-6 w-full border-teal-300 text-[10px] text-teal-700 hover:bg-teal-50"
              >
                Usar esta resposta
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
