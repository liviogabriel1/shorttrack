import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import QRCode from "qrcode";
import UAParser from "ua-parser-js";
import dayjs from "dayjs";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 7);
const router = Router();

// slugs proibidos para evitar conflito de rotas públicas
const RESERVED = new Set(["api", "health", "favicon.ico"]);

// validações
const linkCreateSchema = z.object({
    url: z.string().url(),
    slug: z.string().trim().min(3).max(24).regex(/^[a-z0-9-]+$/).optional(),
    title: z.string().trim().optional(),
});
const linkUpdateSchema = z.object({
    url: z.string().url().optional(),
    slug: z.string().trim().min(3).max(24).regex(/^[a-z0-9-]+$/).optional(),
    title: z.string().trim().optional(),
});

// helpers
function buildWhere(userId: number, q?: string) {
    const where: any = { userId, deletedAt: null };
    if (q && q.trim()) {
        where.OR = [
            { slug: { contains: q, mode: "insensitive" } },
            { url: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
        ];
    }
    return where;
}

// rate limit simples (memória) no redirect
const RATE: Record<string, { count: number; resetAt: number }> = {};
const WINDOW_MS = 60_000;
const LIMIT = 60;
setInterval(() => {
    const now = Date.now();
    for (const k of Object.keys(RATE)) if (RATE[k].resetAt < now) delete RATE[k];
}, 30_000);

// ------------------- CRUD + analytics (autenticado) -------------------

// LISTA
router.get("/", requireAuth, async (req, res) => {
    const q = String(req.query.q ?? "");
    const page = Math.max(1, Number(req.query.page ?? "1"));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? "10")));

    const where = buildWhere(req.user!.id, q);

    const total = await prisma.link.count({ where });
    const itemsRaw = await prisma.link.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
            id: true,
            slug: true,
            url: true,
            title: true,
            createdAt: true,
            _count: { select: { visits: true } },
        },
    });

    const items = itemsRaw.map((it: (typeof itemsRaw)[number]) => ({
        id: it.id,
        slug: it.slug,
        url: it.url,
        title: it.title,
        createdAt: it.createdAt,
        total: it._count.visits,
    }));

    res.json({ items, total, page, pageSize });
});

// CRIAR
router.post("/", requireAuth, async (req, res) => {
    const parsed = linkCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    let { url, slug, title } = parsed.data;
    if (slug && RESERVED.has(slug)) return res.status(409).json({ error: "Slug reservado" });

    if (!slug) {
        do {
            slug = nano();
        } while (await prisma.link.findUnique({ where: { slug } }));
    } else {
        const exists = await prisma.link.findUnique({ where: { slug } });
        if (exists) return res.status(409).json({ error: "Slug já em uso" });
    }

    const link = await prisma.link.create({
        data: { url, slug, title, userId: req.user!.id },
    });
    res.json(link);
});

// ATUALIZAR
router.put("/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const parsed = linkUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const link = await prisma.link.findFirst({
        where: { id, userId: req.user!.id, deletedAt: null },
    });
    if (!link) return res.status(404).json({ error: "Not found" });

    if (parsed.data.slug) {
        const s = parsed.data.slug;
        if (RESERVED.has(s)) return res.status(409).json({ error: "Slug reservado" });
        const other = await prisma.link.findUnique({ where: { slug: s } });
        if (other && other.id !== link.id) return res.status(409).json({ error: "Slug já em uso" });
    }

    const updated = await prisma.link.update({ where: { id }, data: { ...parsed.data } });
    res.json(updated);
});

// DETALHES + ANALYTICS (30 dias)
router.get("/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const link = await prisma.link.findFirst({
        where: { id, userId: req.user!.id, deletedAt: null },
    });
    if (!link) return res.status(404).json({ error: "Not found" });

    const from = dayjs().subtract(30, "day").toDate();
    const visits = await prisma.visit.findMany({
        where: { linkId: id, createdAt: { gte: from } },
        orderBy: { createdAt: "asc" },
    });

    // tipo inferido de cada item retornado
    type VisitRow = typeof visits[number];

    const byDay: Record<string, number> = {};
    for (let dIdx = 0; dIdx < 30; dIdx++) {
        const d = dayjs().subtract(29 - dIdx, "day").format("YYYY-MM-DD");
        byDay[d] = 0;
    }

    visits.forEach((v: VisitRow) => {
        const d = dayjs(v.createdAt).format("YYYY-MM-DD");
        if (byDay[d] != null) byDay[d] += 1;
    });

    const by = <K extends string>(k: (v: VisitRow) => K) => {
        const out: Record<string, number> = {};
        visits.forEach((v: VisitRow) => {
            const key = (k(v) || "Unknown") as string;
            out[key] = (out[key] || 0) + 1;
        });
        return Object.entries(out)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    };

    const byBrowser = by((v) => v.browser || "");
    const byOS = by((v) => v.os || "");
    const byRef = by((v) => {
        try {
            return new URL(v.referer || "").host || "Direct";
        } catch {
            return v.referer ? "Other" : "Direct";
        }
    });

    res.json({
        link,
        series: Object.entries(byDay).map(([date, value]) => ({ date, value })),
        byBrowser,
        byOS,
        byRef,
    });
});

// DELETAR (soft-delete)
router.delete("/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const link = await prisma.link.findFirst({
        where: { id, userId: req.user!.id, deletedAt: null },
    });
    if (!link) return res.status(404).json({ error: "Not found" });

    await prisma.link.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
});

// QR por id (autenticado)
router.get("/:id/qr", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const link = await prisma.link.findFirst({
        where: { id, userId: req.user!.id, deletedAt: null },
    });
    if (!link) return res.status(404).end();

    const base = process.env.PUBLIC_BASE ?? `http://localhost:${process.env.PORT || 4500}`;
    const url = `${base}/${link.slug}`;
    const png = await QRCode.toBuffer(url, { margin: 1, width: 256 });
    res.setHeader("Content-Type", "image/png");
    res.send(png);
});

// QR público por slug (sem auth)
router.get("/qr/slug/:slug", async (req, res) => {
    const { slug } = req.params as { slug: string };
    const link = await prisma.link.findUnique({ where: { slug } });
    if (!link || link.deletedAt) return res.status(404).end();
    const base = process.env.PUBLIC_BASE ?? `http://localhost:${process.env.PORT || 4500}`;
    const url = `${base}/${link.slug}`;
    const png = await QRCode.toBuffer(url, { margin: 1, width: 256 });
    res.setHeader("Content-Type", "image/png");
    res.send(png);
});

// ------------------- redirect público -------------------
export const redirectHandler = async (req: any, res: any) => {
    const slug = String(req.params.slug || "").toLowerCase();
    if (RESERVED.has(slug)) return res.status(404).send("Not found");

    // rate limit por IP+slug
    const ipKey = (req.ip || "ip") + ":" + slug;
    const now = Date.now();
    const state = RATE[ipKey] ?? { count: 0, resetAt: now + WINDOW_MS };
    if (state.resetAt < now) {
        state.count = 0;
        state.resetAt = now + WINDOW_MS;
    }
    state.count += 1;
    RATE[ipKey] = state;
    if (state.count > LIMIT) return res.status(429).send("Too many requests");

    const link = await prisma.link.findUnique({ where: { slug } });
    if (!link || link.deletedAt) return res.status(404).send("Link not found");

    // coleta básica
    const ua = new UAParser(req.headers["user-agent"]).getResult();
    const lang = String(req.headers["accept-language"] || "").split(",")[0];
    const ref = String(req.headers["referer"] || req.headers["referrer"] || "") || undefined;

    await prisma.visit.create({
        data: {
            linkId: link.id,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            language: lang || undefined,
            referer: ref,
            browser: ua.browser.name || undefined,
            os: ua.os.name || undefined,
            device: ua.device.type || "Desktop",
            country: lang ? lang.split("-")[1] : undefined,
        },
    });

    res.redirect(302, link.url);
};

export default router;