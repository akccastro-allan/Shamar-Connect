"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SystemCheck = {
  ok: boolean;
  label: string;
  detail: string;
};

type SystemTestResult = {
  ok: boolean;
  checkedAt: string;
  checks: SystemCheck[];
};

async function loadSystemTest() {
  const response = await fetch("/api/system-test", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Erro ao executar teste");
  return data as SystemTestResult;
}

export function SystemTestPanel() {
  const [data, setData] = useState<SystemTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runTest() {
    setLoading(true);
    setError(null);
    try {
      const result = await loadSystemTest();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar teste");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runTest();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Teste operacional padrão</CardTitle>
              <CardDescription>Validação rápida do ambiente de teste do ShamarConnect.</CardDescription>
            </div>
            <Button onClick={runTest} disabled={loading} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />Executar teste
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {data ? (
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={data.ok ? "secondary" : "destructive"}>{data.ok ? "Ambiente funcional" : "Atenção necessária"}</Badge>
                <span className="text-xs text-muted-foreground">Último teste: {new Date(data.checkedAt).toLocaleString("pt-BR")}</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(data?.checks || []).map((check) => (
          <Card key={check.label} className={check.ok ? "border-emerald-200" : "border-red-200"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {check.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : <XCircle className="h-5 w-5 text-red-700" />}
                {check.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{check.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checklist manual depois do teste</CardTitle>
          <CardDescription>Use estes links para validar visualmente as principais áreas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <a className="rounded-xl border p-3 hover:bg-slate-50" href="/brand/shamar-connect-logo.png" target="_blank">Abrir logo oficial</a>
            <a className="rounded-xl border p-3 hover:bg-slate-50" href="/brand/shamar-connect-icon.png" target="_blank">Abrir ícone oficial</a>
            <a className="rounded-xl border p-3 hover:bg-slate-50" href="/settings/whatsapp">Conectar WhatsApp</a>
            <a className="rounded-xl border p-3 hover:bg-slate-50" href="/whatsapp-import">Importação WhatsApp</a>
            <a className="rounded-xl border p-3 hover:bg-slate-50" href="/contact-import">Importar contatos</a>
            <a className="rounded-xl border p-3 hover:bg-slate-50" href="/group-import-lists">Listas importadas</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
