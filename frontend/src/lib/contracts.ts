export type Unit = "g" | "kg" | "ml" | "l" | "pieces" | "portions";
export type DateType = "USE_BY" | "EXPIRY" | "BEST_BEFORE" | "USER_TARGET" | "UNKNOWN";
export type Storage = "fridge" | "freezer" | "pantry";
export type FoodCategory = "vegetables" | "fruit" | "dairy" | "pantry" | "prepared";

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
