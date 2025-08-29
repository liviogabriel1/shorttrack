import { create } from 'zustand'
type User = { id: number; email: string; name: string }
type State = {
    token?: string; user?: User;
    setAuth: (token: string, user: User) => void;
    logout: () => void;
}
export const useAuth = create<State>((set) => ({
    setAuth: (token, user) => { localStorage.setItem('st_token', token); set({ token, user }) },
    logout: () => { localStorage.removeItem('st_token'); set({ token: undefined, user: undefined }) }
}))