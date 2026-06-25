import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || "";

function isAuthorized(request: NextRequest) {
  if (!ASAAS_WEBHOOK_TOKEN) return false;
  const received =
    request.headers.get("asaas-access-token") ||
    request.headers.get("x-asaas-webhook-token") ||
    request.headers.get("x-webhook-token") ||
    "";
  return received === ASAAS_WEBHOOK_TOKEN;
}

function normalizePaymentStatus(eventName: string, paymentStatus?: string) {
  const event = eventName.toUpperCase();
  const status = String(paymentStatus || "").toUpperCase();

  if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event) || ["CONFIRMED", "RECEIVED"].includes(status)) return "paid";
  if (["PAYMENT_OVERDUE"].includes(event) || status === "OVERDUE") return "overdue";
  if (["PAYMENT_REFUNDED", "PAYMENT_REFUND_REQUESTED"].includes(event) || status === "REFUNDED") return "refunded";
  if (["PAYMENT_DELETED", "PAYMENT_CANCELED"].includes(event) || ["DELETED", "CANCELED", "CANCELLED"].includes(status)) return "cancelled";
  return "pending";
}

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

async function provisionAndActivate(db: ReturnType<typeof createSupabaseWriteClient>, checkoutId: string) {
  const { data: checkout, error: checkoutError } = await db
    .from("billing_checkout_sessions")
    .select("id, customer_name, customer_email, plan_slug, billing_cycle, metadata")
    .eq("id", checkoutId)
    .eq("status", "paid_pending_activation")
    .maybeSingle();

  if (checkoutError || !checkout) return { ok: false, error: "checkout_not_found_or_not_pending" };

  const companyName = (checkout.metadata as Record<string, string>)?.companyName || checkout.customer_name || "Empresa";
  const ownerName = checkout.customer_name || companyName;
  const ownerEmail = checkout.customer_email;

  if (!ownerEmail) return { ok: false, error: "checkout_missing_email" };

  const companySlug = slugify(companyName);
  const now = new Date().toISOString();
  const tempPassword = generatePassword();

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

  if (tenantError || !tenant) return { ok: false, error: `tenant_create_failed: ${tenantError?.message}` };

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

  if (orgError || !org) return { ok: false, error: `org_create_failed: ${orgError?.message}` };

  // 3. Create Supabase Auth user
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: ownerEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: ownerName },
  });

  if (authError || !authData?.user) return { ok: false, error: `auth_create_failed: ${authError?.message}` };

  const authUserId = authData.user.id;

  // 4. Create app_users
  await db.from("app_users").insert({
    id: authUserId,
    name: ownerName,
    email: ownerEmail,
    role: "owner",
    status: "active",
    created_at: now,
    updated_at: now,
  });

  // 5. Create tenant_users
  await db.from("tenant_users").insert({
    tenant_id: tenant.id,
    organization_id: org.id,
    app_user_id: authUserId,
    role: "owner",
    status: "active",
    invited_by: "checkout_auto_provision",
    invited_at: now,
    joined_at: now,
    created_at: now,
    updated_at: now,
  });

  // 6. Link checkout to new tenant/org
  await db
    .from("billing_checkout_sessions")
    .update({ tenant_id: tenant.id, organization_id: org.id, updated_at: now })
    .eq("id", checkoutId);

  // 7. Activate subscription via RPC
  const { data: rpcResult } = await db.rpc("activate_paid_checkout_subscription", {
    checkout_session_id: checkoutId,
  });

  // 8. Store credentials in checkout metadata for admin to retrieve
  await db
    .from("billing_checkout_sessions")
    .update({
      metadata: {
        companyName,
        tempPassword,
        authUserId,
        tenantId: tenant.id,
        organizationId: org.id,
        provisioned_at: now,
      },
      updated_at: now,
    })
    .eq("id", checkoutId);

  return {
    ok: true,
    tenantId: tenant.id,
    organizationId: org.id,
    authUserId,
    email: ownerEmail,
    tempPassword,
    rpcResult,
  };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
  }

  const db = createSupabaseWriteClient();
  const eventName = String(payload.event || payload.eventName || "unknown");
  const payment = (payload.payment || payload.data || payload.object || {}) as Record<string, unknown>;
  const paymentId = payment.id as string | undefined;
  const customerId = payment.customer as string | undefined;
  const externalReference = String(payment.externalReference || "");
  const checkoutId = externalReference.startsWith("shamar_checkout_")
    ? externalReference.replace("shamar_checkout_", "")
    : null;
  const normalizedStatus = normalizePaymentStatus(eventName, payment.status as string);

  if (checkoutId) {
    const update: Record<string, unknown> = {
      provider_payment_id: paymentId || null,
      provider_customer_id: customerId || null,
      raw_payload: payload,
      updated_at: new Date().toISOString(),
    };

    if (normalizedStatus === "paid") {
      update.status = "paid";
      update.paid_at = new Date().toISOString();
    }

    if (["cancelled", "refunded"].includes(normalizedStatus)) {
      update.status = "cancelled";
    }

    await db.from("billing_checkout_sessions").update(update).eq("id", checkoutId);
  }

  if (paymentId) {
    const { data: existing } = await db
      .from("finance_payments")
      .select("id")
      .eq("billing_provider", "asaas")
      .eq("provider_payment_id", paymentId)
      .maybeSingle();

    // Capture payment method from Asaas payload (billingType field)
    const asaasMethod = String(payment.billingType || "").toUpperCase();
    const paymentMethodFromAsaas =
      asaasMethod === "PIX" ? "pix"
      : asaasMethod === "CREDIT_CARD" ? "credit_card"
      : asaasMethod === "BOLETO" ? "boleto"
      : null;

    if (!existing) {
      await db.from("finance_payments").insert({
        amount: Number(payment.value || payment.netValue || 0),
        currency: "BRL",
        status: normalizedStatus,
        paid_at: normalizedStatus === "paid" ? new Date().toISOString() : null,
        confirmed_at: normalizedStatus === "paid" ? new Date().toISOString() : null,
        transaction_id: paymentId,
        external_reference: externalReference || null,
        gateway_name: "asaas",
        billing_provider: "asaas",
        provider_payment_id: paymentId,
        provider_customer_id: customerId || null,
        checkout_session_id: checkoutId,
        payment_method: paymentMethodFromAsaas,
        raw_payload: payload,
      });
    } else {
      await db
        .from("finance_payments")
        .update({
          status: normalizedStatus,
          paid_at: normalizedStatus === "paid" ? new Date().toISOString() : undefined,
          confirmed_at: normalizedStatus === "paid" ? new Date().toISOString() : undefined,
          payment_method: paymentMethodFromAsaas ?? undefined,
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
  }

  // Pagamento confirmado: marcar como aguardando implantação.
  // Ativação é manual — humano controla quando o cliente está pronto.
  if (checkoutId && normalizedStatus === "paid") {
    await db
      .from("billing_checkout_sessions")
      .update({ status: "paid_pending_activation", updated_at: new Date().toISOString() })
      .eq("id", checkoutId)
      .eq("status", "paid");
  }

  return NextResponse.json({
    ok: true,
    event: eventName,
    paymentId,
    checkoutId,
    status: normalizedStatus,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "asaas-webhook" });
}
