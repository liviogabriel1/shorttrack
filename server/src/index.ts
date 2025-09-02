import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import authRoutes from "./routes/auth";
import linksRoutes, { redirectHandler } from "./routes/links";

dotenv.config();
const app = express();
const server = http.createServer(app);

app.set("trust proxy", true); // pra pegar IP atrás de proxy
const origins = (process.env.CORS_ORIGIN || "http://localhost:5174").split(",");

app.use(cors({ origin: origins, credentials: false }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/links", linksRoutes);

// rota de redirecionamento por último (só GET)
app.get("/:slug", redirectHandler);

const PORT = Number(process.env.PORT) || 4500;
server.listen(PORT, () => console.log(`ShortTrack API on :${PORT}`));