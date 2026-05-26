import { Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AiCopilotPanel() {
  const suggestion = "Oi, Ana. Consegue testar sim. O caminho mais simples é começarmos com inbox, etiquetas e respostas rápidas para os 3 atendentes. Assim vocês validam se o ShamarConnect reduz mensagens perdidas e melhora o tempo de resposta antes de avançar para automações.";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle>IA copiloto comercial</CardTitle>
        </div>
        <CardDescription>Resposta humana, consultiva e revisada pelo atendente antes do envio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea defaultValue={suggestion} />
        <div className="flex flex-wrap gap-2">
          <Button>Usar resposta</Button>
          <Button variant="outline">Gerar alternativa</Button>
        </div>
      </CardContent>
    </Card>
  );
}
