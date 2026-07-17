insert into public.whatsapp_connections (session_id, name, status)
values
  ('hall-main', 'Hall Donous', 'disconnected'),
  ('lips-main', 'Lips', 'disconnected')
on conflict (session_id) do nothing;
