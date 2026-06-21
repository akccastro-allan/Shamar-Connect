import Link from "next/link";
import { Users, MessageCircle, Activity, Cloud, Rocket, Upload, Settings, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Metrics = {
  contactCount: number;
  conversationCount: number;
  openConversationCount: number;
  connectedChannelCount: number;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

function formatCount(value: number) {
  return numberFormatter.format(value);
}

const quickActions: { label: string; helper: string; href: string; icon: LucideIcon }[] = [
  { label: "Atender no WhatsApp", helper: "Veja a fila e responda seus clientes", href: "/whatsapp-messages", icon: MessageCircle },
  { label: "Contatos", helper: "Sua base de leads e clientes", href: "/contacts", icon: Users },
  { label: "Importar conversas", helper: "Traga o histórico do WhatsApp", href: "/whatsapp-import", icon: Upload },
  { label: "Configurar conexão", helper: "Conecte ou ajuste seus canais", href: "/settings/whatsapp", icon: Settings },
];

export function DashboardOperationalPanel({ metrics }: { metrics: Metrics }) {
  const isEmpty =
    metrics.contactCount === 0 &&
    metrics.conversationCount === 0 &&
    metrics.connectedChannelCount === 0;

  const cards: { label: string; helper: string; value: number; icon: LucideIcon; href: string; highlight?: boolean }[] = [
    { label: "Contatos na base", helper: "Leads e clientes salvos", value: metrics.contactCount, icon: Users, href: "/contacts" },
    { label: "Conversas", helper: "Atendimentos registrados", value: metrics.conversationCount, icon: MessageCircle, href: "/whatsapp-messages" },
    { label: "Em aberto agora", helper: "Aguardando sua resposta", value: metrics.openConversationCount, icon: Activity, href: "/whatsapp-messages", highlight: metrics.openConversationCount > 0 },
    { label: "Canais conectados", helper: "WhatsApp ativo", value: metrics.connectedChannelCount, icon: Cloud, href: "/settings/whatsapp" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[#1B2F5B] p-6 text-white shadow-xl lg:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-[#2ABFAB] text-white hover:bg-[#2ABFAB]">Atendimento e vendas</Badge>
          <Badge variant="secondary">Sistema online</Badge>
        </div>
        <h2 className="mt-5 max-w-2xl text-2xl font-black tracking-tight md:text-3xl">
          {metrics.openConversationCount > 0
            ? `Você tem ${formatCount(metrics.openConversationCount)} ${metrics.openConversationCount === 1 ? "conversa esperando" : "conversas esperando"}`
            : "Tudo em dia por aqui"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
          {metrics.openConversationCount > 0
            ? "Abra a central de atendimento para responder quem está esperando."
            : "Nenhuma conversa pendente no momento. Que tal revisar seus contatos ou campanhas?"}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#2ABFAB] px-5 font-black text-white hover:bg-[#24aa98]">
            <Link href="/whatsapp-messages">Ir para o atendimento</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-full font-black">
            <Link href="/contacts">Ver contatos</Link>
          </Button>
        </div>
      </section>

      {isEmpty ? (
        <section className="flex flex-col items-start gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2ABFAB]/15 text-[#2ABFAB]">
              <Rocket className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-black text-[#1B2F5B]">Vamos começar?</h3>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Conecte seu WhatsApp e importe suas conversas para ver tudo acontecendo aqui no painel.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 rounded-full bg-[#1B2F5B] px-5 font-black text-white hover:bg-[#16264a]">
            <Link href="/getting-started">Primeiros passos</Link>
          </Button>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                href={card.href}
                className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2ABFAB]/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      card.highlight ? "bg-[#C9952A]/15 text-[#C9952A]" : "bg-[#1B2F5B]/10 text-[#1B2F5B]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {card.highlight ? (
                    <span className="rounded-full bg-[#C9952A]/15 px-2.5 py-1 text-xs font-black text-[#C9952A]">Atenção</span>
                  ) : null}
                </div>
                <p className="mt-4 text-3xl font-black text-[#1B2F5B]">{formatCount(card.value)}</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{card.label}</p>
                <p className="text-xs text-slate-500">{card.helper}</p>
              </Link>
            );
          })}
        </section>
      )}

      <section>
        <h3 className="mb-3 px-1 text-sm font-black uppercase tracking-wide text-slate-500">Atalhos rápidos</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card key={action.href} className="rounded-[1.5rem] border-slate-200 shadow-sm transition hover:shadow-md">
                <CardHeader className="pb-3">
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2ABFAB]/15 text-[#2ABFAB]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-base text-[#1B2F5B]">{action.label}</CardTitle>
                  <CardDescription>{action.helper}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={action.href}
                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl border bg-white px-4 py-2 text-sm font-black text-[#1B2F5B] transition hover:bg-slate-50"
                  >
                    Abrir
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
