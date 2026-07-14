import { NextRequest, NextResponse } from "next/server";
import type { AppContext } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import {
  canAccessCommandCenter,
  canAccessPlatformAdmin,
  normalizeMetadata,
  type TenantMetadata,
} from "@/lib/features/feature-flags";

const PRIVATE_FALLBACK_PATH = "/dashboard";
const UNAUTHORIZED_PATH = "/planos?reason=not-authorized";
const ALLOWED_ROLES = new Set(["owner", "admin", "agent", "attendant", "viewer"]);

type LoginPayload = {
  email?: string | null;
  password?: string | null;
  next?: string | null;
};

type TenantUserRow = {
  id: string;
  tenant_id: string;
  organization_id: string;
  role: string | null;
  status: string;
};

type TenantRow = {
  id: string;
  is_platform: boolean | null;
  metadata: unknown;
};

type OrganizationRow = {
  id: string;
  tenant_id: string;
  name: string | null;
  legal_name: string | null;
  document_number: string | null;
  status: string;
};

type LoginChoice = {
  context: AppContext;
  tenantUser: TenantUserRow;
  organization: OrganizationRow;
  metadata: TenantMetadata;
  destination: string;
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

function hasSafeNextPath(value?: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

function normalizeRole(value?: string | null) {
  return ALLOWED_ROLES.has(String(value || ""))
    ? (value as "owner" | "admin" | "agent" | "attendant" | "viewer")
    : "viewer";
}

function isOperationsPath(path: string) {
  return path === "/operations" || path.startsWith("/operations/");
}

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

function destinationFor(context: AppContext, metadata: TenantMetadata) {
  if (canAccessPlatformAdmin(context, metadata)) return "/admin";
  if (canAccessCommandCenter(context, metadata)) return "/operations";
  return PRIVATE_FALLBACK_PATH;
}

function canAccessPath(path: string, context: AppContext, metadata: TenantMetadata) {
  if (isAdminPath(path)) return canAccessPlatformAdmin(context, metadata);
  if (isOperationsPath(path)) return canAccessCommandCenter(context, metadata);
  return true;
}

function sortByDestinationPriority(a: LoginChoice, b: LoginChoice) {
  const priority = new Map([
    ["/admin", 0],
    ["/operations", 1],
    [PRIVATE_FALLBACK_PATH, 2],
  ]);

  return (priority.get(a.destination) ?? 3) - (priority.get(b.destination) ?? 3);
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
    const hasRequestedNextPath = hasSafeNextPath(payload.next);
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

    const { data: tenantUsers, error: tenantUserError } = await db
      .from("tenant_users")
      .select("id, tenant_id, organization_id, role, status")
      .eq("app_user_id", appUser.id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (tenantUserError || !tenantUsers?.length) {
      await clearSessionCookie();

      if (wantsHtmlRedirect) {
        return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url), { status: 303 });
      }

      return NextResponse.json(
        { ok: false, error: "Usuário sem vínculo ativo com empresa.", redirectTo: UNAUTHORIZED_PATH },
        { status: 403 },
      );
    }

    const tenantIds = Array.from(new Set(tenantUsers.map((item: TenantUserRow) => item.tenant_id).filter(Boolean)));
    const organizationIds = Array.from(
      new Set(tenantUsers.map((item: TenantUserRow) => item.organization_id).filter(Boolean)),
    );

    const { data: tenants, error: tenantsError } = await db
      .from("tenants")
      .select("id, is_platform, metadata")
      .in("id", tenantIds);

    const { data: organizations, error: organizationsError } = await db
      .from("organizations")
      .select("id, tenant_id, name, legal_name, document_number, status")
      .in("id", organizationIds)
      .eq("status", "active");

    if (tenantsError || organizationsError) {
      await clearSessionCookie();
      throw tenantsError || organizationsError;
    }

    const tenantsById = new Map((tenants as TenantRow[] | null | undefined)?.map((tenant) => [tenant.id, tenant]));
    const organizationsById = new Map(
      (organizations as OrganizationRow[] | null | undefined)?.map((organization) => [organization.id, organization]),
    );

    const choices: LoginChoice[] = (tenantUsers as TenantUserRow[]).flatMap((tenantUser) => {
      const tenant = tenantsById.get(tenantUser.tenant_id);
      const organization = organizationsById.get(tenantUser.organization_id);

      if (!tenant || !organization || organization.tenant_id !== tenantUser.tenant_id) return [];

      const role = normalizeRole(tenantUser.role || appUser.role);
      const metadata = normalizeMetadata(tenant.metadata);
      const context: AppContext = {
        tenantId: tenantUser.tenant_id,
        organizationId: tenantUser.organization_id,
        appUserId: appUser.id,
        tenantUserId: tenantUser.id,
        role,
        email: authenticatedEmail,
        name: appUser.name || authenticatedEmail,
        isPlatformTenant: tenant.is_platform === true,
      };

      return [{ context, tenantUser, organization, metadata, destination: destinationFor(context, metadata) }];
    });

    if (!choices.length) {
      await clearSessionCookie();

      if (wantsHtmlRedirect) {
        return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url), { status: 303 });
      }

      return NextResponse.json(
        { ok: false, error: "Empresa inativa ou não encontrada.", redirectTo: UNAUTHORIZED_PATH },
        { status: 403 },
      );
    }

    const sortedChoices = [...choices].sort(sortByDestinationPriority);
    const requestedChoice = hasRequestedNextPath
      ? sortedChoices.find((choice) => canAccessPath(nextPath, choice.context, choice.metadata))
      : null;
    const choice = requestedChoice || sortedChoices[0];
    const redirectPath = hasRequestedNextPath && canAccessPath(nextPath, choice.context, choice.metadata)
      ? nextPath
      : choice.destination;
    const organizationName = choice.organization.name || choice.organization.legal_name || "ShamarConnect";
    const documentNumber = choice.organization.document_number || "";

    await db
      .from("app_users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", appUser.id);

    const session = {
      companyId: choice.tenantUser.organization_id || choice.tenantUser.tenant_id,
      companyName: organizationName,
      documentType: "cnpj" as const,
      documentNumber,
      userId: appUser.id,
      userName: appUser.name || authenticatedEmail,
      userRole: choice.context.role,
      loginAt: new Date().toISOString(),
    };

    await setSessionCookie(session);

    if (wantsHtmlRedirect) {
      return NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 });
    }

    return NextResponse.json({ ok: true, session, next: redirectPath });
  } catch (error) {
    await clearSessionCookie();
    const message = error instanceof Error ? error.message : "Falha no login.";
    return errorResponse(message, 500, wantsHtmlRedirect, request);
  }
}
