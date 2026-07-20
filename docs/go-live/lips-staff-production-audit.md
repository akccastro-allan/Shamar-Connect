# Auditoria Read-Only Dos Usuários Lips

Data: 2026-07-19

## Escopo

- Tenant: `e6abeaae-29fc-4186-b56a-361a69cb846d`
- Organization: `8f074193-bf58-4537-9842-720619a9f259`
- Owner/admin esperado: `lips@moriahsystems.com.br`

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
