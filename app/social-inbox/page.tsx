import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { MessageCircle, AtSign, Send, Megaphone, type LucideIcon } from "lucide-react";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const metadata = { title: "Social Inbox — ShamarConnect" };

type Channel = {
  label: string;
  description: string;
  href: string | null;
  status: string;
  active: boolean;
  icon: LucideIcon;
  accent: string;
};

async function getActiveSocialProviders(): Promise<Set<string>> {
  try {
    const ctx = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const { data } = await db
      .from("social_accounts")
      .select("provider")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .eq("status", "active");
    return new Set((data ?? []).map((r) => r.provider as string));
  } catch {
    return new Set();
  }
}

export default async function SocialInboxPage() {
  const activeProviders = await getActiveSocialProviders();

  const channels: Channel[] = [
    {
      label: "WhatsApp",
      description: "Conversas do WhatsApp (Hall, Lips e demais unidades) e Cloud API do Shamar Kids.",
      href: "/whatsapp-messages",
      status: "Ativo",
      active: true,
      icon: MessageCircle,
      accent: "#2ABFAB",
    },
    {
      label: "Instagram Direct",
      description: "Mensagens diretas do Instagram Professional via Meta Messaging API.",
      href: activeProviders.has("instagram") ? "/whatsapp-messages" : "/settings/social",
      status: activeProviders.has("instagram") ? "Ativo" : "Conectar",
      active: activeProviders.has("instagram"),
      icon: AtSign,
      accent: "#E1306C",
    },
    {
      label: "Facebook Messenger",
      description: "Mensagens da sua página do Facebook via Meta Messaging API.",
      href: activeProviders.has("messenger") ? "/whatsapp-messages" : "/settings/social",
      status: activeProviders.has("messenger") ? "Ativo" : "Conectar",
      active: activeProviders.has("messenger"),
      icon: MessageCircle,
      accent: "#1877F2",
    },
    {
      label: "Telegram",
      description: "Mensagens diretas pelo bot do Telegram, com resposta manual pela central.",
      href: null,
      status: "Em preparação",
      active: false,
      icon: Send,
      accent: "#229ED9",
    },
  ];

  return (
    <AppShell active="social-inbox">
      <PageHeader
        title="Social Inbox"
        description="Fila unificada de atendimento dos seus canais sociais — WhatsApp, Instagram, Facebook e Telegram em um só lugar."
        badge="Atendimento"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <div key={channel.label} className="flex flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${channel.accent}1A`, color: channel.accent }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    channel.active ? "bg-[#2ABFAB]/15 text-[#1B7568]" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {channel.status}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-black text-[#1B2F5B]">{channel.label}</h2>
              <p className="mt-1 flex-1 text-sm text-slate-600">{channel.description}</p>
              <div className="mt-5">
                {channel.href ? (
                  <Link
                    href={channel.href}
                    className={`inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-black text-white transition ${
                      channel.active ? "bg-[#2ABFAB] hover:bg-[#24aa98]" : "bg-[#1B2F5B] hover:bg-[#16264a]"
                    }`}
                  >
                    {channel.active ? "Abrir" : "Conectar"}
                  </Link>
                ) : (
                  <span className="inline-flex h-11 items-center justify-center rounded-full bg-slate-100 px-6 text-sm font-black text-slate-400">
                    Em breve
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-[2rem] border border-[#C9952A]/30 bg-[#C9952A]/5 p-6">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[#C9952A]" />
          <h2 className="font-black text-[#1B2F5B]">Regra de ouro — divulgação ≠ atendimento</h2>
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            <strong className="text-slate-900">Grupos e canais informativos</strong> servem só para divulgar conteúdo (artigos, eventos) — nunca para atendimento individual.
          </p>
          <p>
            <strong className="text-slate-900">Atendimento</strong> acontece somente nas mensagens diretas: WhatsApp, Instagram, Facebook e Telegram privados.
          </p>
          <p className="text-xs text-slate-500">
            Para publicar em grupos informativos, use a{" "}
            <Link href="/distribution" className="font-bold text-[#2ABFAB] hover:underline">
              Central de Distribuição
            </Link>
            .
          </p>
        </div>
      </div>
    </AppShell>
  );
}
