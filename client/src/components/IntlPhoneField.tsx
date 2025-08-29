import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { Phone as PhoneIcon, ChevronDown } from 'lucide-react'
import {
    getCountries,
    getCountryCallingCode,
    AsYouType,
    parsePhoneNumberFromString,
} from 'libphonenumber-js'

type CountryOpt = { iso2: string; dial: string; name: string }
const E164_MAX = 15

const digitsOnly = (s: string) => s.replace(/\D/g, '')
const flagEmoji = (iso2: string) =>
    iso2.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))

function useCountryOptions(): CountryOpt[] {
    const regionNames =
        (Intl as any).DisplayNames ? new (Intl as any).DisplayNames(['pt-BR', 'en'], { type: 'region' }) : null
    return useMemo(() => {
        const codes = getCountries()
        const opts = codes.map(iso2 => {
            const dial = getCountryCallingCode(iso2)
            const name = (regionNames?.of(iso2) as string) || iso2
            return { iso2, dial, name }
        })
        return opts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    }, [])
}

function longestDialMatch(digitsNoPlus: string, opts: CountryOpt[], fallbackIso = 'BR'): CountryOpt {
    let best: CountryOpt | null = null
    for (const o of opts) {
        if (digitsNoPlus.startsWith(o.dial)) {
            if (!best || o.dial.length > best.dial.length) best = o
        }
    }
    return best || opts.find(o => o.iso2 === fallbackIso) || opts[0]
}

type Props = {
    /** Valor em E.164, ex.: "+5511987654321" (ou "" no início) */
    value: string
    onChange: (e164: string) => void
    className?: string
    placeholder?: string
}

const IntlPhoneField = forwardRef<HTMLInputElement, Props>(function IntlPhoneField(
    { value, onChange, className = '', placeholder },
    ref
) {
    const options = useCountryOptions()

    // país inicial a partir do valor atual
    const initial = useMemo(() => {
        const noPlus = value?.startsWith('+') ? value.slice(1) : ''
        return longestDialMatch(digitsOnly(noPlus), options)
    }, [value, options])

    const [country, setCountry] = useState<CountryOpt>(initial)

    // re-sincroniza se value mudar externamente
    useEffect(() => {
        setCountry(initial)
    }, [initial.iso2])

    const e164Digits = digitsOnly(value?.startsWith('+') ? value.slice(1) : '')
    const natMax = useMemo(
        () => Math.max(0, E164_MAX - country.dial.length),
        [country.dial]
    )

    // dígitos nacionais atuais (E.164 sem DDI)
    const nationalDigits = useMemo(() => {
        if (!e164Digits.startsWith(country.dial)) return ''
        return e164Digits.slice(country.dial.length).slice(0, natMax)
    }, [e164Digits, country.dial, natMax])

    // exibição formatada por país
    const display = useMemo(() => {
        const typer = new AsYouType(country.iso2 as any)
        return typer.input(nationalDigits)
    }, [nationalDigits, country.iso2])

    // ao trocar país, reemite E.164 podado ao novo natMax
    useEffect(() => {
        const next = nationalDigits ? `+${country.dial}${nationalDigits}` : `+${country.dial}`
        if (next !== value) onChange(next)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [country.iso2, country.dial, natMax])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const just = digitsOnly(e.target.value).slice(0, natMax)
        onChange(`+${country.dial}${just}`)
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
        const t = e.clipboardData.getData('text')
        // Se tiver +, tratamos como internacional
        if (t.includes('+')) {
            let parsed = parsePhoneNumberFromString(t)
            if (parsed?.number) {
                let iso = parsed.country
                let digits = digitsOnly(parsed.number) // sem +
                let opt: CountryOpt
                if (iso) {
                    opt = options.find(o => o.iso2 === iso) || longestDialMatch(digits, options, country.iso2)
                } else {
                    opt = longestDialMatch(digits, options, country.iso2)
                }
                const nat = digits.slice(opt.dial.length).slice(0, Math.max(0, E164_MAX - opt.dial.length))
                setCountry(opt)
                onChange(`+${opt.dial}${nat}`)
                e.preventDefault()
            }
        }
    }

    // dropdown
    const [open, setOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const h = (ev: MouseEvent) => {
            if (!wrapRef.current?.contains(ev.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    return (
        <div className={`w-full ${className}`} ref={wrapRef}>
            <div className="flex items-stretch gap-2">
                {/* seletor país */}
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/60 px-3 h-[52px] text-sm hover:bg-zinc-700/60"
                    title={`${country.name} (+${country.dial})`}
                    aria-label="Selecionar país"
                >
                    <span className="text-base leading-none">
                        {country.iso2.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))}
                    </span>
                    <span className="text-zinc-300">+{country.dial}</span>
                    <ChevronDown className="ml-0.5 size-3.5 opacity-70" />
                </button>

                {/* input nacional */}
                <div className="relative flex-1">
                    <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
                    <input
                        ref={ref}
                        value={display}
                        onChange={handleChange}
                        onPaste={handlePaste}
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder={placeholder ?? 'Número de telefone'}
                        className="h-[52px] w-full rounded-xl border border-white/10 bg-zinc-900/60 pl-11 pr-4 text-[15px] outline-none transition focus:ring-2 focus:ring-violet-500/60"
                        maxLength={40} // apenas visual; o corte real é no onChange
                    />
                </div>
            </div>

            {open && (
                <div className="mt-2 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-lg shadow-xl">
                    {options.map(o => (
                        <button
                            type="button"
                            key={o.iso2}
                            onClick={() => { setCountry(o); setOpen(false) }}
                            className={`flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-zinc-800/70 ${o.iso2 === country.iso2 ? 'bg-zinc-800/40' : ''}`}
                        >
                            <span className="text-lg">{o.iso2.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))}</span>
                            <span className="flex-1">{o.name}</span>
                            <span className="text-zinc-400">+{o.dial}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
})

export default IntlPhoneField