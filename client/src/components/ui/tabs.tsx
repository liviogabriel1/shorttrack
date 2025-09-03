import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type TabsContextType = {
    value: string;
    setValue: (v: string) => void;
};
const TabsCtx = React.createContext<TabsContextType | null>(null);

export function Tabs({
    value,
    onValueChange,
    className,
    children,
}: {
    value: string;
    onValueChange: (v: string) => void;
    className?: string;
    children: React.ReactNode;
}) {
    const [internal, setInternal] = React.useState(value);
    React.useEffect(() => setInternal(value), [value]);
    const setValue = (v: string) => {
        setInternal(v);
        onValueChange(v);
    };
    return (
        <TabsCtx.Provider value={{ value: internal, setValue }}>
            <div className={className}>{children}</div>
        </TabsCtx.Provider>
    );
}

export function TabsList({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return <div className={cn("inline-flex rounded-2xl bg-white/5 p-1", className)}>{children}</div>;
}

export function TabsTrigger({
    value,
    className,
    children,
}: {
    value: string;
    className?: string;
    children: React.ReactNode;
}) {
    const ctx = React.useContext(TabsCtx)!;
    const active = ctx.value === value;
    return (
        <button
            type="button"
            onClick={() => ctx.setValue(value)}
            className={cn(
                "h-9 w-10 grid place-items-center rounded-xl text-white/80 transition",
                active ? "bg-violet-600 text-white" : "hover:bg-white/10",
                className
            )}
        >
            {children}
        </button>
    );
}

export function TabsContent({
    value,
    children,
    className,
}: {
    value: string;
    children: React.ReactNode;
    className?: string;
}) {
    const ctx = React.useContext(TabsCtx)!;
    if (ctx.value !== value) return null;
    return <div className={className}>{children}</div>;
}