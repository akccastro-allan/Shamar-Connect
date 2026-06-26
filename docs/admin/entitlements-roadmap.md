# Roadmap — Entitlements de plano e add-ons

O checkout e a implantação assistida já permitem vender e ativar clientes com controle humano.

A próxima etapa é transformar plano e add-ons contratados em permissões operacionais dentro da organização.

## Entrada de dados

Fonte principal:

```txt
billing_checkout_sessions
```

Campos relevantes:

- `plan_slug`
- `billing_cycle`
- `extra_whatsapp_connections`
- `extra_users`
- `metadata.selectedAddons`
- `tenant_id`
- `organization_id`
- `status`

## Entitlements sugeridos

Criar ou consolidar uma estrutura do tipo:

```txt
organization_entitlements
```

Campos sugeridos:

- `organization_id`
- `plan_slug`
- `billing_cycle`
- `max_users`
- `max_channels`
- `storage_quota_gb`
- `transcription_enabled`
- `transcription_minutes_quota`
- `call_recording_enabled`
- `call_recording_hours_quota`
- `agent_local_enabled`
- `agent_connectors_quota`
- `ai_assist_enabled`
- `active_addons`
- `billing_checkout_session_id`
- `created_at`
- `updated_at`

## Regras base sugeridas

Starter:

- 1 canal inicial
- até 2 usuários

Professional:

- múltiplos atendentes
- setores e filas
- funil comercial

Business:

- múltiplos canais
- permissões avançadas
- descontos em add-ons selecionados

## Add-ons atuais

- IA assistiva
- Transcrição Start
- Transcrição Volume
- Gravação 100h
- Gravação 500h
- Gravação 1.000h
- Armazenamento +10 GB
- Armazenamento +50 GB
- Armazenamento +100 GB
- Shamar Agent Local

## Critério de ativação

O ideal é aplicar entitlements quando:

```txt
billing_checkout_sessions.status = active
```

E houver:

```txt
tenant_id preenchido
organization_id preenchido
```

## Fora do escopo do PR atual

O PR de implantação assistida não precisa aplicar estes limites ainda. Ele prepara o cliente ativo para uma etapa posterior.
