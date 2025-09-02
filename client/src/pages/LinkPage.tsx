// src/pages/LinkPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    BarChart,
    Bar,
} from 'recharts'
import { ArrowLeft, Copy, QrCode } from 'lucide-react'
import { useToast } from '../components/ToastProvider'

type LinkDTO = {
    id: number
    slug: string
    url: string
    title?: string | null
    createdAt: string
}
type KV = { name: string; value: number }
type StatsResp = {
    link: LinkDTO
    series: { date: string; value: number }[]
    byBrowser: KV[]
    byOS: KV[]
    byRef: KV[]
}

/* ---------- Tema (observa a classe 'dark' no <html>) ------------------- */
function useIsDark() {
    const [isDark, setIsDark] = useState(
        () => document.documentElement.classList.contains('dark')
    )
    useEffect(() => {
        const el = document.documentElement
        const obs = new MutationObserver(() =>
            setIsDark(el.classList.contains('dark'))
        )
        obs.observe(el, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])
    return isDark
}
function useThemeTokens() {
    const isDark = useIsDark()
    return useMemo(
        () => ({
            grid: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            axis: isDark ? '#a1a1aa' : '#6b7280',
            text: isDark ? '#e5e7eb' : '#111827',
            line: '#a78bfa', // violet-400
            bar: '#a78bfa',
            tooltipBg: isDark ? '#18181b' : '#ffffff',
            tooltipBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
            tooltipText: isDark ? '#e5e7eb' : '#111827',
            cardBg: isDark ? 'bg-zinc-900' : 'bg-white',
            cardBorder: isDark ? 'dark:border-white/10' : 'border-zinc-200',
        }),
        [isDark]
    )
}

/* ----------------------- UI helpers ------------------------------------ */
function Card({
    children,
    className = '',
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={`rounded-2xl border shadow-sm ${className}`}
        >
            {children}
        </div>
    )
}
function Metric({
    label,
    value,
    className = '',
}: {
    label: string
    value: number | string
    className?: string
}) {
    const T = useThemeTokens()
    return (
        <Card className={`${T.cardBg} ${T.cardBorder} p-4 ${className}`}>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
        </Card>
    )
}

/* ----------------------- Página ---------------------------------------- */
export default function LinkPage() {
    const { id } = useParams()
    const nav = useNavigate()
    const toast = useToast()
    const T = useThemeTokens()
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4500'

    const [data, setData] = useState<StatsResp | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
            ; (async () => {
                try {
                    const { data } = await api.get<StatsResp>(`/api/links/${id}`)
                    if (alive) setData(data)
                } catch {
                    nav('/dashboard', { replace: true })
                } finally {
                    if (alive) setLoading(false)
                }
            })()
        return () => {
            alive = false
        }
    }, [id, nav])

    const total = useMemo(
        () => data?.series.reduce((acc, s) => acc + s.value, 0) ?? 0,
        [data]
    )
    const today = useMemo(() => {
        if (!data?.series.length) return 0
        return data.series[data.series.length - 1].value
    }, [data])
    const last7 = useMemo(
        () => data?.series.slice(-7).reduce((a, s) => a + s.value, 0) ?? 0,
        [data]
    )

    const copy = async () => {
        if (!data) return
        await navigator.clipboard.writeText(`${apiBase}/${data.link.slug}`)
        toast.success('URL copiada!')
    }
    const openQR = () => {
        if (!data) return
        window.open(`${apiBase}/api/links/qr/slug/${data.link.slug}`, '_blank')
    }

    if (loading) return <p className="text-zinc-500 dark:text-zinc-400">Carregando…</p>
    if (!data) return null

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <button
                        onClick={() => nav(-1)}
                        className="mb-3 inline-flex items-center gap-2 rounded-lg bg-zinc-200 px-2.5 py-1.5 text-sm text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                        <ArrowLeft className="size-4" />
                        Voltar
                    </button>

                    <h1 className="text-2xl font-semibold">
                        {data.link.title || data.link.slug}
                    </h1>
                    <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {data.link.url}
                        <br />
                        <a
                            href={`${apiBase}/${data.link.slug}`}
                            target="_blank"
                            className="text-emerald-500 hover:underline"
                            rel="noreferrer"
                        >
                            {apiBase}/{data.link.slug}
                        </a>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={copy}
                        className="rounded-lg bg-zinc-200 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Copy className="size-4" /> Copiar
                        </span>
                    </button>
                    <button
                        onClick={openQR}
                        className="rounded-lg bg-zinc-200 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                        <span className="inline-flex items-center gap-2">
                            <QrCode className="size-4" /> QR
                        </span>
                    </button>
                </div>
            </div>

            {/* Métricas rápidas */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Metric label="Total" value={total} />
                <Metric label="Hoje" value={today} />
                <Metric label="Últimos 7 dias" value={last7} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* série 30 dias */}
                <Card className={`${T.cardBg} ${T.cardBorder} p-4`}>
                    <div className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Cliques (30 dias)</div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={data.series}
                                margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                            >
                                <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: T.axis, fontSize: 12 }}
                                    minTickGap={20}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: T.axis, fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ stroke: 'transparent' }} // remove a “faixa branca” do hover
                                    contentStyle={{
                                        background: T.tooltipBg,
                                        border: `1px solid ${T.tooltipBorder}`,
                                        color: T.tooltipText,
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={T.line}
                                    strokeWidth={2}
                                    dot={{ r: 2 }}
                                    activeDot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* navegadores */}
                <Card className={`${T.cardBg} ${T.cardBorder} p-4`}>
                    <div className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Navegadores</div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.byBrowser} margin={{ top: 8, right: 20 }}>
                                <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: T.axis, fontSize: 12 }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: T.axis, fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }} // evita retângulo claro no hover
                                    contentStyle={{
                                        background: T.tooltipBg,
                                        border: `1px solid ${T.tooltipBorder}`,
                                        color: T.tooltipText,
                                    }}
                                />
                                <Bar dataKey="value" fill={T.bar} radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* sistemas */}
                <Card className={`${T.cardBg} ${T.cardBorder} p-4`}>
                    <div className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Sistemas</div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.byOS} margin={{ top: 8, right: 20 }}>
                                <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: T.axis, fontSize: 12 }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: T.axis, fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        background: T.tooltipBg,
                                        border: `1px solid ${T.tooltipBorder}`,
                                        color: T.tooltipText,
                                    }}
                                />
                                <Bar dataKey="value" fill={T.bar} radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* referers */}
                <Card className={`${T.cardBg} ${T.cardBorder} p-4`}>
                    <div className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Referers</div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.byRef} margin={{ top: 8, right: 20 }}>
                                <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: T.axis, fontSize: 12 }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: T.axis, fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        background: T.tooltipBg,
                                        border: `1px solid ${T.tooltipBorder}`,
                                        color: T.tooltipText,
                                    }}
                                />
                                <Bar dataKey="value" fill={T.bar} radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    )
}