export type HistoryShareState = "OFFERED" | "ACCEPTED" | "HANDED_OVER" | "CANCELLED" | "EXPIRED";
export type HistoryCondition = "UNSERVED_USER_REPORTED" | "EXPIRED" | "SPOILED" | "PLATED" | "UNKNOWN";
export type HistoryMeasurementBasis = "MEASURED" | "USER_ESTIMATED" | "UNKNOWN";
export type HistoryOutcomeType = "USED" | "STORED" | "DISCARDED" | "HANDED_OVER" | "COMPOSTED";

export type ShareHistoryEvent = {
  state: HistoryShareState;
  occurred_at: string;
  actor_uid: string;
  owner_reported: true;
};

export type PrivateShareLog = {
  id: string;
  share_id: string;
  household_id: string;
  owner_uid: string;
  item_id: string;
  recipient_label: string;
  amount: number | null;
  unit: string | null;
  measurement_basis: HistoryMeasurementBasis;
  condition: HistoryCondition;
  freshness: "UNKNOWN";
  note: string | null;
  occurred_at: string;
  state: HistoryShareState;
  version: number;
  base_item_version: number;
  history: ShareHistoryEvent[];
  created_at: string;
  updated_at: string;
  owner_reported: true;
  eligibility_time_zone: string | null;
  eligibility_checked_at: string;
};

export type PrivateActivityEvent = {
  event_id: string;
  item_id: string;
  type: HistoryOutcomeType;
  occurred_at: string;
  recorded_at: string;
  amount: number | null;
  unit: string | null;
  measurement_basis: HistoryMeasurementBasis;
  source: "OWNER_SHARE_LOG" | "OWNER_RECORDED_OUTCOME";
};

export type HistoryPage<T> = { records: T[]; nextCursor: string | null };

export class HistoryValidationError extends Error {
  constructor() {
    super("The household API returned data that does not match the supported history format.");
    this.name = "HistoryValidationError";
  }
}

const shareStates = new Set<string>(["OFFERED", "ACCEPTED", "HANDED_OVER", "CANCELLED", "EXPIRED"]);
const conditions = new Set<string>(["UNSERVED_USER_REPORTED", "EXPIRED", "SPOILED", "PLATED", "UNKNOWN"]);
const outcomeTypes = new Set<string>(["USED", "STORED", "DISCARDED", "HANDED_OVER", "COMPOSTED"]);
const sources = new Set<string>(["OWNER_SHARE_LOG", "OWNER_RECORDED_OUTCOME"]);
const idPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const householdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const unitPattern = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const cursorPattern = /^[A-Za-z0-9_-]{1,256}$/;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}
function text(value: unknown, max: number, min = 0): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}
function timestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match;
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const zone = match[8];
  const zoneHour = zone === "Z" ? 0 : Number(zone.slice(1, 3));
  const zoneMinute = zone === "Z" ? 0 : Number(zone.slice(4, 6));
  return utcDate.getUTCFullYear() === Number(year) && utcDate.getUTCMonth() === Number(month) - 1 && utcDate.getUTCDate() === Number(day) && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59 && (!match[7] || match[7].length <= 9) && zoneHour <= 23 && zoneMinute <= 59;
}
function timestampParts(value: string): { seconds: number; nanoseconds: number } {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/)!;
  const [, year, month, day, hour, minute, second, fraction, zone] = match;
  const localSeconds = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) / 1000;
  const offsetSeconds = zone === "Z" ? 0 : (zone[0] === "+" ? 1 : -1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6))) * 60;
  return { seconds: localSeconds - offsetSeconds, nanoseconds: Number((fraction ?? "").padEnd(9, "0")) };
}
function compareTimestamps(left: string, right: string): number {
  const leftParts = timestampParts(left);
  const rightParts = timestampParts(right);
  return leftParts.seconds - rightParts.seconds || leftParts.nanoseconds - rightParts.nanoseconds;
}
function quantity(amount: unknown, unit: unknown, basis: unknown): amount is number | null {
  if (amount === null) return unit === null && basis === "UNKNOWN";
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0 && amount <= 1_000_000 && typeof unit === "string" && unitPattern.test(unit) && (basis === "MEASURED" || basis === "USER_ESTIMATED");
}
function validState(value: unknown): value is HistoryShareState {
  return typeof value === "string" && shareStates.has(value);
}
function validCursor(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && cursorPattern.test(value));
}

const shareFields = [
  "schema_version", "share_id", "item_id", "recipient_label", "amount", "unit", "measurement_basis", "freshness", "note", "occurred_at",
  "household_id", "owner_uid", "base_item_version", "condition", "state", "version", "history", "created_at", "updated_at", "owner_reported",
  "eligibility_time_zone", "eligibility_checked_at", "id",
] as const;
const historyFields = ["state", "occurred_at", "actor_uid", "owner_reported"] as const;
const activityFields = ["event_id", "item_id", "type", "occurred_at", "recorded_at", "amount", "unit", "measurement_basis", "source"] as const;

function validHistoryEvent(value: unknown, ownerUid: string): value is ShareHistoryEvent {
  return object(value) && exactKeys(value, historyFields) && validState(value.state) && timestamp(value.occurred_at) && value.actor_uid === ownerUid && value.owner_reported === true;
}

function validShare(value: unknown, householdId: string, ownerUid: string): value is PrivateShareLog {
  if (!object(value) || !exactKeys(value, shareFields)) return false;
  if (value.schema_version !== 1 || typeof value.id !== "string" || !idPattern.test(value.id) || value.share_id !== value.id ||
    typeof value.item_id !== "string" || !idPattern.test(value.item_id) || value.household_id !== householdId || value.owner_uid !== ownerUid || !text(value.owner_uid, 128, 1) ||
    !text(value.recipient_label, 120, 1) || !quantity(value.amount, value.unit, value.measurement_basis) || value.freshness !== "UNKNOWN" ||
    !(value.note === null || text(value.note, 500)) || !timestamp(value.occurred_at) || !validState(value.state) ||
    !Number.isSafeInteger(value.version) || (value.version as number) < 1 || !Number.isSafeInteger(value.base_item_version) || (value.base_item_version as number) < 1 ||
    !Array.isArray(value.history) || value.history.length < 1 || value.history.length > 3 || !value.history.every((event) => validHistoryEvent(event, ownerUid)) ||
    !timestamp(value.created_at) || !timestamp(value.updated_at) || value.owner_reported !== true ||
    !(value.eligibility_time_zone === null || text(value.eligibility_time_zone, 128, 1)) || !timestamp(value.eligibility_checked_at) ||
    typeof value.condition !== "string" || !conditions.has(value.condition)) return false;

  const history = value.history as ShareHistoryEvent[];
  if (history.length !== value.version || history[0].state !== "OFFERED" || history.at(-1)?.state !== value.state || compareTimestamps(value.occurred_at, history[0].occurred_at) !== 0) return false;
  for (let index = 1; index < history.length; index += 1) {
    if (compareTimestamps(history[index].occurred_at, history[index - 1].occurred_at) <= 0) return false;
    const previous = history[index - 1].state;
    const next = history[index].state;
    const allowed = previous === "OFFERED"
      ? next === "ACCEPTED" || next === "CANCELLED" || next === "EXPIRED"
      : previous === "ACCEPTED"
        ? next === "HANDED_OVER" || next === "CANCELLED" || next === "EXPIRED"
        : false;
    if (!allowed) return false;
  }
  return true;
}

function validActivity(value: unknown): value is PrivateActivityEvent {
  return object(value) && exactKeys(value, activityFields) && typeof value.event_id === "string" && idPattern.test(value.event_id) &&
    typeof value.item_id === "string" && idPattern.test(value.item_id) && typeof value.type === "string" && outcomeTypes.has(value.type) &&
    timestamp(value.occurred_at) && timestamp(value.recorded_at) && quantity(value.amount, value.unit, value.measurement_basis) &&
    typeof value.source === "string" && sources.has(value.source);
}

function validateEnvelope(value: unknown, key: "share_logs" | "events", householdId: string, ownerUid: string): { list: unknown[]; nextCursor: string | null } {
  if (!object(value) || !exactKeys(value, ["schema_version", "request_id", "result"]) || value.schema_version !== 1 || !text(value.request_id, 128, 1) || !object(value.result)) throw new HistoryValidationError();
  if (!exactKeys(value.result, [key, "next_cursor"])) throw new HistoryValidationError();
  const list = value.result[key];
  const nextCursor = value.result.next_cursor;
  if (!Array.isArray(list) || list.length > 100 || !validCursor(nextCursor) || (nextCursor !== null && nextCursor.length > 256)) throw new HistoryValidationError();
  if (key === "share_logs" && !list.every((record) => validShare(record, householdId, ownerUid))) throw new HistoryValidationError();
  if (key === "events" && !list.every(validActivity)) throw new HistoryValidationError();
  const ids = list.map((record) => key === "share_logs" && object(record) ? record.id : object(record) ? record.event_id : undefined);
  if (ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length) throw new HistoryValidationError();
  return { list, nextCursor };
}

export function parseShareHistoryPage(value: unknown, householdId: string, ownerUid: string): HistoryPage<PrivateShareLog> {
  if (!householdPattern.test(householdId) || !text(ownerUid, 128, 1)) throw new HistoryValidationError();
  const page = validateEnvelope(value, "share_logs", householdId, ownerUid);
  return { records: page.list as PrivateShareLog[], nextCursor: page.nextCursor };
}

export function parseActivityPage(value: unknown, householdId: string, ownerUid: string): HistoryPage<PrivateActivityEvent> {
  if (!householdPattern.test(householdId) || !text(ownerUid, 128, 1)) throw new HistoryValidationError();
  const page = validateEnvelope(value, "events", householdId, ownerUid);
  return { records: page.list as PrivateActivityEvent[], nextCursor: page.nextCursor };
}
