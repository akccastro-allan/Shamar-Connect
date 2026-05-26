# ShamarConnect MVP

Primeira base funcional do **ShamarConnect**, produto do ecossistema **ShamarHub** da **Moriah Systems**.

Este repositório entrega uma base vendável e de baixo custo para validação inicial:

- Next.js App Router + TypeScript + TailwindCSS;
- Supabase Auth/PostgreSQL/RLS/Realtime;
- camada `messaging-providers` preparada para mock, WhatsApp Web experimental e Meta Cloud API;
- inbox multiatendente mockada;
- CRM, funil, tags, respostas rápidas e campanhas em rascunho;
- IA copiloto para respostas comerciais consultivas;
- documentação de arquitetura, banco, estratégia WhatsApp, IA e controle de custos.

## Como rodar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Banco de dados

Execute no Supabase SQL Editor, nesta ordem:

1. `database/migrations/0001_initial_schema.sql`
2. `database/rls.sql`
3. `database/seed.sql`

## Variáveis de ambiente

Veja `.env.example`.

## Status dos providers

- `mock-provider`: ativo por padrão;
- `whatsapp-web-provider`: contrato/stub para futura fase 0.2;
- `meta-cloud-api-provider`: contrato/stub para futura fase 1.0.

A aplicação não chama WhatsApp diretamente nos componentes. Todas as ações passam pelos serviços internos e pela camada de providers.
