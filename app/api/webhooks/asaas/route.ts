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

  if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event) || ["CONFIRMED", "RECEIVED"].includes(status)) {
    return "paid";
  }

  if (["PAYMENT_OVERDUE"].includes(event) || status === "OVERDUE") {
    return "overdue";
  }

  if (["PAYMENT_REFUNDED", "PAYMENT_REFUND_REQUESTED"].includes(event) || status === "REFUNDED") {
    return "refunded";
  }

  if (["PAYMENT_DELETED", "PAYMENT_CANCELED"].includes(event) || ["DELETED", "CANCELED", "CANCELLED"].includes(status)) {
    return "cancelled";
  }

  return "pending";
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  let payload: Record<string, any>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
  }

  const db = createSupabaseWriteClient();
  const eventName = String(payload.event || payload.eventName || "unknown");
  const payment = payload.payment || payload.data || payload.object || {};
  const paymentId = payment.id || payload.paymentId;
  const customerId = payment.customer;
  const externalReference = String(payment.externalReference || "");
  const checkoutId = externalReference.startsWith("shamar_checkout_")
    ? externalReference.replace("shamar_checkout_", "")
    : null;
  const normalizedStatus = normalizePaymentStatus(eventName, payment.status);

  if (checkoutId) {
    const update: Record<string, any> = {
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

    await db
      .from("billing_checkout_sessions")
      .update(update)
      .eq("id", checkoutId);
  }

  if (paymentId) {
    const { data: existing } = await db
      .from("finance_payments")
      .select("id")
      .eq("billing_provider", "asaas")
      .eq("provider_payment_id", paymentId)
      .maybeSingle();

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
        raw_payload: payload,
      });
    } else {
      await db
        .from("finance_payments")
        .update({
          status: normalizedStatus,
          paid_at: normalizedStatus === "paid" ? new Date().toISOString() : undefined,
          confirmed_at: normalizedStatus === "paid" ? new Date().toISOString() : undefined,
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
  }

  if (checkoutId && normalizedStatus === "paid") {
    await db.rpc("activate_paid_checkout_subscription", {
      checkout_session_id: checkoutId,
    });
  }

  return NextResponse.json({ ok: true, event: eventName, paymentId, checkoutId, status: normalizedStatus });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "asaas-webhook" });
}
