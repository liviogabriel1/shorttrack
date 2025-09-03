import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM; // número do remetente

const client = sid && token ? twilio(sid, token) : null;

export async function sendSmsCode(to: string, code: string) {
    if (!client) throw new Error("SMS not configured");
    await client.messages.create({
        from,
        to, // +55DDDNUMERO
        body: `Seu código ShortTrack: ${code} (expira em 10 minutos).`,
    });
}