import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandIcon } from "@/components/brand/brand-logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { getCurrentSession } from "@/lib/auth/session";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import type { ShamarSession } from "@/lib/auth/session";

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
  return (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3 rounded-3xl bg-white/10 p-3 ring-1 ring-white/10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
          <BrandIcon className="h-10 w-10 object-contain" />
        </div>
        <div>
          <p className="font-black text-white">ShamarConnect</p>
          <p className="text-xs font-semibold text-white/55">WhatsApp • CRM • IA</p>
        </div>
      </Link>

      <SidebarNav active={active} isPlatformAdmin={isPlatformAdmin} />

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

  let isPlatformTenant = false;
  try {
    const context = await getRequiredAppContext();
    isPlatformTenant = context.isPlatformTenant;
  } catch {
    redirect("/planos?reason=not-authorized");
  }

  return { session, avatarUrl: appUser.avatar_url ?? null, isPlatformTenant };
}

export async function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  const { session, avatarUrl, isPlatformTenant } = await assertAuthorizedSession();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden h-screen bg-[#1B2F5B] p-5 lg:sticky lg:top-0 lg:block">
        <SidebarContent active={active} session={session} avatarUrl={avatarUrl} isPlatformAdmin={isPlatformTenant} />
      </aside>

      <div className="min-w-0">
        <div className="border-b border-slate-200 bg-white px-5 py-4 lg:hidden">
          <SidebarContent active={active} session={session} avatarUrl={avatarUrl} isPlatformAdmin={isPlatformTenant} />
        </div>
        {children}
      </div>
    </div>
  );
}
