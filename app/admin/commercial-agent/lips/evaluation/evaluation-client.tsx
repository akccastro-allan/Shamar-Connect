"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export type LipsEvaluationConversation = {
  id: string;
  contactLabel: string;
  lastMessageSummary: string;
  status: string;
  lastMessageAt: string | null;
  analyzed: boolean;
};

type Analysis = {
  intent?: string;
  stage?: string;
  temperature?: string;
  confidence?: number;
  objections?: string[];
  missingInformation?: string[];
  recommendedNextAction?: string;
  recommendedDepartment?: string;
  requiresHuman?: boolean;
  riskFlags?: string[];
  summary?: string;
};

type Suggestion = {
  text?: string;
  requiresApproval?: boolean;
  warnings?: string[];
  sources?: Array<{ type: string; reference: string }>;
};

export function LipsEvaluationClient({ conversations }: { conversations: LipsEvaluationConversation[] }) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusMessage, setStatusMessage] = useState("Nenhuma ação executada nesta tela.");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  async function runAnalysis() {
    if (!selectedId) return;
    setErrorMessage("");
    startTransition(async () => {
      const response = await fetch("/api/commercial-agent/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setErrorMessage(data.error || "Falha ao analisar oportunidade.");
        return;
      }
      setAnalysis(data.analysis ?? null);
      setSuggestion(null);
      setSuggestionId(null);
      setStatusMessage("Análise criada. Nenhuma mensagem foi enviada.");
    });
  }

  async function runSuggestion() {
    if (!selectedId) return;
    setErrorMessage("");
    startTransition(async () => {
      const response = await fetch("/api/commercial-agent/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setErrorMessage(data.error || "Falha ao gerar sugestão.");
        return;
      }
      setAnalysis(data.analysis ?? null);
      setSuggestion(data.suggestion ?? null);
      setSuggestionId(data.suggestionId ?? null);
      setEditedText(data.suggestion?.text ?? "");
      setStatusMessage("Sugestão gerada com requiresApproval=true. Nenhuma mensagem foi enviada.");
    });
  }

  async function reviewSuggestion(status: "approved" | "edited" | "rejected") {
    if (!suggestionId) return;
    setErrorMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/commercial-agent/suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, editedText: status === "edited" ? editedText : undefined, rejectionReason: status === "rejected" ? rejectionReason : undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setErrorMessage(data.error || "Falha ao avaliar sugestão.");
        return;
      }
      setStatusMessage(`Sugestão marcada como ${status}. send=false.`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle>Conversa real da Lips</CardTitle>
          <CardDescription>Selecione uma conversa. Não existe análise em massa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-500">Nenhuma conversa Lips disponível para avaliação.</div>
          ) : conversations.map((conversation) => (
            <button
              className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === conversation.id ? "border-[#2ABFAB] bg-[#2ABFAB]/5" : "border-slate-100 bg-white hover:bg-slate-50"}`}
              key={conversation.id}
              onClick={() => {
                setSelectedId(conversation.id);
                setAnalysis(null);
                setSuggestion(null);
                setSuggestionId(null);
                setErrorMessage("");
              }}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black text-slate-900">{conversation.contactLabel}</p>
                <Badge variant={conversation.analyzed ? "default" : "outline"}>{conversation.analyzed ? "analisada" : "sem análise"}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{conversation.lastMessageSummary}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">{formatDateTime(conversation.lastMessageAt)} · {conversation.status}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle>Teste supervisionado</CardTitle>
          <CardDescription>Executa uma conversa por vez. Aprovação é avaliação interna, sem WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-black text-slate-900">Selecionada</p>
            <p className="mt-1">{selectedConversation?.contactLabel ?? "Nenhuma conversa selecionada."}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="rounded-full bg-[#1B2F5B] font-black text-white" disabled={!selectedId || isPending} onClick={runAnalysis}>Analisar oportunidade</Button>
            <Button className="rounded-full bg-[#2ABFAB] font-black text-white" disabled={!selectedId || isPending} onClick={runSuggestion}>Gerar sugestão</Button>
          </div>

          {errorMessage ? <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{errorMessage}</div> : null}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{statusMessage}</div>

          <section className="rounded-2xl border border-slate-100 p-4">
            <h3 className="font-black text-slate-900">Análise estruturada</h3>
            {analysis ? (
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{analysis.temperature ?? "sem temperatura"}</Badge>
                  <Badge variant="outline">{analysis.stage ?? "sem estágio"}</Badge>
                  <Badge variant="outline">confiança {Math.round((analysis.confidence ?? 0) * 100)}%</Badge>
                </div>
                <p className="font-semibold">{analysis.summary ?? "Sem resumo."}</p>
                <p>Próxima ação: {analysis.recommendedNextAction ?? "não definida"}</p>
                <p>Dados faltantes: {(analysis.missingInformation ?? []).join(", ") || "nenhum"}</p>
                <p>Objeções: {(analysis.objections ?? []).join(", ") || "nenhuma"}</p>
              </div>
            ) : <p className="mt-3 text-sm text-slate-500">Ainda não executada.</p>}
          </section>

          <section className="rounded-2xl border border-slate-100 p-4">
            <h3 className="font-black text-slate-900">Sugestão supervisionada</h3>
            {suggestion ? (
              <div className="mt-3 space-y-3">
                <Badge variant={suggestion.requiresApproval ? "default" : "destructive"}>requiresApproval={String(suggestion.requiresApproval)}</Badge>
                <Textarea value={editedText} onChange={(event) => setEditedText(event.target.value)} />
                <Textarea placeholder="Motivo curto da rejeição" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button className="rounded-full" disabled={!suggestionId || isPending} onClick={() => reviewSuggestion("approved")}>Aprovar avaliação</Button>
                  <Button className="rounded-full" disabled={!suggestionId || isPending} onClick={() => reviewSuggestion("edited")} variant="outline">Marcar editada</Button>
                  <Button className="rounded-full" disabled={!suggestionId || isPending} onClick={() => reviewSuggestion("rejected")} variant="destructive">Rejeitar</Button>
                </div>
              </div>
            ) : <p className="mt-3 text-sm text-slate-500">Ainda não gerada.</p>}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
