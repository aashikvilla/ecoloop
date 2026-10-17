"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLiveHousehold } from "@/lib/live-household";
import { CanonicalApiError, readCanonicalRecords, type KitchenObservation, type ShoppingEntry } from "@/lib/canonical-api";
import { canonicalRequest } from "@/lib/canonical-transport";
import { parseActivityPage, parseShareHistoryPage, type PrivateActivityEvent, type PrivateShareLog } from "@/lib/canonical-history";

export type LiveKind = "kitchen" | "shopping" | "activity" | "share-logs";
export type LiveRecords = KitchenObservation[] | ShoppingEntry[] | PrivateActivityEvent[] | PrivateShareLog[];
type LiveState = { phase: "idle" | "loading" | "ready" | "error"; records: LiveRecords; error: string; nextCursor: string | null; scopeKey: string };

function requestError(error: unknown) {
  return error instanceof CanonicalApiError ? error.message : "Household records could not be loaded. Check your connection and try again.";
}

export function useLiveRecords(kind: LiveKind) {
  const { auth, user, householdId } = useLiveHousehold();
  const [state, setState] = useState<LiveState>({ phase: "idle", records: [], error: "", nextCursor: null, scopeKey: "" });
  const scopeKey = user && householdId ? `${user.uid}:${householdId}:${kind}` : "";
  const load = useCallback(async (signal?: AbortSignal) => {
    if (auth !== "signed-in" || !user || !householdId) {
      setState({ phase: "idle", records: [], error: "", nextCursor: null, scopeKey: "" });
      return;
    }
    const requestScope = `${user.uid}:${householdId}:${kind}`;
    setState({ phase: "loading", records: [], error: "", nextCursor: null, scopeKey: requestScope });
    try {
      const token = await user.getIdToken();
      if (signal?.aborted) return;
      if (kind === "kitchen" || kind === "shopping") {
        const result = await readCanonicalRecords(kind, token, householdId, signal);
        if (!signal?.aborted) setState({ phase: "ready", records: result.records, error: "", nextCursor: null, scopeKey: requestScope });
      } else if (kind === "activity") {
        const raw = await canonicalRequest("activity", token, householdId, { query: { limit: 100 }, signal });
        const parsed = parseActivityPage(raw, householdId, user.uid);
        if (!signal?.aborted) setState({ phase: "ready", records: parsed.records, error: "", nextCursor: parsed.nextCursor, scopeKey: requestScope });
      } else {
        const raw = await canonicalRequest("share-logs", token, householdId, { query: { limit: 100 }, signal });
        const parsed = parseShareHistoryPage(raw, householdId, user.uid);
        if (!signal?.aborted) setState({ phase: "ready", records: parsed.records, error: "", nextCursor: parsed.nextCursor, scopeKey: requestScope });
      }
    } catch (error) {
      if (!signal?.aborted && !(error instanceof Error && error.name === "AbortError")) setState({ phase: "error", records: [], error: requestError(error), nextCursor: null, scopeKey: requestScope });
    }
  }, [auth, householdId, kind, user]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => load(controller.signal));
    return () => controller.abort();
  }, [load]);
  const visibleState = state.scopeKey === scopeKey ? state : scopeKey ? { phase: "loading" as const, records: [], error: "", nextCursor: null, scopeKey } : { phase: "idle" as const, records: [], error: "", nextCursor: null, scopeKey: "" };
  return { ...visibleState, auth, householdId, refresh: () => void load() };
}

export function LiveDestinationNotice() {
  const { auth, householdId } = useLiveHousehold();
  const status = auth === "loading"
    ? "Checking your sign-in…"
    : auth === "unavailable"
      ? "Firebase sign-in is not configured in this browser."
      : auth === "error"
        ? "Household sign-in could not be initialized."
        : auth === "signed-out"
          ? "Sign in to load private household records."
          : householdId
            ? "Showing records from your selected household."
            : "Choose a household to load its records.";
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-surface-muted px-4 py-2.5 text-xs sm:text-sm">
    <p role={auth === "error" ? "alert" : "status"} className={auth === "error" || auth === "unavailable" ? "text-secondary" : "text-muted"}>{status}</p>
    {auth !== "loading" && <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2" href="/account">{auth === "signed-in" && householdId ? "Change household" : "Open account"}</Link>}
  </div>;
}
