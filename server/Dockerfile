# server/Dockerfile
FROM node:20-slim

WORKDIR /app

# 1) Dependências nativas que o Prisma detecta (evita warning/erros)
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# 2) Copia manifestos + PRISMA antes do npm install (postinstall precisa do schema)
COPY package.json package-lock.json ./
COPY prisma ./prisma

# 3) Instala deps (executa postinstall -> prisma generate)
RUN npm ci

# 4) Copia o resto do código e builda TS
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# 5) Aplica migrações e inicia
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]