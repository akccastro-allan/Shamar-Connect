# Smoke autenticado do Centro de Comando

Este fluxo usa Playwright com login manual para validar `/operations` sem armazenar credenciais no repositório.

Se o navegador do Playwright ainda não existir na máquina, instale localmente com `npx playwright install chromium`. Esse download não deve ser commitado.

## Execução por duplo clique no Windows

1. Feche qualquer launcher antigo aberto.
2. Clique duas vezes em `E2E-LOGIN-CENTRO-DE-COMANDO.cmd`.
3. Faça login como operador global no navegador aberto.
4. Aguarde a mensagem `Sessão salva com segurança.`.
5. Clique duas vezes em `E2E-VALIDAR-CENTRO-E-LIPS.cmd`.
6. Copie apenas o resumo sanitizado exibido no terminal.
7. Clique duas vezes em `E2E-LIMPAR-SESSAO.cmd`.
8. Digite `APAGAR SESSAO LOCAL E2E` para confirmar.

A sessão fica apenas dentro da pasta local do projeto em `.auth/operations.json` e `.auth/browser-profile`. Esses arquivos são sensíveis, nunca devem ser enviados, compartilhados ou commitados. Os launchers de validação executam somente testes read-only e não chamam o smoke write.

## Gerar sessão local

1. Rode `npm run e2e:auth` em uma máquina local.
2. O navegador visível abrirá `https://www.shamarconnect.com.br/login`.
3. Faça login manualmente com operador global autorizado.
4. Navegue até `/operations` se o app não redirecionar sozinho.
5. O script salva somente o `storageState` local em `.auth/operations.json`.

O script não aceita e-mail ou senha por argumento, não imprime cookies e não envia o arquivo para servidor externo.

## Smoke read-only

Rode `npm run e2e:operations:read`.

O teste valida as rotas principais de `/operations`, garante ausência de redirecionamento para login, checa sidebar, topbar, breadcrumbs, overflow horizontal, erros não tratados, ausência de secrets visíveis e exclusão de Lips, Hall e NutriFlow do catálogo interno.

Este smoke não cria, edita nem exclui dados.

## Smoke visual

Rode `npm run e2e:operations:visual`.

Screenshots locais são gerados em `test-results/operations/` para os viewports:

- `1440x900`
- `1280x720`
- `768x1024`
- `390x844`

O relatório HTML fica em `playwright-report/`. Ambos os diretórios são ignorados pelo Git.

## Renovar sessão

Rode novamente `npm run e2e:auth`. O arquivo `.auth/operations.json` será substituído localmente.

## Remover sessão local

Remova `.auth/operations.json` quando terminar a validação ou quando a sessão expirar.

Com script seguro:

```bash
npm run e2e:auth:clear
```

Esse comando remove somente `.auth/operations.json`.

No Windows Git Bash:

```bash
rm .auth/operations.json
```

## Por que nunca commitar `.auth/operations.json`

O arquivo contém cookies e tokens de sessão do operador autenticado, mesmo sem armazenar a senha diretamente. Ele dá acesso ao ambiente com os mesmos privilégios do usuário logado enquanto a sessão estiver válida. Por isso `.auth/`, `*.storage-state.json`, `test-results/` e `playwright-report/` ficam no `.gitignore`.

## Escrita controlada

O smoke de escrita não roda por padrão. Para executar localmente:

```bash
OPERATIONS_WRITE_SMOKE=true npm run e2e:operations:write
```

O script exige digitar exatamente:

```text
EXECUTAR HOMOLOGACAO CENTRO DE COMANDO
```

Ele usa apenas o `storageState` local de `.auth/operations.json`, nunca service role e nunca usuário criado para produção.

Antes de criar qualquer registro, o teste faz um preflight da UI. Se a tela atual não expuser controles para editar/concluir a tarefa, cancelar o evento e mover conteúdo até aprovado usando o próprio registro criado, o smoke aborta antes de qualquer mutação para evitar dados órfãos em Production.

Registros de homologação usam o prefixo:

```text
[HOMOLOGAÇÃO CENTRO DE COMANDO]
```

O fluxo é restrito a empresa interna permitida por `OPERATIONS_SMOKE_COMPANY`, com padrão `Moriah Systems`. Nunca use Lips, Hall ou NutriFlow.

## Prontidão read-only da Lips

Rode `npm run e2e:lips:readiness` após gerar `.auth/operations.json`.

O teste abre `/operations/diagnostics/whatsapp-sync`, confirma `feature execute=false`, executa somente botões de consulta read-only (`Verificar status`, `Validar paginação`, `Capturar baseline`, `Capturar estado atual`, `Comparar`) e salva evidência sanitizada em `test-results/operations/lips-readiness.json`.

Ele valida health/readiness HTTP 200, sessão `lips-main` pronta, telefone mascarado, paginação com `limit=5`, offsets `0` e `5`, duração abaixo de 20 segundos, ausência de tokens/URLs privadas/chat IDs/mensagens na página e nenhuma mudança de integridade entre baseline e estado atual.

O arquivo de evidência local não inclui telefone completo, `external_chat_id`, fingerprints individuais, tokens, cookies, headers, `baseUrl`, mensagens ou nomes de contatos.

## Critérios de parada

Pare a execução se ocorrer qualquer item abaixo:

- sessão expirada ou redirecionamento para `/login`;
- usuário não chega a `/operations`;
- empresa selecionada não é interna;
- Lips, Hall ou NutriFlow aparecem como empresa interna selecionável;
- feature/ambiente não corresponde ao esperado;
- confirmação de escrita incorreta;
- `.auth/operations.json` ausente;
- erro 500;
- erro não tratado no console;
- sessão `lips-main` não estiver pronta;
- health/readiness do gateway não retornarem HTTP 200;
- paginação exceder `limit=5` ou alterar integridade;
- secret, cookie, token, telefone completo ou payload de mensagem aparece no relatório.

## CI

Os scripts autenticados abortam em `CI`. A sessão é manual e exclusivamente local.
