import { useParams } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { api } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts'

export default function LinkPage() {
    const { id } = useParams()
    const [data, setData] = useState<any>()
    const base = import.meta.env.VITE_API_URL

    async function fetchData() {
        const { data } = await api.get(`/api/links/${id}`)
        setData(data)
    }
    useEffect(() => { fetchData() }, [id])

    async function openQR() {
        const res = await api.get(`/api/links/${id}/qr`, { responseType: "blob" })
        const blobUrl = URL.createObjectURL(res.data)
        const a = document.createElement("a")
        a.href = blobUrl
        a.target = "_blank"
        a.click()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    }

    const totals = useMemo(() => {
        if (!data) return { sum: 0, today: 0, last7: 0 }
        const arr = data.series as { date: string; value: number }[]
        const sum = arr.reduce((a, b) => a + b.value, 0)
        const today = arr.at(-1)?.value ?? 0
        const last7 = arr.slice(-7).reduce((a, b) => a + b.value, 0)
        return { sum, today, last7 }
    }, [data])

    if (!data) return <p>Carregando…</p>
    const { link, series, byBrowser, byOS, byRef } = data
    const shortUrl = `${base}/${link.slug}`

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-sm text-zinc-400">{new Date(link.createdAt).toLocaleString()}</div>
                    <h1 className="text-2xl font-semibold">{link.title || link.slug}</h1>
                    <div className="text-xs text-zinc-400 break-all">{link.url}</div>
                    <div className="mt-1 text-emerald-400 text-sm">{shortUrl}</div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(shortUrl)} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm">Copiar</button>
                    <button onClick={openQR} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm">QR</button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="text-sm text-zinc-400">Total</div>
                    <div className="text-2xl font-semibold">{totals.sum}</div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="text-sm text-zinc-400">Hoje</div>
                    <div className="text-2xl font-semibold">{totals.today}</div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="text-sm text-zinc-400">Últimos 7 dias</div>
                    <div className="text-2xl font-semibold">{totals.last7}</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <h3 className="font-semibold mb-2">Cliques (30 dias)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={series}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" hide />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <h3 className="font-semibold mb-2">Navegadores</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={byBrowser}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <h3 className="font-semibold mb-2">Sistemas</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={byOS}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <h3 className="font-semibold mb-2">Referers</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={byRef}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}