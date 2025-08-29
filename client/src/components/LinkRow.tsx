import { useState } from "react"
import { api } from "../lib/api"

type Link = { id: number; slug: string; url: string; title?: string; createdAt: string; total: number }

type Props = {
    link: Link
    apiBase: string
    onOpen: (id: number) => void
    onDelete: (id: number) => void
    onUpdate: (id: number, payload: Partial<Pick<Link, "slug" | "url" | "title">>) => Promise<void>
}

export default function LinkRow({ link, onOpen, onDelete, onUpdate, apiBase }: Props) {
    const [edit, setEdit] = useState(false)
    const [slug, setSlug] = useState(link.slug)
    const [url, setUrl] = useState(link.url)
    const [title, setTitle] = useState(link.title || "")
    const [saving, setSaving] = useState(false)

    async function save() {
        setSaving(true)
        try {
            await onUpdate(link.id, { slug: slug.trim() || undefined, url: url.trim() || undefined, title: title.trim() || undefined })
            setEdit(false)
        } finally {
            setSaving(false)
        }
    }

    async function openQR() {
        const res = await api.get(`/api/links/${link.id}/qr`, { responseType: "blob" })
        const blobUrl = URL.createObjectURL(res.data)
        // abre em nova aba
        const a = document.createElement("a")
        a.href = blobUrl
        a.target = "_blank"
        a.click()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    }

    const shortUrl = `${apiBase}/${slug}`

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400">{new Date(link.createdAt).toLocaleString()}</div>

            {!edit ? (
                <>
                    <div className="text-lg font-semibold">{link.title || link.slug}</div>
                    <div className="text-xs text-zinc-400 break-all">{link.url}</div>
                    <div className="mt-2 text-sm">Cliques: <b>{link.total}</b></div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => navigator.clipboard.writeText(shortUrl)} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm">Copiar</button>
                        <button onClick={openQR} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm">QR</button>
                        <button onClick={() => onOpen(link.id)} className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-sm">Analytics</button>
                        <button onClick={() => setEdit(true)} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm">Editar</button>
                        <button onClick={() => onDelete(link.id)} className="px-3 py-1.5 rounded bg-red-600/80 hover:bg-red-600 text-sm">Excluir</button>
                    </div>
                    <div className="mt-2 text-xs text-emerald-400">{shortUrl}</div>
                </>
            ) : (
                <>
                    <div className="grid md:grid-cols-3 gap-2 mt-2">
                        <div>
                            <label className="text-xs text-zinc-400">Slug</label>
                            <input className="w-full bg-zinc-800 rounded px-2 py-1.5" value={slug} onChange={e => setSlug(e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-zinc-400">URL</label>
                            <input className="w-full bg-zinc-800 rounded px-2 py-1.5" value={url} onChange={e => setUrl(e.target.value)} />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-xs text-zinc-400">Título (opcional)</label>
                            <input className="w-full bg-zinc-800 rounded px-2 py-1.5" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <button disabled={saving} onClick={save} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm disabled:opacity-50">Salvar</button>
                        <button disabled={saving} onClick={() => { setEdit(false); setSlug(link.slug); setUrl(link.url); setTitle(link.title || "") }} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50">Cancelar</button>
                    </div>
                    <div className="mt-2 text-xs text-emerald-400">{shortUrl}</div>
                </>
            )}
        </div>
    )
}