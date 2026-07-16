-- Identifica o tenant da plataforma diretamente no banco.
-- Elimina qualquer hardcode de tenant_id no código.
-- Só um tenant pode ter is_platform = true (constraint única parcial).

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_platform boolean NOT NULL DEFAULT false;

UPDATE tenants SET is_platform = true WHERE slug = 'shamar-connect';

CREATE UNIQUE INDEX IF NOT EXISTS tenants_single_platform_idx
  ON tenants (is_platform) WHERE is_platform = true;
