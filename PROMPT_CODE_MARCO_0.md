# Prompt para o Code — Marco 0 do Shamar Connect

Você vai trabalhar no repositório:

```text
https://github.com/akccastro-allan/Shamar-Connect
branch base: main
```

## Antes de mexer

Leia:

- `CLAUDE.md`
- `AI_HANDOFF.md`
- `docs/strategy/MVP_VENDAVEL_4_OPERACOES.md`
- `docs/decisions/0003-channel-bound-routing.md`
- `docs/decisions/0004-human-first-automation.md`
- `docs/decisions/0005-shamar-notifications-kids-events.md`
- `docs/decisions/0006-shamar-agent-datashow-safe-mode.md`
- `docs/ops/IMPLANTACOES_HALL_LIPS_ALLAN_CLINICA.md`

## Missão do Marco 0

Preparar a base para desenvolvimento seguro sem implementar features grandes.

## Entregas

1. Atualizar `.gitignore`:
   - ignorar `.env`;
   - ignorar `.env.*`;
   - permitir `.env.example`.
2. Remover `.env.local` do tracking, sem apagar o arquivo local do desenvolvedor.
3. Criar/atualizar `.env.example` sem segredos reais.
4. Criar checklist de rotação de segredos expostos em `docs/ops/ROTACAO_SEGREDOS.md`.
5. Mapear endpoints públicos de diagnóstico e protegê-los com autenticação.
6. Mapear policies públicas em tabelas operacionais.
7. Criar plano/migration para remover leitura pública indiscriminada sem quebrar a aplicação.
8. Verificar uso de Supabase anon no frontend.
9. Criar camada de autorização central, se ainda não existir:
   - tenant;
   - organization;
   - channel;
   - conversation;
   - role/capability.
10. Atualizar documentação de riscos restantes.

## Regras

- Não apagar dados.
- Não rodar migration destrutiva.
- Não commitar segredo.
- Não expor valores de token em logs ou relatório.
- Não avançar para Marco 1 se os dados operacionais ainda forem legíveis publicamente.

## Validações

Rodar:

```bash
npm install
npm run typecheck
npm run build
```

Se não houver script de typecheck, criar ou registrar ausência.

## Relatório obrigatório para Allan

Responder em PT-BR com:

```text
O que foi alterado
Arquivos principais
Migrations criadas
Testes executados
Riscos restantes
Como validar manualmente
Commit
Próximo marco recomendado
```
