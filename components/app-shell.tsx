import Link from "next/link";
import { MessageCircle, Users, KanbanSquare, Megaphone, Bot, Settings, LayoutDashboard, Tags, Zap, FileText, ShieldCheck, FlaskConical, Download, Upload, ListChecks } from "lucide-react";
import { BrandIcon } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/feature-lab", label: "Feature Lab", icon: FlaskConical },
  { href: "/whatsapp-import", label: "Importação WhatsApp", icon: Download },
  { href: "/contact-import", label: "Importar contatos", icon: Upload },
  { href: "/group-import-lists", label: "Listas importadas", icon: ListChecks },
  { href: "/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/crm", label: "CRM", icon: Tags },
  { href: "/pipeline", label: "Funil", icon: KanbanSquare },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/quick-replies", label: "Respostas", icon: FileText },
  { href: "/automations", label: "Automações", icon: Zap },
  { href: "/knowledge", label: "Conhecimento", icon: Bot },
  { href: "/settings/whatsapp", label: "Configurações", icon: Settings },
  { href: "/audit", label: "Auditoria", icon: ShieldCheck },
];

export function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-white p-5 lg:block">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <BrandIcon className="h-10 w-10 object-contain" />
          </div>
          <div>
            <p className="font-semibold text-slate-950">ShamarConnect</p>
            <p className="text-xs text-muted-foreground">WhatsApp • CRM • IA</p>
          </div>
        </Link>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = active ? item.href.includes(active) : false;
            return (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-accent hover:text-accent-foreground", isActive && "bg-accent text-accent-foreground")}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
