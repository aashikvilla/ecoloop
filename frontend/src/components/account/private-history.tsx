"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { CanonicalApiError, canonicalRequest } from "@/lib/canonical-transport";
import {
  HistoryValidationError,
  parseActivityPage,
  parseShareHistoryPage,
  type HistoryPage,
  type PrivateActivityEvent,
  type PrivateShareLog,
} from "@/lib/canonical-history";

type Resource = "share-logs" | "activity";
type TokenProvider = () => Promise<string>;
type Scope = { householdId: string; ownerUid: string; getIdToken: TokenProvider };
type PageState<T> = {
  scope: Scope | null;
  loading: boolean;
  loaded: boolean;
  records: T[];
  nextCursor: string | null;
  seenCursors: string[];
  error: string;
};
const PAGE_SIZE = 25;
const MAX_RECORDS = 500;
const MAX_PAGES = 20;

function emptyPage<T>(): PageState<T> {
  return { scope: null, loading: false, loaded: false, records: [], nextCursor: null, seenCursors: [], error: "" };
}
function sameScope(left: Scope | null, right: Scope): boolean {
  return left?.householdId === right.householdId && left.ownerUid === right.ownerUid && left.getIdToken === right.getIdToken;
}
function pageMessage(error: unknown): string {
  if (error instanceof CanonicalApiError) return error.message;
  if (error instanceof HistoryValidationError) return error.message;
  return "Private history could not be loaded. Check your connection and try again.";
}
function requestCancelled(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

function usePrivatePage<T>(
  resource: Resource,
  householdId: string,
  getIdToken: TokenProvider,
  parse: (value: unknown, householdId: string, ownerUid: string) => HistoryPage<T>,
  recordId: (value: T) => string,
  ownerUid: string,
) {
  const [state, setState] = useState<PageState<T>>(() => emptyPage<T>());
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [householdId, ownerUid, getIdToken]);

  const currentState = sameScope(state.scope, { householdId, ownerUid, getIdToken }) ? state : emptyPage<T>();

  const load = useCallback(async (cursor: string | null = null, append = false) => {
    const scope: Scope = { householdId, ownerUid, getIdToken };
    const previous = sameScope(state.scope, scope) ? state : emptyPage<T>();
    const snapshot = cursor === null ? { ...previous, seenCursors: [] } : previous;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(householdId) || !ownerUid || ownerUid.length > 128) {
      setState({ ...snapshot, scope, loaded: true, error: "A signed-in owner and valid household ID are required to load private history." });
      return;
    }
    if (cursor !== null && snapshot.seenCursors.includes(cursor)) {
      setState({ ...snapshot, scope, loaded: true, error: "The history cursor repeated. Reload the first page to continue." });
      return;
    }
    if (append && (snapshot.seenCursors.length >= MAX_PAGES || snapshot.records.length >= MAX_RECORDS)) {
      setState({ ...snapshot, scope, loaded: true, nextCursor: null, error: "The history display limit was reached. Reload to start again from the newest records." });
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({
      ...snapshot,
      scope,
      loading: true,
      loaded: append ? snapshot.loaded : false,
      records: append ? snapshot.records : [],
      nextCursor: append ? snapshot.nextCursor : null,
      error: "",
    });

    const isCurrent = () => !controller.signal.aborted && requestRef.current === controller;
    try {
      const token = await getIdToken();
      if (!isCurrent()) return;
      const payload = await canonicalRequest(resource, token, householdId, {
        method: "GET",
        signal: controller.signal,
        query: { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) },
      });
      if (!isCurrent()) return;
      const page = parse(payload, householdId, ownerUid);
      const existingIds = append ? new Set(snapshot.records.map(recordId)) : new Set<string>();
      if (page.records.some((record) => existingIds.has(recordId(record)))) throw new HistoryValidationError();
      if (page.nextCursor !== null && (page.nextCursor === cursor || snapshot.seenCursors.includes(page.nextCursor))) throw new HistoryValidationError();
      if (append && snapshot.records.length + page.records.length > MAX_RECORDS) {
        setState({ ...snapshot, scope, loading: false, loaded: true, nextCursor: null, error: "The history display limit was reached. Reload to start again from the newest records." });
        return;
      }
      setState({
        scope,
        loading: false,
        loaded: true,
        records: append ? [...snapshot.records, ...page.records] : page.records,
        nextCursor: page.nextCursor,
        seenCursors: cursor === null ? snapshot.seenCursors : [...snapshot.seenCursors, cursor],
        error: "",
      });
    } catch (error) {
      if (!isCurrent() || requestCancelled(error)) return;
      setState({
        ...snapshot,
        scope,
        loading: false,
        loaded: false,
        records: [],
        nextCursor: null,
        seenCursors: [],
        error: pageMessage(error),
      });
    } finally {
      if (isCurrent()) {
        requestRef.current = null;
        setState((current) => sameScope(current.scope, scope) ? { ...current, loading: false } : current);
      }
    }
  }, [householdId, ownerUid, getIdToken, resource, parse, recordId, state]);

  const cancel = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setState((current) => sameScope(current.scope, { householdId, ownerUid, getIdToken }) ? { ...current, loading: false } : current);
  }, [householdId, ownerUid, getIdToken]);

  return { page: currentState, load, cancel };
}

const parseShares = (value: unknown, householdId: string, ownerUid: string) => parseShareHistoryPage(value, householdId, ownerUid);
const parseActivity = (value: unknown, householdId: string, ownerUid: string) => parseActivityPage(value, householdId, ownerUid);
const shareId = (record: PrivateShareLog) => record.id;
const activityId = (record: PrivateActivityEvent) => record.event_id;

const shareStateLabels: Record<PrivateShareLog["state"], string> = {
  OFFERED: "Offered · owner reported",
  ACCEPTED: "Accepted · owner reported · not recipient verified",
  HANDED_OVER: "Handed over · owner reported",
  CANCELLED: "Cancelled · owner reported",
  EXPIRED: "Expired · owner reported",
};
const outcomeLabels: Record<PrivateActivityEvent["type"], string> = {
  USED: "Used",
  STORED: "Stored",
  DISCARDED: "Discarded",
  HANDED_OVER: "Handed over",
  COMPOSTED: "Composted",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Time unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function ShareHistory({ householdId, getIdToken, ownerUid }: { householdId: string; getIdToken: TokenProvider; ownerUid: string }) {
  const { page, load, cancel } = usePrivatePage("share-logs", householdId, getIdToken, parseShares, shareId, ownerUid);
  return <section aria-labelledby="private-shares-heading" className="space-y-3">
    <div><Heading id="private-shares-heading" as="h2">Private sharing history</Heading><p className="mt-1 text-sm leading-relaxed text-muted">These are owner-reported notes for this household. No recipient is contacted; acceptance is not verified by another person.</p></div>
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => void load()} disabled={page.loading} aria-busy={page.loading}>{page.loading ? "Loading sharing history…" : page.loaded ? "Reload sharing history" : "Load sharing history"}</Button>
      {page.loading && <Button variant="secondary" onClick={cancel}>Cancel</Button>}
      {page.error && <Button variant="secondary" onClick={() => void load()}>Try again</Button>}
    </div>
    {page.error && <Card role="alert" className="border border-danger/25 bg-danger-soft/40 p-4"><p className="break-words text-sm text-danger [overflow-wrap:anywhere]">{page.error}</p></Card>}
    {page.loading && <Card role="status" className="border border-line p-4 text-sm text-muted">Loading your private share records…</Card>}
    {page.loaded && !page.loading && page.records.length === 0 && !page.error && <Card role="status" className="border border-dashed border-line p-5"><p className="font-semibold text-primary">No private sharing history</p><p className="mt-1 text-sm text-muted">The API returned no share logs for this owner and household.</p></Card>}
    {page.records.length > 0 && <Card className="min-w-0 border border-line p-4 sm:p-5"><ul className="divide-y divide-line">{page.records.map((record) => <li key={record.id} className="min-w-0 space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><p className="break-words font-semibold text-primary [overflow-wrap:anywhere]">{record.recipient_label}</p><Badge className="min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere]" tone="amber">{shareStateLabels[record.state]}</Badge></div>
      <p className="break-words text-sm text-muted [overflow-wrap:anywhere]">Owner-reported item ID: {record.item_id}</p>
      <p className="text-sm text-muted">Offer time: {formatDate(record.occurred_at)} · Updated: {formatDate(record.updated_at)}</p>
      <p className="text-sm text-muted">Offer amount: {record.amount === null ? "Unknown" : `${record.amount} ${record.unit}`} · {record.measurement_basis === "UNKNOWN" ? "Measurement unknown" : record.measurement_basis === "MEASURED" ? "Measured" : "User estimated"}</p>
      <p className="text-sm text-muted">Owner-reported condition: {record.condition.toLowerCase().replaceAll("_", " ")} · Freshness: unknown</p>
      {record.note && <p className="break-words whitespace-pre-wrap rounded-xl bg-surface-muted p-3 text-sm [overflow-wrap:anywhere]">Private note: {record.note}</p>}
      <ol aria-label="Owner-reported history" className="space-y-1 border-l-2 border-line pl-3 text-xs text-muted">{record.history.map((event, index) => <li key={`${event.state}-${event.occurred_at}-${index}`} className="break-words [overflow-wrap:anywhere]">{shareStateLabels[event.state]} · {formatDate(event.occurred_at)}</li>)}</ol>
      <p className="text-xs text-muted">Version {record.version} · Owner only · No recipient confirmation or food-safety certification</p>
    </li>)}</ul></Card>}
    {page.nextCursor && !page.loading && <Button variant="secondary" onClick={() => void load(page.nextCursor, true)}>Load more private sharing history</Button>}
  </section>;
}

function ActivityHistory({ householdId, getIdToken, ownerUid }: { householdId: string; getIdToken: TokenProvider; ownerUid: string }) {
  const { page, load, cancel } = usePrivatePage("activity", householdId, getIdToken, parseActivity, activityId, ownerUid);
  return <section aria-labelledby="private-activity-heading" className="space-y-3">
    <div><Heading id="private-activity-heading" as="h2">Private activity</Heading><p className="mt-1 text-sm leading-relaxed text-muted">Each line is a separately recorded event. Quantities keep their own units; this view does not total outcomes or estimate savings.</p></div>
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => void load()} disabled={page.loading} aria-busy={page.loading}>{page.loading ? "Loading activity…" : page.loaded ? "Reload activity" : "Load activity"}</Button>
      {page.loading && <Button variant="secondary" onClick={cancel}>Cancel</Button>}
      {page.error && <Button variant="secondary" onClick={() => void load()}>Try again</Button>}
    </div>
    {page.error && <Card role="alert" className="border border-danger/25 bg-danger-soft/40 p-4"><p className="break-words text-sm text-danger [overflow-wrap:anywhere]">{page.error}</p></Card>}
    {page.loading && <Card role="status" className="border border-line p-4 text-sm text-muted">Loading your private activity…</Card>}
    {page.loaded && !page.loading && page.records.length === 0 && !page.error && <Card role="status" className="border border-dashed border-line p-5"><p className="font-semibold text-primary">No private activity</p><p className="mt-1 text-sm text-muted">The API returned no owner-recorded events for this household.</p></Card>}
    {page.records.length > 0 && <Card className="min-w-0 border border-line p-4 sm:p-5"><ul className="divide-y divide-line">{page.records.map((event) => <li key={event.event_id} className="min-w-0 space-y-1 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><p className="font-semibold text-primary">{outcomeLabels[event.type]}</p><Badge>{event.measurement_basis === "UNKNOWN" ? "Amount unknown" : event.measurement_basis === "MEASURED" ? "Measured" : "User estimated"}</Badge></div>
      <p className="break-words text-sm text-muted [overflow-wrap:anywhere]">Item ID: {event.item_id}</p>
      <p className="text-sm text-muted">Occurred: {formatDate(event.occurred_at)} · Recorded: {formatDate(event.recorded_at)}</p>
      <p className="text-sm text-muted">Amount: {event.amount === null ? "Unknown" : `${event.amount} ${event.unit}`}</p>
      <p className="text-xs text-muted">{event.source === "OWNER_SHARE_LOG" ? "Owner-recorded share handover" : "Owner-recorded outcome"}</p>
    </li>)}</ul></Card>}
    {page.nextCursor && !page.loading && <Button variant="secondary" onClick={() => void load(page.nextCursor, true)}>Load more activity</Button>}
  </section>;
}

export function PrivateHistory({ getIdToken, householdId, ownerUid }: { getIdToken: TokenProvider; householdId: string; ownerUid: string }) {
  return <div className="space-y-8">
    <ShareHistory householdId={householdId} getIdToken={getIdToken} ownerUid={ownerUid} />
    <ActivityHistory householdId={householdId} getIdToken={getIdToken} ownerUid={ownerUid} />
  </div>;
}
