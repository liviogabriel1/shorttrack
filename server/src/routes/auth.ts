import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// ⚠️ adicionar .js
import { prisma } from "../prisma.js";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const router = Router()
const nano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 32)

// ===== Helpers ==============================================================
function signToken(payload: object) {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' })
}
function inNMinutes(n: number) {
    return new Date(Date.now() + n * 60 * 1000)
}
function normalizePhone(raw?: string | null) {
    if (!raw) return null
    const p = parsePhoneNumberFromString(raw)
    if (!p || !p.isValid()) return null
    return p.number // E.164 com '+'
}

// ===== Registro =============================================================
router.post('/register', async (req, res) => {
    const schema = z.object({
        name: z.string().min(2, 'Nome obrigatório'),
        email: z.string().email('E-mail inválido'),
        password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
        phone: z.string().trim().optional(), // E.164 (+<ddi>...)
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message })

    const { name, email, password, phone } = parsed.data

    try {
        const exists = await prisma.user.findUnique({ where: { email } })
        if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' })

        const phoneE164 = normalizePhone(phone)
        if (phone && !phoneE164) return res.status(400).json({ error: 'Telefone inválido' })
        if (phoneE164) {
            const phoneUsed = await prisma.user.findFirst({ where: { phone: phoneE164 } })
            if (phoneUsed) return res.status(409).json({ error: 'Telefone já cadastrado' })
        }

        const hash = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: { name, email, password: hash, phone: phoneE164 ?? null },
        })

        const token = signToken({ uid: user.id })
        return res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        })
    } catch (e: any) {
        if (e?.code === 'P2002') return res.status(409).json({ error: 'E-mail/telefone já cadastrado' })
        console.error(e)
        return res.status(500).json({ error: 'Erro ao registrar' })
    }
})

// ===== Login (e-mail/senha) =================================================
router.post('/login', async (req, res) => {
    const schema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })

    const { email, password } = parsed.data
    try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })

        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' })

        const token = signToken({ uid: user.id })
        return res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Erro ao entrar' })
    }
})

// ===== OTP por SMS (login com telefone) ====================================
// Handlers reutilizáveis
const requestOtpHandler = async (req: any, res: any) => {
    const schema = z.object({ phone: z.string().min(5) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Telefone inválido' })

    const phoneE164 = normalizePhone(parsed.data.phone)
    if (!phoneE164) return res.status(400).json({ error: 'Telefone inválido' })

    try {
        const user = await prisma.user.findUnique({ where: { phone: phoneE164 } })
        if (!user) return res.status(404).json({ error: 'Telefone não encontrado' })

        const code = String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos
        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: code, otpExpires: inNMinutes(10) },
        })

        // Envie via SMS; em DEV retornamos o código (REMOVA em prod)
        return res.json({ ok: true, code })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Erro ao solicitar SMS' })
    }
}

const verifyOtpHandler = async (req: any, res: any) => {
    const schema = z.object({ phone: z.string().min(5), code: z.string().min(4) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })

    const phoneE164 = normalizePhone(parsed.data.phone)
    if (!phoneE164) return res.status(400).json({ error: 'Telefone inválido' })

    try {
        const user = await prisma.user.findFirst({
            where: {
                phone: phoneE164,
                otpCode: parsed.data.code,
                otpExpires: { gt: new Date() },
            },
        })
        if (!user) return res.status(400).json({ error: 'Código inválido ou expirado' })

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: null, otpExpires: null },
        })

        const token = signToken({ uid: user.id })
        return res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Erro ao verificar SMS' })
    }
}

// Caminhos novos e antigos (para compatibilizar com o teu front)
router.post('/request-otp', requestOtpHandler) // <- o que seu Login.tsx usa
router.post('/login-otp', verifyOtpHandler)    // <- o que seu Login.tsx usa
router.post('/sms/request', requestOtpHandler) // compatibilidade antiga
router.post('/sms/verify', verifyOtpHandler)   // compatibilidade antiga

// ===== Esqueci a senha / Reset =============================================
// Handlers
const forgotHandler = async (req: any, res: any) => {
    const schema = z.object({ email: z.string().email() })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'E-mail inválido' })

    try {
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
        if (!user) return res.json({ ok: true }) // não revela

        const token = nano()
        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken: token, resetExpires: inNMinutes(30) },
        })

        // Em DEV devolvemos o token (REMOVA em produção)
        return res.json({ ok: true, token })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Erro ao iniciar reset' })
    }
}

const resetHandler = async (req: any, res: any) => {
    const schema = z.object({
        token: z.string().min(10),
        password: z.string().min(6),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })

    try {
        const user = await prisma.user.findFirst({
            where: { resetToken: parsed.data.token, resetExpires: { gt: new Date() } },
        })
        if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' })

        const hash = await bcrypt.hash(parsed.data.password, 10)
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hash, resetToken: null, resetExpires: null },
        })

        return res.json({ ok: true })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Erro ao redefinir senha' })
    }
}

// Caminhos novos e antigos
router.post('/forgot-password', forgotHandler) // <- o que seu Login.tsx usa
router.post('/reset-password', resetHandler)  // <- o que seu Login.tsx usa
router.post('/forgot', forgotHandler) // compatibilidade
router.post('/reset', resetHandler)  // compatibilidade

// ===== Me (opcional) ========================================================
router.get('/me', async (req, res) => {
    try {
        const header = req.headers.authorization || ''
        const [, token] = header.split(' ')
        if (!token) return res.status(401).json({ error: 'Sem token' })
        const data = jwt.verify(token, process.env.JWT_SECRET!) as { uid: number }

        const user = await prisma.user.findUnique({
            where: { id: data.uid },
            select: { id: true, name: true, email: true, phone: true, createdAt: true },
        })
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

        return res.json({ user })
    } catch (e) {
        return res.status(401).json({ error: 'Token inválido' })
    }
})

export default router