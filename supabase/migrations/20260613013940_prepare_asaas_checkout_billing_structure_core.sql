-- billing_payment_method_rules
-- Regras configuráveis por método de pagamento: ordem, taxa, recomendação.
-- Não hardcodar tarifas de boleto no código — alterar aqui e a lógica lê do banco.

CREATE TABLE IF NOT EXISTS public.billing_payment_method_rules (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_method text      NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
  enabled      boolean     NOT NULL DEFAULT true,
  display_order integer    NOT NULL DEFAULT 99,
  is_recommended boolean   NOT NULL DEFAULT false,
  fixed_fee_cents integer  NOT NULL DEFAULT 0,   -- centavos adicionados ao valor base
  percentage_fee numeric(6,4) NOT NULL DEFAULT 0, -- ex: 0.0300 = 3%
  description  text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_method)
);

ALTER TABLE public.billing_payment_method_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.billing_payment_method_rules;
CREATE POLICY "service_role_all" ON public.billing_payment_method_rules
  TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.billing_payment_method_rules
  (payment_method, enabled, display_order, is_recommended, fixed_fee_cents, percentage_fee, description)
VALUES
  ('pix',         true, 1, true,  0,   0,      'Recomendado — confirmação mais rápida para iniciar sua implantação.'),
  ('credit_card', true, 2, false, 0,   0,      'Pague com cartão de crédito.'),
  ('boleto',      true, 3, false, 500, 0.0000, 'Boleto possui compensação mais lenta e pode incluir custo operacional adicional.')
ON CONFLICT (payment_method) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.billing_checkout_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  plan_slug text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_document text,
  base_amount numeric(10,2) NOT NULL DEFAULT 0,
  setup_amount numeric(10,2) NOT NULL DEFAULT 0,
  extra_whatsapp_connections integer NOT NULL DEFAULT 0,
  extra_users integer NOT NULL DEFAULT 0,
  ai_addon_enabled boolean NOT NULL DEFAULT false,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  billing_provider text,
  provider_customer_id text,
  provider_payment_id text,
  payment_url text,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_checkout_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.billing_checkout_sessions FROM public, anon, authenticated;
GRANT ALL ON TABLE public.billing_checkout_sessions TO service_role;

DROP POLICY IF EXISTS "service_all_billing_checkout_sessions" ON public.billing_checkout_sessions;
CREATE POLICY "service_all_billing_checkout_sessions" ON public.billing_checkout_sessions
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Campos de método de pagamento em billing_checkout_sessions
ALTER TABLE public.billing_checkout_sessions
  ADD COLUMN IF NOT EXISTS payment_method        text,
  ADD COLUMN IF NOT EXISTS payment_method_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount          numeric(10,2);

-- Método capturado no webhook em finance_payments
CREATE TABLE IF NOT EXISTS public.finance_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  confirmed_at timestamptz,
  transaction_id text,
  external_reference text,
  gateway_name text,
  billing_provider text,
  provider_payment_id text,
  provider_customer_id text,
  checkout_session_id uuid REFERENCES public.billing_checkout_sessions(id) ON DELETE SET NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.finance_payments FROM public, anon, authenticated;
GRANT ALL ON TABLE public.finance_payments TO service_role;

DROP POLICY IF EXISTS "service_all_finance_payments" ON public.finance_payments;
CREATE POLICY "service_all_finance_payments" ON public.finance_payments
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.finance_payments
  ADD COLUMN IF NOT EXISTS payment_method text;
