import type { Metadata } from "next";
import { getCurrentSession } from "@/lib/auth/session";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { redirect } from "next/navigation";
import { assertPlatformAdminRoute } from "@/lib/features/route-guards";

export const metadata: Metadata = {
  title: "Auth Diagnostics — ShamarConnect",
  robots: { index: false, follow: false },
};

function Row({ label, value, highlight }: { label: string; value: string; highlight?: "ok" | "warn" | "error" }) {
  const colors: Record<string, string> = {
    ok: "text-emerald-700 bg-emerald-50",
    warn: "text-amber-700 bg-amber-50",
    error: "text-red-700 bg-red-50",
  };
  const cls = highlight ? colors[highlight] : "text-slate-800 bg-white";
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 py-3">
      <span className="w-52 shrink-0 text-sm font-bold text-slate-500">{label}</span>
      <span className={`rounded-md px-2 py-0.5 text-sm font-mono ${cls}`}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-[#1B2F5B]">{title}</h2>
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-2 shadow-sm">{children}</div>
    </div>
  );
}

export default async function AuthDiagnosticsPage() {
  await assertPlatformAdminRoute();

  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?next=/auth-diagnostics");
  }

  let context: Awaited<ReturnType<typeof getRequiredAppContext>> | null = null;
  let contextError: string | null = null;

  try {
    context = await getRequiredAppContext();
  } catch (err) {
    contextError = isUnauthorizedError(err) ? "UNAUTHORIZED" : String(err instanceof Error ? err.message : err);
  }

  const loginAt = new Date(session.loginAt);
  const expiresAt = new Date(loginAt.getTime() + 12 * 60 * 60 * 1000);
  const now = new Date();
  const isExpired = now > expiresAt;
  const minutesLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60_000));

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-12 md:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#C9952A]">Diagnóstico</p>
        <h1 className="mb-8 text-3xl font-black text-[#1B2F5B]">Auth Diagnostics</h1>

        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800">
          Página somente leitura — dados em tempo real, sem cache.
        </div>

        <Section title="Sessão">
          <Row
            label="Autenticado"
            value={session ? "SIM" : "NÃO"}
            highlight={session ? "ok" : "error"}
          />
          <Row
            label="Cookie válido"
            value={session ? "SIM — HMAC verificado" : "NÃO"}
            highlight={session ? "ok" : "error"}
          />
          <Row
            label="Expiração"
            value={
              isExpired
                ? `EXPIRADA em ${expiresAt.toLocaleString("pt-BR")}`
                : `${expiresAt.toLocaleString("pt-BR")} (${minutesLeft} min restantes)`
            }
            highlight={isExpired ? "error" : minutesLeft < 30 ? "warn" : "ok"}
          />
          <Row label="Login em" value={loginAt.toLocaleString("pt-BR")} />
          <Row label="companyId (cookie)" value={session.companyId} />
          <Row label="userId (cookie)" value={session.userId} />
          <Row label="userName (cookie)" value={session.userName} />
          <Row label="userRole (cookie)" value={session.userRole} />
          <Row label="companyName (cookie)" value={session.companyName} />
        </Section>

        <Section title="Contexto resolvido (getRequiredAppContext)">
          {contextError ? (
            <Row label="Erro" value={contextError} highlight="error" />
          ) : context ? (
            <>
              <Row label="tenantId" value={context.tenantId} highlight="ok" />
              <Row label="organizationId" value={context.organizationId} highlight="ok" />
              <Row label="appUserId" value={context.appUserId} />
              <Row label="tenantUserId" value={context.tenantUserId} />
              <Row label="role" value={context.role} highlight="ok" />
              <Row label="email" value={context.email} />
              <Row label="name" value={context.name} />
            </>
          ) : (
            <Row label="Status" value="Não resolvido" highlight="warn" />
          )}
        </Section>

        <Section title="Consistência">
          <Row
            label="companyId = organizationId"
            value={
              context
                ? session.companyId === context.organizationId
                  ? "SIM — match direto"
                  : "NÃO — resolvido via fallback"
                : "N/A"
            }
            highlight={
              context
                ? session.companyId === context.organizationId
                  ? "ok"
                  : "warn"
                : undefined
            }
          />
          <Row
            label="role cookie = role context"
            value={
              context
                ? session.userRole === context.role
                  ? "SIM"
                  : `NÃO — cookie: ${session.userRole}, context: ${context.role}`
                : "N/A"
            }
            highlight={
              context
                ? session.userRole === context.role
                  ? "ok"
                  : "warn"
                : undefined
            }
          />
        </Section>

        <div className="mt-4 text-center">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-full border border-red-200 bg-white px-6 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              Encerrar sessão
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
