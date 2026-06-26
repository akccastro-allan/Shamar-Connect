import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { ALLOWED_SESSION_IDS, type AllowedSessionId } from "@/lib/providers/whatsapp-web-gateway-client";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();

    if (context.role !== "owner" && context.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const body = await request.json();
    const ownerName = String(body?.ownerName || "").trim();
    const ownerEmail = String(body?.ownerEmail || "").trim().toLowerCase();
    const companyName = String(body?.companyName || "").trim();
    const sessions: string[] = Array.isArray(body?.sessions) ? body.sessions : [];
    const tempPassword = String(body?.tempPassword || "").trim() || generatePassword();
    const checkoutSessionId = body?.checkoutSessionId ? String(body.checkoutSessionId).trim() : null;

    if (!ownerName) return NextResponse.json({ ok: false, error: "Nome do responsável é obrigatório." }, { status: 400 });
    if (!ownerEmail || !ownerEmail.includes("@")) return NextResponse.json({ ok: false, error: "E-mail inválido." }, { status: 400 });
    if (!companyName) return NextResponse.json({ ok: false, error: "Nome da empresa é obrigatório." }, { status: 400 });

    const validSessions = sessions.filter((s): s is AllowedSessionId =>
      ALLOWED_SESSION_IDS.includes(s as AllowedSessionId)
    );

    const db = createSupabaseWriteClient();
    const companySlug = slugify(companyName);
    const now = new Date().toISOString();

    // 1. Create tenant
    const { data: tenant, error: tenantError } = await db
      .from("tenants")
      .insert({
        name: companyName,
        slug: `${companySlug}-${Date.now()}`,
        owner_name: ownerName,
        owner_email: ownerEmail,
        status: "active",
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (tenantError) throw tenantError;

    // 2. Create organization
    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({
        tenant_id: tenant.id,
        name: companyName,
        slug: companySlug,
        status: "active",
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (orgError) throw orgError;

    // 3. Create Supabase Auth user
    const { data: authUser, error: authError } = await db.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: ownerName },
    });

    if (authError) throw authError;

    const authUserId = authUser.user.id;

    // 4. Create app_users row (id = Supabase Auth user id)
    const { error: appUserError } = await db
      .from("app_users")
      .insert({
        id: authUserId,
        name: ownerName,
        email: ownerEmail,
        role: "owner",
        status: "active",
        created_at: now,
        updated_at: now,
      });

    if (appUserError) throw appUserError;

    // 5. Create tenant_users row
    const { error: tenantUserError } = await db
      .from("tenant_users")
      .insert({
        tenant_id: tenant.id,
        organization_id: org.id,
        app_user_id: authUserId,
        role: "owner",
        status: "active",
        invited_by: context.email,
        invited_at: now,
        joined_at: now,
        created_at: now,
        updated_at: now,
      });

    if (tenantUserError) throw tenantUserError;

    // 6. Create channel rows for each selected session
    if (validSessions.length > 0) {
      const channelRows = validSessions.map((sessionId) => ({
        tenant_id: tenant.id,
        organization_id: org.id,
        name: sessionId.replace("-main", "").replace("-", " "),
        slug: sessionId,
        session_id: sessionId,
        active: true,
        created_at: now,
        updated_at: now,
      }));

      const { error: channelError } = await db.from("channels").insert(channelRows);
      if (channelError) throw channelError;
    }

    // 7. Activate subscription from checkout (when provisioned via checkout flow)
    let subscriptionResult: Record<string, unknown> | null = null;
    if (checkoutSessionId) {
      // Update checkout with tenant/org before calling RPC
      await db
        .from("billing_checkout_sessions")
        .update({ tenant_id: tenant.id, organization_id: org.id, updated_at: now })
        .eq("id", checkoutSessionId);

      const { data: rpcResult } = await db.rpc("activate_paid_checkout_subscription", {
        p_checkout_id: checkoutSessionId,
      });
      subscriptionResult = rpcResult as Record<string, unknown> | null;
    }

    return NextResponse.json({
      ok: true,
      client: {
        tenantId: tenant.id,
        organizationId: org.id,
        authUserId,
        email: ownerEmail,
        tempPassword,
        sessions: validSessions,
        subscription: subscriptionResult,
      },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha no provisionamento." },
      { status: 500 },
    );
  }
}
