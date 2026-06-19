"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AiMode = "off" | "copilot" | "assisted" | "human_only";

type LogEntry = {
  id: string;
  conversation_id: string | null;
  mode: string;
  status: string;
  risk_level: string | null;
  intent: string | null;
  blocked_reason: string | null;
  user_message: string | null;
  suggested_response: string | null;
  final_response: string | null;
  sent_at: string | null;
  created_at: string;
};

type Stats = {
  total: number;
  suggested: number;
  sent: number;
  blocked: number;
  ignored: number;
};

const MODES: { value: AiMode; label: string; description: string; color: string }[] = [
  { value: "off", label: "Off", description: "IA completamente desativada.", color: "bg-slate-400" },
  { value: "copilot", label: "Copilot", description: "IA sugere; humano revisa e envia.", color: "bg-blue-600" },
  { value: "assisted", label: "Assistido", description: "IA pode responder chats individuais com logs completos.", color: "bg-amber-500" },
  { value: "human_only", label: "Somente humano", description: "Conversa assumida por humano; IA silenciada.", color: "bg-red-500" },
];

const AI_RULES = [
  { rule: "IA não responde grupos", detail: "Grupos são usados somente para captação de leads. Nenhuma resposta automática." },
  { rule: "IA não fecha venda", detail: "Não confirma reserva, não aceita pedido de compra, não emite recibo." },
  { rule: "IA não dá desconto", detail: "Qualquer menção a desconto ou promoção é encaminhada para humano." },
  { rule: "IA não confirma pagamento", detail: "Pix, boleto, cartão — tudo vai para atendente humano." },
  { rule: "IA não cancela", detail: "Cancelamentos e reembolsos são tratados por humano." },
  { rule: "IA não arquiva conversa", detail: "Nenhuma conversa é marcada como resolvida pela IA." },
  { rule: "IA registra tudo", detail: "Toda sugestão, rejeição e envio são gravados em ai_response_logs para auditoria." },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusColor(status: string) {
  if (status === "sent" || status === "edited") return "bg-emerald-600";
  if (status === "blocked") return "bg-red-600";
  if (status === "suggested") return "bg-blue-500";
  if (status === "ignored") return "bg-slate-400";
  if (status === "failed") return "bg-red-800";
  return "bg-slate-400";
}

function riskColor(risk: string | null) {
  if (risk === "high") return "bg-red-600";
  if (risk === "medium") return "bg-amber-500";
  return "bg-emerald-600";
}

export function AiLabPanel() {
  const [currentMode] = useState<AiMode>("copilot");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, suggested: 0, sent: 0, blocked: 0, ignored: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/logs?limit=50", { cache: "no-store" });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "Erro ao carregar logs");
      setLogs(data.logs || []);
      setStats(data.stats || { total: 0, suggested: 0, sent: 0, blocked: 0, ignored: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar logs de IA");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const sentLogs = logs.filter((l) => l.status === "sent" || l.status === "edited");
  const blockedLogs = logs.filter((l) => l.status === "blocked");
  const suggestedLogs = logs.filter((l) => l.status === "suggested");

  return (
    <div className="space-y-6">
      {/* Mode status */}
      <Card className="border-blue-100 bg-blue-50/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-700" />
            <CardTitle className="text-blue-900">IA supervisionada — modo atual</CardTitle>
          </div>
          <CardDescription>O atendente sempre revisa e aprova antes de qualquer envio. IA nunca age sozinha.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {MODES.map((m) => (
              <div key={m.value} className={`rounded-2xl border p-4 ${currentMode === m.value ? "border-blue-500 bg-white shadow-md" : "border-slate-200 bg-white/60"}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${m.color}`} />
                  <span className="font-bold text-slate-900">{m.label}</span>
                  {currentMode === m.value && <Badge className="ml-auto bg-blue-600 text-xs">atual</Badge>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{m.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium text-blue-800">Modo padrão: <strong>Copilot</strong> — IA sugere, humano decide e envia.</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total sugestões</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-700">Pendentes</p>
          <p className="text-2xl font-semibold text-blue-800">{stats.suggested}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">Enviadas</p>
          <p className="text-2xl font-semibold text-emerald-800">{stats.sent}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">Bloqueadas</p>
          <p className="text-2xl font-semibold text-red-800">{stats.blocked}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Ignoradas</p>
          <p className="text-2xl font-semibold">{stats.ignored}</p>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      {/* Log sections */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Sugestões recentes</CardTitle>
              <CardDescription>Aguardando revisão do atendente.</CardDescription>
            </div>
            <Button onClick={loadLogs} disabled={loading} variant="ghost" size="sm"><RefreshCcw className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedLogs.slice(0, 8).map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
            {suggestedLogs.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma sugestão pendente.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enviadas recentes</CardTitle>
            <CardDescription>Aprovadas e enviadas pelo atendente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sentLogs.slice(0, 8).map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
            {sentLogs.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma enviada ainda.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bloqueadas recentes</CardTitle>
            <CardDescription>Grupos ou tópicos de alto risco.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {blockedLogs.slice(0, 8).map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
            {blockedLogs.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma bloqueada.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regras absolutas da IA</CardTitle>
          <CardDescription>Estas regras são imutáveis no código — nenhuma configuração as desativa.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-xl border">
            {AI_RULES.map(({ rule, detail }) => (
              <div key={rule} className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{rule}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogCard({ log }: { log: LogEntry }) {
  return (
    <div className="rounded-xl border bg-white p-3 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={`${statusColor(log.status)} text-white`}>{log.status}</Badge>
        {log.risk_level && <Badge className={`${riskColor(log.risk_level)} text-white`}>{log.risk_level}</Badge>}
        {log.intent && <Badge variant="outline">{log.intent}</Badge>}
        {log.blocked_reason && <Badge variant="outline" className="border-red-300 text-red-700">{log.blocked_reason}</Badge>}
      </div>
      {log.user_message && <p className="mt-2 line-clamp-2 text-muted-foreground">"{log.user_message}"</p>}
      {log.suggested_response && <p className="mt-1 line-clamp-2 font-medium text-slate-800">→ {log.suggested_response}</p>}
      <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(log.created_at)}</p>
    </div>
  );
}
