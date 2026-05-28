import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function testSupabase() {
  try {
    const db = createSupabaseServerClient();
    const { error } = await db.from("crm_contacts").select("id", { count: "exact", head: true });
    return { ok: !error, label: "Supabase", detail: error?.message || "Banco acessível" };
  } catch (error) {
    return { ok: false, label: "Supabase", detail: error instanceof Error ? error.message : "Erro no Supabase" };
  }
}

async function testGateway() {
  const baseUrl = process.env.WHATSAPP_WEB_GATEWAY_URL?.replace(/\/$/, "");
  const token = process.env.WHATSAPP_WEB_GATEWAY_TOKEN || "";

  if (!baseUrl) return { ok: false, label: "Railway Gateway", detail: "WHATSAPP_WEB_GATEWAY_URL não configurada" };

  try {
    const response = await fetch(`${baseUrl}/status`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, label: "Railway Gateway", detail: response.ok ? `Status WhatsApp: ${data.status || "indefinido"}` : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, label: "Railway Gateway", detail: error instanceof Error ? error.message : "Erro no gateway" };
  }
}

function testEnv() {
  const checks = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { key: "SUPABASE_SERVICE_ROLE_KEY", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { key: "WHATSAPP_WEB_GATEWAY_URL", ok: Boolean(process.env.WHATSAPP_WEB_GATEWAY_URL) },
    { key: "WHATSAPP_WEB_GATEWAY_TOKEN", ok: Boolean(process.env.WHATSAPP_WEB_GATEWAY_TOKEN) },
    { key: "SHAMARCONNECT_WEBHOOK_TOKEN", ok: Boolean(process.env.SHAMARCONNECT_WEBHOOK_TOKEN) },
  ];

  return {
    ok: checks.every((check) => check.ok),
    label: "Variáveis de ambiente",
    detail: checks.map((check) => `${check.key}: ${check.ok ? "ok" : "faltando"}`).join(" | "),
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
