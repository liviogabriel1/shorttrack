import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendEmailCode(to: string, subject: string, code: string) {
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
}