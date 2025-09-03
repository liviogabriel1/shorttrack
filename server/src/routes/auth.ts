import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { PrismaClient, VerificationType } from "@prisma/client";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { customAlphabet } from "nanoid";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const prisma = new PrismaClient();
const router = Router();
const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 32);

/* ========================= Helpers ========================= */

function signToken(payload: object) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Missing JWT_SECRET");
    return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function inMinutes(n: number) {
    return new Date(Date.now() + n * 60 * 1000);
}

function gen6() {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
}

async function hashCode(code: string) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(code, salt);
}

async function compareCode(code: string, hash: string) {
    return bcrypt.compare(code, hash);
}

function normalizePhone(raw?: string | null) {
    if (!raw) return null;
    const p = parsePhoneNumberFromString(raw);
    if (!p || !p.isValid()) return null;
    return p.number; // E.164 com '+'
}

async function getAuthedUser(req: any) {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) throw new Error("Sem token");
    const data = jwt.verify(token, process.env.JWT_SECRET!) as { uid: number };
    const user = await prisma.user.findUnique({ where: { id: data.uid } });
    if (!user) throw new Error("Usuário não encontrado");
    return user;
}

/* ====== E-mail e SMS (DEV-friendly) ======================================= */

async function sendEmailCode(to: string, subject: string, code: string) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || 587);

    if (!host || !user || !pass) {
        // DEV: sem SMTP configurado
        return { delivered: false, devCode: code };
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: { user, pass },
    });

    await transporter.sendMail({
        from: process.env.MAIL_FROM || '"ShortTrack" <no-reply@shorttrack.app>',
        to,
        subject,
        html: `
      <div style="font-family:sans-serif">
        <h2>${subject}</h2>
        <p>Seu código é:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</div>
        <p>Ele expira em 10 minutos.</p>
      </div>
    `,
    });

    return { delivered: true };
}

async function sendEmailHtml(to: string, subject: string, html: string) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || 587);

    if (!host || !user || !pass) {
        // DEV
        return { delivered: false, devHtml: html };
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: { user, pass },
    });

    await transporter.sendMail({
        from: process.env.MAIL_FROM || '"ShortTrack" <no-reply@shorttrack.app>',
        to,
        subject,
        html,
    });

    return { delivered: true };
}

async function sendSmsCode(to: string, code: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;

    if (!sid || !token || !from) {
        // DEV: sem Twilio configurado
        return { delivered: false, devCode: code };
    }

    const twilio = (await import("twilio")).default;
    const client = twilio(sid, token);
    await client.messages.create({
        from,
        to,
        body: `Seu código ShortTrack: ${code} (expira em 10 minutos).`,
    });

    return { delivered: true };
}

/* ========================== LOGIN =========================== */
/** Requisitos:
 * - Se e-mail não existe: field=email
 * - Se senha errada: field=password
 * - Se TOTP habilitado: exigir code
 * - Se têm phone cadastrado e não verificado: bloquear
 */
router.post("/login", async (req, res) => {
    const schema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
        code: z.string().optional(), // TOTP opcional
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

    const { email, password, code } = parsed.data;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ field: "email", message: "E-mail não encontrado." });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ field: "password", message: "Senha incorreta." });

        if (!user.emailVerifiedAt) {
            return res.status(403).json({ field: "email", message: "E-mail ainda não verificado." });
        }
        if (user.phone && !user.phoneVerifiedAt) {
            // só exige se o usuário tiver telefone cadastrado
            return res.status(403).json({ field: "phone", message: "Telefone ainda não verificado." });
        }
        if (!user.isActive) {
            return res.status(403).json({ field: "account", message: "Conta inativa." });
        }

        // TOTP (se habilitado)
        if (user.totpEnabled) {
            if (!code) return res.status(401).json({ field: "code", message: "Informe o código do autenticador." });
            if (!user.totpSecret) return res.status(500).json({ error: "TOTP mal configurado" });
            const okTotp = authenticator.check(code, user.totpSecret);
            if (!okTotp) return res.status(401).json({ field: "code", message: "Código incorreto." });
        }

        const token = signToken({ uid: user.id });
        return res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao entrar" });
    }
});

/* ============== REGISTRO — solicitar código por e-mail ============== */
router.post("/register/request-email-code", async (req, res) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E-mail inválido" });
    const email = parsed.data.email.toLowerCase();

    try {
        // anti-spam: 1 por minuto
        const recent = await prisma.verificationCode.findFirst({
            where: {
                type: VerificationType.EMAIL_REGISTER,
                target: email,
                createdAt: { gt: new Date(Date.now() - 60 * 1000) },
            },
        });
        if (recent) return res.json({ ok: true });

        const code = gen6();
        const codeHash = await hashCode(code);

        await prisma.verificationCode.create({
            data: {
                type: VerificationType.EMAIL_REGISTER,
                target: email,
                codeHash,
                expiresAt: inMinutes(10),
            },
        });

        const result = await sendEmailCode(email, "Confirme seu e-mail", code);
        if (result.delivered) return res.json({ ok: true });
        return res.json({ ok: true, devCode: (result as any).devCode }); // DEV
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao enviar código de e-mail" });
    }
});

/* ============== REGISTRO — criar conta exigindo emailCode ============== */
router.post("/register", async (req, res) => {
    const schema = z.object({
        name: z.string().min(2, "Nome obrigatório"),
        email: z.string().email("E-mail inválido"),
        password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
        phone: z.string().min(5).optional(), // <- agora opcional
        emailCode: z.string().length(6, "Código inválido"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

    const { name, email, password, phone, emailCode } = parsed.data;
    const emailNorm = email.toLowerCase();

    try {
        const exists = await prisma.user.findUnique({ where: { email: emailNorm } });
        if (exists) return res.status(409).json({ field: "email", message: "E-mail já cadastrado." });

        // validar código de e-mail
        const row = await prisma.verificationCode.findFirst({
            where: {
                type: VerificationType.EMAIL_REGISTER,
                target: emailNorm,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
        });
        if (!row || !(await compareCode(emailCode, row.codeHash))) {
            return res.status(400).json({ field: "emailCode", message: "Código de e-mail inválido ou expirado." });
        }

        // consome o código
        await prisma.verificationCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });

        // telefone (opcional)
        let phoneE164: string | null = null;
        if (phone) {
            phoneE164 = normalizePhone(phone);
            if (!phoneE164) return res.status(400).json({ field: "phone", message: "Telefone inválido." });
            const phoneUsed = await prisma.user.findFirst({ where: { phone: phoneE164 } });
            if (phoneUsed) return res.status(409).json({ field: "phone", message: "Telefone já cadastrado." });
        }

        // criar usuário
        const hash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email: emailNorm,
                password: hash,
                phone: phoneE164,
                emailVerifiedAt: new Date(), // e-mail verificado via código
                isActive: phoneE164 ? false : true, // ativa já se não exigir telefone
            },
        });

        if (phoneE164) {
            // gerar e enviar SMS se telefone foi informado
            const sms = gen6();
            const smsHash = await hashCode(sms);
            await prisma.verificationCode.create({
                data: {
                    type: VerificationType.PHONE_CONFIRM,
                    target: phoneE164,
                    codeHash: smsHash,
                    expiresAt: inMinutes(10),
                },
            });

            const result = await sendSmsCode(phoneE164, sms);
            if (result.delivered) {
                return res.status(201).json({ ok: true, userId: user.id, next: "verify-phone" });
            }
            return res
                .status(201)
                .json({ ok: true, userId: user.id, next: "verify-phone", devSmsCode: (result as any).devCode });
        }

        // sem telefone, tudo certo
        return res.status(201).json({ ok: true, userId: user.id, next: "done" });
    } catch (e: any) {
        if (e?.code === "P2002") return res.status(409).json({ error: "E-mail/telefone já cadastrado" });
        console.error(e);
        return res.status(500).json({ error: "Erro ao registrar" });
    }
});

/* ============== TELEFONE — reenviar código (opcional) ============== */
router.post("/phone/request", async (req, res) => {
    const schema = z.object({ phone: z.string().min(5) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Telefone inválido" });

    const phoneE164 = normalizePhone(parsed.data.phone);
    if (!phoneE164) return res.status(400).json({ error: "Telefone inválido" });

    try {
        // anti-spam: 1 por minuto
        const recent = await prisma.verificationCode.findFirst({
            where: {
                type: VerificationType.PHONE_CONFIRM,
                target: phoneE164,
                createdAt: { gt: new Date(Date.now() - 60 * 1000) },
            },
        });
        if (recent) return res.json({ ok: true });

        const sms = gen6();
        const smsHash = await hashCode(sms);

        await prisma.verificationCode.create({
            data: {
                type: VerificationType.PHONE_CONFIRM,
                target: phoneE164,
                codeHash: smsHash,
                expiresAt: inMinutes(10),
            },
        });

        const result = await sendSmsCode(phoneE164, sms);
        if (result.delivered) return res.json({ ok: true });
        return res.json({ ok: true, devSmsCode: (result as any).devCode });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao enviar SMS" });
    }
});

/* ============== TELEFONE — verificar código e ativar conta ============== */
router.post("/phone/verify", async (req, res) => {
    const schema = z.object({
        userId: z.number().int(),
        phone: z.string().min(5),
        code: z.string().length(6),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

    const { userId, phone, code } = parsed.data;

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) return res.status(400).json({ field: "phone", message: "Telefone inválido." });

    try {
        const row = await prisma.verificationCode.findFirst({
            where: {
                type: VerificationType.PHONE_CONFIRM,
                target: phoneE164,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
        });

        if (!row || !(await compareCode(code, row.codeHash))) {
            return res.status(400).json({ field: "phoneCode", message: "Código inválido ou expirado." });
        }

        await prisma.$transaction([
            prisma.verificationCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } }),
            prisma.user.update({
                where: { id: userId },
                data: { phoneVerifiedAt: new Date(), isActive: true },
            }),
        ]);

        return res.json({ ok: true });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao verificar telefone" });
    }
});

/* ============== ESQUECI A SENHA — pedir código por e-mail ============== */
router.post("/password/request", async (req, res) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E-mail inválido" });
    const email = parsed.data.email.toLowerCase();

    try {
        // anti-spam: 1 por minuto
        const recent = await prisma.verificationCode.findFirst({
            where: {
                type: VerificationType.PASSWORD_RESET,
                target: email,
                createdAt: { gt: new Date(Date.now() - 60 * 1000) },
            },
        });
        if (recent) return res.json({ ok: true });

        const code = gen6();
        const codeHash = await hashCode(code);

        await prisma.verificationCode.create({
            data: {
                type: VerificationType.PASSWORD_RESET,
                target: email,
                codeHash,
                expiresAt: inMinutes(10),
            },
        });

        const result = await sendEmailCode(email, "Redefinição de senha", code);
        if (result.delivered) return res.json({ ok: true });
        return res.json({ ok: true, devCode: (result as any).devCode }); // DEV
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao solicitar reset" });
    }
});

/* ============== ESQUECI A SENHA — confirmar código e trocar ====== */
router.post("/password/confirm", async (req, res) => {
    const schema = z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(6),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

    const email = parsed.data.email.toLowerCase();

    try {
        const row = await prisma.verificationCode.findFirst({
            where: {
                type: VerificationType.PASSWORD_RESET,
                target: email,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
        });

        if (!row || !(await compareCode(parsed.data.code, row.codeHash))) {
            return res.status(400).json({ field: "code", message: "Código inválido ou expirado." });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // privacidade: não revela existência do e-mail
            await prisma.verificationCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
            return res.json({ ok: true });
        }

        const hash = await bcrypt.hash(parsed.data.newPassword, 10);

        await prisma.$transaction([
            prisma.verificationCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } }),
            prisma.user.update({ where: { id: user.id }, data: { password: hash } }),
        ]);

        return res.json({ ok: true });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao redefinir senha" });
    }
});

/* ===================== LINK MÁGICO POR E-MAIL ===================== */
// Solicitar link mágico
router.post("/magic/request", async (req, res) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E-mail inválido" });
    const email = parsed.data.email.toLowerCase();

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // não revela existência
            return res.json({ ok: true });
        }

        const token = nano();
        const codeHash = await hashCode(token);

        await prisma.verificationCode.create({
            data: {
                type: VerificationType.MAGIC_LOGIN,
                target: email,
                codeHash,
                expiresAt: inMinutes(15),
            },
        });

        const base = process.env.PUBLIC_BASE || "http://localhost:4500";
        const magicUrl = `${base}/api/auth/magic/consume?token=${token}&email=${encodeURIComponent(email)}`;

        const html = `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.5">
        <h2>Seu link de acesso</h2>
        <p>Clique no botão para entrar sem senha. O link expira em 15 minutos.</p>
        <p>
          <a href="${magicUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">
            Entrar agora
          </a>
        </p>
        <p style="font-size:12px;color:#555">Se o botão não funcionar, copie e cole esta URL no navegador:<br>${magicUrl}</p>
      </div>
    `;

        const result = await sendEmailHtml(email, "Seu link de acesso", html);
        if (result.delivered) return res.json({ ok: true });
        return res.json({ ok: true, magicUrl }); // DEV: retorna link
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao gerar link mágico" });
    }
});

// Consumir link mágico
router.get("/magic/consume", async (req, res) => {
    const schema = z.object({
        token: z.string().min(10),
        email: z.string().email(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

    const { token, email } = parsed.data;
    const emailNorm = email.toLowerCase();

    try {
        const row = await prisma.verificationCode.findFirst({
            where: {
                type: VerificationType.MAGIC_LOGIN,
                target: emailNorm,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
        });
        if (!row || !(await compareCode(String(token), row.codeHash))) {
            return res.status(400).json({ error: "Link inválido ou expirado" });
        }

        await prisma.verificationCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });

        const user = await prisma.user.findUnique({ where: { email: emailNorm } });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        // Ativa por e-mail se ainda não estiver
        if (!user.emailVerifiedAt || !user.isActive) {
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date(), isActive: true },
            });
        }

        const tokenJwt = signToken({ uid: user.id });
        // Você pode redirecionar pro front se quiser:
        // return res.redirect(`${process.env.FRONT_URL}/auth/callback#token=${tokenJwt}`);

        return res.json({
            token: tokenJwt,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao consumir link" });
    }
});

/* ===================== TOTP (Google Authenticator) ===================== */
// Iniciar setup: gera secret + QR (requer Authorization)
router.post("/totp/setup", async (req, res) => {
    try {
        const user = await getAuthedUser(req);
        const secret = authenticator.generateSecret();

        await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret, totpEnabled: false } });

        const service = "ShortTrack";
        const otpAuth = authenticator.keyuri(user.email, service, secret);
        const qrDataUrl = await QRCode.toDataURL(otpAuth);

        return res.json({ ok: true, otpAuth, qrDataUrl });
    } catch (e) {
        console.error(e);
        return res.status(401).json({ error: "Não autorizado" });
    }
});

// Concluir setup: validar code e ativar
router.post("/totp/enable", async (req, res) => {
    const schema = z.object({ code: z.string().length(6) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Código inválido" });

    try {
        const user = await getAuthedUser(req);
        if (!user.totpSecret) return res.status(400).json({ error: "Setup não iniciado" });

        const isValid = authenticator.check(parsed.data.code, user.totpSecret);
        if (!isValid) return res.status(400).json({ error: "Código incorreto" });

        // opcional: gerar backup codes
        const genBackup = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);
        const backups = Array.from({ length: 6 }, () => genBackup());

        await prisma.user.update({
            where: { id: user.id },
            data: { totpEnabled: true, backupCodes: backups },
        });

        return res.json({ ok: true, backupCodes: backups });
    } catch (e) {
        console.error(e);
        return res.status(401).json({ error: "Não autorizado" });
    }
});

/* ============== ME (opcional) =============================== */
router.get("/me", async (req, res) => {
    try {
        const header = req.headers.authorization || "";
        const [, token] = header.split(" ");
        if (!token) return res.status(401).json({ error: "Sem token" });
        const data = jwt.verify(token, process.env.JWT_SECRET!) as { uid: number };

        const user = await prisma.user.findUnique({
            where: { id: data.uid },
            select: { id: true, name: true, email: true, phone: true, createdAt: true, totpEnabled: true },
        });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        return res.json({ user });
    } catch {
        return res.status(401).json({ error: "Token inválido" });
    }
});

export default router;