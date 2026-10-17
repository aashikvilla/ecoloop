import { parseAssistantEnvelope, type AssistantEnvelope } from "@/lib/assistant-cards";
import { canonicalRequest, CanonicalApiError } from "@/lib/canonical-transport";

export type ProposalResolution = { proposal_id: string; status: "APPROVED" | "DISMISSED"; version: number; action: "ADD" | "DISMISS"; entry_id?: string };
export type SavedAssistantTurn = { turn_id: string; created_at: string; user_text: string; envelope: AssistantEnvelope; resolutions: Record<string, ProposalResolution> };

const idPattern = /^[A-Za-z0-9._:-]{1,128}$/;
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function result(value: unknown): Record<string, unknown> {
  if (!object(value) || value.schema_version !== 1 || !object(value.result)) throw new CanonicalApiError("invalid_response", "The assistant service returned an invalid result.");
  return value.result;
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
