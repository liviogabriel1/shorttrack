import crypto from "crypto";
import bcrypt from "bcryptjs";

export function gen6() {
    // 6 dígitos, sem 000000
    const n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
}

export async function hashCode(code: string) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(code, salt);
}

export async function compareCode(code: string, hash: string) {
    return bcrypt.compare(code, hash);
}

export function inMinutes(min: number) {
    return new Date(Date.now() + min * 60 * 1000);
}