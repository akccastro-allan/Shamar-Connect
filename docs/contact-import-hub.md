# Contact Import Hub

Este documento registra a criação da central de importação de contatos do ShamarConnect.

## Objetivo

Ampliar a importação de contatos para além do WhatsApp Web, permitindo entrada de dados por múltiplas fontes:

- WhatsApp Web e grupos.
- Colagem manual.
- TXT.
- CSV.
- Planilhas copiadas do Excel ou Google Sheets.
- Google Contacts, em fase futura.
- Microsoft Outlook/People, em fase futura.

## Página criada

```txt
/contact-import
```

Arquivo:

```txt
app/contact-import/page.tsx
```

Componente principal:

```txt
components/contact-import-hub-panel.tsx
```

## Endpoint criado

```txt
POST /api/contacts/import-text
```

Payload esperado:

```json
{
  "source": "manual_paste",
  "text": "Nome;Telefone;Email;Empresa\nJoão Silva;21999999999;joao@email.com;Empresa X"
}
```

Fontes aceitas na primeira versão:

```txt
manual_paste
txt
csv
spreadsheet
```

## Parser criado

Arquivo:

```txt
lib/contacts/import-parser.ts
```

Funções principais:

- `parseContactsFromText`
- `normalizePhone`

O parser aceita linhas separadas por:

- ponto e vírgula `;`
- vírgula `,`
- tabulação
- espaços múltiplos

Também identifica automaticamente:

- nome
- telefone
- e-mail
- empresa, quando informado

## Tabela usada

Os contatos são salvos em:

```txt
crm_contacts
```

Campos principais usados:

```txt
name
phone
email
company
source
consent_status
tags
updated_at
```

## Regra de consentimento

Todo contato importado por arquivo, texto, CSV, planilha, Google, Microsoft ou grupo entra com:

```txt
consent_status = unknown
```

Isso evita tratar contatos importados como leads com autorização automática para campanhas em massa.

## Fontes futuras

### Google Contacts

Para integrar Google Contacts será necessário:

1. Criar credenciais OAuth no Google Cloud.
2. Solicitar escopo de leitura de contatos.
3. Criar callback OAuth na aplicação.
4. Buscar contatos pela People API.
5. Normalizar dados para `crm_contacts`.

Variáveis esperadas futuramente:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

### Microsoft Outlook/People

Para integrar Microsoft será necessário:

1. Criar app no Microsoft Entra ID.
2. Configurar permissões para Microsoft Graph Contacts.
3. Criar callback OAuth na aplicação.
4. Buscar contatos pela Microsoft Graph API.
5. Normalizar dados para `crm_contacts`.

Variáveis esperadas futuramente:

```env
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=
```

## Próximas evoluções

1. Upload real de arquivos `.txt` e `.csv`.
2. Suporte a `.xlsx` com biblioteca de leitura de planilhas.
3. Tela de pré-visualização antes de salvar.
4. Mapeamento manual de colunas.
5. Histórico de importações.
6. Lista de revisão antes de inserir no CRM.
7. Integração OAuth com Google Contacts.
8. Integração OAuth com Microsoft People/Outlook.
9. Regras de opt-in e bloqueio para campanhas em massa.
