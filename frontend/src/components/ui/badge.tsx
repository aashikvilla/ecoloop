import type { HTMLAttributes } from "react";

type Tone = "neutral" | "green" | "terra" | "amber";
const tones: Record<Tone, string> = { neutral: "bg-surface-raised text-muted", green: "bg-primary-soft text-primary", terra: "bg-secondary-soft text-secondary", amber: "bg-tertiary-soft text-tertiary" };

export function Badge({ tone = "neutral", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${tones[tone]} ${className}`} {...props} />;
}
