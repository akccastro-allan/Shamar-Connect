# Testes manuais — APIs do Shamar Agent

Data: 2026-06-06

Status: guia de validação do MVP

## Objetivo

Este documento registra como validar manualmente o Bloco Shamar Agent no ShamarConnect.

As rotas foram criadas para apoiar o fluxo:

```text
Instalador
→ Configurador
→ Login técnico temporário
→ Escolha do cliente
→ Escolha do sistema/banco
→ Teste de conexão local pelo agente
→ Bootstrap no ShamarConnect
→ AgentToken
→ Serviço ativo
→ Sync recorrente
```

## Variáveis necessárias

Antes dos testes, configure no ambiente do ShamarConnect:

```bash
SHAMAR_AGENT_SETUP_TOKEN="trocar-por-token-forte"
NEXT_PUBLIC_APP_URL="https://seu-dominio"
SUPABASE_SERVICE_ROLE_KEY="service-role-server-side"
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="anon-key-publica"
```

Observações:

- `SHAMAR_AGENT_SETUP_TOKEN` é temporário até existir o login real da Shamar Suite.
- `SUPABASE_SERVICE_ROLE_KEY` deve existir somente no servidor.
- As rotas do agente usam `createSupabaseWriteClient()`.
- O agente local não se conecta diretamente ao Supabase.

## Build local

Rodar:

```bash
npm run build
```

Resultado esperado:

```text
Build concluído sem erro de TypeScript ou Next.js.
```

Se houver erro de coluna inexistente em runtime, conferir o schema real das tabelas:

```text
tenants
organizations
integration_sources
integration_agents
integration_sync_runs
integration_sync_logs
catalog_categories
catalog_items
```

## 1. Login técnico temporário

Rota:

```http
POST /api/integrations/agent/login
```

Exemplo:

```bash
curl -X POST "$APP_URL/api/integrations/agent/login" \
  -H "Content-Type: application/json" \
  -d '{
    "setupToken": "'$SHAMAR_AGENT_SETUP_TOKEN'"
  }'
```

Resposta esperada:

```json
{
  "ok": true,
  "mode": "setup_token",
  "message": "Login técnico autorizado para configuração do Shamar Agent."
}
```

Validações negativas:

```bash
curl -X POST "$APP_URL/api/integrations/agent/login" \
  -H "Content-Type: application/json" \
  -d '{"setupToken":"token-invalido"}'
```

Esperado:

```json
{
  "ok": false,
  "error": "Token técnico inválido."
}
```

HTTP esperado: `401`.

## 2. Listar organizações disponíveis

Rota:

```http
GET /api/integrations/agent/available-organizations
```

Exemplo:

```bash
curl -X GET "$APP_URL/api/integrations/agent/available-organizations" \
  -H "Authorization: Bearer $SHAMAR_AGENT_SETUP_TOKEN"
```

Resposta esperada:

```json
{
  "ok": true,
  "organizations": [
    {
      "tenantId": "uuid",
      "tenantName": "Moriah Systems",
      "organizationId": "uuid",
      "organizationName": "Auto Center Lips",
      "slug": "auto-center-lips",
      "businessType": "auto_center",
      "industry": "automotivo",
      "status": "active",
      "city": "Rio de Janeiro",
      "state": "RJ"
    }
  ]
}
```

## 3. Bootstrap do agente

Rota:

```http
POST /api/integrations/agent/bootstrap
```

Exemplo:

```bash
curl -X POST "$APP_URL/api/integrations/agent/bootstrap" \
  -H "Authorization: Bearer $SHAMAR_AGENT_SETUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "TENANT_UUID",
    "organizationId": "ORGANIZATION_UUID",
    "sourceType": "firebird_cplus",
    "sourceName": "CPlus Lips",
    "machineName": "SERVIDOR-LIPS",
    "operatingSystem": "Windows Server",
    "agentName": "Shamar Agent - SERVIDOR-LIPS",
    "agentVersion": "0.1.0"
  }'
```

Resposta esperada:

```json
{
  "ok": true,
  "tenantId": "TENANT_UUID",
  "organizationId": "ORGANIZATION_UUID",
  "integrationSourceId": "SOURCE_UUID",
  "agentId": "AGENT_UUID",
  "agentToken": "TOKEN_RETORNADO_APENAS_UMA_VEZ",
  "apiUrl": "https://seu-dominio"
}
```

Atenção:

- copiar o `agentToken` retornado;
- ele não deve aparecer em logs;
- ele não deve ser salvo puro no banco;
- no banco deve existir apenas `agent_token_hash`.

## 4. Health check do agente

Rota:

```http
POST /api/integrations/agent/health
```

Exemplo:

```bash
curl -X POST "$APP_URL/api/integrations/agent/health" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "online",
    "machineName": "SERVIDOR-LIPS",
    "agentVersion": "0.1.0",
    "metadata": {
      "source": "manual-test"
    }
  }'
```

Resposta esperada:

```json
{
  "ok": true,
  "agentId": "AGENT_UUID",
  "status": "active",
  "checkedAt": "2026-06-06T00:00:00.000Z"
}
```

Validação no banco:

```text
integration_agents.status = active
integration_agents.last_seen_at preenchido
integration_agents.last_ip preenchido quando disponível
integration_sync_logs com mensagem de health check
```

## 5. Sincronização de catálogo

Rota:

```http
POST /api/integrations/agent/sync/catalog
```

Exemplo:

```bash
curl -X POST "$APP_URL/api/integrations/agent/sync/catalog" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "externalId": "123",
        "sku": "123",
        "barcode": "7890000000000",
        "name": "Pastilha de freio",
        "description": "Pastilha de freio dianteira",
        "category": "Freios",
        "brand": "Marca Teste",
        "price": 129.9,
        "stockQuantity": 4,
        "imageUrl": null,
        "sourceUpdatedAt": "2026-06-05T10:30:00",
        "rawPayload": {
          "origem": "teste-manual"
        }
      }
    ]
  }'
```

Resposta esperada na primeira execução:

```json
{
  "ok": true,
  "syncRunId": "SYNC_RUN_UUID",
  "received": 1,
  "created": 1,
  "updated": 0,
  "failed": 0,
  "status": "success"
}
```

Resposta esperada ao repetir o mesmo payload:

```json
{
  "ok": true,
  "syncRunId": "SYNC_RUN_UUID",
  "received": 1,
  "created": 0,
  "updated": 1,
  "failed": 0,
  "status": "success"
}
```

Validações:

```text
catalog_categories deve criar categoria Freios, se ainda não existir.
catalog_items deve criar ou atualizar o item com external_id = 123.
integration_sync_runs deve registrar status success, partial_success ou failed.
integration_sync_logs deve registrar resumo da sincronização.
```

Teste de limite:

- enviar mais de 500 itens;
- esperado: HTTP `400`.

Teste de item inválido:

- enviar item sem `externalId` ou sem `name`;
- esperado: `failed` maior que zero e status `partial_success` ou `failed`.

## 6. Envio de logs

Rota:

```http
POST /api/integrations/agent/logs
```

Exemplo:

```bash
curl -X POST "$APP_URL/api/integrations/agent/logs" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "level": "info",
        "message": "Teste manual de log do Shamar Agent.",
        "context": {
          "source": "curl"
        }
      }
    ]
  }'
```

Resposta esperada:

```json
{
  "ok": true,
  "inserted": 1
}
```

Validações negativas:

- enviar `level` diferente de `debug`, `info`, `warning`, `error` ou `critical`;
- enviar mais de 100 logs;
- enviar log sem `message`.

## Checklist de aceite

A tarefa só deve ser considerada validada quando:

```text
[ ] npm run build passar.
[ ] Login técnico retornar ok.
[ ] Organizations listar a Lips ou outro cliente ativo.
[ ] Bootstrap criar integration_source, integration_agent e log.
[ ] AgentToken autenticar health.
[ ] Sync catalog criar item na primeira execução.
[ ] Sync catalog atualizar item na segunda execução.
[ ] Logs inserir registros.
[ ] Token inválido retornar 401.
[ ] Lote acima do limite retornar 400.
[ ] Nenhum token ou senha aparecer em logs.
```

## Observações de segurança

Não usar estas rotas para login geral da aplicação.

Não expor `SHAMAR_AGENT_SETUP_TOKEN` ao navegador público.

Não salvar `AgentToken` puro em banco.

Não criar conexão direta do agente local com Supabase.
