"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLiveHousehold } from "@/lib/live-household";
import { listCanonicalHouseholds } from "@/lib/canonical-api";

export function PersonalWorkspaceBoundary({ children }: { children: ReactNode }) {
	const { auth, user, householdId, setHouseholdId } = useLiveHousehold();
	const pathname = usePathname();
	const router = useRouter();
	const [revision, setRevision] = useState(0);
	const [errorState, setErrorState] = useState<{ scope: string; message: string } | null>(null);
	const [verifiedScope, setVerifiedScope] = useState("");
	const currentScope = `${user?.uid ?? ""}:${householdId}`;
	const error = errorState?.scope === currentScope ? errorState.message : "";

	useEffect(() => {
		if (auth !== "signed-in" || !user) return;
		if (pathname === "/account" || pathname.startsWith("/account/")) return;
		const scope = `${user.uid}:${householdId}`;
		if (householdId && verifiedScope === scope) return;
		let active = true;
		void user.getIdToken().then((token) => listCanonicalHouseholds(token)).then((memberships) => {
			if (!active) return;
			if (householdId && memberships.some((membership) => membership.household_id === householdId)) {
				setVerifiedScope(scope);
				return;
			}
			setHouseholdId("");
			setVerifiedScope("");
			if (memberships.length === 1) {
				setHouseholdId(memberships[0].household_id);
				setVerifiedScope(`${user.uid}:${memberships[0].household_id}`);
				return;
			}
			const next = `${window.location.pathname}${window.location.search}`;
			router.replace(`/account?next=${encodeURIComponent(next)}`);
		}).catch((cause: unknown) => {
			if (active) setErrorState({ scope, message: cause instanceof Error ? cause.message : "Your household access could not be checked." });
		});
		return () => { active = false; };
	}, [auth, householdId, pathname, revision, router, setHouseholdId, user, verifiedScope]);

	if (pathname === "/account" || pathname.startsWith("/account/")) return children;
	if (error) return <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-10"><h1 className="text-2xl font-bold text-primary">Household access could not be checked</h1><p role="alert" className="mt-3 text-sm leading-6 text-danger">{error}</p><Button className="mt-5 self-start" variant="secondary" onClick={() => { setErrorState(null); setRevision((value) => value + 1); }}>Try again</Button><Link href="/account" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Choose a household</Link></main>;
	if (householdId && verifiedScope === `${user?.uid}:${householdId}`) return children;
	return <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-10" role="status" aria-live="polite"><div className="h-7 w-3/4 animate-pulse rounded-xl bg-surface-muted"/><p className="mt-4 text-sm text-muted">Checking your household access…</p></main>;
}
