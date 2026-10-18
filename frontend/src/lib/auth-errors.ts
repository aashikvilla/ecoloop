export function authMessage(error: unknown): string {
	const code =
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "string"
			? error.code
			: "";
	const messages: Record<string, string> = {
		"auth/app-not-authorized": "This web app is not authorized for Firebase Authentication. Check its Firebase app registration and API key restrictions.",
		"auth/cancelled-popup-request": "Another sign-in popup is already open. Finish or close it, then try again.",
		"auth/email-already-in-use": "An account already uses this email. Sign in instead or use another email address.",
		"auth/invalid-api-key": "The Firebase web API key is missing or invalid for this app.",
		"auth/invalid-credential": "The email or password is incorrect.",
		"auth/invalid-email": "Enter a valid email address.",
		"auth/network-request-failed": "EcoLoop could not reach Firebase Authentication. Check the connection and try again.",
		"auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication settings.",
		"auth/popup-blocked": "The browser blocked the sign-in popup. Allow popups for this site, then try again.",
		"auth/popup-closed-by-user": "Sign-in was cancelled. You can continue when you are ready.",
		"auth/too-many-requests": "Firebase temporarily paused sign-in after too many attempts. Wait a bit, then retry.",
		"auth/unauthorized-domain": "This site is not authorized for Firebase sign-in. Add its hostname in Firebase Authentication settings.",
		"auth/user-not-found": "The email or password is incorrect.",
		"auth/weak-password": "Choose a stronger password with at least six characters.",
		"auth/wrong-password": "The email or password is incorrect.",
	};
	const message = messages[code] ?? "Firebase sign-in could not be completed. Check the Firebase Auth configuration and try again.";
	const diagnosticCode = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/i.test(code)
		? ` (Firebase code: ${code})`
		: "";
	return `${message}${diagnosticCode}`;
}
