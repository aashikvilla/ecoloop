import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
};

const variants = {
  primary: "bg-primary text-white shadow-sm hover:bg-primary-container",
  secondary: "bg-surface-low text-primary hover:bg-primary-soft",
  ghost: "bg-transparent text-muted hover:bg-surface-low hover:text-primary",
  danger: "bg-danger-soft text-danger hover:bg-danger-hover",
};
const sizes = { sm: "min-h-11 px-4 text-sm", md: "min-h-12 px-5 text-sm", lg: "min-h-14 px-6 text-base" };

export function Button({ variant = "primary", size = "md", fullWidth, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`} {...props} />;
}
