import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { getCloudConfig, isCloudConfigured, getPhoneNumberStatus } from "@/lib/providers/whatsapp-cloud-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getRequiredAppContext();

    const cfg = getCloudConfig();

    const envStatus = {
      accessToken: Boolean(cfg.accessToken),
      phoneNumberId: Boolean(cfg.phoneNumberId),
      businessAccountId: Boolean(cfg.businessAccountId),
      verifyToken: Boolean(cfg.verifyToken),
      appSecret: Boolean(cfg.appSecret),
    };

    const configured = isCloudConfigured();
    const phoneNumberIdPartial = cfg.phoneNumberId
      ? cfg.phoneNumberId.slice(0, 6) + "…"
      : null;

    // Try to get live phone number status from Meta
    let phoneStatus: Awaited<ReturnType<typeof getPhoneNumberStatus>> | null = null;
    let phoneStatusError: string | null = null;

    if (configured) {
      try {
        phoneStatus = await getPhoneNumberStatus();
      } catch (err) {
        phoneStatusError = err instanceof Error ? err.message : "Falha ao consultar Meta";
      }
    }

    // Recent messages and events from DB
    const db = createSupabaseServerClient();

    const [messagesResult, eventsResult] = await Promise.all([
      db
        .from("whatsapp_messages")
        .select("id, direction, body, message_type, created_at")
        .eq("provider", "whatsapp_cloud")
        .order("created_at", { ascending: false })
        .limit(10),
      db
        .from("provider_events")
        .select("id, event, processing_status, created_at")
        .eq("provider", "whatsapp_cloud")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      ok: true,
      provider: "whatsapp_cloud",
      configured,
      envStatus,
      phoneNumberIdPartial,
      phoneStatus,
      phoneStatusError,
      recentMessages: messagesResult.data || [],
      recentEvents: eventsResult.data || [],
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
