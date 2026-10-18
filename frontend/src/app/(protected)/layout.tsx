import { Suspense } from "react";
import type { ReactNode } from "react";
import { ProtectedBoundary } from "@/components/auth/protected-boundary";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
	return <Suspense fallback={<main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10" role="status"><div className="h-7 w-3/4 animate-pulse rounded-xl bg-surface-muted"/><p className="mt-4 text-sm text-muted">Checking your sign-in…</p></main>}><ProtectedBoundary>{children}</ProtectedBoundary></Suspense>;
}
