import { PropsWithChildren } from "react"

export default function AuthLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen relative overflow-hidden bg-zinc-950 text-zinc-100">
            <div className="pointer-events-none absolute inset-0 background-grid" />
            <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-violet-600/25 blur-3xl animate-[float_10s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-emerald-500/20 blur-3xl animate-[float_12s_ease-in-out_infinite]" />
            <div className="relative z-10 flex items-center justify-center p-6">{children}</div>
        </div>
    )
}