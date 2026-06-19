# Instagram DM Integration — Roadmap oficial

## Status atual
Em preparação. Não conectado.

A integração deve ser feita **exclusivamente via Meta Messaging API oficial**.
Nenhuma abordagem não-oficial será implementada (sem scraping, sem automação de browser, sem senha de Instagram).

---

## Caminho oficial

### 1. Conta Instagram Professional
O perfil precisa ser uma **Conta Profissional** (Business ou Creator) — não conta pessoal.

### 2. Meta App
- Criar (ou usar existente) um **Meta App** em [developers.facebook.com](https://developers.facebook.com)
- Tipo: **Business**
- Conectar o Instagram Professional Account ao app

### 3. Permissões necessárias
| Permissão | Descrição |
|-----------|-----------|
| `instagram_basic` | Leitura de perfil |
| `instagram_manage_messages` | Leitura e envio de DMs |
| `pages_manage_metadata` | Necessário para webhooks |

Essas permissões requerem **revisão de app pela Meta** antes de uso em produção.
Em modo Desenvolvimento, só funciona para usuários adicionados como testers.

### 4. Instagram Messaging API
- Endpoint: `POST https://graph.facebook.com/v19.0/me/messages`
- Requer Page Access Token com permissão `instagram_manage_messages`
- Mensagens chegam via **Webhooks** (`messages` e `messaging_seen`)

### 5. Webhook
Registrar em Meta Business > App > Webhooks:
```
https://seu-dominio.com/api/instagram/webhook
```
Campos a assinar: `messages`, `messaging_seen`

### 6. Fluxo de integração planejado
```
1. Responsável envia DM no Instagram
2. Meta → POST /api/instagram/webhook
3. Salvar provider_event (provider = instagram_dm)
4. Upsert crm_contacts (instagram_user_id)
5. Upsert whatsapp_conversations OU nova tabela social_conversations
6. DM aparece em /social-inbox
7. Atendente responde manualmente
```

### 7. Limitações da API
- Só funciona com contas verificadas (Business/Creator)
- Limite de janela de 24h para mensagens iniciadas pelo negócio sem template
- Instagram não suporta templates como o WhatsApp Cloud API
- Taxa de aprovação de permissões pode demorar semanas

---

## O que NÃO implementar
- Scraping de DMs (viola ToS Meta + risco de ban)
- Automação de browser (Puppeteer, Playwright no Instagram)
- Pedir senha do Instagram para o usuário
- Usar tokens de usuário pessoal em produção

---

## Próximos passos para ativar
1. Criar Meta App com tipo Business
2. Conectar Instagram Professional Account
3. Solicitar permissões `instagram_manage_messages`
4. Aguardar aprovação da Meta
5. Configurar webhook `/api/instagram/webhook`
6. Implementar handler e integrar ao /social-inbox

Estimativa: 1-3 semanas após submissão à Meta.
