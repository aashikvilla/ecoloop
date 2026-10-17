"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { readCanonicalRecords, type KitchenObservation } from "@/lib/canonical-api";
import { CanonicalApiError, canonicalRequest } from "@/lib/canonical-transport";
import {
  buildRecordOutcomeCommand,
  createOutcomeId,
  createOutcomeIdempotencyKey,
  parseRecordOutcomeResult,
  type CanonicalOutcomeType,
  type MeasurementBasis,
  type OutcomeDraft,
  type RecordOutcomeCommand,
} from "@/lib/canonical-outcomes";

export type OutcomeControlsProps = {
  getIdToken: () => Promise<string>;
  householdId: string;
  enabled: boolean;
  onCommitted: () => void;
  initialItemId?: string;
};

type PendingOutcome = { command: RecordOutcomeCommand; itemName: string; stockAmount: number | null; stockUnit: string | null; localTime: string; timeZone: string; status: "ready" | "ambiguous" | "conflict" | "rejected" };
type UiError = { message: string; requestId?: string };
type Operation = "load" | "write" | null;

const newDraft = (): OutcomeDraft => ({ outcomeId: "", itemId: "", baseVersion: 0, outcomeType: "USED", amount: "", unit: "", measurementBasis: "UNKNOWN", storage: "", occurredAtLocal: "" });

function errorDetails(error: unknown): UiError {
  if (error instanceof CanonicalApiError) return { message: error.message, requestId: error.requestId };
  if (error instanceof Error) return { message: error.message };
  return { message: "The request did not complete." };
}

function isAmbiguous(error: unknown): boolean {
  if (error instanceof CanonicalApiError) return ["network", "timeout", "unavailable", "invalid_response", "unexpected"].includes(error.code);
  return true;
}

export function OutcomeControls({ getIdToken, householdId, enabled, onCommitted, initialItemId }: OutcomeControlsProps) {
  const [records, setRecords] = useState<KitchenObservation[] | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [draft, setDraft] = useState<OutcomeDraft>(newDraft);
  const [pending, setPending] = useState<PendingOutcome | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [notice, setNotice] = useState("");
  const [timeZone, setTimeZone] = useState("device local time zone");
  const requestRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const scopeRef = useRef("");
  const scopeKey = `${enabled ? "enabled" : "disabled"}:${householdId}`;
  const scopeReady = enabled && /^[A-Za-z0-9_-]{1,128}$/.test(householdId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
      busyRef.current = false;
    };
  }, []);

  useEffect(() => {
    scopeRef.current = scopeKey;
    requestRef.current?.abort();
    requestRef.current = null;
    busyRef.current = false;
    return () => requestRef.current?.abort();
  }, [scopeKey]);

  function isCurrent(controller: AbortController, expectedScope: string): boolean {
    return mountedRef.current && !controller.signal.aborted && scopeRef.current === expectedScope;
  }

  function finish(controller: AbortController) {
    if (requestRef.current !== controller) return;
    requestRef.current = null;
    busyRef.current = false;
    setOperation(null);
  }

  async function loadKitchen(discardPending = false) {
    if (!scopeReady || busyRef.current) return;
    const expectedScope = scopeKey;
    busyRef.current = true;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setOperation("load");
    setError(null);
    setNotice("");
    try {
      const token = await getIdToken();
      if (!isCurrent(controller, expectedScope)) return;
      const response = await readCanonicalRecords("kitchen", token, householdId, controller.signal);
      if (!isCurrent(controller, expectedScope) || response.kind !== "kitchen") return;
      setRecords(response.records);
      if (initialItemId) {
        const initialItem = response.records.find((record) => record.item_id === initialItemId);
        setSelectedItemId(initialItem?.item_id ?? "");
        setDraft((previous) => ({ ...previous, outcomeId: "", itemId: initialItem?.item_id ?? "", baseVersion: initialItem?.version ?? 0 }));
        if (!initialItem) setNotice("This item was not present in the latest Kitchen read. Choose a current item before reviewing an outcome.");
      }
      if (discardPending && pending) {
        const current = response.records.find((record) => record.item_id === pending.command.item_id);
        setSelectedItemId(current?.item_id ?? "");
        setDraft((previous) => ({ ...previous, outcomeId: "", itemId: current?.item_id ?? "", baseVersion: current?.version ?? 0 }));
        setPending(null);
        setError(null);
        setNotice(current ? "Latest kitchen version loaded. Review the outcome again before recording it." : "Latest kitchen records loaded. The selected item is no longer available; choose a current item before reviewing again.");
      }
    } catch (caught) {
      if (!isCurrent(controller, expectedScope)) return;
      setRecords(null);
      setError(errorDetails(caught));
    } finally {
      finish(controller);
    }
  }

  function selectItem(itemId: string) {
    const selected = records?.find((record) => record.item_id === itemId);
    setSelectedItemId(selected?.item_id ?? "");
    setDraft((previous) => ({ ...previous, itemId: selected?.item_id ?? "", baseVersion: selected?.version ?? 0, outcomeId: "" }));
    setError(null);
    setNotice("");
  }

  function reviewOutcome() {
    if (!scopeReady || !selected || pending || operation) return;
    setError(null);
    setNotice("");
    try {
      const withId = { ...draft, outcomeId: createOutcomeId(), itemId: selected.item_id, baseVersion: selected.version };
      const command = buildRecordOutcomeCommand(withId, createOutcomeIdempotencyKey(), selected);
      setDraft(withId);
      setPending({ command, itemName: selected.name, stockAmount: selected.amount, stockUnit: selected.unit, localTime: withId.occurredAtLocal, timeZone, status: "ready" });
    } catch (caught) {
      setError(errorDetails(caught));
    }
  }

  async function sendPending() {
    if (!scopeReady || !pending || operation || busyRef.current || pending.status === "conflict" || pending.status === "rejected") return;
    const exactPending = pending;
    const expectedScope = scopeKey;
    busyRef.current = true;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setOperation("write");
    setError(null);
    setNotice("");
    try {
      const token = await getIdToken();
      if (!isCurrent(controller, expectedScope)) return;
      const response = await canonicalRequest("outcomes", token, householdId, { method: "POST", body: exactPending.command, signal: controller.signal });
      if (!isCurrent(controller, expectedScope)) return;
      const saved = parseRecordOutcomeResult(response, exactPending.command);
      setPending(null);
      setRecords(null);
      setSelectedItemId("");
      setDraft(newDraft());
      setNotice(`Outcome recorded for ${exactPending.itemName}. Kitchen version ${saved.itemVersion}. Reference ${saved.requestId}.`);
      try {
        onCommitted();
      } catch {
        setNotice("The outcome was recorded, but linked records could not refresh. Reload Kitchen to see the current version.");
      }
    } catch (caught) {
      if (!isCurrent(controller, expectedScope)) return;
      setRecords(null);
      setError(errorDetails(caught));
      setPending({ ...exactPending, status: caught instanceof CanonicalApiError && caught.code === "conflict" ? "conflict" : isAmbiguous(caught) ? "ambiguous" : "rejected" });
    } finally {
      finish(controller);
    }
  }

  function updateType(value: CanonicalOutcomeType) {
    setDraft((previous) => ({ ...previous, outcomeType: value, storage: value === "STORED" ? previous.storage : "" }));
  }

  function updateOccurredAt(value: string) {
    setDraft((previous) => ({ ...previous, occurredAtLocal: value }));
    const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolvedZone) setTimeZone(resolvedZone);
  }

  const selected = records?.find((record) => record.item_id === selectedItemId);
  const locked = !scopeReady || operation !== null || pending !== null;
  const canRetry = pending?.status === "ambiguous";

  return <section aria-labelledby="outcome-controls-title" className="space-y-5">
    <header>
      <Badge tone={enabled ? "green" : "amber"} className="mb-3">{enabled ? "REVIEW ACTUAL OUTCOME" : "OUTCOME RECORDING UNAVAILABLE"}</Badge>
      <Heading id="outcome-controls-title" as="h2">Record what happened</Heading>
      <p className="mt-2 text-sm leading-relaxed text-muted">Choose Used, Stored, Discarded or Composted. Handover is recorded through the separate eligible share flow.</p>
    </header>

    {!enabled && <Card role="status" className="border border-line bg-surface-muted p-4 text-sm leading-relaxed text-muted">Outcome recording is unavailable in this environment. These controls will not send read or write requests.</Card>}
    {enabled && !/^[A-Za-z0-9_-]{1,128}$/.test(householdId) && <Card role="status" className="border border-line bg-surface-muted p-4 text-sm leading-relaxed text-muted">Choose a valid household in the account section before loading or recording an outcome.</Card>}

    <Card className="space-y-4 border border-line p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><Heading as="h3">Kitchen item</Heading><p className="mt-1 text-sm leading-relaxed text-muted">Load current records, then select the item whose outcome you personally observed.</p></div>
        <Button variant="secondary" onClick={() => void loadKitchen()} disabled={!scopeReady || operation !== null || pending !== null} aria-busy={operation === "load"}>{operation === "load" ? "Loading…" : "Load current kitchen"}</Button>
      </div>
      {records && <p role="status" className="text-xs text-muted">{records.length === 0 ? "No kitchen records are available." : `${records.length} current ${records.length === 1 ? "record" : "records"} loaded. Reload after a conflict before reviewing another outcome.`}</p>}
      {records && records.length > 0 && <div className="space-y-2">
        <label htmlFor="outcome-kitchen-item" className="block text-sm font-semibold text-foreground">Item</label>
        <select id="outcome-kitchen-item" className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={selectedItemId} onChange={(event) => selectItem(event.target.value)} disabled={locked}>
          <option value="">Choose a kitchen item</option>
          {records.map((record) => <option key={record.item_id} value={record.item_id}>{record.name} · {record.amount === null ? "amount unknown" : `${record.amount} ${record.unit}`} · v${record.version}</option>)}
        </select>
      </div>}
      {selected && <div className="rounded-control bg-surface-muted p-4 text-sm leading-relaxed">
        <p className="font-semibold text-foreground">Latest confirmed observation: version {selected.version}</p>
        <p className="mt-1 text-muted">{selected.amount === null ? "Current amount is unknown." : `Current amount: ${selected.amount} ${selected.unit}.`} Latest confirmation (UTC): {selected.observed_at}.</p>
      </div>}
    </Card>

    <Card className="space-y-4 border border-line p-5 sm:p-6">
      <Heading as="h3">Observed outcome</Heading>
      <fieldset disabled={locked || !selected} className="space-y-4 disabled:opacity-70">
        <div className="space-y-2"><label htmlFor="outcome-type" className="block text-sm font-semibold text-foreground">What happened?</label><select id="outcome-type" className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={draft.outcomeType} onChange={(event) => updateType(event.target.value as CanonicalOutcomeType)}><option value="USED">Used</option><option value="STORED">Stored</option><option value="DISCARDED">Discarded</option><option value="COMPOSTED">Composted</option></select></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><label htmlFor="outcome-amount" className="block text-sm font-semibold text-foreground">Observed amount <span className="font-normal text-muted">(leave blank if unknown)</span></label><Input id="outcome-amount" type="number" min="0" max="1000000" step="any" inputMode="decimal" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></div>
          <div className="space-y-2"><label htmlFor="outcome-unit" className="block text-sm font-semibold text-foreground">Unit <span className="font-normal text-muted">(required with amount)</span></label><Input id="outcome-unit" value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} maxLength={32} placeholder="e.g. piece, g, ml" /></div>
        </div>
        <div className="space-y-2"><label htmlFor="outcome-measurement-basis" className="block text-sm font-semibold text-foreground">Amount basis</label><select id="outcome-measurement-basis" className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={draft.measurementBasis} onChange={(event) => setDraft({ ...draft, measurementBasis: event.target.value as MeasurementBasis })}><option value="UNKNOWN">Unknown amount</option><option value="MEASURED">Measured</option><option value="USER_ESTIMATED">My estimate</option></select><p className="text-xs text-muted">An amount is never inferred. Enter both amount and unit, and identify it as measured or estimated.</p></div>
        {draft.outcomeType === "STORED" && <div className="space-y-2"><label htmlFor="outcome-storage" className="block text-sm font-semibold text-foreground">Where was it stored?</label><Input id="outcome-storage" value={draft.storage} onChange={(event) => setDraft({ ...draft, storage: event.target.value })} maxLength={120} required placeholder="e.g. freezer, top shelf" /></div>}
        <div className="space-y-2"><label htmlFor="outcome-occurred-at" className="block text-sm font-semibold text-foreground">When did this happen?</label><Input id="outcome-occurred-at" type="datetime-local" step="60" value={draft.occurredAtLocal} onChange={(event) => updateOccurredAt(event.target.value)} required /><p className="text-xs leading-relaxed text-muted">Enter the actual local date and time ({timeZone}). It is sent as a UTC timestamp. It must be after the latest confirmed observation and no more than five minutes in the future.</p></div>
      </fieldset>
      {selected && <div className="space-y-3"><p className="text-xs text-muted">Selected item {selected.item_id} · base version {selected.version}. Stock will only change according to this explicit outcome and the quantity you record.</p><Button variant="secondary" onClick={reviewOutcome} disabled={locked}>Review outcome</Button></div>}
    </Card>

    {error && <Card role="alert" className="border border-danger/25 bg-danger-soft/40 p-4"><p className="text-sm font-semibold text-danger">{error.message}</p>{error.requestId && <p className="mt-1 text-xs text-muted">Request reference: {error.requestId}</p>}</Card>}
    {notice && <Card role="status" className="border border-primary/15 bg-primary-soft p-4 text-sm leading-relaxed text-primary">{notice}</Card>}
    {pending && <OutcomeReview pending={pending} sending={operation === "write"} canRetry={canRetry} onConfirm={() => void sendPending()} onRetry={() => void sendPending()} onReload={() => void loadKitchen(true)} />}
  </section>;
}

function OutcomeReview({ pending, sending, canRetry, onConfirm, onRetry, onReload }: { pending: PendingOutcome; sending: boolean; canRetry: boolean; onConfirm: () => void; onRetry: () => void; onReload: () => void }) {
  const command = pending.command;
  const stockEffect = command.outcome_type === "STORED"
    ? "Storage is updated; this outcome does not deduct kitchen quantity."
    : command.amount === null
      ? pending.stockAmount === null ? "The amount and current stock are unknown. No quantity is inferred." : "The outcome amount is unknown, so the previously known kitchen quantity will be marked unknown."
      : pending.stockAmount === null
        ? `This records ${command.amount} ${command.unit} as ${command.outcome_type.toLowerCase()}. Current stock remains unknown.`
        : `This records ${command.amount} ${command.unit}; current stock is ${pending.stockAmount} ${pending.stockUnit}. The backend checks the unit and prevents a negative balance.`;
  return <Card className="space-y-4 border-2 border-primary/20 p-5 sm:p-6">
    <div><Badge tone={pending.status === "conflict" ? "amber" : "green"} className="mb-3">{pending.status === "conflict" ? "RELOAD REQUIRED" : "PENDING OUTCOME"}</Badge><Heading as="h3">{pending.status === "conflict" ? "Kitchen record changed" : "Review before recording"}</Heading><p className="mt-1 text-sm leading-relaxed text-muted">{pending.status === "conflict" ? "This outcome was rejected because the kitchen record changed. Reload the current item and review a new command." : "The exact outcome below will be sent to this household only after you confirm."}</p></div>
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
      <PreviewRow label="Item" value={pending.itemName} /><PreviewRow label="Record ID" value={command.item_id} /><PreviewRow label="Base version" value={String(command.base_version)} /><PreviewRow label="Outcome" value={command.outcome_type} /><PreviewRow label="Outcome ID" value={command.outcome_id} /><PreviewRow label="Schema version" value={String(command.schema_version)} />
      <PreviewRow label="Observed amount" value={command.amount === null ? "Unknown" : `${command.amount} ${command.unit} · ${command.measurement_basis}`} />
      <PreviewRow label="Measurement basis" value={command.measurement_basis} /><PreviewRow label="Storage location" value={command.storage ?? "Not applicable"} />
      <PreviewRow label="Entered local time" value={`${pending.localTime} · ${pending.timeZone}`} /><PreviewRow label="Stored timestamp (UTC)" value={command.occurred_at} /><PreviewRow label="Effect" value={stockEffect} />
    </dl>
    <p className="break-all text-xs text-muted">Idempotency key: {command.idempotency_key}</p>
    {(pending.status === "ready" || pending.status === "ambiguous") && <p role="status" className="text-sm text-muted">The app will not retry automatically. If the result is unclear, retrying sends this same payload and key.</p>}
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {pending.status === "ready" && <Button onClick={onConfirm} disabled={sending} aria-busy={sending}>{sending ? "Recording outcome…" : "Confirm and record outcome"}</Button>}
      {canRetry && <Button onClick={onRetry} disabled={sending} aria-busy={sending}>Retry this exact outcome</Button>}
      <Button variant="secondary" onClick={onReload} disabled={sending}>{pending.status === "conflict" ? "Reload current item and review again" : "Discard outcome and reload Kitchen"}</Button>
    </div>
  </Card>;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-muted">{label}</dt><dd className="mt-0.5 break-words font-medium text-foreground">{value}</dd></div>;
}
