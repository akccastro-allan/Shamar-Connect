import { NextResponse } from "next/server";
import type { AppContext } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { canAccessPlatformAdmin, getTenantFeatureMetadata } from "@/lib/features/feature-flags";

export async function assertPlatformAdminApi(context: AppContext, message = "Acesso restrito a administradores.") {
  const db = createSupabaseWriteClient();
  const metadata = await getTenantFeatureMetadata(db, context.tenantId);

  if (!canAccessPlatformAdmin(context, metadata)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: message }, { status: 403 }),
    };
  }

  return { ok: true as const };
}
