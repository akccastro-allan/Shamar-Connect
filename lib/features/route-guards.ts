import { redirect } from "next/navigation";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { canAccessCommandCenter, canAccessPlatformAdmin, getTenantFeatureMetadata } from "@/lib/features/feature-flags";

export async function assertPlatformAdminRoute() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const tenantMetadata = await getTenantFeatureMetadata(db, context.tenantId);
    if (!canAccessPlatformAdmin(context, tenantMetadata)) redirect("/dashboard");
    return context;
  } catch (error) {
    if (isUnauthorizedError(error)) redirect("/login");
    throw error;
  }
}

export async function assertCommandCenterRoute() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const tenantMetadata = await getTenantFeatureMetadata(db, context.tenantId);
    if (!canAccessCommandCenter(context, tenantMetadata)) redirect("/dashboard");
    return context;
  } catch (error) {
    if (isUnauthorizedError(error)) redirect("/login");
    throw error;
  }
}
