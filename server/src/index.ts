import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

// ⚠️ adicionar .js
import authRoutes from "./routes/auth.js";
import linksRoutes, { redirectHandler } from "./routes/links.js";

dotenv.config();
const app = express();
const server = http.createServer(app);

app.set("trust proxy", true);
const origins = (process.env.CORS_ORIGIN || "http://localhost:5174").split(",");

app.use(cors({ origin: origins, credentials: false }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/links", linksRoutes);

// rota de redirecionamento por último (só GET)
app.get("/:slug", redirectHandler);

// Porta compatível com plataformas
const PORT = Number(process.env.PORT ?? 8080);
server.listen(PORT, "0.0.0.0", () => console.log(`ShortTrack API on :${PORT}`));