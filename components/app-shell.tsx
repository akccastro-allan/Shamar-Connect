import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandIcon } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";
import { getCurrentSession } from "@/lib/auth/session";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import type { ShamarSession } from "@/lib/auth/session";

// Tenant da plataforma Moriah Systems — único com visão global
const PLATFORM_TENANT_ID = "0c633898-a297-4f5e-945b-a05171218566";

type NavItem = { href: string; label: string; marker: string; platformOnly?: true };
type NavGroup = { label: string; platformOnly?: true; items: NavItem[] };

const navigationGroups: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { href: "/dashboard", label: "Dashboard", marker: "D" },
      { href: "/inbox", label: "Inbox", marker: "I" },
      { href: "/whatsapp-messages", label: "WhatsApp", marker: "W" },
      { href: "/social-inbox", label: "Social Inbox", marker: "S" },
      { href: "/operations", label: "Operações", marker: "O" },
    ],
  },
  {
    label: "Conteúdo e canais",
    items: [
      { href: "/distribution", label: "Central de Distribuição", marker: "B" },
    ],
  },
  {
    label: "CRM e vendas",
    items: [
      { href: "/contacts", label: "Contatos", marker: "C" },
      { href: "/crm", label: "CRM", marker: "R" },
      { href: "/pipeline", label: "Pipeline", marker: "P" },
      { href: "/sales-dashboard", label: "Dashboard Vendas", marker: "V" },
      { href: "/campaigns", label: "Campanhas", marker: "M" },
    ],
  },
  {
    label: "Suporte",
    items: [
      { href: "/support", label: "Meus chamados", marker: "?" },
      { href: "/admin/support", label: "Admin suporte", marker: "!", platformOnly: true },
    ],
  },
  {
    label: "Gestão interna",
    platformOnly: true,
    items: [
      { href: "/admin", label: "Administração", marker: "A" },
      { href: "/admin/users", label: "Clientes", marker: "C" },
      { href: "/demo-checklist", label: "Demo Checklist", marker: "D" },
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
      { href: "/settings/whatsapp-cloud", label: "Shamar Kids (Cloud API)", marker: "K", platformOnly: true },
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
      { href: "/settings/profile", label: "Meu perfil", marker: "👤" },
      { href: "/system-test", label: "Teste do sistema", marker: "T", platformOnly: true },
      { href: "/ui-lab", label: "UI Lab", marker: "U", platformOnly: true },
      { href: "/feature-lab", label: "Feature Lab", marker: "F", platformOnly: true },
      { href: "/audit", label: "Auditoria", marker: "S", platformOnly: true },
    ],
  },
];

function SidebarContent({
  active,
  session,
  avatarUrl,
  isPlatformAdmin,
}: {
  active?: string;
  session: ShamarSession;
  avatarUrl?: string | null;
  isPlatformAdmin: boolean;
}) {
  const visibleGroups = navigationGroups
    .filter((g) => isPlatformAdmin || !g.platformOnly)
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => isPlatformAdmin || !item.platformOnly),
    }))
    .filter((g) => g.items.length > 0);

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
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = active
                  ? item.href.includes(active) || active.includes(item.href.replace("/", ""))
                  : false;

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

      {/* User info + logout */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <Link
          href="/settings/profile"
          className="mb-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white/10"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={session.userName} className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-white/20" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2ABFAB]/20 text-sm font-black text-[#2ABFAB]">
              {(session.userName || session.companyName || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{session.userName || session.companyName}</p>
            <p className="truncate text-xs text-white/45">{session.companyName}</p>
          </div>
        </Link>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] font-black">
              ↩
            </span>
            Sair
          </button>
        </form>
      </div>
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
    .select("id, status, avatar_url")
    .eq("id", session.userId)
    .eq("status", "active")
    .maybeSingle();

  if (!appUser) {
    redirect("/planos?reason=not-authorized");
  }

  const { data: tenantUser } = await db
    .from("tenant_users")
    .select("id, tenant_id")
    .eq("app_user_id", session.userId)
    .eq("status", "active")
    .or(`organization_id.eq.${session.companyId},tenant_id.eq.${session.companyId}`)
    .maybeSingle();

  if (!tenantUser) {
    redirect("/planos?reason=not-authorized");
  }

  const isPlatformAdmin = tenantUser.tenant_id === PLATFORM_TENANT_ID;

  return { session, avatarUrl: appUser.avatar_url ?? null, isPlatformAdmin };
}

export async function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  const { session, avatarUrl, isPlatformAdmin } = await assertAuthorizedSession();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden h-screen bg-[#1B2F5B] p-5 lg:sticky lg:top-0 lg:block">
        <SidebarContent active={active} session={session} avatarUrl={avatarUrl} isPlatformAdmin={isPlatformAdmin} />
      </aside>

      <div className="min-w-0">
        <div className="border-b border-slate-200 bg-white px-5 py-4 lg:hidden">
          <SidebarContent active={active} session={session} avatarUrl={avatarUrl} isPlatformAdmin={isPlatformAdmin} />
        </div>
        {children}
      </div>
    </div>
  );
}
