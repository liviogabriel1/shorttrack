FROM node:20-alpine

WORKDIR /app

# Instala dependências pelo lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copia o resto
COPY . .

# Gera Prisma Client e builda TS
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Aplica migrações e inicia
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]
