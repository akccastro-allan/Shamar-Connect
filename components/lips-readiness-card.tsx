"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LipsReadiness } from "@/app/api/demo/lips-readiness/route";

type Indicator = {
  label: string;
  ok: boolean;
  value: string;
};

function buildIndicators(r: LipsReadiness): Indicator[] {
  return [
    {
      label: "WhatsApp Ready",
      ok: r.whatsappChannel.exists,
      value: r.whatsappChannel.exists ? "Canal configurado" : "Sem canal",
    },
    {
      label: "Sync OK",
      ok: r.conversations.count > 0,
      value: r.conversations.count > 0 ? `${r.conversations.count} conversas` : "Sem conversas",
    },
    {
      label: "Contatos",
      ok: r.contacts.count > 0,
      value: `${r.contacts.count} no CRM`,
    },
    {
      label: "Atendentes",
      ok: r.agents.count >= 5,
      value: `${r.agents.count}/5 cadastrados`,
    },
    {
      label: "Pipeline",
      ok: r.pipeline.stagesCount > 0,
      value: `${r.pipeline.stagesCount} etapa(s)`,
    },
  ];
}

export function LipsReadinessCard() {
  const [readiness, setReadiness] = useState<LipsReadiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/lips-readiness", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erro ao carregar");
      setReadiness(data.readiness);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const indicators = readiness ? buildIndicators(readiness) : [];
  const okCount = indicators.filter((i) => i.ok).length;
  const allOk = okCount === indicators.length && indicators.length > 0;

  return (
    <Card className={allOk ? "border-emerald-200" : "border-amber-200"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Lips Readiness</CardTitle>
          <div className="flex items-center gap-2">
            {readiness && (
              <Badge className={allOk ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                {okCount}/{indicators.length} OK
              </Badge>
            )}
            <Button onClick={load} disabled={loading} variant="ghost" size="icon" className="h-7 w-7">
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Prontidão para demonstração</p>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-xs text-red-700">{error}</p>}

        {!readiness && !error && (
          <p className="text-xs text-muted-foreground animate-pulse">Verificando...</p>
        )}

        {readiness && !readiness.lipsOrgId && (
          <p className="text-xs text-red-700 mb-3">Organização Lips não encontrada no banco.</p>
        )}

        {readiness && indicators.length > 0 && (
          <div className="space-y-2">
            {indicators.map((ind) => (
              <div key={ind.label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${ind.ok ? "bg-emerald-500" : "bg-red-400"}`}
                  >
                    {ind.ok ? "✓" : "✗"}
                  </span>
                  <span className="text-xs font-medium">{ind.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{ind.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs h-7">
            <Link href="/demo-checklist">Ver checklist completo</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
