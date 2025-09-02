FROM node:20-slim

WORKDIR /app

# OpenSSL para o Prisma detectar a engine certinha
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# Copie manifestos e a pasta prisma ANTES do install (postinstall roda prisma generate)
COPY package.json ./
COPY prisma ./prisma

# Sem lockfile -> npm install
RUN npm install

# Agora copie o restante e builde o TS
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Migrações + start
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]