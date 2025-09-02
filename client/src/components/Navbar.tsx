import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark'

function applyThemeClass(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark')
}

export default function Navbar() {
    const { logout } = useAuth()
    const nav = useNavigate()
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = (localStorage.getItem('st_theme') as Theme | null)
        if (saved) return saved
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    })

    useEffect(() => {
        localStorage.setItem('st_theme', theme)
        applyThemeClass(theme)
    }, [theme])

    return (
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link to="/dashboard" className="font-semibold tracking-tight">
                    🔗 ShortTrack
                </Link>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                    >
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            logout()
                            nav('/login')
                        }}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                        Sair
                    </button>
                </div>
            </div>
        </header>
    )
}