import axios from 'axios';

const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4500';
export const api = axios.create({ baseURL: base });

// injeta Authorization: Bearer <token>
api.interceptors.request.use((config) => {
    const t = localStorage.getItem('st_token');
    if (t) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${t}`;
    } else if (config.headers) {
        delete (config.headers as any).Authorization;
    }
    return config;
});

// trata erros globais (401 etc.) e dispara toasts
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status ?? 0;
        const data = err?.response?.data;
        const path = String(err?.config?.url || "").toLowerCase();

        const toast = (window as any).toast as
            | undefined
            | { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void };

        const backendMsg: string | undefined =
            (data && (data.error || data.message)) || undefined;

        if (status === 401) {
            // não autorizado
            if (path.includes("/api/auth/login")) {
                toast?.warning?.("E-mail ou senha incorretos.");
            } else {
                toast?.warning?.("Sessão expirada. Faça login novamente.");
                try { localStorage.removeItem("st_token"); } catch { }
            }
        } else if (status === 409) {
            // conflito (recurso já existe / slug em uso / e-mail já em uso)
            let msg =
                backendMsg ||
                (path.includes("/api/auth/register")
                    ? "Este e-mail ou telefone já está em uso."
                    : path.includes("/api/links")
                        ? "Conflito: slug já em uso ou reservado."
                        : "Conflito: recurso já existe.");
            toast?.warning?.(msg);
        } else {
            // demais erros
            const msg = backendMsg || "Erro ao processar sua solicitação.";
            toast?.error?.(msg);
        }

        return Promise.reject(err);
    }
);

// helpers para login/logout
export function setToken(token?: string) {
    if (token) localStorage.setItem('st_token', token);
    else localStorage.removeItem('st_token');
}