# WhatsApp Reader UX — Fase 1

Este documento registra a primeira evolução prática da tela de mensagens do WhatsApp no ShamarConnect.

## Objetivo

Aproximar a experiência da tela `/whatsapp-messages` da experiência básica do WhatsApp Web, adicionando filtros, busca, autoatualização e visual em balões.

## Arquivo alterado

```txt
components/whatsapp-reader-panel.tsx
```

## Melhorias implementadas

### 1. Visual em balões de conversa

As mensagens agora aparecem em área de conversa com fundo separado e balões:

- mensagens recebidas em balões brancos;
- mensagens enviadas em balões verdes claros;
- alinhamento diferente para recebidas e enviadas;
- horário exibido no balão;
- tipo da mensagem exibido quando não for texto;
- identificação do contato/participante no rodapé do balão.

### 2. Busca de conversas

Foi criado campo de busca para filtrar a lista de conversas por:

- nome da conversa;
- id da conversa.

A busca ignora diferença entre maiúsculas/minúsculas e acentos.

### 3. Filtro de conversas

Foram criados botões de filtro:

```txt
Todas
Privadas
Grupos
```

Assim o usuário consegue separar conversas individuais dos grupos.

### 4. Busca dentro da conversa

Foi criado campo de busca dentro das mensagens carregadas.

A busca considera:

- texto da mensagem;
- nome do contato;
- telefone.

### 5. Atualização automática opcional

Foi criado checkbox para ativar autoatualização.

Quando ligado, a tela atualiza:

```txt
a cada 8 segundos
```

A atualização busca novamente:

- lista de conversas;
- mensagens da conversa selecionada.

### 6. Seleção de mensagens visíveis

O botão anterior de selecionar todas foi ajustado para selecionar apenas as mensagens visíveis após filtro/busca.

Label:

```txt
Selecionar visíveis
```

### 7. Indicadores de resumo

Os cards de resumo agora mostram:

- conversas filtradas / total de conversas;
- mensagens filtradas / total de mensagens;
- mensagens selecionadas;
- status da autoatualização.

## Comportamento mantido

A tela continua permitindo:

- ler conversas privadas;
- ler grupos;
- responder em conversas privadas;
- responder em grupos;
- salvar apenas mensagens selecionadas;
- registrar mensagens enviadas como `outbound`.

## Próximos passos recomendados

1. Mostrar última mensagem real na lista de conversas.
2. Melhorar ordenação por última atividade.
3. Criar respostas rápidas.
4. Criar painel lateral do contato.
5. Criar botão de salvar conversa inteira com confirmação.
6. Adicionar suporte inicial a mídia.
7. Criar indicador visual de gateway desconectado.
8. Criar busca paginada ou carregamento incremental de histórico.
