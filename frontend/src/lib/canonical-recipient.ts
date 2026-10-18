import { CanonicalApiError } from "./canonical-transport";

export type RecipientActor = { kind: "recipient_org"; id: string };
export type OfferUnit = "g" | "ml" | "portion" | "package" | "item";
export type PickupBase = { latitude: number; longitude: number; approximate_area: string };

export type RecipientProfile = {
	org_id: string;
	type: "recipient_org";
	name: string;
	category: string;
	verification_status: "PENDING" | "APPROVED";
	profile_status: "INCOMPLETE" | "COMPLETE";
	pickup_base: PickupBase | null;
	service_radius_km: number;
	version: number;
	updated_at: string;
};

export type DiscoveredOffer = {
	offer_id: string;
	title: string;
	category: string;
	tags: string[];
	donor_kind: "household" | "business";
	quantity_available_minor: number;
	unit: OfferUnit;
	expiry_declaration: "UNKNOWN" | "DONOR_DECLARED";
	expiry_at: string | null;
	condition_declaration: "UNKNOWN" | "DONOR_CONFIRMED_SUITABLE";
	storage_declaration: "UNKNOWN" | "AMBIENT" | "CHILLED" | "FROZEN" | "OTHER";
	allergen_declaration: "UNKNOWN" | "DONOR_DECLARED_NONE" | "DONOR_DECLARED_PRESENT";
	pickup_window_start: string;
	pickup_window_end: string;
	approximate_area: string;
	approximate_latitude: number;
	approximate_longitude: number;
	approximate_distance_km: number;
	status: "OPEN" | "PARTIALLY_RESERVED";
	version: number;
	demo_scenario: boolean;
};

export type PlanNeed = {
	people_requested?: number | null; target_portions?: number | null; portions_per_person?: number | null;
	item_query?: string | null; requested_quantity_minor?: number | null; requested_unit?: OfferUnit | null;
	dietary_requirements?: string[]; pickup_deadline?: string | null; search_radius_km?: number | null;
};

export type RecoveryAssistantResult = {
	status: "needs_clarification" | "plans";
	clarification: string | null;
	need: PlanNeed | null;
	plans: Array<{
		option_id: string;
		strategy: "coverage" | "nearby";
		explanation: string;
		covered_quantity_minor: number;
		shortfall_quantity_minor: number;
		requested_quantity_minor: number;
		unit: OfferUnit;
		route_distance_meters: number | null;
		route_duration_seconds: number | null;
		stops: Array<{ offer: DiscoveredOffer; requested_quantity_minor: number }>;
	}>;
	offers_capped: boolean;
	route_status: "unavailable" | "available";
};
export type PlanStop = {
	stop_id: string;
	offer_id: string;
	requested_quantity_minor: number;
	unit: OfferUnit;
	expected_offer_version: number;
	demo_scenario?: boolean;
	claim_id?: string | null;
	status: "SELECTED" | "RESERVED" | "COLLECTED" | "RECEIVED" | "UNAVAILABLE" | "CANCELLED" | "EXPIRED";
	available_quantity_minor?: number | null;
	collected_quantity_minor?: number | null;
	received_quantity_minor?: number | null;
	failure_code?: string | null;
	version: number;
};
export type RecoveryPlan = {
	plan_id: string;
	org_id: string;
	created_by: string;
	name: string;
	origin: PickupBase;
	destination: PickupBase;
	need: PlanNeed | null;
	stops: PlanStop[];
	status: "ACTIVE" | "PARTIAL" | "COMPLETED" | "CANCELLED";
	version: number;
	created_at: string;
	updated_at: string;
};
export type RecipientClaim = {
	claim_id: string;
	plan_id: string;
	stop_id: string;
	offer_id: string;
	recipient_org_id: string;
	quantity_minor: number;
	unit: OfferUnit;
	status: "RESERVED" | "COLLECTED" | "RECEIVED" | "CANCELLED" | "EXPIRED";
	collected_quantity_minor: number;
	received_quantity_minor: number;
	handed_over_quantity_minor?: number | null;
	version: number;
	pickup_window_start: string;
	pickup_window_end: string;
	exact_address: string | null;
	pickup_instructions: string | null;
	latitude: number | null;
	longitude: number | null;
	donor_kind: "household" | "business";
	donor_owner_id: string;
};
export type CollectionRoute = {
	plan_id: string;
	provider: "google_routes" | "unavailable";
	generated_at: string;
	stops: Array<{
		claim_id: string; stop_order: number; offer_id: string; title: string; address: string; instructions: string;
		latitude: number; longitude: number; pickup_window_start: string; pickup_window_end: string;
		leg_duration_seconds: number | null; route_url: string;
	}>;
	total_duration_seconds: number | null;
	return_to_base_url?: string | null;
	warning_codes: string[];
};
export type ImpactRecord = {
	claim_id: string;
	offer_id: string;
	plan_id: string;
	donor_kind: "household" | "business";
	donor_owner_id: string;
	recipient_org_id: string;
	offered_quantity_minor: number;
	collected_quantity_minor: number;
	received_quantity_minor: number;
	handed_over_quantity_minor?: number | null;
	unit: OfferUnit;
	recorded_at: string;
};

function apiOrigin(): string {
	const configured = process.env.NEXT_PUBLIC_ECOLOOP_API_ORIGIN?.trim();
	if (!configured) throw new CanonicalApiError("not_configured", "The recovery service is not configured yet.");
	let url: URL;
	try { url = new URL(configured); } catch { throw new CanonicalApiError("bad_origin", "The recovery service address is invalid."); }
	const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
	if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
		throw new CanonicalApiError("bad_origin", "The recovery service requires HTTPS outside local development.");
	}
	return url.origin;
}

function idempotencyKey(): string { return crypto.randomUUID(); }

async function request<T>(path: string, token: string, options: {
	method?: "GET" | "POST" | "PATCH";
	actor?: RecipientActor;
	body?: unknown;
	key?: string;
	signal?: AbortSignal;
} = {}): Promise<T> {
	const method = options.method ?? "GET";
	const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
	if (options.actor) {
		headers["X-Actor-Kind"] = options.actor.kind;
		headers["X-Actor-Id"] = options.actor.id;
	}
	if (options.key) headers["Idempotency-Key"] = options.key;
	if (method !== "GET") headers["Content-Type"] = "application/json";
	let response: Response;
	try {
		response = await fetch(new URL(path, apiOrigin()), {
			method,
			headers,
			...(method !== "GET" ? { body: JSON.stringify(options.body) } : {}),
			cache: "no-store",
			credentials: "omit",
			redirect: "error",
			signal: options.signal,
		});
	} catch (cause) {
		if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
		throw new CanonicalApiError("network", "The recovery service could not be reached. Check your connection and try again.");
	}
	let payload: unknown;
	try { payload = await response.json(); } catch { throw new CanonicalApiError("invalid_response", "The recovery service returned unreadable data."); }
	if (!response.ok) {
		const data = payload as { error?: { message?: string }; detail?: string } | null;
		const message = data?.error?.message ?? data?.detail ?? `The recovery service returned status ${response.status}.`;
		const code = response.status === 401 ? "unauthenticated" : response.status === 403 ? "forbidden" : response.status === 409 ? "conflict" : response.status === 400 || response.status === 422 ? "validation" : response.status >= 500 ? "unavailable" : "unexpected";
		throw new CanonicalApiError(code, message);
	}
	if (!payload || typeof payload !== "object") throw new CanonicalApiError("invalid_response", "The recovery service returned an invalid response.");
	return ((payload as { result?: T }).result ?? payload) as T;
}

export async function createRecipientOrganization(token: string, input: {
	name: string; category: string; pickup_base: PickupBase; service_radius_km: number;
}): Promise<{ org_id: string; name: string }> {
	const result = await request<{ organization: { org_id: string; name: string } }>("/api/v1/organizations", token, { method: "POST", body: { type: "recipient_org", ...input }, key: idempotencyKey() });
	return result.organization;
}

export function getRecipientProfile(token: string, orgId: string, signal?: AbortSignal): Promise<RecipientProfile> {
	return request(`/api/v1/organizations/${encodeURIComponent(orgId)}`, token, { signal });
}

export function updateRecipientProfile(token: string, orgId: string, profile: RecipientProfile, signal?: AbortSignal): Promise<RecipientProfile> {
	return request(`/api/v1/organizations/${encodeURIComponent(orgId)}`, token, {
		method: "PATCH", body: {
			expected_version: profile.version,
			name: profile.name,
			category: profile.category,
			pickup_base: profile.pickup_base,
			service_radius_km: profile.service_radius_km,
		}, key: idempotencyKey(), signal,
	});
}

export function discoverRecipientOffers(token: string, actor: RecipientActor, profile: RecipientProfile, filters: {
	query?: string; category?: string; radius_km?: number; pickup_state?: "available_now" | "today" | "any";
}, signal?: AbortSignal): Promise<{ offers: DiscoveredOffer[]; next_cursor: string | null; capped: boolean }> {
	if (!profile.pickup_base) throw new CanonicalApiError("validation", "Complete the organization pickup base before searching nearby offers.");
	const params = new URLSearchParams({
		latitude: String(profile.pickup_base.latitude),
		longitude: String(profile.pickup_base.longitude),
		radius_km: String(filters.radius_km ?? profile.service_radius_km),
		pickup_state: filters.pickup_state ?? "any",
	});
	if (filters.query?.trim()) params.set("query", filters.query.trim());
	if (filters.category?.trim() && filters.category.trim().length >= 2) params.set("category", filters.category.trim());
	return request(`/api/v1/recovery/offers?${params.toString()}`, token, { actor, signal });
}

export function requestRecoveryPlans(token: string, actor: RecipientActor, input: {
	message: string;
	origin: PickupBase;
	structured?: Partial<PlanNeed>;
}, signal?: AbortSignal): Promise<RecoveryAssistantResult> {
	return request("/api/v1/recovery/assistant", token, { method: "POST", actor, body: input, signal });
}

export function listRecoveryPlans(token: string, actor: RecipientActor, signal?: AbortSignal): Promise<{ plans?: RecoveryPlan[] } | RecoveryPlan[]> {
	return request("/api/v1/recovery/plans?limit=25", token, { actor, signal });
}

export function createRecoveryPlan(token: string, actor: RecipientActor, input: {
	name?: string; origin: PickupBase; destination: PickupBase; need?: PlanNeed | null; stops: PlanStop[];
}, signal?: AbortSignal): Promise<RecoveryPlan> {
	return request("/api/v1/recovery/plans", token, { method: "POST", actor, body: input, key: idempotencyKey(), signal });
}

export function updateRecoveryPlan(token: string, actor: RecipientActor, plan: RecoveryPlan, signal?: AbortSignal): Promise<RecoveryPlan> {
	return request(`/api/v1/recovery/plans/${encodeURIComponent(plan.plan_id)}`, token, {
		method: "PATCH", actor, body: {
			expected_version: plan.version,
			name: plan.name,
			origin: plan.origin,
			destination: plan.destination,
			need: plan.need,
			stops: plan.stops,
		}, key: idempotencyKey(), signal,
	});
}

export function reservePlanStop(token: string, actor: RecipientActor, plan: RecoveryPlan, stop: PlanStop): Promise<{
	claim_id: string; plan_id: string; stop_id: string; offer_id: string; quantity_minor: number; unit: OfferUnit; status: string; version: number;
}> {
	return request(`/api/v1/recovery/plans/${encodeURIComponent(plan.plan_id)}/stops/${encodeURIComponent(stop.stop_id)}/reserve`, token, {
		method: "POST", actor,
		body: { expected_plan_version: plan.version, expected_offer_version: stop.expected_offer_version },
		key: idempotencyKey(),
	});
}

export function listRecipientClaims(token: string, actor: RecipientActor, signal?: AbortSignal): Promise<{ claims: RecipientClaim[] }> {
	return request("/api/v1/claims/mine?limit=100", token, { actor, signal });
}

export function buildCollectionRoute(token: string, actor: RecipientActor, planId: string, claimIds: string[], signal?: AbortSignal): Promise<CollectionRoute> {
	return request("/api/v1/recovery/routes", token, { method: "POST", actor, body: { plan_id: planId, claim_ids: claimIds }, signal });
}

export function updateRecipientClaim(token: string, actor: RecipientActor, claim: RecipientClaim, action: "cancel" | "collect" | "receive", body: {
	reason?: string; quantity_minor?: number;
}): Promise<RecipientClaim> {
	const quantityKey = action === "collect" ? "collected_quantity_minor" : "received_quantity_minor";
	const payload = action === "cancel" ? { expected_version: claim.version, reason: body.reason } : {
		expected_version: claim.version,
		[quantityKey]: body.quantity_minor,
		...(body.reason ? { reason: body.reason } : {}),
	};
	return request(`/api/v1/claims/${encodeURIComponent(claim.claim_id)}/${action}`, token, {
		method: "POST", actor, body: payload, key: idempotencyKey(),
	});
}

export function makePlanStop(offer: DiscoveredOffer, requestedQuantity: number): PlanStop {
	return {
		stop_id: crypto.randomUUID(), offer_id: offer.offer_id, requested_quantity_minor: requestedQuantity,
		unit: offer.unit, expected_offer_version: offer.version, demo_scenario: offer.demo_scenario, status: "SELECTED", version: 1,
	};
}

export function recipientImpact(token: string, actor: RecipientActor, signal?: AbortSignal): Promise<{ records: ImpactRecord[]; cursor: string | null; coverage: "all_records" | "loaded_page" }> {
	return request("/api/v1/impact/me?limit=100", token, { actor, signal });
}

export function newIdempotencyKey(): string { return idempotencyKey(); }
