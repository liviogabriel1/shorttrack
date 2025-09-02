import axios from 'axios'

const base = import.meta.env.VITE_API_URL || 'http://localhost:4500'
export const api = axios.create({ baseURL: base })

// Envia Authorization: Bearer <token> em TODO request
api.interceptors.request.use((config) => {
    const t = localStorage.getItem('st_token')
    if (t) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${t}`
    } else if (config.headers) {
        delete (config.headers as any).Authorization
    }
    return config
})

// helpers para login/logout
export function setToken(token?: string) {
    if (token) localStorage.setItem('st_token', token)
    else localStorage.removeItem('st_token')
}