import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { assertPlatformAdminApi } from "@/lib/features/api-guards";
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequiredAppContext();
    const admin = await assertPlatformAdminApi(context, "Acesso restrito a administradores da plataforma.");
    if (!admin.ok) return admin.response;

    const { id: checkoutId } = await params;
    const body = await request.json().catch(() => ({}));
    const sessions: string[] = Array.isArray(body?.sessions) ? body.sessions : [];

    const db = createSupabaseWriteClient();

    const { data: checkout, error: checkoutError } = await db
      .from("billing_checkout_sessions")
      .select("id, customer_name, customer_email, customer_document, plan_slug, billing_cycle, metadata, tenant_id, status")
      .eq("id", checkoutId)
      .eq("status", "paid_pending_activation")
      .maybeSingle();

    if (checkoutError || !checkout) {
      return NextResponse.json({ ok: false, error: "Checkout não encontrado ou já processado." }, { status: 404 });
    }

    // Se já foi provisionado (tenant_id preenchido), só ativa
    if (checkout.tenant_id) {
      await db
        .from("billing_checkout_sessions")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", checkoutId);
      return NextResponse.json({ ok: true, alreadyProvisioned: true, tenantId: checkout.tenant_id });
    }

    const meta = (checkout.metadata || {}) as Record<string, unknown>;
    const companyName = String(meta.companyName || checkout.customer_name || "Empresa").trim();
    const ownerName = checkout.customer_name || companyName;
    const ownerEmail = checkout.customer_email;

    if (!ownerEmail) {
      return NextResponse.json({ ok: false, error: "E-mail do cliente não encontrado no checkout." }, { status: 400 });
    }

    const validSessions = sessions.filter((s): s is AllowedSessionId =>
      ALLOWED_SESSION_IDS.includes(s as AllowedSessionId)
    );

    const tempPassword = generatePassword();
    const companySlug = slugify(companyName);
    const now = new Date().toISOString();

    // 1. Tenant
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

    if (tenantError || !tenant) throw tenantError ?? new Error("Falha ao criar tenant.");

    // 2. Organization
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

    if (orgError || !org) throw orgError ?? new Error("Falha ao criar organização.");

    // 3. Auth user
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: ownerName },
    });

    if (authError || !authData?.user) throw authError ?? new Error("Falha ao criar usuário.");
    const authUserId = authData.user.id;

    // 4. app_users
    await db.from("app_users").insert({
      id: authUserId,
      name: ownerName,
      email: ownerEmail,
      role: "owner",
      status: "active",
      created_at: now,
      updated_at: now,
    });

    // 5. tenant_users
    await db.from("tenant_users").insert({
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

    // 6. Channels (opcional)
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
      await db.from("channels").insert(channelRows);
    }

    // 7. Vincular checkout ao tenant/org e ativar assinatura via RPC
    await db
      .from("billing_checkout_sessions")
      .update({
        tenant_id: tenant.id,
        organization_id: org.id,
        updated_at: now,
      })
      .eq("id", checkoutId);

    const { data: rpcResult, error: rpcError } = await db.rpc("activate_paid_checkout_subscription", {
      p_checkout_id: checkoutId,
    });

    if (rpcError) throw rpcError;

    const subscriptionResult = rpcResult as Record<string, unknown> | null;

    if (!subscriptionResult?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            typeof subscriptionResult?.error === "string"
              ? subscriptionResult.error
              : "Falha ao ativar assinatura do checkout.",
          tenantId: tenant.id,
          organizationId: org.id,
          authUserId,
        },
        { status: 500 },
      );
    }

    await db
      .from("billing_checkout_sessions")
      .update({
        status: "active",
        updated_at: now,
      })
      .eq("id", checkoutId);

    return NextResponse.json({
      ok: true,
      tenantId: tenant.id,
      organizationId: org.id,
      authUserId,
      email: ownerEmail,
      tempPassword,
      sessions: validSessions,
      subscription: subscriptionResult,
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
