import { CanonicalApiError, canonicalRequest } from "./canonical-transport";

export type SavedMealPlanIngredient = {
  item_id: string | null;
  name: string;
  amount: number | null;
  unit: string | null;
  uncertain: boolean;
  quantity_basis: "MEASURED" | "ASSISTANT_ESTIMATE" | "UNKNOWN" | null;
  scaled_from_amount: number | null;
};

export type SavedMealPlan = {
  plan_id: string;
  title: string;
  servings: number;
  preparation_stage: "NOT_STARTED" | "PARTLY_PREPARED" | "ALREADY_COOKED" | "UNKNOWN";
  version: number;
  created_at: string;
  ingredients: SavedMealPlanIngredient[];
};

export type SavedMealPlanPage = { plans: SavedMealPlan[]; next_cursor: string | null };

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
}

function validAmount(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1_000_000);
}

function validIngredient(value: unknown): value is SavedMealPlanIngredient {
  if (!object(value) || !exactKeys(value, ["item_id", "name", "amount", "unit", "uncertain", "quantity_basis", "scaled_from_amount"])) return false;
  const itemId = value.item_id === null || (typeof value.item_id === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value.item_id));
  const unit = value.unit === null || (typeof value.unit === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(value.unit));
  const basis = value.quantity_basis === null || ["MEASURED", "ASSISTANT_ESTIMATE", "UNKNOWN"].includes(String(value.quantity_basis));
  const quantityPair = value.amount === null ? value.unit === null : typeof value.unit === "string";
  return itemId && typeof value.name === "string" && value.name.trim().length > 0 && value.name.length <= 120 && validAmount(value.amount) && unit && quantityPair && typeof value.uncertain === "boolean" && basis && validAmount(value.scaled_from_amount);
}

function validPlan(value: unknown): value is SavedMealPlan {
  if (!object(value) || !exactKeys(value, ["plan_id", "title", "servings", "preparation_stage", "version", "created_at", "ingredients"])) return false;
  return typeof value.plan_id === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value.plan_id)
    && typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 120
    && typeof value.servings === "number" && Number.isSafeInteger(value.servings) && value.servings >= 1 && value.servings <= 100
    && ["NOT_STARTED", "PARTLY_PREPARED", "ALREADY_COOKED", "UNKNOWN"].includes(String(value.preparation_stage))
    && typeof value.version === "number" && Number.isSafeInteger(value.version) && value.version >= 1
    && timestamp(value.created_at) && Array.isArray(value.ingredients) && value.ingredients.length <= 50 && value.ingredients.every(validIngredient);
}

function parsePage(value: unknown): SavedMealPlanPage {
  if (!object(value) || !exactKeys(value, ["schema_version", "request_id", "result"]) || value.schema_version !== 1 || typeof value.request_id !== "string" || value.request_id.length < 1 || value.request_id.length > 128 || !object(value.result) || !exactKeys(value.result, ["schema_version", "plans", "next_cursor"]) || value.result.schema_version !== 1) {
    throw new CanonicalApiError("invalid_response", "The household service returned an unexpected meal-plan response.");
  }
  const { plans, next_cursor: nextCursor } = value.result;
  const cursorValid = nextCursor === null || (typeof nextCursor === "string" && /^[A-Za-z0-9_-]{1,256}$/.test(nextCursor));
  if (!Array.isArray(plans) || plans.length > 100 || !plans.every(validPlan) || new Set(plans.map((plan) => (plan as SavedMealPlan).plan_id)).size !== plans.length || !cursorValid) {
    throw new CanonicalApiError("invalid_response", "Saved meal plans did not match the supported format.", value.request_id);
  }
  return { plans: plans as SavedMealPlan[], next_cursor: nextCursor as string | null };
}

export async function readSavedMealPlans(idToken: string, householdId: string, cursor?: string, signal?: AbortSignal): Promise<SavedMealPlanPage> {
  return parsePage(await canonicalRequest("meal-plans", idToken, householdId, { query: { limit: 25, ...(cursor ? { cursor } : {}) }, signal }));
}
