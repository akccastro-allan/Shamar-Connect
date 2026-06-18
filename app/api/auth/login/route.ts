import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";

const PRIVATE_FALLBACK_PATH = "/dashboard";
const UNAUTHORIZED_PATH = "/planos?reason=not-authorized";
const ALLOWED_ROLES = new Set(["owner", "admin", "attendant", "viewer"]);

type LoginPayload = {
  email?: string | null;
  password?: string | null;
  next?: string | null;
};

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

async function readLoginPayload(request: NextRequest): Promise<{ payload: LoginPayload; wantsHtmlRedirect: boolean }> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return {
      payload: await request.json(),
      wantsHtmlRedirect: false,
    };
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();

    return {
      payload: {
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
        next: String(formData.get("next") || ""),
      },
      wantsHtmlRedirect: true,
    };
  }

  const text = await request.text();
  const params = new URLSearchParams(text);

  return {
    payload: {
      email: params.get("email"),
      password: params.get("password"),
      next: params.get("next"),
    },
    wantsHtmlRedirect: true,
  };
}

function errorResponse(message: string, status: number, wantsHtmlRedirect: boolean, request: NextRequest) {
  if (wantsHtmlRedirect) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", message);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const { payload, wantsHtmlRedirect } = await readLoginPayload(request);

  try {
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "");
    const nextPath = normalizeNextPath(payload.next);

    if (!email || !password) {
      return errorResponse("E-mail e senha são obrigatórios.", 400, wantsHtmlRedirect, request);
    }

    const supabaseAuth = createSupabaseServerClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    const authenticatedEmail = normalizeEmail(authData.user?.email);

    if (authError || !authenticatedEmail) {
      await clearSessionCookie();
      return errorResponse("E-mail ou senha inválidos.", 401, wantsHtmlRedirect, request);
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

      if (wantsHtmlRedirect) {
        return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url), { status: 303 });
      }

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

      if (wantsHtmlRedirect) {
        return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url), { status: 303 });
      }

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

        if (wantsHtmlRedirect) {
          return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url), { status: 303 });
        }

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
      documentType: "cnpj" as const,
      documentNumber,
      userId: appUser.id,
      userName: appUser.name || authenticatedEmail,
      userRole: normalizeRole(tenantUser.role || appUser.role),
      loginAt: new Date().toISOString(),
    };

    await setSessionCookie(session);

    if (wantsHtmlRedirect) {
      return NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
    }

    return NextResponse.json({ ok: true, session, next: nextPath });
  } catch (error) {
    await clearSessionCookie();
    const message = error instanceof Error ? error.message : "Falha no login.";
    return errorResponse(message, 500, wantsHtmlRedirect, request);
  }
}
