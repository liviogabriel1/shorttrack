import { Outlet, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import { useEffect } from 'react'
import { setToken } from './lib/api'

export default function App() {
    const nav = useNavigate()

    // garante auth e injeta token
    useEffect(() => {
        const t = localStorage.getItem('st_token')
        if (!t) {
            nav('/login', { replace: true })
            return
        }
        setToken(t)
    }, [nav])

    // ATENÇÃO: nada de overlay “background-grid” aqui.
    // O fundo em grade agora é feito via CSS (body::before) em index.css
    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <Outlet />
            </main>
        </div>
    )
}