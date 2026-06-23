FROM node:24-bookworm-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

RUN mkdir -p /data/.wwebjs_auth

# IMPORTANTE: o volume do Railway é montado em /data como root. Se o processo
# rodar como `node`, ele não consegue escrever a sessão (EACCES) e o gateway
# cai ao conectar. Rodamos como root + garantimos a pasta gravável no start.
EXPOSE 8787

CMD ["sh", "-c", "mkdir -p /data/.wwebjs_auth && chmod -R 777 /data && npm start"]
