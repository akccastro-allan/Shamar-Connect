import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";

const PRIVATE_FALLBACK_PATH = "/dashboard";
const UNAUTHORIZED_PATH = "/planos?reason=not-authorized";

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return PRIVATE_FALLBACK_PATH;
  }

  if (value.startsWith("//")) {
    return PRIVATE_FALLBACK_PATH;
  }

  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const nextPath = normalizeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");

  if (!code) {
    await clearSessionCookie();
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  const supabase = createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);
  const email = normalizeEmail(authData.user?.email);

  if (authError || !email) {
    await clearSessionCookie();
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  const db = createSupabaseWriteClient();

  const { data: appUser, error: appUserError } = await db
    .from("app_users")
    .select("id, name, email, role, status")
    .eq("email", email)
    .eq("status", "active")
    .maybeSingle();

  if (appUserError || !appUser) {
    await clearSessionCookie();
    return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, origin));
  }

  const { data: tenantUser, error: tenantUserError } = await db
    .from("tenant_users")
    .select("id, tenant_id, organization_id, role, status")
    .eq("app_user_id", appUser.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tenantUserError || !tenantUser) {
    await clearSessionCookie();
    return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, origin));
  }

  let organizationName = "ShamarConnect";
  let documentNumber = "";

  if (tenantUser.organization_id) {
    const { data: organization } = await db
      .from("organizations")
      .select("name, legal_name, document_number, status")
      .eq("id", tenantUser.organization_id)
      .eq("status", "active")
      .maybeSingle();

    if (!organization) {
      await clearSessionCookie();
      return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, origin));
    }

    organizationName = organization.name || organization.legal_name || organizationName;
    documentNumber = organization.document_number || "";
  }

  await db
    .from("app_users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", appUser.id);

  await setSessionCookie({
    companyId: tenantUser.organization_id || tenantUser.tenant_id,
    companyName: organizationName,
    documentType: "cnpj",
    documentNumber,
    userId: appUser.id,
    userName: appUser.name || email,
    userRole: tenantUser.role || appUser.role || "viewer",
    loginAt: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL(nextPath, origin));
}
