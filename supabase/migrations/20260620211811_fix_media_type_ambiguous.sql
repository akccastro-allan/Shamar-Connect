-- Corrige "column reference media_type is ambiguous" no processamento de
-- mensagens com mídia (foto/áudio/figurinha/documento).
--
-- A função declara variáveis locais (media_type, mime_type, file_name, media_url)
-- com o mesmo nome de colunas de whatsapp_media_files. No WHERE NOT EXISTS da
-- inserção em whatsapp_media_files, "media_type" cru ficava ambíguo entre a
-- variável e a coluna mf.media_type, abortando o evento.
--
-- A pragma #variable_conflict use_variable faz o PL/pgSQL resolver nomes crus
-- como variáveis (comportamento desejado aqui — colunas já são qualificadas
-- com alias: mf.media_type, m.id, c.external_chat_id, whatsapp_messages.has_media).

CREATE OR REPLACE FUNCTION public.process_pending_whatsapp_provider_events(max_events integer DEFAULT 100)
 RETURNS TABLE(processed_count integer, error_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
#variable_conflict use_variable
declare
  ev record;
  inner_payload jsonb;
  chat_id text;
  msg_id text;
  msg_body text;
  msg_from text;
  msg_to text;
  contact_name text;
  is_group boolean;
  conv_id uuid;
  msg_db_id uuid;
  msg_type text;
  media_type text;
  media_url text;
  mime_type text;
  file_name text;
  file_size bigint;
  has_media_payload boolean;
  latitude numeric;
  longitude numeric;
  shared_name text;
  shared_phone text;
  shared_email text;
  shared_company text;
  inserted_events integer := 0;
  failed_events integer := 0;
begin
  for ev in
    select *
    from public.provider_events
    where coalesce(processing_status, 'pending') = 'pending'
      and event in ('message.received', 'message_revoke', 'message.revoked', 'message.deleted')
    order by created_at asc
    limit max_events
  loop
    begin
      inner_payload := coalesce(ev.payload->'payload', ev.payload->'data', ev.payload->'message', ev.payload);

      if ev.event in ('message_revoke', 'message.revoked', 'message.deleted') then
        msg_id := coalesce(
          inner_payload->>'id',
          inner_payload->>'messageId',
          inner_payload->>'external_message_id',
          inner_payload->>'externalMessageId'
        );

        if msg_id is null or btrim(msg_id) = '' then
          update public.provider_events
          set processing_status = 'error',
              processing_error = 'Evento de mensagem deletada sem identificador da mensagem',
              processed_at = now(),
              processed_payload = inner_payload
          where id = ev.id;
          failed_events := failed_events + 1;
        else
          update public.whatsapp_messages
          set deleted_by_sender = true,
              deleted_at = coalesce(deleted_at, now()),
              revoked_payload = inner_payload
          where external_message_id = msg_id;

          update public.provider_events
          set processing_status = 'processed',
              processing_error = null,
              processed_at = now(),
              processed_payload = jsonb_build_object('external_message_id', msg_id, 'action', 'marked_deleted')
          where id = ev.id;
          inserted_events := inserted_events + 1;
        end if;
      else
        msg_id := coalesce(
          inner_payload->>'id',
          inner_payload->>'messageId',
          inner_payload->>'external_message_id',
          inner_payload->>'externalMessageId'
        );
        msg_from := inner_payload->>'from';
        msg_to := inner_payload->>'to';
        msg_body := coalesce(inner_payload->>'body', inner_payload->>'text', inner_payload->>'caption', '');
        contact_name := coalesce(inner_payload->>'contactName', inner_payload->>'name', inner_payload->>'pushName');
        is_group := coalesce(nullif(inner_payload->>'isGroup', '')::boolean, false);
        chat_id := coalesce(inner_payload->>'chatId', inner_payload->>'external_chat_id', inner_payload->>'externalChatId', msg_from, inner_payload->>'phone');
        msg_type := lower(coalesce(inner_payload->>'type', inner_payload->>'messageType', inner_payload->>'mediaType', 'text'));
        media_type := lower(coalesce(inner_payload->>'mediaType', inner_payload->>'media_type', msg_type, 'unknown'));
        media_url := coalesce(inner_payload->>'mediaUrl', inner_payload->>'media_url', inner_payload->>'fileUrl', inner_payload->>'url', inner_payload->'media'->>'url');
        mime_type := coalesce(inner_payload->>'mimeType', inner_payload->>'mime_type', inner_payload->'media'->>'mimeType', inner_payload->'media'->>'mimetype');
        file_name := coalesce(inner_payload->>'fileName', inner_payload->>'filename', inner_payload->>'file_name', inner_payload->'media'->>'fileName', inner_payload->'media'->>'filename');
        file_size := nullif(coalesce(inner_payload->>'fileSize', inner_payload->>'size', inner_payload->'media'->>'size'), '')::bigint;
        latitude := nullif(coalesce(inner_payload->>'latitude', inner_payload->>'lat', inner_payload->'location'->>'latitude', inner_payload->'location'->>'lat'), '')::numeric;
        longitude := nullif(coalesce(inner_payload->>'longitude', inner_payload->>'lng', inner_payload->>'lon', inner_payload->'location'->>'longitude', inner_payload->'location'->>'lng', inner_payload->'location'->>'lon'), '')::numeric;
        shared_name := coalesce(inner_payload->>'sharedName', inner_payload->>'displayName', inner_payload->>'vcardName', inner_payload->'contact'->>'name', inner_payload->'sharedContact'->>'name');
        shared_phone := coalesce(inner_payload->>'sharedPhone', inner_payload->>'phoneNumber', inner_payload->>'vcardPhone', inner_payload->'contact'->>'phone', inner_payload->'sharedContact'->>'phone');
        shared_email := coalesce(inner_payload->>'sharedEmail', inner_payload->'contact'->>'email', inner_payload->'sharedContact'->>'email');
        shared_company := coalesce(inner_payload->>'sharedCompany', inner_payload->'contact'->>'company', inner_payload->'sharedContact'->>'company');
        has_media_payload := coalesce(
          (inner_payload ? 'media')
          or (inner_payload ? 'mediaUrl')
          or (inner_payload ? 'media_url')
          or (inner_payload ? 'fileUrl')
          or (inner_payload ? 'url')
          or media_type in ('image', 'audio', 'video', 'document', 'sticker'),
          false
        );

        if latitude is not null and longitude is not null then
          media_type := 'location';
          msg_type := 'location';
          has_media_payload := true;
        elsif shared_name is not null or shared_phone is not null or shared_email is not null then
          media_type := 'contact';
          msg_type := 'contact';
          has_media_payload := true;
        elsif media_type not in ('image', 'audio', 'video', 'document', 'sticker', 'location', 'contact') then
          media_type := 'unknown';
        end if;

        if msg_id is null or btrim(msg_id) = '' or chat_id is null or btrim(chat_id) = '' then
          update public.provider_events
          set processing_status = 'error',
              processing_error = 'Evento de mensagem sem identificador ou conversa',
              processed_at = now(),
              processed_payload = inner_payload
          where id = ev.id;
          failed_events := failed_events + 1;
        else
          select c.id into conv_id
          from public.whatsapp_conversations c
          where c.provider = coalesce(ev.provider, inner_payload->>'provider', 'whatsapp_web')
            and c.external_chat_id = chat_id
            and c.organization_id is not distinct from ev.organization_id
            and c.tenant_id is not distinct from ev.tenant_id
          limit 1;

          if conv_id is null then
            insert into public.whatsapp_conversations (
              provider,
              external_chat_id,
              name,
              is_group,
              status,
              unread_count,
              last_message_at,
              organization_id,
              tenant_id,
              created_at,
              updated_at
            )
            values (
              coalesce(ev.provider, inner_payload->>'provider', 'whatsapp_web'),
              chat_id,
              nullif(contact_name, ''),
              is_group,
              'open',
              0,
              coalesce(to_timestamp(nullif(inner_payload->>'timestamp','')::double precision), ev.created_at, now()),
              ev.organization_id,
              ev.tenant_id,
              now(),
              now()
            )
            returning id into conv_id;
          end if;

          select m.id into msg_db_id
          from public.whatsapp_messages m
          where m.external_message_id = msg_id
          limit 1;

          if msg_db_id is null then
            insert into public.whatsapp_messages (
              provider,
              external_message_id,
              conversation_id,
              direction,
              from_id,
              to_id,
              body,
              message_type,
              raw_payload,
              created_at,
              has_media,
              media_count,
              media_summary,
              organization_id,
              tenant_id
            )
            values (
              coalesce(ev.provider, inner_payload->>'provider', 'whatsapp_web'),
              msg_id,
              conv_id,
              'inbound',
              msg_from,
              msg_to,
              msg_body,
              msg_type,
              inner_payload,
              coalesce(to_timestamp(nullif(inner_payload->>'timestamp','')::double precision), ev.created_at, now()),
              has_media_payload,
              case when has_media_payload then 1 else 0 end,
              case when has_media_payload then coalesce(media_type, mime_type, 'media') else null end,
              ev.organization_id,
              ev.tenant_id
            )
            returning id into msg_db_id;
          else
            update public.whatsapp_messages
            set conversation_id = coalesce(conversation_id, conv_id),
                has_media = whatsapp_messages.has_media or has_media_payload,
                media_count = greatest(coalesce(whatsapp_messages.media_count, 0), case when has_media_payload then 1 else 0 end),
                media_summary = coalesce(whatsapp_messages.media_summary, case when has_media_payload then coalesce(media_type, mime_type, 'media') else null end)
            where id = msg_db_id;
          end if;

          if has_media_payload and msg_db_id is not null then
            insert into public.whatsapp_media_files (
              provider,
              message_id,
              conversation_id,
              external_message_id,
              external_chat_id,
              direction,
              media_type,
              mime_type,
              file_name,
              file_size_bytes,
              public_url,
              local_url,
              caption,
              raw_payload,
              download_status,
              processing_status,
              organization_id,
              tenant_id
            )
            select
              coalesce(ev.provider, inner_payload->>'provider', 'whatsapp_web'),
              msg_db_id,
              conv_id,
              msg_id,
              chat_id,
              'inbound',
              media_type,
              mime_type,
              file_name,
              file_size,
              media_url,
              media_url,
              nullif(inner_payload->>'caption', ''),
              inner_payload,
              case when media_url is null or btrim(media_url) = '' then 'pending' else 'available' end,
              'pending',
              ev.organization_id,
              ev.tenant_id
            where not exists (
              select 1
              from public.whatsapp_media_files mf
              where mf.message_id = msg_db_id
                and mf.media_type = media_type
                and coalesce(mf.public_url, '') = coalesce(media_url, '')
            );
          end if;

          if latitude is not null and longitude is not null and msg_db_id is not null then
            insert into public.whatsapp_shared_locations (
              message_id,
              conversation_id,
              external_message_id,
              external_chat_id,
              latitude,
              longitude,
              address,
              name,
              url,
              raw_payload,
              organization_id,
              tenant_id
            )
            select
              msg_db_id,
              conv_id,
              msg_id,
              chat_id,
              latitude,
              longitude,
              coalesce(inner_payload->>'address', inner_payload->'location'->>'address'),
              coalesce(inner_payload->>'locationName', inner_payload->'location'->>'name'),
              coalesce(inner_payload->>'locationUrl', inner_payload->'location'->>'url'),
              inner_payload,
              ev.organization_id,
              ev.tenant_id
            where not exists (
              select 1 from public.whatsapp_shared_locations sl
              where sl.message_id = msg_db_id
            );
          end if;

          if (shared_name is not null or shared_phone is not null or shared_email is not null) and msg_db_id is not null then
            insert into public.whatsapp_shared_contacts (
              message_id,
              conversation_id,
              external_message_id,
              external_chat_id,
              shared_name,
              shared_phone,
              shared_email,
              shared_company,
              raw_payload,
              organization_id,
              tenant_id
            )
            select
              msg_db_id,
              conv_id,
              msg_id,
              chat_id,
              shared_name,
              shared_phone,
              shared_email,
              shared_company,
              inner_payload,
              ev.organization_id,
              ev.tenant_id
            where not exists (
              select 1 from public.whatsapp_shared_contacts sc
              where sc.message_id = msg_db_id
            );
          end if;

          update public.whatsapp_conversations
          set last_message_at = coalesce(to_timestamp(nullif(inner_payload->>'timestamp','')::double precision), ev.created_at, now()),
              updated_at = now(),
              name = coalesce(nullif(name, ''), nullif(contact_name, ''))
          where id = conv_id;

          update public.provider_events
          set processing_status = 'processed',
              processing_error = null,
              processed_at = now(),
              processed_payload = jsonb_build_object(
                'external_message_id', msg_id,
                'conversation_id', conv_id,
                'message_id', msg_db_id,
                'has_media', has_media_payload,
                'media_type', media_type
              )
          where id = ev.id;
          inserted_events := inserted_events + 1;
        end if;
      end if;
    exception when others then
      update public.provider_events
      set processing_status = 'error',
          processing_error = SQLERRM,
          processed_at = now(),
          processed_payload = coalesce(inner_payload, '{}'::jsonb)
      where id = ev.id;
      failed_events := failed_events + 1;
    end;
  end loop;

  processed_count := inserted_events;
  error_count := failed_events;
  return next;
end;
$function$;
