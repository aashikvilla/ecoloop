"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authMessage } from "@/lib/auth-errors";
import { getFirebaseClient } from "@/lib/firebase-client";

export type LoginMode = "personal" | "organization";

export function SignInForm({ mode }: { mode: LoginMode }) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [emailMode, setEmailMode] = useState<"sign-in" | "create">("sign-in");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	async function signInWithGoogle() {
		setBusy(true);
		setError("");
		try {
			const firebase = await getFirebaseClient();
			if (!firebase) {
				setError("Firebase sign-in is not configured for this app yet.");
				return;
			}
			const { signInWithPopup } = await import("firebase/auth");
			await signInWithPopup(firebase.auth, firebase.provider);
		} catch (cause) {
			setError(authMessage(cause));
		} finally {
			setBusy(false);
		}
	}

	async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const firebase = await getFirebaseClient();
			if (!firebase) {
				setError("Firebase sign-in is not configured for this app yet.");
				return;
			}
			const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import("firebase/auth");
			if (emailMode === "create") {
				await createUserWithEmailAndPassword(firebase.auth, email.trim(), password);
			} else {
				await signInWithEmailAndPassword(firebase.auth, email.trim(), password);
			}
			setPassword("");
		} catch (cause) {
			setError(authMessage(cause));
		} finally {
			setBusy(false);
		}
	}

	return <div className="space-y-5">
		<div className="space-y-3">
			<Button fullWidth variant="secondary" onClick={() => void signInWithGoogle()} disabled={busy} aria-busy={busy}>
				{busy ? "Connecting…" : "Continue with Google"}
			</Button>
			<div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted"><span className="h-px flex-1 bg-line"/><span>or use email</span><span className="h-px flex-1 bg-line"/></div>
		</div>
		<div className="flex rounded-full bg-surface-muted p-1" role="group" aria-label="Email account action">
			<button type="button" className={`min-h-11 flex-1 rounded-full px-3 text-sm font-semibold ${emailMode === "sign-in" ? "bg-white text-primary shadow-sm" : "text-muted"}`} aria-pressed={emailMode === "sign-in"} onClick={() => { setEmailMode("sign-in"); setError(""); }}>Sign in</button>
			<button type="button" className={`min-h-11 flex-1 rounded-full px-3 text-sm font-semibold ${emailMode === "create" ? "bg-white text-primary shadow-sm" : "text-muted"}`} aria-pressed={emailMode === "create"} onClick={() => { setEmailMode("create"); setError(""); }}>Create account</button>
		</div>
		<form onSubmit={signInWithEmail} className="space-y-3">
			<div><label htmlFor="login-email" className="mb-1 block text-sm font-semibold">Email</label><Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></div>
			<div><label htmlFor="login-password" className="mb-1 block text-sm font-semibold">Password</label><Input id="login-password" type="password" autoComplete={emailMode === "create" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)}/></div>
			<Button fullWidth type="submit" disabled={busy} aria-busy={busy}>{busy ? "Connecting…" : emailMode === "create" ? "Create account" : "Sign in with email"}</Button>
		</form>
		{error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
		<p className="text-xs leading-relaxed text-muted">{mode === "organization" ? "Organization access is checked against your approved EcoLoop membership after sign-in." : "Your household records are available only to signed-in household members."}</p>
	</div>;
}
