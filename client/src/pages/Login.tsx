import {
    useEffect,
    useRef,
    useState,
    forwardRef,
    type ChangeEvent,
    type ComponentType,
    type SVGProps,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, setToken } from '../lib/api'
import { useAuth } from '../store/auth'
import AuthLayout from '../components/AuthLayout'
import IntlPhoneField from '../components/IntlPhoneField'

import {
    Mail,
    Lock,
    User,
    KeyRound,
    ArrowRight,
    Send,
    LogIn,
    UserPlus,
    Smartphone,
} from 'lucide-react'

type Mode = 'login' | 'register' | 'forgot' | 'sms'
type InputEvt = ChangeEvent<HTMLInputElement>

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    icon: ComponentType<SVGProps<SVGSVGElement>>
}

/** Input padrão com ícone (forwardRef para focar via código) */
const Input = forwardRef<HTMLInputElement, InputProps>(function InputBase(
    { icon: Icon, className, ...p },
    ref,
) {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
            <input
                ref={ref}
                {...p}
                className={`w-full rounded-xl border border-white/10 bg-zinc-900/60 px-12 py-3 text-[15px] outline-none transition focus:ring-2 focus:ring-violet-500/60 ${className ?? ''}`}
            />
        </div>
    )
})

export default function Login() {
    const [mode, setMode] = useState<Mode>('login')

    // login/register
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('') // E.164, ex: +5511999999999

    // forgot
    const [fpEmail, setFpEmail] = useState('')
    const [fpToken, setFpToken] = useState('')
    const [fpNewPass, setFpNewPass] = useState('')
    const [fpStep, setFpStep] = useState<1 | 2>(1)

    // sms
    const [otp, setOtp] = useState('')
    const [otpRequested, setOtpRequested] = useState(false)

    // refs p/ foco do primeiro campo de cada aba
    const loginEmailRef = useRef<HTMLInputElement>(null)
    const regNameRef = useRef<HTMLInputElement>(null)
    const fpEmailRef = useRef<HTMLInputElement>(null)
    const smsPhoneRef = useRef<HTMLInputElement>(null)

    const setAuth = useAuth((s) => s.setAuth)
    const nav = useNavigate()

    // Se já houver token, envia pro dashboard
    useEffect(() => {
        const t = localStorage.getItem('st_token')
        if (t) {
            setToken(t)
            nav('/dashboard')
        }
    }, [nav])

    // Ao trocar de aba, foca no primeiro input dela
    useEffect(() => {
        const map: Record<Mode, React.RefObject<HTMLInputElement>> = {
            login: loginEmailRef,
            register: regNameRef,
            forgot: fpEmailRef,
            sms: smsPhoneRef,
        }
        map[mode].current?.focus()
    }, [mode])

    const showErr = (e: unknown) => {
        const anyE = e as any
        toast.error(anyE?.response?.data?.error || anyE?.message || 'Erro')
    }

    // ------- actions
    async function submitLogin() {
        try {
            const { data } = await api.post('/api/auth/login', { email, password })
            setToken(data.token)
            setAuth(data.token, data.user)
            toast.success('Bem-vindo!')
            nav('/dashboard')
        } catch (e) {
            showErr(e)
        }
    }

    async function submitRegister() {
        try {
            const payload: any = { email, password, name }
            if (phone.trim()) payload.phone = phone.trim() // E.164
            const { data } = await api.post('/api/auth/register', payload)
            setToken(data.token)
            setAuth(data.token, data.user)
            toast.success('Conta criada!')
            nav('/dashboard')
        } catch (e) {
            showErr(e)
        }
    }

    async function forgotStep1() {
        try {
            const { data } = await api.post('/api/auth/forgot-password', {
                email: fpEmail,
            })
            if (data.resetToken) setFpToken(data.resetToken) // útil em dev
            toast.info('Token enviado (confira o console do servidor).')
            setFpStep(2)
        } catch (e) {
            showErr(e)
        }
    }

    async function forgotStep2() {
        try {
            await api.post('/api/auth/reset-password', {
                token: fpToken,
                password: fpNewPass,
            })
            toast.success('Senha redefinida!')
            setMode('login')
            setEmail(fpEmail)
            setPassword('')
            setFpToken('')
            setFpNewPass('')
        } catch (e) {
            showErr(e)
        }
    }

    async function requestOtp() {
        try {
            await api.post('/api/auth/request-otp', { phone: phone.trim() }) // E.164
            setOtpRequested(true)
            toast.success('Código enviado (confira o console do servidor).')
        } catch (e) {
            showErr(e)
        }
    }

    async function verifyOtp() {
        try {
            const { data } = await api.post('/api/auth/login-otp', {
                phone: phone.trim(),
                code: otp.trim(),
            })
            setToken(data.token)
            setAuth(data.token, data.user)
            toast.success('Logado por SMS!')
            nav('/dashboard')
        } catch (e) {
            showErr(e)
        }
    }

    // ------- UI
    const tabs: { key: Mode; label: string; icon: any }[] = [
        { key: 'login', label: 'Entrar', icon: LogIn },
        { key: 'register', label: 'Registrar', icon: UserPlus },
        { key: 'forgot', label: 'Esqueci senha', icon: KeyRound },
        { key: 'sms', label: 'Entrar com SMS', icon: Smartphone },
    ]
    const idx = tabs.findIndex((t) => t.key === mode)

    return (
        <AuthLayout>
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-900/60 p-8 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] sm:p-10">
                {/* TABS (ícones) – não roubam foco */}
                <div
                    className="relative mb-6"
                    onMouseDownCapture={(e) => e.preventDefault()}
                >
                    <div className="relative mx-auto w-max overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
                        {/* pista/clip do indicador */}
                        <div className="pointer-events-none absolute inset-1.5 overflow-hidden rounded-xl">
                            <span
                                className="absolute inset-y-0 left-0 w-1/4 rounded-xl border border-white/10 bg-gradient-to-br from-violet-700/40 to-emerald-600/40 backdrop-blur-sm transition-transform duration-300"
                                style={{ transform: `translateX(${idx * 100}%)` }}
                                aria-hidden
                            />
                        </div>

                        <div className="relative z-10 grid grid-cols-4 p-1.5">
                            {tabs.map((t) => {
                                const Icon = t.icon
                                const active = mode === t.key
                                return (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setMode(t.key)}
                                        aria-selected={active}
                                        aria-label={t.label}
                                        title={t.label}
                                        className={`flex h-10 w-12 items-center justify-center rounded-xl sm:w-14 md:w-16 ${active ? 'text-white' : 'text-zinc-300 hover:text-white'
                                            }`}
                                    >
                                        <Icon className="size-5" />
                                        <span className="sr-only">{t.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Cabeçalho */}
                <header className="mb-5">
                    <h1 className="text-3xl font-semibold">
                        {mode === 'login' && 'Entrar'}
                        {mode === 'register' && 'Criar conta'}
                        {mode === 'forgot' && (fpStep === 1 ? 'Redefinir senha' : 'Definir nova senha')}
                        {mode === 'sms' && 'Entrar com SMS'}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        {mode === 'login' && 'Use seu e-mail e senha para acessar.'}
                        {mode === 'register' &&
                            'Preencha os campos para começar a usar o ShortTrack.'}
                        {mode === 'forgot' &&
                            (fpStep === 1
                                ? 'Enviaremos um token para o seu e-mail.'
                                : 'Cole o token e escolha sua nova senha.')}
                        {mode === 'sms' &&
                            (otpRequested
                                ? 'Digite o código recebido por SMS.'
                                : 'Informe o telefone cadastrado para receber o código.')}
                    </p>
                </header>

                {/* FORMULÁRIOS */}
                {mode === 'login' && (
                    <form
                        className="space-y-4"
                        onSubmit={(e: React.FormEvent) => {
                            e.preventDefault()
                            submitLogin()
                        }}
                    >
                        <Input
                            ref={loginEmailRef}
                            icon={Mail}
                            placeholder="E-mail"
                            autoFocus
                            value={email}
                            onChange={(e: InputEvt) => setEmail(e.target.value)}
                        />
                        <Input
                            icon={Lock}
                            placeholder="Senha"
                            type="password"
                            value={password}
                            onChange={(e: InputEvt) => setPassword(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-[15px] transition hover:bg-violet-500"
                        >
                            Entrar <ArrowRight className="size-4" />
                        </button>
                    </form>
                )}

                {mode === 'register' && (
                    <form
                        className="space-y-4"
                        onSubmit={(e: React.FormEvent) => {
                            e.preventDefault()
                            submitRegister()
                        }}
                    >
                        <Input
                            ref={regNameRef}
                            icon={User}
                            placeholder="Nome"
                            autoFocus
                            value={name}
                            onChange={(e: InputEvt) => setName(e.target.value)}
                        />
                        <Input
                            icon={Mail}
                            placeholder="E-mail"
                            value={email}
                            onChange={(e: InputEvt) => setEmail(e.target.value)}
                        />
                        <Input
                            icon={Lock}
                            placeholder="Senha"
                            type="password"
                            value={password}
                            onChange={(e: InputEvt) => setPassword(e.target.value)}
                        />

                        {/* Telefone internacional com seletor de país (E.164) */}
                        <IntlPhoneField value={phone} onChange={setPhone} />

                        <button
                            type="submit"
                            className="w-full rounded-xl bg-emerald-600 py-3.5 text-[15px] transition hover:bg-emerald-500"
                        >
                            Registrar
                        </button>
                    </form>
                )}

                {mode === 'forgot' &&
                    (fpStep === 1 ? (
                        <form
                            className="space-y-4"
                            onSubmit={(e: React.FormEvent) => {
                                e.preventDefault()
                                forgotStep1()
                            }}
                        >
                            <Input
                                ref={fpEmailRef}
                                icon={Mail}
                                placeholder="E-mail da conta"
                                autoFocus
                                value={fpEmail}
                                onChange={(e: InputEvt) => setFpEmail(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-[15px] transition hover:bg-violet-500"
                            >
                                Enviar código <Send className="size-4" />
                            </button>
                        </form>
                    ) : (
                        <form
                            className="space-y-4"
                            onSubmit={(e: React.FormEvent) => {
                                e.preventDefault()
                                forgotStep2()
                            }}
                        >
                            <Input
                                icon={KeyRound}
                                placeholder="Token recebido"
                                value={fpToken}
                                onChange={(e: InputEvt) => setFpToken(e.target.value)}
                            />
                            <Input
                                icon={Lock}
                                placeholder="Nova senha"
                                type="password"
                                value={fpNewPass}
                                onChange={(e: InputEvt) => setFpNewPass(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="w-full rounded-xl bg-emerald-600 py-3.5 text-[15px] transition hover:bg-emerald-500"
                            >
                                Redefinir
                            </button>
                        </form>
                    ))}

                {mode === 'sms' &&
                    (!otpRequested ? (
                        // Passo 1 — pedir código
                        <form
                            className="grid gap-3 md:grid-cols-[1fr_auto]"
                            onSubmit={(e: React.FormEvent) => {
                                e.preventDefault()
                                requestOtp()
                            }}
                        >
                            <IntlPhoneField
                                ref={smsPhoneRef}
                                value={phone}
                                onChange={setPhone}
                            />
                            <button
                                type="submit"
                                className="md:h-[52px] rounded-xl bg-violet-600 px-6 py-3.5 text-[15px] transition hover:bg-violet-500"
                            >
                                Enviar código
                            </button>
                        </form>
                    ) : (
                        // Passo 2 — validar código
                        <form
                            className="grid gap-3 md:grid-cols-3"
                            onSubmit={(e: React.FormEvent) => {
                                e.preventDefault()
                                verifyOtp()
                            }}
                        >
                            <IntlPhoneField
                                value={phone}
                                onChange={setPhone}
                                className="md:col-span-2"
                            />
                            <Input
                                icon={KeyRound}
                                placeholder="Código"
                                value={otp}
                                onChange={(e: InputEvt) => setOtp(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="md:col-span-3 rounded-xl bg-emerald-600 py-3.5 text-[15px] transition hover:bg-emerald-500"
                            >
                                Entrar
                            </button>
                        </form>
                    ))}
            </div>
        </AuthLayout>
    )
}