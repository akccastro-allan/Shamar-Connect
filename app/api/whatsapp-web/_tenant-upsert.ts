import type { getRequiredAppContext } from "@/lib/auth/app-context";
import type { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type AppContext = Pick<Awaited<ReturnType<typeof getRequiredAppContext>>, "tenantId" | "organizationId">;
type SupabaseWriteClient = ReturnType<typeof createSupabaseWriteClient>;

export async function upsertTenantRow(
  db: SupabaseWriteClient,
  context: AppContext,
  table: string,
  lookup: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  const client = db as any;
  let query = client
    .from(table)
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId);

  for (const [key, value] of Object.entries(lookup)) {
    query = query.eq(key, value);
  }

  const { data: existing, error: lookupError } = await query.maybeSingle();
  if (lookupError) throw lookupError;

  const scopedPayload = {
    ...payload,
    tenant_id: context.tenantId,
    organization_id: context.organizationId,
  };

  if (existing?.id) {
    const { data, error } = await client
      .from(table)
      .update(scopedPayload)
      .eq("id", existing.id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await client
    .from(table)
    .insert(scopedPayload)
    .select("id")
    .single();

  if (error) throw error;
  return data;
}
