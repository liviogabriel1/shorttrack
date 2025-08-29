import React, { forwardRef, useMemo } from 'react'
import { Phone as PhoneIcon } from 'lucide-react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
    value: string
    onChange: (v: string) => void
}

function digitsOnly(s: string) {
    return s.replace(/\D/g, '')
}

/** Formata para: +55 (11) 91234-5678  |  ou  +55 (11) 1234-5678 (enquanto digita) */
export function formatPhoneBR(nationalDigits: string) {
    const d = nationalDigits.slice(0, 11) // DDD (2) + número (9 ou 8)
    let out = '+55 '

    if (d.length > 0) out += '(' + d.slice(0, 2)
    if (d.length >= 2) out += ') '

    const rest = d.slice(2) // 8–9 dígitos
    if (!rest) return out.trim()

    const firstLen = rest.length > 8 ? 5 : 4 // 9 dígitos => 5-4 | 8 dígitos => 4-4
    const p1 = rest.slice(0, firstLen)
    const p2 = rest.slice(firstLen, firstLen + 4)

    out += p1
    if (p2) out += '-' + p2

    return out.trim()
}

const PhoneField = forwardRef<HTMLInputElement, Props>(function PhoneField(
    { value, onChange, className = '', placeholder, ...rest }, ref
) {
    // normaliza: se vier “só dígitos”, formatamos; se vier formatado, reformatamos do mesmo jeito
    const display = useMemo(() => {
        const d = digitsOnly(value)
        // se o usuário passou o +55 junto, remove para calcular só os 11 nacionais
        const nat = d.startsWith('55') ? d.slice(2) : d
        return formatPhoneBR(nat)
    }, [value])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value
        const d = digitsOnly(raw)
        const nat = d.startsWith('55') ? d.slice(2) : d
        onChange(formatPhoneBR(nat))
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        const input = e.currentTarget
        const caret = input.selectionStart ?? 0
        // impede apagar o prefixo “+55 ”
        if ((e.key === 'Backspace' && caret <= 4) || (e.key === 'Delete' && caret < 4)) {
            e.preventDefault()
            input.setSelectionRange(4, 4)
        }
    }

    return (
        <div className="relative">
            <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
            <input
                ref={ref}
                value={display || '+55 '}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                inputMode="numeric"
                autoComplete="tel"
                placeholder={placeholder ?? 'Telefone +55 ...'}
                pattern="\+55\s\(\d{2}\)\s\d{4,5}-\d{4}"
                className={`w-full bg-zinc-900/60 border border-white/10 rounded-xl px-12 py-3 text-[15px]
                    outline-none focus:ring-2 focus:ring-violet-500/60 transition ${className}`}
                {...rest}
            />
        </div>
    )
})

export default PhoneField