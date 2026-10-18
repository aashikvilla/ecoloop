"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CollectionRoute, PlanStop, RecoveryPlan, RecipientClaim } from "@/lib/canonical-recipient";

function quantity(value: number, unit: string) {
	return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function dateTime(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "Time not provided" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function safeDirectionsUrl(value: string | null | undefined) {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" && ["www.google.com", "maps.google.com"].includes(url.hostname) && url.pathname.startsWith("/maps") ? url.toString() : null;
	} catch { return null; }
}

export function CollectionPlanCard({ plan, claims, route, busy, onReserve, onRoute, onCancel, onCollect, onReceive, onSaveEdit }: {
	plan: RecoveryPlan;
	claims: RecipientClaim[];
	route?: CollectionRoute;
	busy: boolean;
	onReserve: (plan: RecoveryPlan, stop: PlanStop) => void;
	onRoute: (plan: RecoveryPlan, claimIds: string[]) => void;
	onCancel: (claim: RecipientClaim) => void;
	onCollect: (claim: RecipientClaim, amount: number, reason: string) => void;
	onReceive: (claim: RecipientClaim, amount: number, reason: string) => void;
	onSaveEdit: (plan: RecoveryPlan, stops: PlanStop[]) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draftStops, setDraftStops] = useState(plan.stops);
	const stops = editing ? draftStops : plan.stops;
	const portionCoverage = stops.filter((stop) => stop.unit === "portion").reduce((sum, stop) => sum + stop.requested_quantity_minor, 0);
	const target = plan.need?.target_portions ?? 0;
	const hasComparable = stops.some((stop) => stop.unit === "portion");
	const covered = hasComparable && target > 0 ? Math.min(portionCoverage, target) : 0;
	const gap = hasComparable && target > portionCoverage ? target - portionCoverage : 0;
	return <Card className="space-y-3 p-4 sm:p-5">
		<div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-primary">{plan.name}</h3><p className="mt-1 text-xs text-muted">Created {dateTime(plan.created_at)}</p></div><span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-primary">{plan.status.toLowerCase()}</span></div>
		<p className="text-sm text-muted">{stops.length} selected pickup{stops.length === 1 ? "" : "s"}</p>
		{plan.need?.item_query && plan.need.requested_quantity_minor && plan.need.requested_unit && <div className="rounded-xl bg-surface-muted p-3 text-sm"><p className="font-semibold text-primary">Request: {plan.need.item_query} · {quantity(plan.need.requested_quantity_minor, plan.need.requested_unit)}</p><p className="mt-1 text-xs text-muted">{plan.need.dietary_requirements?.length ? `Donor-declared tags: ${plan.need.dietary_requirements.join(", ")}` : "No dietary tags requested"} · within {plan.need.search_radius_km} km · by {plan.need.pickup_deadline ? dateTime(plan.need.pickup_deadline) : "time not provided"}</p></div>}
		{target > 0 && <div className="rounded-xl bg-surface-muted p-3 text-sm"><p className="font-semibold text-primary">Portion coverage: {hasComparable ? `${covered} / ${target}` : "Not comparable yet"}</p><p className="mt-1 text-xs text-muted">{!hasComparable ? "Selected offers do not use portions, so no people/portion coverage is inferred." : gap ? `${gap} portions remain uncovered.` : "The stated portion target is covered."}</p></div>}
		{!editing && plan.stops.some((stop) => stop.status === "SELECTED") && <Button variant="secondary" size="sm" onClick={() => { setDraftStops(plan.stops); setEditing(true); }}>Edit selected stops</Button>}
		{editing && <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy || draftStops.length === 0} onClick={() => onSaveEdit(plan, draftStops)}>Save plan changes</Button><Button variant="ghost" size="sm" onClick={() => { setDraftStops(plan.stops); setEditing(false); }}>Discard changes</Button></div>}
		<ul className="space-y-3">{stops.map((stop) => {
			const claim = claims.find((item) => item.claim_id === stop.claim_id);
			const originalStop = plan.stops.find((item) => item.stop_id === stop.stop_id);
			return <li key={stop.stop_id} className="rounded-xl border border-line p-3">
				<div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="truncate font-semibold text-primary">{stop.offer_id}</span><span className="shrink-0 text-muted">{quantity(stop.requested_quantity_minor, stop.unit)} · {stop.status.toLowerCase()}</span></div>
				{stop.demo_scenario && <p className="mt-2 rounded-lg bg-tertiary-soft p-2 text-xs font-semibold text-primary">Rehearsal scenario · synthetic offer · suitability unverified · cannot reserve or count as recovered.</p>}
				{editing && stop.status === "SELECTED" && <div className="mt-3 flex flex-wrap items-end gap-3"><label className="min-w-32 flex-1 space-y-1 text-xs font-semibold text-primary">Planned amount<Input aria-label={`Updated planned amount for ${stop.offer_id}`} type="number" min={1} max={1_000_000_000} step={1} value={stop.requested_quantity_minor} onChange={(event) => setDraftStops((current) => current.map((item) => item.stop_id === stop.stop_id ? { ...item, requested_quantity_minor: Number(event.target.value) } : item))} /></label><Button variant="ghost" size="sm" disabled={draftStops.filter((item) => item.status === "SELECTED").length <= 1 && plan.stops.every((item) => item.status === "SELECTED")} onClick={() => setDraftStops((current) => current.filter((item) => item.stop_id !== stop.stop_id))}>Remove stop</Button></div>}
				{editing && originalStop && originalStop.status !== "SELECTED" && <p className="mt-2 text-xs text-muted">Reserved or completed stops are locked.</p>}
				{!editing && stop.status === "SELECTED" && (stop.demo_scenario ? <p className="mt-3 text-xs text-muted">Reservation is disabled for rehearsal offers.</p> : <Button variant="secondary" size="sm" className="mt-3" disabled={busy} onClick={() => onReserve(plan, stop)}>Reserve this amount</Button>)}
				{claim && <div className="mt-3 space-y-3 border-t border-line pt-3">
					{claim.exact_address && <div className="rounded-lg bg-surface-muted p-3 text-sm"><p className="font-bold text-primary">Pickup details · reservation active</p><p className="mt-1 break-words text-muted">{claim.exact_address}</p>{claim.pickup_instructions && <p className="mt-1 text-xs text-muted">{claim.pickup_instructions}</p>}<p className="mt-1 text-xs text-muted">Pickup window: {dateTime(claim.pickup_window_start)} – {dateTime(claim.pickup_window_end)}</p></div>}
					{claim.status === "RESERVED" && <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
						<label className="space-y-1 text-xs font-semibold text-primary">Collected amount<Input aria-label={`Collected quantity for ${claim.offer_id}`} type="number" min={0} max={claim.quantity_minor} step={1} defaultValue={claim.quantity_minor} id={`collect-${claim.claim_id}`} /></label>
						<label className="space-y-1 text-xs font-semibold text-primary">Shortage note (if partial)<Input aria-label={`Collection note for ${claim.offer_id}`} id={`collect-reason-${claim.claim_id}`} placeholder="Optional unless short" /></label>
						<Button size="sm" disabled={busy} onClick={() => {
							const amount = Number((document.getElementById(`collect-${claim.claim_id}`) as HTMLInputElement | null)?.value);
							const reason = (document.getElementById(`collect-reason-${claim.claim_id}`) as HTMLInputElement | null)?.value ?? "";
							onCollect(claim, amount, reason);
						}}>Mark collected</Button>
						<Button variant="ghost" size="sm" disabled={busy} onClick={() => onCancel(claim)}>Cancel reservation</Button>
					</div>}
					{claim.status === "COLLECTED" && <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
						<label className="space-y-1 text-xs font-semibold text-primary">Received amount<Input aria-label={`Received quantity for ${claim.offer_id}`} type="number" min={0} max={claim.collected_quantity_minor} step={1} defaultValue={claim.collected_quantity_minor} id={`receive-${claim.claim_id}`} /></label>
						<label className="space-y-1 text-xs font-semibold text-primary">Shortage or dispute note<Input aria-label={`Receipt note for ${claim.offer_id}`} id={`receive-reason-${claim.claim_id}`} placeholder="Optional unless short" /></label>
						<Button size="sm" disabled={busy} onClick={() => {
							const amount = Number((document.getElementById(`receive-${claim.claim_id}`) as HTMLInputElement | null)?.value);
							const reason = (document.getElementById(`receive-reason-${claim.claim_id}`) as HTMLInputElement | null)?.value ?? "";
							onReceive(claim, amount, reason);
						}}>Confirm received</Button>
					</div>}
					{claim.status === "RECEIVED" && <p className="text-sm font-semibold text-primary">Confirmed received: {quantity(claim.received_quantity_minor, claim.unit)}</p>}
				</div>}
			</li>;
		})}</ul>
		{claims.some((claim) => claim.plan_id === plan.plan_id && claim.status === "RESERVED") && <div className="space-y-3 rounded-xl bg-primary-soft p-3">
			<Button variant="secondary" size="sm" disabled={busy} onClick={() => onRoute(plan, claims.filter((claim) => claim.plan_id === plan.plan_id && claim.status === "RESERVED").map((claim) => claim.claim_id))}>Build pickup route</Button>
			{route && <div className="space-y-2 text-sm"><p className="font-bold text-primary">{route.provider === "google_routes" ? "Suggested pickup order" : "Pickup order (route timing unavailable)"}</p>{route.total_duration_seconds !== null && <p className="text-xs text-muted">Estimated travel time: {Math.round(route.total_duration_seconds / 60)} min</p>}{route.warning_codes.length > 0 && <p className="text-xs text-muted">Route note: {route.warning_codes.join(", ").replaceAll("_", " ").toLowerCase()}</p>}<ol className="space-y-2">{route.stops.map((item) => <li key={item.claim_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3"><span><strong className="text-primary">{item.stop_order}. {item.title}</strong><span className="block text-xs text-muted">{item.address}</span></span>{safeDirectionsUrl(item.route_url) && <a className="inline-flex min-h-11 items-center rounded-full bg-primary px-3 text-xs font-bold text-white" href={safeDirectionsUrl(item.route_url)!} target="_blank" rel="noreferrer">Directions</a>}</li>)}</ol>{safeDirectionsUrl(route.return_to_base_url) && <a className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-bold text-primary" href={safeDirectionsUrl(route.return_to_base_url)!} target="_blank" rel="noreferrer">Directions back to your pickup base</a>}</div>}
		</div>}
	</Card>;
}
