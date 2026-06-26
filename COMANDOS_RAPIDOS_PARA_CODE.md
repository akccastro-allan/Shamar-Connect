# Comandos rápidos para o Code executar no início

```bash
git status
git checkout main
git pull origin main
git checkout -b chore/marco-0-seguranca-diretrizes
npm install
npm run build
```

Se `npm run typecheck` existir:

```bash
npm run typecheck
```

Localizar pontos críticos:

```bash
grep -R "EVOLUTION_TENANT_ID\|EVOLUTION_ORGANIZATION_ID\|EVOLUTION_INSTANCE" -n app lib gateway supabase || true
grep -R "provider ===\|conversation.provider" -n app lib || true
grep -R "public_read\|USING (true)\|TO anon\|anon" -n supabase/migrations || true
grep -R "department_id" -n app lib supabase || true
grep -R "social_accounts\|instagram\|messenger" -n app lib supabase || true
```

Verificar arquivos de ambiente versionados:

```bash
git ls-files | grep -E '(^|/)\.env($|\.|local|production|development)'
```

Corrigir `.gitignore`:

```bash
cat >> .gitignore <<'EOF'

# Environment files
.env
.env.*
!.env.example
EOF
```

Remover `.env.local` do tracking sem apagar local:

```bash
git rm --cached .env.local
```

Criar branch de trabalho do Marco 0:

```bash
git checkout -b chore/marco-0-base-segura
```

Relatório final obrigatório:

```text
O que foi alterado
Migrations criadas/aplicadas
Arquivos principais
Testes executados
Riscos restantes
Como validar manualmente
Commit
Próximo marco recomendado
```
