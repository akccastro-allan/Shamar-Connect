# Evolução do Dashboard Operacional

Este documento registra a primeira evolução do dashboard real do ShamarConnect a partir do conceito criado no UI Lab.

## Objetivo

Transformar o dashboard em uma tela operacional útil para o uso diário do sistema.

Antes, o dashboard usava métricas simuladas. Agora, ele passa a buscar dados reais ou operacionais de:

- Supabase;
- Railway WhatsApp Web Gateway;
- tabelas de CRM;
- mensagens;
- conversas;
- listas importadas.

## Arquivos criados

### API de resumo

```txt
app/api/dashboard/summary/route.ts
```

Essa rota retorna:

```txt
status do WhatsApp
telefone conectado
quantidade de contatos
quantidade de conversas
quantidade de mensagens
quantidade de listas importadas
quantidade de contatos importados de grupos
avisos de erro
```

### Painel operacional

```txt
components/dashboard-operational-panel.tsx
```

Esse componente mostra:

- cards de métricas;
- status do WhatsApp;
- atalhos operacionais;
- status do ambiente;
- próximos passos recomendados.

## Arquivo atualizado

```txt
app/dashboard/page.tsx
```

O dashboard agora usa:

```tsx
<DashboardOperationalPanel />
```

## Atalhos incluídos

O dashboard possui atalhos para:

```txt
/system-test
/settings/whatsapp
/whatsapp-import
/contact-import
```

## Próximas evoluções

1. Adicionar gráficos simples de atividade.
2. Mostrar últimas mensagens recebidas.
3. Mostrar últimas listas importadas.
4. Mostrar pendências de revisão.
5. Adicionar alerta quando o WhatsApp estiver desconectado.
6. Adicionar bloco de saúde do webhook.
7. Criar versão mobile do dashboard.
