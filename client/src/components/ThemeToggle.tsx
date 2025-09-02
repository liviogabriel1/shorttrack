import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

function apply(theme: Theme) {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('st_theme', theme)
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('dark')

    useEffect(() => {
        const saved = localStorage.getItem('st_theme') as Theme | null
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const initial: Theme = saved ?? (systemDark ? 'dark' : 'light')
        setTheme(initial)
        apply(initial)
    }, [])

    function toggle() {
        const next: Theme = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        apply(next)
    }

    return (
        <button
            onClick={toggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg
                 bg-zinc-200 text-zinc-700 hover:bg-zinc-300
                 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
    )
}