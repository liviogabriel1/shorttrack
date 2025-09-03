import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-violet-600 text-white hover:bg-violet-500",
                secondary: "bg-white/10 text-white border border-white/10 hover:bg-white/15",
                ghost: "bg-transparent hover:bg-white/10 text-white",
                outline: "border border-white/10 hover:bg-white/5",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 px-3",
                lg: "h-11 px-6",
                icon: "h-10 w-10",
            },
            rounded: { xl: "rounded-xl", md: "rounded-md" },
        },
        defaultVariants: { variant: "default", size: "default", rounded: "xl" },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, rounded, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, rounded }), className)}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";