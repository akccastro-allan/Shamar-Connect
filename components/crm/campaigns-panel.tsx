"use client";

import { useCallback, useState } from "react";
import { Clock, RefreshCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Segment = "birthday_today" | "birthday_week" | "inactive_30" | "inactive_60" | "inactive_90" | "quote_followup";

type Contact = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  birth_date: string | null;
  last_purchase_at: string | null;
  last_service_at: string | null;
  last_quote_at: string | null;
};

type SegmentResult = {
  ok: boolean;
  segment: Segment;
  total: number;
  contacts: Contact[];
  generatedAt: string;
};

type SegmentCard = {
  segment: Segment;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const SEGMENT_CARDS: SegmentCard[] = [
  {
    segment: "birthday_today",
    title: "Aniversariantes hoje",
    description: "Clientes que fazem aniversário hoje.",
    icon: <Users className="h-5 w-5 text-pink-600" />,
    color: "border-pink-200 bg-pink-50",
  },
  {
    segment: "birthday_week",
    title: "Aniversariantes esta semana",
    description: "Clientes que fazem aniversário nos próximos 7 dias.",
    icon: <Users className="h-5 w-5 text-violet-600" />,
    color: "border-violet-200 bg-violet-50",
  },
  {
    segment: "inactive_30",
    title: "Sem compra há 30 dias",
    description: "Clientes que não compraram ou tiveram atendimento nos últimos 30 dias.",
    icon: <Clock className="h-5 w-5 text-amber-600" />,
    color: "border-amber-200 bg-amber-50",
  },
  {
    segment: "inactive_60",
    title: "Sem compra há 60 dias",
    description: "Clientes inativos há mais de 60 dias.",
    icon: <Clock className="h-5 w-5 text-orange-600" />,
    color: "border-orange-200 bg-orange-50",
  },
  {
    segment: "inactive_90",
    title: "Sem compra há 90 dias",
    description: "Clientes inativos há mais de 90 dias — candidatos à reativação.",
    icon: <Clock className="h-5 w-5 text-red-600" />,
    color: "border-red-200 bg-red-50",
  },
  {
    segment: "quote_followup",
    title: "Orçamento sem retorno",
    description: "Clientes que receberam orçamento há mais de 3 dias sem fechar.",
    icon: <Users className="h-5 w-5 text-slate-600" />,
    color: "border-slate-200 bg-slate-50",
  },
];

const MESSAGE_TEMPLATES: Record<string, string> = {
  birthday_today:
    "Olá, {{primeiro_nome}}! A equipe da {{empresa}} deseja um feliz aniversário para você. Que seu dia seja muito especial! 🎉",
  birthday_week:
    "Olá, {{primeiro_nome}}! A equipe da {{empresa}} deseja um feliz aniversário para você. Que seu dia seja muito especial! 🎉",
  inactive_30:
    "Olá, {{primeiro_nome}}! Faz um tempinho que não falamos. Passando para saber se podemos ajudar com alguma peça, serviço ou orçamento.",
  inactive_60:
    "Olá, {{primeiro_nome}}! Faz um tempinho que não falamos. Passando para saber se podemos ajudar com alguma peça, serviço ou orçamento.",
  inactive_90:
    "Olá, {{primeiro_nome}}! Faz um tempinho que não falamos. Passando para saber se podemos ajudar com alguma peça, serviço ou orçamento.",
  quote_followup:
    "Olá, {{primeiro_nome}}! Vi que você tinha consultado um orçamento com a gente. Ainda precisa de ajuda?",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function previewMessage(template: string, contact: Contact) {
  const firstName = (contact.name || contact.phone).split(" ")[0];
  return template
    .replace(/{{primeiro_nome}}/g, firstName)
    .replace(/{{nome}}/g, contact.name || contact.phone)
    .replace(/{{empresa}}/g, contact.company || "nossa empresa");
}

export function CampaignsPanel() {
  const [results, setResults] = useState<Partial<Record<Segment, SegmentResult>>>({});
  const [loading, setLoading] = useState<Partial<Record<Segment, boolean>>>({});
  const [expanded, setExpanded] = useState<Segment | null>(null);
  const [previewContact, setPreviewContact] = useState<{ segment: Segment; contact: Contact } | null>(null);

  const loadSegment = useCallback(async (segment: Segment) => {
    setLoading((prev) => ({ ...prev, [segment]: true }));
    try {
      const response = await fetch(`/api/crm/campaign-segments?segment=${segment}`, { cache: "no-store" });
      const data: SegmentResult = await response.json();
      setResults((prev) => ({ ...prev, [segment]: data }));
    } catch {
      setResults((prev) => ({ ...prev, [segment]: { ok: false, segment, total: 0, contacts: [], generatedAt: "" } }));
    } finally {
      setLoading((prev) => ({ ...prev, [segment]: false }));
    }
  }, []);

  function toggleExpand(segment: Segment) {
    if (expanded === segment) {
      setExpanded(null);
      return;
    }
    setExpanded(segment);
    if (!results[segment]) loadSegment(segment);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Atenção:</strong> Esta tela mostra segmentos para planejamento de campanhas. Nenhuma mensagem é enviada automaticamente.
        O envio real será implementado em etapa futura com limite diário e aprovação manual.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SEGMENT_CARDS.map((card) => {
          const result = results[card.segment];
          const isLoading = loading[card.segment];
          const isOpen = expanded === card.segment;

          return (
            <div key={card.segment} className="space-y-0">
              <Card className={`border ${card.color}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {card.icon}
                      <CardTitle className="text-base">{card.title}</CardTitle>
                    </div>
                    {result && (
                      <Badge variant="secondary" className="shrink-0 text-base font-semibold">
                        {result.total}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleExpand(card.segment)} disabled={isLoading}>
                      <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                      {isLoading ? "Carregando..." : isOpen ? "Fechar lista" : "Ver contatos"}
                    </Button>
                    <Button size="sm" variant="outline" disabled title="Disparo real não ativado nesta etapa">
                      Preparar campanha
                    </Button>
                  </div>

                  {isOpen && result && (
                    <div className="mt-3 space-y-2">
                      {result.total === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum contato neste segmento agora.</p>
                      ) : (
                        <div className="max-h-64 overflow-auto rounded-xl border bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2">Nome</th>
                                <th className="px-3 py-2">Telefone</th>
                                <th className="px-3 py-2">Prévia</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {result.contacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 font-medium">{contact.name || "—"}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{contact.phone}</td>
                                  <td className="px-3 py-2">
                                    <button
                                      onClick={() => setPreviewContact({ segment: card.segment, contact })}
                                      className="text-emerald-700 underline-offset-2 hover:underline"
                                    >
                                      ver prévia
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Message preview modal */}
      {previewContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreviewContact(null)}>
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-semibold">Prévia da mensagem</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              {previewContact.contact.name || previewContact.contact.phone}
            </p>
            <div className="rounded-xl border bg-emerald-50 p-4 text-sm leading-6 text-slate-900 whitespace-pre-wrap">
              {previewMessage(MESSAGE_TEMPLATES[previewContact.segment] ?? "", previewContact.contact)}
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Esta é apenas uma prévia. Nenhuma mensagem foi enviada.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setPreviewContact(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
