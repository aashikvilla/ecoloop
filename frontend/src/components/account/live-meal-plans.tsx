"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveHousehold } from "@/lib/live-household";
import { readSavedMealPlans, type SavedMealPlan } from "@/lib/canonical-meal-plans";
import { CanonicalApiError } from "@/lib/canonical-transport";

type State = {
  phase: "idle" | "loading" | "ready" | "error";
  plans: SavedMealPlan[];
  nextCursor: string | null;
  error: string;
  loadingMore: boolean;
  scopeKey: string;
};

const empty: State = { phase: "idle", plans: [], nextCursor: null, error: "", loadingMore: false, scopeKey: "" };

function message(error: unknown): string {
  return error instanceof CanonicalApiError ? error.message : "Saved meal plans could not be loaded. Check your connection and try again.";
}

export function useLiveMealPlans() {
  const { auth, user, householdId } = useLiveHousehold();
  const scopeKey = user && householdId ? `${user.uid}:${householdId}:meal-plans` : "";
  const [state, setState] = useState<State>(empty);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(async (cursor?: string) => {
    if (auth !== "signed-in" || !user || !householdId) {
      setState(empty);
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const requestScope = `${user.uid}:${householdId}:meal-plans`;
    setState((current) => cursor
      ? { ...current, loadingMore: true, error: "", scopeKey: requestScope }
      : { ...empty, phase: "loading", scopeKey: requestScope });
    try {
      const token = await user.getIdToken();
      if (controller.signal.aborted) return;
      const page = await readSavedMealPlans(token, householdId, cursor, controller.signal);
      if (!controller.signal.aborted) setState((current) => ({
        phase: "ready",
        plans: cursor && current.scopeKey === requestScope ? [...current.plans, ...page.plans] : page.plans,
        nextCursor: page.next_cursor,
        error: "",
        loadingMore: false,
        scopeKey: requestScope,
      }));
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) return;
      setState((current) => cursor && current.scopeKey === requestScope
        ? { ...current, error: message(error), loadingMore: false }
        : { ...empty, phase: "error", error: message(error), scopeKey: requestScope });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [auth, householdId, user]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    return () => request.current?.abort();
  }, [load]);

  const visible = state.scopeKey === scopeKey ? state : scopeKey ? { ...empty, phase: "loading" as const, scopeKey } : empty;
  return {
    ...visible,
    auth,
    refresh: () => void load(),
    loadMore: () => { if (visible.phase === "ready" && visible.nextCursor && !visible.loadingMore) void load(visible.nextCursor); },
  };
}
