/**
 * GET /api/evolution/qr
 * Retorna o QR Code para conectar o telefone via Evolution API.
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
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY || !process.env.EVOLUTION_INSTANCE_ID) {
      return NextResponse.json(
        { ok: false, error: "Evolution API não configurada." },
        { status: 503 },
      );
    }

    // Tenta pegar QR Code
    try {
      const status = await evolutionApiClient.getQr();

      if (!status.qrCode) {
        return NextResponse.json({
          ok: true,
          qrCodeAvailable: false,
          status: status.status,
          message: "Instância já conectada ou QR Code não disponível.",
          channel: "lips-main",
        });
      }

      return NextResponse.json({
        ok: true,
        qrCodeAvailable: true,
        qrCode: status.qrCode,
        status: status.status,
        channel: "lips-main",
        instructions: "Escaneie o QR Code com o WhatsApp no telefone que deseja conectar.",
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao gerar QR Code";
      return NextResponse.json(
        { ok: false, error: errorMsg, channel: "lips-main" },
        { status: 503 },
      );
    }
  } catch (err) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Falha ao gerar QR Code" },
      { status: 500 },
    );
  }
}
