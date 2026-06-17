import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";

const PRIVATE_FALLBACK_PATH = "/dashboard";
const UNAUTHORIZED_PATH = "/planos?reason=not-authorized";
const ALLOWED_ROLES = new Set(["owner", "admin", "attendant", "viewer"]);

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return PRIVATE_FALLBACK_PATH;
  }

  return value;
}

function normalizeRole(value?: string | null) {
  return ALLOWED_ROLES.has(String(value || ""))
    ? (value as "owner" | "admin" | "attendant" | "viewer")
    : "viewer";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || "");
    const nextPath = normalizeNextPath(body?.next);

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "E-mail e senha são obrigatórios." },
        { status: 400 },
      );
    }

    const supabaseAuth = createSupabaseServerClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    const authenticatedEmail = normalizeEmail(authData.user?.email);

    if (authError || !authenticatedEmail) {
      await clearSessionCookie();
      return NextResponse.json(
        { ok: false, error: "E-mail ou senha inválidos." },
        { status: 401 },
      );
    }

    const db = createSupabaseWriteClient();

    const { data: appUser, error: appUserError } = await db
      .from("app_users")
      .select("id, name, email, role, status")
      .eq("email", authenticatedEmail)
      .eq("status", "active")
      .maybeSingle();

    if (appUserError || !appUser) {
      await clearSessionCookie();
      return NextResponse.json(
        { ok: false, error: "Usuário sem permissão ativa no ShamarConnect.", redirectTo: UNAUTHORIZED_PATH },
        { status: 403 },
      );
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
      return NextResponse.json(
        { ok: false, error: "Usuário sem vínculo ativo com empresa.", redirectTo: UNAUTHORIZED_PATH },
        { status: 403 },
      );
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
        return NextResponse.json(
          { ok: false, error: "Empresa inativa ou não encontrada.", redirectTo: UNAUTHORIZED_PATH },
          { status: 403 },
        );
      }

      organizationName = organization.name || organization.legal_name || organizationName;
      documentNumber = organization.document_number || "";
    }

    await db
      .from("app_users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", appUser.id);

    const session = {
      companyId: tenantUser.organization_id || tenantUser.tenant_id,
      companyName: organizationName,
      documentType: "cnpj",
      documentNumber,
      userId: appUser.id,
      userName: appUser.name || authenticatedEmail,
      userRole: normalizeRole(tenantUser.role || appUser.role),
      loginAt: new Date().toISOString(),
    };

    await setSessionCookie(session);

    return NextResponse.json({ ok: true, session, next: nextPath });
  } catch (error) {
    await clearSessionCookie();
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha no login." },
      { status: 500 },
    );
  }
}
