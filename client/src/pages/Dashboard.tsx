import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import LinkRow from '../components/LinkRow'

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
    const apiBase = import.meta.env.VITE_API_URL
    const nav = useNavigate()

    async function fetchList(p = page) {
        setLoading(true)
        const { data } = await api.get<ListResp>('/api/links', { params: { q, page: p, pageSize } })
        setItems(data.items); setTotal(data.total); setPage(data.page); setLoading(false)
    }
    useEffect(() => { fetchList(1) }, []) // on mount

    async function create() {
        await api.post('/api/links', { url, slug: slug.trim() || undefined, title: title.trim() || undefined })
        setSlug(''); setTitle(''); await fetchList(1)
    }
    async function remove(id: number) {
        if (!confirm('Excluir este link?')) return
        await api.delete(`/api/links/${id}`); await fetchList(page)
    }
    async function update(id: number, payload: any) {
        try {
            await api.put(`/api/links/${id}`, payload)
            await fetchList(page)
        } catch (e: any) {
            alert(e?.response?.data?.error || e.message)
        }
    }

    const pages = Math.max(1, Math.ceil(total / pageSize))

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h2 className="font-semibold text-lg mb-4">Novo link</h2>
                <label className="text-sm text-zinc-400">URL destino</label>
                <input className="w-full bg-zinc-800 rounded px-3 py-2 mb-3" value={url} onChange={e => setUrl(e.target.value)} />
                <label className="text-sm text-zinc-400">Slug (opcional)</label>
                <input className="w-full bg-zinc-800 rounded px-3 py-2 mb-3" value={slug} onChange={e => setSlug(e.target.value)} />
                <label className="text-sm text-zinc-400">Título (opcional)</label>
                <input className="w-full bg-zinc-800 rounded px-3 py-2 mb-4" value={title} onChange={e => setTitle(e.target.value)} />
                <button onClick={create} className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">Criar</button>

                <div className="mt-6">
                    <h3 className="font-semibold mb-2">Buscar</h3>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-zinc-800 rounded px-3 py-2" placeholder="slug / url / título" value={q} onChange={e => setQ(e.target.value)} />
                        <button onClick={() => fetchList(1)} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700">OK</button>
                    </div>
                </div>
            </div>

            <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg">Seus links</h2>
                    <div className="text-sm text-zinc-400">{total} itens • pág {page}/{pages}</div>
                </div>

                {loading ? <p className="text-zinc-400">Carregando…</p> : (
                    <div className="grid gap-4">
                        {items.map(l => (
                            <LinkRow key={l.id} link={l} apiBase={apiBase} onOpen={(id) => nav(`/link/${id}`)} onDelete={remove} onUpdate={update} />
                        ))}
                        {items.length === 0 && <p className="text-zinc-400">Nada encontrado.</p>}
                    </div>
                )}

                <div className="mt-4 flex gap-2">
                    <button disabled={page <= 1} onClick={() => fetchList(page - 1)} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50">← Anterior</button>
                    <button disabled={page >= pages} onClick={() => fetchList(page + 1)} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50">Próxima →</button>
                </div>
            </div>
        </div>
    )
}