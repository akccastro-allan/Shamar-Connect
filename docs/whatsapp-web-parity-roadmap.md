# Roadmap de paridade com WhatsApp Web

Este documento define a direção do módulo WhatsApp do ShamarConnect.

A meta mínima é clara:

```txt
Fazer tudo o que o WhatsApp Web faz e acrescentar recursos de CRM, IA, listas, automação e gestão comercial.
```

## Princípio do produto

O ShamarConnect não deve ser apenas um leitor de mensagens.

Ele precisa ser uma central operacional que una:

- experiência do WhatsApp Web;
- CRM;
- histórico comercial;
- importação de contatos;
- listas revisáveis;
- atendimento;
- automação;
- IA;
- relatórios.

## Paridade mínima com WhatsApp Web

### 1. Conexão

Status atual: iniciado.

Recursos necessários:

- Conectar por QR Code.
- Mostrar status da conexão.
- Mostrar telefone conectado.
- Reconectar quando cair.
- Desconectar sessão.
- Avisar erro de autenticação.
- Manter sessão persistente no Railway.

### 2. Lista de conversas

Status atual: iniciado.

Recursos necessários:

- Listar conversas privadas.
- Listar grupos.
- Diferenciar privado e grupo.
- Mostrar nome da conversa.
- Mostrar última mensagem.
- Mostrar horário da última mensagem.
- Mostrar contador de não lidas.
- Atualizar lista manualmente.
- Atualização automática em intervalo configurável.
- Pesquisar conversa.
- Fixar conversa no topo.
- Arquivar conversa.
- Marcar como importante no ShamarConnect.

### 3. Leitura de mensagens

Status atual: iniciado.

Recursos necessários:

- Ler histórico recente.
- Escolher quantidade de mensagens: 25, 50, 100, 200.
- Exibir mensagens recebidas.
- Exibir mensagens enviadas.
- Exibir mensagens de grupos com identificação do participante.
- Exibir data e hora.
- Exibir tipo da mensagem.
- Buscar dentro da conversa.
- Filtrar por recebidas/enviadas.
- Salvar manualmente mensagens selecionadas.
- Salvar conversa inteira com confirmação.
- Marcar mensagens como importantes.
- Vincular mensagem a contato, oportunidade ou atendimento.

### 4. Envio de mensagens

Status atual: iniciado.

Recursos necessários:

- Enviar texto para conversa privada.
- Enviar texto para grupo.
- Salvar mensagem enviada como outbound.
- Recarregar conversa após envio.
- Exibir status de envio.
- Impedir envio se gateway estiver desconectado.
- Suportar quebra de linha.
- Suportar mensagens longas.
- Usar respostas rápidas.
- Usar templates internos.
- Enviar mensagem com variáveis do CRM.

### 5. Mídia e anexos

Status atual: pendente.

Recursos necessários:

- Ler imagem.
- Ler áudio.
- Ler vídeo.
- Ler documento.
- Ler figurinha.
- Ler contato compartilhado.
- Ler localização.
- Enviar imagem.
- Enviar documento.
- Enviar áudio ou arquivo de áudio.
- Baixar mídia para armazenamento controlado.
- Salvar metadados da mídia no Supabase.

### 6. Grupos

Status atual: iniciado.

Recursos necessários:

- Listar grupos.
- Ler mensagens de grupos.
- Enviar mensagens em grupos.
- Exportar participantes.
- Salvar participantes no CRM.
- Criar lista rascunho.
- Aprovar/reprovar contatos.
- Exportar CSV real.
- Identificar administradores.
- Mostrar número de participantes.
- Sincronizar dados do grupo.
- Criar etiquetas por grupo de origem.

### 7. Contatos

Status atual: iniciado.

Recursos necessários:

- Salvar contato individual no CRM.
- Atualizar contato existente.
- Importar contatos de grupos.
- Importar contatos por TXT.
- Importar contatos por CSV.
- Importar contatos por planilha copiada.
- Importar contatos exportados do Google.
- Importar contatos exportados da Microsoft.
- Remover duplicados.
- Definir status de consentimento.
- Criar etiquetas automáticas.
- Pesquisar contatos.
- Segmentar contatos.

### 8. Recursos do WhatsApp que ainda precisam ser avaliados

Recursos que devem ser pesquisados e testados no gateway antes de prometer implementação completa:

- Reações a mensagens.
- Responder mensagem específica.
- Encaminhar mensagem.
- Apagar mensagem.
- Editar mensagem, caso disponível na biblioteca usada.
- Status/Stories.
- Canais.
- Comunidades.
- Enquetes.
- Eventos em grupos.
- Chamadas de voz.
- Chamadas de vídeo.
- Mensagens temporárias.
- Mensagens fixadas.
- Favoritos/estreladas.
- Menções em grupos.
- Catálogo do WhatsApp Business.

Nem todos esses recursos são necessariamente suportados pela biblioteca `whatsapp-web.js` ou adequados para uso em ambiente comercial. Cada item deve ser validado tecnicamente.

## Recursos além do WhatsApp Web

### 1. CRM

- Criar/editar contato.
- Ver histórico do contato.
- Adicionar tags.
- Ver origem do contato.
- Consentimento: unknown, opted_in, opted_out.
- Vínculo com oportunidade.
- Vínculo com empresa.
- Observações internas.

### 2. Funil comercial

- Criar oportunidade a partir de conversa.
- Mover oportunidade de etapa.
- Registrar último contato.
- Criar tarefas de follow-up.
- Associar mensagens importantes ao negócio.

### 3. IA

- Resumir conversa.
- Sugerir resposta.
- Classificar intenção.
- Classificar lead quente/frio.
- Extrair dados do cliente.
- Gerar follow-up.
- Criar resumo para CRM.
- Identificar objeções.

### 4. Automação

- Respostas rápidas.
- Fluxos simples.
- Gatilhos por palavra-chave.
- Gatilhos por etiqueta.
- Gatilhos por origem.
- Lembretes de follow-up.
- Notificações internas.

### 5. Listas e campanhas

- Criar listas manuais.
- Criar listas por importação.
- Criar listas por grupo.
- Revisar contatos antes de campanha.
- Aprovar/reprovar contatos.
- Exportar CSV.
- Filtrar por consentimento.
- Evitar envio para opt-out.

### 6. Auditoria e segurança

- Registrar mensagens enviadas pela plataforma.
- Registrar importações.
- Registrar aprovações/reprovações.
- Registrar exportações CSV.
- Registrar erros do gateway.
- Controlar quem pode enviar mensagens.
- Controlar quem pode exportar contatos.

## Priorização de implementação

### Fase 1 — Base operacional

- Conexão QR Code.
- Status pronto/conectado.
- Lista de conversas.
- Leitura de mensagens.
- Envio de texto.
- Salvar mensagens selecionadas.
- Salvar mensagens enviadas.
- Exportar contatos de grupos.
- Revisar listas importadas.
- Exportar CSV.

### Fase 2 — Experiência estilo WhatsApp Web

- Visual em balões de conversa.
- Busca de conversas.
- Busca dentro da conversa.
- Atualização automática.
- Filtro de grupos/privados.
- Exibição de última mensagem.
- Suporte melhor para grupos.
- Respostas rápidas.

### Fase 3 — Mídia e anexos

- Ler mídia.
- Baixar mídia.
- Enviar imagem/documento.
- Salvar metadados.
- Visualizar mídia na conversa.

### Fase 4 — CRM avançado

- Perfil lateral do contato.
- Tags.
- Oportunidades.
- Tarefas.
- Histórico.
- Notas internas.

### Fase 5 — IA e automação

- Resumo de conversa.
- Sugestão de resposta.
- Classificação de leads.
- Fluxos por palavra-chave.
- Follow-up automático.

### Fase 6 — API oficial

- Mapear tudo que foi validado no WhatsApp Web Lab.
- Separar o que é permitido na Cloud API.
- Migrar envio/recebimento oficial para Meta Cloud API.
- Manter WhatsApp Web Lab apenas como ambiente experimental.

## Observação estratégica

O WhatsApp Web Lab serve para pesquisa, prototipagem e validação rápida.

A versão comercial definitiva precisa respeitar limites, permissões e regras da API oficial da Meta, especialmente em campanhas, templates, opt-in e automações.
