import Link from "next/link";
import { Users, MessageCircle, Activity, Cloud, Rocket, Settings, CheckCircle2, Bot, Clock, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Metrics = {
  contactCount: number;
  openConversationCount: number;
  pendingConversationCount: number;
  assignedConversationCount: number;
  resolvedTodayCount: number;
  inboundTodayCount: number;
  connectedChannelCount: number;
  activeAutomationCount: number;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

function formatCount(value: number) {
  return numberFormatter.format(value);
}

const quickActions: { label: string; helper: string; href: string; icon: LucideIcon }[] = [
  { label: "Abrir atendimentos", helper: "Veja a fila e responda clientes", href: "/whatsapp-messages", icon: MessageCircle },
  { label: "Ver contatos", helper: "Consulte sua base de clientes", href: "/contacts", icon: Users },
  { label: "Configurar WhatsApp", helper: "Ajuste a conexão do canal", href: "/settings/whatsapp", icon: Settings },
];

export function DashboardOperationalPanel({ metrics }: { metrics: Metrics }) {
  const isEmpty =
    metrics.contactCount === 0 &&
    metrics.openConversationCount === 0 &&
    metrics.pendingConversationCount === 0 &&
    metrics.inboundTodayCount === 0 &&
    metrics.connectedChannelCount === 0;

  const cards: { label: string; helper: string; value: number; icon: LucideIcon; href: string; highlight?: boolean }[] = [
    { label: "Aguardando atendimento", helper: "Conversas na fila", value: metrics.pendingConversationCount, icon: Clock, href: "/whatsapp-messages", highlight: metrics.pendingConversationCount > 0 },
    { label: "Em atendimento", helper: "Conversas abertas", value: metrics.assignedConversationCount, icon: Activity, href: "/whatsapp-messages" },
    { label: "Resolvidas hoje", helper: "Atendimentos encerrados", value: metrics.resolvedTodayCount, icon: CheckCircle2, href: "/whatsapp-messages" },
    { label: "Recebidas hoje", helper: "Mensagens de clientes", value: metrics.inboundTodayCount, icon: MessageCircle, href: "/whatsapp-messages" },
    { label: "Contatos", helper: "Clientes salvos", value: metrics.contactCount, icon: Users, href: "/contacts" },
    { label: "Automações ativas", helper: "Regras em funcionamento", value: metrics.activeAutomationCount, icon: Bot, href: "/quick-replies" },
    { label: "WhatsApp conectado", helper: "Canais ativos", value: metrics.connectedChannelCount, icon: Cloud, href: "/settings/whatsapp" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[#1B2F5B] p-6 text-white shadow-xl lg:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-[#2ABFAB] text-white hover:bg-[#2ABFAB]">Atendimento e vendas</Badge>
          <Badge variant="secondary">Sistema online</Badge>
        </div>
        <h2 className="mt-5 max-w-2xl text-2xl font-black tracking-tight md:text-3xl">
          {metrics.pendingConversationCount > 0
            ? `Você tem ${formatCount(metrics.pendingConversationCount)} ${metrics.pendingConversationCount === 1 ? "conversa aguardando" : "conversas aguardando"}`
            : metrics.inboundTodayCount > 0
              ? "Atendimentos do dia em acompanhamento"
              : "Ainda não há conversas hoje"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
          {metrics.pendingConversationCount > 0
            ? "Abra a central de atendimento para responder quem está esperando."
            : metrics.inboundTodayCount > 0
              ? "Acompanhe a fila, as conversas em atendimento e o histórico do WhatsApp."
              : "Quando novas mensagens chegarem pelo WhatsApp, elas aparecerão aqui."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#2ABFAB] px-5 font-black text-white hover:bg-[#24aa98]">
            <Link href="/whatsapp-messages">Abrir atendimentos</Link>
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
              <h3 className="text-lg font-black text-[#1B2F5B]">Ainda não há conversas hoje.</h3>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Quando novas mensagens chegarem pelo WhatsApp, elas aparecerão aqui. Se o canal ainda não foi conectado, configure o WhatsApp da empresa.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 rounded-full bg-[#1B2F5B] px-5 font-black text-white hover:bg-[#16264a]">
            <Link href="/settings/whatsapp">Configurar WhatsApp</Link>
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
        <h3 className="mb-3 px-1 text-sm font-black uppercase tracking-wide text-slate-500">Atalhos</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
