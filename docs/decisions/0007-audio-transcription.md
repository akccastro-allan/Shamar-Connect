# ADR 0007 — Áudio e transcrição como mensagem de primeira classe

- **Status:** aceito
- **Data:** 2026-06-24
- **Contexto do produto:** decisão nova, tomada por necessidade real das centrais de atendimento. Não fazia parte do escopo anterior.

## Contexto

Clientes mandam muito áudio, mas nem todo atendente pode ouvir naquele momento — clínica, loja, oficina, igreja, recepção. O atendente precisa **ler** o conteúdo do áudio sem necessariamente escutar na hora.

## Decisão

Áudio passa a ser **tipo de mensagem de primeira classe** no Shamar Connect. Suporte a:
1. receber áudio;
2. armazenar o áudio original;
3. tocar o áudio na conversa;
4. transcrever automaticamente;
5. mostrar a transcrição ao atendente;
6. reprocessar a transcrição;
7. (futuro) enviar áudio.

## Princípios (regras de arquitetura)

- **Áudio é dado de primeira classe** — modelado em `message_media`, não improvisado.
- **Transcrição é apoio ao atendente**, não verdade absoluta — **pode errar**.
- **O áudio original é sempre preservado** (a transcrição nunca o substitui).
- **Não transcrever dentro do webhook** — o webhook só registra a mídia; download e transcrição rodam em **job/background** (`transcription_jobs`).
- **Signed URL gerada pelo backend** para tocar o áudio. **Nunca expor `storage_path`** nem o bucket diretamente ao cliente.
- **Bucket privado** (`shamar-message-media`, `public=false`). Sem policies públicas.
- **Áudio e transcrição são dados sensíveis** (clínica/finanças) — tratar como tal: acesso só via service_role escopado por **tenant/org/channel**.
- **Respeitar tenant/org/channel** em toda leitura/escrita (herda o channel-bound routing do Marco 1).
- **No MVP, a transcrição NÃO alimenta resposta automática** — é só leitura para o humano.

## Modelo de dados (migration `0023`)

- `message_media` — mídia original: provider, ids externos, `storage_bucket`/`storage_path`, `download_status`, hash, duração, mime, tamanho.
- `message_transcriptions` — texto, status, idioma, confiança, erro; única por `(media_id, provider)` (reprocessar atualiza).
- `transcription_jobs` — fila com `status/priority/scheduled_at`, retry (`attempt_count`/`max_attempts`), lock (`locked_at`/`locked_by`), 1 job ativo por mídia.
- `whatsapp_messages` ganha campos denormalizados (`has_media`, `media_*`, `transcription_*`) para a UI listar rápido sem joins.
- RLS ativa nas três tabelas, **sem policies** (somente service_role).

## UX (linguagem humana — ver `docs/design/UX_PRINCIPLES.md`)

Na conversa, simples:

> 🎧 **Áudio recebido — 0:38**  [Ouvir] [Ver transcrição]

Status traduzidos (sem termo técnico):
- **Transcrevendo…**
- **Transcrição disponível**
- **Falha ao transcrever** (com opção de reprocessar)

Aviso fixo na transcrição:

> *Transcrição automática. Confira o áudio em caso de dúvida.*

## Consequências

- Atendente lê o áudio sem fone; ganho real de operação.
- Custo de transcrição (OpenAI) por áudio — controlado por fila/prioridade.
- Transcrição imperfeita é aceitável porque o original fica preservado e acessível.

## Ordem de implementação (Marco 1.5)

1. versionar a migration (`0023`) ✅
2. este ADR ✅
3. player com signed URL (backend gera URL temporária)
4. recebimento/registro de mídia no webhook (só registra; não baixa)
5. job de download (webhook → storage)
6. job de transcrição (OpenAI; fila `transcription_jobs`)
7. exibir transcrição na conversa
8. botão de reprocessar

> Marco 1.5 é separado do Marco 1 para não atrapalhar o channel-bound routing.
