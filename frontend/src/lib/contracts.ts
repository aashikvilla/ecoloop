export type Unit = "g" | "kg" | "ml" | "l" | "pieces" | "portions";
export type DateType = "USE_BY" | "EXPIRY" | "BEST_BEFORE" | "USER_TARGET" | "UNKNOWN";
export type Storage = "fridge" | "freezer" | "pantry";
export type FoodCategory = "vegetables" | "fruit" | "dairy" | "pantry" | "prepared";
export type OutcomeType = "used" | "stored" | "shared" | "discarded";
export type PreparationStage = "not_started" | "partly_prepared" | "cooked" | "unknown";

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  amount: number | null;
  unit: Unit | null;
  storage: Storage;
  dateValue: string | null;
  dateType: DateType;
  observedAt: string;
  version: number;
  note?: string;
}

export type FoodDraft = Omit<FoodItem, "id" | "observedAt" | "version">;

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number | null;
  unit: Unit | null;
  checked: boolean;
}

export interface ActivityEvent {
  id: string;
  type: OutcomeType | "confirmed" | "planned";
  itemName: string;
  amount: number | null;
  unit: Unit | null;
  measurementBasis: "user_estimated" | "unknown" | "measured";
  occurredAt: string;
  note: string;
}

export interface Preference { id: string; text: string }
export interface MealPlan { servings: number; stage: PreparationStage }

export interface DemoState {
  schemaVersion: 1;
  items: FoodItem[];
  shopping: ShoppingItem[];
  activities: ActivityEvent[];
  preferences: Preference[];
  mealPlan: MealPlan;
}
