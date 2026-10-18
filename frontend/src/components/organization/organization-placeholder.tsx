"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { useLiveHousehold } from "@/lib/live-household";
import { fetchMyOrganizations, type OrganizationItem } from "@/lib/canonical-offers";

export function OrganizationPlaceholder() {
	const { user } = useLiveHousehold();
	const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
	const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState("");
	const [revision, setRevision] = useState(0);

	useEffect(() => {
		const controller = new AbortController();
		if (!user) return () => controller.abort();
		void (async () => {
			try {
				const token = await user.getIdToken();
				if (controller.signal.aborted) return;
				const records = await fetchMyOrganizations(token);
				if (controller.signal.aborted) return;
				setOrganizations(records.filter((item) => item.type === "recipient_org"));
				setPhase("ready");
			} catch (cause) {
				if (!controller.signal.aborted) {
					setError(cause instanceof Error ? cause.message : "Organization membership could not be checked.");
					setPhase("error");
				}
			}
		})();
		return () => controller.abort();
	}, [revision, user]);

	const approved = organizations.filter((item) => item.verification_status === "APPROVED");
	const pending = organizations.filter((item) => item.verification_status === "PENDING");
	return <div className="mx-auto max-w-2xl space-y-5">
		<header><p className="text-xs font-extrabold uppercase tracking-[.15em] text-secondary">Organization workspace</p><Heading as="h1" className="mt-2 text-3xl">Welcome to EcoLoop</Heading><p className="mt-3 text-sm leading-6 text-muted">This organization area is a placeholder while organization access is prepared.</p></header>
		{phase === "loading" && <Card role="status" className="p-5 text-sm text-muted">Checking your organization membership…</Card>}
		{phase === "error" && <Card role="alert" className="space-y-3 border border-danger/30 p-5"><p className="text-sm text-danger">{error}</p><Button variant="secondary" onClick={() => { setError(""); setPhase("loading"); setRevision((value) => value + 1); }}>Try again</Button></Card>}
		{phase === "ready" && approved.length > 0 && <Card className="space-y-3 border border-line p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-wide text-secondary">Approved access</p><Heading as="h2">{approved.length === 1 ? approved[0].name : `${approved.length} approved organizations`}</Heading>{approved.length > 1 && <ul className="space-y-2">{approved.map((item) => <li key={item.org_id} className="rounded-xl bg-surface-muted px-4 py-3 text-sm font-semibold text-primary">{item.name}</li>)}</ul>}<p className="text-sm leading-6 text-muted">Your organization membership is confirmed. This area does not yet contain organization tools.</p></Card>}
		{phase === "ready" && approved.length === 0 && <Card className="space-y-3 border border-line p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-wide text-secondary">Access status</p><Heading as="h2">{pending.length > 0 ? "Organization review is pending" : "No approved organization access"}</Heading><p className="text-sm leading-6 text-muted">{pending.length > 0 ? `Your organization${pending.length === 1 ? " is" : "s are"} awaiting approval. Organization access becomes available after an administrator approves the membership.` : "This account does not have an approved food recovery organization membership yet."}</p>{pending.length > 0 && <ul className="space-y-2">{pending.map((item) => <li key={item.org_id} className="rounded-xl bg-surface-muted px-4 py-3 text-sm font-semibold text-primary">{item.name} · Pending review</li>)}</ul>}</Card>}
	</div>;
}
