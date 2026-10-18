"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { LocationAutocomplete } from "@/components/account/location-autocomplete";
import { CollectionPlanCard } from "@/components/organization/collection-plan-card";
import { RecipientOfferMap } from "@/components/organization/recipient-offer-map";
import { fetchMyOrganizations, type OrganizationItem } from "@/lib/canonical-offers";
import {
	createRecipientOrganization,
	createRecoveryPlan,
	buildCollectionRoute,
	discoverRecipientOffers,
	getRecipientProfile,
	listRecoveryPlans,
	listRecipientClaims,
	makePlanStop,
	reservePlanStop,
	recipientImpact,
	updateRecoveryPlan,
	updateRecipientClaim,
	updateRecipientProfile,
	type CollectionRoute,
	type DiscoveredOffer,
	type ImpactRecord,
	type PickupBase,
	type PlanNeed,
	type PlanStop,
	type RecoveryPlan,
	type RecipientClaim,
	type RecipientProfile,
} from "@/lib/canonical-recipient";
import { useLiveHousehold } from "@/lib/live-household";

type PagePhase = "loading" | "profile" | "ready" | "error";
type ProfileDraft = { name: string; category: string; approximate_area: string; latitude: string; longitude: string; service_radius_km: string };
type SelectedStop = { offer: DiscoveredOffer; quantity: string };

const emptyDraft: ProfileDraft = { name: "", category: "Community food support", approximate_area: "", latitude: "", longitude: "", service_radius_km: "5" };

function quantity(value: number, unit: string) {
	return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function dateTime(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "Time not provided" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function mapsSearch(latitude: number, longitude: number) {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function ProfileSetup({
	draft,
	setDraft,
	saving,
	error,
	onSave,
	editMode = false,
}: {
	draft: ProfileDraft;
	setDraft: (value: ProfileDraft) => void;
	saving: boolean;
	error: string;
	onSave: () => void;
	editMode?: boolean;
}) {
	const update = (key: keyof ProfileDraft, value: string) => setDraft({ ...draft, [key]: value });
	return <Card className="space-y-5 p-5 sm:p-7">
		<div>
			<p className="text-xs font-bold uppercase tracking-[.14em] text-secondary">Organization profile</p>
			<Heading as="h2" className="mt-2">{editMode ? "Update your pickup area" : "Set up your food collection profile"}</Heading>
			<p className="mt-2 text-sm leading-6 text-muted">This gives EcoLoop a nearby search center and radius. Your location is used to find approximate offers; donors’ exact pickup details stay private until a collection is reserved.</p>
		</div>
		<div className="grid gap-4 sm:grid-cols-2">
			<label className="space-y-1.5 text-sm font-semibold text-primary">Organization name<Input value={draft.name} maxLength={120} onChange={(event) => update("name", event.target.value)} autoComplete="organization" /></label>
			<label className="space-y-1.5 text-sm font-semibold text-primary">What you support<Input value={draft.category} maxLength={80} onChange={(event) => update("category", event.target.value)} placeholder="Community food support" /></label>
			<div className="space-y-1.5 sm:col-span-2"><LocationAutocomplete label="Search for your pickup base (optional)" defaultValue={draft.approximate_area} onLocationSelected={(location) => setDraft({ ...draft, approximate_area: location.address.slice(0, 160), latitude: location.lat === undefined ? "" : String(location.lat), longitude: location.lng === undefined ? "" : String(location.lng) })} /><p className="text-xs text-muted">Choose a place to fill the area and coordinates, or enter the area name and coordinates below.</p></div>
			<label className="space-y-1.5 text-sm font-semibold text-primary sm:col-span-2">Pickup area name<Input value={draft.approximate_area} maxLength={160} onChange={(event) => setDraft({ ...draft, approximate_area: event.target.value })} placeholder="e.g. Central Bengaluru" autoComplete="address-level2" /></label>
			<label className="space-y-1.5 text-sm font-semibold text-primary">Latitude<Input inputMode="decimal" type="number" min={-90} max={90} step="any" value={draft.latitude} onChange={(event) => update("latitude", event.target.value)} placeholder="e.g. 51.5072" /></label>
			<label className="space-y-1.5 text-sm font-semibold text-primary">Longitude<Input inputMode="decimal" type="number" min={-180} max={180} step="any" value={draft.longitude} onChange={(event) => update("longitude", event.target.value)} placeholder="e.g. -0.1276" /></label>
			<label className="space-y-1.5 text-sm font-semibold text-primary sm:col-span-2">Search radius<Input inputMode="numeric" type="number" min={1} max={20} step={1} value={draft.service_radius_km} onChange={(event) => update("service_radius_km", event.target.value)} /><span className="block text-xs font-normal text-muted">Choose 1–20 km. You can change this later.</span></label>
		</div>
		{error && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
		<Button fullWidth disabled={saving} onClick={onSave}>{saving ? "Saving profile…" : editMode ? "Save pickup area" : "Create organization profile"}</Button>
	</Card>;
}

function OfferCard({
	offer,
	selected,
	onToggle,
	onQuantity,
}: {
	offer: DiscoveredOffer;
	selected: SelectedStop | undefined;
	onToggle: () => void;
	onQuantity: (value: string) => void;
}) {
	const expiry = offer.expiry_declaration === "DONOR_DECLARED" && offer.expiry_at ? `Donor-declared expiry ${dateTime(offer.expiry_at)}` : "Expiry unknown";
	return <Card className="space-y-4 p-4 sm:p-5">
		<div className="flex flex-wrap items-start justify-between gap-3">
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{offer.category}</span><span className="text-xs text-muted">{offer.approximate_distance_km.toFixed(1)} km away</span></div>
				<h3 className="mt-2 text-base font-bold text-primary">{offer.title}</h3>
				<p className="mt-1 text-sm text-muted">{offer.approximate_area}</p>
			</div>
			<a className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-xs font-bold text-primary hover:bg-surface-muted focus-visible:outline" href={mapsSearch(offer.approximate_latitude, offer.approximate_longitude)} target="_blank" rel="noreferrer">Map area</a>
		</div>
		<div className="grid gap-2 rounded-xl bg-surface-muted p-3 text-xs text-muted sm:grid-cols-2">
			<p><strong className="text-primary">Available:</strong> {quantity(offer.quantity_available_minor, offer.unit)}</p>
			<p><strong className="text-primary">Pickup:</strong> {dateTime(offer.pickup_window_start)}–{new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(offer.pickup_window_end))}</p>
			<p><strong className="text-primary">Storage:</strong> {offer.storage_declaration === "UNKNOWN" ? "Not stated" : offer.storage_declaration.toLowerCase()}</p>
			<p><strong className="text-primary">Allergens:</strong> {offer.allergen_declaration === "UNKNOWN" ? "Not stated" : offer.allergen_declaration === "DONOR_DECLARED_NONE" ? "Donor declared none" : "Donor declared present"}</p>
			<p className="sm:col-span-2"><strong className="text-primary">Food date:</strong> {expiry}</p>
		</div>
		{offer.tags.length > 0 && <p className="text-xs text-muted">Tags: {offer.tags.join(", ")}</p>}
		{selected ? <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
			<label className="min-w-32 flex-1 space-y-1 text-xs font-semibold text-primary">Planned amount <Input aria-label={`Planned amount for ${offer.title}`} type="number" min={1} max={offer.quantity_available_minor} step={1} value={selected.quantity} onChange={(event) => onQuantity(event.target.value)} /></label>
			<span className="pb-3 text-sm text-muted">{offer.unit}</span>
			<Button variant="secondary" onClick={onToggle}>Remove</Button>
		</div> : <Button variant="secondary" fullWidth onClick={onToggle}>Add to collection plan</Button>}
	</Card>;
}

export type OrganizationView = "offers" | "plans" | "impact" | "profile";

export function OrganizationWorkspace({ view }: { view: OrganizationView }) {
	const { user, auth } = useLiveHousehold();
	const [phase, setPhase] = useState<PagePhase>("loading");
	const [error, setError] = useState("");
	const [profile, setProfile] = useState<RecipientProfile | null>(null);
	const [orgId, setOrgId] = useState("");
	const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
	const [profileSaving, setProfileSaving] = useState(false);
	const [offers, setOffers] = useState<DiscoveredOffer[]>([]);
	const [offersCapped, setOffersCapped] = useState(false);
	const [offerView, setOfferView] = useState<"list" | "map">("list");
	const [plans, setPlans] = useState<RecoveryPlan[]>([]);
	const [impact, setImpact] = useState<ImpactRecord[]>([]);
	const [claims, setClaims] = useState<RecipientClaim[]>([]);
	const [routes, setRoutes] = useState<Record<string, CollectionRoute>>({});
	const [impactCoverage, setImpactCoverage] = useState<"all_records" | "loaded_page">("all_records");
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("");
	const [radius, setRadius] = useState("");
	const [pickupState, setPickupState] = useState<"available_now" | "today" | "any">("any");
	const [refreshingOffers, setRefreshingOffers] = useState(false);
	const [selected, setSelected] = useState<Record<string, SelectedStop>>({});
	const [collectionName, setCollectionName] = useState("");
	const [people, setPeople] = useState("");
	const [portionsPerPerson, setPortionsPerPerson] = useState("1");
	const [savingPlan, setSavingPlan] = useState(false);
	const [notice, setNotice] = useState("");
	const [reloading, setReloading] = useState(0);

	const load = useCallback(async (signal?: AbortSignal) => {
		if (!user) return;
		setPhase("loading");
		setError("");
		try {
			const token = await user.getIdToken();
			const organizations = await fetchMyOrganizations(token);
			const recipient = organizations.find((item: OrganizationItem) => item.type === "recipient_org");
			if (!recipient) { setProfile(null); setOrgId(""); setDraft(emptyDraft); setPhase("profile"); return; }
			setOrgId(recipient.org_id);
			const loaded = await getRecipientProfile(token, recipient.org_id, signal);
			if (signal?.aborted) return;
			setProfile(loaded);
			setDraft({ name: loaded.name, category: loaded.category, approximate_area: loaded.pickup_base?.approximate_area ?? "", latitude: loaded.pickup_base ? String(loaded.pickup_base.latitude) : "", longitude: loaded.pickup_base ? String(loaded.pickup_base.longitude) : "", service_radius_km: String(loaded.service_radius_km) });
			setPhase(loaded.profile_status === "COMPLETE" && loaded.pickup_base ? "ready" : "profile");
		} catch (cause) {
			if (signal?.aborted) return;
			setError(cause instanceof Error ? cause.message : "Your organization profile could not be loaded.");
			setPhase("error");
		}
	}, [user]);

	useEffect(() => {
		const controller = new AbortController();
		const timer = window.setTimeout(() => {
			if (auth === "signed-in" && user) void load(controller.signal);
			else if (auth === "signed-out" || auth === "unavailable" || auth === "error") {
				setPhase("error");
				setError(auth === "signed-out" ? "Sign in to use the organization workspace." : "Sign-in is not available. Please retry shortly.");
			}
		}, 0);
		return () => { window.clearTimeout(timer); controller.abort(); };
	}, [auth, load, reloading, user]);

	useEffect(() => {
		if (phase !== "ready" || !profile || !orgId || !user) return;
		const controller = new AbortController();
		let active = true;
		void (async () => {
			try {
				const token = await user.getIdToken();
				const actor = { kind: "recipient_org" as const, id: orgId };
				const result = await discoverRecipientOffers(token, actor, profile, { radius_km: profile.service_radius_km, pickup_state: "any" }, controller.signal);
				if (!active) return;
				setOffers(result.offers ?? []);
				setOffersCapped(Boolean(result.capped));
			} catch (cause) {
				if (!active || (cause instanceof DOMException && cause.name === "AbortError")) return;
				setNotice(cause instanceof Error ? cause.message : "Nearby offers could not be loaded.");
			}
		})();
		return () => { active = false; controller.abort(); };
	}, [orgId, phase, profile, user, reloading]);

	useEffect(() => {
		if (phase !== "ready" || !profile || !orgId || !user) return;
		const controller = new AbortController();
		let active = true;
		void (async () => {
			try {
				const token = await user.getIdToken();
				const actor = { kind: "recipient_org" as const, id: orgId };
				const [plansResponse, impactResponse, claimsResponse] = await Promise.all([
					listRecoveryPlans(token, actor, controller.signal),
					recipientImpact(token, actor, controller.signal),
					listRecipientClaims(token, actor, controller.signal),
				]);
				if (!active) return;
				setPlans(Array.isArray(plansResponse) ? plansResponse : plansResponse.plans ?? []);
				setImpact(impactResponse.records ?? []);
				setImpactCoverage(impactResponse.coverage ?? "loaded_page");
				setClaims(claimsResponse.claims ?? []);
			} catch (cause) {
				if (!active || (cause instanceof DOMException && cause.name === "AbortError")) return;
				setNotice(cause instanceof Error ? cause.message : "Recovery information could not be refreshed.");
			}
		})();
		return () => { active = false; controller.abort(); };
	}, [orgId, phase, profile, user, reloading]);

	const selectedEntries = Object.values(selected);
	const selectedPortions = selectedEntries.filter((entry) => entry.offer.unit === "portion").reduce((sum, entry) => sum + Number(entry.quantity), 0);
	const targetPortions = Number(people) > 0 && Number(portionsPerPerson) > 0 ? Number(people) * Number(portionsPerPerson) : 0;
	const portionGap = Math.max(0, targetPortions - selectedPortions);
	const impactTotals = useMemo(() => impact.reduce<Record<string, number>>((totals, record) => {
		const key = record.unit;
		totals[key] = (totals[key] ?? 0) + record.received_quantity_minor;
		return totals;
	}, {}), [impact]);
	const workspaceDescription = view === "offers"
		? "Find nearby food offers and choose what fits your organization."
		: view === "plans"
			? "Review quantity coverage, reserve pickups, and track each handover."
			: "View quantities your organization has confirmed receiving.";

	const saveProfile = async () => {
		if (!user) return;
		const lat = Number(draft.latitude);
		const lng = Number(draft.longitude);
		const radiusValue = Number(draft.service_radius_km);
		if (!draft.name.trim() || !draft.category.trim() || !draft.approximate_area.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !Number.isFinite(radiusValue) || radiusValue < 1 || radiusValue > 20) {
			setError("Enter an organization name, support category, pickup area, valid coordinates, and a 1–20 km search radius.");
			return;
		}
		setProfileSaving(true); setError("");
		try {
			const token = await user.getIdToken();
			const pickup_base: PickupBase = { latitude: lat, longitude: lng, approximate_area: draft.approximate_area.trim() };
			if (!orgId) {
				const created = await createRecipientOrganization(token, { name: draft.name.trim(), category: draft.category.trim(), pickup_base, service_radius_km: radiusValue });
				setOrgId(created.org_id);
				setNotice("Organization profile created.");
			} else if (profile) {
				const updated = await updateRecipientProfile(token, orgId, { ...profile, name: draft.name.trim(), category: draft.category.trim(), pickup_base, service_radius_km: radiusValue });
				setProfile(updated); setDraft({ name: updated.name, category: updated.category, approximate_area: updated.pickup_base?.approximate_area ?? "", latitude: updated.pickup_base ? String(updated.pickup_base.latitude) : "", longitude: updated.pickup_base ? String(updated.pickup_base.longitude) : "", service_radius_km: String(updated.service_radius_km) });
				setPhase("ready"); setNotice("Pickup area updated.");
			}
			if (!profile) setReloading((value) => value + 1);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "The organization profile could not be saved.");
		} finally { setProfileSaving(false); }
	};

	const refreshOffers = async () => {
		if (!profile || !user || !orgId) return;
		setRefreshingOffers(true); setNotice("");
		try {
			const token = await user.getIdToken();
			const result = await discoverRecipientOffers(token, { kind: "recipient_org", id: orgId }, profile, { radius_km: Number(radius) || profile.service_radius_km, query, category, pickup_state: pickupState });
			setOffers(result.offers ?? []);
			setOffersCapped(Boolean(result.capped));
		} catch (cause) { setNotice(cause instanceof Error ? cause.message : "Nearby offers could not be loaded."); }
		finally { setRefreshingOffers(false); }
	};

	const toggleOffer = (offer: DiscoveredOffer) => setSelected((current) => {
		if (current[offer.offer_id]) { const next = { ...current }; delete next[offer.offer_id]; return next; }
		return { ...current, [offer.offer_id]: { offer, quantity: String(offer.quantity_available_minor) } };
	});

	const submitPlan = async () => {
		if (!profile || !profile.pickup_base || !user || !orgId || selectedEntries.length === 0) return;
		if (selectedEntries.some(({ offer, quantity: value }) => !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > offer.quantity_available_minor)) { setNotice("Each planned amount must be a whole number within the currently available quantity."); return; }
		if (people && (!targetPortions || !Number.isSafeInteger(Number(people)) || !Number.isSafeInteger(Number(portionsPerPerson)))) { setNotice("Use whole numbers for people and portions per person."); return; }
		setSavingPlan(true); setNotice("");
		try {
			const token = await user.getIdToken();
			const stops: PlanStop[] = selectedEntries.map(({ offer, quantity: value }) => makePlanStop(offer, Number(value)));
			const need: PlanNeed | null = targetPortions ? { people_requested: Number(people), portions_per_person: Number(portionsPerPerson), target_portions: targetPortions } : null;
			const created = await createRecoveryPlan(token, { kind: "recipient_org", id: orgId }, {
				name: collectionName.trim() || `Collection plan · ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date())}`,
				origin: profile.pickup_base,
				destination: profile.pickup_base,
				need,
				stops,
			});
			setPlans((current) => [created, ...current]); setSelected({}); setCollectionName(""); setNotice("Collection plan saved. This plan records your selection; it does not reserve any food yet.");
		} catch (cause) { setNotice(cause instanceof Error ? cause.message : "The collection plan could not be saved."); }
		finally { setSavingPlan(false); }
	};

	const reserveStop = async (plan: RecoveryPlan, stop: PlanStop) => {
		if (!user || !orgId) return;
		setSavingPlan(true); setNotice("");
		try {
			const token = await user.getIdToken();
			await reservePlanStop(token, { kind: "recipient_org", id: orgId }, plan, stop);
			setNotice("Offer reserved. The exact pickup details are now available in this active collection.");
			setReloading((value) => value + 1);
		} catch (cause) { setNotice(cause instanceof Error ? cause.message : "This offer could not be reserved. Refresh and review the plan."); }
		finally { setSavingPlan(false); }
	};

	const generateRoute = async (plan: RecoveryPlan, claimIds: string[]) => {
		if (!user || !orgId) return;
		setSavingPlan(true); setNotice("");
		try {
			const token = await user.getIdToken();
			const result = await buildCollectionRoute(token, { kind: "recipient_org", id: orgId }, plan.plan_id, claimIds);
			setRoutes((current) => ({ ...current, [plan.plan_id]: result }));
			if (result.provider === "unavailable") setNotice("Pickup order is ready, but route timing is unavailable. Open each address in Maps for directions.");
		} catch (cause) { setNotice(cause instanceof Error ? cause.message : "The pickup route could not be created."); }
		finally { setSavingPlan(false); }
	};

	const recordClaimQuantity = async (claim: RecipientClaim, action: "collect" | "receive", amount: number, reason: string) => {
		if (!user || !orgId) return;
		const maximum = action === "collect" ? claim.quantity_minor : claim.collected_quantity_minor;
		if (!Number.isSafeInteger(amount) || amount < 0 || amount > maximum || (amount < maximum && !reason.trim())) {
			setNotice(amount < maximum && !reason.trim() ? "Add a note to explain the shortage before saving." : "Enter a whole-number quantity within the available amount."); return;
		}
		setSavingPlan(true); setNotice("");
		try {
			const token = await user.getIdToken();
			await updateRecipientClaim(token, { kind: "recipient_org", id: orgId }, claim, action, { quantity_minor: amount, reason: reason.trim() || undefined });
			setNotice(action === "collect" ? "Collection recorded. Confirm the received amount when it reaches your organization." : "Receipt confirmed and added to your organization’s received total.");
			setReloading((value) => value + 1);
		} catch (cause) { setNotice(cause instanceof Error ? cause.message : "The collection outcome could not be recorded."); }
		finally { setSavingPlan(false); }
	};
	const cancelReservation = async (claim: RecipientClaim) => {
		if (!user || !orgId || !window.confirm("Cancel this reservation and release its reserved quantity?")) return;
		setSavingPlan(true); setNotice("");
		try {
			const token = await user.getIdToken();
			await updateRecipientClaim(token, { kind: "recipient_org", id: orgId }, claim, "cancel", { reason: "Collection plans changed" });
			setNotice("Reservation cancelled and collection refreshed.");
			setReloading((value) => value + 1);
		} catch (cause) { setNotice(cause instanceof Error ? cause.message : "This reservation could not be cancelled."); }
		finally { setSavingPlan(false); }
	};
	const savePlanEdits = async (plan: RecoveryPlan, stops: PlanStop[]) => {
		if (!user || !orgId) return;
		if (stops.length === 0 || stops.some((stop) => stop.status === "SELECTED" && (!Number.isSafeInteger(stop.requested_quantity_minor) || stop.requested_quantity_minor < 1))) {
			setNotice("Keep at least one stop and enter a positive whole-number quantity for every unreserved stop."); return;
		}
		setSavingPlan(true); setNotice("");
		try {
			const token = await user.getIdToken();
			const updated = await updateRecoveryPlan(token, { kind: "recipient_org", id: orgId }, { ...plan, stops });
			setPlans((current) => current.map((item) => item.plan_id === updated.plan_id ? updated : item));
			setNotice("Collection plan updated. Reserved and completed stops were preserved.");
		} catch (cause) { setNotice(cause instanceof Error ? cause.message : "The collection plan could not be updated."); }
		finally { setSavingPlan(false); }
	};
	const handleMapUnavailable = useCallback(() => setNotice("Map view is unavailable. Use List to continue browsing offers."), []);

	if (phase === "loading") return <div className="mx-auto max-w-5xl"><Card role="status" className="p-5 text-sm text-muted">Loading your organization workspace…</Card></div>;
	if (phase === "error") return <div className="mx-auto max-w-2xl"><Card role="alert" className="space-y-4 p-5"><Heading as="h1">Organization workspace unavailable</Heading><p className="text-sm leading-6 text-danger">{error}</p><Button variant="secondary" onClick={() => setReloading((value) => value + 1)}>Try again</Button></Card></div>;
	if (phase === "profile" || view === "profile") return <div className="mx-auto max-w-2xl space-y-4">
		{phase === "profile" && <header><p className="text-xs font-extrabold uppercase tracking-[.15em] text-secondary">Recipient workspace</p><Heading as="h1" className="mt-2 text-3xl">Start collecting nearby food</Heading></header>}
		{view === "profile" && profile && <header><p className="text-xs font-extrabold uppercase tracking-[.15em] text-secondary">Organization settings</p><Heading as="h1" className="mt-2 text-3xl">Pickup profile</Heading><p className="mt-2 text-sm leading-6 text-muted">Update your organization’s collection base and service area.</p></header>}
		<ProfileSetup draft={draft} setDraft={setDraft} saving={profileSaving} error={error} onSave={() => void saveProfile()} editMode={Boolean(profile)} />
	</div>;

	return <div className="mx-auto max-w-5xl space-y-8">
		<header>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-secondary">Recipient workspace</p><Heading as="h1" className="mt-2 text-3xl sm:text-4xl">{profile?.name ?? "Organization"}</Heading><p className="mt-2 text-sm leading-6 text-muted">{workspaceDescription}</p></div>
			</div>
		</header>
		{notice && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"><span>{notice}</span><button className="min-h-11 px-2 font-bold" aria-label="Dismiss message" onClick={() => setNotice("")}>Dismiss</button></div>}
		{view === "offers" && <section id="nearby-offers" className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-secondary">Discovery</p><Heading as="h2" className="mt-1">Nearby offers</Heading><p className="mt-1 text-sm text-muted">Approximate locations and donor-declared details. Confirm conditions at handover.</p></div>{profile?.pickup_base && <a href={mapsSearch(profile.pickup_base.latitude, profile.pickup_base.longitude)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-bold text-primary">Open search area in Maps</a>}</div>
			<Card className="grid gap-3 p-4 sm:grid-cols-2 sm:items-end xl:grid-cols-[minmax(0,1fr)_150px_120px_140px_auto]">
				<label className="space-y-1 text-xs font-semibold text-primary">Search offers or categories<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bread, produce, pantry…" /></label>
				<label className="space-y-1 text-xs font-semibold text-primary">Category<Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Any category" /></label>
				<label className="space-y-1 text-xs font-semibold text-primary">Within km<Input type="number" min={1} max={20} step={1} value={radius || String(profile!.service_radius_km)} onChange={(event) => setRadius(event.target.value)} /></label>
				<label className="space-y-1 text-xs font-semibold text-primary">Pickup time<select className="min-h-12 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={pickupState} onChange={(event) => setPickupState(event.target.value as typeof pickupState)}><option value="any">Any time</option><option value="today">Today</option><option value="available_now">Available now</option></select></label>
				<Button variant="secondary" disabled={refreshingOffers} onClick={() => void refreshOffers()}>{refreshingOffers ? "Searching…" : "Search"}</Button>
			</Card>
			<div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">{offers.length} offer{offers.length === 1 ? "" : "s"} shown</p><div className="inline-flex rounded-full border border-line bg-white p-1" aria-label="Offer presentation"><button type="button" aria-pressed={offerView === "list"} onClick={() => { setNotice(""); setOfferView("list"); }} className={`min-h-11 rounded-full px-4 text-sm font-bold ${offerView === "list" ? "bg-primary text-white" : "text-primary"}`}>List</button><button type="button" aria-pressed={offerView === "map"} onClick={() => { setNotice(""); setOfferView("map"); }} className={`min-h-11 rounded-full px-4 text-sm font-bold ${offerView === "map" ? "bg-primary text-white" : "text-primary"}`}>Map</button></div></div>
			{offersCapped && <p role="status" className="rounded-xl border border-tertiary/30 bg-tertiary-soft px-4 py-3 text-sm text-primary">Results are limited to a recent set of offers. There may be other matching offers outside the results shown.</p>}
			{offerView === "map" && profile?.pickup_base && <RecipientOfferMap offers={offers} pickupBase={profile.pickup_base} onUnavailable={handleMapUnavailable} />}
			{offers.length === 0 ? <Card className="p-5 text-sm leading-6 text-muted">No nearby offers are shown for these filters. Try a wider search radius or a shorter search term; some results may also be outside the limited set.</Card> : offerView === "list" && <div className="grid gap-4 lg:grid-cols-2">{offers.map((offer) => <OfferCard key={offer.offer_id} offer={offer} selected={selected[offer.offer_id]} onToggle={() => toggleOffer(offer)} onQuantity={(value) => setSelected((current) => ({ ...current, [offer.offer_id]: { ...current[offer.offer_id], quantity: value } }))} />)}</div>}
		</section>}
		{view === "plans" && <section id="collection-plan" className="space-y-4">
			<div><p className="text-xs font-bold uppercase tracking-[.13em] text-secondary">Plan together</p><Heading as="h2" className="mt-1">Build a collection plan</Heading><p className="mt-1 text-sm text-muted">Select up to five offers, adjust quantities, then review coverage before saving.</p></div>
			{selectedEntries.length > 0 && <Card className="space-y-4 p-4 sm:p-5">
				<div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-primary">Proposed collection · {selectedEntries.length}/5 stops</h3>{selectedEntries.length >= 5 && <span className="text-xs text-muted">Maximum stops reached</span>}</div>
				<div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-semibold text-primary">Plan name <Input value={collectionName} maxLength={100} onChange={(event) => setCollectionName(event.target.value)} placeholder="Optional" /></label><label className="space-y-1 text-xs font-semibold text-primary">People to support (optional)<Input type="number" min={1} step={1} value={people} onChange={(event) => setPeople(event.target.value)} placeholder="Only if portion amounts apply" /></label>{people && <label className="space-y-1 text-xs font-semibold text-primary sm:col-span-2">Portions per person<Input type="number" min={1} max={100} step={1} value={portionsPerPerson} onChange={(event) => setPortionsPerPerson(event.target.value)} /></label>}</div>
				{people && <div className="rounded-xl bg-surface-muted p-4 text-sm"><p className="font-bold text-primary">Coverage from portion offers: {selectedPortions} / {targetPortions} portions</p><p className="mt-1 text-xs text-muted">{selectedPortions === 0 ? "No portion-unit offers are selected; other units cannot be converted into people served." : portionGap > 0 ? `${portionGap} portions are still uncovered.` : "The stated portion target is covered by selected portion-unit offers."}</p></div>}
				<ul className="divide-y divide-line">{selectedEntries.map(({ offer, quantity: amount }) => <li key={offer.offer_id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate font-semibold text-primary">{offer.title}</span><span className="shrink-0 text-muted">{amount} {offer.unit}</span></li>)}</ul>
				<Button fullWidth disabled={savingPlan || selectedEntries.length > 5} onClick={() => void submitPlan()}>{savingPlan ? "Saving plan…" : "Save collection plan"}</Button>
				<p className="text-xs leading-5 text-muted">Saving a plan records your proposal only. It does not reserve quantities or expose exact pickup addresses.</p>
			</Card>}
			{plans.length > 0 && <div className="space-y-3"><h3 className="font-bold text-primary">Saved collection plans</h3><div className="grid gap-3 lg:grid-cols-2">{plans.map((plan) => <CollectionPlanCard key={`${plan.plan_id}-${plan.version}`} plan={plan} claims={claims} route={routes[plan.plan_id]} busy={savingPlan} onReserve={(record, stop) => void reserveStop(record, stop)} onRoute={(record, ids) => void generateRoute(record, ids)} onCancel={(claim) => void cancelReservation(claim)} onCollect={(claim, amount, reason) => void recordClaimQuantity(claim, "collect", amount, reason)} onReceive={(claim, amount, reason) => void recordClaimQuantity(claim, "receive", amount, reason)} onSaveEdit={(record, stops) => void savePlanEdits(record, stops)} />)}</div></div>}
			{plans.length === 0 && selectedEntries.length === 0 && <Card className="p-5 text-sm text-muted">Your saved collection plans will appear here.</Card>}
		</section>}
		{view === "impact" && <section id="impact" className="space-y-4">
			<div><p className="text-xs font-bold uppercase tracking-[.13em] text-secondary">Confirmed outcomes</p><Heading as="h2" className="mt-1">What your organization received</Heading><p className="mt-1 text-sm text-muted">Only quantities confirmed as received are included. Food units stay separate; no people-served or environmental savings are inferred.</p></div>
			<Card className="space-y-4 p-5">
				{impact.length === 0 ? <p className="text-sm text-muted">No receipts have been confirmed yet. After a collection, record what arrived to show your organization’s confirmed total.</p> : <>
					{impactCoverage === "loaded_page" && <p className="text-xs text-muted">Showing the most recent 100 receipt records. The total below is for this loaded page.</p>}
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-surface-muted p-4"><p className="text-xs font-semibold text-muted">Receipt records</p><p className="mt-1 text-2xl font-extrabold text-primary">{impact.length}</p></div>{Object.entries(impactTotals).map(([unit, total]) => <div key={unit} className="rounded-xl bg-surface-muted p-4"><p className="text-xs font-semibold text-muted">Received · {unit}</p><p className="mt-1 text-2xl font-extrabold text-primary">{new Intl.NumberFormat().format(total)}</p></div>)}</div>
					<div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-muted"><tr><th className="py-2 pr-3">Offer</th><th className="py-2 pr-3">Donor</th><th className="py-2 pr-3">Offered</th><th className="py-2 pr-3">Collected</th><th className="py-2">Received</th></tr></thead><tbody>{impact.map((record) => <tr key={`${record.claim_id}-${record.recorded_at}`} className="border-t border-line"><td className="py-3 pr-3 text-primary">{record.offer_id}</td><td className="py-3 pr-3 capitalize text-muted">{record.donor_kind}</td><td className="py-3 pr-3 text-muted">{quantity(record.offered_quantity_minor, record.unit)}</td><td className="py-3 pr-3 text-muted">{quantity(record.collected_quantity_minor, record.unit)}</td><td className="py-3 font-semibold text-primary">{quantity(record.received_quantity_minor, record.unit)}</td></tr>)}</tbody></table></div>
				</>}
			</Card>
		</section>}
	</div>;
}
