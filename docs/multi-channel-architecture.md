# Multi-Channel Architecture

ShamarConnect opera como central única para múltiplas empresas e múltiplos números WhatsApp.

## Estrutura

### Tabela `channels`
Cada canal representa uma empresa + número WhatsApp.

| Campo | Descrição |
|-------|-----------|
| `id` | UUID primário |
| `tenant_id` | Tenant do sistema |
| `organization_id` | Organização dona do canal |
| `name` | Nome comercial ("Viciados em Trilhas") |
| `slug` | Chave curta ("viciados") |
| `session_id` | ID da sessão no gateway ("viciados-main") |
| `phone` | Número conectado (preenchido após conexão) |
| `color` | Cor de identificação visual |
| `active` | Canal ativo |

### Canais atuais

| Canal | Slug | Session ID | Cor |
|-------|------|-----------|-----|
| Hall Donous | hall | hall-main | — |
| Lips | lips | lips-main | — |
| Viciados em Trilhas | viciados | viciados-main | #16a34a |
| MK Shalom | mkshalom | mkshalom-main | #2563eb |
| Oriahfin | oriahfin | oriahfin-main | #7c3aed |
| Shamar Connect | shamar | shamar-main | #0d9488 |
| Shamar ERP | shamarerp | shamarerp-main | #ea580c |
| Shamar Kids | shamarkids | shamarkids-main | #ec4899 |

> Hall e Lips foram criados antes da tabela `channels`. Eles podem ser inseridos retroativamente quando necessário.

### `whatsapp_conversations.channel_id`
Campo `uuid null` referenciando `channels.id`. Nullable para compatibilidade retroativa com conversas existentes.

Quando uma nova mensagem chega via gateway, o sistema pode identificar o canal pelo `sessionId` do request e preencher o `channel_id` automaticamente.

## Pipeline de Vendas

### Tabela `pipeline_stages`
Etapas padrão (seed automático na migration):
1. Novo Lead
2. Contato Realizado
3. Orçamento Enviado
4. Negociação
5. Fechado
6. Perdido

### Tabela `pipeline_items`
Oportunidades de negócio. Cada item pertence a:
- Um `stage_id` (etapa atual)
- Um `contact_id` opcional (contato CRM)
- Um `channel_id` opcional (canal de origem)
- Um `conversation_id` opcional (conversa WhatsApp de origem)

## APIs

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/channels` | GET | Lista canais da organização |
| `/api/pipeline/stages` | GET | Lista etapas ativas |
| `/api/pipeline/items` | GET | Lista itens (filtros: stageId, channelId) |
| `/api/pipeline/items` | POST | Cria oportunidade |
| `/api/pipeline/items/[id]` | PUT | Move etapa / edita |
| `/api/pipeline/items/[id]` | DELETE | Remove |
| `/api/pipeline/summary` | GET | Contagens por etapa para dashboard |

## Telas

- `/operations` — Cards por sessão ativa + painel de todos os canais cadastrados
- `/pipeline` — Kanban de oportunidades com filtro por canal
- `/sales-dashboard` — Métricas por período e canal

## Gateway WhatsApp

O arquivo `lib/providers/whatsapp-web-gateway-client.ts` define `ALLOWED_SESSION_IDS`. Todos os 8 session IDs já estão na allowlist. Adicionar um novo canal = inserir registro em `channels` + garantir que o `session_id` está na allowlist.

## Regras de segurança (absolutas)

- Grupos nunca recebem resposta (automação ou IA)
- A IA supervisionada não é alterada por esta feature
- Todos os canais novos herdam as mesmas regras de automação safe
- Hall e Lips continuam funcionando sem alteração
