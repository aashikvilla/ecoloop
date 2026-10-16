export type KitchenObservation = {
  item_id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  date_value: string | null;
  date_type: string;
  storage: string | null;
  version: number;
  observed_at: string;
};

export type ShoppingEntry = {
  entry_id: string;
  item_name: string;
  desired_amount: number | null;
  unit: string | null;
  version: number;
  updated_at: string;
};

export type CanonicalData =
  | { kind: "kitchen"; records: KitchenObservation[] }
  | { kind: "shopping"; records: ShoppingEntry[] };

export type ApiFailureCode = "not_configured" | "bad_origin" | "unauthenticated" | "forbidden" | "conflict" | "validation" | "rate_limited" | "unavailable" | "timeout" | "network" | "invalid_response" | "unexpected";

export class CanonicalApiError extends Error {
  constructor(readonly code: ApiFailureCode, message: string, readonly requestId?: string) {
    super(message);
    this.name = "CanonicalApiError";
  }
}

function apiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_ECOLOOP_API_ORIGIN?.trim();
  if (!configured) throw new CanonicalApiError("not_configured", "The canonical household API is not configured.");
  let url: URL;
  try { url = new URL(configured); } catch { throw new CanonicalApiError("bad_origin", "The canonical API address is invalid."); }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new CanonicalApiError("bad_origin", "The canonical API address must be an HTTPS origin (HTTP is allowed for local development only).");
  }
  return url.origin;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function boundedString(value: unknown, max: number): value is string { return typeof value === "string" && value.length > 0 && value.length <= max; }
function nullableString(value: unknown, max: number): value is string | null { return value === null || (typeof value === "string" && value.length <= max); }
function recordId(value: unknown): value is string { return boundedString(value, 128) && /^[A-Za-z0-9._:-]+$/.test(value); }
function nullableAmount(value: unknown): value is number | null { return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1_000_000); }
function positiveVersion(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
function isoTimestamp(value: unknown): value is string { return boundedString(value, 40) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value)); }
function dateOnly(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
function validQuantity(amount: unknown, unit: unknown): boolean {
  return nullableAmount(amount) && (amount === null ? unit === null : boundedString(unit, 32) && /^[A-Za-z][A-Za-z0-9_-]*$/.test(unit));
}
const dateTypes = new Set(["USE_BY", "EXPIRY", "BEST_BEFORE", "USER_TARGET", "UNKNOWN"]);
function isKitchenObservation(value: unknown): value is KitchenObservation {
  return object(value) && recordId(value.item_id) && boundedString(value.name, 120) && validQuantity(value.amount, value.unit) && dateOnly(value.date_value) && typeof value.date_type === "string" && dateTypes.has(value.date_type) && (value.date_value === null ? value.date_type === "UNKNOWN" : value.date_type !== "UNKNOWN") && nullableString(value.storage, 120) && positiveVersion(value.version) && isoTimestamp(value.observed_at);
}
function isShoppingEntry(value: unknown): value is ShoppingEntry {
  return object(value) && recordId(value.entry_id) && boundedString(value.item_name, 120) && validQuantity(value.desired_amount, value.unit) && positiveVersion(value.version) && isoTimestamp(value.updated_at);
}

function validateSuccess(data: unknown, kind: "kitchen" | "shopping"): CanonicalData {
  if (!object(data) || data.schema_version !== 1 || !boundedString(data.request_id, 128) || !object(data.result)) throw new CanonicalApiError("invalid_response", "The household API returned an unexpected response.");
  const list = kind === "kitchen" ? data.result.observations : data.result.entries;
  const valid = Array.isArray(list) && list.length <= 200 && list.every(kind === "kitchen" ? isKitchenObservation : isShoppingEntry);
  const ids = valid ? list.map((record) => kind === "kitchen" ? (record as KitchenObservation).item_id : (record as ShoppingEntry).entry_id) : [];
  if (!valid || new Set(ids).size !== ids.length) throw new CanonicalApiError("invalid_response", "The household API returned records that do not match the supported format.", data.request_id);
  return { kind, records: list as KitchenObservation[] | ShoppingEntry[] } as CanonicalData;
}

function failure(status: number, body: unknown): CanonicalApiError {
  const envelope = object(body) && object(body.error) ? body.error : {};
  const requestId = boundedString(envelope.requestID, 128) ? envelope.requestID : undefined;
  if (status === 401) return new CanonicalApiError("unauthenticated", "Your sign-in expired or is not accepted. Sign in again to continue.", requestId);
  if (status === 403) return new CanonicalApiError("forbidden", "This account cannot access that household. Check the household ID or contact its administrator.", requestId);
  if (status === 409) return new CanonicalApiError("conflict", "The household data changed while it was loading. Refresh and try again.", requestId);
  if (status === 422) return new CanonicalApiError("validation", "The household API rejected the request format. Refresh the page and try again.", requestId);
  if (status === 429) return new CanonicalApiError("rate_limited", "Too many requests were made. Wait a moment, then retry.", requestId);
  if (status === 503 || status >= 500) return new CanonicalApiError("unavailable", "Household data is temporarily unavailable. Your canonical records were not changed.", requestId);
  return new CanonicalApiError("unexpected", "The household API could not complete this read.", requestId);
}

export async function readCanonicalRecords(kind: "kitchen" | "shopping", idToken: string, householdId: string, signal?: AbortSignal): Promise<CanonicalData> {
  if (!idToken) throw new CanonicalApiError("unauthenticated", "Sign in before loading household data.");
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(householdId)) throw new CanonicalApiError("validation", "Enter a valid household ID.");
  const origin = apiOrigin();
  const endpoint = kind === "kitchen" ? "/api/v1/kitchen" : "/api/v1/shopping";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), 12_000);
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) controller.abort(signal.reason);
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(`${origin}${endpoint}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}`, "X-Household-ID": householdId, Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
    });
    let body: unknown;
    try { body = await response.json(); } catch { throw new CanonicalApiError("invalid_response", "The household API returned unreadable data."); }
    if (!response.ok) throw failure(response.status, body);
    return validateSuccess(body, kind);
  } catch (error) {
    if (error instanceof CanonicalApiError) throw error;
    if (controller.signal.aborted) {
      if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
      throw new CanonicalApiError("timeout", "The request took too long. Check your connection and retry.");
    }
    throw new CanonicalApiError("network", "Could not reach the household API. Check the API address and connection, then retry.");
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
