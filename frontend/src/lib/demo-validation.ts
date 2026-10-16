import type { DemoState, FoodDraft, Unit } from "./contracts";

const units: readonly string[] = ["g", "kg", "ml", "l", "pieces", "portions"];
const dateTypes = ["USE_BY", "EXPIRY", "BEST_BEFORE", "USER_TARGET", "UNKNOWN"];
const categories = ["vegetables", "fruit", "dairy", "pantry", "prepared"];
const stages = ["not_started", "partly_prepared", "cooked", "unknown"];
const storages = ["fridge", "freezer", "pantry"];
const outcomes = ["used", "stored", "shared", "discarded", "confirmed", "planned"];
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const shortText = (value: unknown, max = 120): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const quantity = (amount: unknown, unit: unknown) => (amount === null || (typeof amount === "number" && Number.isFinite(amount) && amount >= 0 && typeof unit === "string" && units.includes(unit))) && (unit === null || (typeof unit === "string" && units.includes(unit)));
const list = (value: unknown, check: (entry: unknown) => boolean) => Array.isArray(value) && value.length <= 1000 && value.every(check);

export function validateAmount(amount: number | null, unit: Unit | null) {
  if (!quantity(amount, unit) || (amount !== null && amount <= 0)) throw new Error("Enter a positive amount and its unit, or leave the amount unknown.");
}

export function validateFoodDraft(draft: FoodDraft) {
  if (!shortText(draft.name) || !quantity(draft.amount, draft.unit) ||
    !categories.includes(draft.category) || !storages.includes(draft.storage) || !dateTypes.includes(draft.dateType)) throw new Error("Check the food name, category, storage and quantity.");
  if (draft.dateValue !== null) {
    const parsed = new Date(`${draft.dateValue}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dateValue) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== draft.dateValue || draft.dateType === "UNKNOWN") throw new Error("Enter a valid date and specify what the date means.");
  } else if (draft.dateType !== "UNKNOWN") throw new Error("Add the recorded date or set its type to unknown.");
  if (draft.note !== undefined && (typeof draft.note !== "string" || draft.note.length > 500)) throw new Error("Keep the note under 500 characters.");
}

export function isDemoState(value: unknown): value is DemoState {
  if (!object(value) || value.schemaVersion !== 1 || !object(value.mealPlan)) return false;
  return list(value.items, (item) => {
    if (!object(item) || !shortText(item.id) || !timestamp(item.observedAt) || !Number.isInteger(item.version) || Number(item.version) < 1) return false;
    try { validateFoodDraft(item as unknown as FoodDraft); return true; } catch { return false; }
  }) && list(value.shopping, (item) => object(item) && shortText(item.id) && shortText(item.name) && quantity(item.amount, item.unit) && typeof item.checked === "boolean") &&
    list(value.activities, (event) => object(event) && shortText(event.id) && shortText(event.itemName) && typeof event.type === "string" && outcomes.includes(event.type) && quantity(event.amount, event.unit) && timestamp(event.occurredAt) && typeof event.note === "string" && ["user_estimated", "measured", "unknown"].includes(String(event.measurementBasis))) &&
    list(value.preferences, (entry) => object(entry) && shortText(entry.id) && shortText(entry.text, 280)) &&
    list(value.shareLogs, (entry) => object(entry) && shortText(entry.id) && shortText(entry.itemId) && shortText(entry.itemName) && shortText(entry.recipientLabel, 100) && quantity(entry.amount, entry.unit) && ["offered", "accepted", "handed_over", "cancelled"].includes(String(entry.state)) && timestamp(entry.updatedAt) && entry.ownerReported === true && typeof entry.note === "string") &&
    Number.isInteger(value.mealPlan.servings) && Number(value.mealPlan.servings) > 0 && Number(value.mealPlan.servings) <= 20 && stages.includes(String(value.mealPlan.stage));
}
