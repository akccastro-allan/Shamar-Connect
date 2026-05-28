import Link from "next/link";
import { Bot, CheckCircle2, Download, LayoutDashboard, MessageCircle, Smartphone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    title: "Dashboard operacional",
    description: "Visão rápida de WhatsApp, contatos, mensagens, importações e pendências.",
    icon: LayoutDashboard,
    href: "/dashboard",
    status: "Prioridade alta",
  },
  {
    title: "Inbox / Mensagens",
    description: "Central de atendimento com lista de conversas, leitura, CRM e ações rápidas.",
    icon: MessageCircle,
    href: "/whatsapp-messages",
    status: "Prioridade alta",
  },
  {
    title: "Listas importadas",
    description: "Revisão de contatos de grupos, aprovação/reprovação, filtros e exportação CSV.",
    icon: Users,
    href: "/group-import-lists",
    status: "Em evolução",
  },
  {
    title: "Mobile/PWA",
    description: "Conceito inspirado em app mobile de chatbot para atendimento e IA comercial.",
    icon: Smartphone,
    href: "#mobile-pwa",
    status: "Conceito",
  },
];

export function UiLabPanel() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl">Laboratório visual do ShamarConnect</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Espaço para testar ideias visuais inspiradas no Admin Bizzark e no conceito mobile/PWA do Amigo AI, sem quebrar as telas funcionais do sistema.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">UI Lab</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Referência web</p>
              <p className="mt-1 font-semibold text-slate-950">Admin Bizzark</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Referência mobile</p>
              <p className="mt-1 font-semibold text-slate-950">Amigo AI PWA</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Estratégia</p>
              <p className="mt-1 font-semibold text-slate-950">Inspirar, não copiar</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Base técnica</p>
              <p className="mt-1 font-semibold text-slate-950">Next + Tailwind</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.title}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline">{module.status}</Badge>
                </div>
                <CardTitle className="text-base">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={module.href}>Abrir referência</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Conceito de dashboard</CardTitle>
            <CardDescription>Bloco visual para evoluir a tela principal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="mt-1 text-2xl font-semibold">ready</p>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-xs text-muted-foreground">Contatos</p>
                <p className="mt-1 text-2xl font-semibold">CRM</p>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-xs text-muted-foreground">Revisões</p>
                <p className="mt-1 text-2xl font-semibold">Pendentes</p>
              </div>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="font-medium">Atalhos operacionais</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button asChild variant="outline"><Link href="/system-test"><CheckCircle2 className="mr-2 h-4 w-4" />Teste do sistema</Link></Button>
                <Button asChild variant="outline"><Link href="/whatsapp-import"><Download className="mr-2 h-4 w-4" />Importar WhatsApp</Link></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="mobile-pwa">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" />Conceito Mobile/PWA</CardTitle>
            <CardDescription>Primeira direção visual para celular.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-[300px] rounded-[2rem] border bg-slate-950 p-3 shadow-xl">
              <div className="rounded-[1.5rem] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">ShamarConnect</p>
                    <p className="font-semibold">Assistente IA</p>
                  </div>
                  <Bot className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-slate-100 p-3 text-sm">Resumo do dia: 12 conversas, 4 contatos novos e 2 listas pendentes.</div>
                  <div className="ml-8 rounded-2xl bg-emerald-600 p-3 text-sm text-white">Gerar resposta rápida para esse lead.</div>
                  <div className="rounded-2xl bg-slate-100 p-3 text-sm">Posso sugerir uma abordagem comercial com tom consultivo.</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border p-2 text-center">Inbox</div>
                  <div className="rounded-xl border p-2 text-center">CRM</div>
                  <div className="rounded-xl border p-2 text-center">Importar</div>
                  <div className="rounded-xl border p-2 text-center">IA</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
