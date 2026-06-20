# Google OAuth — Guia de Configuração

## Status atual

O fluxo OAuth já está implementado:

- **`/api/auth/oauth`** — inicia o fluxo via Supabase Auth (`signInWithOAuth`)
- **`/api/auth/callback`** — recebe o `code`, troca pela sessão, cria cookie HMAC
- **`/login`** — botão "Entrar com Google" aponta para `/api/auth/oauth?provider=google`

Para ativar, são necessários apenas dois passos: configurar o Google Cloud Console e habilitar no Supabase.

---

## Passo 1 — Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Crie um projeto (ou use um existente)
3. Vá em **APIs & Services → Credentials**
4. Clique em **Create Credentials → OAuth 2.0 Client ID**
5. Tipo de aplicação: **Web application**

### Authorized JavaScript origins

```
https://www.shamarconnect.com.br
https://shamarconnect.com.br
```

### Authorized redirect URIs

```
https://bbcxqvgdsdntwojjpwoz.supabase.co/auth/v1/callback
```

> **Atenção:** O Supabase recebe o callback do Google e em seguida redireciona para  
> `https://www.shamarconnect.com.br/api/auth/callback`  
> por isso o único redirect URI que o Google precisa conhecer é o do Supabase.

6. Copie **Client ID** e **Client Secret**

---

## Passo 2 — Supabase Dashboard

1. Acesse https://supabase.com/dashboard/project/bbcxqvgdsdntwojjpwoz
2. Vá em **Authentication → Providers → Google**
3. Habilite Google OAuth
4. Cole **Client ID** e **Client Secret** copiados do Google
5. Salve

> Nenhuma variável de ambiente adicional é necessária no `.env.local` — o Supabase gerencia as credenciais internamente.

---

## Passo 3 — Testar

Acesse `/login` e clique em **Entrar com Google**. O fluxo:

```
/login
  → /api/auth/oauth?provider=google
  → Supabase Auth → Google OAuth
  → https://bbcxqvgdsdntwojjpwoz.supabase.co/auth/v1/callback
  → /api/auth/callback?code=...
  → verifica app_users + tenant_users no banco
  → cria cookie HMAC shamar_connect_session
  → redireciona para /dashboard
```

**Requisito de segurança:** O e-mail Google do usuário deve existir em `app_users` com `status = 'active'` e ter um `tenant_users` ativo associado. Caso contrário, o usuário é redirecionado para `/planos?reason=not-authorized`.

---

## Comportamento atual sem configuração

Se Google OAuth não estiver configurado no Supabase, o botão redireciona para  
`/login?error=oauth_failed` com a mensagem de erro da tela de login.  
Não quebra — apenas falha graciosamente.

---

## Provedores adicionais suportados

O código também suporta `github` e `azure` (via `?provider=github` ou `?provider=azure`),  
mas o botão na UI atualmente só expõe Google.
