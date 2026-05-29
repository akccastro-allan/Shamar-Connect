"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch, Plus, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FlowStep = {
  id: string;
  step_order: number;
  title: string;
  message_body: string;
  wait_minutes: number;
  step_type: string;
};

type ConversationFlow = {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  status: string;
  tags?: string[];
  conversation_flow_steps?: FlowStep[];
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha na operação");
  return data;
}

export function ConversationFlowsManager() {
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [stepTitle, setStepTitle] = useState("");
  const [stepBody, setStepBody] = useState("");
  const [waitMinutes, setWaitMinutes] = useState(0);
  const [stepType, setStepType] = useState("message");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedFlow = useMemo(() => flows.find((flow) => flow.id === selectedFlowId) || flows[0], [flows, selectedFlowId]);

  async function loadFlows() {
    setLoading(true);
    setError(null);
    try {
      const data = await readJson<{ ok: boolean; flows: ConversationFlow[] }>("/api/conversation-flows");
      const loadedFlows = data.flows || [];
      setFlows(loadedFlows);
      if (!selectedFlowId && loadedFlows[0]?.id) setSelectedFlowId(loadedFlows[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar fluxos");
    } finally {
      setLoading(false);
    }
  }

  async function createFlow() {
    if (!name.trim() || !firstMessage.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await readJson("/api/conversation-flows", {
        method: "POST",
        body: JSON.stringify({ name, description, firstMessage }),
      });
      setName("");
      setDescription("");
      setFirstMessage("");
      setNotice("Fluxo criado com sucesso.");
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar fluxo");
    } finally {
      setLoading(false);
    }
  }

  async function addStep() {
    if (!selectedFlow?.id || !stepTitle.trim() || !stepBody.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const nextOrder = Number(selectedFlow.conversation_flow_steps?.length || 0) + 1;
      await readJson(`/api/conversation-flows/${selectedFlow.id}/steps`, {
        method: "POST",
        body: JSON.stringify({
          title: stepTitle,
          messageBody: stepBody,
          stepOrder: nextOrder,
          waitMinutes,
          stepType,
        }),
      });
      setStepTitle("");
      setStepBody("");
      setWaitMinutes(0);
      setStepType("message");
      setNotice("Etapa adicionada.");
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar etapa");
    } finally {
      setLoading(false);
    }
  }

  async function archiveFlow(id: string) {
    setError(null);
    setNotice(null);
    try {
      await readJson("/api/conversation-flows", {
        method: "PATCH",
        body: JSON.stringify({ id, status: "archived" }),
      });
      setNotice("Fluxo arquivado.");
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao arquivar fluxo");
    }
  }

  useEffect(() => {
    loadFlows();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" />Fluxos de conversa</CardTitle>
              <CardDescription>Crie sequências manuais de atendimento para aplicar na Central WhatsApp.</CardDescription>
            </div>
            <Button onClick={loadFlows} disabled={loading} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Fluxos</p><p className="text-2xl font-semibold">{flows.length}</p></div>
            <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Ativos</p><p className="text-2xl font-semibold">{flows.filter((flow) => flow.status === "active").length}</p></div>
            <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Modo</p><p className="text-2xl font-semibold">Manual</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Criar fluxo</CardTitle>
            <CardDescription>Comece com uma primeira mensagem. Depois adicione novas etapas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do fluxo" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
            <textarea value={firstMessage} onChange={(event) => setFirstMessage(event.target.value)} rows={5} placeholder="Primeira mensagem do fluxo" className="w-full rounded-2xl border bg-white p-3 text-sm" />
            <Button onClick={createFlow} disabled={loading || !name.trim() || !firstMessage.trim()} className="w-full"><Plus className="mr-2 h-4 w-4" />Criar fluxo</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fluxos cadastrados</CardTitle>
            <CardDescription>Selecione um fluxo para ver e adicionar etapas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
              <div className="max-h-[640px] space-y-2 overflow-auto pr-1">
                {flows.map((flow) => (
                  <button key={flow.id} onClick={() => setSelectedFlowId(flow.id)} className={`w-full rounded-2xl border p-3 text-left transition hover:bg-slate-50 ${selectedFlow?.id === flow.id ? "bg-emerald-50" : "bg-white"}`}>
                    <p className="font-medium text-slate-950">{flow.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{flow.description || "Sem descrição"}</p>
                    <div className="mt-2 flex flex-wrap gap-2"><Badge variant="secondary">{flow.status}</Badge><Badge variant="outline">{flow.trigger_type}</Badge></div>
                  </button>
                ))}
                {flows.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum fluxo cadastrado.</div> : null}
              </div>

              <div className="space-y-4">
                {selectedFlow ? (
                  <>
                    <div className="rounded-2xl border bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">{selectedFlow.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedFlow.description || "Sem descrição"}</p>
                        </div>
                        <Button onClick={() => archiveFlow(selectedFlow.id)} variant="outline" size="sm">Arquivar</Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(selectedFlow.conversation_flow_steps || []).map((step) => (
                        <div key={step.id} className="rounded-2xl border bg-white p-4">
                          <div className="flex flex-wrap items-center gap-2"><Badge>{step.step_order}</Badge><Badge variant="outline">{step.step_type}</Badge><Badge variant="secondary">aguarda {step.wait_minutes} min</Badge></div>
                          <p className="mt-3 font-medium text-slate-950">{step.title}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{step.message_body}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border bg-white p-4">
                      <p className="font-medium">Adicionar etapa</p>
                      <div className="mt-3 space-y-3">
                        <input value={stepTitle} onChange={(event) => setStepTitle(event.target.value)} placeholder="Título da etapa" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
                        <select value={stepType} onChange={(event) => setStepType(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                          <option value="message">Mensagem</option>
                          <option value="question">Pergunta</option>
                          <option value="follow_up">Follow-up</option>
                        </select>
                        <input type="number" min={0} value={waitMinutes} onChange={(event) => setWaitMinutes(Number(event.target.value))} placeholder="Aguardar minutos" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
                        <textarea value={stepBody} onChange={(event) => setStepBody(event.target.value)} rows={5} placeholder="Mensagem da etapa" className="w-full rounded-2xl border bg-white p-3 text-sm" />
                        <Button onClick={addStep} disabled={loading || !stepTitle.trim() || !stepBody.trim()} className="w-full"><Plus className="mr-2 h-4 w-4" />Adicionar etapa</Button>
                      </div>
                    </div>
                  </>
                ) : <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum fluxo selecionado.</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
