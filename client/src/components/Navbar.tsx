import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

export default function Navbar() {
    const { logout } = useAuth()
    const nav = useNavigate()
    return (
        <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
                <Link to="/dashboard" className="font-bold tracking-tight">🔗 ShortTrack</Link>
                <button onClick={() => { logout(); nav('/login') }} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm">Sair</button>
            </div>
        </header>
    )
}