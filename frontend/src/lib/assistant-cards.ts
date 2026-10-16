export const proposalActions = ["APPROVE", "EDIT", "DISMISS", "ADD", "SKIP", "CONFIRM_STOCK", "USE", "STORE", "SHARE", "DISCARD", "COMPOST", "CONSENT"] as const;
export const dateTypes = ["USE_BY", "EXPIRY", "BEST_BEFORE", "USER_TARGET", "UNKNOWN"] as const;
export const stockStates = ["CONFIRMED", "STALE", "UNKNOWN", "NOT_FOUND"] as const;
export const shoppingActions = ["ADD", "SKIP", "EDIT", "CONFIRM_STOCK"] as const;
export const foodActions = ["USE", "STORE", "SHARE", "DISCARD", "COMPOST"] as const;

export type ProposalAction = (typeof proposalActions)[number];
type ProposalBase = {
  proposal_id: string; schema_version: 1; version: number; base_version: number;
  scope: "HOUSEHOLD"; status: "PENDING"; source_refs: string[];
  allowed_actions: ProposalAction[]; simulated: boolean; expires_at: string;
};
export type IngredientReference = { item_id: string | null; name: string; amount: number | null; unit: string | null; uncertain: boolean };
export type QuantityChange = { item_id: string | null; name: string; original_amount: number | null; proposed_amount: number | null; unit: string | null; reason: string };
export type MealSuggestion = ProposalBase & { type: "MealSuggestion"; title: string; servings: number; ingredients: IngredientReference[] };
export type PortionAdjustment = ProposalBase & { type: "PortionAdjustment"; original_servings: number; proposed_servings: number; changes: QuantityChange[] };
export type BuyCheck = ProposalBase & { type: "BuyCheck"; item_name: string; stock_state: (typeof stockStates)[number]; shopping_action: (typeof shoppingActions)[number] };
export type FoodAction = ProposalBase & { type: "FoodAction"; item_id: string; action: (typeof foodActions)[number]; amount: number | null; unit: string | null };
export type PreferenceConsent = ProposalBase & { type: "PreferenceConsent"; preference_key: string; proposed_text: string; requires_explicit_consent: true };
export type ProposalCard = MealSuggestion | PortionAdjustment | BuyCheck | FoodAction | PreferenceConsent;
export type AssistantEnvelope = { schema_version: 1; request_id: string; session_id: string | null; message: string; cards: ProposalCard[] };
export type ParseResult = { ok: true; envelope: AssistantEnvelope; rejectedCards: number } | { ok: false; reason: string };

const identifier = /^[A-Za-z0-9._:-]{1,128}$/;
const unitPattern = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const allowedActions = new Set<string>(proposalActions);
const dateValues = new Set<string>(dateTypes);
const stockValues = new Set<string>(stockStates);
const shoppingValues = new Set<string>(shoppingActions);
const foodValues = new Set<string>(foodActions);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}
function boundedText(value: unknown, max: number, min = 0): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}
function id(value: unknown): value is string { return typeof value === "string" && identifier.test(value); }
function finiteQuantity(value: unknown, allowZero = false): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= (allowZero ? 0 : Number.MIN_VALUE) && value <= 1_000_000;
}
function unit(value: unknown): value is string { return typeof value === "string" && unitPattern.test(value); }
function nullableQuantity(value: unknown, zero = false): value is number | null { return value === null || finiteQuantity(value, zero); }
function nullableUnit(value: unknown): value is string | null { return value === null || unit(value); }
function validDateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match;
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return calendarDate.getUTCFullYear() === Number(year) && calendarDate.getUTCMonth() === Number(month) - 1 && calendarDate.getUTCDate() === Number(day) && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59;
}
function arrayOf<T>(value: unknown, max: number, valid: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.length <= max && value.every(valid);
}
function validIngredient(value: unknown): value is IngredientReference {
  if (!isObject(value) || !hasOnlyKeys(value, ["item_id", "name", "amount", "unit", "uncertain"])) return false;
  const amountOk = nullableQuantity(value.amount);
  const unitOk = nullableUnit(value.unit);
  return (value.item_id === null || id(value.item_id)) && boundedText(value.name, 120, 1) && amountOk && unitOk && ((value.amount === null) === (value.unit === null)) && typeof value.uncertain === "boolean";
}
function validChange(value: unknown): value is QuantityChange {
  if (!isObject(value) || !hasOnlyKeys(value, ["item_id", "name", "original_amount", "proposed_amount", "unit", "reason"])) return false;
  const amountA = nullableQuantity(value.original_amount, true);
  const amountB = nullableQuantity(value.proposed_amount, true);
  return (value.item_id === null || id(value.item_id)) && boundedText(value.name, 120, 1) && amountA && amountB && nullableUnit(value.unit) && (value.unit !== null || (value.original_amount === null && value.proposed_amount === null)) && boundedText(value.reason, 300);
}

const baseKeys = ["proposal_id", "schema_version", "version", "base_version", "scope", "status", "source_refs", "allowed_actions", "simulated", "expires_at"] as const;
function validBase(value: Record<string, unknown>): boolean {
  return id(value.proposal_id) && value.schema_version === 1 && Number.isSafeInteger(value.version) && (value.version as number) >= 1 && Number.isSafeInteger(value.base_version) && (value.base_version as number) >= 0 && value.scope === "HOUSEHOLD" && value.status === "PENDING" && arrayOf(value.source_refs, 50, id) && arrayOf(value.allowed_actions, 10, (entry): entry is ProposalAction => typeof entry === "string" && allowedActions.has(entry)) && typeof value.simulated === "boolean" && validDateTime(value.expires_at);
}
function validCard(value: unknown): value is ProposalCard {
  if (!isObject(value) || !boundedText(value.type, 40, 1) || !validBase(value)) return false;
  switch (value.type) {
    case "MealSuggestion": return hasOnlyKeys(value, [...baseKeys, "type", "title", "servings", "ingredients"]) && boundedText(value.title, 120, 1) && Number.isSafeInteger(value.servings) && (value.servings as number) >= 1 && (value.servings as number) <= 100 && arrayOf(value.ingredients, 50, validIngredient);
    case "PortionAdjustment": return hasOnlyKeys(value, [...baseKeys, "type", "original_servings", "proposed_servings", "changes"]) && Number.isSafeInteger(value.original_servings) && (value.original_servings as number) >= 1 && (value.original_servings as number) <= 100 && Number.isSafeInteger(value.proposed_servings) && (value.proposed_servings as number) >= 1 && (value.proposed_servings as number) <= 100 && arrayOf(value.changes, 50, validChange);
    case "BuyCheck": return hasOnlyKeys(value, [...baseKeys, "type", "item_name", "stock_state", "shopping_action"]) && boundedText(value.item_name, 120, 1) && typeof value.stock_state === "string" && stockValues.has(value.stock_state) && typeof value.shopping_action === "string" && shoppingValues.has(value.shopping_action);
    case "FoodAction": return hasOnlyKeys(value, [...baseKeys, "type", "item_id", "action", "amount", "unit"]) && id(value.item_id) && typeof value.action === "string" && foodValues.has(value.action) && nullableQuantity(value.amount) && nullableUnit(value.unit) && ((value.amount === null) === (value.unit === null));
    case "PreferenceConsent": return hasOnlyKeys(value, [...baseKeys, "type", "preference_key", "proposed_text", "requires_explicit_consent"]) && boundedText(value.preference_key, 80, 1) && boundedText(value.proposed_text, 500, 1) && value.requires_explicit_consent === true;
    default: return false;
  }
}

/** Validate an untrusted assistant response against the fixed backend card contract. */
export function parseAssistantEnvelope(value: unknown): ParseResult {
  const keys = ["schema_version", "request_id", "session_id", "message", "cards"];
  if (!isObject(value) || !hasOnlyKeys(value, keys) || value.schema_version !== 1 || !boundedText(value.request_id, 128, 1) || !(value.session_id === null || id(value.session_id)) || !boundedText(value.message, 8_000) || !Array.isArray(value.cards) || value.cards.length > 20) {
    return { ok: false, reason: "The assistant response did not match the supported envelope." };
  }
  const seenProposalIds = new Set<string>();
  const cards = value.cards.filter((card): card is ProposalCard => {
    if (!validCard(card) || seenProposalIds.has(card.proposal_id)) return false;
    seenProposalIds.add(card.proposal_id);
    return true;
  });
  return { ok: true, envelope: { schema_version: 1, request_id: value.request_id, session_id: value.session_id, message: value.message, cards }, rejectedCards: value.cards.length - cards.length };
}

export function isExpired(card: ProposalBase, now = Date.now()) { return Date.parse(card.expires_at) <= now; }
export function isKnownDateType(value: unknown): value is (typeof dateTypes)[number] { return typeof value === "string" && dateValues.has(value); }
