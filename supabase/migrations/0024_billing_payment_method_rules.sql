-- billing_payment_method_rules
-- Regras configuráveis por método de pagamento: ordem, taxa, recomendação.
-- Não hardcodar tarifas de boleto no código — alterar aqui e a lógica lê do banco.

CREATE TABLE public.billing_payment_method_rules (
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
CREATE POLICY "service_role_all" ON public.billing_payment_method_rules
  TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.billing_payment_method_rules
  (payment_method, enabled, display_order, is_recommended, fixed_fee_cents, percentage_fee, description)
VALUES
  ('pix',         true, 1, true,  0,   0,      'Recomendado — confirmação mais rápida para iniciar sua implantação.'),
  ('credit_card', true, 2, false, 0,   0,      'Pague com cartão de crédito.'),
  ('boleto',      true, 3, false, 500, 0.0000, 'Boleto possui compensação mais lenta e pode incluir custo operacional adicional.');

-- Campos de método de pagamento em billing_checkout_sessions
ALTER TABLE public.billing_checkout_sessions
  ADD COLUMN IF NOT EXISTS payment_method        text,
  ADD COLUMN IF NOT EXISTS payment_method_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount          numeric(10,2);

-- Método capturado no webhook em finance_payments
ALTER TABLE public.finance_payments
  ADD COLUMN IF NOT EXISTS payment_method text;
