"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { readCanonicalRecords, type KitchenObservation, type ShoppingEntry } from "@/lib/canonical-api";
import { CanonicalApiError, canonicalRequest } from "@/lib/canonical-transport";
import {
  buildFoodObservationCommand,
  buildShoppingCommand,
  CommandValidationError,
  createIdempotencyKey,
  createOpaqueId,
  parseFoodConfirmationResult,
  parseShoppingSaveResult,
  type FoodDraft,
  type FoodObservationCommand,
  type ShoppingCommand,
  type ShoppingDraft,
} from "@/lib/canonical-commands";

export type CanonicalCommandControlsProps = {
  getIdToken: () => Promise<string>;
  householdId: string;
  enabled: boolean;
  onCommitted: () => void;
};

type PendingCommand =
  | { kind: "kitchen"; command: FoodObservationCommand; status: "ready" | "ambiguous" | "conflict" | "rejected" }
  | { kind: "shopping"; command: ShoppingCommand; status: "ready" | "ambiguous" | "conflict" | "rejected" };

type WriteError = { message: string; code?: string; requestId?: string };
type Operation = "load-kitchen" | "load-shopping" | "write-kitchen" | "write-shopping" | null;

const emptyFoodDraft = (): FoodDraft => ({ itemId: "", baseVersion: 0, name: "", amount: "", unit: "", dateValue: "", dateType: "UNKNOWN", storage: "" });
const emptyShoppingDraft = (): ShoppingDraft => ({ entryId: "", baseVersion: 0, itemName: "", desiredAmount: "", unit: "" });

function readableError(error: unknown): WriteError {
  if (error instanceof CanonicalApiError) return { message: error.message, code: error.code, requestId: error.requestId };
  if (error instanceof Error) return { message: error.message };
  return { message: "The request did not complete." };
}

function isAmbiguous(error: unknown): boolean {
  if (error instanceof CanonicalApiError) return ["network", "timeout", "unavailable", "invalid_response", "unexpected"].includes(error.code);
  if (error instanceof CommandValidationError) return true;
  return true;
}

export function CanonicalCommandControls({ getIdToken, householdId, enabled, onCommitted }: CanonicalCommandControlsProps) {
  const [kitchenRecords, setKitchenRecords] = useState<KitchenObservation[] | null>(null);
  const [shoppingRecords, setShoppingRecords] = useState<ShoppingEntry[] | null>(null);
  const [foodDraft, setFoodDraft] = useState<FoodDraft>(emptyFoodDraft);
  const [shoppingDraft, setShoppingDraft] = useState<ShoppingDraft>(emptyShoppingDraft);
  const [pending, setPending] = useState<PendingCommand | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [readError, setReadError] = useState<WriteError | null>(null);
  const [writeError, setWriteError] = useState<WriteError | null>(null);
  const [notice, setNotice] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const operationRef = useRef(false);
  const mountedRef = useRef(false);
  const scopeRef = useRef("");
  const scopeKey = `${enabled ? "enabled" : "disabled"}:${householdId}`;
  scopeRef.current = scopeKey;
  const scopeReady = enabled && /^[A-Za-z0-9_-]{1,128}$/.test(householdId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
      operationRef.current = false;
    };
  }, []);

  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    operationRef.current = false;
    return () => requestRef.current?.abort();
  }, [scopeKey]);

  async function loadRecords(kind: "kitchen" | "shopping", discardPending = false) {
    if (!scopeReady || operation !== null || operationRef.current) return;
    const currentScope = scopeKey;
    operationRef.current = true;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setOperation(kind === "kitchen" ? "load-kitchen" : "load-shopping");
    setReadError(null);
    setNotice("");
    try {
      const token = await getIdToken();
      if (!isCurrent(controller, currentScope)) return;
      const response = await readCanonicalRecords(kind, token, householdId, controller.signal);
      if (!isCurrent(controller, currentScope)) return;
      if (response.kind === "kitchen") {
        const records = response.records;
        setKitchenRecords(records);
        if (discardPending && pending?.kind === "kitchen") {
          const selected = records.find((record) => record.item_id === foodDraft.itemId);
          setFoodDraft(selected ? foodDraftFromRecord(selected) : { ...foodDraft, itemId: "", baseVersion: 0 });
          setPending(null);
          setWriteError(null);
          setNotice("Latest kitchen records loaded. Review the form again before sending a new command.");
        }
      } else {
        const records = response.records;
        setShoppingRecords(records);
        if (discardPending && pending?.kind === "shopping") {
          const selected = records.find((record) => record.entry_id === shoppingDraft.entryId);
          setShoppingDraft(selected ? shoppingDraftFromRecord(selected) : { ...shoppingDraft, entryId: "", baseVersion: 0 });
          setPending(null);
          setWriteError(null);
          setNotice("Latest shopping records loaded. Review the form again before sending a new command.");
        }
      }
    } catch (error) {
      if (!isCurrent(controller, currentScope)) return;
      setKitchenRecords(null);
      setShoppingRecords(null);
      setReadError(readableError(error));
    } finally {
      finishOperation(controller);
    }
  }

  function isCurrent(controller: AbortController, currentScope: string): boolean {
    return mountedRef.current && !controller.signal.aborted && scopeRef.current === currentScope;
  }

  function finishOperation(controller: AbortController) {
    if (requestRef.current !== controller) return;
    requestRef.current = null;
    operationRef.current = false;
    setOperation(null);
  }

  function reviewFood(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scopeReady || pending || operation) return;
    setWriteError(null);
    setNotice("");
    try {
      const draft = { ...foodDraft, itemId: foodDraft.itemId || createOpaqueId("food") };
      const command = buildFoodObservationCommand(draft, createIdempotencyKey());
      setFoodDraft(draft);
      setPending({ kind: "kitchen", command, status: "ready" });
    } catch (error) { setWriteError(readableError(error)); }
  }

  function reviewShopping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scopeReady || pending || operation) return;
    setWriteError(null);
    setNotice("");
    try {
      const draft = { ...shoppingDraft, entryId: shoppingDraft.entryId || createOpaqueId("shopping") };
      const command = buildShoppingCommand(draft, createIdempotencyKey());
      setShoppingDraft(draft);
      setPending({ kind: "shopping", command, status: "ready" });
    } catch (error) { setWriteError(readableError(error)); }
  }

  async function sendPending() {
    if (!scopeReady || !pending || operation || operationRef.current || pending.status === "conflict") return;
    const exactPending = pending;
    const currentScope = scopeKey;
    operationRef.current = true;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setOperation(exactPending.kind === "kitchen" ? "write-kitchen" : "write-shopping");
    setWriteError(null);
    setNotice("");
    try {
      const token = await getIdToken();
      if (!isCurrent(controller, currentScope)) return;
      if (exactPending.kind === "kitchen") {
        const response = await canonicalRequest("facts/confirm", token, householdId, { method: "POST", body: exactPending.command, signal: controller.signal });
        if (!isCurrent(controller, currentScope)) return;
        const committed = parseFoodConfirmationResult(response, exactPending.command);
        setPending(null);
        setKitchenRecords(null);
        setFoodDraft(emptyFoodDraft());
        setNotice(`Kitchen record confirmed at version ${committed.itemVersion}. Reference ${committed.requestId}.`);
      } else {
        const response = await canonicalRequest("shopping", token, householdId, { method: "POST", body: exactPending.command, signal: controller.signal });
        if (!isCurrent(controller, currentScope)) return;
        const committed = parseShoppingSaveResult(response, exactPending.command);
        setPending(null);
        setShoppingRecords(null);
        setShoppingDraft(emptyShoppingDraft());
        setNotice(`Shopping entry saved at version ${committed.entryVersion}. Reference ${committed.requestId}.`);
      }
      try {
        onCommitted();
      } catch {
        setNotice("The change was saved, but the page could not refresh its linked records. Reload current records to see the saved version.");
      }
    } catch (error) {
      if (!isCurrent(controller, currentScope)) return;
      setKitchenRecords(null);
      setShoppingRecords(null);
      setWriteError(readableError(error));
      setPending({ ...exactPending, status: error instanceof CanonicalApiError && error.code === "conflict" ? "conflict" : isAmbiguous(error) ? "ambiguous" : "rejected" });
    } finally {
      finishOperation(controller);
    }
  }

  function foodDraftFromRecord(record: KitchenObservation): FoodDraft {
    return { itemId: record.item_id, baseVersion: record.version, name: record.name, amount: record.amount === null ? "" : String(record.amount), unit: record.unit ?? "", dateValue: record.date_value ?? "", dateType: record.date_type as FoodDraft["dateType"], storage: record.storage ?? "" };
  }

  function shoppingDraftFromRecord(record: ShoppingEntry): ShoppingDraft {
    return { entryId: record.entry_id, baseVersion: record.version, itemName: record.item_name, desiredAmount: record.desired_amount === null ? "" : String(record.desired_amount), unit: record.unit ?? "" };
  }

  function changeFoodSelection(itemId: string) {
    setWriteError(null);
    setNotice("");
    if (itemId === "") { setFoodDraft(emptyFoodDraft()); return; }
    const record = kitchenRecords?.find((candidate) => candidate.item_id === itemId);
    if (record) setFoodDraft(foodDraftFromRecord(record));
  }

  function changeShoppingSelection(entryId: string) {
    setWriteError(null);
    setNotice("");
    if (entryId === "") { setShoppingDraft(emptyShoppingDraft()); return; }
    const record = shoppingRecords?.find((candidate) => candidate.entry_id === entryId);
    if (record) setShoppingDraft(shoppingDraftFromRecord(record));
  }

  const locked = !scopeReady || operation !== null || pending !== null;
  const canRetrySame = pending !== null && pending.status !== "conflict" && pending.status !== "rejected";

  return <section aria-labelledby="canonical-command-title" className="space-y-5">
    <header>
      <Badge tone={enabled ? "green" : "amber"} className="mb-3">{enabled ? "REVIEW HOUSEHOLD CHANGES" : "CHANGES UNAVAILABLE"}</Badge>
      <Heading id="canonical-command-title" as="h2">Update household records</Heading>
      <p className="mt-2 text-sm leading-relaxed text-muted">These controls write only after you review the exact command and confirm it. They never use the local demo store.</p>
    </header>

    {!enabled && <Card role="status" className="border border-line bg-surface-muted p-4 text-sm leading-relaxed text-muted">Household changes are not enabled for this app yet.</Card>}
    {enabled && !/^[A-Za-z0-9_-]{1,128}$/.test(householdId) && <Card role="status" className="border border-line bg-surface-muted p-4 text-sm leading-relaxed text-muted">Choose a valid household in the account section before loading or changing household records.</Card>}

    <Card className="space-y-4 border border-line p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><Heading as="h3">Kitchen fact</Heading><p className="mt-1 text-sm leading-relaxed text-muted">Create a new observation or edit a record read from this household. Known dates are labeled as user provided, and unknown dates stay unknown.</p></div><Button size="sm" variant="secondary" onClick={() => void loadRecords("kitchen")} disabled={!scopeReady || operation !== null || (pending !== null && pending.status !== "conflict")} aria-busy={operation === "load-kitchen"}>{operation === "load-kitchen" ? "Loading…" : "Load current kitchen"}</Button></div>
      {kitchenRecords && <p role="status" className="text-xs text-muted">{kitchenRecords.length === 0 ? "No current kitchen records." : `${kitchenRecords.length} current ${kitchenRecords.length === 1 ? "record" : "records"} loaded.`} Read again before editing after a conflict.</p>}
      <form onSubmit={reviewFood} className="space-y-4">
        <fieldset disabled={locked} className="space-y-4 disabled:opacity-70">
          {kitchenRecords && kitchenRecords.length > 0 && <div className="space-y-2"><label htmlFor="canonical-food-record" className="block text-sm font-semibold text-foreground">Record to edit</label><select id="canonical-food-record" className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={foodDraft.itemId} onChange={(event) => changeFoodSelection(event.target.value)}><option value="">Create a new kitchen record</option>{kitchenRecords.map((record) => <option key={record.item_id} value={record.item_id}>{record.name} · version {record.version}{record.amount === 0 ? " · zero amount" : ""}</option>)}</select></div>}
          <div className="space-y-2"><label htmlFor="canonical-food-name" className="block text-sm font-semibold text-foreground">Item name</label><Input id="canonical-food-name" value={foodDraft.name} onChange={(event) => setFoodDraft({ ...foodDraft, name: event.target.value })} maxLength={120} required /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="canonical-food-amount" className="block text-sm font-semibold text-foreground">Amount <span className="font-normal text-muted">(optional)</span></label><Input id="canonical-food-amount" type="number" min="0" max="1000000" step="any" inputMode="decimal" value={foodDraft.amount} onChange={(event) => setFoodDraft({ ...foodDraft, amount: event.target.value })} /></div><div className="space-y-2"><label htmlFor="canonical-food-unit" className="block text-sm font-semibold text-foreground">Unit <span className="font-normal text-muted">(required with amount)</span></label><Input id="canonical-food-unit" value={foodDraft.unit} onChange={(event) => setFoodDraft({ ...foodDraft, unit: event.target.value })} maxLength={32} placeholder="e.g. piece, g, ml" /></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="canonical-food-date" className="block text-sm font-semibold text-foreground">Date <span className="font-normal text-muted">(optional)</span></label><Input id="canonical-food-date" type="date" value={foodDraft.dateValue} onChange={(event) => setFoodDraft({ ...foodDraft, dateValue: event.target.value })} /></div><div className="space-y-2"><label htmlFor="canonical-food-date-type" className="block text-sm font-semibold text-foreground">Date type</label><select id="canonical-food-date-type" className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={foodDraft.dateType} onChange={(event) => setFoodDraft({ ...foodDraft, dateType: event.target.value as FoodDraft["dateType"] })}><option value="UNKNOWN">Unknown</option><option value="USE_BY">Use by</option><option value="EXPIRY">Expiry</option><option value="BEST_BEFORE">Best before</option><option value="USER_TARGET">My target date</option></select><p className="text-xs text-muted">A date is recorded as user provided. This label does not certify safety.</p></div></div>
          <div className="space-y-2"><label htmlFor="canonical-food-storage" className="block text-sm font-semibold text-foreground">Storage note <span className="font-normal text-muted">(optional)</span></label><Input id="canonical-food-storage" value={foodDraft.storage} onChange={(event) => setFoodDraft({ ...foodDraft, storage: event.target.value })} maxLength={120} placeholder="Where it is stored" /></div>
          <p className="text-xs text-muted">{foodDraft.itemId ? `Record ${foodDraft.itemId} · base version ${foodDraft.baseVersion}` : "A new record ID is generated when you review this command."}</p>
        </fieldset>
        <Button type="submit" variant="secondary" disabled={locked}>Review kitchen confirmation</Button>
      </form>
    </Card>

    <Card className="space-y-4 border border-line p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><Heading as="h3">Shopping entry</Heading><p className="mt-1 text-sm leading-relaxed text-muted">Create or edit an entry in this household’s household shopping list. Saving a list entry does not imply a purchase or change kitchen stock.</p></div><Button size="sm" variant="secondary" onClick={() => void loadRecords("shopping")} disabled={!scopeReady || operation !== null || (pending !== null && pending.status !== "conflict")} aria-busy={operation === "load-shopping"}>{operation === "load-shopping" ? "Loading…" : "Load current shopping"}</Button></div>
      {shoppingRecords && <p role="status" className="text-xs text-muted">{shoppingRecords.length === 0 ? "No current shopping entries." : `${shoppingRecords.length} current ${shoppingRecords.length === 1 ? "entry" : "entries"} loaded.`} Read again before editing after a conflict.</p>}
      <form onSubmit={reviewShopping} className="space-y-4">
        <fieldset disabled={locked} className="space-y-4 disabled:opacity-70">
          {shoppingRecords && shoppingRecords.length > 0 && <div className="space-y-2"><label htmlFor="canonical-shopping-record" className="block text-sm font-semibold text-foreground">Entry to edit</label><select id="canonical-shopping-record" className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={shoppingDraft.entryId} onChange={(event) => changeShoppingSelection(event.target.value)}><option value="">Create a new shopping entry</option>{shoppingRecords.map((record) => <option key={record.entry_id} value={record.entry_id}>{record.item_name} · version {record.version}</option>)}</select></div>}
          <div className="space-y-2"><label htmlFor="canonical-shopping-name" className="block text-sm font-semibold text-foreground">Item name</label><Input id="canonical-shopping-name" value={shoppingDraft.itemName} onChange={(event) => setShoppingDraft({ ...shoppingDraft, itemName: event.target.value })} maxLength={120} required /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="canonical-shopping-amount" className="block text-sm font-semibold text-foreground">Desired amount <span className="font-normal text-muted">(optional)</span></label><Input id="canonical-shopping-amount" type="number" min="0" max="1000000" step="any" inputMode="decimal" value={shoppingDraft.desiredAmount} onChange={(event) => setShoppingDraft({ ...shoppingDraft, desiredAmount: event.target.value })} /></div><div className="space-y-2"><label htmlFor="canonical-shopping-unit" className="block text-sm font-semibold text-foreground">Unit <span className="font-normal text-muted">(required with amount)</span></label><Input id="canonical-shopping-unit" value={shoppingDraft.unit} onChange={(event) => setShoppingDraft({ ...shoppingDraft, unit: event.target.value })} maxLength={32} placeholder="e.g. piece, g, ml" /></div></div>
          <p className="text-xs text-muted">{shoppingDraft.entryId ? `Entry ${shoppingDraft.entryId} · base version ${shoppingDraft.baseVersion}` : "A new entry ID is generated when you review this command."}</p>
        </fieldset>
        <Button type="submit" variant="secondary" disabled={locked}>Review shopping save</Button>
      </form>
    </Card>

    {readError && <Card role="alert" className="border border-danger/25 bg-danger-soft/40 p-4"><p className="text-sm font-semibold text-danger">Could not load current records: {readError.message}</p>{readError.requestId && <p className="mt-1 text-xs text-muted">Request reference: {readError.requestId}</p>}</Card>}
    {writeError && <Card role="alert" className="border border-danger/25 bg-danger-soft/40 p-4"><p className="text-sm font-semibold text-danger">{writeError.message}</p>{writeError.requestId && <p className="mt-1 text-xs text-muted">Request reference: {writeError.requestId}</p>}</Card>}
    {notice && <Card role="status" className="border border-primary/15 bg-primary-soft p-4 text-sm leading-relaxed text-primary">{notice}</Card>}

    {pending && <PendingReview pending={pending} sending={operation === "write-kitchen" || operation === "write-shopping"} onConfirm={() => void sendPending()} onRetry={() => void sendPending()} onDiscardAndReload={() => void loadRecords(pending.kind, true)} canRetrySame={canRetrySame} />}
  </section>;
}

function PendingReview({ pending, sending, onConfirm, onRetry, onDiscardAndReload, canRetrySame }: { pending: PendingCommand; sending: boolean; onConfirm: () => void; onRetry: () => void; onDiscardAndReload: () => void; canRetrySame: boolean }) {
  const isFood = pending.kind === "kitchen";
  return <Card className="space-y-4 border-2 border-primary/20 p-5 sm:p-6">
    <div><Badge tone={pending.status === "conflict" ? "amber" : "green"} className="mb-3">{pending.status === "conflict" ? "REVIEW REQUIRED" : "PENDING COMMAND"}</Badge><Heading as="h3">{pending.status === "conflict" ? "Records changed" : "Review before sending"}</Heading><p className="mt-1 text-sm leading-relaxed text-muted">{pending.status === "conflict" ? "This command was rejected because the household record changed. Reload the latest record, review it, and create a new command." : "The exact fields below will be sent once you confirm. This action writes to the selected household."}</p></div>
    {isFood ? <FoodPreview command={(pending as Extract<PendingCommand, { kind: "kitchen" }>).command} /> : <ShoppingPreview command={(pending as Extract<PendingCommand, { kind: "shopping" }>).command} />}
    <p className="break-all text-xs text-muted">Retry key: {isFood ? (pending as Extract<PendingCommand, { kind: "kitchen" }>).command.idempotency_key : (pending as Extract<PendingCommand, { kind: "shopping" }>).command.idempotency_key}</p>
    {(pending.status === "ambiguous" || pending.status === "ready") && <p role="status" className="text-sm text-muted">If the connection failed before the response arrived, retrying uses this same payload and key. The app will not retry automatically.</p>}
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {pending.status === "ready" && <Button onClick={onConfirm} disabled={sending} aria-busy={sending}>{sending ? "Sending command…" : "Confirm and send"}</Button>}
      {canRetrySame && pending.status !== "ready" && <Button onClick={onRetry} disabled={sending} aria-busy={sending}>Retry this exact command</Button>}
      <Button variant="secondary" onClick={onDiscardAndReload} disabled={sending}>{pending.status === "conflict" ? "Reload latest and review again" : "Discard command and reload before editing"}</Button>
    </div>
  </Card>;
}

function FoodPreview({ command }: { command: FoodObservationCommand }) {
  const fact = command.observations[0];
  return <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2"><PreviewRow label="Item" value={fact.name} /><PreviewRow label="Record ID" value={fact.item_id} /><PreviewRow label="Base version" value={String(fact.base_version)} /><PreviewRow label="Amount" value={fact.amount === null ? "Unknown" : `${fact.amount} ${fact.unit}`} /><PreviewRow label="Date" value={fact.date_value ? `${fact.date_value} · ${fact.date_type} · user provided` : "Unknown"} /><PreviewRow label="Storage" value={fact.storage || "Not recorded"} /></dl>;
}

function ShoppingPreview({ command }: { command: ShoppingCommand }) {
  const entry = command.entry;
  return <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2"><PreviewRow label="Item" value={entry.item_name} /><PreviewRow label="Entry ID" value={entry.entry_id} /><PreviewRow label="Base version" value={String(entry.base_version)} /><PreviewRow label="Desired amount" value={entry.desired_amount === null ? "Not specified" : `${entry.desired_amount} ${entry.unit}`} /><PreviewRow label="Effect" value="Adds or updates a list entry only; it does not change kitchen stock or record a purchase." /></dl>;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-muted">{label}</dt><dd className="mt-0.5 break-words font-medium text-foreground">{value}</dd></div>;
}
