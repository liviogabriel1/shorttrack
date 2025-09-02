import express from "express";
import cors from "cors";
import type { CorsOptions } from "cors";
import dotenv from "dotenv";
import http from "http";

import authRoutes from "./routes/auth.js";
import linksRoutes, { redirectHandler } from "./routes/links.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.set("trust proxy", true);

// ----- CORS -----
const allowList = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

const corsOptions: CorsOptions = {
    origin(origin, cb) {
        if (!origin) return cb(null, true); // healthchecks/curl
        if (allowList.includes(origin)) return cb(null, true);
        try {
            const { hostname } = new URL(origin);
            if (hostname.endsWith(".vercel.app")) return cb(null, true);
        } catch { }
        return cb(new Error("Not allowed by CORS"));
    },
    credentials: false,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
// -----------------

app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/links", linksRoutes);

// rota de redirecionamento por último (só GET)
app.get("/:slug", redirectHandler);

// Porta compatível com plataformas
const PORT = Number(process.env.PORT ?? 8080);
server.listen(PORT, "0.0.0.0", () => console.log(`ShortTrack API on :${PORT}`));