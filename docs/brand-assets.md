# Identidade visual do ShamarConnect

Este documento registra a aplicação da logo e do ícone do ShamarConnect no projeto.

## Arquivos principais

A identidade visual foi centralizada nos seguintes arquivos:

```txt
lib/brand/assets.ts
components/brand/brand-logo.tsx
```

### `lib/brand/assets.ts`

Guarda os assets da marca em formato `data:image/webp;base64`:

- `SHAMAR_CONNECT_ICON_DATA_URI`: ícone/símbolo do ShamarConnect.
- `SHAMAR_CONNECT_LOGO_DATA_URI`: logo completa do ShamarConnect.
- `SHAMAR_CONNECT_BRAND_NAME`: nome da marca.

### `components/brand/brand-logo.tsx`

Expõe componentes reutilizáveis:

```tsx
<BrandIcon />
<BrandLogo />
```

Esses componentes devem ser usados sempre que a logo ou o ícone forem necessários no layout.

## Onde a marca foi aplicada

### Home

Arquivo:

```txt
app/page.tsx
```

Aplicação:

- Logo completa no topo da página inicial.
- Botões de acesso ao dashboard e conexão WhatsApp.

### Layout principal / menu lateral

Arquivo:

```txt
components/app-shell.tsx
```

Aplicação:

- Ícone do ShamarConnect no menu lateral.
- Nome da marca ajustado para `ShamarConnect`.
- Subtítulo ajustado para `WhatsApp • CRM • IA`.

## Como atualizar a logo futuramente

1. Otimizar a nova imagem em formato WebP.
2. Converter a imagem para Base64.
3. Atualizar o conteúdo em:

```txt
lib/brand/assets.ts
```

4. Manter o uso dos componentes:

```tsx
<BrandIcon />
<BrandLogo />
```

Assim não será necessário trocar a imagem manualmente em várias telas.

## Observação

As imagens foram mantidas dentro do código como `data URI` para evitar depender de upload manual na pasta `public` via GitHub, já que o fluxo atual está sendo operado diretamente pela integração do repositório.

Quando o projeto estiver mais maduro, a recomendação é migrar os assets para:

```txt
public/brand/shamar-connect-icon.webp
public/brand/shamar-connect-logo.webp
```

E então trocar os componentes para apontarem para esses arquivos públicos.
