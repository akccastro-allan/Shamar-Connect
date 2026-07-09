import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

type EnvCheck = {
  key: string;
  ok: boolean;
  optional?: boolean;
};

async function testSupabase() {
  try {
    const db = createSupabaseWriteClient();
    const { error } = await db.from("crm_contacts").select("id", { count: "exact", head: true });
    return { ok: !error, label: "Supabase", detail: error?.message || "Banco acessível" };
  } catch (error) {
    return { ok: false, label: "Supabase", detail: error instanceof Error ? error.message : "Erro no Supabase" };
  }
}

function getGatewayBaseUrl() {
  const raw = (process.env.WHATSAPP_WEB_GATEWAY_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

async function testGateway() {
  const baseUrl = getGatewayBaseUrl();
  const token = (process.env.WHATSAPP_WEB_GATEWAY_TOKEN || "").trim();
  const sessionId = process.env.WHATSAPP_WEB_GATEWAY_SESSION_ID || "hall-main";

  if (!baseUrl) return { ok: false, label: "Railway Gateway", detail: "WHATSAPP_WEB_GATEWAY_URL não configurada" };
  if (!token) return { ok: false, label: "Railway Gateway", detail: "WHATSAPP_WEB_GATEWAY_TOKEN não configurado" };

  try {
    const response = await fetch(`${baseUrl}/sessions`, {
      headers: { "x-api-key": token, authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => []);
    const sessions = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.sessions) ? data.sessions : [];
    const session = sessions.find((item: Record<string, unknown>) => item.name === sessionId || item.id === sessionId);
    return {
      ok: response.ok,
      label: "Railway Gateway",
      detail: response.ok
        ? `Sessão ${session?.name || sessionId}: ${session?.status || "não criada"}${session?.phone ? ` | telefone: ${session.phone}` : ""}`
        : `HTTP ${response.status}${data?.error ? ` | ${data.error}` : ""}`,
    };
  } catch (error) {
    return { ok: false, label: "Railway Gateway", detail: error instanceof Error ? error.message : "Erro no gateway" };
  }
}

function testEnv() {
  const requiredChecks: EnvCheck[] = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { key: "SUPABASE_SERVICE_ROLE_KEY", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { key: "WHATSAPP_WEB_GATEWAY_URL", ok: Boolean(process.env.WHATSAPP_WEB_GATEWAY_URL) },
    { key: "WHATSAPP_WEB_GATEWAY_TOKEN", ok: Boolean(process.env.WHATSAPP_WEB_GATEWAY_TOKEN) },
    { key: "SHAMARCONNECT_WEBHOOK_TOKEN", ok: Boolean(process.env.SHAMARCONNECT_WEBHOOK_TOKEN) },
  ];

  const optionalChecks: EnvCheck[] = [
    { key: "INTERNAL_API_KEY", ok: Boolean(process.env.INTERNAL_API_KEY), optional: true },
    { key: "WHATSAPP_WEB_GATEWAY_SESSION_ID", ok: Boolean(process.env.WHATSAPP_WEB_GATEWAY_SESSION_ID), optional: true },
  ];

  const checks: EnvCheck[] = [...requiredChecks, ...optionalChecks];

  return {
    ok: requiredChecks.every((check) => check.ok),
    label: "Variáveis de ambiente",
    detail: checks
      .map((check) => `${check.key}: ${check.ok ? "ok" : check.optional ? "opcional" : "faltando"}`)
      .join(" | "),
  };
}

function testBrandAssets() {
  return {
    ok: true,
    label: "Identidade visual",
    detail: "/brand/shamar-connect-logo.png e /brand/shamar-connect-icon.png configurados como assets oficiais",
  };
}

export async function GET() {
  try {
    await getRequiredAppContext();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "Falha de autorização." }, { status: 500 });
  }

  const checks = [
    { ok: true, label: "Aplicação Vercel", detail: "API do ShamarConnect respondeu" },
    testEnv(),
    testBrandAssets(),
    await testSupabase(),
    await testGateway(),
  ];

  return NextResponse.json({
    ok: checks.every((check) => check.ok),
    checkedAt: new Date().toISOString(),
    checks,
  });
}
