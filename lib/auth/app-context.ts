import { getCurrentSession } from "@/lib/auth/session";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export type AppContext = {
  tenantId: string;
  organizationId: string;
  appUserId: string;
  tenantUserId: string;
  role: "owner" | "admin" | "attendant" | "viewer";
  email: string;
  name: string;
  isPlatformTenant: boolean;
};

const allowedRoles = new Set(["owner", "admin", "attendant", "viewer"]);

function normalizeRole(value?: string | null): AppContext["role"] {
  return allowedRoles.has(String(value || ""))
    ? (value as AppContext["role"])
    : "viewer";
}

export async function getRequiredAppContext(): Promise<AppContext> {
  const session = await getCurrentSession();

  if (!session?.userId) {
    throw new Error("UNAUTHORIZED");
  }

  const db = createSupabaseWriteClient();

  const { data: appUser, error: appUserError } = await db
    .from("app_users")
    .select("id, name, email, role, status")
    .eq("id", session.userId)
    .eq("status", "active")
    .maybeSingle();

  if (appUserError) throw appUserError;
  if (!appUser) throw new Error("UNAUTHORIZED");

  const { data: tenantUsers, error: tenantUserError } = await db
    .from("tenant_users")
    .select("id, tenant_id, organization_id, role, status, created_at")
    .eq("app_user_id", appUser.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (tenantUserError) throw tenantUserError;

  const tenantUser =
    tenantUsers?.find((item: any) => item.organization_id === session.companyId) ||
    tenantUsers?.find((item: any) => item.tenant_id === session.companyId) ||
    tenantUsers?.[0];

  if (!tenantUser?.tenant_id) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: tenant } = await db
    .from("tenants")
    .select("is_platform, status")
    .eq("id", tenantUser.tenant_id)
    .eq("status", "active")
    .maybeSingle();

  if (!tenantUser.organization_id) {
    if (tenant?.is_platform === true && ["owner", "admin"].includes(String(tenantUser.role || appUser.role))) {
      return {
        tenantId: tenantUser.tenant_id,
        organizationId: "",
        appUserId: appUser.id,
        tenantUserId: tenantUser.id,
        role: normalizeRole(tenantUser.role || appUser.role),
        email: appUser.email,
        name: appUser.name || appUser.email,
        isPlatformTenant: true,
      };
    }
    throw new Error("UNAUTHORIZED");
  }

  const { data: organization, error: organizationError } = await db
    .from("organizations")
    .select("id, tenant_id, status")
    .eq("id", tenantUser.organization_id)
    .eq("tenant_id", tenantUser.tenant_id)
    .eq("status", "active")
    .maybeSingle();

  if (organizationError) throw organizationError;
  if (!organization) throw new Error("UNAUTHORIZED");

  return {
    tenantId: tenantUser.tenant_id,
    organizationId: tenantUser.organization_id,
    appUserId: appUser.id,
    tenantUserId: tenantUser.id,
    role: normalizeRole(tenantUser.role || appUser.role),
    email: appUser.email,
    name: appUser.name || appUser.email,
    isPlatformTenant: tenant?.is_platform === true,
  };
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}
