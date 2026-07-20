# Auditoria Read-Only Dos Usuários Lips

Data: 2026-07-19

## Escopo

- Tenant: `e6abeaae-29fc-4186-b56a-361a69cb846d`
- Organization: `8f074193-bf58-4537-9842-720619a9f259`
- Owner/admin esperado: `lips@moriahsystems.com.br`

## Identidades Oficiais

- `allan@moriahsystems.com.br`: operador global da plataforma. Usa `/operations` somente para diagnóstico, QR e cutover. Não atende clientes da Lips e não deve constar como funcionário ou atendente da Lips.
- `lips@moriahsystems.com.br`: owner/admin da empresa Lips. Usa o ambiente da Lips para validar inbox e administrar equipe. Não acessa o Centro de Comando interno.
- Funcionários da Lips: contas individuais, vinculadas ao tenant e organization da Lips, com departamento e função próprios. Não acessam outras empresas nem `/operations`.

## Status

Auditoria Production: pendente de execução autenticada read-only.

Este PR não consulta hashes, senhas, tokens, cookies ou metadata de autenticação. Também não redefine senha, não envia convite e não cria usuários.

## Verificações Necessárias

- Usuários ativos da Lips.
- Roles por usuário.
- Departamento vinculado.
- Status do vínculo.
- Último login, se disponível em tela administrativa segura.
- Acesso ao inbox.
- Usuários sem departamento.
- Usuários com acesso excessivo.
- Ausência de acesso a outro tenant.
- `lips@moriahsystems.com.br` permanece owner/admin da empresa.
- `lips@moriahsystems.com.br` não acessa Centro de Comando interno.
- `allan@moriahsystems.com.br` não aparece como funcionário, atendente, responsável ou membro operacional da Lips.
- Funcionários da Lips têm contas individuais, sem login compartilhado.

## Dados Humanos Necessários Para Novos Funcionários

Para cada pessoa:

- Nome completo.
- E-mail individual.
- Departamento: Balcão, Oficina, Financeiro ou Supervisão.
- Função: Atendente, Supervisor, Oficina ou Financeiro.

Não criar conta genérica. Não compartilhar senha. Não usar o mesmo login em várias máquinas.

## Perfis Mínimos

Atendente: inbox Lips, assumir, responder, transferir, nota interna, encerrar e reabrir. Sem Centro de Comando, financeiro ou integrações.

Supervisor: tudo do atendente, todas as filas, redistribuição, métricas e reabertura. Sem Centro de Comando interno.

Oficina: conversas atribuídas à Oficina, resposta, nota interna e encaminhamento ao Balcão. Sem administração de usuários.

Financeiro: atendimentos atribuídos ao Financeiro. Sem conversas gerais salvo permissão explícita.
