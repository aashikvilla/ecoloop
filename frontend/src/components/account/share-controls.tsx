"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { CanonicalApiError, readCanonicalRecords, type KitchenObservation } from "@/lib/canonical-api";
import { canonicalRequest } from "@/lib/canonical-transport";
import { HistoryValidationError, parseShareHistoryPage, type HistoryShareState, type PrivateShareLog } from "@/lib/canonical-history";
import {
  buildShareOfferCommand,
  buildShareTransitionCommand,
  createShareId,
  createShareIdempotencyKey,
  parseShareOfferResult,
  parseShareTransitionResult,
  ShareCommandError,
  type ShareMutationStatus,
  type ShareOfferCommand,
  type ShareTransitionCommand,
  type ShareTransitionTarget,
} from "@/lib/canonical-sharing";

type TokenProvider = () => Promise<string>;
type Scope = { householdId: string; ownerUid: string; enabled: boolean; getIdToken: TokenProvider };
type DataState = { scope: Scope | null; kitchen: KitchenObservation[] | null; shares: PrivateShareLog[] | null };
type PendingShare =
  | { scope: Scope; kind: "offer"; command: ShareOfferCommand; status: ShareMutationStatus }
  | { scope: Scope; kind: "transition"; share: PrivateShareLog; item: KitchenObservation | null; command: ShareTransitionCommand; status: ShareMutationStatus };
type TransitionDraft = { scope: Scope; share: PrivateShareLog; target: ShareTransitionTarget; item: KitchenObservation | null };
type Operation = { scope: Scope; kind: "load" | "prepare-handover" | "write" } | null;
type ShareControlsProps = {
  getIdToken: TokenProvider;
  householdId: string;
  ownerUid: string;
  enabled: boolean;
  onCommitted: () => void;
  initialItemId?: string;
};

const PAGE_SIZE = 25;
const householdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const emptyData = (): DataState => ({ scope: null, kitchen: null, shares: null });
const shareLabels: Record<HistoryShareState, string> = {
  OFFERED: "Offered · owner reported",
  ACCEPTED: "Accepted · owner reported, not recipient verified",
  HANDED_OVER: "Handed over · owner reported",
  CANCELLED: "Cancelled · owner reported",
  EXPIRED: "Expired · owner reported",
};

function sameScope(left: Scope | null | undefined, right: Scope): boolean {
  return Boolean(left && left.householdId === right.householdId && left.ownerUid === right.ownerUid && left.enabled === right.enabled && left.getIdToken === right.getIdToken);
}
function isCancelled(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}
function messageFor(error: unknown): string {
  if (error instanceof CanonicalApiError || error instanceof HistoryValidationError || error instanceof ShareCommandError) return error.message;
  return "The sharing request could not be completed. Reload current records before continuing.";
}
function mutationStatus(error: unknown): ShareMutationStatus {
  if (error instanceof CanonicalApiError) {
    if (error.code === "conflict") return "conflict";
    if (["validation", "unauthenticated", "forbidden", "rate_limited", "not_configured", "bad_origin"].includes(error.code)) return "rejected";
  }
  return "ambiguous";
}
function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Time unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function quantityText(amount: number | null, unit: string | null): string {
  return amount === null || unit === null ? "Unknown amount" : `${amount} ${unit}`;
}
function handoverStockEffect(command: ShareTransitionCommand, item: KitchenObservation | null): string {
  if (command.state !== "HANDED_OVER" || !item || item.amount === null) return "Kitchen stock is unknown and will remain unknown.";
  if (command.amount === null) return "The previously known kitchen quantity will be marked unknown.";
  return "The kitchen quantity will decrease by this amount if the recorded unit and versions still match.";
}
export function ShareControls({ getIdToken, householdId, ownerUid, enabled, onCommitted, initialItemId }: ShareControlsProps) {
  const scope = useMemo(() => ({ householdId, ownerUid, enabled, getIdToken }), [householdId, ownerUid, enabled, getIdToken]);
  const scopeReady = enabled && householdPattern.test(householdId) && typeof ownerUid === "string" && ownerUid.trim().length > 0 && ownerUid.length <= 128;
  const [data, setData] = useState<DataState>(() => emptyData());
  const [pending, setPending] = useState<PendingShare | null>(null);
  const [transitionDraft, setTransitionDraft] = useState<TransitionDraft | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [readError, setReadError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerUnit, setOfferUnit] = useState("");
  const [offerBasis, setOfferBasis] = useState<"MEASURED" | "USER_ESTIMATED" | "UNKNOWN">("UNKNOWN");
  const [offerNote, setOfferNote] = useState("");
  const [offerOccurredAt, setOfferOccurredAt] = useState("");
  const [offerUnserved, setOfferUnserved] = useState(false);
  const [transitionOccurredAt, setTransitionOccurredAt] = useState("");
  const [handoverAmount, setHandoverAmount] = useState("");
  const [handoverUnit, setHandoverUnit] = useState("");
  const [handoverBasis, setHandoverBasis] = useState<"MEASURED" | "USER_ESTIMATED" | "UNKNOWN">("UNKNOWN");
  const [handoverUnserved, setHandoverUnserved] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const operationRef = useRef(false);
  const mountedRef = useRef(false);
  const currentScopeRef = useRef<Scope | null>(null);
  const visibleData = sameScope(data.scope, scope) ? data : emptyData();
  const visiblePending = sameScope(pending?.scope, scope) ? pending : null;
  const visibleTransition = sameScope(transitionDraft?.scope, scope) ? transitionDraft : null;
  const isWorking = sameScope(operation?.scope, scope) ? operation : null;

  useEffect(() => {
    currentScopeRef.current = scope;
    mountedRef.current = true;
    requestRef.current?.abort();
    requestRef.current = null;
    operationRef.current = false;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
      operationRef.current = false;
    };
  }, [scope]);

  function isCurrent(controller: AbortController, captured: Scope): boolean {
    return mountedRef.current && !controller.signal.aborted && requestRef.current === controller && sameScope(currentScopeRef.current, captured);
  }
  function finish(controller: AbortController): void {
    if (requestRef.current !== controller) return;
    requestRef.current = null;
    operationRef.current = false;
    setOperation(null);
  }
  function start(kind: NonNullable<Operation>["kind"]): AbortController | null {
    if (!scopeReady || operationRef.current || !sameScope(currentScopeRef.current, scope)) return null;
    operationRef.current = true;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setOperation({ scope, kind });
    return controller;
  }

  async function readCurrent(discardPending = false): Promise<void> {
    const controller = start("load");
    if (!controller) return;
    setReadError("");
    setWriteError("");
    setNotice("");
    try {
      const token = await getIdToken();
      if (!isCurrent(controller, scope)) return;
      const [kitchenResult, sharePayload] = await Promise.all([
        readCanonicalRecords("kitchen", token, householdId, controller.signal),
        canonicalRequest("share-logs", token, householdId, { method: "GET", query: { limit: PAGE_SIZE }, signal: controller.signal }),
      ]);
      if (!isCurrent(controller, scope)) return;
      if (kitchenResult.kind !== "kitchen") throw new ShareCommandError("The current kitchen response was not valid for sharing.");
      const shares = parseShareHistoryPage(sharePayload, householdId, ownerUid);
      setData({ scope, kitchen: kitchenResult.records, shares: shares.records });
      if (initialItemId) {
        const item = kitchenResult.records.find((record) => record.item_id === initialItemId);
        setSelectedItemId(item?.item_id ?? "");
        if (!item) setReadError("This item was not present in the latest Kitchen read. Choose a current item before preparing a share.");
      }
      setTransitionDraft(null);
      if (discardPending) setPending(null);
      setHandoverAmount("");
      setHandoverUnit("");
      setHandoverBasis("UNKNOWN");
      setHandoverUnserved(false);
      setNotice("Current kitchen records and the 25 most recent owner-private sharing records are loaded. Review them before preparing a change.");
    } catch (error) {
      if (!isCurrent(controller, scope) || isCancelled(error)) return;
      setData({ scope, kitchen: null, shares: null });
      setTransitionDraft(null);
      setReadError(messageFor(error));
    } finally {
      finish(controller);
    }
  }

  async function prepareTransition(share: PrivateShareLog, target: ShareTransitionTarget): Promise<void> {
    if (!sameScope(visibleData.scope, scope) || visibleData.shares === null || visiblePending || visibleTransition) return;
    setReadError("");
    setWriteError("");
    setNotice("");
    let item: KitchenObservation | null = null;
    if (target === "HANDED_OVER") {
      const controller = start("prepare-handover");
      if (!controller) return;
      try {
        const token = await getIdToken();
        if (!isCurrent(controller, scope)) return;
        const kitchen = await readCanonicalRecords("kitchen", token, householdId, controller.signal);
        if (!isCurrent(controller, scope)) return;
        if (kitchen.kind !== "kitchen") throw new ShareCommandError("The current kitchen response was not valid for handover.");
        item = kitchen.records.find((record) => record.item_id === share.item_id) ?? null;
        if (!item) throw new ShareCommandError("The linked kitchen item is no longer available. Reload current records before continuing.");
        setData({ ...visibleData, kitchen: kitchen.records });
      } catch (error) {
        if (isCurrent(controller, scope) && !isCancelled(error)) {
          setData({ scope, kitchen: null, shares: null });
          setReadError(messageFor(error));
        }
        return;
      } finally {
        finish(controller);
      }
    }
    setTransitionOccurredAt("");
    setHandoverAmount("");
    setHandoverUnit("");
    setHandoverBasis("UNKNOWN");
    setHandoverUnserved(false);
    setTransitionDraft({ scope, share, target, item });
  }

  function reviewOffer(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const item = visibleData.kitchen?.find((candidate) => candidate.item_id === selectedItemId);
    if (!scopeReady || !item || visiblePending || isWorking) return;
    setWriteError("");
    setNotice("");
    try {
      const command = buildShareOfferCommand({
        item,
        recipientLabel,
        amount: offerAmount,
        unit: offerUnit,
        measurementBasis: offerBasis,
        note: offerNote,
        occurredAtLocal: offerOccurredAt,
        confirmedUnserved: offerUnserved,
        idempotencyKey: createShareIdempotencyKey(),
        shareId: createShareId(),
      });
      setPending({ scope, kind: "offer", command, status: "ready" });
    } catch (error) {
      setWriteError(messageFor(error));
    }
  }

  function reviewTransition(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!visibleTransition || visiblePending || isWorking) return;
    setWriteError("");
    setNotice("");
    try {
      const command = buildShareTransitionCommand({
        share: visibleTransition.share,
        target: visibleTransition.target,
        occurredAtLocal: transitionOccurredAt,
        idempotencyKey: createShareIdempotencyKey(),
        ...(visibleTransition.target === "HANDED_OVER" ? {
          item: visibleTransition.item ?? undefined,
          amount: handoverAmount,
          unit: handoverUnit,
          measurementBasis: handoverBasis,
          confirmedUnserved: handoverUnserved,
        } : {}),
      });
      setPending({ scope, kind: "transition", share: visibleTransition.share, item: visibleTransition.item, command, status: "ready" });
      setTransitionDraft(null);
    } catch (error) {
      setWriteError(messageFor(error));
    }
  }

  async function submitPending(retry = false): Promise<void> {
    const exact = visiblePending;
    if (!scopeReady || !exact || isWorking || operationRef.current || (retry ? exact.status !== "ambiguous" : exact.status !== "ready")) return;
    const controller = start("write");
    if (!controller) return;
    setWriteError("");
    setNotice("");
    try {
      const token = await getIdToken();
      if (!isCurrent(controller, exact.scope)) return;
      if (exact.kind === "offer") {
        const response = await canonicalRequest("share-logs", token, householdId, { method: "POST", body: exact.command, signal: controller.signal });
        if (!isCurrent(controller, exact.scope)) return;
        const result = parseShareOfferResult(response, exact.command);
        setPending(null);
        setData({ scope, kitchen: null, shares: null });
        setNotice(`Owner-reported offer saved at version ${result.version}. No kitchen quantity was deducted.`);
      } else {
        const response = await canonicalRequest("share-transition", token, householdId, { method: "PATCH", recordId: exact.share.id, body: exact.command, signal: controller.signal });
        if (!isCurrent(controller, exact.scope)) return;
        const result = parseShareTransitionResult(response, exact.command, exact.share.id);
        setPending(null);
        setData({ scope, kitchen: null, shares: null });
        setNotice(result.state === "HANDED_OVER"
          ? `Owner-reported handover recorded at version ${result.version}. Reload the kitchen and sharing records to review current versions.`
          : `${shareLabels[result.state]} at version ${result.version}. No kitchen quantity was deducted.`);
      }
      setTransitionDraft(null);
      try { onCommitted(); } catch { setNotice("The change was recorded, but linked records could not be refreshed. Reload current records to review it."); }
    } catch (error) {
      if (!isCurrent(controller, exact.scope) || isCancelled(error)) return;
      setData({ scope, kitchen: null, shares: null });
      setWriteError(messageFor(error));
      setPending({ ...exact, status: mutationStatus(error) });
    } finally {
      finish(controller);
    }
  }

  function canTransition(share: PrivateShareLog): ShareTransitionTarget[] {
    if (share.state === "OFFERED") return ["ACCEPTED", "CANCELLED", "EXPIRED"];
    if (share.state === "ACCEPTED") return ["HANDED_OVER", "CANCELLED", "EXPIRED"];
    return [];
  }

  const locked = !scopeReady || isWorking !== null || visiblePending !== null;
  const offerItem = visibleData.kitchen?.find((candidate) => candidate.item_id === selectedItemId) ?? null;

  return <section aria-labelledby="share-controls-heading" className="space-y-5">
    <header>
      <Badge className="mb-3" tone={enabled ? "green" : "amber"}>{enabled ? "OWNER-REPORTED SHARING" : "SHARING UNAVAILABLE"}</Badge>
      <Heading id="share-controls-heading" as="h2">Private sharing log</Heading>
      <p className="mt-2 text-sm leading-relaxed text-muted">These controls record your private account of an offer and any later handover. They do not contact a recipient, publish an offer, verify acceptance, or certify food safety.</p>
    </header>

    {!enabled && <Card role="status" className="border border-line bg-surface-muted p-4 text-sm leading-relaxed text-muted">Household sharing changes are disabled for this app. No kitchen or sharing request was sent.</Card>}
    {enabled && !scopeReady && <Card role="status" className="border border-line bg-surface-muted p-4 text-sm leading-relaxed text-muted">Sign in and choose a valid household before reading or changing private sharing records.</Card>}

    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={!scopeReady || isWorking !== null} onClick={() => void readCurrent(visiblePending?.status === "conflict")} aria-busy={isWorking?.kind === "load"}>
        {isWorking?.kind === "load" ? "Loading current records…" : visibleData.shares ? "Reload current records" : "Load current kitchen and sharing records"}
      </Button>
      {isWorking && isWorking.kind !== "write" && <Button variant="secondary" onClick={() => { requestRef.current?.abort(); requestRef.current = null; operationRef.current = false; setOperation(null); }}>Cancel read</Button>}
    </div>

    {readError && <Card role="alert" className="border border-danger/25 bg-danger-soft/40 p-4"><p className="break-words text-sm text-danger [overflow-wrap:anywhere]">{readError}</p><Button className="mt-3" variant="secondary" disabled={!scopeReady || isWorking !== null} onClick={() => void readCurrent()}>Try loading again</Button></Card>}
    {writeError && <Card role="alert" className="border border-danger/25 bg-danger-soft/40 p-4"><p className="break-words text-sm text-danger [overflow-wrap:anywhere]">{writeError}</p></Card>}
    {notice && <Card role="status" className="border border-line bg-surface-muted p-4 text-sm leading-relaxed text-muted">{notice}</Card>}
    {isWorking && <Card role="status" className="border border-line p-4 text-sm text-muted">{isWorking.kind === "write" ? "Sending the reviewed sharing command…" : isWorking.kind === "prepare-handover" ? "Reloading the linked kitchen item before handover review…" : "Loading owner-private records…"}</Card>}

    {visibleData.kitchen && visibleData.shares && <>
      <Card className="space-y-4 border border-line p-4 sm:p-5">
        <div><Heading as="h3">Offer usable food</Heading><p className="mt-1 text-sm leading-relaxed text-muted">The offer is a private owner log only. Choose a current kitchen record; confirming the offer does not change its quantity.</p></div>
        {visibleData.kitchen.length === 0 && <p role="status" className="text-sm text-muted">No current kitchen records are available to select.</p>}
        {visibleData.kitchen.length > 0 && <form onSubmit={reviewOffer} className="space-y-4">
          <fieldset disabled={locked || visibleTransition !== null} className="space-y-4 disabled:opacity-75">
            <label className="block space-y-1.5 text-sm font-medium text-primary"><span>Kitchen item</span><select className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" required value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}><option value="">Choose a current item</option>{visibleData.kitchen.map((item) => <option key={item.item_id} value={item.item_id}>{item.name} · {item.amount === null ? "quantity unknown" : `${item.amount} ${item.unit}`}</option>)}</select></label>
            <p className="break-words text-xs text-muted [overflow-wrap:anywhere]">{offerItem ? `Last confirmed ${formatDate(offerItem.observed_at)} · version ${offerItem.version}. A successful offer does not decrement this stock.` : "Choose the item you are offering."}</p>
            <label className="block space-y-1.5 text-sm font-medium text-primary"><span>Intended recipient label</span><Input maxLength={120} required value={recipientLabel} onChange={(event) => setRecipientLabel(event.target.value)} autoComplete="off" /></label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium text-primary"><span>Offer amount (optional)</span><Input type="number" min="0" max="1000000" step="any" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} inputMode="decimal" /></label><label className="block space-y-1.5 text-sm font-medium text-primary"><span>Unit (required with amount)</span><Input maxLength={32} value={offerUnit} onChange={(event) => setOfferUnit(event.target.value)} autoComplete="off" /></label></div>
            <label className="block space-y-1.5 text-sm font-medium text-primary"><span>Quantity basis</span><select className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={offerBasis} onChange={(event) => setOfferBasis(event.target.value as typeof offerBasis)}><option value="UNKNOWN">Unknown (leave amount and unit blank)</option><option value="MEASURED">Measured</option><option value="USER_ESTIMATED">User estimated</option></select></label>
            <label className="block space-y-1.5 text-sm font-medium text-primary"><span>Private note (optional)</span><textarea className="min-h-24 w-full rounded-control border border-line bg-white px-4 py-3 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" maxLength={500} value={offerNote} onChange={(event) => setOfferNote(event.target.value)} /></label>
            <label className="block space-y-1.5 text-sm font-medium text-primary"><span>When did this offer happen?</span><Input type="datetime-local" step="1" required value={offerOccurredAt} onChange={(event) => setOfferOccurredAt(event.target.value)} /></label>
            <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed text-primary"><input className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="checkbox" checked={offerUnserved} onChange={(event) => setOfferUnserved(event.target.checked)} /><span>I confirm this item is owner-reported unserved, not plated, spoiled, or expired. This is my report, not a food-safety check.</span></label>
            <Button type="submit" disabled={!scopeReady || !offerItem || visiblePending !== null || visibleTransition !== null || isWorking !== null}>Review private offer</Button>
          </fieldset>
        </form>}
      </Card>

      <Card className="space-y-4 border border-line p-4 sm:p-5">
        <div><Heading as="h3">Recent records for sharing actions</Heading><p className="mt-1 text-sm leading-relaxed text-muted">Up to 25 recent owner-private records are shown here for lifecycle actions. Use the paginated history below for older activity. All states are owner reported; “accepted” is not recipient verified.</p></div>
        {visibleData.shares.length === 0 && <p role="status" className="text-sm text-muted">No private sharing records were returned.</p>}
        <ul className="divide-y divide-line">{visibleData.shares.map((share) => <li key={share.id} className="min-w-0 space-y-2 py-4 first:pt-0 last:pb-0">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><p className="break-words font-semibold text-primary [overflow-wrap:anywhere]">{share.recipient_label}</p><Badge className="min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere]" tone="amber">{shareLabels[share.state]}</Badge></div>
          <p className="break-words text-sm text-muted [overflow-wrap:anywhere]">Item: {visibleData.kitchen?.find((item) => item.item_id === share.item_id)?.name ?? "Current kitchen item unavailable"}</p>
          <p className="text-sm text-muted">Offer time: {formatDate(share.occurred_at)} · Offer amount: {quantityText(share.amount, share.unit)} · {share.measurement_basis === "UNKNOWN" ? "measurement unknown" : share.measurement_basis === "MEASURED" ? "measured" : "user estimated"}</p>
          {share.note && <p className="break-words whitespace-pre-wrap rounded-xl bg-surface-muted p-3 text-sm [overflow-wrap:anywhere]">Private note: {share.note}</p>}
          <p className="text-xs text-muted">Version {share.version} · Freshness unknown · Owner-only record</p>
          {canTransition(share).length > 0 && <div className="flex flex-wrap gap-2 pt-1">{canTransition(share).map((target) => <Button key={target} size="sm" variant={target === "HANDED_OVER" ? "primary" : "secondary"} disabled={locked || visibleTransition !== null} onClick={() => void prepareTransition(share, target)}>{target === "HANDED_OVER" ? "Prepare actual handover" : `Record ${target.toLowerCase()}`}</Button>)}</div>}
        </li>)}</ul>
      </Card>
    </>}

    {visibleTransition && <Card className="space-y-4 border border-primary/20 bg-primary-soft/30 p-4 sm:p-5">
      <div><Badge className="mb-2" tone="amber">REVIEW OWNER-REPORTED EVENT</Badge><Heading as="h3">{visibleTransition.target === "HANDED_OVER" ? "Record an actual handover" : `Record ${visibleTransition.target.toLowerCase()}`}</Heading><p className="mt-1 break-words text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">{visibleTransition.target === "HANDED_OVER" ? "This action records that you actually handed the item over. The item was reread from Kitchen for its current expected version. No recipient is contacted or asked to confirm." : "This records your account of the event. It does not contact another person or verify their response."}</p></div>
      {visibleTransition.target === "HANDED_OVER" && visibleTransition.item && <div className="rounded-xl bg-white/80 p-3 text-sm text-muted"><p className="break-words font-semibold text-primary [overflow-wrap:anywhere]">{visibleTransition.item.name}</p><p>Reread version {visibleTransition.item.version} · Last confirmed {formatDate(visibleTransition.item.observed_at)}</p><p>Current kitchen quantity: {quantityText(visibleTransition.item.amount, visibleTransition.item.unit)}</p>{visibleTransition.item.amount !== null && <p className="mt-1">If the handed-over amount is unknown, confirming will mark this known stock quantity unknown.</p>}</div>}
      <form onSubmit={reviewTransition} className="space-y-4">
        <fieldset disabled={locked} className="space-y-4 disabled:opacity-75">
          <label className="block space-y-1.5 text-sm font-medium text-primary"><span>When did this owner-reported event happen?</span><Input type="datetime-local" step="1" required value={transitionOccurredAt} onChange={(event) => setTransitionOccurredAt(event.target.value)} /></label>
          {visibleTransition.target === "HANDED_OVER" && <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium text-primary"><span>Actual handover amount (optional)</span><Input type="number" min="0" max="1000000" step="any" value={handoverAmount} onChange={(event) => setHandoverAmount(event.target.value)} inputMode="decimal" /></label><label className="block space-y-1.5 text-sm font-medium text-primary"><span>Unit (required with amount)</span><Input maxLength={32} value={handoverUnit} onChange={(event) => setHandoverUnit(event.target.value)} autoComplete="off" /></label></div>
            <label className="block space-y-1.5 text-sm font-medium text-primary"><span>Actual quantity basis</span><select className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={handoverBasis} onChange={(event) => setHandoverBasis(event.target.value as typeof handoverBasis)}><option value="UNKNOWN">Unknown (leave amount and unit blank)</option><option value="MEASURED">Measured</option><option value="USER_ESTIMATED">User estimated</option></select></label>
            <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed text-primary"><input className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="checkbox" checked={handoverUnserved} onChange={(event) => setHandoverUnserved(event.target.checked)} /><span>I confirm this item remains owner-reported unserved, not plated, spoiled, or expired. This is my report, not a food-safety check.</span></label>
          </>}
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={locked}>{visibleTransition.target === "HANDED_OVER" ? "Review actual handover" : "Review owner-reported update"}</Button><Button variant="secondary" disabled={isWorking !== null} onClick={() => setTransitionDraft(null)}>Cancel review</Button></div>
        </fieldset>
      </form>
    </Card>}

    {visiblePending && <Card className="space-y-4 border border-tertiary/25 p-4 sm:p-5">
      <div><Badge className="mb-2" tone={visiblePending.status === "conflict" ? "amber" : "green"}>{visiblePending.status === "ready" ? "READY FOR YOUR REVIEW" : visiblePending.status === "ambiguous" ? "WRITE STATUS UNKNOWN" : visiblePending.status === "conflict" ? "RELOAD REQUIRED" : "COMMAND REJECTED"}</Badge><Heading as="h3">Review the exact sharing command</Heading><p className="mt-1 text-sm leading-relaxed text-muted">The command below has a fixed event time and retry key. The app will not retry automatically.</p></div>
      {visiblePending.kind === "offer" ? <div className="space-y-1 break-words text-sm text-muted [overflow-wrap:anywhere]"><p>Private offer for: {visibleData.kitchen?.find((item) => item.item_id === visiblePending.command.item_id)?.name ?? visiblePending.command.item_id}</p><p>Intended recipient label: {visiblePending.command.recipient_label}</p><p>Offer amount: {quantityText(visiblePending.command.amount, visiblePending.command.unit)} · {visiblePending.command.measurement_basis === "UNKNOWN" ? "unknown measurement" : visiblePending.command.measurement_basis === "MEASURED" ? "measured" : "user estimated"}</p><p>Owner condition: unserved, user reported · Freshness: unknown</p><p>Event time: {formatDate(visiblePending.command.occurred_at)}</p><p>Private note: {visiblePending.command.note || "None"}</p><p>Stock effect: none; offer does not deduct kitchen quantity.</p></div> : <div className="space-y-1 break-words text-sm text-muted [overflow-wrap:anywhere]"><p>Record: {visiblePending.share.recipient_label}</p><p>Change: {shareLabels[visiblePending.command.state]}</p><p>Event time: {formatDate(visiblePending.command.occurred_at)}</p>{visiblePending.command.state === "HANDED_OVER" && <><p>Actual amount: {quantityText(visiblePending.command.amount, visiblePending.command.unit)} · {visiblePending.command.measurement_basis === "UNKNOWN" ? "unknown measurement" : visiblePending.command.measurement_basis === "MEASURED" ? "measured" : "user estimated"}</p><p>Owner condition: unserved, user reported · Expected kitchen version: {visiblePending.command.expected_item_version}</p><p>{handoverStockEffect(visiblePending.command, visiblePending.item)}</p></>}</div>}
      {visiblePending.status === "ambiguous" && <p role="status" className="text-sm text-muted">The server may have recorded this command. Retry only with the same payload and key, or reload records to reconcile the result.</p>}
      {visiblePending.status === "conflict" && <p role="status" className="text-sm text-muted">The server reports a version or state conflict. Reload the current kitchen and sharing records, then prepare and review a new command.</p>}
      <div className="flex flex-wrap gap-2">{visiblePending.status === "ready" && <Button onClick={() => void submitPending()} disabled={isWorking !== null} aria-busy={isWorking?.kind === "write"}>Confirm and send</Button>}{visiblePending.status === "ambiguous" && <Button onClick={() => void submitPending(true)} disabled={isWorking !== null} aria-busy={isWorking?.kind === "write"}>Retry this exact command</Button>}{visiblePending.status === "ready" && <Button variant="secondary" disabled={isWorking !== null} onClick={() => setPending(null)}>Edit details</Button>}{visiblePending.status !== "ready" && <Button variant="secondary" disabled={isWorking !== null} onClick={() => void readCurrent(true)}>Reload records and review again</Button>}</div>
    </Card>}
  </section>;
}
