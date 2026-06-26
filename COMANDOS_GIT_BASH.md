# Comandos — subir diretrizes no repositório

## 1. Entrar ou clonar o repositório

Se já tiver o projeto local:

```bash
cd /d/moriah-systems/Shamar-Connect
```

Se ainda não tiver:

```bash
cd /d/moriah-systems
git clone https://github.com/akccastro-allan/Shamar-Connect.git
cd Shamar-Connect
```

## 2. Atualizar branch principal

```bash
git checkout main
git pull origin main
git status
```

## 3. Criar branch de documentação

```bash
git checkout -b docs/mvp-vendavel-omnichannel
```

## 4. Copiar arquivos do pacote

Extraia o ZIP baixado e copie mantendo a estrutura.

Exemplo, se você extraiu em Downloads:

```bash
mkdir -p docs/strategy docs/decisions docs/ops

cp -R /c/Users/Allan/Downloads/shamar_connect_pacote_final/docs/strategy/* docs/strategy/
cp -R /c/Users/Allan/Downloads/shamar_connect_pacote_final/docs/decisions/* docs/decisions/
cp -R /c/Users/Allan/Downloads/shamar_connect_pacote_final/docs/ops/* docs/ops/
cp /c/Users/Allan/Downloads/shamar_connect_pacote_final/PROMPT_CODE_MARCO_0.md .
cp /c/Users/Allan/Downloads/shamar_connect_pacote_final/PROMPT_CODE_MARCOS_1_A_6.md .
cp /c/Users/Allan/Downloads/shamar_connect_pacote_final/README_ORDEM_DE_USO.md .
```

Se o caminho da pasta extraída for diferente, ajuste somente essa parte:

```bash
/c/Users/Allan/Downloads/shamar_connect_pacote_final
```

## 5. Conferir arquivos

```bash
find docs/strategy docs/decisions docs/ops -maxdepth 2 -type f | sort
ls -la PROMPT_CODE_MARCO_0.md PROMPT_CODE_MARCOS_1_A_6.md README_ORDEM_DE_USO.md
git status
```

## 6. Commitar

```bash
git add   README_ORDEM_DE_USO.md   PROMPT_CODE_MARCO_0.md   PROMPT_CODE_MARCOS_1_A_6.md   docs/strategy/MVP_VENDAVEL_4_OPERACOES.md   docs/decisions/0003-channel-bound-routing.md   docs/decisions/0004-human-first-automation.md   docs/decisions/0005-shamar-notifications-kids-events.md   docs/decisions/0006-shamar-agent-datashow-safe-mode.md   docs/ops/IMPLANTACOES_HALL_LIPS_ALLAN_CLINICA.md

git commit -m "docs: define mvp vendavel omnichannel"
git push -u origin docs/mvp-vendavel-omnichannel
```

## 7. Rodar validação local antes do Code

```bash
npm install
npm run build
```

Se existir typecheck:

```bash
npm run typecheck
```

Se não existir, registrar para o Code criar no Marco 0.

## 8. Prompt para entregar ao Code

Depois do commit, entregue primeiro este arquivo ao Code:

```text
PROMPT_CODE_MARCO_0.md
```

Somente depois do Marco 0 aprovado, entregue:

```text
PROMPT_CODE_MARCOS_1_A_6.md
```

## 9. Comando útil para conferir segredo acidental

Antes de cada commit:

```bash
git diff --cached
```

Nunca commitar:

```text
.env
.env.local
.env.production
tokens
service_role
access_token
refresh_token
webhook secret
```
