"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLiveHousehold } from "@/lib/live-household";
import { loginPathFor } from "@/lib/workspace-routing";

export function ProtectedBoundary({ children }: { children: ReactNode }) {
	const { auth } = useLiveHousehold();
	const pathname = usePathname();
	const router = useRouter();
	useEffect(() => {
		if (auth !== "signed-out") return;
		const destination = `${window.location.pathname}${window.location.search}`;
		router.replace(loginPathFor(destination));
	}, [auth, pathname, router]);

	if (auth === "signed-in") return children;
	if (auth === "unavailable" || auth === "error") return <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10"><h1 className="text-2xl font-bold text-primary">EcoLoop sign-in is unavailable</h1><p className="mt-3 text-sm leading-6 text-muted">We could not verify your Firebase sign-in. Check the connection and reload before opening private records.</p><Link href="/login" className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline">Open sign in</Link></main>;
	return <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10" role="status" aria-live="polite"><div className="h-7 w-3/4 animate-pulse rounded-xl bg-surface-muted"/><p className="mt-4 text-sm text-muted">{auth === "signed-out" ? "Taking you to sign in…" : "Checking your sign-in…"}</p></main>;
}
