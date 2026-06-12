"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  MessageCircle,
  RefreshCcw,
  TestTube2,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
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
  {
    label: "Teste do sistema",
    href: "/system-test",
    icon: TestTube2,
    description: "Valide aplicação, banco, gateway e integrações.",
  },
  {
    label: "Conectar WhatsApp",
    href: "/settings/whatsapp",
    icon: MessageCircle,
    description: "Acompanhe QR Code, telefone e status de conexão.",
  },
  {
    label: "Importação WhatsApp",
    href: "/whatsapp-import",
    icon: Download,
    description: "Salve conversas, grupos e dados comerciais.",
  },
  {
    label: "Importar contatos",
    href: "/contact-import",
    icon: Upload,
    description: "Traga listas de leads, clientes e oportunidades.",
  },
];

const pipeline = [
  { label: "Novos leads", value: "18", detail: "entrada comercial" },
  { label: "Em atendimento", value: "11", detail: "conversas ativas" },
  { label: "Propostas", value: "7", detail: "negociações abertas" },
  { label: "Fechamentos", value: "3", detail: "prontos para venda" },
];

const tasks = [
  "Confirmar conexão do WhatsApp principal",
  "Revisar contatos importados antes de campanhas",
  "Criar respostas rápidas para dúvidas frequentes",
  "Acompanhar leads sem retorno no funil comercial",
];

function MetricCard({
  label,
  value,
  icon: Icon,
  helper,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  helper: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2ABFAB]/10 text-[#2ABFAB]">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
          hoje
        </span>
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-4xl font-black tracking-tight text-[#1B2F5B]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

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
  const whatsappStatus = summary?.whatsapp.status || "carregando";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#1B2F5B] text-white shadow-xl">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-[#2ABFAB] text-white hover:bg-[#2ABFAB]">
                Operação comercial
              </Badge>
              <Badge variant={whatsappReady ? "secondary" : "destructive"}>
                WhatsApp: {whatsappStatus}
              </Badge>
            </div>

            <h2 className="mt-6 max-w-2xl text-3xl font-black tracking-tight md:text-4xl">
              Central de controle do atendimento e vendas
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
              Acompanhe WhatsApp, CRM, contatos, mensagens e importações em uma visão executiva para demonstrar a operação do ShamarConnect.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                onClick={refresh}
                disabled={loading}
                className="rounded-full bg-[#2ABFAB] px-5 font-black text-white hover:bg-[#24aa98]"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar painel
              </Button>
              <Button asChild variant="secondary" className="rounded-full font-black">
                <Link href="/settings/whatsapp">Conectar WhatsApp</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white/60">Status do ambiente</p>
                <p className="mt-1 text-2xl font-black">Sistema operacional</p>
              </div>
              <CheckCircle2 className="h-9 w-9 text-[#2ABFAB]" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/60">Telefone</p>
                <p className="mt-1 truncate text-sm font-bold">
                  {summary?.whatsapp.phone || "não informado"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/60">Última checagem</p>
                <p className="mt-1 text-sm font-bold">
                  {summary?.checkedAt ? new Date(summary.checkedAt).toLocaleString("pt-BR") : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Contatos CRM"
          value={summary?.metrics.contacts ?? "—"}
          icon={Users}
          helper="base de relacionamento comercial"
        />
        <MetricCard
          label="Conversas salvas"
          value={summary?.metrics.conversations ?? "—"}
          icon={MessageCircle}
          helper="histórico centralizado de atendimento"
        />
        <MetricCard
          label="Mensagens"
          value={summary?.metrics.messages ?? "—"}
          icon={BarChart3}
          helper="volume processado na operação"
        />
        <MetricCard
          label="Listas importadas"
          value={summary?.metrics.importedLists ?? "—"}
          icon={Download}
          helper="fontes de contatos para ação comercial"
        />
        <MetricCard
          label="Contatos de grupos"
          value={summary?.metrics.importedContacts ?? "—"}
          icon={Upload}
          helper="leads vindos de importações"
        />
      </section>

      {summary?.warnings?.length ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{summary.warnings.join(" | ")}</span>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1B2F5B]">
              <TrendingUp className="h-5 w-5 text-[#2ABFAB]" />
              Funil comercial demonstrativo
            </CardTitle>
            <CardDescription>
              Uma visão executiva para mostrar como o ShamarConnect organiza a operação comercial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {pipeline.map((item) => (
                <div key={item.label} className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-black text-[#1B2F5B]">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1B2F5B]">
              <Activity className="h-5 w-5 text-[#2ABFAB]" />
              Saúde da operação
            </CardTitle>
            <CardDescription>Resumo dos principais serviços.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <span>Vercel/App</span>
              <Badge variant="secondary">online</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <span>Supabase</span>
              <Badge variant="secondary">conectado</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <span>Railway Gateway</span>
              <Badge variant={summary?.whatsapp.status === "error" ? "destructive" : "secondary"}>
                {summary?.whatsapp.status || "—"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.href} className="rounded-[2rem] border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2ABFAB]/10 text-[#2ABFAB]">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base text-[#1B2F5B]">{action.label}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={action.href}
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl border bg-white px-4 py-2 text-sm font-black text-[#1B2F5B] transition hover:bg-slate-50"
                >
                  Abrir recurso
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1B2F5B]">
              <CheckCircle2 className="h-5 w-5 text-[#2ABFAB]" />
              Próximas ações recomendadas
            </CardTitle>
            <CardDescription>Checklist para deixar a operação pronta para demonstração.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {tasks.map((task) => (
                <li key={task} className="flex items-start gap-3 rounded-2xl border p-3">
                  <CheckIcon />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1B2F5B]">Resumo para apresentação</CardTitle>
            <CardDescription>Mensagem comercial para demonstrar o produto.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-[#1B2F5B] p-5 text-white">
              <p className="text-sm leading-7 text-white/75">
                “O ShamarConnect organiza o WhatsApp da empresa, centraliza conversas, registra contatos, acompanha oportunidades e prepara a equipe para vender com mais processo e menos improviso.”
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
