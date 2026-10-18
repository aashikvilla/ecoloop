import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = { title: "Sign in · EcoLoop" };

export default function LoginPage() {
	return <Suspense fallback={<main className="mx-auto flex min-h-[calc(100vh-68px)] max-w-xl flex-col justify-center px-4 py-10" role="status"><div className="h-8 w-3/4 animate-pulse rounded-xl bg-surface-muted"/><p className="mt-4 text-sm text-muted">Loading sign in…</p></main>}><LoginScreen/></Suspense>;
}
