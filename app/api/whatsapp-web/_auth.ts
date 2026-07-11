import { NextResponse } from "next/server";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import { resolveSessionClient, sessionIdErrorResponse } from "@/lib/providers/resolve-session";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type AppContext = Awaited<ReturnType<typeof getRequiredAppContext>>;
type SupabaseWriteClient = ReturnType<typeof createSupabaseWriteClient>;
type ResolvedSession = NonNullable<ReturnType<typeof resolveSessionClient>>;

type OwnedWhatsappSessionResult =
  | {
      ok: true;
      context: AppContext;
      db: SupabaseWriteClient;
      resolved: ResolvedSession;
      channelId: string;
    }
  | { ok: false; response: NextResponse };

export async function requireOwnedWhatsappSession(sessionId?: string | null): Promise<OwnedWhatsappSessionResult> {
  const context = await getRequiredAppContext();
  const resolved = resolveSessionClient(sessionId);

  if (!resolved) {
    return { ok: false, response: sessionIdErrorResponse() };
  }

  const db = createSupabaseWriteClient();
  const { data: channel, error } = await db
    .from("channels")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .eq("session_id", resolved.sessionId)
    .maybeSingle();

  if (error) throw error;

  if (!channel?.id) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Canal não encontrado." }, { status: 403 }),
    };
  }

  return { ok: true, context, db, resolved, channelId: channel.id };
}
