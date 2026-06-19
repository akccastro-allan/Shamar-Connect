import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { isTelegramConfigured, getMe } from "@/lib/providers/telegram-bot-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getRequiredAppContext();

    const configured = isTelegramConfigured();
    let botInfo = null;
    let botError: string | null = null;

    if (configured) {
      try {
        botInfo = await getMe();
      } catch (err) {
        botError = err instanceof Error ? err.message : "Falha ao consultar Telegram API";
      }
    }

    const db = createSupabaseServerClient();
    const { data: telegramChannels } = await db
      .from("distribution_channels")
      .select("id, name, provider, external_id, active")
      .in("provider", ["telegram_group", "telegram_channel"])
      .order("name");

    return NextResponse.json({
      ok: true,
      configured,
      botInfo,
      botError,
      telegramChannels: telegramChannels || [],
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao carregar diagnóstico" },
      { status: 500 },
    );
  }
}
