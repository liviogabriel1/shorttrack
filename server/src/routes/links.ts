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

/* ====================== Schemas ====================== */
const linkCreateSchema = z.object({
    url: z.string().url(),
    slug: z
        .string()
        .trim()
        .min(3)
        .max(24)
        .regex(/^[a-z0-9-]+$/)
        .optional(),
    title: z.string().trim().optional(),
});

const linkUpdateSchema = z.object({
    url: z.string().url().optional(),
    slug: z
        .string()
        .trim()
        .min(3)
        .max(24)
        .regex(/^[a-z0-9-]+$/)
        .optional(),
    title: z.string().trim().optional(),
});

/* ====================== Helpers ====================== */
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

/* ====================== LISTAR ====================== */
// GET /api/links?q=&page=&pageSize=
router.get("/", requireAuth, async (req, res) => {
    const q = String(req.query.q ?? "");
    const page = Math.max(1, Number(req.query.page ?? 1) | 0);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20) | 0));
    const userId = req.user!.id;

    const where = buildWhere(userId, q);

    const [itemsRaw, total] = await Promise.all([
        prisma.link.findMany({
            where,
            orderBy: { id: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { _count: { select: { visits: true } } },
        }),
        prisma.link.count({ where }),
    ]);

    const items = itemsRaw.map((it) => ({
        id: it.id,
        slug: it.slug,
        url: it.url,
        title: it.title,
        createdAt: it.createdAt,
        total: it._count.visits,
    }));

    return res.json({ items, total, page, pageSize });
});

/* ====================== DETALHE ====================== */
// GET /api/links/:id
router.get("/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const link = await prisma.link.findFirst({
        where: { id, userId, deletedAt: null },
    });
    if (!link) return res.status(404).json({ error: "Link não encontrado" });

    return res.json(link);
});

/* ====================== QR POR ID ====================== */
// GET /api/links/:id/qr
router.get("/:id/qr", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const link = await prisma.link.findFirst({
        where: { id, userId, deletedAt: null },
    });
    if (!link) return res.status(404).json({ error: "Link não encontrado" });

    const publicBase = process.env.PUBLIC_BASE || "http://localhost:4500";
    const target = `${publicBase.replace(/\/+$/, "")}/${link.slug}`;

    const png = await QRCode.toBuffer(target, { scale: 6, margin: 1 });
    res.setHeader("Content-Type", "image/png");
    return res.send(png);
});

/* ====================== QR POR SLUG (público) ====================== */
// GET /api/links/qr/slug/:slug
router.get("/qr/slug/:slug", async (req, res) => {
    const { slug } = req.params as { slug: string };
    const publicBase = process.env.PUBLIC_BASE || "http://localhost:4500";
    const target = `${publicBase.replace(/\/+$/, "")}/${slug}`;

    const png = await QRCode.toBuffer(target, { scale: 6, margin: 1 });
    res.setHeader("Content-Type", "image/png");
    return res.send(png);
});

/* ====================== CRIAR ====================== */
// POST /api/links
router.post("/", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;

        const parsed = linkCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Dados inválidos" });
        }

        const { url, title, slug: slugFromBody } = parsed.data;

        // gerar/validar slug
        let slug = (slugFromBody ?? "").trim();
        if (!slug) {
            do {
                slug = nano();
            } while (await prisma.link.findUnique({ where: { slug } }));
        } else {
            if (RESERVED.has(slug)) {
                return res.status(409).json({ error: "Slug reservado" });
            }
            const exists = await prisma.link.findUnique({ where: { slug } });
            if (exists) return res.status(409).json({ error: "Slug já em uso" });
        }

        const link = await prisma.link.create({
            data: {
                url,
                slug,
                title: title ?? null, // use null, não undefined
                userId,               // relação obrigatória
            },
        });

        return res.status(201).json(link);
    } catch (e) {
        console.error("POST /api/links error:", e);
        return res.status(500).json({ error: "Erro ao criar link" });
    }
});

/* ====================== ATUALIZAR ====================== */
// PUT /api/links/:id
router.put("/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const parsed = linkUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos" });
    }

    const current = await prisma.link.findFirst({
        where: { id, userId, deletedAt: null },
    });
    if (!current) return res.status(404).json({ error: "Link não encontrado" });

    const data: any = {};
    if (parsed.data.url) data.url = parsed.data.url;
    if (typeof parsed.data.title !== "undefined") data.title = parsed.data.title ?? null;

    if (parsed.data.slug && parsed.data.slug !== current.slug) {
        if (RESERVED.has(parsed.data.slug)) {
            return res.status(409).json({ error: "Slug reservado" });
        }
        const exists = await prisma.link.findUnique({ where: { slug: parsed.data.slug } });
        if (exists) return res.status(409).json({ error: "Slug já em uso" });
        data.slug = parsed.data.slug;
    }

    const updated = await prisma.link.update({
        where: { id },
        data,
    });

    return res.json(updated);
});

/* ====================== DELETAR (soft delete) ====================== */
// DELETE /api/links/:id
router.delete("/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const current = await prisma.link.findFirst({
        where: { id, userId, deletedAt: null },
    });
    if (!current) return res.status(404).json({ error: "Link não encontrado" });

    await prisma.link.update({
        where: { id },
        data: { deletedAt: new Date() },
    });

    return res.status(204).send();
});

/* ====================== REDIRECT (público) ====================== */
// GET /:slug (definido no index.ts depois das APIs)
export const redirectHandler = async (req: any, res: any) => {
    const { slug } = req.params as { slug: string };

    const link = await prisma.link.findFirst({
        where: { slug, deletedAt: null },
    });
    if (!link) return res.status(404).send("Not found");

    // registrar visita (best-effort)
    try {
        const parser = new UAParser(req.headers["user-agent"]);
        const ua = parser.getResult();
        const ref = (req.headers.referer as string | undefined) || undefined;
        const lang = (req.headers["accept-language"] as string | undefined) || undefined;

        await prisma.visit.create({
            data: {
                linkId: link.id,
                createdAt: new Date(),
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
    } catch (e) {
        // não interrompe o redirect
        console.warn("visit log failed:", e);
    }

    return res.redirect(302, link.url);
};

/* ====================== STATS (últimos 30 dias) ====================== */
// GET /api/links/:id/stats
router.get("/:id/stats", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user!.id;

    const link = await prisma.link.findFirst({
        where: { id, userId, deletedAt: null },
        select: { id: true, slug: true, url: true, title: true, createdAt: true },
    });
    if (!link) return res.status(404).json({ error: "Link não encontrado" });

    // janela dos últimos 30 dias (inclui hoje)
    const end = dayjs().endOf("day");
    const start = end.subtract(29, "day").startOf("day");

    const visits = await prisma.visit.findMany({
        where: { linkId: link.id, createdAt: { gte: start.toDate(), lte: end.toDate() } },
        select: { createdAt: true, browser: true, os: true, referer: true },
    });

    // série diária
    const dayBuckets = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
        const d = start.add(i, "day").format("YYYY-MM-DD");
        dayBuckets.set(d, 0);
    }
    for (const v of visits) {
        const d = dayjs(v.createdAt).format("YYYY-MM-DD");
        if (dayBuckets.has(d)) dayBuckets.set(d, (dayBuckets.get(d) || 0) + 1);
    }
    const series = Array.from(dayBuckets.entries()).map(([date, value]) => ({ date, value }));

    // breakdown helpers
    function topKV(arr: (string | null | undefined)[], max = 6) {
        const m = new Map<string, number>();
        for (const raw of arr) {
            const k = String(raw || "N/A");
            m.set(k, (m.get(k) || 0) + 1);
        }
        const all = Array.from(m.entries()).map(([key, value]) => ({ key, value }));
        all.sort((a, b) => b.value - a.value);
        const top = all.slice(0, max);
        const others = all.slice(max);
        const othersSum = others.reduce((acc, x) => acc + x.value, 0);
        if (othersSum > 0) top.push({ key: "Outros", value: othersSum });
        return top;
    }

    const byBrowser = topKV(visits.map(v => v.browser));
    const byOS = topKV(visits.map(v => v.os));
    const byRef = topKV(visits.map(v => v.referer));

    return res.json({
        link,
        series,
        byBrowser,
        byOS,
        byRef,
    });
});

export default router;