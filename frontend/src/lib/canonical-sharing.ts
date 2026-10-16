import type { KitchenObservation } from "@/lib/canonical-api";
import type { HistoryShareState, PrivateShareLog } from "@/lib/canonical-history";

export type ShareTransitionTarget = Exclude<HistoryShareState, "OFFERED">;
export type ShareMutationStatus = "ready" | "ambiguous" | "conflict" | "rejected";

export type ShareOfferCommand = {
  schema_version: 1;
  idempotency_key: string;
  share_id: string;
  item_id: string;
  base_item_version: number;
  recipient_label: string;
  amount: number | null;
  unit: string | null;
  measurement_basis: "MEASURED" | "USER_ESTIMATED" | "UNKNOWN";
  condition: "UNSERVED_USER_REPORTED";
  freshness: "UNKNOWN";
  note: string | null;
  occurred_at: string;
};

export type ShareTransitionCommand = {
  schema_version: 1;
  idempotency_key: string;
  base_version: number;
  state: ShareTransitionTarget;
  occurred_at: string;
  condition: "UNSERVED_USER_REPORTED" | null;
  expected_item_version: number | null;
  amount: number | null;
  unit: string | null;
  measurement_basis: "MEASURED" | "USER_ESTIMATED" | "UNKNOWN";
};

export class ShareCommandError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "ShareCommandError";
  }
}

const idPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const unitPattern = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{8,128}$/;

export function createShareId(): string {
  return `share-${crypto.randomUUID()}`;
}

export function createShareIdempotencyKey(): string {
  return crypto.randomUUID();
}

function eventTime(value: string): string {
  if (typeof value !== "string") throw new ShareCommandError("Enter when this owner-reported event happened.", "occurred_at");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    throw new ShareCommandError("Enter when this owner-reported event happened.", "occurred_at");
  }
  const date = new Date(value);
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);
  if (!Number.isFinite(date.valueOf()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute || date.getSeconds() !== second) {
    throw new ShareCommandError("Enter a real local date and time.", "occurred_at");
  }
  return date.toISOString();
}

function parseQuantity(amountText: string, unitText: string, basis: "MEASURED" | "USER_ESTIMATED" | "UNKNOWN", item: KitchenObservation): { amount: number | null; unit: string | null; basis: ShareOfferCommand["measurement_basis"] } {
  if (basis !== "MEASURED" && basis !== "USER_ESTIMATED" && basis !== "UNKNOWN") throw new ShareCommandError("Choose a supported measurement basis.", "measurement_basis");
  if (typeof amountText !== "string" || typeof unitText !== "string") throw new ShareCommandError("Enter quantity values as text.", "amount");
  const amountValue = amountText.trim();
  const unit = unitText.trim();
  if (!amountValue && !unit) {
    if (basis !== "UNKNOWN") throw new ShareCommandError("Choose unknown when no amount is entered.", "measurement_basis");
    return { amount: null, unit: null, basis: "UNKNOWN" };
  }
  if (!amountValue || !unit) throw new ShareCommandError("Enter both an amount and unit, or leave both blank.", "amount");
  const amount = Number(amountValue);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new ShareCommandError("Amount must be greater than 0 and no more than 1,000,000.", "amount");
  if (!unitPattern.test(unit)) throw new ShareCommandError("Unit must start with a letter and use at most 32 letters, numbers, underscores, or hyphens.", "unit");
  if (basis === "UNKNOWN") throw new ShareCommandError("Choose measured or user-estimated for a known quantity.", "measurement_basis");
  if (item.amount !== null && item.unit !== unit) throw new ShareCommandError(`Use the confirmed stock unit (${item.unit}) for this item.`, "unit");
  if (item.amount !== null && amount > item.amount) throw new ShareCommandError("The reported amount cannot exceed the currently confirmed stock.", "amount");
  return { amount, unit, basis };
}

function validateIdentity(item: KitchenObservation, idempotencyKey: string): void {
  if (typeof item.item_id !== "string" || !idPattern.test(item.item_id) || !Number.isSafeInteger(item.version) || item.version < 1) throw new ShareCommandError("Reload a valid current kitchen record before preparing this change.");
  if (typeof idempotencyKey !== "string" || !idempotencyPattern.test(idempotencyKey)) throw new ShareCommandError("The command retry key is invalid.");
}

export function buildShareOfferCommand(input: {
  item: KitchenObservation;
  recipientLabel: string;
  amount: string;
  unit: string;
  measurementBasis: "MEASURED" | "USER_ESTIMATED" | "UNKNOWN";
  note: string;
  occurredAtLocal: string;
  confirmedUnserved: boolean;
  idempotencyKey: string;
  shareId: string;
}): ShareOfferCommand {
  validateIdentity(input.item, input.idempotencyKey);
  if (typeof input.shareId !== "string" || !idPattern.test(input.shareId)) throw new ShareCommandError("The sharing record ID is invalid.");
  if (typeof input.recipientLabel !== "string" || typeof input.note !== "string") throw new ShareCommandError("Enter text values for the recipient label and private note.");
  const recipientLabel = input.recipientLabel.trim();
  if (!recipientLabel || recipientLabel.length > 120) throw new ShareCommandError("Enter an intended recipient label of 1–120 characters.", "recipient_label");
  const note = input.note.trim();
  if (note.length > 500) throw new ShareCommandError("The private note must be 500 characters or fewer.", "note");
  if (!input.confirmedUnserved) throw new ShareCommandError("Confirm that this item is currently unserved and not plated, spoiled, or expired.", "condition");
  const quantity = parseQuantity(input.amount, input.unit, input.measurementBasis, input.item);
  return {
    schema_version: 1,
    idempotency_key: input.idempotencyKey,
    share_id: input.shareId,
    item_id: input.item.item_id,
    base_item_version: input.item.version,
    recipient_label: recipientLabel,
    amount: quantity.amount,
    unit: quantity.unit,
    measurement_basis: quantity.basis,
    condition: "UNSERVED_USER_REPORTED",
    freshness: "UNKNOWN",
    note: note || null,
    occurred_at: eventTime(input.occurredAtLocal),
  };
}

export function buildShareTransitionCommand(input: {
  share: PrivateShareLog;
  target: ShareTransitionTarget;
  occurredAtLocal: string;
  idempotencyKey: string;
  item?: KitchenObservation;
  amount?: string;
  unit?: string;
  measurementBasis?: "MEASURED" | "USER_ESTIMATED" | "UNKNOWN";
  confirmedUnserved?: boolean;
}): ShareTransitionCommand {
  if (typeof input.target !== "string" || !["ACCEPTED", "HANDED_OVER", "CANCELLED", "EXPIRED"].includes(input.target) || typeof input.share.id !== "string" || !idPattern.test(input.share.id) || !Number.isSafeInteger(input.share.version) || input.share.version < 1 || typeof input.idempotencyKey !== "string" || !idempotencyPattern.test(input.idempotencyKey)) {
    throw new ShareCommandError("Reload a valid current share record before preparing this change.");
  }
  const occurredAt = eventTime(input.occurredAtLocal);
  if (input.target !== "HANDED_OVER") {
    if (input.target === "ACCEPTED" && input.share.state !== "OFFERED") throw new ShareCommandError("Only an offered record can be marked accepted.");
    if ((input.target === "CANCELLED" || input.target === "EXPIRED") && !["OFFERED", "ACCEPTED"].includes(input.share.state)) throw new ShareCommandError("This share record can no longer be cancelled or expired.");
    return {
      schema_version: 1,
      idempotency_key: input.idempotencyKey,
      base_version: input.share.version,
      state: input.target,
      occurred_at: occurredAt,
      condition: null,
      expected_item_version: null,
      amount: null,
      unit: null,
      measurement_basis: "UNKNOWN",
    };
  }
  if (input.share.state !== "ACCEPTED") throw new ShareCommandError("Only an owner-reported accepted record can be prepared for handover.");
  if (!input.item || input.item.item_id !== input.share.item_id) throw new ShareCommandError("Reload the linked kitchen item before preparing an actual handover.");
  if (!input.confirmedUnserved) throw new ShareCommandError("Confirm that the item is still owner-reported unserved and not plated, spoiled, or expired.", "condition");
  const quantity = parseQuantity(input.amount ?? "", input.unit ?? "", input.measurementBasis ?? "UNKNOWN", input.item);
  return {
    schema_version: 1,
    idempotency_key: input.idempotencyKey,
    base_version: input.share.version,
    state: "HANDED_OVER",
    occurred_at: occurredAt,
    condition: "UNSERVED_USER_REPORTED",
    expected_item_version: input.item.version,
    amount: quantity.amount,
    unit: quantity.unit,
    measurement_basis: quantity.basis,
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}
function responseId(value: unknown): value is string {
  return typeof value === "string" && idPattern.test(value);
}
function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function resultEnvelope(value: unknown): { requestId: string; result: Record<string, unknown> } {
  if (!object(value) || !exactKeys(value, ["schema_version", "request_id", "result"]) || value.schema_version !== 1 || typeof value.request_id !== "string" || !value.request_id.trim() || value.request_id.length > 128 || !object(value.result)) {
    throw new ShareCommandError("The API response did not match the supported sharing format. Its write status is unknown; reload records before another change.");
  }
  return { requestId: value.request_id, result: value.result };
}

export function parseShareOfferResult(value: unknown, command: ShareOfferCommand): { requestId: string; state: "OFFERED"; version: 1 } {
  const envelope = resultEnvelope(value);
  const result = envelope.result;
  if (!exactKeys(result, ["share_id", "state", "version"]) || result.share_id !== command.share_id || result.state !== "OFFERED" || result.version !== 1) {
    throw new ShareCommandError("The API response did not confirm this offer. Its write status is unknown; reload records before another change.");
  }
  return { requestId: envelope.requestId, state: "OFFERED", version: 1 };
}

export function parseShareTransitionResult(value: unknown, command: ShareTransitionCommand, shareId: string): { requestId: string; state: ShareTransitionTarget; version: number } {
  const envelope = resultEnvelope(value);
  const result = envelope.result;
  const expectedKeys = command.state === "HANDED_OVER" ? ["share_id", "state", "version", "outcome_id", "item_version"] : ["share_id", "state", "version"];
  if (!exactKeys(result, expectedKeys) || result.share_id !== shareId || result.state !== command.state || !positiveInteger(result.version) || result.version !== command.base_version + 1) {
    throw new ShareCommandError("The API response did not confirm this update. Its write status is unknown; reload records before another change.");
  }
  if (command.state === "HANDED_OVER" && (!responseId(result.outcome_id) || result.item_version !== (command.expected_item_version ?? 0) + 1)) {
    throw new ShareCommandError("The API response did not confirm the handover result. Its write status is unknown; reload records before another change.");
  }
  return { requestId: envelope.requestId, state: command.state, version: result.version };
}
