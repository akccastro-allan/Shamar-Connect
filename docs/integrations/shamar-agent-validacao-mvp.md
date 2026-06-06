# Validação MVP — Bloco Shamar Agent no ShamarConnect

Data: 2026-06-06

Status: validação documental e revisão estática concluídas; build precisa ser executado em ambiente com Node/dependências.

## Objetivo da tarefa

Validar o Bloco Shamar Agent criado no ShamarConnect antes de avançar para o executável local Shamar-Agent.

Escopo da validação:

```text
1. Conferir arquivos criados.
2. Conferir uso de createSupabaseWriteClient().
3. Conferir ausência de Supabase direto pelo agente.
4. Conferir ausência de Supabase anon nas rotas.
5. Conferir ausência de SQL, UI, WhatsApp e login geral.
6. Criar guia de testes manuais HTTP.
7. Registrar pendências de build e schema.
```

## Arquivos revisados

```text
lib/integrations/agent-auth.ts
app/api/integrations/agent/login/route.ts
app/api/integrations/agent/available-organizations/route.ts
app/api/integrations/agent/bootstrap/route.ts
app/api/integrations/agent/health/route.ts
app/api/integrations/agent/sync/catalog/route.ts
app/api/integrations/agent/logs/route.ts
docs/decisions/0001-shamar-agent-provisioning-and-api-block.md
docs/integrations/shamar-agent-api-testes.md
```

## Resultado da revisão estática

### Autenticação técnica temporária

Validado:

- `SHAMAR_AGENT_SETUP_TOKEN` é usado apenas nas rotas de configuração inicial;
- o token pode vir por Bearer ou body, conforme rota;
- erros de token inválido retornam erro de autenticação;
- não há criação de cookie;
- não há criação de sessão;
- não há alteração no login geral da aplicação.

### AgentToken

Validado:

- `AgentToken` é gerado com `crypto.randomBytes(32).toString("base64url")`;
- o banco recebe somente `agent_token_hash`;
- o token puro é retornado somente no bootstrap;
- a autenticação operacional usa Bearer token do agente;
- a busca do agente usa hash SHA-256.

### Supabase

Validado:

- as rotas server-side usam `createSupabaseWriteClient()`;
- não foi adicionado Supabase anon nessas rotas;
- não foi criada conexão direta do agente local com Supabase;
- não foi criado SQL manual;
- não foi alterado schema.

### Rotas

Validado:

- todas as rotas exportam `dynamic = "force-dynamic"`;
- todas usam `NextResponse`;
- todas têm `try/catch`;
- erros de autenticação retornam status do `AgentAuthError`;
- erros de validação principais retornam `400`;
- erros internos retornam `500`.

### Catálogo

Validado:

- limite de lote em 500 itens;
- `externalId` e `name` são obrigatórios por item;
- não foi usado `upsert`;
- o fluxo usa `select` + `insert/update`;
- cria ou reutiliza categoria;
- cria `integration_sync_runs`;
- atualiza status final como `success`, `partial_success` ou `failed`;
- registra log de resumo.

### Logs

Validado:

- limite de 100 logs por requisição;
- níveis aceitos: `debug`, `info`, `warning`, `error`, `critical`;
- logs são vinculados a tenant, organization, source e agent;
- não há registro de token ou senha por padrão.

## O que não pôde ser executado neste ambiente

### Build

Não foi possível rodar diretamente:

```bash
npm run build
```

Motivo:

Este ambiente acessa o repositório pelo conector do GitHub, mas não executa comandos dentro do repositório remoto.

Validação necessária em ambiente local ou Vercel:

```bash
npm install
npm run build
```

ou, se as dependências já estiverem instaladas:

```bash
npm run build
```

### Schema real do Supabase

Não foram encontrados arquivos de migration/schema no repositório durante a busca estática.

Por isso, os nomes de colunas usados nas rotas precisam ser confirmados contra o banco real.

Tabelas a validar:

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

Campos com maior chance de exigir ajuste se o schema real for diferente:

```text
integration_source_id
integration_agent_id
agent_token_hash
machine_name
operating_system
agent_version
last_seen_at
last_ip
items_received
items_created
items_updated
items_failed
sync_run_id
external_source
external_id
item_type
stock_quantity
source_updated_at
last_synced_at
raw_payload
metadata
```

## Critério de aceite final

A validação será completa quando:

```text
[ ] npm run build passar.
[ ] As colunas usadas baterem com o schema real do Supabase.
[ ] Login técnico retornar ok.
[ ] available-organizations listar organizações ativas.
[ ] bootstrap criar integration_source e integration_agent.
[ ] agentToken retornado no bootstrap autenticar health.
[ ] sync catalog criar item na primeira execução.
[ ] sync catalog atualizar item na segunda execução.
[ ] logs inserir registros em integration_sync_logs.
[ ] token inválido retornar 401.
[ ] lote acima do limite retornar 400.
[ ] nenhum token/senha aparecer em logs.
```

## Próxima ação técnica recomendada

Executar em ambiente local ou Vercel:

```bash
npm run build
```

Se o build passar, executar os testes documentados em:

```text
docs/integrations/shamar-agent-api-testes.md
```

Se o build falhar, corrigir primeiro TypeScript/Next.js.

Se o runtime falhar por coluna inexistente, ajustar as rotas para o schema real do Supabase e registrar a decisão neste diretório de documentação.
