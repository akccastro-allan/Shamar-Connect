import Link from "next/link";
import { BrandIcon } from "@/components/brand/brand-logo";
import { SidebarNav } from "@/components/sidebar-nav";

export type SidebarUser = {
  userName?: string | null;
  companyName?: string | null;
};

export function SidebarContent({
  active,
  user,
  avatarUrl,
  isPlatformAdmin,
  onNavigate,
}: {
  active?: string;
  user: SidebarUser;
  avatarUrl?: string | null;
  isPlatformAdmin: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-6 flex items-center gap-3 rounded-3xl bg-white/10 p-3 ring-1 ring-white/10"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
          <BrandIcon className="h-10 w-10 object-contain" />
        </div>
        <div>
          <p className="font-black text-white">ShamarConnect</p>
          <p className="text-xs font-semibold text-white/55">WhatsApp • CRM • IA</p>
        </div>
      </Link>

      <SidebarNav active={active} isPlatformAdmin={isPlatformAdmin} onNavigate={onNavigate} />

      {/* User info + logout */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <Link
          href="/settings/profile"
          onClick={onNavigate}
          className="mb-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white/10"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={user.userName ?? ""} className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-white/20" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2ABFAB]/20 text-sm font-black text-[#2ABFAB]">
              {(user.userName || user.companyName || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{user.userName || user.companyName}</p>
            <p className="truncate text-xs text-white/45">{user.companyName}</p>
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
