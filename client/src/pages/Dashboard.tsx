import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import LinkRow from '../components/LinkRow'
import { useToast } from '../components/ToastProvider'
import ConfirmDialog from '../components/ConfirmDialog'

type ListResp = { items: any[]; total: number; page: number; pageSize: number }

export default function Dashboard() {
    const [url, setUrl] = useState('https://example.com')
    const [slug, setSlug] = useState('')
    const [title, setTitle] = useState('')
    const [q, setQ] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize] = useState(8)
    const [items, setItems] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)

    const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false })

    const apiBase = import.meta.env.VITE_API_URL
    const nav = useNavigate()
    const toast = useToast()

    const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

    // fetch -------------------------------------------------
    async function fetchList(p = page, search = q) {
        setLoading(true)
        try {
            const { data } = await api.get<ListResp>('/api/links', {
                params: { q: search, page: p, pageSize },
            })
            setItems(data.items)
            setTotal(data.total)
            setPage(data.page)
        } finally {
            setLoading(false)
        }
    }

    // on mount
    useEffect(() => {
        fetchList(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // debounce search (300ms) + live clear
    const debRef = useRef<number | null>(null)
    useEffect(() => {
        if (debRef.current) window.clearTimeout(debRef.current)
        debRef.current = window.setTimeout(() => fetchList(1, q), 300)
        return () => {
            if (debRef.current) window.clearTimeout(debRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q])

    // actions -----------------------------------------------
    async function create() {
        try {
            await api.post('/api/links', {
                url,
                slug: slug.trim() || undefined,
                title: title.trim() || undefined,
            })
            setSlug('')
            setTitle('')
            await fetchList(1)
            toast.success('Link criado!')
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Erro ao criar link')
        }
    }

    async function update(id: number, payload: any) {
        try {
            await api.put(`/api/links/${id}`, payload)
            await fetchList(page)
            toast.success('Link atualizado!')
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Erro ao atualizar')
        }
    }

    function remove(id: number) {
        setConfirm({ open: true, id })
    }

    async function confirmDelete() {
        if (!confirm.id) return
        try {
            await api.delete(`/api/links/${confirm.id}`)
            await fetchList(1)
            toast.error('Link excluído!')
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Erro ao excluir')
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* Coluna esquerda: criar + buscar */}
            <div className="md:col-span-1 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                <h2 className="mb-4 text-lg font-semibold">Novo link</h2>

                <label className="text-sm text-zinc-500 dark:text-zinc-400">URL destino</label>
                <input
                    className="mb-3 w-full rounded bg-zinc-100 px-3 py-2 outline-none ring-1 ring-transparent focus:bg-white focus:ring-emerald-500/40 dark:bg-zinc-800 dark:focus:bg-zinc-800"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />

                <label className="text-sm text-zinc-500 dark:text-zinc-400">Slug (opcional)</label>
                <input
                    className="mb-3 w-full rounded bg-zinc-100 px-3 py-2 outline-none ring-1 ring-transparent focus:bg-white focus:ring-emerald-500/40 dark:bg-zinc-800 dark:focus:bg-zinc-800"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                />

                <label className="text-sm text-zinc-500 dark:text-zinc-400">Título (opcional)</label>
                <input
                    className="mb-4 w-full rounded bg-zinc-100 px-3 py-2 outline-none ring-1 ring-transparent focus:bg-white focus:ring-emerald-500/40 dark:bg-zinc-800 dark:focus:bg-zinc-800"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <button
                    onClick={create}
                    className="w-full rounded-xl bg-emerald-600 py-2 font-medium text-white transition hover:bg-emerald-500"
                >
                    Criar
                </button>

                <div className="mt-6">
                    <h3 className="mb-2 font-semibold">Buscar</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            className="flex-1 min-w-[180px] rounded bg-zinc-100 px-3 py-2 outline-none ring-1 ring-transparent focus:bg-white focus:ring-emerald-500/40 dark:bg-zinc-800 dark:focus:bg-zinc-800"
                            placeholder="slug / url / título"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') fetchList(1)
                                if (e.key === 'Escape') setQ('')
                            }}
                        />
                        <button
                            onClick={() => fetchList(1)}
                            className="rounded bg-zinc-200 px-3 py-2 text-sm hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                            OK
                        </button>
                        <button
                            onClick={() => setQ('')}
                            className="rounded bg-zinc-200 px-3 py-2 text-sm hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                            Limpar
                        </button>
                    </div>
                </div>
            </div>

            {/* Coluna direita: lista */}
            <div className="md:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Seus links</h2>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        {total} itens • pág {page}/{pages}
                    </div>
                </div>

                {loading ? (
                    <p className="text-zinc-500 dark:text-zinc-400">Carregando…</p>
                ) : (
                    <div className="grid gap-4">
                        {items.map((l) => (
                            <LinkRow
                                key={l.id}
                                link={l}
                                apiBase={apiBase}
                                onOpen={(id) => nav(`/link/${id}`)}
                                onDelete={remove}
                                onUpdate={update}
                            />
                        ))}
                        {items.length === 0 && <p className="text-zinc-500 dark:text-zinc-400">Nada encontrado.</p>}
                    </div>
                )}

                <div className="mt-4 flex gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => fetchList(page - 1)}
                        className="rounded bg-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    >
                        ← Anterior
                    </button>
                    <button
                        disabled={page >= pages}
                        onClick={() => fetchList(page + 1)}
                        className="rounded bg-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    >
                        Próxima →
                    </button>
                </div>
            </div>

            {/* Modal de confirmação */}
            <ConfirmDialog
                open={confirm.open}
                variant="danger"
                title="Excluir link?"
                description="Esta ação não pode ser desfeita."
                confirmText="Excluir"
                onConfirm={confirmDelete}
                onClose={() => setConfirm({ open: false })}
            />
        </div>
    )
}