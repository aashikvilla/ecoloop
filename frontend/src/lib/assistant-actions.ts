import { parseAssistantEnvelope, type AssistantEnvelope } from "@/lib/assistant-cards";
import { canonicalRequest, CanonicalApiError } from "@/lib/canonical-transport";

export type ProposalResolution = { proposal_id: string; status: "APPROVED" | "DISMISSED"; version: number; action: "ADD" | "DISMISS"; entry_id?: string };
export type SavedPreference = { preference_id: string; text: string; status: "ACTIVE"; version: number; updated_at: string; consent: true };
export type SavedAssistantTurn = { turn_id: string; created_at: string; user_text: string; envelope: AssistantEnvelope; resolutions: Record<string, ProposalResolution> };

const idPattern = /^[A-Za-z0-9._:-]{1,128}$/;
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function result(value: unknown): Record<string, unknown> {
  if (!object(value) || value.schema_version !== 1 || !object(value.result)) throw new CanonicalApiError("invalid_response", "The assistant service returned an invalid result.");
  return value.result;
}

const preferenceIdPattern = /^[A-Za-z0-9_-]{16,64}$/;

export async function readSavedPreferences(token: string, signal: AbortSignal): Promise<SavedPreference[]> {
  const payload = await canonicalRequest("preferences", token, null, { signal });
  if (!object(payload) || payload.schema_version !== 1 || typeof payload.request_id !== "string" || !payload.request_id || payload.request_id.length > 128) {
    throw new CanonicalApiError("invalid_response", "The preference service returned an unexpected response.");
  }
  const body = result(payload);
  if (body.memory_bank !== "not_connected" || !Array.isArray(body.preferences) || body.preferences.length > 50) {
    throw new CanonicalApiError("invalid_response", "The preference service returned invalid saved preferences.");
  }
  const preferences = body.preferences.map((value): SavedPreference => {
    if (!object(value) || typeof value.preference_id !== "string" || !preferenceIdPattern.test(value.preference_id) || typeof value.text !== "string" || value.text.length < 1 || value.text.length > 200 || value.status !== "ACTIVE" || value.consent !== true || !Number.isSafeInteger(value.version) || (value.version as number) < 1 || typeof value.updated_at !== "string" || value.updated_at.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value.updated_at) || !Number.isFinite(Date.parse(value.updated_at))) {
      throw new CanonicalApiError("invalid_response", "The preference service returned invalid saved preferences.");
    }
    return value as SavedPreference;
  });
  if (new Set(preferences.map((preference) => preference.preference_id)).size !== preferences.length) throw new CanonicalApiError("invalid_response", "The preference service returned duplicate preferences.");
  return preferences;
}

export async function readAssistantHistory(token: string, householdId: string, signal: AbortSignal): Promise<SavedAssistantTurn[]> {
  const body = result(await canonicalRequest("proposal-history", token, householdId, { signal }));
  if (!Array.isArray(body.turns) || body.turns.length > 10) throw new CanonicalApiError("invalid_response", "The assistant history is invalid.");
  return body.turns.map((raw): SavedAssistantTurn => {
    if (!object(raw) || typeof raw.turn_id !== "string" || !idPattern.test(raw.turn_id) || typeof raw.user_text !== "string" || raw.user_text.length > 8_000 || typeof raw.created_at !== "string" || !Number.isFinite(Date.parse(raw.created_at)) || !object(raw.resolutions)) {
      throw new CanonicalApiError("invalid_response", "The assistant history is invalid.");
    }
    const parsed = parseAssistantEnvelope(raw.envelope);
    if (!parsed.ok) throw new CanonicalApiError("invalid_response", "A saved assistant response is invalid.");
    const resolutions: Record<string, ProposalResolution> = {};
    for (const [proposalId, resolution] of Object.entries(raw.resolutions)) {
      if (!idPattern.test(proposalId) || !object(resolution) || resolution.proposal_id !== proposalId || !["APPROVED", "DISMISSED"].includes(String(resolution.status)) || !["ADD", "DISMISS"].includes(String(resolution.action)) || !Number.isSafeInteger(resolution.version) || (resolution.version as number) < 2 || (resolution.entry_id !== undefined && (typeof resolution.entry_id !== "string" || !idPattern.test(resolution.entry_id)))) {
        throw new CanonicalApiError("invalid_response", "A saved proposal status is invalid.");
      }
      resolutions[proposalId] = resolution as ProposalResolution;
    }
    return { turn_id: raw.turn_id, created_at: raw.created_at, user_text: raw.user_text, envelope: parsed.envelope, resolutions };
  });
}

export async function requestDurableTurn(token: string, householdId: string, body: { schema_version: 1; text: string; session_id: string | null; context_item_ids: string[] }, signal: AbortSignal): Promise<{ envelope: AssistantEnvelope; rejectedCards: number }> {
  const parsed = parseAssistantEnvelope(await canonicalRequest("proposal-turns", token, householdId, { method: "POST", body, signal }));
  if (!parsed.ok) throw new CanonicalApiError("invalid_response", parsed.reason);
  return { envelope: parsed.envelope, rejectedCards: parsed.rejectedCards };
}

export async function submitProposalAction(token: string, householdId: string, proposalId: string, baseVersion: number, action: "ADD" | "DISMISS", idempotencyKey: string, signal: AbortSignal): Promise<ProposalResolution> {
  if (!idPattern.test(proposalId) || !Number.isSafeInteger(baseVersion) || baseVersion < 1) throw new CanonicalApiError("validation", "The proposal reference is invalid.");
  const body = result(await canonicalRequest("proposal-actions", token, householdId, {
    method: "POST", recordId: proposalId, signal,
    body: { schema_version: 1, idempotency_key: idempotencyKey, base_version: baseVersion, action },
  }));
  if (body.proposal_id !== proposalId || body.action !== action || body.status !== (action === "ADD" ? "APPROVED" : "DISMISSED") || body.version !== baseVersion + 1 || (action === "ADD" && (typeof body.entry_id !== "string" || !idPattern.test(body.entry_id)))) {
    throw new CanonicalApiError("invalid_response", "The proposal action result is invalid.");
  }
  return body as ProposalResolution;
}

export async function saveProposedPreference(token: string, preferenceId: string, text: string, idempotencyKey: string, signal: AbortSignal): Promise<SavedPreference> {
  if (!preferenceIdPattern.test(preferenceId) || !/^[A-Za-z0-9-]{16,128}$/.test(idempotencyKey) || typeof text !== "string" || !text.trim() || text.trim().length > 200 || /[\u0000-\u001f\u007f]/.test(text.trim())) {
    throw new CanonicalApiError("validation", "The proposed preference is invalid.");
  }
  const clean = text.trim();
  const payload = await canonicalRequest("preferences", token, null, {
    method: "PUT",
    recordId: preferenceId,
    body: { schema_version: 1, idempotency_key: idempotencyKey, base_version: 0, text: clean, consent: true },
    signal,
  });
  if (!object(payload) || payload.schema_version !== 1 || typeof payload.request_id !== "string" || !payload.request_id || payload.request_id.length > 128) {
    throw new CanonicalApiError("invalid_response", "The preference service returned an unexpected response.");
  }
  const saved = result(payload);
  if (saved.preference_id !== preferenceId || saved.text !== clean || saved.status !== "ACTIVE" || saved.consent !== true || saved.version !== 1 || typeof saved.updated_at !== "string" || saved.updated_at.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(saved.updated_at) || !Number.isFinite(Date.parse(saved.updated_at))) {
    throw new CanonicalApiError("invalid_response", "The preference service could not confirm this change.");
  }
  return { preference_id: preferenceId, text: clean, status: "ACTIVE", version: 1, updated_at: saved.updated_at, consent: true };
}
