# Importação por arquivos e revisão de listas de grupos

Este documento registra a decisão de tratar Google e Microsoft inicialmente por arquivos exportados, deixando OAuth para uma fase posterior.

## Decisão atual

Google Contacts e Microsoft Outlook/People não serão integrados via OAuth neste momento.

No MVP, eles entram por exportação de arquivos:

- Google Contacts exportado como CSV.
- Microsoft Outlook/People exportado como CSV.
- TXT simples.
- CSV padrão.
- Planilhas copiadas do Excel, Google Sheets ou LibreOffice.

Essa decisão reduz complexidade inicial e permite validar o fluxo de importação antes de lidar com credenciais, consentimento OAuth, callbacks e permissões externas.

## Fluxo de importação por arquivos

Página principal:

```txt
/contact-import
```

O usuário pode colar dados exportados de arquivos ou planilhas.

Endpoint:

```txt
POST /api/contacts/import-text
```

Tabela de destino:

```txt
crm_contacts
```

Regra padrão:

```txt
consent_status = unknown
```

## Fontes consideradas

### Google Contacts

Fluxo inicial:

1. Exportar contatos do Google Contacts em CSV.
2. Abrir o arquivo no Excel, Google Sheets ou editor de texto.
3. Copiar os dados.
4. Colar em `/contact-import`.
5. Importar para o CRM.

### Microsoft Outlook/People

Fluxo inicial:

1. Exportar contatos do Microsoft Outlook/People em CSV.
2. Abrir o arquivo no Excel ou editor de texto.
3. Copiar os dados.
4. Colar em `/contact-import`.
5. Importar para o CRM.

## Revisão de listas importadas de grupos

Página criada:

```txt
/group-import-lists
```

Objetivo:

- Visualizar listas importadas de grupos do WhatsApp.
- Ver contatos de cada lista.
- Aprovar contatos.
- Reprovar contatos.
- Exportar CSV real.

## Banco de dados

Migration criada:

```txt
supabase/migrations/0002_group_import_review_status.sql
```

Campo adicionado:

```txt
review_status
```

Valores permitidos:

```txt
pending
approved
rejected
```

Tabela alterada:

```txt
group_contact_list_items
```

## Endpoints criados

### Listar listas importadas

```txt
GET /api/group-contact-lists
```

### Listar contatos de uma lista

```txt
GET /api/group-contact-lists/[listId]/items
```

### Atualizar status de revisão

```txt
PATCH /api/group-contact-lists/[listId]/items
```

Payload:

```json
{
  "itemId": "id-do-contato-na-lista",
  "reviewStatus": "approved"
}
```

Valores aceitos:

```txt
pending
approved
rejected
```

### Exportar CSV real

```txt
GET /api/group-contact-lists/[listId]/export.csv
```

O endpoint retorna arquivo CSV com cabeçalhos:

```txt
nome, telefone, grupo, consentimento, crm_status, review_status, criado_em
```

## Interface criada

Componente:

```txt
components/group-import-lists-panel.tsx
```

Página:

```txt
app/group-import-lists/page.tsx
```

Menu:

```txt
Listas importadas
```

## Próximos passos

1. Rodar a migration `0002_group_import_review_status.sql` no Supabase.
2. Criar pré-visualização de importação de arquivos antes de salvar.
3. Criar upload real de `.txt` e `.csv`.
4. Adicionar leitura de `.xlsx`.
5. Criar histórico de importações gerais.
6. Criar filtros nas listas importadas.
7. Criar ação em massa para aprovar/reprovar.
8. Avaliar OAuth Google e Microsoft depois que o fluxo por arquivo estiver validado.
