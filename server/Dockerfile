# Imagem mais “tranquila” (Debian) para evitar pepinos de OpenSSL/Prisma
FROM node:20-slim

WORKDIR /app

# Instala dependências SEM exigir package-lock
COPY package.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Gera Prisma Client e builda TS
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Aplica migrações e inicia
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]