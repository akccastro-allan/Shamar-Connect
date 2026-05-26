import { extractGroupParticipantsToList, mockGroupParticipants } from "@/lib/whatsapp-web/group-extractor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const extraction = extractGroupParticipantsToList({
  listName: "Lista importada de grupos WhatsApp Web",
  participants: mockGroupParticipants,
  existingPhones: ["+5521900001002"],
  optedOutPhones: ["+5531900001003"],
});

export function GroupExtractionPanel() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Extrair contatos de grupos</CardTitle>
            <CardDescription>Função experimental para WhatsApp Web: importar participantes visíveis para uma lista revisável no CRM.</CardDescription>
          </div>
          <Badge variant="warning">WhatsApp Web Lab</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Participantes</p><p className="text-2xl font-semibold">{extraction.totalParticipants}</p></div>
          <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Únicos</p><p className="text-2xl font-semibold">{extraction.uniqueContacts}</p></div>
          <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Duplicados</p><p className="text-2xl font-semibold">{extraction.duplicatesRemoved}</p></div>
          <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Status</p><p className="text-2xl font-semibold">{extraction.status}</p></div>
        </div>

        <div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Regra de uso</p>
          <p className="mt-1">A lista nasce como rascunho. Contatos sem opt-in ficam bloqueados para campanhas e só podem ser qualificados manualmente ou receber mensagens dentro de contexto permitido.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Consentimento</th>
                <th className="px-4 py-3">CRM</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {extraction.contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-4 py-3 font-medium">{contact.name}</td>
                  <td className="px-4 py-3">{contact.phone}</td>
                  <td className="px-4 py-3">{contact.sourceGroups.join(", ")}</td>
                  <td className="px-4 py-3"><Badge variant={contact.consentStatus === "opted_out" ? "destructive" : "outline"}>{contact.consentStatus}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={contact.crmStatus === "existing" ? "success" : "secondary"}>{contact.crmStatus}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button>Salvar lista rascunho</Button>
          <Button variant="outline">Enviar para revisão</Button>
          <Button variant="ghost">Exportar CSV</Button>
        </div>
      </CardContent>
    </Card>
  );
}
