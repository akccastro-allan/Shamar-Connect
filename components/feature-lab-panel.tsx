import { competitorFeatureMatrix, mvpFeatureDecisions } from "@/lib/feature-lab/research-matrix";
import { scoreConversationForCrm } from "@/lib/feature-lab/lead-scoring";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupExtractionPanel } from "@/components/group-extraction-panel";

const sampleMessage = "Oi, quero saber o valor do plano e se consigo fazer um teste hoje com minha equipe.";
const score = scoreConversationForCrm({ body: sampleMessage, direction: "inbound" });

export function FeatureLabPanel() {
  const p0Features = competitorFeatureMatrix.filter((item) => item.mvpPriority === "P0");

  return (
    <div className="space-y-6">
      <GroupExtractionPanel />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Laboratório CRM + WhatsApp</CardTitle>
            <CardDescription>Teste de classificação, lead score e próxima ação antes da API oficial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-xs font-medium text-muted-foreground">Mensagem de teste</p>
              <p className="mt-2 text-sm text-slate-800">{sampleMessage}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Score</p><p className="text-2xl font-semibold">{score.score}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Intenção</p><p className="text-2xl font-semibold">{score.intent}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Etapa</p><p className="text-2xl font-semibold">{score.recommendedStage}</p></div>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-sm font-medium">Próxima ação</p>
              <p className="mt-1 text-sm text-muted-foreground">{score.recommendedAction}</p>
              <div className="mt-3 flex flex-wrap gap-2">{score.reasons.map((reason) => <Badge key={reason} variant="outline">{reason}</Badge>)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prioridades pesquisadas</CardTitle>
            <CardDescription>Funcionalidades P0 vindas do benchmark inicial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {p0Features.map((item) => (
              <div key={`${item.vendor}-${item.feature}`} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{item.mvpPriority}</Badge>
                  <Badge variant="secondary">{item.category}</Badge>
                </div>
                <p className="mt-3 font-medium">{item.feature}</p>
                <p className="mt-1 text-sm text-muted-foreground">Teste: {item.testImplementation}</p>
                <p className="mt-1 text-xs text-muted-foreground">API oficial: {item.officialApiPath}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
              Próximas fases: {mvpFeatureDecisions.phase02.join(", ")}.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
