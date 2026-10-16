"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { DemoState, FoodDraft, FoodItem, OutcomeType, Unit, PreparationStage, ShareLog, ShareState, Storage } from "./contracts";
import { isDemoState, validateFoodDraft, validateAmount } from "./demo-validation";

const STORAGE_KEY = "ecoloop-isolated-demo-v1";
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function validateShareDate(item: FoodItem) {
  if (item.dateValue && ["USE_BY", "EXPIRY"].includes(item.dateType) && item.dateValue < localToday()) throw new Error("Expired or past-use-by food cannot be offered for sharing.");
}

function initialState(): DemoState {
  const observedAt = "2026-10-16T09:00:00.000Z";
  return {
    schemaVersion: 1,
    items: [
      { id: "tomatoes", name: "Tomatoes", category: "vegetables", amount: 6, unit: "pieces", storage: "fridge", dateValue: null, dateType: "UNKNOWN", observedAt, version: 1 },
      { id: "spinach", name: "Spinach", category: "vegetables", amount: 200, unit: "g", storage: "fridge", dateValue: null, dateType: "UNKNOWN", observedAt, version: 1 },
      { id: "milk", name: "Milk", category: "dairy", amount: 500, unit: "ml", storage: "fridge", dateValue: null, dateType: "UNKNOWN", observedAt, version: 1 },
      { id: "rice", name: "Rice", category: "pantry", amount: 1, unit: "kg", storage: "pantry", dateValue: null, dateType: "UNKNOWN", observedAt, version: 1 },
    ],
    shopping: [{ id: "oats", name: "Rolled oats", amount: 500, unit: "g", checked: false }],
    activities: [], preferences: [], shareLogs: [], mealPlan: { servings: 4, stage: "not_started" },
  };
}

interface DemoContextValue extends DemoState {
  hydrated: boolean;
  persistenceError: string | null;
  addItems: (drafts: FoodDraft[]) => void;
  updateItem: (itemId: string, patch: Partial<FoodDraft>) => void;
  recordOutcome: (itemId: string, type: OutcomeType, amount: number | null, unit: Unit | null, note?: string, options?: { commandId?: string; storage?: Storage }) => void;
  addShopping: (name: string, amount?: number | null, unit?: Unit | null) => void;
  toggleShopping: (itemId: string) => void;
  removeShopping: (itemId: string) => void;
  savePreference: (text: string) => void;
  deletePreference: (preferenceId: string) => void;
  setMealPlan: (servings: number, stage: PreparationStage) => void;
  createShareLog: (itemId: string, recipientLabel: string, amount: number | null, unit: Unit | null, note: string) => string;
  updateShareLog: (logId: string, state: Exclude<ShareState, "offered">) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);
interface Snapshot { state: DemoState; persistenceError: string | null }
const serverSnapshot: Snapshot = { state: initialState(), persistenceError: null };
let browserSnapshot: Snapshot | undefined;
const listeners = new Set<() => void>();

function getBrowserSnapshot(): Snapshot {
  if (browserSnapshot) return browserSnapshot;
  browserSnapshot = { state: initialState(), persistenceError: null };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (isDemoState(parsed)) browserSnapshot.state = parsed;
      else browserSnapshot.persistenceError = "The saved demo could not be loaded. A fresh sample is shown.";
    }
  } catch { browserSnapshot.persistenceError = "Browser storage is unavailable. Changes last for this visit only."; }
  return browserSnapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    browserSnapshot = undefined;
    listeners.forEach((notify) => notify());
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

function commit(change: (previous: DemoState) => DemoState) {
  const next = change(getBrowserSnapshot().state);
  browserSnapshot = { state: next, persistenceError: null };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch { browserSnapshot.persistenceError = "Changes could not be saved to this browser. Keep this tab open."; }
  listeners.forEach((notify) => notify());
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getBrowserSnapshot, () => serverSnapshot);
  const { state, persistenceError } = snapshot;
  const hydrated = snapshot !== serverSnapshot;

  function addItems(drafts: FoodDraft[]) {
    if (!drafts.length || drafts.length > 25) throw new Error("Confirm between 1 and 25 food items at a time.");
    drafts.forEach(validateFoodDraft);
    if (drafts.some((draft) => draft.amount !== null && draft.amount <= 0)) throw new Error("Use a positive amount or leave it unknown.");
    const occurredAt = now();
    const items: FoodItem[] = drafts.map((draft) => ({ ...draft, name: draft.name.trim(), id: id(), observedAt: occurredAt, version: 1 }));
    commit((previous) => ({ ...previous, items: [...previous.items, ...items], activities: [
      ...items.map((item) => ({ id: id(), type: "confirmed" as const, itemName: item.name, amount: item.amount, unit: item.unit, measurementBasis: item.amount === null ? "unknown" as const : "user_estimated" as const, occurredAt, note: "Manually confirmed in the isolated demo." })), ...previous.activities,
    ] }));
  }

  function updateItem(itemId: string, patch: Partial<FoodDraft>) {
    const item = getBrowserSnapshot().state.items.find((entry) => entry.id === itemId);
    if (!item) throw new Error("This item is no longer in the kitchen.");
    validateFoodDraft({ ...item, ...patch });
    commit((previous) => ({ ...previous, items: previous.items.map((entry) => entry.id === itemId ? { ...entry, ...patch, name: (patch.name ?? entry.name).trim(), version: entry.version + 1, observedAt: now() } : entry) }));
  }

  function recordOutcome(itemId: string, type: OutcomeType, amount: number | null, unit: Unit | null, note = "", options: { commandId?: string; storage?: Storage } = {}) {
    if (note.length > 500 || (options.commandId && (!/^[A-Za-z0-9:_-]+$/.test(options.commandId) || options.commandId.length > 128))) throw new Error("Use a short note and a valid action identifier.");
    const requestFingerprint = JSON.stringify({ itemId, type, amount, unit, note, storage: options.storage ?? null });
    if (options.commandId) {
      const previous = getBrowserSnapshot().state.activities.find((event) => event.id === options.commandId);
      if (previous) {
        if (previous.requestFingerprint !== requestFingerprint) throw new Error("This saved action already has different details. Review the result before recording another action.");
        return;
      }
    }
    const item = getBrowserSnapshot().state.items.find((entry) => entry.id === itemId);
    if (!item) throw new Error("This item is no longer in the kitchen.");
    validateAmount(amount, unit);
    if (type === "shared") validateShareDate(item);
    if (type === "stored" && (!options.storage || !["fridge", "freezer", "pantry"].includes(options.storage))) throw new Error("Choose where you stored this food.");
    if (amount !== null && item.amount !== null &&
      (item.unit !== unit || amount > item.amount)) throw new Error("Use the recorded unit and an amount no larger than the recorded stock.");
    const event = { id: options.commandId ?? id(), itemId, requestFingerprint, type, itemName: item.name, amount, unit, measurementBasis: amount === null ? "unknown" as const : "user_estimated" as const, occurredAt: now(), note: type === "stored" ? `${note} Storage updated to ${options.storage}; quantity unchanged.`.trim() : amount === null ? `${note} Quantity unknown; recorded stock balance unchanged.`.trim() : note };
    commit((previous) => ({ ...previous, activities: [event, ...previous.activities], items: previous.items.map((entry) => {
      if (entry.id !== itemId) return entry;
      const remaining = type !== "stored" && amount !== null && entry.amount !== null && entry.unit === unit ? Number((entry.amount - amount).toFixed(6)) : entry.amount;
      return { ...entry, amount: remaining, storage: type === "stored" ? options.storage! : entry.storage, version: entry.version + 1, observedAt: event.occurredAt };
    }) }));
  }

  const value: DemoContextValue = {
    ...state, hydrated, persistenceError, addItems, updateItem, recordOutcome,
    addShopping(name, amount = null, unit = null) {
      if (!name.trim() || name.length > 120) throw new Error("Enter an item name of up to 120 characters.");
      validateAmount(amount, unit);
      commit((previous) => ({ ...previous, shopping: [...previous.shopping, { id: id(), name: name.trim(), amount, unit, checked: false }] }));
    },
    toggleShopping(itemId) { commit((previous) => ({ ...previous, shopping: previous.shopping.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item) })); },
    removeShopping(itemId) { commit((previous) => ({ ...previous, shopping: previous.shopping.filter((item) => item.id !== itemId) })); },
    savePreference(text) {
      if (!text.trim() || text.length > 280) throw new Error("Keep the preference between 1 and 280 characters.");
      commit((previous) => ({ ...previous, preferences: [...previous.preferences, { id: id(), text: text.trim() }] }));
    },
    deletePreference(preferenceId) { commit((previous) => ({ ...previous, preferences: previous.preferences.filter((preference) => preference.id !== preferenceId) })); },
    setMealPlan(servings, stage) {
      if (!Number.isInteger(servings) || servings < 1 || servings > 20) throw new Error("Choose between 1 and 20 people.");
      commit((previous) => ({ ...previous, mealPlan: { servings, stage }, activities: [{ id: id(), type: "planned", itemName: "Dinner plan", amount: servings, unit: "portions", measurementBasis: "user_estimated", occurredAt: now(), note: `Plan updated for ${servings} people. Food has not been marked used.` }, ...previous.activities] }));
    },
    createShareLog(itemId, recipientLabel, amount, unit, note) {
      const item = getBrowserSnapshot().state.items.find((entry) => entry.id === itemId);
      if (!item) throw new Error("This food is no longer in the kitchen.");
      if (!recipientLabel.trim() || recipientLabel.length > 100 || note.length > 500) throw new Error("Use a short recipient label and a note under 500 characters.");
      validateAmount(amount, unit);
      validateShareDate(item);
      if (amount !== null && item.amount !== null && (unit !== item.unit || amount > item.amount)) throw new Error("Reconcile the amount and unit with your recorded stock first.");
      const log: ShareLog = { id: id(), itemId, itemName: item.name, recipientLabel: recipientLabel.trim(), amount, unit, note, state: "offered", updatedAt: now(), ownerReported: true };
      commit((previous) => ({ ...previous, shareLogs: [log, ...previous.shareLogs] }));
      return log.id;
    },
    updateShareLog(logId, nextState) {
      const log = getBrowserSnapshot().state.shareLogs.find((entry) => entry.id === logId);
      if (!log || log.state === "handed_over" || log.state === "cancelled") throw new Error("This share record is already closed or unavailable.");
      if (nextState === "accepted" && log.state !== "offered") throw new Error("Only an open offer can be marked accepted.");
      if (nextState === "handed_over" && log.state !== "accepted") throw new Error("Record acceptance before confirming a handover.");
      if (nextState === "handed_over") recordOutcome(log.itemId, "shared", log.amount, log.unit, `Owner-reported handover to ${log.recipientLabel}. ${log.note}`, { commandId: `handover:${log.id}` });
      commit((previous) => ({ ...previous, shareLogs: previous.shareLogs.map((entry) => entry.id === logId ? { ...entry, state: nextState, updatedAt: now() } : entry) }));
    },
    resetDemo() { commit(() => initialState()); },
  };
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be rendered inside DemoProvider.");
  return context;
}
