# WhatsApp Commercial Readiness

Data: 2026-07-11

Status: validação técnica local aprovada; pendente alinhamento de secret OpenWA em produção e teste real ponta a ponta no canal Lips.

## Escopo Auditado

- Release comercial WhatsApp-only.
- APIs de WhatsApp Web, OpenWA, Evolution, Meta/Cloud e rotas legadas relacionadas.
- Isolamento por `tenant_id`, `organization_id`, `channel_id` e posse de `session_id`.
- Exposição de recursos internos/futuros fora do produto comercial.

## Correções Aplicadas

- Rotas WhatsApp Web sensíveis agora exigem usuário autenticado e sessão pertencente ao tenant/org:
  - `/api/whatsapp-web/pairing-code`
  - `/api/whatsapp-web/chats`
  - `/api/whatsapp-web/chats/[chatId]/messages`
  - `/api/whatsapp-web/groups`
  - `/api/whatsapp-web/sync-chats`
  - `/api/whatsapp-web/start`
  - `/api/whatsapp-web/diagnostics`
  - `/api/whatsapp-web/sync-chat-messages`
  - `/api/whatsapp-web/messages/send`
  - `/api/whatsapp-web/groups/export-contacts`
  - `/api/whatsapp-web/chats/import-history`
- Adicionado helper server-side `requireOwnedWhatsappSession()` para validar sessão WhatsApp contra `channels.session_id` do tenant atual.
- Removidos `upsert` globais por `phone`, `external_chat_id`, `external_message_id` e `external_group_id` em rotas WhatsApp Web alteradas; operações agora fazem lookup/update/insert escopado por tenant/org.
- `/api/whatsapp-web/messages/send` bloqueia grupos por `isGroup` ou `@g.us` e exige conversa existente no canal.
- `/api/whatsapp-web/messages/save-selected` foi desativado com `410`, por aceitar histórico arbitrário vindo do client.
- `/api/messaging/status` deixou de retornar status global do provider e passou a retornar apenas canais ativos do tenant/org autenticado.
- Webhook OpenWA passou a falhar fechado em produção quando não há secret configurado.
- Webhook OpenWA não faz mais fallback de sessão desconhecida para `lips-main`.
- Webhook Evolution passou a exigir token em produção (`EVOLUTION_WEBHOOK_TOKEN` ou `SHAMARCONNECT_WEBHOOK_TOKEN`).
- Webhook Evolution só cria jobs `lips-auto` para o canal Lips conhecido.
- Webhooks Meta WhatsApp Cloud e Social passaram a falhar fechados em produção quando o app secret não está configurado.
- `/api/whatsapp/events` não aceita mais `tenant_id`/`organization_id` do payload; contexto vem apenas do endpoint reconhecido.
- Rotas de envio IA supervisionada e WhatsApp Cloud foram desativadas para este release WhatsApp-only.
- Importação manual de contatos ganhou limites de tamanho e quantidade e não reseta consentimento/tags de contatos existentes.
- `.env.example` documenta `EVOLUTION_WEBHOOK_TOKEN`.

## Política de Produto

> A Moriah não publica módulos incompletos como beta comercial. Cada canal permanece invisível até passar por desenvolvimento, testes, homologação, segurança, documentação e operação real.

> A Moriah usa o Centro de Comando como ambiente real de validação dos recursos futuros. Funcionalidades podem ser liberadas internamente quando estiverem funcionais, seguras e isoladas. Clientes só recebem recursos após uso interno, homologação e aprovação explícita do Allan.

> Nenhum módulo comercial será apresentado como beta. Recursos ainda não aprovados permanecem invisíveis aos clientes.

Existem dois níveis de liberação:

```text
1. Liberação interna para Allan/Moriah
2. Liberação comercial para clientes
```

O Centro de Comando pode receber funcionalidades internas progressivamente quando estiverem funcionais, protegidas, sem risco de perda ou vazamento de dados, utilizáveis no dia a dia e claramente identificadas como internas. Isso inclui WhatsApp com grupos e comunidades, redes sociais e IA assistiva, desde que cada recurso esteja isolado, observável e reversível.

Para clientes, recurso inexistente deve permanecer invisível. Não exibir item desativado, card "em breve", canal incompleto, botão sem função, laboratório, feature experimental ou configuração técnica futura.

Ciclo obrigatório:

```text
desenvolvimento interno
→ teste automatizado
→ teste em ambiente controlado
→ uso interno
→ homologação
→ documentação
→ ativação comercial
```

Para este release, apenas WhatsApp pode ficar visível ao cliente. Instagram, Facebook, TikTok, e-mail, IA, Meta/Cloud API e canais futuros permanecem escondidos da navegação, protegidos server-side, desativados por feature flags e indisponíveis por API.

## Ordem Oficial da Lips

```text
1. WhatsApp
2. IA
3. Redes sociais
```

### Fase 1 — WhatsApp Lips

Concluir totalmente antes de avançar comercialmente:

- inbound;
- outbound;
- inbox;
- contato;
- catálogo;
- classificador;
- cotação segura;
- cooldown;
- handoff;
- equipe;
- oficina;
- balcão;
- grupos ignorados no fluxo comercial atual;
- mídia preservada;
- autenticação de webhook;
- isolamento por organização;
- observabilidade;
- operação real.

### Fase 2 — IA Lips

IA entra como apoio supervisionado. Inicialmente pode resumir conversa, sugerir resposta, identificar intenção/urgência, sugerir departamento/tags/próximo passo, buscar contexto de produto e ajudar o atendente.

IA não deve inicialmente fechar venda, confirmar estoque, reservar produto, enviar PIX, confirmar aplicação, negociar preço, responder autonomamente sem controle ou substituir regra determinística segura.

### Fase 3 — Redes Sociais Lips

Somente depois do WhatsApp e da IA estarem estáveis. Cada canal deve passar por integração, entrada, resposta, histórico, identidade do contato, fila, atribuição, automação, segurança, teste interno, aprovação e liberação.

## Aprovação do Allan

Nenhum recurso muda de `internal_active` para `internal_approved`, `commercial_pilot` ou `commercial_active` sem aprovação explícita do Allan.

Modelo de registro obrigatório:

```text
recurso:
ambiente testado:
data:
resultado:
problemas encontrados:
correções:
aprovado por Allan:
liberação autorizada:
```

Estado atual do WhatsApp Lips: validação técnica local aprovada; `internal_approved`/`commercial_pilot` somente após homologação real ponta a ponta e aprovação explícita do Allan.

## Validações

- `npx tsc --noEmit --pretty false`: passou.
- `npm run build`: passou.
- `npm test`: 30/30 passou.
- `npm audit`: 0 vulnerabilities.
- `npm run lint`: 0 erros; warnings legados registrados para backlog.

## Bloqueios

- Falta confirmar `OPENWA_WEBHOOK_SECRET` igual na Vercel Production e no Railway/OpenWA.
- Falta confirmar pelo painel/CLI Railway o runtime real, commit, start command, Dockerfile e header assinado em produção.
- Falta validação real ponta a ponta da Lips após mensagem externa real:
  - inbound real recebido pelo OpenWA;
  - persistência no banco;
  - criação/claim de job;
  - resposta segura ou handoff;
  - cooldown;
  - outbound real pelo gateway.

## Riscos Residuais

- Rotas futuras Meta/Cloud e IA estão bloqueadas para este release; antes de reativar, precisam usar credenciais por canal, não env global.
- Dependabot ainda pode listar alertas no gateway legado `gateway/openwa`; esse diretório não é runtime de produção.
- Não foi feita validação visual/mobile em navegador nesta rodada.
- O módulo WhatsApp ainda não deve ser declarado 100% até passar pela homologação real de conectividade, inbox, resposta manual, automação Lips, UX desktop/mobile e operação com gateway offline.
