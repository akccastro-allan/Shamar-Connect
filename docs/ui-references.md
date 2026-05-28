# Referências visuais e plano de evolução de UI

Este documento registra as referências visuais que serão usadas para evoluir a interface do ShamarConnect sem comprometer a arquitetura atual.

## Referência 1: Admin Bizzark

Origem analisada:

```txt
Google Drive > admin-bizzark-1.0.0
```

Estrutura encontrada:

```txt
admin-bizzark-1.0.0
  Html
    dist
    src
    docs
  Sketch
```

Arquivos e áreas úteis observadas:

```txt
fluid-app-chat.html
fluid-social-chat.html
fixed-ui-tables.html
fixed-ui-forms.html
mini-tickets.html
mini-invoices.html
mini-employees.html
ui-pagination.html
fluid-company.html
```

### O que pode agregar ao ShamarConnect

O Admin Bizzark deve ser usado como referência visual para:

- dashboard administrativo;
- cards de métricas;
- telas de chat/inbox;
- tabelas de contatos;
- formulários;
- listas importadas;
- visual de tickets/atendimento;
- páginas de CRM;
- paginação e filtros.

### Regra de uso

Não devemos copiar o template inteiro para dentro do projeto.

O ShamarConnect já usa:

```txt
Next.js
Tailwind CSS
Supabase
Railway Gateway
Vercel
```

Portanto, a referência deve ser traduzida em componentes próprios, mantendo a estrutura atual.

## Referência 2: Amigo AI Chatbot GPT Mobile App PWA React Template

Origem:

```txt
Envato Elements: Amigo AI Chatbot GPT Mobile App PWA React Template
```

### O que pode agregar ao ShamarConnect

Esse template deve inspirar a frente mobile/PWA:

- chat mobile;
- assistente IA;
- experiência de app instalável;
- navegação simples em telas pequenas;
- interface de conversa;
- fluxo de atendimento rápido;
- ações rápidas para vendedores/atendentes.

### Regra de uso

Usar como inspiração visual e funcional para a experiência mobile/PWA. A integração direta de código só deve ser avaliada depois de revisar licença, dependências e compatibilidade técnica.

## Primeiras telas que devem evoluir

### 1. Dashboard

Objetivo:

Criar uma tela de visão geral mais comercial e operacional.

Deve exibir:

- status do WhatsApp;
- contatos no CRM;
- conversas salvas;
- mensagens recentes;
- importações realizadas;
- pendências de revisão;
- atalhos de operação.

### 2. Inbox / Mensagens WhatsApp

Objetivo:

Criar experiência mais próxima de uma central de atendimento.

Deve exibir:

- lista de conversas à esquerda;
- leitura da conversa à direita;
- status do contato;
- botão para salvar no CRM;
- botão para sincronizar histórico;
- área futura para resposta rápida e IA.

### 3. Listas importadas

Objetivo:

Melhorar a revisão dos contatos extraídos de grupos.

Deve exibir:

- listas importadas;
- contadores de aprovados, reprovados e pendentes;
- filtros;
- ações em massa;
- exportação CSV;
- status de consentimento.

### 4. Mobile/PWA

Objetivo:

Criar uma experiência de uso pelo celular.

Deve exibir:

- navegação mobile simples;
- chat com IA;
- cards de tarefas;
- atalhos de atendimento;
- resumo do dia;
- status do WhatsApp.

## Página criada para laboratório

```txt
/ui-lab
```

Essa página servirá para testar visualmente novas propostas antes de aplicar em telas reais.

## Fluxo de trabalho recomendado

1. Criar conceito no `/ui-lab`.
2. Validar visualmente.
3. Transformar o bloco aprovado em componente reutilizável.
4. Aplicar na tela real.
5. Documentar a alteração.

## Próximas etapas

- Evoluir o dashboard com cards e atalhos.
- Redesenhar a Inbox.
- Redesenhar listas importadas.
- Criar conceito mobile/PWA.
- Criar biblioteca interna de componentes visuais do ShamarConnect.
