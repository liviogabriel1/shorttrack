import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

type Props = {
  open: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title = 'Confirmar ação',
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  onConfirm,
  onClose,
}: Props) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-zinc-900/70"
            initial={{ y: -12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -12, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <div className="mb-3 flex items-start gap-3">
              {variant === 'danger' ? (
                <div className="mt-0.5 rounded-full bg-rose-500/15 p-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-5" />
                </div>
              ) : null}
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                {description && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                {cancelText}
              </button>
              <button
                onClick={async () => {
                  await onConfirm()
                  onClose()
                }}
                className={`rounded-lg px-3 py-1.5 text-sm text-white ${
                  variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
