// src/lib/api.ts
import axios from "axios";

const base = (import.meta as any).env?.VITE_API_URL || "http://localhost:4500";
export const api = axios.create({ baseURL: base });

api.interceptors.request.use((config) => {
    const t = localStorage.getItem("st_token");
    if (t) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${t}`;
    } else if (config.headers) {
        delete (config.headers as any).Authorization;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status ?? 0;
        const data = err?.response?.data;
        const path = String(err?.config?.url || "").toLowerCase();

        const toast = (window as any).toast as
            | undefined
            | {
                success: (m: string) => void;
                error: (m: string) => void;
                info: (m: string) => void;
                warning: (m: string) => void;
            };

        const backendMsg: string | undefined =
            (data && (data.error || data.message)) || undefined;

        if (status === 401) {
            if (path.includes("/api/auth/login")) {
                if (data?.field === "code") {
                    toast?.warning?.("Informe o código do autenticador.");
                } else {
                    toast?.warning?.("E-mail ou senha incorretos.");
                }
            } else {
                toast?.warning?.("Sessão expirada. Faça login novamente.");
                try {
                    localStorage.removeItem("st_token");
                } catch { }
            }
        } else if (status === 409) {
            let msg =
                backendMsg ||
                (path.includes("/api/auth/register")
                    ? "Este e-mail ou telefone já está em uso."
                    : path.includes("/api/links")
                        ? "Conflito: slug já em uso ou reservado."
                        : "Conflito: recurso já existe.");
            toast?.warning?.(msg);
        } else if (status >= 500) {
            const msg = backendMsg || "Erro no servidor. Tente novamente.";
            toast?.error?.(msg);
        } else {
            const msg = backendMsg || "Erro ao processar sua solicitação.";
            toast?.error?.(msg);
        }

        return Promise.reject(err);
    }
);

export function setToken(token?: string) {
    if (token) localStorage.setItem("st_token", token);
    else localStorage.removeItem("st_token");
}

/* ===== Link mágico ===== */
export async function requestMagicLink(email: string) {
    const { data } = await api.post("/api/auth/magic/request", { email });
    return data as { ok: boolean; magicUrl?: string };
}

/* ===== TOTP ===== */
export async function totpSetup() {
    const { data } = await api.post("/api/auth/totp/setup", {});
    return data as { ok: boolean; otpAuth: string; qrDataUrl: string };
}

export async function totpEnable(code: string) {
    const { data } = await api.post("/api/auth/totp/enable", { code });
    return data as { ok: boolean; backupCodes: string[] };
}

/* === ALIASES para compatibilidade com sua página === */
export const setupTotp = totpSetup;
export const enableTotp = totpEnable;