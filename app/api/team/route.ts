import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

const CAN_MANAGE = new Set(["owner", "admin"]);
const ROLES = new Set(["owner", "admin", "attendant", "viewer"]);

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Lista a equipe (atendentes) da empresa logada, com papel e setor.
export async function GET() {
  try {
    const ctx = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data, error } = await db
      .from("tenant_users")
      .select("id, app_user_id, role, status, department_id, created_at, app_users:app_user_id(name, email), departments:department_id(id, name, color)")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ ok: true, members: data ?? [] });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao listar equipe" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();
    if (!CAN_MANAGE.has(ctx.role)) {
      return NextResponse.json({ ok: false, error: "Apenas administradores podem gerenciar a equipe." }, { status: 403 });
    }

    const body = await request.json();
    const action = String(body?.action || "invite");
    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();

    // --- Atualizar papel / setor / status de um membro existente ---------------
    if (action === "update") {
      const tenantUserId = String(body?.tenantUserId || "");
      if (!tenantUserId) return NextResponse.json({ ok: false, error: "Membro não informado." }, { status: 400 });

      const patch: Record<string, unknown> = { updated_at: now };
      if (body?.role !== undefined) {
        if (!ROLES.has(String(body.role))) return NextResponse.json({ ok: false, error: "Papel inválido." }, { status: 400 });
        patch.role = String(body.role);
      }
      if (body?.department_id !== undefined) patch.department_id = body.department_id || null;
      if (body?.status !== undefined) patch.status = body.status === "active" ? "active" : "inactive";

      const { data, error } = await db
        .from("tenant_users")
        .update(patch)
        .eq("id", tenantUserId)
        .eq("tenant_id", ctx.tenantId)
        .eq("organization_id", ctx.organizationId)
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, member: data });
    }

    // --- Convidar (criar) um novo atendente ------------------------------------
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "attendant");
    const departmentId = body?.department_id ? String(body.department_id) : null;

    if (!name) return NextResponse.json({ ok: false, error: "Informe o nome." }, { status: 400 });
    if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "E-mail inválido." }, { status: 400 });
    if (!ROLES.has(role)) return NextResponse.json({ ok: false, error: "Papel inválido." }, { status: 400 });

    // Reusa o usuário se o e-mail já existir (evita falha no Auth).
    const { data: existing } = await db.from("app_users").select("id").eq("email", email).maybeSingle();

    let appUserId = existing?.id as string | undefined;
    let tempPassword: string | null = null;

    if (!appUserId) {
      tempPassword = generatePassword();
      const { data: authUser, error: authError } = await db.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name },
      });
      if (authError) throw authError;
      appUserId = authUser.user.id;

      const { error: appUserError } = await db.from("app_users").insert({
        id: appUserId,
        name,
        email,
        role: role === "owner" ? "owner" : "attendant",
        status: "active",
        created_at: now,
        updated_at: now,
      });
      if (appUserError) throw appUserError;
    }

    // Evita duplicar o vínculo na mesma empresa.
    const { data: link } = await db
      .from("tenant_users")
      .select("id")
      .eq("app_user_id", appUserId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (link) {
      return NextResponse.json({ ok: false, error: "Esse e-mail já faz parte da equipe." }, { status: 409 });
    }

    const { error: tuError } = await db.from("tenant_users").insert({
      tenant_id: ctx.tenantId,
      organization_id: ctx.organizationId,
      app_user_id: appUserId,
      role,
      department_id: departmentId,
      status: "active",
      invited_by: ctx.email,
      invited_at: now,
      joined_at: now,
      created_at: now,
      updated_at: now,
    });
    if (tuError) throw tuError;

    return NextResponse.json({ ok: true, member: { appUserId, email, tempPassword } });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao salvar membro" }, { status: 500 });
  }
}
