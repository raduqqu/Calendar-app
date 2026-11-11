import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:bg-primary-hover",
  secondary:
    "border border-border bg-surface text-ink hover:bg-subtle active:bg-subtle",
  ghost: "text-primary hover:bg-subtle active:bg-subtle",
  danger: "bg-danger text-white hover:opacity-90 active:opacity-90",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-body",
  sm: "min-h-9 px-3 text-meta",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-button inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    />
  );
}
