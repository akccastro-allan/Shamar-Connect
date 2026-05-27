# Shamar WhatsApp Web Gateway

Gateway experimental para conectar o ShamarConnect ao WhatsApp Web usando `whatsapp-web.js`.

> Uso recomendado: laboratório/MVP controlado. Para produção definitiva, migrar para Meta WhatsApp Cloud API.

## Requisitos no Hostinger VPS

- Ubuntu 22.04/24.04
- 2 GB RAM ou mais
- acesso SSH root ou usuário sudo
- Docker + Docker Compose plugin
- domínio ou subdomínio apontando para o IP do VPS, recomendado:

```txt
gateway.seudominio.com.br
```

## 1. Acessar o VPS

```bash
ssh root@IP_DO_SEU_VPS
```

## 2. Atualizar o sistema

```bash
apt update && apt upgrade -y
```

## 3. Instalar Docker

```bash
apt install -y ca-certificates curl gnupg git ufw nginx certbot python3-certbot-nginx
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
```

Validar:

```bash
docker --version
docker compose version
```

## 4. Configurar firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Não exponha a porta `8787` publicamente se usar Nginx. O compose expõe localmente para o proxy reverso.

## 5. Clonar o projeto

```bash
mkdir -p /opt/shamar
cd /opt/shamar
git clone https://github.com/akccastro-allan/Shamar-Connect.git
cd Shamar-Connect/gateway/whatsapp-web
```

## 6. Criar `.env`

```bash
cp .env.example .env
nano .env
```

Exemplo:

```env
PORT=8787
GATEWAY_TOKEN=troque-por-token-grande
ALLOWED_ORIGIN=https://SEU-SHAMARCONNECT.vercel.app
SESSION_PATH=/data/.wwebjs_auth
SHAMARCONNECT_WEBHOOK_URL=https://SEU-SHAMARCONNECT.vercel.app/api/provider-events/whatsapp-web
SHAMARCONNECT_WEBHOOK_TOKEN=troque-por-outro-token
```

## 7. Subir o gateway

```bash
docker compose up -d --build
```

Ver logs:

```bash
docker compose logs -f
```

Testar localmente no VPS:

```bash
curl http://localhost:8787/health
```

Testar status com token:

```bash
curl -H "Authorization: Bearer SEU_GATEWAY_TOKEN" http://localhost:8787/status
```

## 8. Configurar Nginx

Criar arquivo:

```bash
nano /etc/nginx/sites-available/shamar-whatsapp-gateway
```

Conteúdo:

```nginx
server {
    listen 80;
    server_name gateway.seudominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ativar:

```bash
ln -s /etc/nginx/sites-available/shamar-whatsapp-gateway /etc/nginx/sites-enabled/shamar-whatsapp-gateway
nginx -t
systemctl reload nginx
```

## 9. Ativar HTTPS

```bash
certbot --nginx -d gateway.seudominio.com.br
```

Testar:

```bash
curl https://gateway.seudominio.com.br/health
curl -H "Authorization: Bearer SEU_GATEWAY_TOKEN" https://gateway.seudominio.com.br/status
```

## 10. Configurar Vercel

No projeto ShamarConnect, adicionar Environment Variables:

```env
NEXT_PUBLIC_ACTIVE_MESSAGING_PROVIDER=whatsapp_web
WHATSAPP_WEB_GATEWAY_URL=https://gateway.seudominio.com.br
WHATSAPP_WEB_GATEWAY_TOKEN=mesmo-token-do-gateway
```

Redeploy na Vercel após salvar.

## 11. Conectar o WhatsApp

Inicializar:

```bash
curl -X POST -H "Authorization: Bearer SEU_GATEWAY_TOKEN" https://gateway.seudominio.com.br/connect
```

Buscar QR:

```bash
curl -H "Authorization: Bearer SEU_GATEWAY_TOKEN" https://gateway.seudominio.com.br/qr
```

O retorno inclui `qrCode` em data URL. A próxima etapa no ShamarConnect será renderizar esse QR diretamente na tela.

## 12. Manutenção

Atualizar código:

```bash
cd /opt/shamar/Shamar-Connect
git pull
cd gateway/whatsapp-web
docker compose up -d --build
```

Ver status:

```bash
docker compose ps
docker compose logs --tail=100
```

Reiniciar:

```bash
docker compose restart
```

Limpar sessão, se necessário:

```bash
docker compose down
 docker volume rm whatsapp-web_shamar_whatsapp_session
 docker compose up -d --build
```

## Segurança

- Use número de teste.
- Não use para disparo em massa.
- Não exponha `/send-message` sem token.
- Use HTTPS.
- Use token longo.
- Mantenha o caminho de migração para Meta Cloud API oficial.
