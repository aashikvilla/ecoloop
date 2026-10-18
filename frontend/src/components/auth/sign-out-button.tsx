"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getFirebaseClient } from "@/lib/firebase-client";
import { authMessage } from "@/lib/auth-errors";

export function SignOutButton() {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function handleSignOut() {
		setBusy(true);
		setError("");
		try {
			const firebase = await getFirebaseClient();
			if (!firebase) throw new Error("Firebase sign-in is unavailable.");
			const { signOut } = await import("firebase/auth");
			await signOut(firebase.auth);
			router.replace("/");
		} catch (cause) {
			setError(authMessage(cause));
		} finally {
			setBusy(false);
		}
	}
	return <div className="flex flex-col items-end gap-1">
		<Button size="sm" variant="secondary" className="gap-1.5 px-3" onClick={() => void handleSignOut()} disabled={busy} aria-busy={busy} aria-label={busy ? "Signing out" : "Sign out"}><Icon name="logout" size={17}/><span className="hidden sm:inline">{busy ? "Signing out…" : "Sign out"}</span></Button>
		{error && <span role="alert" className="max-w-56 text-right text-xs text-danger">{error}</span>}
	</div>;
}
