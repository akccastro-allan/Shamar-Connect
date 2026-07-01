-- Migration 0029: Corrige tipo de stock_available em catalog_items
-- boolean -> numeric(14,3) para representar quantidade disponível em estoque.
-- is_available (boolean) permanece para flag de disponibilidade geral.
--
-- Seguro: converte true→1, false→0 nos registros existentes.
-- Idempotente: verifica tipo atual antes de alterar.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'catalog_items'
      AND column_name  = 'stock_available'
      AND data_type    = 'boolean'
  ) THEN
    ALTER TABLE public.catalog_items
      ALTER COLUMN stock_available DROP DEFAULT,
      ALTER COLUMN stock_available TYPE numeric(14,3)
        USING CASE WHEN stock_available THEN 1 ELSE 0 END,
      ALTER COLUMN stock_available SET DEFAULT 0;
  END IF;
END $$;
