# WhatsApp Message Reader

Este documento registra a criação da área de leitura manual de mensagens do WhatsApp Web no ShamarConnect.

## Objetivo

Permitir que o usuário leia mensagens disponíveis no WhatsApp Web conectado e salve manualmente apenas as mensagens úteis para CRM, atendimento, histórico ou auditoria.

A ideia é funcionar como uma área de leitura parecida com o WhatsApp Web, mas com controle manual de persistência.

## Página criada

```txt
/whatsapp-messages
```

Arquivo:

```txt
app/whatsapp-messages/page.tsx
```

Componente principal:

```txt
components/whatsapp-reader-panel.tsx
```

## Fluxo de uso

1. O sistema lista conversas visíveis no WhatsApp Web conectado.
2. O usuário escolhe uma conversa.
3. O sistema carrega as últimas mensagens da conversa.
4. O usuário seleciona as mensagens que deseja salvar.
5. Apenas as mensagens selecionadas são enviadas para o Supabase.
6. O sistema salva contato, conversa e mensagens.

## Endpoints criados

### Ler mensagens de uma conversa

```txt
GET /api/whatsapp-web/chats/[chatId]/messages?limit=50
```

Este endpoint chama o gateway Railway e retorna mensagens recentes da conversa.

### Salvar mensagens selecionadas

```txt
POST /api/whatsapp-web/messages/save-selected
```

Payload esperado:

```json
{
  "messages": []
}
```

O endpoint salva dados em:

```txt
crm_contacts
whatsapp_conversations
whatsapp_messages
```

## Comportamento importante

As mensagens não são salvas automaticamente pela tela. O usuário precisa selecionar quais mensagens deseja guardar.

Isso evita carregar todo o histórico do aparelho sem controle e permite usar a base do CRM com mais qualidade.

## Menu

A página foi adicionada ao menu lateral como:

```txt
Mensagens WhatsApp
```

## Limites atuais

A tela permite carregar:

```txt
25
50
100
200
```

mensagens recentes por conversa.

## Próximas evoluções

1. Criar busca dentro das mensagens carregadas.
2. Criar filtro por recebidas/enviadas.
3. Criar visual mais parecido com balões de conversa.
4. Salvar conversa inteira com confirmação.
5. Adicionar suporte a mídia, áudio e imagens.
6. Marcar mensagens como importantes.
7. Criar vínculo com oportunidade no funil.
8. Permitir responder a conversa diretamente pela tela.
