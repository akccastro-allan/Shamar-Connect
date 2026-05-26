import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

const conversations = [
  { id: "conv_ana", name: "Ana Carvalho", company: "Clínica Vida", status: "open", preview: "Consigo testar com minha equipe ainda esta semana?", lastMessageAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), unreadCount: 2, tags: ["Lead quente", "Follow-up"] },
  { id: "conv_marcos", name: "Pr. Marcos Lima", company: "Comunidade Nova Aliança", status: "pending", preview: "Vocês conseguem separar atendimento pastoral e secretaria?", lastMessageAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), unreadCount: 1, tags: ["Igreja"] },
  { id: "conv_julia", name: "Júlia Mendes", company: "Studio JM", status: "resolved", preview: "Perfeito, pode me mandar os próximos passos.", lastMessageAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), unreadCount: 0, tags: ["Follow-up"] },
];

export function ConversationList() {
  return (
    <Card>
      <CardHeader><CardTitle>Conversas recentes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{conversation.name}</p>
                <p className="text-xs text-muted-foreground">{conversation.company}</p>
              </div>
              <Badge variant={conversation.status === "open" ? "success" : conversation.status === "pending" ? "warning" : "secondary"}>{conversation.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-700">{conversation.preview}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDateTime(conversation.lastMessageAt)}</span>
              {conversation.unreadCount ? <Badge variant="default">{conversation.unreadCount} novas</Badge> : null}
              {conversation.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
