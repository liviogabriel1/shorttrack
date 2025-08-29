import axios from 'axios'
const base = import.meta.env.VITE_API_URL || 'http://localhost:4500'
export const api = axios.create({ baseURL: base })

export function setToken(token?: string) {
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    else delete api.defaults.headers.common['Authorization']
}