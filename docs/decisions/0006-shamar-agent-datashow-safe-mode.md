# ADR 0006 — Shamar Agent e modo seguro para datashow/projeção

## Status

Aprovado.

## Contexto

O Shamar Kids pode precisar avisar o pessoal do datashow/projeção ou liderança no meio do culto/evento.

O PC do datashow pode estar ligado ao telão. Portanto, notificações visuais não podem expor dados de criança, telefone, motivo ou qualquer informação sensível.

## Decisão

Criar suporte a notificação interna via:

- Shamar Agent no PC;
- painel web;
- WhatsApp interno de equipe.

O Shamar Agent no PC da projeção/datashow deve ter **modo seguro**.

## Modo seguro

Quando `safe_projection_mode = true`, o popup:

- não mostra nome completo;
- não mostra telefone;
- não mostra motivo;
- não mostra observação interna;
- não abre janela grande;
- não rouba foco do software de projeção;
- não aparece com conteúdo sensível em tela cheia.

Mensagem permitida:

```text
Shamar Kids
Há uma chamada do Ministério Infantil. Verifique o painel.
```

Ou:

```text
Shamar Kids
Responsável solicitado no Ministério Infantil.
```

## Painel autorizado

Detalhes completos aparecem somente no painel restrito:

```text
criança
responsável
tipo de chamada
status
quem chamou
horário
nota interna, se houver
```

## Escalonamento

Se o popup não for confirmado:

```text
popup enviado
  -> sem confirmação em X segundos
  -> WhatsApp para líder
  -> sem confirmação em Y segundos
  -> WhatsApp para coordenação
```

## Eventos auditados

Toda notificação interna deve registrar:

- origem;
- destino;
- canal usado;
- conteúdo/template;
- quem disparou;
- status;
- confirmação;
- horário;
- erro, se houver.

## Fora de escopo inicial

- controle remoto do PC;
- captura de tela;
- leitura de arquivos locais;
- qualquer automação que interfira no software de projeção.
