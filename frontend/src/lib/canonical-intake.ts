import { CanonicalApiError } from "./canonical-transport";

export type IntakeSource = "MANUAL" | "TEXT";
export type IntakeDateType = "USE_BY" | "EXPIRY" | "BEST_BEFORE" | "USER_TARGET" | "UNKNOWN";

export type IntakeEntry = {
  name: string;
  amount: number | null;
  unit: string | null;
  date_value: string | null;
  date_type: IntakeDateType;
  date_source: "USER" | null;
  storage: string | null;
};

export type IntakeCommand = {
  schema_version: 1;
  idempotency_key: string;
  source: IntakeSource;
  entries: IntakeEntry[];
};

export type IntakeCandidate = IntakeEntry & {
  candidate_id: string;
  uncertainty: Array<"AMOUNT_UNKNOWN" | "DATE_UNKNOWN" | "STORAGE_UNKNOWN">;
};

export type IntakeRecord = {
  intake_id: string;
  status: "CANDIDATE" | "CONFIRMED";
  version: number;
  candidates: IntakeCandidate[];
};

export type IntakeConfirmationCandidate = IntakeEntry & { candidate_id: string };
export type IntakeConfirmationCommand = {
  schema_version: 1;
  idempotency_key: string;
  base_version: number;
  candidates: IntakeConfirmationCandidate[];
};

export type IntakeConfirmationResult = IntakeRecord & {
  status: "CONFIRMED";
  confirmed: Array<{ item_id: string; version: number }>;
};

export type IntakeResult = {
  intake_id: string;
  status: "CANDIDATE";
  candidates: IntakeCandidate[];
};

const MAX_ENTRIES = 10;
const dateTypes = new Set<IntakeDateType>(["USE_BY", "EXPIRY", "BEST_BEFORE", "USER_TARGET", "UNKNOWN"]);
const uncertainties = new Set(["AMOUNT_UNKNOWN", "DATE_UNKNOWN", "STORAGE_UNKNOWN"]);

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
}

function validDate(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function validEntry(value: unknown): value is IntakeEntry {
  return object(value)
    && typeof value.name === "string" && value.name.trim().length > 0 && value.name.length <= 120
    && (value.amount === null || (typeof value.amount === "number" && Number.isFinite(value.amount) && value.amount > 0 && value.amount <= 1_000_000))
    && (value.amount === null ? value.unit === null : typeof value.unit === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(value.unit))
    && validDate(value.date_value)
    && typeof value.date_type === "string" && dateTypes.has(value.date_type as IntakeDateType)
    && (value.date_value === null ? value.date_type === "UNKNOWN" && value.date_source === null : value.date_type !== "UNKNOWN" && value.date_source === "USER")
    && (value.storage === null || (typeof value.storage === "string" && value.storage.length <= 120));
}

function validCandidate(value: unknown): value is IntakeCandidate {
  if (!object(value)) return false;
  const uncertainty = Array.isArray(value.uncertainty) ? value.uncertainty : [];
  if (uncertainty.length > 3) return false;
  return boundedId(value.candidate_id)
    && validEntry(value)
    && uncertainty.every((item) => typeof item === "string" && uncertainties.has(item));
}

function validVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function parseIntakeRecord(payload: unknown): IntakeRecord {
  if (!object(payload) || !boundedId(payload.intake_id) || !validVersion(payload.version)
    || !["CANDIDATE", "CONFIRMED"].includes(String(payload.status))
    || !Array.isArray(payload.candidates) || payload.candidates.length > MAX_ENTRIES) {
    throw new CanonicalApiError("invalid_response", "The intake service returned an unexpected review record.");
  }
  const candidates: IntakeCandidate[] = [];
  for (const candidate of payload.candidates) {
    if (!validCandidate(candidate)) throw new CanonicalApiError("invalid_response", "The intake service returned candidates that do not match the supported format.");
    candidates.push(candidate);
  }
  if (new Set(candidates.map((candidate) => candidate.candidate_id)).size !== candidates.length) {
    throw new CanonicalApiError("invalid_response", "The intake service returned duplicate candidate IDs.");
  }
  return { intake_id: payload.intake_id, status: payload.status as IntakeRecord["status"], version: payload.version, candidates };
}

function parseConfirmation(payload: unknown): IntakeConfirmationResult {
  if (!object(payload) || !Array.isArray(payload.confirmed) || payload.confirmed.length < 1 || payload.confirmed.length > MAX_ENTRIES) {
    throw new CanonicalApiError("invalid_response", "The confirmation response did not match the supported format.");
  }
  const record = parseIntakeRecord(payload);
  if (record.status !== "CONFIRMED") throw new CanonicalApiError("invalid_response", "The intake service did not confirm the selected candidates.");
  const confirmed: IntakeConfirmationResult["confirmed"] = [];
  for (const item of payload.confirmed) {
    if (!object(item) || !boundedId(item.item_id) || !validVersion(item.version)) {
      throw new CanonicalApiError("invalid_response", "The confirmation response did not match the supported format.");
    }
    confirmed.push({ item_id: item.item_id, version: item.version });
  }
  if (new Set(confirmed.map((item) => item.item_id)).size !== confirmed.length) {
    throw new CanonicalApiError("invalid_response", "The confirmation response contained duplicate item IDs.");
  }
  return { ...record, status: "CONFIRMED", confirmed };
}

function parseResult(payload: unknown): IntakeResult {
  if (!object(payload) || payload.schema_version !== 1 || !boundedId(payload.request_id) || !object(payload.result)) {
    throw new CanonicalApiError("invalid_response", "The intake service returned an unexpected response.");
  }
  const result = payload.result;
  if (!boundedId(result.intake_id) || result.status !== "CANDIDATE" || !Array.isArray(result.candidates) || result.candidates.length > MAX_ENTRIES) {
    throw new CanonicalApiError("invalid_response", "The intake service returned an unexpected candidate result.", payload.request_id);
  }
  const candidates: IntakeCandidate[] = [];
  for (const candidate of result.candidates) {
    if (!validCandidate(candidate)) {
      throw new CanonicalApiError("invalid_response", "The intake service returned candidates that do not match the supported format.", payload.request_id);
    }
    candidates.push(candidate);
  }
  const ids = candidates.map((candidate) => candidate.candidate_id);
  if (new Set(ids).size !== ids.length) {
    throw new CanonicalApiError("invalid_response", "The intake service returned candidates that do not match the supported format.", payload.request_id);
  }
  return { intake_id: result.intake_id, status: "CANDIDATE", candidates };
}

function apiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_ECOLOOP_API_ORIGIN?.trim();
  if (!configured) throw new CanonicalApiError("not_configured", "Household connection is not configured yet.");
  let url: URL;
  try { url = new URL(configured); } catch { throw new CanonicalApiError("bad_origin", "The household connection address is invalid."); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new CanonicalApiError("bad_origin", "The household connection requires HTTPS outside local development.");
  }
  return url.origin;
}

function responseError(status: number, writing: boolean): CanonicalApiError {
  if (status === 401) return new CanonicalApiError("unauthenticated", "Your sign-in is not accepted. Sign in again to continue.");
  if (status === 403) return new CanonicalApiError("forbidden", "This account cannot access that household. Check the household ID.");
  if (status === 409) return new CanonicalApiError("conflict", "This request conflicts with current records. Review the intake before trying again.");
  if ([400, 413, 422].includes(status)) return new CanonicalApiError("validation", "The household service rejected this intake. Review the fields before trying again.");
  if (status === 429) return new CanonicalApiError("rate_limited", "Too many requests were made. Wait before retrying.");
  if (status >= 500) return new CanonicalApiError("unavailable", writing ? "The service could not confirm this intake. It may already exist; retry with the same key." : "This intake could not be loaded. Try again later.");
  return new CanonicalApiError("unexpected", "The household service could not confirm this intake.");
}

async function readJson(response: Response): Promise<unknown> {
  const maxBytes = 512_000;
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel();
    throw new CanonicalApiError("invalid_response", "The household response exceeded the supported size.");
  }
  if (!response.body) throw new CanonicalApiError("invalid_response", "The household service returned an empty response.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new CanonicalApiError("invalid_response", "The household response exceeded the supported size.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try { return JSON.parse(text) as unknown; } catch { throw new CanonicalApiError("invalid_response", "The household service returned unreadable data."); }
}

async function requestIntake<T>(path: string, token: string, householdId: string, options: { method: "GET" | "POST"; body?: unknown; signal?: AbortSignal; parse: (payload: unknown) => T }): Promise<T> {
  if (!token || token.length > 8192 || /[\r\n]/.test(token)) throw new CanonicalApiError("unauthenticated", "Sign in before accessing household records.");
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(householdId)) throw new CanonicalApiError("validation", "Enter a valid household ID.");
  if (options.method === "POST" && process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS !== "true") {
    throw new CanonicalApiError("not_configured", "Household changes are not enabled for this app yet.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) controller.abort(options.signal.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(new URL(`/api/v1/${path}`, apiOrigin()), {
      method: options.method,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      headers: { Authorization: `Bearer ${token}`, "X-Household-ID": householdId, Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
      cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal,
    });
    const payload = await readJson(response);
    if (!response.ok) throw responseError(response.status, options.method === "POST");
    return options.parse(payload);
  } catch (error) {
    if (controller.signal.aborted) {
      if (options.signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
      throw new CanonicalApiError("timeout", options.method === "POST" ? "The request timed out. Keep the original retry key when trying again." : "Loading took too long. Try again.");
    }
    if (error instanceof CanonicalApiError) throw error;
    throw new CanonicalApiError("network", options.method === "POST" ? "The response could not be confirmed. Keep the original retry key when trying again." : "The intake could not be loaded. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

export function submitIntake(token: string, householdId: string, command: IntakeCommand, signal?: AbortSignal): Promise<IntakeResult> {
  if (command.schema_version !== 1 || !/^[A-Za-z0-9._:-]{8,128}$/.test(command.idempotency_key) || !["MANUAL", "TEXT"].includes(command.source) || command.entries.length < 1 || command.entries.length > MAX_ENTRIES || !command.entries.every(validEntry)) {
    return Promise.reject(new CanonicalApiError("validation", "Review the intake entries before sending."));
  }
  return requestIntake("intakes", token, householdId, { method: "POST", body: command, signal, parse: parseResult });
}

export function readIntake(token: string, householdId: string, intakeId: string, signal?: AbortSignal): Promise<IntakeRecord> {
  if (!boundedId(intakeId)) return Promise.reject(new CanonicalApiError("validation", "Choose a valid intake."));
  return requestIntake(`intakes/${encodeURIComponent(intakeId)}`, token, householdId, { method: "GET", signal, parse: parseIntakeRecord });
}

export function confirmIntake(token: string, householdId: string, intakeId: string, command: IntakeConfirmationCommand, signal?: AbortSignal): Promise<IntakeConfirmationResult> {
  if (!boundedId(intakeId) || command.schema_version !== 1 || !/^[A-Za-z0-9._:-]{8,128}$/.test(command.idempotency_key)
    || !validVersion(command.base_version) || command.candidates.length < 1 || command.candidates.length > MAX_ENTRIES
    || !command.candidates.every((candidate) => boundedId(candidate.candidate_id) && validEntry(candidate))) {
    return Promise.reject(new CanonicalApiError("validation", "Review the selected candidates before confirming."));
  }
  if (new Set(command.candidates.map((candidate) => candidate.candidate_id)).size !== command.candidates.length) {
    return Promise.reject(new CanonicalApiError("validation", "Choose each candidate only once."));
  }
  return requestIntake(`intakes/${encodeURIComponent(intakeId)}/confirm`, token, householdId, { method: "POST", body: command, signal, parse: parseConfirmation });
}
