import { CanonicalApiError } from "./canonical-transport";

export type DonorActorKind = "household" | "business";

export type DonorActor = {
  kind: DonorActorKind;
  id: string;
  name: string;
  role?: string;
  status?: string;
};

export type OrganizationItem = {
  org_id: string;
  type: "business_donor" | "recipient_org";
  name: string;
  verification_status: "PENDING" | "APPROVED" | "REVOKED";
  role: string;
  permissions: string[];
  membership_version: number;
};

export type OfferUnit = "g" | "ml" | "portion" | "package" | "item";

export type SurplusOffer = {
  offer_id: string;
  donor?: {
    kind: "household" | "business";
    owner_id?: string;
    creator_uid?: string;
  };
  title: string;
  category: string;
  tags: string[];
  quantity_total_minor?: number | null;
  quantity_available_minor?: number | null;
  quantity_reserved_minor?: number;
  quantity_collected_minor?: number;
  quantity_received_minor?: number;
  unit?: OfferUnit | null;
  expiry_declaration: "UNKNOWN" | "DONOR_DECLARED";
  expiry_at?: string | null;
  storage_declaration: "UNKNOWN" | "AMBIENT" | "CHILLED" | "FROZEN" | "OTHER";
  condition_declaration: "UNKNOWN" | "DONOR_CONFIRMED_SUITABLE";
  allergen_declaration: "UNKNOWN" | "DONOR_DECLARED_NONE" | "DONOR_DECLARED_PRESENT";
  source_kitchen_item_id?: string | null;
  source_kitchen_item_version?: number | null;
  pickup_window_start?: string | null;
  pickup_window_end?: string | null;
  approximate_area?: string | null;
  exact_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pickup_instructions?: string | null;
  media_ids?: string[];
  visibility: "PUBLIC" | "PRIVATE";
  status: "DRAFT" | "OPEN" | "PARTIALLY_RESERVED" | "FULLY_RESERVED" | "CLOSED" | "EXPIRED" | "CANCELLED";
  version: number;
  created_at?: string;
  updated_at?: string;
};

export type OfferEditPayload = {
  expected_version: number;
  title: string;
  category: string;
  tags?: string[];
  quantity_total_minor: number;
  unit: OfferUnit;
  expiry_declaration: "UNKNOWN" | "DONOR_DECLARED";
  expiry_at?: string | null;
  storage_declaration: "UNKNOWN" | "AMBIENT" | "CHILLED" | "FROZEN" | "OTHER";
  condition_declaration: "UNKNOWN" | "DONOR_CONFIRMED_SUITABLE";
  allergen_declaration: "UNKNOWN" | "DONOR_DECLARED_NONE" | "DONOR_DECLARED_PRESENT";
  source_kitchen_item_id?: string | null;
  source_kitchen_item_version?: number | null;
  pickup_window_start: string;
  pickup_window_end: string;
  approximate_area: string;
  exact_address: string;
  latitude: number;
  longitude: number;
  pickup_instructions?: string;
};

export type OfferAnalyzeResult = {
  visible_food: string[];
  suggested_title: string | null;
  suggested_category: string | null;
  packaging_observations: string | null;
  label_text: string | null;
  uncertainty: string | null;
  missing_fields: string[];
  ai_provider: string | null;
};

export type DonorReceiptImpactRecord = {
  claim_id: string;
  offer_id: string;
  donor_kind: DonorActorKind;
  donor_owner_id: string;
  received_quantity_minor: number;
  unit: OfferUnit;
};

function getApiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_ECOLOOP_API_ORIGIN?.trim();
  if (!configured) return "http://127.0.0.1:8000";
  try {
    return new URL(configured).origin;
  } catch {
    return "http://127.0.0.1:8000";
  }
}

function makeIdempotencyKey(): string {
  return crypto.randomUUID();
}

async function apiFetch<T>(
  path: string,
  token: string,
  actor?: { kind: DonorActorKind; id: string },
  options: {
    method?: string;
    body?: unknown;
    idempotencyKey?: string;
    isBinary?: boolean;
    contentType?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const origin = getApiOrigin();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (actor) {
    headers["X-Actor-Kind"] = actor.kind;
    headers["X-Actor-Id"] = actor.id;
  }

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  let bodyData: BodyInit | undefined;
  if (options.body) {
    if (options.isBinary) {
      bodyData = options.body as BodyInit;
      if (options.contentType) {
        headers["Content-Type"] = options.contentType;
      }
    } else {
      headers["Content-Type"] = "application/json";
      bodyData = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${origin}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: bodyData,
    cache: "no-store",
    signal: options.signal,
  });

  if (!response.ok) {
    let errorDetails: { error?: { message?: string }; detail?: string } | null = null;
    try {
      errorDetails = (await response.json()) as { error?: { message?: string }; detail?: string };
    } catch {
      // not json
    }
    const msg = errorDetails?.error?.message ?? errorDetails?.detail ?? `Request failed with status ${response.status}`;
    if (response.status === 409) {
      throw new CanonicalApiError("conflict", msg);
    }
    if (response.status === 422) {
      throw new CanonicalApiError("validation", msg);
    }
    if (response.status === 403) {
      throw new CanonicalApiError("forbidden", msg);
    }
    if (response.status === 401) {
      throw new CanonicalApiError("unauthenticated", msg);
    }
    throw new CanonicalApiError("unexpected", msg);
  }

  const result = await response.json();
  return (result?.result ?? result) as T;
}

export async function fetchMyOrganizations(token: string): Promise<OrganizationItem[]> {
  const data = await apiFetch<{ organizations: OrganizationItem[] }>("/api/v1/organizations/me", token);
  return data.organizations ?? [];
}

export async function createBusinessOrganization(
  token: string,
  name: string,
  category?: string,
): Promise<{ org_id: string; name: string }> {
  const data = await apiFetch<{ organization: { org_id: string; name: string } }>(
    "/api/v1/organizations",
    token,
    undefined,
    {
      method: "POST",
      body: { type: "business_donor", name, category },
      idempotencyKey: makeIdempotencyKey(),
    },
  );
  return data.organization;
}

export async function fetchMyOffers(
  token: string,
  actor: { kind: DonorActorKind; id: string },
): Promise<SurplusOffer[]> {
  const data = await apiFetch<{ offers: SurplusOffer[] }>("/api/v1/offers/mine", token, actor);
  return data.offers ?? [];
}

export async function fetchOffer(
  token: string,
  actor: { kind: DonorActorKind; id: string },
  offerId: string,
): Promise<SurplusOffer> {
  return await apiFetch<SurplusOffer>(`/api/v1/offers/${encodeURIComponent(offerId)}`, token, actor);
}

export async function fetchOfferReceiptImpact(
  token: string,
  actor: { kind: DonorActorKind; id: string },
  offerId: string,
  signal?: AbortSignal,
): Promise<{ records: DonorReceiptImpactRecord[]; complete: boolean }> {
  const records: DonorReceiptImpactRecord[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  const maxPages = 20;

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({ limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const result = await apiFetch<{
      records: DonorReceiptImpactRecord[];
      cursor: string | null;
      coverage: "all_records" | "loaded_page";
    }>(`/api/v1/impact/me?${params.toString()}`, token, actor, { signal });
    if (!Array.isArray(result.records)) throw new CanonicalApiError("invalid_response", "The receipt service returned invalid records.");
    records.push(...result.records.filter((record) =>
      record.offer_id === offerId &&
      record.donor_kind === actor.kind &&
      record.donor_owner_id === actor.id,
    ));
    if (!result.cursor) return { records, complete: true };
    if (seenCursors.has(result.cursor)) throw new CanonicalApiError("invalid_response", "The receipt service returned a repeated page cursor.");
    seenCursors.add(result.cursor);
    cursor = result.cursor;
  }

  return { records, complete: false };
}

export async function createOfferDraft(
  token: string,
  actor: { kind: DonorActorKind; id: string },
  title: string,
  category: string,
): Promise<{ offer_id: string; status: string; version: number }> {
  return await apiFetch<{ offer_id: string; status: string; version: number }>(
    "/api/v1/offers",
    token,
    actor,
    {
      method: "POST",
      body: { title, category },
      idempotencyKey: makeIdempotencyKey(),
    },
  );
}

export async function editOffer(
  token: string,
  actor: { kind: DonorActorKind; id: string },
  offerId: string,
  payload: OfferEditPayload,
): Promise<{ offer_id: string; status: string; version: number }> {
  return await apiFetch<{ offer_id: string; status: string; version: number }>(
    `/api/v1/offers/${encodeURIComponent(offerId)}`,
    token,
    actor,
    {
      method: "PATCH",
      body: payload,
      idempotencyKey: makeIdempotencyKey(),
    },
  );
}

export async function uploadOfferMedia(
  token: string,
  actor: { kind: DonorActorKind; id: string },
  offerId: string,
  imageFile: File,
): Promise<{ media_id: string; offer_id: string; version: number }> {
  const bytes = await imageFile.arrayBuffer();
  return await apiFetch<{ media_id: string; offer_id: string; version: number }>(
    `/api/v1/offers/${encodeURIComponent(offerId)}/media`,
    token,
    actor,
    {
      method: "POST",
      body: bytes,
      isBinary: true,
      contentType: imageFile.type || "image/jpeg",
      idempotencyKey: makeIdempotencyKey(),
    },
  );
}

export async function analyzeOfferMedia(
  token: string,
  actor: { kind: DonorActorKind; id: string },
  offerId: string,
  mediaIds: string[],
): Promise<OfferAnalyzeResult> {
  return await apiFetch<OfferAnalyzeResult>(
    `/api/v1/offers/${encodeURIComponent(offerId)}/analyze`,
    token,
    actor,
    {
      method: "POST",
      body: { media_ids: mediaIds },
    },
  );
}

export async function publishOffer(
  token: string,
  actor: { kind: DonorActorKind; id: string },
  offerId: string,
  expectedVersion: number,
): Promise<{ offer_id: string; status: string; version: number }> {
  return await apiFetch<{ offer_id: string; status: string; version: number }>(
    `/api/v1/offers/${encodeURIComponent(offerId)}/publish`,
    token,
    actor,
    {
      method: "POST",
      body: { expected_version: expectedVersion, confirmed: true },
      idempotencyKey: makeIdempotencyKey(),
    },
  );
}

export async function cancelOffer(
  token: string,
  actor: { kind: DonorActorKind; id: string },
  offerId: string,
  expectedVersion: number,
  reason: string,
): Promise<{ offer_id: string; status: string; version: number }> {
  return await apiFetch<{ offer_id: string; status: string; version: number }>(
    `/api/v1/offers/${encodeURIComponent(offerId)}/cancel`,
    token,
    actor,
    {
      method: "POST",
      body: { expected_version: expectedVersion, reason },
      idempotencyKey: makeIdempotencyKey(),
    },
  );
}
