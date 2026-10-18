"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { LocationAutocomplete } from "@/components/account/location-autocomplete";
import { requestRecoveryPlans, type OfferUnit, type PickupBase, type PlanNeed, type RecipientActor, type RecipientProfile, type RecoveryAssistantResult } from "@/lib/canonical-recipient";
import type { RecoveryPlanOption, RecoveryRequest } from "./recovery-planning";

const units: OfferUnit[] = ["portion", "g", "ml", "package", "item"];

function localDateTimeAfter(hours: number) {
	const date = new Date(Date.now() + hours * 60 * 60 * 1000);
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 16);
}

function humanQuantity(value: number, unit: string) {
	return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

export function RecoveryAssistant({
	profile,
	actor,
	getToken,
	onUsePlan,
}: {
	profile: RecipientProfile;
	actor: RecipientActor;
	getToken: () => Promise<string>;
	onUsePlan: (selection: { option: RecoveryPlanOption; origin: PickupBase; need: PlanNeed; request: RecoveryRequest }) => void;
}) {
	const [item, setItem] = useState("");
	const [message, setMessage] = useState("");
	const [amount, setAmount] = useState("");
	const [unit, setUnit] = useState<OfferUnit>("portion");
	const [people, setPeople] = useState("");
	const [portionsPerPerson, setPortionsPerPerson] = useState("");
	const [diet, setDiet] = useState("");
	const [radius, setRadius] = useState(String(profile.service_radius_km));
	const [deadline, setDeadline] = useState(() => localDateTimeAfter(4));
	const [deadlineEdited, setDeadlineEdited] = useState(false);
	const [radiusEdited, setRadiusEdited] = useState(false);
	const [origin, setOrigin] = useState<PickupBase | null>(profile.pickup_base);
	const [originArea, setOriginArea] = useState(profile.pickup_base?.approximate_area ?? "");
	const [options, setOptions] = useState<RecoveryPlanOption[]>([]);
	const [assistantResult, setAssistantResult] = useState<RecoveryAssistantResult | null>(null);
	const [searched, setSearched] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	const search = async () => {
		const quantity = Number(amount);
		const radiusKm = Number(radius);
		if (!message.trim() && item.trim().length < 2) { setError("Describe the food or item you need."); return; }
		if (amount && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1_000_000_000)) { setError("Use a whole-number amount greater than zero."); return; }
		if (people && (!Number.isSafeInteger(Number(people)) || Number(people) < 1 || (portionsPerPerson && (!Number.isSafeInteger(Number(portionsPerPerson)) || Number(portionsPerPerson) < 1)))) { setError("Use whole numbers for the people target and portions per person."); return; }
		if (!origin || !Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude)) {
			setError("Choose a pickup origin from Maps or restore your saved organization pickup base."); return;
		}
		if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 20) { setError("Choose a search radius between 1 and 20 km."); return; }
		const deadlineDate = new Date(deadline);
		if (Number.isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) { setError("Choose a future pickup deadline."); return; }

		setBusy(true); setError(""); setSearched(false); setOptions([]); setAssistantResult(null);
		try {
			const token = await getToken();
			const dietaryRequirements = diet.split(",").map((entry) => entry.trim()).filter(Boolean);
			const requestText = message.trim() || [item.trim(), amount ? `${amount} ${unit}` : "", people ? `for ${people} people${portionsPerPerson ? ` at ${portionsPerPerson} portions per person` : ""}` : "", dietaryRequirements.join(", ")].filter(Boolean).join("; ");
			const result = await requestRecoveryPlans(token, actor, {
				message: requestText,
				origin,
				structured: {
					...(item.trim() ? { item_query: item.trim() } : {}),
					...(amount ? { requested_quantity_minor: quantity, requested_unit: unit } : {}),
					...(people ? { people_requested: Number(people) } : {}),
					...(portionsPerPerson ? { portions_per_person: Number(portionsPerPerson) } : {}),
					dietary_requirements: dietaryRequirements,
					...(!message.trim() || radiusEdited ? { search_radius_km: radiusKm } : {}),
					...(!message.trim() || deadlineEdited ? { pickup_deadline: deadlineDate.toISOString() } : {}),
				},
			});
			setAssistantResult(result);
			const plans = result.plans.map((plan): RecoveryPlanOption => ({
				key: plan.option_id,
				stops: plan.stops.map(({ offer, requested_quantity_minor }) => ({ offer, quantity: requested_quantity_minor })),
				covered: plan.covered_quantity_minor,
				shortfall: plan.shortfall_quantity_minor,
				distanceKm: plan.stops.reduce((sum, stop) => sum + stop.offer.approximate_distance_km, 0),
				complete: plan.shortfall_quantity_minor === 0,
			}));
			setOptions(plans);
			setSearched(true);
			if (result.offers_capped) setError("Nearby discovery reached its scan limit. These plans use only the offers returned; the shortfall may change if more eligible offers are found.");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "The recovery request could not be matched to nearby offers.");
		} finally { setBusy(false); }
	};

	const selectPlan = (option: RecoveryPlanOption) => {
		if (!assistantResult?.need || !origin) return;
		const need = assistantResult.need as PlanNeed;
		const request: RecoveryRequest = { itemQuery: need.item_query ?? item.trim(), quantity: need.requested_quantity_minor ?? Number(amount), unit: need.requested_unit ?? unit, dietaryRequirements: need.dietary_requirements ?? [], radiusKm: need.search_radius_km ?? Number(radius), deadline: need.pickup_deadline ?? new Date(deadline).toISOString(), origin };
		onUsePlan({ option, origin: origin!, need, request });
	};

	return <Card className="space-y-5 p-4 sm:p-6">
		<div>
			<p className="text-xs font-bold uppercase tracking-[.13em] text-secondary">Recovery assistant · grounded matching</p>
			<Heading as="h2" className="mt-1">What does your community need?</Heading>
			<p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Describe the need or fill the fields. Gemini extracts constraints; deterministic discovery checks real available offers and quantities. Missing portion assumptions are clarified before plans are shown. Choosing a plan only fills the review form.</p>
		</div>
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<label className="space-y-1 text-xs font-semibold text-primary sm:col-span-2 lg:col-span-3">Describe the request in your own words<textarea className="min-h-20 w-full rounded-control border border-line bg-white px-3 py-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} placeholder="We need 30 portions of spinach by 5 pm, vegetarian, within 5 km" /></label>
			<label className="space-y-1 text-xs font-semibold text-primary">Food or item<Input value={item} maxLength={80} onChange={(event) => setItem(event.target.value)} placeholder="e.g. spinach" /></label>
			<div className="grid grid-cols-[1fr_120px] gap-2"><label className="space-y-1 text-xs font-semibold text-primary">Amount<Input type="number" min={1} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="30" /></label><label className="space-y-1 text-xs font-semibold text-primary">Unit<select className="min-h-12 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={unit} onChange={(event) => setUnit(event.target.value as OfferUnit)}>{units.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
			<div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs font-semibold text-primary">People to support<Input type="number" min={1} step={1} value={people} onChange={(event) => setPeople(event.target.value)} placeholder="Optional" /></label><label className="space-y-1 text-xs font-semibold text-primary">Portions per person<Input type="number" min={1} step={1} value={portionsPerPerson} onChange={(event) => setPortionsPerPerson(event.target.value)} placeholder="Clarify if needed" /></label></div>
			<label className="space-y-1 text-xs font-semibold text-primary">Dietary tags (comma separated)<Input value={diet} maxLength={240} onChange={(event) => setDiet(event.target.value)} placeholder="vegetarian, dairy-free" /></label>
			<label className="space-y-1 text-xs font-semibold text-primary">Search radius (km)<Input type="number" min={1} max={20} step="any" value={radius} onChange={(event) => { setRadiusEdited(true); setRadius(event.target.value); }} /></label>
			<label className="space-y-1 text-xs font-semibold text-primary">Pickup before<Input type="datetime-local" value={deadline} onChange={(event) => { setDeadlineEdited(true); setDeadline(event.target.value); }} /></label>
			<div className="space-y-1"><LocationAutocomplete idPrefix="recovery-origin" label="Pickup origin · Maps location" defaultValue={originArea} onLocationSelected={(location) => {
				setOriginArea(location.address);
				setOrigin(Number.isFinite(location.lat) && Number.isFinite(location.lng) ? { latitude: location.lat!, longitude: location.lng!, approximate_area: location.address.slice(0, 160) } : null);
			}} /><button type="button" className="min-h-11 text-xs font-bold text-primary underline" onClick={() => { setOrigin(profile.pickup_base); setOriginArea(profile.pickup_base?.approximate_area ?? ""); }}>Use saved organization pickup base</button></div>
		</div>
		{error && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
		<Button fullWidth disabled={busy} onClick={() => void search()}>{busy ? "Finding eligible offers…" : "Find recovery plans"}</Button>
		{searched && <div aria-live="polite" className="space-y-3">
			{assistantResult?.status === "needs_clarification" && <p className="rounded-xl bg-tertiary-soft p-4 text-sm leading-6 text-primary">{assistantResult.clarification}</p>}
			{assistantResult?.status === "plans" && options.length === 0 ? <p className="rounded-xl bg-surface-muted p-4 text-sm leading-6 text-muted">No eligible offer combination was found for these constraints. No quantities were estimated. Try a wider radius, a later pickup deadline, or different dietary requirements.</p> : options.length > 0 ? <>
				<p className="text-xs text-muted">Plans use currently discoverable offers that match item, exact unit, donor-declared tags, pickup deadline and radius. Stop order and distances are approximate straight-line calculations. {assistantResult?.route_status === "unavailable" ? "Driving routes and ETAs are unavailable until Google Routes is configured." : ""}</p>
				{options.some((option) => option.stops.some(({ offer }) => offer.demo_scenario)) && <p className="rounded-xl border border-tertiary/30 bg-tertiary-soft p-3 text-sm text-primary">Rehearsal scenario: marked offers are synthetic, with suitability and storage unverified. They are for AI plan review only and cannot be reserved or counted as recovered food.</p>}
				<div className="grid gap-3 xl:grid-cols-2">{options.map((option, index) => <Card key={option.key} className="space-y-4 border border-line p-4">
					<div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-primary">{index === 0 ? "Option 1 · Greater coverage" : "Option 2 · Nearby pickups"} · {option.complete ? "Request covered" : "Partial coverage"}</h3><p className="mt-1 text-sm text-muted">{humanQuantity(option.covered, assistantResult?.need?.requested_unit ?? unit)} covered of {humanQuantity(assistantResult?.need?.requested_quantity_minor ?? Number(amount), assistantResult?.need?.requested_unit ?? unit)} requested</p><p className="mt-1 text-xs text-muted">{assistantResult?.plans[index]?.explanation}</p></div><span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-primary">{option.stops.length} stop{option.stops.length === 1 ? "" : "s"} · {option.distanceKm.toFixed(1)} km approximate</span></div>
					{!option.complete && <p className="rounded-lg bg-tertiary-soft p-3 text-sm text-primary">Confirmed matching offers leave a shortfall of {humanQuantity(option.shortfall, assistantResult?.need?.requested_unit ?? unit)}.</p>}
					<ol className="space-y-2">{option.stops.map(({ offer, quantity: amountAtStop }, stopIndex) => <li key={offer.offer_id} className="rounded-xl bg-surface-muted p-3 text-sm"><div className="flex justify-between gap-3"><strong className="text-primary">{stopIndex + 1}. {offer.title}</strong><span className="shrink-0 text-primary">{humanQuantity(amountAtStop, assistantResult?.need?.requested_unit ?? unit)}</span></div><p className="mt-1 text-xs text-muted">{offer.approximate_area} · {offer.approximate_distance_km.toFixed(1)} km · available until {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(offer.pickup_window_end))}</p>{offer.demo_scenario && <p className="mt-1 text-xs font-semibold text-tertiary">Synthetic rehearsal offer · cannot be reserved</p>}</li>)}</ol>
					<Button variant="secondary" fullWidth disabled={busy} onClick={() => selectPlan(option)}>{option.stops.some(({ offer }) => offer.demo_scenario) ? "Review simulated plan" : "Choose this plan"}</Button>
				</Card>)}</div>
			</> : null}
		</div>}
	</Card>;
}
