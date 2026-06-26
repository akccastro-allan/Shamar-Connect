"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Rocket, LayoutDashboard, Inbox, MessageCircle, AtSign, Activity,
  Megaphone, Users, ContactRound, Trello, TrendingUp, Mail, LifeBuoy,
  Ticket, ShieldCheck, Building2, ListChecks, Wallet, MessageSquareReply,
  Workflow, Zap, BookOpen, Stethoscope, SlidersHorizontal, Cloud,
  Download, Upload, List, Sparkles, UserRound, FlaskConical, Palette,
  Lightbulb, ShieldAlert, ChevronDown, Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; platformOnly?: true };
type NavGroup = { label: string; icon: LucideIcon; flat?: true; platformOnly?: true; items: NavItem[] };

const navigationGroups: NavGroup[] = [
  {
    label: "Início",
    icon: Rocket,
    flat: true,
    items: [{ href: "/getting-started", label: "Primeiros passos", icon: Rocket }],
  },
  {
    label: "Atendimento",
    icon: MessageCircle,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/whatsapp-messages", label: "WhatsApp", icon: MessageCircle },
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/social-inbox", label: "Social Inbox", icon: AtSign },
      { href: "/operations", label: "Operações", icon: Activity },
      { href: "/reports/team", label: "Relatório da equipe", icon: TrendingUp },
    ],
  },
  {
    label: "Clientes e vendas",
    icon: TrendingUp,
    items: [
      { href: "/contacts", label: "Contatos", icon: Users },
      { href: "/crm", label: "CRM", icon: ContactRound },
      { href: "/pipeline", label: "Pipeline", icon: Trello },
      { href: "/sales-dashboard", label: "Dashboard de Vendas", icon: TrendingUp },
      { href: "/campaigns", label: "Campanhas", icon: Mail },
      { href: "/distribution", label: "Central de Distribuição", icon: Megaphone },
    ],
  },
  {
    label: "Automação",
    icon: Zap,
    items: [
      { href: "/quick-replies", label: "Respostas rápidas", icon: MessageSquareReply },
      { href: "/conversation-flows", label: "Fluxos", icon: Workflow },
      { href: "/automations", label: "Automações", icon: Zap },
      { href: "/knowledge", label: "Conhecimento", icon: BookOpen },
      { href: "/ai-lab", label: "AI Lab", icon: Sparkles },
    ],
  },
  {
    label: "Importações",
    icon: Download,
    items: [
      { href: "/whatsapp-import", label: "Importação WhatsApp", icon: Download },
      { href: "/contact-import", label: "Importar contatos", icon: Upload },
      { href: "/group-import-lists", label: "Listas importadas", icon: List },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    items: [
      { href: "/settings/profile", label: "Meu perfil", icon: UserRound },
      { href: "/settings/billing", label: "Assinatura", icon: Wallet },
      { href: "/settings/team", label: "Equipe", icon: Users },
      { href: "/settings/departments", label: "Setores", icon: Building2 },
      { href: "/settings/whatsapp", label: "Conexão WhatsApp", icon: MessageCircle },
      { href: "/settings/social", label: "Instagram e Facebook", icon: AtSign },
      { href: "/settings/whatsapp-automation", label: "Config. de automação", icon: SlidersHorizontal },
      { href: "/whatsapp-diagnostics", label: "Diagnóstico WhatsApp", icon: Stethoscope },
      { href: "/settings/whatsapp-cloud", label: "Shamar Kids (Cloud API)", icon: Cloud, platformOnly: true },
    ],
  },
  {
    label: "Suporte",
    icon: LifeBuoy,
    flat: true,
    items: [{ href: "/support", label: "Suporte", icon: LifeBuoy }],
  },
  {
    label: "Gestão da plataforma",
    icon: ShieldCheck,
    platformOnly: true,
    items: [
      { href: "/admin", label: "Administração", icon: ShieldCheck },
      { href: "/admin/users", label: "Clientes", icon: Building2 },
      { href: "/admin/support", label: "Admin suporte", icon: Ticket },
      { href: "/demo-checklist", label: "Demo Checklist", icon: ListChecks },
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
    ],
  },
  {
    label: "Dev & Labs",
    icon: FlaskConical,
    platformOnly: true,
    items: [
      { href: "/system-test", label: "Teste do sistema", icon: FlaskConical },
      { href: "/ui-lab", label: "UI Lab", icon: Palette },
      { href: "/feature-lab", label: "Feature Lab", icon: Lightbulb },
      { href: "/audit", label: "Auditoria", icon: ShieldAlert },
    ],
  },
];

function isItemActive(active: string | undefined, href: string) {
  if (!active) return false;
  const a = active.replace(/^\/+/, "");
  const h = href.replace(/^\/+/, "");
  return a === h || a.startsWith(`${h}/`);
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active?: string; onNavigate?: () => void }) {
  const Icon = item.icon;
  const isActive = isItemActive(active, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white",
        isActive && "bg-[#2ABFAB] text-white shadow-lg shadow-black/10",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function SidebarNav({ active, isPlatformAdmin, onNavigate }: { active?: string; isPlatformAdmin: boolean; onNavigate?: () => void }) {
  const visibleGroups = navigationGroups
    .filter((g) => isPlatformAdmin || !g.platformOnly)
    .map((g) => ({ ...g, items: g.items.filter((i) => isPlatformAdmin || !i.platformOnly) }))
    .filter((g) => g.items.length > 0);

  const activeGroupLabel = visibleGroups.find(
    (g) => !g.flat && g.items.some((i) => isItemActive(active, i.href)),
  )?.label;

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeGroupLabel) initial.add(activeGroupLabel);
    return initial;
  });

  function toggle(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
      {visibleGroups.map((group) => {
        if (group.flat) {
          return <NavLink key={group.label} item={group.items[0]} active={active} onNavigate={onNavigate} />;
        }

        const isOpen = openGroups.has(group.label);
        const hasActive = group.items.some((i) => isItemActive(active, i.href));
        const GroupIcon = group.icon;

        return (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => toggle(group.label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-white/55 transition hover:bg-white/10 hover:text-white",
                hasActive && !isOpen && "text-white",
              )}
            >
              <GroupIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} />
              <span className="flex-1 truncate text-left">{group.label}</span>
              {hasActive && !isOpen && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ABFAB]" />
              )}
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-white/40 transition-transform", isOpen && "rotate-180")}
              />
            </button>

            {isOpen && (
              <div className="mt-1 space-y-1 pl-3">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={active} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
