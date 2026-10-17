import { parseAssistantEnvelope, type AssistantEnvelope } from "@/lib/assistant-cards";
import { canonicalRequest, CanonicalApiError } from "@/lib/canonical-transport";

export type ProposalResolution = { proposal_id: string; status: "APPROVED" | "DISMISSED"; version: number; action: "ADD" | "APPROVE" | "EDIT" | "DISMISS"; entry_id?: string; plan_id?: string; plan_version?: number; servings?: number; preparation_guidance?: "MAKE_A_SMALLER_BATCH" | "CONSIDER_STORAGE_OR_SHARING" | "PORTION_AND_CONSIDER_STORAGE_OR_SHARING" | "CONFIRM_PREPARATION_STAGE"; stock_changed?: false };
export type PreparationStage = "NOT_STARTED" | "PARTLY_PREPARED" | "ALREADY_COOKED" | "UNKNOWN";
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
      const isBuyResolution = object(resolution) && ["ADD", "DISMISS"].includes(String(resolution.action));
      const isMealResolution = object(resolution) && ["APPROVE", "EDIT", "DISMISS"].includes(String(resolution.action));
      const mealApproval = object(resolution) && ["APPROVE", "EDIT"].includes(String(resolution.action));
      if (!idPattern.test(proposalId) || !object(resolution) || resolution.proposal_id !== proposalId || !["APPROVED", "DISMISSED"].includes(String(resolution.status)) || (!isBuyResolution && !isMealResolution) || !Number.isSafeInteger(resolution.version) || (resolution.version as number) < 2 || (resolution.entry_id !== undefined && (typeof resolution.entry_id !== "string" || !idPattern.test(resolution.entry_id))) || (resolution.plan_id !== undefined && (typeof resolution.plan_id !== "string" || !idPattern.test(resolution.plan_id))) || (resolution.plan_version !== undefined && (!Number.isSafeInteger(resolution.plan_version) || (resolution.plan_version as number) < 1)) || (resolution.servings !== undefined && (!Number.isSafeInteger(resolution.servings) || (resolution.servings as number) < 1 || (resolution.servings as number) > 100)) || (resolution.preparation_guidance !== undefined && !["MAKE_A_SMALLER_BATCH", "CONSIDER_STORAGE_OR_SHARING", "PORTION_AND_CONSIDER_STORAGE_OR_SHARING", "CONFIRM_PREPARATION_STAGE"].includes(String(resolution.preparation_guidance))) || (resolution.stock_changed !== undefined && resolution.stock_changed !== false) || (mealApproval && (typeof resolution.plan_id !== "string" || !Number.isSafeInteger(resolution.plan_version) || !Number.isSafeInteger(resolution.servings) || typeof resolution.preparation_guidance !== "string" || resolution.stock_changed !== false))) {
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

export async function submitMealProposalAction(
  token: string,
  householdId: string,
  proposalId: string,
  baseVersion: number,
  action: "APPROVE" | "EDIT" | "DISMISS",
  preparationStage: PreparationStage,
  idempotencyKey: string,
  signal: AbortSignal,
  options: { proposedServings?: number; planBaseVersion?: number } = {},
): Promise<ProposalResolution> {
  if (!idPattern.test(proposalId) || !Number.isSafeInteger(baseVersion) || baseVersion < 1 || !/^[A-Za-z0-9-]{16,128}$/.test(idempotencyKey)) throw new CanonicalApiError("validation", "The meal proposal reference is invalid.");
  if (action === "EDIT" && (!Number.isSafeInteger(options.proposedServings) || (options.proposedServings ?? 0) < 1 || (options.proposedServings ?? 101) > 100)) throw new CanonicalApiError("validation", "Choose a serving count from 1 to 100.");
  if (options.proposedServings !== undefined && (!Number.isSafeInteger(options.proposedServings) || options.proposedServings < 1 || options.proposedServings > 100)) throw new CanonicalApiError("validation", "Choose a serving count from 1 to 100.");
  if (options.planBaseVersion !== undefined && (!Number.isSafeInteger(options.planBaseVersion) || options.planBaseVersion < 1)) throw new CanonicalApiError("validation", "The meal plan version is invalid.");
  const requestBody = {
    schema_version: 1 as const,
    idempotency_key: idempotencyKey,
    base_version: baseVersion,
    action,
    preparation_stage: preparationStage,
    ...(options.proposedServings === undefined ? {} : { proposed_servings: options.proposedServings }),
    ...(options.planBaseVersion === undefined ? {} : { plan_base_version: options.planBaseVersion }),
  };
  const body = result(await canonicalRequest("proposal-meal-actions", token, householdId, {
    method: "POST", recordId: proposalId, signal, body: requestBody,
  }));
  const expectedStatus = action === "DISMISS" ? "DISMISSED" : "APPROVED";
  const approvalValid = action === "DISMISS" || (
    typeof body.plan_id === "string" && idPattern.test(body.plan_id)
    && Number.isSafeInteger(body.plan_version) && (body.plan_version as number) >= 1
    && Number.isSafeInteger(body.servings) && (body.servings as number) >= 1 && (body.servings as number) <= 100
    && ["MAKE_A_SMALLER_BATCH", "CONSIDER_STORAGE_OR_SHARING", "PORTION_AND_CONSIDER_STORAGE_OR_SHARING", "CONFIRM_PREPARATION_STAGE"].includes(String(body.preparation_guidance))
    && body.stock_changed === false
  );
  if (body.proposal_id !== proposalId || body.action !== action || body.status !== expectedStatus || body.version !== baseVersion + 1 || !approvalValid) {
    throw new CanonicalApiError("invalid_response", "The meal proposal action result is invalid.");
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
