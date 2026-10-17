export type CanonicalOutcomeType = "USED" | "STORED" | "DISCARDED" | "COMPOSTED";
export type MeasurementBasis = "MEASURED" | "USER_ESTIMATED" | "UNKNOWN";

export type OutcomeDraft = {
  outcomeId: string;
  itemId: string;
  baseVersion: number;
  outcomeType: CanonicalOutcomeType;
  amount: string;
  unit: string;
  measurementBasis: MeasurementBasis;
  storage: string;
  occurredAtLocal: string;
};

export type RecordOutcomeCommand = {
  schema_version: 1;
  idempotency_key: string;
  outcome_id: string;
  item_id: string;
  plan_id: string | null;
  base_version: number;
  outcome_type: CanonicalOutcomeType;
  amount: number | null;
  unit: string | null;
  measurement_basis: MeasurementBasis;
  storage: string | null;
  occurred_at: string;
};

export class OutcomeValidationError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "OutcomeValidationError";
  }
}

const idPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{8,128}$/;
const unitPattern = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const outcomeTypes = new Set<CanonicalOutcomeType>(["USED", "STORED", "DISCARDED", "COMPOSTED"]);
const bases = new Set<MeasurementBasis>(["MEASURED", "USER_ESTIMATED", "UNKNOWN"]);

export function createOutcomeId(): string {
  return `outcome-${crypto.randomUUID()}`;
}

export function createOutcomeIdempotencyKey(): string {
  return crypto.randomUUID();
}

function localDateTimeToIso(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new OutcomeValidationError("Enter the actual date and time of the outcome.", "occurredAtLocal");
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new OutcomeValidationError("Enter a valid local date and time.", "occurredAtLocal");
  }
  const local = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (local.getFullYear() !== year || local.getMonth() !== month - 1 || local.getDate() !== day || local.getHours() !== hour || local.getMinutes() !== minute) {
    throw new OutcomeValidationError("This local time does not exist because of a clock change. Choose another time.", "occurredAtLocal");
  }
  return local.toISOString();
}

export function buildRecordOutcomeCommand(
  draft: OutcomeDraft,
  idempotencyKey: string,
  latestObservation: { amount: number | null; unit: string | null; observed_at: string },
  planId?: string,
  nowMs = Date.now(),
): RecordOutcomeCommand {
  const outcomeId = draft.outcomeId.trim();
  const itemId = draft.itemId.trim();
  if (!idPattern.test(outcomeId) || !idPattern.test(itemId)) throw new OutcomeValidationError("The selected record or outcome ID is invalid.");
  if (!Number.isSafeInteger(draft.baseVersion) || draft.baseVersion < 1) throw new OutcomeValidationError("Reload this kitchen record before recording an outcome.");
  if (!idempotencyPattern.test(idempotencyKey)) throw new OutcomeValidationError("The command key is invalid.");
  if (planId !== undefined && !idPattern.test(planId)) throw new OutcomeValidationError("The saved plan reference is invalid.");
  if (!outcomeTypes.has(draft.outcomeType)) throw new OutcomeValidationError("Choose a supported outcome type.", "outcomeType");
  if (!bases.has(draft.measurementBasis)) throw new OutcomeValidationError("Choose how the amount was measured.", "measurementBasis");

  const amountText = draft.amount.trim();
  const unitText = draft.unit.trim();
  if ((amountText === "") !== (unitText === "")) throw new OutcomeValidationError("Enter both the amount and unit, or mark the amount unknown.", "amount");
  let amount: number | null = null;
  let unit: string | null = null;
  if (amountText) {
    amount = Number(amountText);
    unit = unitText;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new OutcomeValidationError("Amount must be greater than 0 and no more than 1,000,000.", "amount");
    if (!unitPattern.test(unitText)) throw new OutcomeValidationError("Unit must start with a letter and contain at most 32 letters, numbers, underscores, or hyphens.", "unit");
    if (draft.measurementBasis === "UNKNOWN") throw new OutcomeValidationError("Choose measured or user estimated when an amount is entered.", "measurementBasis");
  } else if (draft.measurementBasis !== "UNKNOWN") {
    throw new OutcomeValidationError("Set the amount basis to Unknown when no amount is entered.", "measurementBasis");
  }

  const storageInput = draft.storage.trim();
  if (draft.outcomeType === "STORED") {
    if (!storageInput || storageInput.length > 120) throw new OutcomeValidationError("Enter where the item was stored (1–120 characters).", "storage");
  } else if (storageInput) {
    throw new OutcomeValidationError("A storage location is only recorded for a Stored outcome.", "storage");
  }

  const occurredAt = localDateTimeToIso(draft.occurredAtLocal);
  const occurredAtMs = Date.parse(occurredAt);
  const observedAtMs = Date.parse(latestObservation.observed_at);
  if (!Number.isFinite(observedAtMs)) throw new OutcomeValidationError("The kitchen observation time is invalid. Reload the record.");
  if (occurredAtMs <= observedAtMs) throw new OutcomeValidationError("Outcome time must follow the latest confirmed kitchen observation. Reload and reconcile this item.", "occurredAtLocal");
  if (occurredAtMs > nowMs + 5 * 60_000) throw new OutcomeValidationError("Outcome time cannot be more than five minutes in the future.", "occurredAtLocal");
  if (amount !== null && draft.outcomeType !== "STORED" && latestObservation.amount !== null) {
    if (latestObservation.unit !== unit) throw new OutcomeValidationError("Outcome unit must match the confirmed kitchen unit. Reconcile the item before continuing.", "unit");
    if (amount > latestObservation.amount) throw new OutcomeValidationError("Outcome amount exceeds the confirmed kitchen quantity. Reconcile the item before continuing.", "amount");
  }

  return {
    schema_version: 1,
    idempotency_key: idempotencyKey,
    outcome_id: outcomeId,
    item_id: itemId,
    plan_id: planId ?? null,
    base_version: draft.baseVersion,
    outcome_type: draft.outcomeType,
    amount,
    unit,
    measurement_basis: draft.measurementBasis,
    storage: draft.outcomeType === "STORED" ? storageInput : null,
    occurred_at: occurredAt,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function positiveVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function parseRecordOutcomeResult(value: unknown, command: RecordOutcomeCommand): { requestId: string; outcomeId: string; itemId: string; itemVersion: number } {
  if (!isObject(value) || value.schema_version !== 1 || !boundedText(value.request_id, 128) || !isObject(value.result)) {
    throw new OutcomeValidationError("The outcome response was not in the supported format. Its status is unknown; keep this command key and retry it or reload records.");
  }
  const result = value.result;
  const expectedVersion = command.base_version + 1;
  if (result.outcome_id !== command.outcome_id || result.item_id !== command.item_id || result.item_version !== expectedVersion || !positiveVersion(result.item_version)) {
    throw new OutcomeValidationError("The response did not match this outcome command. Its status is unknown; keep this command key and retry it or reload records.");
  }
  return { requestId: value.request_id, outcomeId: result.outcome_id as string, itemId: result.item_id as string, itemVersion: result.item_version };
}
