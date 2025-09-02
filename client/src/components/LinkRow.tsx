import { useMemo, useState } from 'react'

type LinkItem = {
    id: number
    slug: string
    url: string
    title?: string | null
    createdAt: string
    total?: number
}

export default function LinkRow({
    link,
    apiBase,
    onOpen,
    onDelete,
    onUpdate,
}: {
    link: LinkItem
    apiBase: string
    onOpen: (id: number) => void
    onDelete: (id: number) => void
    onUpdate: (id: number, payload: Partial<Pick<LinkItem, 'url' | 'slug' | 'title'>>) => void
}) {
    const [editing, setEditing] = useState(false)
    const [url, setUrl] = useState(link.url)
    const [slug, setSlug] = useState(link.slug)
    const [title, setTitle] = useState(link.title || '')

    const short = useMemo(() => `${apiBase}/${link.slug}`, [apiBase, link.slug])

    async function copy() {
        await navigator.clipboard.writeText(short)
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {!editing ? (
                <>
                    <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(link.createdAt).toLocaleString()}
                    </div>
                    <div className="text-lg font-semibold">{link.title || link.slug}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{link.url}</div>

                    <div className="mt-2 text-emerald-400">
                        <a href={short} target="_blank" rel="noreferrer">
                            {short}
                        </a>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={copy}
                            className="rounded bg-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                            Copiar
                        </button>
                        <button
                            type="button"
                            onClick={() => window.open(`${apiBase}/api/links/qr/slug/${link.slug}`, '_blank')}
                            className="rounded bg-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                            QR
                        </button>
                        <button
                            type="button"
                            onClick={() => onOpen(link.id)}
                            className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
                        >
                            Analytics
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="rounded bg-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                            Editar
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(link.id)}
                            className="rounded bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-500"
                        >
                            Excluir
                        </button>
                    </div>

                    {typeof link.total === 'number' && (
                        <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            Cliques: <span className="font-medium text-zinc-300 dark:text-zinc-200">{link.total}</span>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="grid gap-2 md:grid-cols-3">
                        <input
                            className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="slug"
                        />
                        <input
                            className="md:col-span-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="url"
                        />
                        <input
                            className="md:col-span-3 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="título (opcional)"
                        />
                    </div>

                    <div className="mt-3 flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onUpdate(link.id, { slug: slug.trim() || undefined, url: url.trim(), title: title.trim() || undefined })
                                setEditing(false)
                            }}
                            className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                        >
                            Salvar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setEditing(false)
                                setSlug(link.slug)
                                setUrl(link.url)
                                setTitle(link.title || '')
                            }}
                            className="rounded bg-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                            Cancelar
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}