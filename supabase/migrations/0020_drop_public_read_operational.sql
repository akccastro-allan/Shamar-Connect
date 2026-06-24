-- Marco 0 — Remover leitura pública indiscriminada (anon key).
--
-- ANTES: ~115 tabelas operacionais tinham policy `public_read_* USING (true)`,
-- permitindo que QUALQUER um com a anon key (pública, embarcada no frontend)
-- lesse TUDO: crm_contacts, whatsapp_messages, whatsapp_conversations,
-- tenant_users, app_users, finance_invoices, documents, audit_trail,
-- security_events, etc. Exposição crítica de dados (LGPD).
--
-- POR QUE É SEGURO REMOVER:
--   1. Toda leitura da aplicação passou a usar `service_role` (server-side,
--      escopada por tenant_id/organization_id via getRequiredAppContext).
--   2. `service_role` faz BYPASS de RLS — segue lendo/escrevendo normalmente.
--   3. As rotas de auth usam apenas Supabase Auth (auth.signIn / exchange),
--      que não depende de RLS de tabela.
--   4. O site público é estático (não lê o banco via anon).
--
-- NÃO destrói dados. NÃO altera as policies `service_all_*`.
-- Reversível: recriar `create policy public_read_x on x for select using (true)`.

do $$
declare
  pol record;
  dropped int := 0;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname like 'public_read%'
  loop
    execute format('drop policy if exists %I on %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
    dropped := dropped + 1;
  end loop;
  raise notice 'Marco 0: % policies public_read removidas.', dropped;
end $$;
