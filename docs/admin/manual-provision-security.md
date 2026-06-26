# Segurança — rota manual de provisionamento

A rota abaixo ainda deve ser revisada antes de uso operacional amplo:

```txt
app/api/admin/provision-client/route.ts
```

## Ajuste recomendado

Além de exigir `role = owner/admin`, ela deve exigir:

```ts
context.isPlatformTenant === true
```

Mensagem sugerida:

```ts
return NextResponse.json(
  { ok: false, error: "Acesso restrito a administradores da plataforma." },
  { status: 403 },
);
```

## Motivo

Provisionamento manual cria tenant, organização, usuário Auth, `app_users`, `tenant_users` e canais. Essa ação deve ser exclusiva da plataforma, não de administradores de tenants de clientes.

## Status

O painel de implantação assistida já aplica essa restrição nas rotas novas. Esta rota legada/manual deve ser ajustada em PR pequeno separado ou removida se não for mais necessária.
