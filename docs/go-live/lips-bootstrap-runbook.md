# Runbook: Integridade do Go-Live da Lips

Este runbook cobre apenas a captura read-only de integridade no Centro de Comando.
Ele nao executa bootstrap, incremental, scheduler, envio de mensagens, migrations ou deploy manual.

## Escopo Fixo

- Empresa: Auto Pecas e Auto Center Lips
- Sessao: `lips-main`
- Provider: OpenWA
- Ambiente do gateway: Production
- tenant_id: fixo server-side
- organization_id: fixo server-side
- channel_id: fixo server-side
- gateway_id: fixo server-side

O navegador nao envia IDs. A Server Action valida os IDs fixos antes de consultar os contadores.

## Captura Pre

1. Acessar `/operations/diagnostics/whatsapp-sync` com usuario do Centro de Comando.
2. Clicar em `Capturar integridade Lips`.
3. Confirmar que `Read-only preservado` esta como `sim`.
4. Baixar o JSON `lips-go-live-integrity-YYYYMMDD-HHmm.json`.
5. Guardar este arquivo como baseline pre-operacao.

## Captura Pos

1. Voltar a `/operations/diagnostics/whatsapp-sync` apos a operacao autorizada fora desta ferramenta.
2. Clicar novamente em `Capturar integridade Lips`.
3. Comparar o delta local exibido no navegador contra a primeira captura.
4. Baixar o novo JSON.

## Criterios De Bloqueio

- `syncState` diferente de `1`.
- `locks` maior que `0`.
- Conversas diminuiram entre baseline e captura atual.
- Mensagens diminuiram entre baseline e captura atual.
- Runs diminuiram entre baseline e captura atual.
- A propria captura alterou contadores ou campos de fila.

## Criterios De Revisao Manual

- Gateway nao retorna `lips-main` conectado.
- `pendingRuns` maior que `0`.
- `failedRuns` cresceu.
- `queueStatusNull` cresceu.

## Dados Sensiveis

O relatorio nao deve conter URL do gateway, token, telefone bruto, chat ID bruto, message ID bruto ou UUID completo do canal.
IDs tecnicos sao mascarados e conversas aparecem apenas como fingerprints SHA-256.
