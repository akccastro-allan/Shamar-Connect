import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type InternalCompany = {
  key: string;
  name: string;
  status: "placeholder" | "active";
};

type CommercialOpportunity = {
  id: string;
  title: string;
  stage: string;
  temperature: string;
  potential_value?: number | null;
  updated_at?: string | null;
};

type FollowUp = {
  id: string;
  reason: string;
  priority: string;
  due_at?: string | null;
};

type Props = {
  opportunities: CommercialOpportunity[];
  followUps: FollowUp[];
  tableReady: boolean;
};

const INTERNAL_COMPANIES: InternalCompany[] = [
  { key: "moriah-systems", name: "Moriah Systems", status: "placeholder" },
  { key: "allan-pessoal", name: "Allan/Pessoal", status: "placeholder" },
  { key: "viciados-em-trilhas", name: "Viciados em Trilhas", status: "placeholder" },
  { key: "mk-shalom", name: "MK Shalom", status: "placeholder" },
  { key: "oriahfin", name: "OriahFin", status: "placeholder" },
  { key: "moriah-products", name: "Produtos próprios da Moriah", status: "placeholder" },
];

export function CommercialOperationsPanel({ opportunities, followUps, tableReady }: Props) {
  const hotLeads = opportunities.filter((item) => item.temperature === "hot");
  const proposals = opportunities.filter((item) => ["offer_preparation", "offer_sent", "negotiation"].includes(item.stage));
  const potentialValue = opportunities.reduce((sum, item) => sum + Number(item.potential_value || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <Badge className="bg-[#2ABFAB]/10 text-[#13796D] hover:bg-[#2ABFAB]/10">Centro de Comando</Badge>
        <h1 className="mt-4 text-3xl font-black text-slate-950">Agente Comercial Interno</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Painel operacional para oportunidades internas da Moriah. A Lips permanece fora desta lista por ser tenant cliente.
        </p>
      </div>

      {!tableReady ? (
        <Card className="rounded-[2rem] border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Banco ainda não aplicado</CardTitle>
            <CardDescription className="text-amber-800">
              A migration do agente comercial está preparada, mas este ambiente ainda não possui as tabelas comerciais.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Oportunidades abertas" value={opportunities.length} />
        <MetricCard title="Leads quentes" value={hotLeads.length} />
        <MetricCard title="Propostas aguardando" value={proposals.length} />
        <MetricCard title="Valor potencial" value={formatCurrency(potentialValue)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle>Oportunidades</CardTitle>
            <CardDescription>Estados reais quando houver dados; vazio significa sem oportunidade aberta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities.length === 0 ? (
              <EmptyState text="Nenhuma oportunidade aberta no Centro de Comando." />
            ) : opportunities.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.stage} · {item.temperature}</p>
                  </div>
                  <Badge variant="outline">{formatCurrency(item.potential_value || 0)}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle>Empresas internas</CardTitle>
            <CardDescription>Lips não aparece aqui. Ela é tenant cliente com perfil próprio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {INTERNAL_COMPANIES.map((company) => (
              <div key={company.key} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
                <span className="text-sm font-black text-slate-800">{company.name}</span>
                <Badge variant="outline">observer</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle>Follow-ups vencidos</CardTitle>
          <CardDescription>Preparado para acompanhamento manual. Não há envio automático.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {followUps.length === 0 ? (
            <EmptyState text="Nenhum follow-up vencido." />
          ) : followUps.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
              <p className="font-black text-slate-950">{item.reason}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Prioridade {item.priority}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card className="rounded-[2rem]">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-black text-[#1B2F5B]">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-500">{text}</div>;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
