# Shamar Connect — Pacote final de direcionamento

Este pacote consolida as decisões de produto e arquitetura para o Shamar Connect.

## Ordem recomendada

1. Subir os documentos no repositório.
2. Abrir uma branch de documentação/estratégia.
3. Commitar os arquivos.
4. Entregar `PROMPT_CODE_MARCO_0.md` para o Code executar primeiro.
5. Só depois avançar para `PROMPT_CODE_MARCOS_1_A_6.md`.

## Objetivo comercial

Colocar em operação:

1. Hall Donuts;
2. Lips Autopeças / Auto Center;
3. operação multiempresa do Allan/Moriah;
4. demonstração da clínica.

A prioridade é gerar caixa sem criar quatro versões diferentes do sistema.

## Decisões centrais

- WhatsApp Web e API oficial convivem como providers diferentes.
- Um canal pode migrar de Web para oficial sem perder histórico.
- Toda conversa e toda mensagem precisam de `channel_id`.
- Não existe número padrão ou instância padrão.
- Kids e Events começam por notificações informativas e operacionais.
- Clínica segue regra human-first: ninguém fica preso no robô.
- Popup no PC do datashow/projeção deve usar modo seguro.
- Motivo da chamada não vai para pai/responsável; fica apenas como nota interna restrita.
