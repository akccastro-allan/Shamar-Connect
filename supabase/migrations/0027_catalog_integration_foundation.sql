-- Migration 0027: Fundação do catálogo e integração com Shamar Agent
-- Idempotente: usa CREATE TABLE IF NOT EXISTS e CREATE INDEX IF NOT EXISTS.
-- Não destrói dados existentes.

-- 1. integration_sources: origens de integração (CPlus, ERP etc.)
CREATE TABLE IF NOT EXISTS public.integration_sources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id),
  source_type       text NOT NULL,  -- ex: 'cplus', 'bling', 'omie'
  name              text NOT NULL,
  status            text NOT NULL DEFAULT 'active',  -- active | inactive
  credentials       jsonb,          -- armazenado encriptado quando necessário
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 2. integration_agents: instâncias do Shamar Agent autorizadas
CREATE TABLE IF NOT EXISTS public.integration_agents (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES public.tenants(id),
  organization_id         uuid NOT NULL REFERENCES public.organizations(id),
  integration_source_id   uuid NOT NULL REFERENCES public.integration_sources(id),
  name                    text NOT NULL,
  agent_token_hash        text NOT NULL UNIQUE,
  status                  text NOT NULL DEFAULT 'active',  -- pending | active | revoked
  last_seen_at            timestamptz,
  last_ip                 text,
  metadata                jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- 3. integration_sync_runs: histórico de sincronizações
CREATE TABLE IF NOT EXISTS public.integration_sync_runs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES public.tenants(id),
  organization_id         uuid NOT NULL REFERENCES public.organizations(id),
  integration_source_id   uuid NOT NULL REFERENCES public.integration_sources(id),
  agent_id                uuid NOT NULL REFERENCES public.integration_agents(id),
  sync_type               text NOT NULL DEFAULT 'catalog',
  status                  text NOT NULL DEFAULT 'running',  -- running | success | partial_success | failed
  started_at              timestamptz NOT NULL DEFAULT now(),
  finished_at             timestamptz,
  items_received          integer NOT NULL DEFAULT 0,
  items_created           integer NOT NULL DEFAULT 0,
  items_updated           integer NOT NULL DEFAULT 0,
  items_failed            integer NOT NULL DEFAULT 0,
  error_message           text,
  metadata                jsonb
);

-- 4. integration_sync_logs: logs individuais de cada sync
CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES public.tenants(id),
  organization_id         uuid NOT NULL REFERENCES public.organizations(id),
  integration_source_id   uuid NOT NULL REFERENCES public.integration_sources(id),
  agent_id                uuid REFERENCES public.integration_agents(id),
  sync_run_id             uuid REFERENCES public.integration_sync_runs(id),
  level                   text NOT NULL DEFAULT 'info',  -- info | warning | error
  message                 text NOT NULL,
  context                 jsonb,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- 5. catalog_categories: categorias de produto sincronizadas
CREATE TABLE IF NOT EXISTS public.catalog_categories (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id),
  external_source   text NOT NULL,
  external_id       text NOT NULL,
  name              text NOT NULL,
  slug              text NOT NULL,
  parent_id         uuid REFERENCES public.catalog_categories(id),
  status            text NOT NULL DEFAULT 'active',
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, external_source, external_id)
);

-- 6. catalog_items: itens do catálogo sincronizados
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id),
  category_id       uuid REFERENCES public.catalog_categories(id),
  external_source   text NOT NULL,
  external_id       text NOT NULL,
  sku               text,
  barcode           text,
  name              text NOT NULL,
  description       text,
  brand             text,
  item_type         text NOT NULL DEFAULT 'product',  -- product | service
  status            text NOT NULL DEFAULT 'active',
  currency          text NOT NULL DEFAULT 'BRL',
  price             numeric(12,2),
  stock_quantity    numeric(12,3),
  image_url         text,
  source_updated_at timestamptz,
  last_synced_at    timestamptz,
  raw_payload       jsonb,
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, external_source, external_id)
);

-- Índices para performance de busca
CREATE INDEX IF NOT EXISTS idx_catalog_items_org     ON public.catalog_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant  ON public.catalog_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sku     ON public.catalog_items(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catalog_items_name    ON public.catalog_items USING gin(to_tsvector('portuguese', name));
CREATE INDEX IF NOT EXISTS idx_catalog_items_synced  ON public.catalog_items(last_synced_at);

CREATE INDEX IF NOT EXISTS idx_catalog_categories_org ON public.catalog_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_agents_hash ON public.integration_agents(agent_token_hash);
CREATE INDEX IF NOT EXISTS idx_integration_sync_runs_org ON public.integration_sync_runs(organization_id, started_at DESC);

-- RLS: apenas service_role acessa (sem public_read para dados comerciais)
ALTER TABLE public.integration_sources     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_agents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items           ENABLE ROW LEVEL SECURITY;

-- service_role tem acesso total (necessário para as API routes server-side)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integration_sources' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.integration_sources TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integration_agents' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.integration_agents TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integration_sync_runs' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.integration_sync_runs TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integration_sync_logs' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.integration_sync_logs TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'catalog_categories' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.catalog_categories TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'catalog_items' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.catalog_items TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
