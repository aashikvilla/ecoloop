"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { SignInForm, type LoginMode } from "@/components/auth/sign-in-form";
import { useLiveHousehold } from "@/lib/live-household";
import { safeWorkspaceReturnPath } from "@/lib/workspace-routing";

export function LoginScreen() {
	const params = useSearchParams();
	const router = useRouter();
	const { auth } = useLiveHousehold();
	const requestedMode = params.get("mode");
	const mode: LoginMode = requestedMode === "organization" ? "organization" : "personal";
	const nextPath = useMemo(() => safeWorkspaceReturnPath(params.get("next"), mode), [mode, params]);

	useEffect(() => {
		if (auth !== "signed-in") return;
		router.replace(nextPath ?? (mode === "organization" ? "/organization" : "/home"));
	}, [auth, mode, nextPath, router]);

	function selectMode(nextMode: LoginMode) {
		const query = new URLSearchParams(params.toString());
		query.set("mode", nextMode);
		if (query.has("next") && !safeWorkspaceReturnPath(query.get("next"), nextMode)) query.delete("next");
		router.replace(`/login?${query.toString()}`, { scroll: false });
	}

	return <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
		<div className="mx-auto max-w-md lg:mx-0">
			<Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"><Icon name="arrow" size={17} className="rotate-180"/>Back to EcoLoop</Link>
			<p className="mt-7 text-[11px] font-extrabold uppercase tracking-[.16em] text-secondary">Welcome to EcoLoop</p>
			<Heading as="h1" className="mt-2 text-3xl sm:text-4xl">Good food goes further when it stays in view.</Heading>
			<p className="mt-4 text-sm leading-6 text-muted">Sign in with your EcoLoop account, then continue to the workspace you chose. Access is based on your current household or organization membership.</p>
		</div>
		<Card className="mx-auto w-full max-w-xl border border-line p-5 shadow-card sm:p-8">
			<div role="tablist" aria-label="Choose your EcoLoop workspace" className="grid grid-cols-2 rounded-full bg-surface-muted p-1">
				<button type="button" role="tab" aria-selected={mode === "personal"} onClick={() => selectMode("personal")} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold transition-colors ${mode === "personal" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-primary"}`}><Icon name="home" size={18}/>Personal</button>
				<button type="button" role="tab" aria-selected={mode === "organization"} onClick={() => selectMode("organization")} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold transition-colors ${mode === "organization" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-primary"}`}><Icon name="organization" size={18}/>Organization</button>
			</div>
			<div className="py-6 text-center"><Heading as="h2" className="text-2xl">{mode === "personal" ? "Your household" : "Your organization"}</Heading><p className="mt-2 text-sm leading-relaxed text-muted">{mode === "personal" ? "Manage food, lists, and plans for a household you belong to." : "For food recovery organizations with approved EcoLoop access."}</p></div>
			{auth === "loading" && <p role="status" className="mb-4 text-center text-sm text-muted">Checking sign-in status…</p>}
			{auth === "error" && <p role="alert" className="mb-4 rounded-2xl bg-danger-soft p-3 text-sm text-danger">EcoLoop could not check your sign-in. Reload this page and try again.</p>}
			{auth === "unavailable" && <p role="status" className="mb-4 rounded-2xl bg-surface-muted p-3 text-sm text-muted">Firebase sign-in is not configured for this app yet.</p>}
			{auth === "signed-in" ? <p role="status" className="text-center text-sm text-muted">Opening your {mode === "personal" ? "personal" : "organization"} workspace…</p> : <SignInForm key={mode} mode={mode}/>}
			<p className="mt-5 border-t border-line pt-4 text-center text-xs leading-relaxed text-muted">Your sign-in is shared across both choices. Your access is checked for the workspace you select.</p>
		</Card>
	</div>;
}
