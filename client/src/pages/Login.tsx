import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, KeyRound, Link as LinkIcon, Shield } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Mode = "login" | "register" | "forgot";

const pageVariants = {
    initial: { opacity: 0, y: 8, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -8, filter: "blur(4px)" },
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }, // <-- Add 'as const' here
};

export default function AuthPage() {
    const nav = useNavigate();
    const [mode, setMode] = useState<Mode>("login");

    // toast global (opcional via window.toast)
    const toast = (window as any).toast as
        | undefined
        | { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void };

    const showErr = (e: unknown, fallback = "Erro ao processar a solicitação.") => {
        const err = e as any;
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
        toast?.error?.(msg);
    };

    /* ====================== LOGIN ====================== */
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [totp, setTotp] = useState("");
    const [showTotp, setShowTotp] = useState(false);
    const [logging, setLogging] = useState(false);
    const [errEmail, setErrEmail] = useState<string>();
    const [errPass, setErrPass] = useState<string>();
    const [errCode, setErrCode] = useState<string>();

    async function onSubmitLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErrEmail(undefined);
        setErrPass(undefined);
        setErrCode(undefined);
        setLogging(true);

        try {
            const payload: any = { email, password };
            if (showTotp && totp.trim()) payload.code = totp.trim();

            const { data } = await api.post("/api/auth/login", payload);
            setToken(data.token);
            toast?.success?.("Bem-vindo!");
            nav("/dashboard");
        } catch (err: any) {
            const fd = err?.response?.data;
            if (fd?.field === "code") {
                setShowTotp(true);
                setErrCode(fd.message || "Informe o código do autenticador.");
                toast?.info?.("Este usuário tem 2FA habilitado. Digite o código do autenticador.");
            } else if (fd?.field === "email") {
                setErrEmail(fd.message);
            } else if (fd?.field === "password") {
                setErrPass(fd.message);
            } else {
                showErr(err);
            }
        } finally {
            setLogging(false);
        }
    }

    async function onMagicLink() {
        if (!email) {
            toast?.warning?.("Informe seu e-mail para receber o link mágico.");
            return;
        }
        try {
            const { data } = await api.post("/api/auth/magic/request", { email });
            toast?.success?.("Se o e-mail existir, enviaremos um link de acesso.");
            if (data?.magicUrl) window.open(data.magicUrl, "_blank", "noopener,noreferrer"); // DEV sem SMTP
        } catch (e) {
            showErr(e);
        }
    }

    /* ====================== REGISTER =================== */
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [emailCode, setEmailCode] = useState("");
    const [regPhone, setRegPhone] = useState("");
    const [regPass, setRegPass] = useState("");
    const [devEmailCode, setDevEmailCode] = useState<string>();
    const [registering, setRegistering] = useState(false);

    async function onRequestEmailCode() {
        if (!regEmail) return toast?.warning?.("Informe o e-mail.");
        try {
            const { data } = await api.post("/api/auth/register/request-email-code", { email: regEmail });
            if (data?.devCode) setDevEmailCode(data.devCode);
            toast?.success?.("Código enviado para o seu e-mail.");
        } catch (e) {
            showErr(e);
        }
    }

    async function onSubmitRegister(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setRegistering(true);
        try {
            const payload = {
                name: regName,
                email: regEmail,
                password: regPass,
                phone: regPhone || undefined,
                emailCode,
            };
            const { data } = await api.post("/api/auth/register", payload);
            if (data?.next === "verify-phone") {
                toast?.success?.("Cadastro criado! Confirme seu telefone.");
                nav("/verify-phone", { state: { userId: data.userId, phone: regPhone } });
            } else {
                toast?.success?.("Cadastro criado! Você já pode acessar.");
                nav("/dashboard");
            }
        } catch (e) {
            showErr(e);
        } finally {
            setRegistering(false);
        }
    }

    /* ====================== FORGOT ===================== */
    const [fpEmail, setFpEmail] = useState("");
    const [fpCode, setFpCode] = useState("");
    const [fpNewPass, setFpNewPass] = useState("");
    const [fpStep, setFpStep] = useState<1 | 2>(1);
    const [fpLoading, setFpLoading] = useState(false);

    async function forgotStep1(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFpLoading(true);
        try {
            const { data } = await api.post("/api/auth/password/request", { email: fpEmail });
            if (data?.devCode) toast?.info?.(`DEV code: ${data.devCode}`);
            toast?.info?.("Enviamos um código para o e-mail informado.");
            setFpStep(2);
        } catch (e) {
            showErr(e);
        } finally {
            setFpLoading(false);
        }
    }

    async function forgotStep2(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFpLoading(true);
        try {
            await api.post("/api/auth/password/confirm", { email: fpEmail, code: fpCode, newPassword: fpNewPass });
            toast?.success?.("Senha redefinida! Faça login.");
            setMode("login");
            setEmail(fpEmail);
            setPassword("");
            setFpCode("");
            setFpNewPass("");
        } catch (e) {
            showErr(e);
        } finally {
            setFpLoading(false);
        }
    }

    /* ========================= UI ====================== */
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-white flex items-center justify-center">
            <Card className="w-[520px] max-w-[92vw] bg-[#101014] border border-white/10 shadow-2xl rounded-3xl">
                <CardHeader className="pt-8">
                    <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
                        <div className="flex justify-center">
                            <TabsList className="bg-white/5 rounded-2xl p-1">
                                <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                                    <LogIn className="w-4 h-4" />
                                </TabsTrigger>
                                <TabsTrigger value="register" className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                                    <UserPlus className="w-4 h-4" />
                                </TabsTrigger>
                                <TabsTrigger value="forgot" className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                                    <KeyRound className="w-4 h-4" />
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </Tabs>
                </CardHeader>

                <CardContent className="pb-8">
                    <AnimatePresence mode="wait">
                        {/* LOGIN */}
                        {mode === "login" && (
                            <motion.div
                                key="login"
                                initial={pageVariants.initial}
                                animate={pageVariants.animate}
                                exit={pageVariants.exit}
                                transition={pageVariants.transition}
                            >
                                <CardTitle className="mb-2">Entrar</CardTitle>
                                <p className="text-white/60 text-sm mb-5">Use seu e-mail e senha para acessar.</p>

                                <form onSubmit={onSubmitLogin} className="space-y-3">
                                    <div>
                                        <Input
                                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                            placeholder="E-mail"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            autoComplete="username"
                                        />
                                        {errEmail && <p className="text-red-400 text-xs mt-1">{errEmail}</p>}
                                    </div>

                                    <div>
                                        <Input
                                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                            placeholder="Senha"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="current-password"
                                        />
                                        {errPass && <p className="text-red-400 text-xs mt-1">{errPass}</p>}
                                    </div>

                                    {/* Ações secundárias */}
                                    <div className="flex items-center justify-between pt-1">
                                        {!showTotp ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowTotp(true)}
                                                className="text-sm text-white/70 hover:text-white flex items-center gap-2"
                                            >
                                                <Shield className="w-4 h-4" />
                                                Tenho código do autenticador
                                            </button>
                                        ) : (
                                            <span className="text-xs text-white/50 flex items-center gap-2">
                                                <Shield className="w-4 h-4" />
                                                2FA habilitado para este login
                                            </span>
                                        )}

                                        <button
                                            type="button"
                                            onClick={onMagicLink}
                                            className="text-sm text-violet-400 hover:underline flex items-center gap-2"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                            Link mágico
                                        </button>
                                    </div>

                                    {/* Campo TOTP com animação */}
                                    <AnimatePresence initial={false}>
                                        {showTotp && (
                                            <motion.div
                                                key="totp"
                                                initial={{ height: 0, opacity: 0, y: -4 }}
                                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                                exit={{ height: 0, opacity: 0, y: -4 }}
                                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <div className="pt-2">
                                                    <Input
                                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                                        placeholder="Código do autenticador (6 dígitos)"
                                                        value={totp}
                                                        onChange={(e) => setTotp(e.target.value)}
                                                        inputMode="numeric"
                                                        autoComplete="one-time-code"
                                                    />
                                                    {errCode && <p className="text-red-400 text-xs mt-1">{errCode}</p>}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Button type="submit" disabled={logging} className="w-full bg-violet-600 hover:bg-violet-500 rounded-xl">
                                        {logging ? "Entrando..." : "Entrar →"}
                                    </Button>

                                    <div className="text-right">
                                        <button type="button" onClick={() => setMode("forgot")} className="text-sm text-violet-400 hover:underline">
                                            Esqueci minha senha
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 text-xs text-white/50">
                                        <Shield className="w-4 h-4" />
                                        Seus dados são protegidos e usados apenas para autenticação.
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* REGISTER */}
                        {mode === "register" && (
                            <motion.div
                                key="register"
                                initial={pageVariants.initial}
                                animate={pageVariants.animate}
                                exit={pageVariants.exit}
                                transition={pageVariants.transition}
                            >
                                <CardTitle className="mb-2">Criar conta</CardTitle>
                                <p className="text-white/60 text-sm mb-5">
                                    Confirme seu e-mail (e telefone, se quiser usar SMS) para ativar a conta.
                                </p>

                                <form onSubmit={onSubmitRegister} className="space-y-3">
                                    <Input
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                        placeholder="Nome"
                                        value={regName}
                                        onChange={(e) => setRegName(e.target.value)}
                                    />

                                    <Input
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                        placeholder="E-mail"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        type="email"
                                    />

                                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                                        <Input
                                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                            placeholder="Código recebido por e-mail"
                                            value={emailCode}
                                            onChange={(e) => setEmailCode(e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            onClick={onRequestEmailCode}
                                            variant="secondary"
                                            className="md:h-[42px] bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl"
                                        >
                                            Enviar código
                                        </Button>
                                    </div>
                                    {devEmailCode && <p className="text-xs opacity-70">DEV: código = {devEmailCode}</p>}

                                    <Input
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                        placeholder="Senha"
                                        type="password"
                                        value={regPass}
                                        onChange={(e) => setRegPass(e.target.value)}
                                    />

                                    <Button disabled={registering} className="w-full bg-violet-600 hover:bg-violet-500 rounded-xl">
                                        {registering ? "Criando..." : "Criar conta"}
                                    </Button>

                                    <p className="text-sm text-center text-white/70">
                                        Já tem conta?{" "}
                                        <button type="button" className="text-violet-400 hover:underline" onClick={() => setMode("login")}>
                                            Entrar
                                        </button>
                                    </p>
                                </form>
                            </motion.div>
                        )}

                        {/* FORGOT */}
                        {mode === "forgot" && (
                            <motion.div
                                key="forgot"
                                initial={pageVariants.initial}
                                animate={pageVariants.animate}
                                exit={pageVariants.exit}
                                transition={pageVariants.transition}
                            >
                                <CardTitle className="mb-2">Esqueci minha senha</CardTitle>
                                <p className="text-white/60 text-sm mb-5">Enviaremos um código para o seu e-mail.</p>

                                {fpStep === 1 && (
                                    <form onSubmit={forgotStep1} className="space-y-3">
                                        <Input
                                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                            placeholder="Seu e-mail"
                                            value={fpEmail}
                                            onChange={(e) => setFpEmail(e.target.value)}
                                            type="email"
                                        />
                                        <Button disabled={fpLoading} className="w-full bg-violet-600 hover:bg-violet-500 rounded-xl">
                                            {fpLoading ? "Enviando..." : "Enviar código"}
                                        </Button>
                                    </form>
                                )}

                                {fpStep === 2 && (
                                    <form onSubmit={forgotStep2} className="space-y-3">
                                        <Input
                                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                            placeholder="Código (6 dígitos)"
                                            value={fpCode}
                                            onChange={(e) => setFpCode(e.target.value)}
                                        />
                                        <Input
                                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                            placeholder="Nova senha"
                                            type="password"
                                            value={fpNewPass}
                                            onChange={(e) => setFpNewPass(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => setFpStep(1)}
                                                className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl"
                                            >
                                                Voltar
                                            </Button>
                                            <Button disabled={fpLoading} className="flex-1 bg-violet-600 hover:bg-violet-500 rounded-xl">
                                                {fpLoading ? "Redefinindo..." : "Redefinir"}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
}