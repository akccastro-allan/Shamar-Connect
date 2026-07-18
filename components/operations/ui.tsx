import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { RefreshCcw, Search, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type OperationalStatusKind =
  | "healthy"
  | "connected"
  | "active"
  | "attention"
  | "pending"
  | "disconnected"
  | "failed"
  | "blocked"
  | "not_configured";

const statusCopy: Record<OperationalStatusKind, string> = {
  healthy: "Saudável",
  connected: "Conectado",
  active: "Ativo",
  attention: "Atenção",
  pending: "Pendente",
  disconnected: "Desconectado",
  failed: "Falhou",
  blocked: "Bloqueado",
  not_configured: "Não configurado",
};

const statusClasses: Record<OperationalStatusKind, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  pending: "border-slate-200 bg-slate-50 text-slate-600",
  disconnected: "border-red-200 bg-red-50 text-red-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
  not_configured: "border-slate-200 bg-slate-50 text-slate-600",
};

export function normalizeOperationalStatus(status?: string | null): OperationalStatusKind {
  if (!status) return "pending";
  if (["ok", "healthy", "ready"].includes(status)) return "healthy";
  if (["connected", "in_use"].includes(status)) return "connected";
  if (["active", "published", "production_initial"].includes(status)) return "active";
  if (["attention", "warning", "preparation", "development", "official_whatsapp_preparation", "review"].includes(status)) return "attention";
  if (["pending", "planned", "scheduled", "draft", "pending_setup", "assigned", "in_progress"].includes(status)) return "pending";
  if (["disconnected", "disabled", "inactive"].includes(status)) return "disconnected";
  if (["failed", "error"].includes(status)) return "failed";
  if (["blocked", "forbidden"].includes(status)) return "blocked";
  if (["not_configured", "missing"].includes(status)) return "not_configured";
  return "pending";
}

export function OperationalStatus({ status, label }: { status?: string | null; label?: string }) {
  const normalized = normalizeOperationalStatus(status);
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black", statusClasses[normalized])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label || statusCopy[normalized]}
    </span>
  );
}

export function MetricCard({ label, value, context, href, icon: Icon, status }: { label: string; value: number | string; context?: string; href?: string; icon: LucideIcon; status?: string | null }) {
  const tone = normalizeOperationalStatus(status);
  const body = (
    <div className="h-full rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:border-[#2ABFAB]/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className={cn("mt-3 text-3xl font-black", tone === "failed" || tone === "blocked" || tone === "disconnected" ? "text-red-700" : tone === "attention" ? "text-amber-700" : "text-[#1B2F5B]")}>{value}</p>
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", tone === "failed" || tone === "blocked" || tone === "disconnected" ? "bg-red-50 text-red-600" : tone === "attention" ? "bg-amber-50 text-amber-600" : "bg-[#2ABFAB]/10 text-[#1B2F5B]")}> 
          <Icon className="h-5 w-5" strokeWidth={2.4} />
        </span>
      </div>
      {context ? <p className="mt-3 text-sm leading-5 text-slate-500">{context}</p> : null}
    </div>
  );

  if (!href) return body;
  return <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2ABFAB] focus-visible:ring-offset-2">{body}</Link>;
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-black text-[#1B2F5B]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, actionLabel, actionHref }: { title: string; description: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <Search className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-lg font-black text-[#1B2F5B]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      {actionHref && actionLabel ? <Link href={actionHref} className="mt-4 inline-flex rounded-full bg-[#1B2F5B] px-4 py-2 text-sm font-black text-white hover:bg-[#16284d]">{actionLabel}</Link> : null}
    </div>
  );
}

export function ErrorState({ title = "Não foi possível carregar", message, code, retryLabel = "Tentar novamente", onRetry }: { title?: string; message: string; code?: string; retryLabel?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[2rem] border border-red-100 bg-red-50 p-6 text-red-800">
      <div className="flex gap-3">
        <ShieldAlert className="mt-1 h-5 w-5 shrink-0" />
        <div>
          <p className="font-black">{title}</p>
          <p className="mt-1 text-sm leading-6">{message}</p>
          {code ? <p className="mt-2 text-xs font-black uppercase tracking-wide text-red-600">Código: {code}</p> : null}
          {onRetry ? <button type="button" onClick={onRetry} className="mt-4 rounded-full bg-red-700 px-4 py-2 text-sm font-black text-white hover:bg-red-800">{retryLabel}</button> : null}
        </div>
      </div>
    </div>
  );
}

export function LoadingState({ title = "Carregando Centro de Comando", description = "Buscando dados operacionais reais." }: { title?: string; description?: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-sm">
      <RefreshCcw className="mx-auto h-8 w-8 animate-spin text-[#2ABFAB]" />
      <p className="mt-3 font-black text-[#1B2F5B]">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function AccessDeniedState({ message = "Acesso restrito ao Centro de Comando interno." }: { message?: string }) {
  return (
    <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 text-amber-900">
      <div className="flex gap-3">
        <ShieldAlert className="mt-1 h-5 w-5 shrink-0" />
        <div>
          <p className="font-black">Acesso restrito</p>
          <p className="mt-1 text-sm leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">{children}</div>;
}

export function ResponsiveDataList({ children }: { children: React.ReactNode }) {
  return <section className="grid min-w-0 gap-4 lg:grid-cols-2">{children}</section>;
}
