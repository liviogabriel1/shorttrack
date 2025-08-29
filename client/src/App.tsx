import { Outlet, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import { useEffect } from 'react'
import { setToken } from './lib/api'

export default function App() {
    const nav = useNavigate()
    useEffect(() => {
        const t = localStorage.getItem('st_token')
        if (!t) return nav('/login')
        setToken(t)
    }, [])
    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <Outlet />
            </main>
        </div>
    )
}