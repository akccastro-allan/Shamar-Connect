# Decisão técnica 0001 — Provisionamento e APIs do Shamar Agent

Data: 2026-06-06

Status: aprovado para MVP

## Contexto

O ShamarConnect é o SaaS/CRM multiempresa da Shamar Suite. O Shamar Agent será o software local instalado em computadores ou servidores dos clientes para ler dados de sistemas locais e enviar esses dados para o ShamarConnect.

A Auto Center Lips é o primeiro cliente-piloto, usando CPlus com banco Firebird local. Mesmo assim, o agente não deve nascer acoplado à Lips. Ele deve ser genérico o suficiente para evoluir para outros clientes, sistemas e bancos de dados.

## Direção oficial

O fluxo oficial do agente será:

```text
Instalador
→ Configurador
→ Login
→ Escolha do cliente
→ Escolha do sistema/banco
→ Teste de conexão
→ AgentToken
→ Serviço ativo
```

O agente não deve depender de colar manualmente `tenant_id`, `organization_id` ou dados equivalentes no `appsettings` em produção.

No produto final, o configurador deve obter esses dados depois do login e da seleção do cliente.

No MVP, pode existir `appsettings` manual apenas para desenvolvimento, teste local e validação técnica.

## Decisão sobre autenticação temporária

Como o login completo da Shamar Suite ainda não está pronto, o Bloco ShamarConnect das APIs do Shamar Agent usa temporariamente a variável de ambiente:

```text
SHAMAR_AGENT_SETUP_TOKEN
```

Esse token é usado somente para o configurador no MVP.

Ele permite:

- validar login técnico temporário;
- listar organizações disponíveis;
- fazer bootstrap do agente;
- gerar `AgentToken`.

Esse token deve ser substituído futuramente pelo login real da Shamar Suite.

## Decisão sobre AgentToken

Após o bootstrap, o serviço local não usa login humano.

O serviço usa um `AgentToken` técnico gerado pelo ShamarConnect.

Regras:

- o `AgentToken` puro só é retornado uma vez, na resposta do bootstrap;
- o banco armazena apenas `agent_token_hash`;
- o hash é SHA-256;
- o token identifica agente, cliente, organização e origem;
- o token pode ser revogado no futuro pelo painel do ShamarConnect.

## Regra de segurança central

O Shamar Agent local não se conecta diretamente ao Supabase.

O fluxo correto é:

```text
Sistema local do cliente
→ Shamar Agent
→ API ShamarConnect
→ Supabase
```

O agente também não deve abrir porta de entrada no servidor do cliente.

A comunicação deve ser sempre de saída:

```text
Shamar Agent → API ShamarConnect
```

## Escopo implementado nesta etapa

Foi implementado o Bloco ShamarConnect das APIs do Shamar Agent com os seguintes arquivos:

```text
lib/integrations/agent-auth.ts
app/api/integrations/agent/login/route.ts
app/api/integrations/agent/available-organizations/route.ts
app/api/integrations/agent/bootstrap/route.ts
app/api/integrations/agent/health/route.ts
app/api/integrations/agent/sync/catalog/route.ts
app/api/integrations/agent/logs/route.ts
```

## Rotas criadas

### POST /api/integrations/agent/login

Valida o `SHAMAR_AGENT_SETUP_TOKEN`.

Não cria cookie.
Não cria sessão.
Não mexe no login geral.

É apenas um login técnico temporário para o MVP do configurador.

### GET /api/integrations/agent/available-organizations

Lista organizações ativas disponíveis para configuração do agente.

Usa `SHAMAR_AGENT_SETUP_TOKEN` via Bearer.

Busca `organizations` e `tenants` em consultas separadas para evitar dependência de relationship nested do Supabase.

### POST /api/integrations/agent/bootstrap

Faz o provisionamento inicial do agente.

Responsabilidades:

- validar setup token;
- validar tenant;
- validar organização;
- procurar ou criar `integration_sources`;
- gerar `AgentToken` seguro;
- salvar somente o hash do token em `integration_agents.agent_token_hash`;
- criar registro do agente com status `active`;
- registrar log inicial em `integration_sync_logs`;
- retornar `AgentToken` apenas nesta resposta.

### POST /api/integrations/agent/health

Recebe health check do agente.

Responsabilidades:

- autenticar o agente pelo Bearer token;
- atualizar `last_seen_at`;
- atualizar `last_ip`;
- atualizar `machine_name` e `agent_version`, se enviados;
- registrar log informativo.

### POST /api/integrations/agent/sync/catalog

Recebe sincronização de catálogo.

Escopo atual:

- produtos;
- preço;
- estoque;
- código de barras;
- marca;
- categoria;
- imagem;
- payload bruto para auditoria.

Regras:

- limite de 500 itens por lote;
- `externalId` e `name` são obrigatórios;
- não usa upsert;
- faz `select` + `insert/update`;
- cria `integration_sync_runs`;
- atualiza status como `success`, `partial_success` ou `failed`;
- registra log de resumo.

### POST /api/integrations/agent/logs

Recebe logs operacionais do agente.

Aceita níveis:

```text
debug
info
warning
error
critical
```

Limite: 100 logs por requisição.

## O que não foi alterado

Nesta etapa, não foi alterado:

- SQL;
- schema do banco;
- telas;
- WhatsApp;
- login geral;
- package.json;
- UI;
- regras de autenticação da aplicação principal.

## Regras para próximos prompts

Qualquer novo prompt ou pessoa que continuar este trabalho deve respeitar estas regras:

1. Não criar conexão direta do agente com Supabase.
2. Não expor tokens ou senhas em logs.
3. Não salvar `AgentToken` puro no banco.
4. Não depender de `tenant_id` ou `organization_id` colados manualmente em produção.
5. Não usar Supabase anon nas rotas do agente.
6. Usar `createSupabaseWriteClient()` em rotas server-side do agente.
7. Não mexer em WhatsApp, UI ou login geral sem uma tarefa específica para isso.
8. Não usar SQL remoto vindo do agente ou da nuvem.
9. Manter o agente local como cliente de saída, sem abrir porta no servidor do cliente.
10. Documentar decisões antes ou junto da implementação.

## Próxima direção

Próximos passos recomendados:

1. Rodar `npm run build` no ambiente local ou na Vercel.
2. Ajustar nomes de colunas caso o schema real tenha diferença nos campos esperados.
3. Criar coleção de testes manuais HTTP para login, organizations, bootstrap, health, sync e logs.
4. Criar no Shamar Agent o cliente HTTP para consumir essas rotas.
5. Criar o configurador com login técnico temporário usando `SHAMAR_AGENT_SETUP_TOKEN`.
6. Substituir o setup token pelo login real da Shamar Suite quando o módulo de autenticação estiver pronto.
