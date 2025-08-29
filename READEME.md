# ShortTrack

Encurtador de links com analytics (client + server).

## Tecnologias
- Vite + React + Tailwind
- Express + Prisma (SQLite)
- JWT auth, OTP por SMS (mock), QR code

## Como rodar

```bash
# Server
cp server/.env.example server/.env
cd server
npm i
npx prisma migrate dev --name init
npm run dev
