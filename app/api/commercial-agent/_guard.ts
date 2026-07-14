import { NextResponse } from "next/server";
import type { AppContext } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { canAccessCommercialAgentLips, getTenantFeatureMetadata } from "@/lib/features/feature-flags";

export async function assertCommercialAgentApi(context: AppContext) {
  const db = createSupabaseWriteClient();
  const metadata = await getTenantFeatureMetadata(db, context.tenantId);
  const enabled = canAccessCommercialAgentLips(context, metadata);

  if (!enabled) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Agente comercial indisponível para este tenant." }, { status: 403 }),
    };
  }

  return { ok: true as const, db };
}

export async function resolveLipsConversationContext(
  db: ReturnType<typeof createSupabaseWriteClient>,
  platformContext: AppContext,
  conversationId: string,
): Promise<AppContext> {
  const { data: conversation, error } = await db
    .from("whatsapp_conversations")
    .select("id, tenant_id, organization_id, channel_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw error;
  if (!conversation) throw new Error("commercial_conversation_not_found");
  if (!conversation.channel_id) throw new Error("commercial_agent_lips_scope_required");

  const { data: lipsChannel, error: channelError } = await db
    .from("channels")
    .select("id")
    .eq("id", conversation.channel_id)
    .eq("tenant_id", conversation.tenant_id)
    .eq("organization_id", conversation.organization_id)
    .eq("session_id", "lips-main")
    .maybeSingle();

  if (channelError) throw channelError;
  if (!lipsChannel) throw new Error("commercial_agent_lips_scope_required");

  return {
    ...platformContext,
    tenantId: conversation.tenant_id,
    organizationId: conversation.organization_id,
    isPlatformTenant: false,
  };
}

export function readConversationId(body: unknown) {
  if (!body || typeof body !== "object") return "";
  return String((body as Record<string, unknown>).conversationId || "").trim();
}
