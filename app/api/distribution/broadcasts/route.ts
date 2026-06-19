import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { buildBroadcastMessage } from "@/lib/distribution/content-message-builder";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(50, Number(searchParams.get("limit") || 20));

    const db = createSupabaseServerClient();

    let query = db
      .from("content_broadcasts")
      .select("id, title, source_type, source_url, source_title, message_text, status, scheduled_at, published_at, created_at, content_broadcast_targets(id, status, distribution_channel_id, published_at, error, distribution_channels(id, name, provider))")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, broadcasts: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();

    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ ok: false, error: "title obrigatório." }, { status: 400 });

    const sourceType = body?.sourceType as "article" | "event" | "manual" | undefined;
    const sourceUrl = body?.sourceUrl ? String(body.sourceUrl).trim() : null;
    const sourceTitle = body?.sourceTitle ? String(body.sourceTitle).trim() : null;
    const channelIds: string[] = Array.isArray(body?.channelIds) ? body.channelIds.map(String) : [];

    // Auto-generate message text if not provided
    let messageText = body?.messageText ? String(body.messageText).trim() : "";
    if (!messageText && sourceType && sourceType !== "manual") {
      messageText = buildBroadcastMessage(sourceType, {
        title: sourceTitle || title,
        url: sourceUrl || "",
        text: "",
      });
    }
    if (!messageText) return NextResponse.json({ ok: false, error: "messageText obrigatório." }, { status: 400 });

    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();

    const { data: broadcast, error: broadcastError } = await db
      .from("content_broadcasts")
      .insert({
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        title,
        source_type: sourceType || "manual",
        source_url: sourceUrl,
        source_title: sourceTitle,
        message_text: messageText,
        status: "draft",
        created_by: context.appUserId,
        created_at: now,
        updated_at: now,
      })
      .select("id, title, status, created_at")
      .single();

    if (broadcastError) throw broadcastError;

    // Create targets for selected channels
    if (channelIds.length > 0) {
      // Validate channels belong to this org
      const { data: validChannels } = await db
        .from("distribution_channels")
        .select("id")
        .in("id", channelIds)
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId);

      const validIds = (validChannels || []).map((c: { id: string }) => c.id);

      if (validIds.length > 0) {
        await db.from("content_broadcast_targets").insert(
          validIds.map((channelId: string) => ({
            broadcast_id: broadcast.id,
            distribution_channel_id: channelId,
            status: "pending",
            created_at: now,
          })),
        );
      }
    }

    return NextResponse.json({ ok: true, broadcast });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao criar" }, { status: 500 });
  }
}
