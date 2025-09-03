// src/pages/TotpSetup.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setupTotp, enableTotp } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, QrCode, ShieldCheck, Loader2, Copy } from "lucide-react";

export default function TotpSetup() {
    const nav = useNavigate();
    const toast = (window as any).toast as
        | undefined
        | {
            success: (m: string) => void;
            error: (m: string) => void;
            info: (m: string) => void;
            warning: (m: string) => void;
        };

    const [loading, setLoading] = useState(false);
    const [enabling, setEnabling] = useState(false);
    const [qr, setQr] = useState<string>();
    const [otpAuth, setOtpAuth] = useState<string>();
    const [code, setCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>();

    async function startSetup() {
        try {
            setLoading(true);
            const res = await setupTotp();
            setQr(res.qrDataUrl);
            setOtpAuth(res.otpAuth);
            toast?.info?.("Escaneie o QR no Google Authenticator.");
        } catch (e: any) {
            toast?.error?.(e?.response?.data?.error || "Erro ao iniciar TOTP.");
        } finally {
            setLoading(false);
        }
    }

    async function onEnable() {
        if (!code || code.length !== 6) {
            return toast?.warning?.("Informe o código de 6 dígitos.");
        }
        try {
            setEnabling(true);
            const res = await enableTotp(code);
            setBackupCodes(res.backupCodes);
            toast?.success?.("TOTP habilitado!");
        } catch (e: any) {
            toast?.error?.(e?.response?.data?.error || "Não foi possível habilitar.");
        } finally {
            setEnabling(false);
        }
    }

    function copyBackup() {
        if (!backupCodes?.length) return;
        navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
            toast?.success?.("Códigos copiados!");
        });
    }

    return (
        <div className="min-h-screen bg-[#0b0b0d] text-white flex items-center justify-center p-6">
            <Card className="w-[720px] max-w-[96vw] bg-[#101014] border border-white/10 shadow-2xl rounded-3xl">
                <CardHeader className="pt-8">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-violet-400" />
                        Configurar verificação por app (TOTP)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-8 space-y-6">
                    {!qr ? (
                        <div className="text-center space-y-4">
                            <p className="text-white/70">
                                Gere um QR Code, escaneie no Google Authenticator (ou Authy, 1Password, etc.)
                                e depois digite o código de 6 dígitos para ativar.
                            </p>
                            <Button
                                onClick={startSetup}
                                disabled={loading}
                                className="rounded-xl bg-violet-600 hover:bg-violet-500"
                            >
                                {loading ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Gerando…
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2">
                                        <QrCode className="h-4 w-4" />
                                        Gerar QR Code
                                    </span>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={qr}
                                        alt="QR Code"
                                        className="h-56 w-56 rounded-lg"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <p className="text-sm text-white/70">
                                        Escaneie o QR Code no seu aplicativo autenticador. Caso prefira,
                                        adicione manualmente usando a URL abaixo:
                                    </p>
                                    <code className="block break-all rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
                                        {otpAuth}
                                    </code>

                                    <div className="space-y-2">
                                        <label className="text-sm text-white/80">Código do autenticador</label>
                                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                                            <KeyRound className="h-4 w-4 text-white/70" />
                                            <input
                                                inputMode="numeric"
                                                pattern="\d{6}"
                                                maxLength={6}
                                                className="w-full bg-transparent py-2 text-sm text-white placeholder:text-white/40 outline-none"
                                                placeholder="6 dígitos"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            onClick={() => nav(-1)}
                                            variant="secondary"
                                            className="flex-1 rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15"
                                        >
                                            Voltar
                                        </Button>
                                        <Button
                                            onClick={onEnable}
                                            disabled={enabling}
                                            className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500"
                                        >
                                            {enabling ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Ativando…
                                                </span>
                                            ) : (
                                                "Ativar"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {backupCodes && (
                                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                                    <p className="mb-2 font-medium text-emerald-300">Códigos de backup</p>
                                    <p className="mb-3 text-sm text-white/80">
                                        Guarde em local seguro. Cada código pode ser usado uma vez se você perder acesso ao app autenticador.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                        {backupCodes.map((c) => (
                                            <div key={c} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center font-mono text-sm">
                                                {c}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-3">
                                        <Button onClick={copyBackup} variant="secondary" className="rounded-xl border border-white/10 bg-white/10 hover:bg-white/15">
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copiar todos
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}