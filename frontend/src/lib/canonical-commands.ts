export type CanonicalDateType = "USE_BY" | "EXPIRY" | "BEST_BEFORE" | "USER_TARGET" | "UNKNOWN";

export type FoodDraft = {
  itemId: string;
  baseVersion: number;
  name: string;
  amount: string;
  unit: string;
  dateValue: string;
  dateType: CanonicalDateType;
  storage: string;
};

export type ShoppingDraft = {
  entryId: string;
  baseVersion: number;
  itemName: string;
  desiredAmount: string;
  unit: string;
};

export type FoodObservationCommand = {
  schema_version: 1;
  idempotency_key: string;
  observations: [{
    item_id: string;
    base_version: number;
    name: string;
    amount: number | null;
    unit: string | null;
    date_value: string | null;
    date_type: CanonicalDateType;
    date_source: "USER" | null;
    storage: string | null;
    source: "USER";
  }];
};

export type ShoppingCommand = {
  schema_version: 1;
  idempotency_key: string;
  entry: {
    entry_id: string;
    base_version: number;
    item_name: string;
    desired_amount: number | null;
    unit: string | null;
  };
};

export type ShoppingArchiveCommand = {
  schema_version: 1;
  idempotency_key: string;
  entry_id: string;
  base_version: number;
  archived: true;
};

export class CommandValidationError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "CommandValidationError";
  }
}

const opaqueIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const unitPattern = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{8,128}$/;
const dateTypes = new Set<CanonicalDateType>(["USE_BY", "EXPIRY", "BEST_BEFORE", "USER_TARGET", "UNKNOWN"]);

export function createOpaqueId(prefix: "food" | "shopping"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

function validateId(value: string, label: string): string {
  const normalized = value.trim();
  if (!opaqueIdPattern.test(normalized)) throw new CommandValidationError(`${label} must contain 1–128 letters, numbers, dots, underscores, colons, or hyphens.`, label);
  return normalized;
}

function validateVersion(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new CommandValidationError(`${label} must be a whole number of 0 or greater.`, label);
  return value;
}

function parseQuantity(amountText: string, unitText: string, amountLabel: string): { amount: number | null; unit: string | null } {
  const amountInput = amountText.trim();
  const unit = unitText.trim();
  if (!amountInput && !unit) return { amount: null, unit: null };
  if (!amountInput || !unit) throw new CommandValidationError("Enter both an amount and a unit, or leave both blank.", amountLabel);
  const amount = Number(amountInput);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new CommandValidationError("Amount must be greater than 0 and no more than 1,000,000.", amountLabel);
  if (!unitPattern.test(unit)) throw new CommandValidationError("Unit must start with a letter and contain at most 32 letters, numbers, underscores, or hyphens.", "unit");
  return { amount, unit };
}

function validDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function buildFoodObservationCommand(draft: FoodDraft, idempotencyKey: string): FoodObservationCommand {
  const itemId = validateId(draft.itemId, "Item ID");
  const baseVersion = validateVersion(draft.baseVersion, "Base version");
  const name = draft.name.trim();
  if (!name || name.length > 120) throw new CommandValidationError("Enter an item name of 1–120 characters.", "name");
  if (!idempotencyPattern.test(idempotencyKey)) throw new CommandValidationError("The command key is invalid.");
  const { amount, unit } = parseQuantity(draft.amount, draft.unit, "amount");
  const dateValueInput = draft.dateValue.trim();
  if (!dateTypes.has(draft.dateType)) throw new CommandValidationError("Choose a supported date type.", "dateType");
  if (dateValueInput && (!validDateOnly(dateValueInput) || draft.dateType === "UNKNOWN")) throw new CommandValidationError("Choose a real calendar date and a matching date type.", "dateValue");
  if (!dateValueInput && draft.dateType !== "UNKNOWN") throw new CommandValidationError("Choose a date or set the date type to Unknown.", "dateValue");
  const storage = draft.storage.trim();
  if (storage.length > 120) throw new CommandValidationError("Storage must be 120 characters or fewer.", "storage");

  return {
    schema_version: 1,
    idempotency_key: idempotencyKey,
    observations: [{
      item_id: itemId,
      base_version: baseVersion,
      name,
      amount,
      unit,
      date_value: dateValueInput || null,
      date_type: dateValueInput ? draft.dateType : "UNKNOWN",
      date_source: dateValueInput ? "USER" : null,
      storage: storage || null,
      source: "USER",
    }],
  };
}

export function buildShoppingCommand(draft: ShoppingDraft, idempotencyKey: string): ShoppingCommand {
  const entryId = validateId(draft.entryId, "Shopping entry ID");
  const baseVersion = validateVersion(draft.baseVersion, "Base version");
  const itemName = draft.itemName.trim();
  if (!itemName || itemName.length > 120) throw new CommandValidationError("Enter an item name of 1–120 characters.", "itemName");
  if (!idempotencyPattern.test(idempotencyKey)) throw new CommandValidationError("The command key is invalid.");
  const { amount, unit } = parseQuantity(draft.desiredAmount, draft.unit, "desiredAmount");
  return {
    schema_version: 1,
    idempotency_key: idempotencyKey,
    entry: { entry_id: entryId, base_version: baseVersion, item_name: itemName, desired_amount: amount, unit },
  };
}

export function buildShoppingArchiveCommand(entryId: string, baseVersion: number, idempotencyKey: string): ShoppingArchiveCommand {
  const cleanId = validateId(entryId, "Shopping entry ID");
  if (!Number.isSafeInteger(baseVersion) || baseVersion < 1) throw new CommandValidationError("Reload the current shopping entry before removing it.", "baseVersion");
  if (!idempotencyPattern.test(idempotencyKey)) throw new CommandValidationError("The command key is invalid.");
  return { schema_version: 1, idempotency_key: idempotencyKey, entry_id: cleanId, base_version: baseVersion, archived: true };
}

function asObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function positiveVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parseTimestamp(value: unknown): value is string {
  return nonEmptyText(value, 40) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
}

function parseApiResult(value: unknown, label: string): { requestId: string; result: Record<string, unknown> } {
  if (!asObject(value) || value.schema_version !== 1 || !nonEmptyText(value.request_id, 128) || !asObject(value.result)) {
    throw new CommandValidationError(`The API returned an unexpected ${label} response. The write status is unknown; reload records before trying another command.`);
  }
  return { requestId: value.request_id, result: value.result };
}

export function parseFoodConfirmationResult(value: unknown, command: FoodObservationCommand): { requestId: string; itemVersion: number; confirmedAt: string } {
  const envelope = parseApiResult(value, "confirmation");
  const observations = envelope.result.observations;
  const confirmedAt = envelope.result.confirmed_at;
  if (!Array.isArray(observations) || observations.length !== command.observations.length || !parseTimestamp(confirmedAt)) {
    throw new CommandValidationError("The API response did not confirm this observation. Reload records before trying another command.");
  }
  const saved = observations[0];
  const submitted = command.observations[0];
  if (!asObject(saved) || saved.item_id !== submitted.item_id || saved.version !== submitted.base_version + 1 || !positiveVersion(saved.version)) {
    throw new CommandValidationError("The API response did not match the submitted observation. Reload records before trying another command.");
  }
  return { requestId: envelope.requestId, itemVersion: saved.version, confirmedAt };
}

export function parseShoppingSaveResult(value: unknown, command: ShoppingCommand): { requestId: string; entryVersion: number } {
  const envelope = parseApiResult(value, "shopping save");
  const saved = envelope.result;
  if (saved.entry_id !== command.entry.entry_id || saved.version !== command.entry.base_version + 1 || !positiveVersion(saved.version)) {
    throw new CommandValidationError("The API response did not match the submitted shopping entry. Reload records before trying another command.");
  }
  return { requestId: envelope.requestId, entryVersion: saved.version };
}

export function parseShoppingArchiveResult(value: unknown, command: ShoppingArchiveCommand): { requestId: string; entryVersion: number } {
  const envelope = parseApiResult(value, "shopping archive");
  const saved = envelope.result;
  if (saved.entry_id !== command.entry_id || saved.version !== command.base_version + 1 || saved.archived !== true || !positiveVersion(saved.version)) {
    throw new CommandValidationError("The API response did not match this removal command. Its status is unknown; reload records before trying another command.");
  }
  return { requestId: envelope.requestId, entryVersion: saved.version };
}
