"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { BrandIcon } from "@/components/brand/brand-logo";
import { SidebarContent, type SidebarUser } from "@/components/sidebar-content";

export function MobileNav({
  active,
  user,
  avatarUrl,
  isPlatformAdmin,
  metaChannelsEnabled = false,
}: {
  active?: string;
  user: SidebarUser;
  avatarUrl?: string | null;
  isPlatformAdmin: boolean;
  metaChannelsEnabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
            <BrandIcon className="h-7 w-7 object-contain" />
          </span>
          <span className="font-black text-[#1B2F5B]">ShamarConnect</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-[#1B2F5B] transition active:scale-95"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-[320px] flex-col bg-[#1B2F5B] p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <SidebarContent
              active={active}
              user={user}
              avatarUrl={avatarUrl}
              isPlatformAdmin={isPlatformAdmin}
              metaChannelsEnabled={metaChannelsEnabled}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
