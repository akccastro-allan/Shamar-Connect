-- Migration 0030: Fila de jobs para automação do agente Lips
-- Idempotente: usa CREATE TABLE IF NOT EXISTS e CREATE INDEX IF NOT EXISTS
-- Sem dados sensíveis (keys/tokens)

-- ===========================================================================
-- agent_automation_jobs: fila de processamento de mensagens para automação
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.agent_automation_jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id            uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  conversation_id       uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id            uuid NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,

  -- Job lifecycle
  status                text NOT NULL DEFAULT 'pending',  -- pending | processing | done | error
  agent_type            text NOT NULL DEFAULT 'lips-auto',  -- lips-auto | future: other agents

  -- Detection results
  intent                text,  -- parts | stock | quote | generic | support
  intent_confidence     numeric(3,2),  -- 0.00 to 1.00
  extracted_data        jsonb,  -- { productName, vehicleModel, vehicleYear, etc. }

  -- Catalog lookup results
  catalog_matches_count integer,
  selected_item_id      uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  catalog_confidence    numeric(3,2),

  -- Response generation
  response_type         text,  -- found | needs_more_info | not_found
  response_text         text,

  -- Evolution API send status
  sent_to_evolution     boolean NOT NULL DEFAULT false,
  evolution_message_id  text,
  evolution_error       text,

  -- Outbound message saved to history
  outbound_message_id   uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,

  -- Error tracking
  error_message         text,
  error_code            text,
  error_context         jsonb,

  -- Timing
  started_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agent_automation_jobs_status
  ON public.agent_automation_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_automation_jobs_conversation
  ON public.agent_automation_jobs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_automation_jobs_org
  ON public.agent_automation_jobs(organization_id, created_at DESC);

-- ===========================================================================
-- agent_automation_cooldown: antiloop por conversa
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.agent_automation_cooldown (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id            uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,

  -- Última resposta automática nesta conversa
  last_automated_response_at timestamptz NOT NULL DEFAULT now(),
  last_response_type         text,  -- found | needs_more_info | not_found
  last_response_text         text,

  -- Para detectar repetição
  response_hash              text,  -- hash(response_type + product_name) para detecção de repetição

  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),

  UNIQUE(conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_automation_cooldown_org
  ON public.agent_automation_cooldown(organization_id);

-- ===========================================================================
-- RLS: apenas service_role acessa (dados de automação interno)
-- ===========================================================================
ALTER TABLE public.agent_automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_automation_cooldown ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_all_agent_automation_jobs" ON public.agent_automation_jobs;
CREATE POLICY "service_all_agent_automation_jobs" ON public.agent_automation_jobs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_all_agent_automation_cooldown" ON public.agent_automation_cooldown;
CREATE POLICY "service_all_agent_automation_cooldown" ON public.agent_automation_cooldown
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
