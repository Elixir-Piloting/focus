import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "danger" | "surface" | "ghost" | "ghost-accent" | "outline-danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-1.5 border-0 cursor-pointer transition-colors duration-150 shadow-inset-sm shrink-0";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white font-semibold hover:bg-accent-hover active:bg-accent-pressed disabled:bg-input disabled:text-ink-faint disabled:cursor-default",
  danger:
    "bg-danger text-white font-semibold hover:bg-danger/80 disabled:bg-input disabled:text-ink-faint disabled:cursor-default",
  surface:
    "bg-surface text-accent font-medium hover:bg-hover",
  ghost:
    "bg-transparent text-ink-muted font-medium hover:bg-input",
  "ghost-accent":
    "bg-transparent text-accent font-medium hover:bg-input",
  "outline-danger":
    "bg-transparent text-danger border border-danger font-semibold hover:bg-danger hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "p-1.5 rounded-full",
  md: "px-4 py-2 text-sm rounded-full",
  lg: "px-5 py-2.5 text-sm rounded-full",
};

export function Button({ variant = "primary", size = "md", icon, children, className = "", ...props }: Props) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}
