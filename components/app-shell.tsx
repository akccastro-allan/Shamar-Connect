import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandIcon } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";
import { getCurrentSession } from "@/lib/auth/session";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const navigationGroups = [
  {
    label: "Operação",
    items: [
      { href: "/dashboard", label: "Dashboard", marker: "D" },
      { href: "/inbox", label: "Inbox", marker: "I" },
      { href: "/whatsapp-messages", label: "Mensagens WhatsApp", marker: "W" },
      { href: "/settings/whatsapp", label: "WhatsApp", marker: "C" },
    ],
  },
  {
    label: "CRM e vendas",
    items: [
      { href: "/contacts", label: "Contatos", marker: "C" },
      { href: "/crm", label: "CRM", marker: "R" },
      { href: "/pipeline", label: "Funil", marker: "F" },
      { href: "/campaigns", label: "Campanhas", marker: "M" },
    ],
  },
  {
    label: "Gestão interna",
    items: [
      { href: "/admin", label: "Administração", marker: "A" },
      { href: "/financeiro", label: "Financeiro", marker: "$" },
    ],
  },
  {
    label: "Automação e dados",
    items: [
      { href: "/quick-replies", label: "Respostas", marker: "R" },
      { href: "/conversation-flows", label: "Fluxos", marker: "F" },
      { href: "/automations", label: "Automações", marker: "Z" },
      { href: "/knowledge", label: "Conhecimento", marker: "K" },
      { href: "/whatsapp-diagnostics", label: "Diagnóstico WhatsApp", marker: "G" },
      { href: "/settings/whatsapp-automation", label: "Config. Automação", marker: "A" },
      { href: "/whatsapp-import", label: "Importação WhatsApp", marker: "I" },
      { href: "/contact-import", label: "Importar contatos", marker: "U" },
      { href: "/group-import-lists", label: "Listas importadas", marker: "L" },
    ],
  },
  {
    label: "Inteligência artificial",
    items: [
      { href: "/ai-lab", label: "AI Lab", marker: "I" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/system-test", label: "Teste do sistema", marker: "T" },
      { href: "/ui-lab", label: "UI Lab", marker: "U" },
      { href: "/feature-lab", label: "Feature Lab", marker: "F" },
      { href: "/audit", label: "Auditoria", marker: "S" },
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
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] font-black text-white/75">
                      {item.marker}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

async function assertAuthorizedSession() {
  const session = await getCurrentSession();

  if (!session?.userId || !session?.companyId) {
    redirect("/login");
  }

  const db = createSupabaseWriteClient();

  const { data: appUser } = await db
    .from("app_users")
    .select("id, status")
    .eq("id", session.userId)
    .eq("status", "active")
    .maybeSingle();

  if (!appUser) {
    redirect("/planos?reason=not-authorized");
  }

  const { data: tenantUser } = await db
    .from("tenant_users")
    .select("id")
    .eq("app_user_id", session.userId)
    .eq("status", "active")
    .or(`organization_id.eq.${session.companyId},tenant_id.eq.${session.companyId}`)
    .maybeSingle();

  if (!tenantUser) {
    redirect("/planos?reason=not-authorized");
  }

  return session;
}

export async function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  await assertAuthorizedSession();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden h-screen bg-[#1B2F5B] p-5 lg:sticky lg:top-0 lg:block">
        <SidebarContent active={active} />
      </aside>

      <div className="min-w-0">
        <div className="border-b border-slate-200 bg-white px-5 py-4 lg:hidden">
          <SidebarContent active={active} />
        </div>
        {children}
      </div>
    </div>
  );
}
