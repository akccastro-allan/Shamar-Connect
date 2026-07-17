-- PENDENTE — NÃO APLICAR AUTOMATICAMENTE
--
-- Scheduler Production para sincronizacao WhatsApp.
-- Este SQL foi removido de supabase/migrations para nao ser executado por
-- branches Preview, ambientes novos ou Production sem homologacao explicita.
--
-- Pre-requisitos obrigatorios antes de criar uma nova migration com novo timestamp:
-- - endpoint Production homologado;
-- - INTERNAL_API_KEY em Production;
-- - URL oficial validada;
-- - Supabase Vault configurado;
-- - webhook e sync testados ponta a ponta;
-- - autorizacao explicita.
--
-- Nao reutilizar o timestamp 20260716082000.
-- Quando aprovado, criar uma migration nova com novo timestamp.

set search_path = public, pg_temp;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_whatsapp_sync_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  worker_url text;
  internal_key text;
begin
  select decrypted_secret into worker_url
  from vault.decrypted_secrets
  where name = 'shamar_connect_sync_worker_url'
  limit 1;

  select decrypted_secret into internal_key
  from vault.decrypted_secrets
  where name = 'shamar_connect_sync_internal_key'
  limit 1;

  if worker_url is null or internal_key is null then
    raise exception 'WhatsApp sync worker Vault secrets are not configured.';
  end if;

  perform net.http_post(
    url := worker_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-api-key', internal_key
    ),
    body := jsonb_build_object('maxRuns', 5),
    timeout_milliseconds := 25000
  );
end;
$$;

revoke all on function public.trigger_whatsapp_sync_worker() from public, anon, authenticated;
grant execute on function public.trigger_whatsapp_sync_worker() to service_role;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'whatsapp-sync-worker-every-minute') then
    perform cron.schedule(
      'whatsapp-sync-worker-every-minute',
      '* * * * *',
      'select public.trigger_whatsapp_sync_worker();'
    );
  end if;
end $$;
