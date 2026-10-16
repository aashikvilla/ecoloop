"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, Heading } from "@/components/ui";

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">{eyebrow}</p>}<Heading as="h1" className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</Heading><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p></div>{action}</div>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Card className={`rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6 ${className}`}>{children}</Card>;
}

export function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{children}</Link>;
}

export function QuietLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-primary hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{children}</Link>;
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "success" }) {
  const styles = { info: "bg-surface-muted text-primary", warn: "bg-accent/15 text-accent", success: "bg-primary-container text-primary" };
  return <div role="status" className={`rounded-2xl px-4 py-3 text-sm leading-5 ${styles[tone]}`}>{children}</div>;
}

export function UnitLabel({ amount, unit }: { amount: number | null; unit: string | null }) {
  return amount === null || unit === null ? <span>Amount unknown</span> : <span>{amount} {unit}</span>;
}
