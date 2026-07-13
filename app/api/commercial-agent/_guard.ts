import { NextResponse } from "next/server";
import type { AppContext } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getTenantFeatureMetadata, type TenantMetadata } from "@/lib/features/feature-flags";

export async function assertCommercialAgentApi(context: AppContext) {
  const db = createSupabaseWriteClient();
  const metadata = await getTenantFeatureMetadata(db, context.tenantId);
  const enabled = hasCommercialAgentFlag(metadata, "commercial_agent") || hasCommercialAgentFlag(metadata, "commercial_agent_lips");

  if (!enabled) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Agente comercial indisponível para este tenant." }, { status: 403 }),
    };
  }

  return { ok: true as const, db };
}

function hasCommercialAgentFlag(metadata: TenantMetadata, flag: string) {
  const features = metadata?.features;
  return Boolean(
    features &&
      typeof features === "object" &&
      !Array.isArray(features) &&
      (features as Record<string, unknown>)[flag] === true,
  );
}

export function readConversationId(body: unknown) {
  if (!body || typeof body !== "object") return "";
  return String((body as Record<string, unknown>).conversationId || "").trim();
}
