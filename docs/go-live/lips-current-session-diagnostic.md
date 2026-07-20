# Diagnóstico Sanitizado da Sessão Atual da Lips

Data: 2026-07-19
Escopo: Auto Peças e Auto Center Lips

## Resultado

Status do diagnóstico Production: pendente de execução read-only autenticada.

Motivo: este PR não usa service role local, não possui `.auth/operations.json` e o aparelho oficial ainda não está disponível. Nenhuma chamada autenticada a Production foi executada nesta etapa.

## Identificadores Esperados

- Tenant: `e6abeaae-29fc-4186-b56a-361a69cb846d`
- Organization: `8f074193-bf58-4537-9842-720619a9f259`
- Channel: `1f65f8d2-2609-42d9-ae57-709aecdb43da`
- Sessão atual: `lips-main`
- Sessão staging preparada em código: `lips-main-6108`
- Número oficial esperado: `5521***6108`

## Dados A Levantar Antes Do QR

- session id atual: pendente
- telefone mascarado atual: pendente
- status: pendente
- provider: pendente
- gateway: pendente
- channel: pendente
- connection: pendente
- tenant: pendente
- organization: pendente
- last seen: pendente
- última atividade: pendente
- mensagens recentes: pendente
- referência por outro canal: pendente
- origem da sessão antiga: pendente

## Regra De Preservação

A sessão `lips-main` não pode ser apagada, desconectada ou substituída antes de sua origem ser identificada. A sessão temporária `lips-main-6108` deve ser usada apenas para preparar o número oficial e só pode ser ativada após confirmação server-side do telefone `5521***6108`.

## Próxima Execução Read-Only

1. Entrar como operador global autorizado.
2. Abrir `/operations/diagnostics/whatsapp-sync`.
3. Clicar apenas em ações read-only: `Verificar status`, `Validar paginação`, `Capturar baseline`, `Capturar estado atual`.
4. Confirmar que nenhum token, URL privada, telefone completo, QR ou payload bruto aparece na tela/relatório.
5. Atualizar este documento somente com dados mascarados.

## Proibições

- Não apagar sessão.
- Não desconectar sessão antiga.
- Não gerar QR sem aparelho oficial presente.
- Não executar bootstrap.
- Não executar incremental.
- Não executar scheduler.
- Não enviar mensagem.
- Não expor telefone completo, token, baseUrl privada, cookie, QR ou payload bruto.
