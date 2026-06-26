-- 0026: channels — adiciona flag de transcrição por canal
--
-- A coluna transcription_enabled controla se o add-on de transcrição de áudios
-- está ativo para um canal específico. Falso por padrão — owner/admin liga
-- via /settings/whatsapp quando o cliente contratar o add-on.

ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS transcription_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.channels.transcription_enabled IS
  'Habilita o add-on de transcrição de áudios para este canal. Controlado pelo admin.';
