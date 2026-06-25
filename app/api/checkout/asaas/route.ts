import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const ASAAS_API_BASE_URL = process.env.ASAAS_API_BASE_URL || "https://api-sandbox.asaas.com/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";

type PaymentMethod = "pix" | "credit_card" | "boleto";

type CheckoutInput = {
  planSlug?: string;
  billingCycle?: "monthly" | "annual";
  paymentMethod?: PaymentMethod;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerDocument?: string;
  companyName?: string;
  extraWhatsappConnections?: number;
  extraUsers?: number;
  aiAddonEnabled?: boolean;
};

const ASAAS_BILLING_TYPE: Record<PaymentMethod, string> = {
  pix: "PIX",
  credit_card: "CREDIT_CARD",
  boleto: "BOLETO",
};

function onlyDigits(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePlanSlug(value?: string) {
  const slug = String(value || "").trim().toLowerCase();
  return ["starter", "professional", "business"].includes(slug) ? slug : "";
}

function normalizePaymentMethod(value?: string): PaymentMethod {
  if (value === "credit_card" || value === "boleto") return value;
  return "pix";
}

function normalizePositiveInteger(value: unknown) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Math.round(parsed * 100) / 100;
}

async function asaasRequest(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${ASAAS_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      access_token: ASAAS_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof data?.errors?.[0]?.description === "string"
      ? data.errors[0].description
      : "Falha na comunicação com o Asaas.";
    throw new Error(message);
  }

  return data;
}

export async function POST(request: NextRequest) {
  if (!ASAAS_API_KEY) {
    return NextResponse.json({ ok: false, error: "Checkout indisponível: Asaas não configurado." }, { status: 503 });
  }

  let input: CheckoutInput;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dados inválidos para checkout." }, { status: 400 });
  }

  const planSlug = normalizePlanSlug(input.planSlug);
  const billingCycle = input.billingCycle === "annual" ? "annual" : "monthly";
  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  const customerName = String(input.customerName || "").trim();
  const customerEmail = String(input.customerEmail || "").trim().toLowerCase();
  const customerPhone = onlyDigits(input.customerPhone);
  const customerDocument = onlyDigits(input.customerDocument);
  const companyName = String(input.companyName || input.customerName || "").trim();
  const extraWhatsappConnections = normalizePositiveInteger(input.extraWhatsappConnections);
  const extraUsers = normalizePositiveInteger(input.extraUsers);
  const aiAddonEnabled = Boolean(input.aiAddonEnabled);

  if (!planSlug) {
    return NextResponse.json({ ok: false, error: "Plano inválido." }, { status: 400 });
  }

  if (!customerName || !customerEmail || !customerDocument) {
    return NextResponse.json(
      { ok: false, error: "Informe nome, e-mail e CPF/CNPJ para gerar o checkout." },
      { status: 400 },
    );
  }

  const db = createSupabaseWriteClient();

  const [planResult, methodResult] = await Promise.all([
    db.from("billing_plan_price_rules").select("*").eq("plan_slug", planSlug).eq("is_active", true).maybeSingle(),
    db.from("billing_payment_method_rules").select("*").eq("payment_method", paymentMethod).eq("enabled", true).maybeSingle(),
  ]);

  if (planResult.error || !planResult.data) {
    return NextResponse.json({ ok: false, error: "Plano não encontrado." }, { status: 404 });
  }

  if (methodResult.error || !methodResult.data) {
    return NextResponse.json({ ok: false, error: "Método de pagamento indisponível." }, { status: 400 });
  }

  const plan = planResult.data;
  const methodRule = methodResult.data;

  const baseAmount = billingCycle === "annual" ? money(plan.annual_price || plan.monthly_price * 10) : money(plan.monthly_price);
  const setupAmount = money(plan.setup_fee);
  const extraWhatsappAmount = money(extraWhatsappConnections * Number(plan.extra_whatsapp_price || 0));
  const extraUsersAmount = money(extraUsers * Number(plan.extra_user_price || 0));
  const aiAddonAmount = aiAddonEnabled ? money(plan.ai_addon_price) : 0;
  const totalAmount = money(baseAmount + setupAmount + extraWhatsappAmount + extraUsersAmount + aiAddonAmount);

  // Fee calculation: fixed (cents) + percentage of total
  const fixedFee = money(methodRule.fixed_fee_cents / 100);
  const percentageFee = money(totalAmount * Number(methodRule.percentage_fee || 0));
  const paymentMethodFeeCents = Math.round((fixedFee + percentageFee) * 100);
  const finalAmount = money(totalAmount + fixedFee + percentageFee);

  const { data: checkoutSession, error: sessionError } = await db
    .from("billing_checkout_sessions")
    .insert({
      plan_slug: planSlug,
      billing_cycle: billingCycle,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_document: customerDocument,
      base_amount: baseAmount,
      setup_amount: setupAmount,
      extra_whatsapp_connections: extraWhatsappConnections,
      extra_users: extraUsers,
      ai_addon_enabled: aiAddonEnabled,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_method_fee_cents: paymentMethodFeeCents,
      final_amount: finalAmount,
      currency: "BRL",
      billing_provider: "asaas",
      status: "pending",
      metadata: {
        companyName,
        extraWhatsappAmount,
        extraUsersAmount,
        aiAddonAmount,
        planName: plan.plan_name,
      },
    })
    .select("id")
    .single();

  if (sessionError || !checkoutSession) {
    return NextResponse.json({ ok: false, error: "Falha ao criar sessão de checkout." }, { status: 500 });
  }

  try {
    const customer = await asaasRequest("/customers", {
      name: customerName,
      cpfCnpj: customerDocument,
      email: customerEmail,
      mobilePhone: customerPhone || undefined,
      externalReference: `shamar_checkout_${checkoutSession.id}`,
      notificationDisabled: false,
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const payment = await asaasRequest("/payments", {
      customer: customer.id,
      billingType: ASAAS_BILLING_TYPE[paymentMethod],
      value: finalAmount,
      dueDate: dueDate.toISOString().slice(0, 10),
      description: `ShamarConnect ${plan.plan_name} - ${billingCycle === "annual" ? "anual" : "mensal"}`,
      externalReference: `shamar_checkout_${checkoutSession.id}`,
    });

    const paymentUrl = payment.invoiceUrl || payment.bankSlipUrl || payment.transactionReceiptUrl || null;

    await db
      .from("billing_checkout_sessions")
      .update({
        status: "created",
        provider_customer_id: customer.id,
        provider_payment_id: payment.id,
        payment_url: paymentUrl,
        raw_payload: { customer, payment },
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkoutSession.id);

    return NextResponse.json({
      ok: true,
      checkoutId: checkoutSession.id,
      provider: "asaas",
      paymentMethod,
      paymentId: payment.id,
      paymentUrl,
      baseAmount: totalAmount,
      feeCents: paymentMethodFeeCents,
      finalAmount,
    });
  } catch (error) {
    await db
      .from("billing_checkout_sessions")
      .update({
        status: "failed",
        raw_payload: { error: error instanceof Error ? error.message : "Erro desconhecido" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkoutSession.id);

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao criar checkout." },
      { status: 500 },
    );
  }
}
