"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Download, MessageCircle, RefreshCcw, TestTube2, Upload, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardSummary = {
  ok: boolean;
  checkedAt: string;
  whatsapp: { status: string; phone: string | null };
  metrics: {
    contacts: number;
    conversations: number;
    messages: number;
    importedLists: number;
    importedContacts: number;
  };
  warnings: string[];
};

async function loadSummary() {
  const response = await fetch("/api/dashboard/summary", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Erro ao carregar dashboard");
  return data as DashboardSummary;
}

const quickActions = [
  { label: "Teste do sistema", href: "/system-test", icon: TestTube2, description: "Validar Vercel, Supabase e Railway." },
  { label: "Conectar WhatsApp", href: "/settings/whatsapp", icon: MessageCircle, description: "Ver QR Code e status da conexão." },
  { label: "Importação WhatsApp", href: "/whatsapp-import", icon: Download, description: "Salvar conversas e exportar grupos." },
  { label: "Importar contatos", href: "/contact-import", icon: Upload, description: "TXT, CSV, planilha, Google e Microsoft." },
];

export function DashboardOperationalPanel() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setSummary(await loadSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const whatsappReady = summary?.whatsapp.status === "ready";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl">Painel operacional</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Acompanhe a saúde do ambiente, conexão WhatsApp, CRM, mensagens e importações em um só lugar.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={whatsappReady ? "secondary" : "destructive"}>WhatsApp: {summary?.whatsapp.status || "carregando"}</Badge>
              <Button onClick={refresh} disabled={loading} variant="outline" size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Contatos CRM</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">{summary?.metrics.contacts ?? "—"}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Conversas salvas</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">{summary?.metrics.conversations ?? "—"}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Mensagens</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">{summary?.metrics.messages ?? "—"}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Listas importadas</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">{summary?.metrics.importedLists ?? "—"}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Contatos de grupos</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">{summary?.metrics.importedContacts ?? "—"}</p>
            </div>
          </div>
          {summary?.warnings?.length ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{summary.warnings.join(" | ")}</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.href}>
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></div>
                <CardTitle className="text-base">{action.label}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full"><Link href={action.href}>Abrir</Link></Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Status do ambiente</CardTitle>
            <CardDescription>Resumo da operação atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Vercel/App</span><Badge variant="secondary">online</Badge></div>
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Supabase</span><Badge variant="secondary">conectado</Badge></div>
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Railway Gateway</span><Badge variant={summary?.whatsapp.status === "error" ? "destructive" : "secondary"}>{summary?.whatsapp.status || "—"}</Badge></div>
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Telefone</span><span className="text-muted-foreground">{summary?.whatsapp.phone || "não informado"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />Próximos passos operacionais</CardTitle>
            <CardDescription>Fluxo recomendado para testar e operar o ShamarConnect.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="rounded-xl border p-3">1. Rodar o <Link className="font-medium text-emerald-700" href="/system-test">Teste do sistema</Link>.</li>
              <li className="rounded-xl border p-3">2. Confirmar se o WhatsApp Web está conectado em <Link className="font-medium text-emerald-700" href="/settings/whatsapp">Configurações</Link>.</li>
              <li className="rounded-xl border p-3">3. Sincronizar conversas ou grupos em <Link className="font-medium text-emerald-700" href="/whatsapp-import">Importação WhatsApp</Link>.</li>
              <li className="rounded-xl border p-3">4. Revisar listas importadas antes de campanhas.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
