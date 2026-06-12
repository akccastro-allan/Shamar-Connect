import Link from "next/link";
import {
  Activity,
  Bot,
  Download,
  FileText,
  FlaskConical,
  GitBranch,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessageCircle,
  Palette,
  Settings,
  ShieldCheck,
  Tags,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { BrandIcon } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

const navigationGroups = [
  {
    label: "Operação",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inbox", label: "Inbox", icon: MessageCircle },
      { href: "/whatsapp-messages", label: "Mensagens WhatsApp", icon: MessageCircle },
      { href: "/settings/whatsapp", label: "WhatsApp", icon: Settings },
    ],
  },
  {
    label: "CRM e vendas",
    items: [
      { href: "/contacts", label: "Contatos", icon: Users },
      { href: "/crm", label: "CRM", icon: Tags },
      { href: "/pipeline", label: "Funil", icon: KanbanSquare },
      { href: "/campaigns", label: "Campanhas", icon: Megaphone },
    ],
  },
  {
    label: "Automação e dados",
    items: [
      { href: "/quick-replies", label: "Respostas", icon: FileText },
      { href: "/conversation-flows", label: "Fluxos", icon: GitBranch },
      { href: "/automations", label: "Automações", icon: Zap },
      { href: "/knowledge", label: "Conhecimento", icon: Bot },
      { href: "/whatsapp-import", label: "Importação WhatsApp", icon: Download },
      { href: "/contact-import", label: "Importar contatos", icon: Upload },
      { href: "/group-import-lists", label: "Listas importadas", icon: ListChecks },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/system-test", label: "Teste do sistema", icon: Activity },
      { href: "/ui-lab", label: "UI Lab", icon: Palette },
      { href: "/feature-lab", label: "Feature Lab", icon: FlaskConical },
      { href: "/audit", label: "Auditoria", icon: ShieldCheck },
    ],
  },
];

function SidebarContent({ active }: { active?: string }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="mb-7 flex items-center gap-3 rounded-3xl bg-white/10 p-3 ring-1 ring-white/10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
          <BrandIcon className="h-10 w-10 object-contain" />
        </div>
        <div>
          <p className="font-black text-white">ShamarConnect</p>
          <p className="text-xs font-semibold text-white/55">WhatsApp • CRM • IA</p>
        </div>
      </Link>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active ? item.href.includes(active) || active.includes(item.href.replace("/", "")) : false;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white",
                      isActive && "bg-[#2ABFAB] text-white shadow-lg shadow-black/10"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-white/50">Status</p>
            <p className="mt-1 text-sm font-black">Operação ativa</p>
          </div>
          <span className="h-3 w-3 rounded-full bg-[#2ABFAB] shadow-lg shadow-[#2ABFAB]/40" />
        </div>
        <p className="mt-3 text-xs leading-5 text-white/55">
          Ambiente preparado para atendimento, CRM, importações e demonstrações comerciais.
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-80 bg-[#1B2F5B] p-5 shadow-2xl lg:block">
        <SidebarContent active={active} />
      </aside>

      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <BrandIcon className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="text-sm font-black text-[#1B2F5B]">ShamarConnect</p>
              <p className="text-[11px] font-semibold text-slate-500">Painel interno</p>
            </div>
          </Link>

          <Link
            href="/settings/whatsapp"
            className="rounded-full bg-[#1B2F5B] px-4 py-2 text-xs font-black text-white"
          >
            WhatsApp
          </Link>
        </div>
      </div>

      <main className="lg:pl-80">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
