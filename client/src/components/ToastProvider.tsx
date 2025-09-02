import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

type Variant = 'success' | 'error' | 'info' | 'warning'

type ToastInput = {
    title?: string
    message: string
    variant?: Variant
    duration?: number // ms
}

type Toast = ToastInput & { id: string }

type ToastCtx = {
    push: (t: ToastInput) => void
    success: (msg: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => void
    error: (msg: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => void
    info: (msg: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => void
    warning: (msg: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => void
}

const Ctx = createContext<ToastCtx | null>(null)
export const useToast = () => {
    const v = useContext(Ctx)
    if (!v) throw new Error('useToast must be used inside <ToastProvider>')
    return v
}

const ICON: Record<Variant, React.ReactNode> = {
    success: <CheckCircle2 className="size-5" />,
    error: <XCircle className="size-5" />,
    info: <Info className="size-5" />,
    warning: <AlertTriangle className="size-5" />,
}

const COLORS: Record<Variant, string> = {
    success: 'from-emerald-500/20 to-emerald-400/10 text-emerald-500',
    error: 'from-rose-500/20 to-rose-400/10 text-rose-500',
    info: 'from-sky-500/20 to-sky-400/10 text-sky-500',
    warning: 'from-amber-500/20 to-amber-400/10 text-amber-500',
}

function nanoid() {
    return Math.random().toString(36).slice(2, 10)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const push = useCallback((t: ToastInput) => {
        setToasts((list) => [
            { id: nanoid(), variant: 'info', duration: 3500, ...t },
            ...list.slice(0, 4), // mantém no máx 5 empilhados
        ])
    }, [])

    const api = useMemo<ToastCtx>(
        () => ({
            push,
            success: (message, opts) => push({ message, variant: 'success', ...opts }),
            error: (message, opts) => push({ message, variant: 'error', ...opts }),
            info: (message, opts) => push({ message, variant: 'info', ...opts }),
            warning: (message, opts) => push({ message, variant: 'warning', ...opts }),
        }),
        [push]
    )

    const remove = (id: string) => setToasts((l) => l.filter((t) => t.id !== id))

    return (
        <Ctx.Provider value={api}>
            {children}

            {/* container topo/centro */}
            <div className="pointer-events-none fixed left-0 right-0 top-4 z-[100] flex flex-col items-center gap-3 px-2">
                <AnimatePresence initial={false}>
                    {toasts.map((t, idx) => (
                        <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} offset={idx} />
                    ))}
                </AnimatePresence>
            </div>
        </Ctx.Provider>
    )
}

function ToastItem({
    toast,
    onClose,
    offset,
}: {
    toast: Toast
    onClose: () => void
    offset: number
}) {
    const { variant = 'info', duration = 3500, title, message } = toast

    const timeoutRef = useRef<number | null>(null)
    const startRef = useRef<number>(Date.now())
    const remainRef = useRef<number>(duration)

    const start = () => {
        clear()
        startRef.current = Date.now()
        timeoutRef.current = window.setTimeout(onClose, remainRef.current)
    }
    const clear = () => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
    }
    const pause = () => {
        if (!timeoutRef.current) return
        remainRef.current -= Date.now() - startRef.current
        clear()
    }
    const resume = () => start()

    React.useEffect(() => {
        start()
        return clear
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="pointer-events-auto w-full max-w-xl"
            style={{ marginTop: offset ? 0 : 4 }}
            onMouseEnter={pause}
            onMouseLeave={resume}
            role="status"
            aria-live="polite"
        >
            <div
                className={[
                    'relative overflow-hidden rounded-2xl border',
                    'bg-white/70 dark:bg-zinc-900/70 backdrop-blur',
                    'border-zinc-200/70 dark:border-white/10',
                    'shadow-[0_12px_48px_-12px_rgba(0,0,0,.35)]',
                ].join(' ')}
            >
                {/* gradiente sutil por variante */}
                <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${COLORS[variant]}`}
                    aria-hidden
                />

                <div className="relative flex items-start gap-3 px-4 py-3">
                    <div
                        className={`mt-0.5 flex size-8 items-center justify-center rounded-full bg-white/70 dark:bg-zinc-950/60 ring-1 ring-black/5 dark:ring-white/10 ${COLORS[
                            variant
                        ].split(' ').at(-1)}`}
                    >
                        {ICON[variant]}
                    </div>

                    <div className="min-w-0 flex-1">
                        {title && <div className="text-sm font-medium">{title}</div>}
                        <div className="text-sm/5 text-zinc-700 dark:text-zinc-300">{message}</div>
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-1 rounded-lg p-1 text-zinc-500 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:text-zinc-400"
                        aria-label="Fechar"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* barra de progresso (pausa no hover) */}
                <div
                    className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-black/20 to-transparent dark:via-white/30"
                    style={{
                        width: '100%',
                        transformOrigin: 'left',
                        animation: `toast-progress ${duration}ms linear forwards`,
                        animationPlayState: timeoutRef.current ? ('running' as const) : ('paused' as const),
                    }}
                />
            </div>
        </motion.div>
    )
}