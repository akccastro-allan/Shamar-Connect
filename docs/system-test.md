# Teste operacional padrão do ShamarConnect

Este documento registra o teste usual do ambiente de desenvolvimento/teste do ShamarConnect.

## Objetivo

Ter uma rotina simples para validar se o ambiente está funcional antes de evoluir novas funções.

## Página do teste

```txt
/system-test
```

## API do teste

```txt
GET /api/system-test
```

## O que o teste valida

1. Aplicação Vercel respondendo.
2. Variáveis de ambiente principais.
3. Assets oficiais da marca configurados.
4. Conexão com Supabase.
5. Conexão com Railway WhatsApp Web Gateway.
6. Status atual do WhatsApp Web.

## Variáveis avaliadas

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
WHATSAPP_WEB_GATEWAY_URL
WHATSAPP_WEB_GATEWAY_TOKEN
SHAMARCONNECT_WEBHOOK_TOKEN
```

## Checklist visual recomendado

Depois do teste automático, validar manualmente:

```txt
/brand/shamar-connect-logo.png
/brand/shamar-connect-icon.png
/settings/whatsapp
/whatsapp-import
/contact-import
/group-import-lists
```

## Fluxo usual antes de testar novas funções

1. Aguardar deploy da Vercel finalizar.
2. Acessar `/system-test`.
3. Clicar em `Executar teste`.
4. Confirmar se Supabase está ok.
5. Confirmar se Railway Gateway está ok.
6. Confirmar status do WhatsApp Web.
7. Abrir a logo e o ícone oficiais.
8. Só depois testar novas funções.

## Interpretação

### Ambiente funcional

Todos os checks retornaram `ok: true`.

### Atenção necessária

Um ou mais checks retornaram `ok: false`. Nesse caso, verificar primeiro:

- variáveis de ambiente na Vercel;
- status do Railway;
- conexão do WhatsApp Web;
- migrações pendentes no Supabase;
- arquivos oficiais em `public/brand`.
