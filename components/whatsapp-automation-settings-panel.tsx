"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StatusRow = { label: string; value: string; status: "active" | "inactive" | "info" };
type TemplateRow = { key: string; label: string; body: string };

const STATUS_ROWS: StatusRow[] = [
  { label: "Automação segura", value: "Ativa", status: "active" },
  { label: "Responder grupos automaticamente", value: "Desativado — grupos são somente leitura e captação de leads", status: "inactive" },
  { label: "Resposta fora do horário comercial", value: "Ativa fora de seg-sex 08h-18h e sáb 08h-14h", status: "active" },
  { label: "SLA padrão", value: "30 minutos para grupos / definido pelo watchdog para individuais", status: "info" },
  { label: "Idempotência", value: "Ativa — não reenvía para a mesma última mensagem entrada", status: "active" },
  { label: "Disparo em massa", value: "Não implementado nesta versão", status: "inactive" },
];

const TEMPLATES: TemplateRow[] = [
  {
    key: "menu",
    label: "Menu inicial",
    body: "Olá! Seja bem-vindo(a). Para agilizar seu atendimento, escolha uma opção:\n\n1️⃣ Orçamento\n2️⃣ Agendamento\n3️⃣ Financeiro / segunda via\n4️⃣ Falar com atendente\n\nSe preferir, descreva em uma frase o que você precisa.",
  },
  {
    key: "after_hours",
    label: "Fora do horário",
    body: "Olá! No momento estamos fora do horário de atendimento.\nAtendemos de segunda a sexta das 8h às 18h e aos sábados das 8h às 14h.\n\nSeu contato foi registrado e será atendido por ordem de chegada no próximo horário comercial.\n\nPara adiantar, envie nome, serviço desejado e detalhes do pedido.",
  },
  {
    key: "human_requested",
    label: "Encaminhamento para atendente",
    body: "Certo. Vou encaminhar você para um atendente. Seu atendimento ficará na fila por ordem de chegada.",
  },
  {
    key: "quote",
    label: "Orçamento",
    body: "Perfeito. Para orçamento, envie por favor:\n\n1. Modelo do veículo\n2. Ano\n3. Peça ou serviço desejado\n4. Foto, se tiver\n\nAssim que recebermos, um atendente confirma disponibilidade e valor.",
  },
  {
    key: "scheduling",
    label: "Agendamento",
    body: "Certo. Para agendamento, me envie:\n\n1. Nome\n2. Serviço desejado\n3. Melhor dia\n4. Melhor horário\n\nUm atendente vai confirmar a disponibilidade.",
  },
  {
    key: "finance",
    label: "Financeiro",
    body: "Entendi. Para localizar seu atendimento, envie o nome completo do titular ou CPF/CNPJ. Depois disso, um atendente vai conferir.",
  },
  {
    key: "urgent",
    label: "Urgência / reclamação",
    body: "Entendi. Vou priorizar seu atendimento e encaminhar para um atendente agora.",
  },
  {
    key: "fallback",
    label: "Fallback (não classificado)",
    body: "Recebi sua mensagem. Vou encaminhar para um atendente para evitar qualquer erro no atendimento.",
  },
];

const INTENT_WORDS: { intent: string; words: string }[] = [
  { intent: "Humano", words: "atendente, humano, pessoa, vendedor, consultor, suporte, '4'" },
  { intent: "Urgente", words: "urgente, reclama, problema, cancelar, cancelamento, reembolso, processo, procon" },
  { intent: "Orçamento", words: "orçamento, valor, preço, quanto, cotação, peça, '1'" },
  { intent: "Agendamento", words: "agendar, agenda, horário, marcar, revisão, '2'" },
  { intent: "Financeiro", words: "boleto, segunda via, financeiro, pagamento, nota, nf, pix, cobrança, '3'" },
];

export function WhatsappAutomationSettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Atenção:</strong> Esta tela ainda é configuração inicial. Algumas regras ainda estão fixas no backend.
        A edição dos textos e regras será habilitada em versão futura.
      </div>

      {/* Status geral */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status geral da automação</CardTitle>
          <CardDescription>Configuração atual em vigor para todas as conversas individuais.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-xl border">
            {STATUS_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-medium text-slate-900">{row.label}</span>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-muted-foreground">{row.value}</span>
                  <Badge
                    className={
                      row.status === "active"
                        ? "bg-emerald-600"
                        : row.status === "inactive"
                          ? "bg-slate-400"
                          : "bg-blue-500"
                    }
                  >
                    {row.status === "active" ? "ativo" : row.status === "inactive" ? "inativo" : "info"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Palavras-chave */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Palavras-chave por intenção</CardTitle>
          <CardDescription>O bot detecta estas palavras no texto recebido para decidir o encaminhamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-xl border">
            {INTENT_WORDS.map((row) => (
              <div key={row.intent} className="flex items-start gap-4 px-4 py-3 text-sm">
                <Badge variant="secondary" className="mt-0.5 shrink-0">{row.intent}</Badge>
                <span className="text-muted-foreground">{row.words}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Textos configuráveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Textos das respostas automáticas</CardTitle>
          <CardDescription>Textos atuais fixos no backend. Edição será disponibilizada em versão futura.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TEMPLATES.map((template) => (
            <div key={template.key} className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline">{template.key}</Badge>
                <span className="text-sm font-medium text-slate-900">{template.label}</span>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700 leading-5">{template.body}</pre>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Links rápidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Links rápidos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/whatsapp-messages">Central de atendimento</Link></Button>
          <Button asChild variant="outline"><Link href="/whatsapp-diagnostics">Diagnóstico</Link></Button>
          <Button asChild variant="outline"><Link href="/settings/whatsapp">Configurações do WhatsApp</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
