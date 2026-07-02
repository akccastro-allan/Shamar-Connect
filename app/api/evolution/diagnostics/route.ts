/**
 * GET /api/evolution/diagnostics
 * Diagnóstico de conexão da Evolution API para Lips.
 * Admin/interno apenas.
 */
import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { evolutionApiClient } from "@/lib/providers/evolution-api-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();

    // Verifica se tem as variáveis configuradas
    const hasConfig = process.env.EVOLUTION_API_URL &&
                      process.env.EVOLUTION_API_KEY &&
                      process.env.EVOLUTION_INSTANCE_ID;

    if (!hasConfig) {
      return NextResponse.json({
        ok: false,
        error: "Evolution API não configurada. Faltam variáveis de ambiente.",
        configured: false,
      }, { status: 503 });
    }

    // Tenta pegar o status
    let status;
    let connected = false;
    let error: string | null = null;

    try {
      status = await evolutionApiClient.getStatus();
      connected = status.status === "ready" || status.status === "authenticated";
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao conectar Evolution API";
      status = { status: "error" as const, provider: "evolution_api" };
    }

    // Mascara o instance ID
    const instanceId = process.env.EVOLUTION_INSTANCE_ID;
    const maskedInstanceId = instanceId ? `${instanceId.slice(0, 8)}...${instanceId.slice(-4)}` : "unknown";

    return NextResponse.json({
      ok: !error,
      configured: true,
      connected,
      status: status?.status || "unknown",
      phone: status?.phone || null,
      instanceIdMasked: maskedInstanceId,
      qrCodeAvailable: status?.qrCode ? true : false,
      provider: "evolution_api",
      channel: "lips-main",
      error: error || null,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Falha ao diagnosticar Evolution API" },
      { status: 500 },
    );
  }
}
