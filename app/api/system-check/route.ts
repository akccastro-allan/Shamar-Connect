import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { SHAMAR_CONNECT_ICON_PATH, SHAMAR_CONNECT_LOGO_PATH } from "@/components/brand/brand-logo";

type CheckResult = {
  key: string;
  label: string;
  ok: boolean;
  status: "ok" | "warning" | "error";
  detail: string;
};

async function checkAsset(path: string, label: string): Promise<CheckResult> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${path}`, { cache: "no-store" });
    return {
      key: path,
      label,
      ok: response.ok,
      status: response.ok ? "ok" : "error",
      detail: response.ok ? `${path} carregando` : `${path} retornou ${response.status}`,
    };
  } catch (error) {
    return { key: path, label, ok: false, status: "error", detail: error instanceof Error ? error.message : "Falha ao verificar asset" };
  }
}

async function checkSupabase(): Promise<CheckResult> {
  try {
    const db = createSupabaseWriteClient();
    const { error } = await db.from("crm_contacts").select("id", { count: "exact", head: true });
    if (error) throw error;
    return { key: "supabase", label: "Supabase", ok: true, status: "ok", detail: "Conexão e tabela crm_contacts acessíveis" };
  } catch (error) {
    return { key: "supabase", label: "Supabase", ok: false, status: "error", detail: error instanceof Error ? error.message : "Falha no Supabase" };
  }
}

async function checkWhatsappGateway(): Promise<CheckResult> {
  try {
    const status = await whatsappWebGatewayClient.getStatus();
    const ready = status.status === "ready";
    return {
      key: "whatsapp_gateway",
      label: "WhatsApp Web Gateway",
      ok: ready,
      status: ready ? "ok" : "warning",
      detail: `Status atual: ${status.status}${status.phone ? ` • Telefone: ${status.phone}` : ""}`,
    };
  } catch (error) {
    return { key: "whatsapp_gateway", label: "WhatsApp Web Gateway", ok: false, status: "error", detail: error instanceof Error ? error.message : "Falha no Gateway" };
  }
}

async function checkRequiredEnv(): Promise<CheckResult> {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "WHATSAPP_WEB_GATEWAY_URL",
    "WHATSAPP_WEB_GATEWAY_TOKEN",
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    key: "env",
    label: "Variáveis de ambiente",
    ok: missing.length === 0,
    status: missing.length === 0 ? "ok" : "error",
    detail: missing.length === 0 ? "Variáveis principais configuradas" : `Faltando: ${missing.join(", ")}`,
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

  const checks = await Promise.all([
    checkRequiredEnv(),
    checkSupabase(),
    checkWhatsappGateway(),
    checkAsset(SHAMAR_CONNECT_ICON_PATH, "Ícone da marca"),
    checkAsset(SHAMAR_CONNECT_LOGO_PATH, "Logo da marca"),
  ]);

  return NextResponse.json({
    ok: checks.every((check) => check.status !== "error"),
    service: "shamar-connect-system-check",
    checkedAt: new Date().toISOString(),
    checks,
  });
}
