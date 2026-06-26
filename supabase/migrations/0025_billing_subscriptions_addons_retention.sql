-- 0025: billing_subscriptions — add-ons, cota de armazenamento e retenção de mensagens
--
-- Contexto:
--   A tabela billing_subscriptions já existe (criada via SQL Editor).
--   Esta migration adiciona as colunas necessárias para rastrear add-ons contratados,
--   cota de armazenamento derivada dos add-ons e política de retenção de mensagens por plano.
--   Também cria a função activate_paid_checkout_subscription para ser chamada
--   pelo painel de implantação ao provisionar um cliente que pagou pelo checkout.

-- ────────────────────────────────────────────────────────────────────────────────
-- 1. Novas colunas
-- ────────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS checkout_session_id    uuid         REFERENCES public.billing_checkout_sessions(id),
  ADD COLUMN IF NOT EXISTS addons                 jsonb        NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS storage_quota_gb       integer      NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS message_retention_days integer      NOT NULL DEFAULT 365;

CREATE INDEX IF NOT EXISTS billing_subscriptions_checkout_session_id_idx
  ON public.billing_subscriptions(checkout_session_id);

-- ────────────────────────────────────────────────────────────────────────────────
-- 2. RPC: activate_paid_checkout_subscription
--    Cria uma billing_subscriptions a partir de um checkout pago e provisionado.
--    Idempotente: se já existe uma subscription para o mesmo checkout, retorna ela.
-- ────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activate_paid_checkout_subscription(p_checkout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout          record;
  v_subscription_id   uuid;
  v_addons            jsonb;
  v_storage_gb        integer;
  v_retention_days    integer;
  v_period_end        timestamptz;
BEGIN
  -- Busca o checkout que foi pago e já tem tenant/org provisionados
  SELECT * INTO v_checkout
  FROM public.billing_checkout_sessions
  WHERE id = p_checkout_id
    AND status IN ('paid_pending_activation', 'active');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'checkout_not_found_or_wrong_status');
  END IF;

  IF v_checkout.tenant_id IS NULL OR v_checkout.organization_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tenant_not_provisioned_yet');
  END IF;

  -- Idempotência: retorna a subscription já existente para este checkout
  SELECT id INTO v_subscription_id
  FROM public.billing_subscriptions
  WHERE checkout_session_id = p_checkout_id;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'subscription_id', v_subscription_id, 'already_exists', true);
  END IF;

  -- Add-ons vêm em metadata.selectedAddons (array de {slug, name, price})
  v_addons := COALESCE(
    (v_checkout.metadata -> 'selectedAddons'),
    '[]'::jsonb
  );

  -- Cota de armazenamento base (5 GB) + add-on contratado
  v_storage_gb := 5;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_addons) AS a WHERE a->>'slug' = 'storage_100gb') THEN
    v_storage_gb := 105;
  ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_addons) AS a WHERE a->>'slug' = 'storage_50gb') THEN
    v_storage_gb := 55;
  ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_addons) AS a WHERE a->>'slug' = 'storage_10gb') THEN
    v_storage_gb := 15;
  END IF;

  -- Retenção de mensagens por plano
  v_retention_days := CASE v_checkout.plan_slug
    WHEN 'starter'      THEN 365
    WHEN 'professional' THEN 730
    WHEN 'business'     THEN 1095
    ELSE 365
  END;

  -- Fim do primeiro período de cobrança
  v_period_end := CASE v_checkout.billing_cycle
    WHEN 'annual' THEN now() + interval '1 year'
    ELSE now() + interval '1 month'
  END;

  -- Cria a subscription
  INSERT INTO public.billing_subscriptions (
    tenant_id,
    organization_id,
    checkout_session_id,
    plan_slug,
    billing_cycle,
    status,
    base_amount,
    setup_amount,
    extra_whatsapp_connections,
    extra_users,
    ai_addon_enabled,
    total_amount,
    currency,
    billing_provider,
    addons,
    storage_quota_gb,
    message_retention_days,
    started_at,
    current_period_start,
    current_period_end,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_checkout.tenant_id,
    v_checkout.organization_id,
    p_checkout_id,
    v_checkout.plan_slug,
    v_checkout.billing_cycle,
    'active',
    COALESCE(v_checkout.base_amount, 0),
    COALESCE(v_checkout.setup_amount, 0),
    COALESCE(v_checkout.extra_whatsapp_connections, 0),
    COALESCE(v_checkout.extra_users, 0),
    COALESCE(v_checkout.ai_addon_enabled, false),
    COALESCE(v_checkout.final_amount, v_checkout.total_amount, 0),
    'BRL',
    'asaas',
    v_addons,
    v_storage_gb,
    v_retention_days,
    now(),
    now(),
    v_period_end,
    jsonb_build_object(
      'checkout_session_id', p_checkout_id,
      'activated_via', 'admin_provision',
      'plan_name', COALESCE(v_checkout.metadata->>'planName', v_checkout.plan_slug)
    ),
    now(),
    now()
  ) RETURNING id INTO v_subscription_id;

  RETURN jsonb_build_object(
    'ok',                   true,
    'subscription_id',      v_subscription_id,
    'plan_slug',            v_checkout.plan_slug,
    'storage_quota_gb',     v_storage_gb,
    'message_retention_days', v_retention_days,
    'period_end',           v_period_end
  );
END;
$$;

COMMENT ON FUNCTION public.activate_paid_checkout_subscription(uuid) IS
  'Cria billing_subscriptions a partir de um checkout pago e provisionado. Idempotente por checkout_session_id.';
