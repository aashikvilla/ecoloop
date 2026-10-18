export function safeWorkspaceReturnPath(candidate: string | null, mode: "personal" | "organization") {
	if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return null;
	try {
		const base = "https://ecoloop.invalid";
		const target = new URL(candidate, base);
		if (target.origin !== base || target.pathname === "/login" || target.pathname === "/") return null;
		const organizationPath = target.pathname === "/organization" || target.pathname.startsWith("/organization/");
		if ((mode === "organization") !== organizationPath) return null;
		return `${target.pathname}${target.search}${target.hash}`;
	} catch {
		return null;
	}
}

export function loginPathFor(destination: string) {
	const mode = destination === "/organization" || destination.startsWith("/organization/") ? "organization" : "personal";
	return `/login?mode=${mode}&next=${encodeURIComponent(destination)}`;
}
