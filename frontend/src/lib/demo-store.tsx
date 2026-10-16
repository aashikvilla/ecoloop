"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { DemoState, FoodDraft, FoodItem, OutcomeType, Unit, PreparationStage } from "./contracts";

const STORAGE_KEY = "ecoloop-isolated-demo-v1";
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function initialState(): DemoState {
  const observedAt = now();
  return {
    schemaVersion: 1,
    items: [
      { id: "tomatoes", name: "Tomatoes", category: "vegetables", amount: 6, unit: "pieces", storage: "fridge", dateValue: null, dateType: "UNKNOWN", observedAt, version: 1 },
      { id: "spinach", name: "Spinach", category: "vegetables", amount: 200, unit: "g", storage: "fridge", dateValue: null, dateType: "UNKNOWN", observedAt, version: 1 },
      { id: "milk", name: "Milk", category: "dairy", amount: 500, unit: "ml", storage: "fridge", dateValue: null, dateType: "UNKNOWN", observedAt, version: 1 },
      { id: "rice", name: "Rice", category: "pantry", amount: 1, unit: "kg", storage: "pantry", dateValue: null, dateType: "UNKNOWN", observedAt, version: 1 },
    ],
    shopping: [{ id: "oats", name: "Rolled oats", amount: 500, unit: "g", checked: false }],
    activities: [], preferences: [], mealPlan: { servings: 4, stage: "not_started" },
  };
}

function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoState>;
  return candidate.schemaVersion === 1 && Array.isArray(candidate.items) &&
    candidate.items.every((item) => typeof item?.id === "string" && typeof item?.name === "string" &&
      Number.isInteger(item.version) && item.version > 0 &&
      (item.amount === null || (Number.isFinite(item.amount) && item.amount >= 0))) &&
    Array.isArray(candidate.shopping) && Array.isArray(candidate.activities) &&
    Array.isArray(candidate.preferences) && !!candidate.mealPlan &&
    Number.isInteger(candidate.mealPlan.servings) && candidate.mealPlan.servings > 0;
}

interface DemoContextValue extends DemoState {
  hydrated: boolean;
  persistenceError: string | null;
  addItems: (drafts: FoodDraft[]) => void;
  updateItem: (itemId: string, patch: Partial<FoodDraft>) => void;
  recordOutcome: (itemId: string, type: OutcomeType, amount: number | null, unit: Unit | null, note?: string) => void;
  addShopping: (name: string, amount?: number | null, unit?: Unit | null) => void;
  toggleShopping: (itemId: string) => void;
  removeShopping: (itemId: string) => void;
  savePreference: (text: string) => void;
  deletePreference: (preferenceId: string) => void;
  setMealPlan: (servings: number, stage: PreparationStage) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isDemoState(parsed)) setState(parsed);
        else setPersistenceError("The saved demo could not be loaded. A fresh sample is shown.");
      }
    } catch { setPersistenceError("Browser storage is unavailable. Changes last for this visit only."); }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { setPersistenceError("Changes could not be saved to this browser. Keep this tab open."); }
  }, [state, hydrated]);

  function addItems(drafts: FoodDraft[]) {
    if (!drafts.length || drafts.some((draft) => !draft.name.trim() ||
      (draft.amount !== null && (!Number.isFinite(draft.amount) || draft.amount <= 0)) ||
      (draft.amount !== null && !draft.unit))) throw new Error("Enter a food name and a valid amount with its unit, or leave the amount unknown.");
    const occurredAt = now();
    const items: FoodItem[] = drafts.map((draft) => ({ ...draft, name: draft.name.trim(), id: id(), observedAt: occurredAt, version: 1 }));
    setState((previous) => ({ ...previous, items: [...previous.items, ...items], activities: [
      ...items.map((item) => ({ id: id(), type: "confirmed" as const, itemName: item.name, amount: item.amount, unit: item.unit, measurementBasis: "user_estimated" as const, occurredAt, note: "Manually confirmed in the isolated demo." })), ...previous.activities,
    ] }));
  }

  function updateItem(itemId: string, patch: Partial<FoodDraft>) {
    if (patch.amount !== undefined && patch.amount !== null && (!Number.isFinite(patch.amount) || patch.amount < 0)) throw new Error("Use a valid nonnegative amount.");
    if (patch.name !== undefined && !patch.name.trim()) throw new Error("Enter a food name.");
    setState((previous) => ({ ...previous, items: previous.items.map((item) => item.id === itemId ? { ...item, ...patch, version: item.version + 1, observedAt: now() } : item) }));
  }

  function recordOutcome(itemId: string, type: OutcomeType, amount: number | null, unit: Unit | null, note = "") {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) throw new Error("This item is no longer in the kitchen.");
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || !unit)) throw new Error("Enter a positive amount and its unit, or leave it unknown.");
    if (type !== "stored" && amount !== null && item.amount !== null &&
      (item.unit !== unit || amount > item.amount)) throw new Error("Use the recorded unit and an amount no larger than the recorded stock.");
    const event = { id: id(), type, itemName: item.name, amount, unit, measurementBasis: amount === null ? "unknown" as const : "user_estimated" as const, occurredAt: now(), note };
    setState((previous) => ({ ...previous, activities: [event, ...previous.activities], items: previous.items.map((entry) => {
      if (entry.id !== itemId) return entry;
      const remaining = type !== "stored" && amount !== null && entry.amount !== null && entry.unit === unit ? entry.amount - amount : entry.amount;
      return { ...entry, amount: remaining, version: entry.version + 1, observedAt: event.occurredAt };
    }) }));
  }

  const value: DemoContextValue = {
    ...state, hydrated, persistenceError, addItems, updateItem, recordOutcome,
    addShopping(name, amount = null, unit = null) {
      if (!name.trim() || name.length > 120 || (amount !== null && (!Number.isFinite(amount) || amount <= 0 || !unit))) throw new Error("Enter a name and a valid amount with unit, or leave the amount unknown.");
      setState((previous) => ({ ...previous, shopping: [...previous.shopping, { id: id(), name: name.trim(), amount, unit, checked: false }] }));
    },
    toggleShopping(itemId) { setState((previous) => ({ ...previous, shopping: previous.shopping.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item) })); },
    removeShopping(itemId) { setState((previous) => ({ ...previous, shopping: previous.shopping.filter((item) => item.id !== itemId) })); },
    savePreference(text) {
      if (!text.trim() || text.length > 280) throw new Error("Keep the preference between 1 and 280 characters.");
      setState((previous) => ({ ...previous, preferences: [...previous.preferences, { id: id(), text: text.trim() }] }));
    },
    deletePreference(preferenceId) { setState((previous) => ({ ...previous, preferences: previous.preferences.filter((preference) => preference.id !== preferenceId) })); },
    setMealPlan(servings, stage) {
      if (!Number.isInteger(servings) || servings < 1 || servings > 20) throw new Error("Choose between 1 and 20 people.");
      setState((previous) => ({ ...previous, mealPlan: { servings, stage }, activities: [{ id: id(), type: "planned", itemName: "Dinner plan", amount: servings, unit: "portions", measurementBasis: "user_estimated", occurredAt: now(), note: `Plan updated for ${servings} people. Food has not been marked used.` }, ...previous.activities] }));
    },
    resetDemo() { setState(initialState()); setPersistenceError(null); },
  };
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be rendered inside DemoProvider.");
  return context;
}
