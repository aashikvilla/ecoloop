import type { DiscoveredOffer, OfferUnit, PickupBase } from "@/lib/canonical-recipient";

export type RecoveryRequest = {
	itemQuery: string;
	quantity: number;
	unit: OfferUnit;
	dietaryRequirements: string[];
	radiusKm: number;
	deadline: string;
	origin: PickupBase;
};

export type RecoveryPlanOption = {
	key: string;
	stops: Array<{ offer: DiscoveredOffer; quantity: number }>;
	covered: number;
	shortfall: number;
	distanceKm: number;
	routeDurationSeconds?: number | null;
	routeIsGoogle?: boolean;
	complete: boolean;
};

const normalized = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");

export function planRecoveryOptions(offers: DiscoveredOffer[], request: RecoveryRequest): RecoveryPlanOption[] {
	const item = normalized(request.itemQuery);
	const requirements = request.dietaryRequirements.map(normalized).filter(Boolean);
	const deadline = new Date(request.deadline).getTime();
	const candidates = offers.filter((offer) => {
		const end = new Date(offer.pickup_window_end).getTime();
		const searchable = normalized(`${offer.title} ${offer.category}`);
		const tags = new Set(offer.tags.map(normalized));
		return item.length >= 2
			&& (searchable.includes(item) || item.split(" ").every((token) => searchable.includes(token)))
			&& offer.unit === request.unit
			&& Number.isSafeInteger(offer.quantity_available_minor) && offer.quantity_available_minor > 0
			&& offer.condition_declaration === "DONOR_CONFIRMED_SUITABLE"
			&& ["AMBIENT", "CHILLED", "FROZEN"].includes(offer.storage_declaration)
			&& end >= Date.now() && end <= deadline
			&& offer.approximate_distance_km <= request.radiusKm
			&& requirements.every((requirement) => tags.has(requirement));
	}).sort((a, b) => a.approximate_distance_km - b.approximate_distance_km || a.offer_id.localeCompare(b.offer_id));

	const options: RecoveryPlanOption[] = [];
	const selected: DiscoveredOffer[] = [];
	const visit = (start: number) => {
		if (selected.length > 0) {
			let remaining = request.quantity;
			const stops: RecoveryPlanOption["stops"] = [];
			for (const offer of selected) {
				if (remaining <= 0) break;
				const amount = Math.min(remaining, offer.quantity_available_minor);
				stops.push({ offer, quantity: amount });
				remaining -= amount;
			}
			const covered = request.quantity - remaining;
			const key = stops.map(({ offer }) => offer.offer_id).sort().join("|");
			options.push({
				key,
				stops,
				covered,
				shortfall: request.quantity - covered,
				distanceKm: stops.reduce((sum, stop) => sum + stop.offer.approximate_distance_km, 0),
				complete: covered >= request.quantity,
			});
			if (covered >= request.quantity) return;
		}
		if (selected.length >= 5) return;
		for (let index = start; index < candidates.length; index += 1) {
			selected.push(candidates[index]);
			visit(index + 1);
			selected.pop();
		}
	};
	visit(0);

	const coverageOrder = [...options].sort((a, b) => Number(b.complete) - Number(a.complete)
		|| (b.covered - a.covered)
		|| a.stops.length - b.stops.length
		|| a.distanceKm - b.distanceKm
		|| a.key.localeCompare(b.key));
	const distanceOrder = [...options].sort((a, b) => Number(b.complete) - Number(a.complete)
		|| (b.covered - a.covered)
		|| a.distanceKm - b.distanceKm
		|| a.stops.length - b.stops.length
		|| a.key.localeCompare(b.key));
	const first = coverageOrder[0];
	if (!first) return [];
	const second = distanceOrder.find((option) => option.key !== first.key);
	return second ? [first, second] : [first];
}
