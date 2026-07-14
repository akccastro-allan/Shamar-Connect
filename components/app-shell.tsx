import { redirect } from "next/navigation";
import { SidebarContent } from "@/components/sidebar-content";
import { MobileNav } from "@/components/mobile-nav";
import { getCurrentSession } from "@/lib/auth/session";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import {
  canAccessCommandCenter,
  canAccessMetaChannels,
  canAccessPlatformAdmin,
  getTenantFeatureMetadata,
} from "@/lib/features/feature-flags";

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

  let isPlatformAdmin = false;
  let metaChannelsEnabled = false;
  let commandCenterEnabled = false;
  try {
    const context = await getRequiredAppContext();
    const tenantMetadata = await getTenantFeatureMetadata(db, context.tenantId);
    isPlatformAdmin = canAccessPlatformAdmin(context, tenantMetadata);
    metaChannelsEnabled = canAccessMetaChannels(context, tenantMetadata);
    commandCenterEnabled = canAccessCommandCenter(context, tenantMetadata);
  } catch {
    redirect("/planos?reason=not-authorized");
  }

  return { session, avatarUrl: appUser.avatar_url ?? null, isPlatformAdmin, metaChannelsEnabled, commandCenterEnabled };
}

export async function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  const { session, avatarUrl, isPlatformAdmin, metaChannelsEnabled, commandCenterEnabled } = await assertAuthorizedSession();
  const user = { userName: session.userName, companyName: session.companyName };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden h-screen bg-[#1B2F5B] p-5 lg:sticky lg:top-0 lg:block">
        <SidebarContent active={active} user={user} avatarUrl={avatarUrl} isPlatformAdmin={isPlatformAdmin} metaChannelsEnabled={metaChannelsEnabled} commandCenterEnabled={commandCenterEnabled} />
      </aside>

      <div className="min-w-0">
        <MobileNav active={active} user={user} avatarUrl={avatarUrl} isPlatformAdmin={isPlatformAdmin} metaChannelsEnabled={metaChannelsEnabled} commandCenterEnabled={commandCenterEnabled} />
        <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
