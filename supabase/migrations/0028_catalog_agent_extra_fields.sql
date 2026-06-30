-- Migration 0028: Colunas extras em catalog_items e integration_agents
-- Idempotente: usa ADD COLUMN IF NOT EXISTS.
-- Não destrói dados. Não altera colunas existentes.

-- catalog_items: campos de preço, disponibilidade e unidade
ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS promotional_price  numeric(12,2),
  ADD COLUMN IF NOT EXISTS cost_price         numeric(12,2),
  ADD COLUMN IF NOT EXISTS unit               text,
  ADD COLUMN IF NOT EXISTS stock_available    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_available       boolean NOT NULL DEFAULT true;

-- integration_agents: campos de metadados do host
ALTER TABLE public.integration_agents
  ADD COLUMN IF NOT EXISTS name              text,
  ADD COLUMN IF NOT EXISTS machine_name      text,
  ADD COLUMN IF NOT EXISTS operating_system  text,
  ADD COLUMN IF NOT EXISTS agent_version     text;

-- Índice para busca de agentes ativos por source
CREATE INDEX IF NOT EXISTS idx_integration_agents_source
  ON public.integration_agents(integration_source_id, status);

-- Índice extra para items disponíveis
CREATE INDEX IF NOT EXISTS idx_catalog_items_available
  ON public.catalog_items(organization_id, is_active, is_available)
  WHERE is_active = true AND is_available = true;
