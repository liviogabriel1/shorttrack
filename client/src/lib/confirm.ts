// src/lib/confirm.ts
import { toast } from 'sonner'

type ConfirmOpts = {
    description?: string
    okLabel?: string
    cancelLabel?: string
    duration?: number
}

export function confirmToast(
    message: string,
    {
        description,
        okLabel = 'Excluir',
        cancelLabel = 'Cancelar',
        duration = 10000,
    }: ConfirmOpts = {}
): Promise<boolean> {
    return new Promise((resolve) => {
        const id = toast(message, {
            description,
            duration,
            action: {
                label: okLabel,
                onClick: () => {
                    resolve(true)
                    toast.dismiss(id)
                },
            },
            cancel: {
                label: cancelLabel,
                onClick: () => resolve(false),
            },
        })
    })
}