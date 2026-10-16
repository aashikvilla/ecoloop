"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useLiveHousehold } from "@/lib/live-household";
import { CanonicalApiError, readCanonicalRecords, type KitchenObservation, type ShoppingEntry } from "@/lib/canonical-api";
import { canonicalRequest } from "@/lib/canonical-transport";
import { parseActivityPage, type PrivateActivityEvent } from "@/lib/canonical-history";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type LiveKind = "kitchen" | "shopping" | "activity";
export type LiveRecords = KitchenObservation[] | ShoppingEntry[] | PrivateActivityEvent[];
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
      } else {
        const raw = await canonicalRequest("activity", token, householdId, { query: { limit: 100 }, signal });
        const parsed = parseActivityPage(raw, householdId, user.uid);
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

export function LiveDestinationNotice({ children }: { children?: ReactNode }) {
  const { auth, user, householdId, setHouseholdId } = useLiveHousehold();
  const [draftId, setDraftId] = useState(householdId);
  function chooseHousehold(event: FormEvent) {
    event.preventDefault();
    const value = draftId.trim();
    if (/^[A-Za-z0-9_-]{1,128}$/.test(value)) setHouseholdId(value);
  }
  return <Card className="mb-4 space-y-3 border border-line p-4">
    <div><p className="font-semibold text-primary">Connected household data</p><p className="mt-1 text-sm leading-relaxed text-muted">These destinations show only records returned by the household API. Browser demo records are not substituted.</p></div>
    {auth === "loading" && <p role="status" className="text-sm text-muted">Checking household sign-in…</p>}
    {auth === "unavailable" && <p role="status" className="text-sm text-secondary">Household sign-in is unavailable because public Firebase configuration is missing.</p>}
    {auth === "error" && <p role="alert" className="text-sm text-danger">Household sign-in could not be initialized. Reload or open <Link className="underline" href="/account">Account</Link> to retry.</p>}
    {auth === "signed-out" && <p className="text-sm text-muted">Sign in and choose a household to load its records. <Link className="font-semibold text-primary underline" href="/account">Open Account</Link></p>}
    {auth === "signed-in" && <form onSubmit={chooseHousehold} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"><label className="text-sm font-medium" htmlFor="live-household-id">Household ID{householdId ? ` · selected ${householdId}` : ""}<Input id="live-household-id" className="mt-1" value={draftId} maxLength={128} pattern="[A-Za-z0-9_-]{1,128}" placeholder="Enter the exact household ID" onChange={(event) => setDraftId(event.target.value)} /></label><div className="flex items-center gap-3"><button type="submit" className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white">Use household</button><p className="text-xs text-muted">{user?.email || "Signed-in account"}</p></div></form>}
    {children}
  </Card>;
}
