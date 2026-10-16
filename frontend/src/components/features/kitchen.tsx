"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { LiveDestinationNotice, useLiveRecords } from "@/components/account/live-destination";
import type { KitchenObservation } from "@/lib/canonical-api";
import type { DateType } from "@/lib/contracts";
import { useLiveHousehold } from "@/lib/live-household";
import { CanonicalApiError } from "@/lib/canonical-transport";
import { submitIntake, type IntakeCommand, type IntakeEntry, type IntakeResult } from "@/lib/canonical-intake";
import { Notice, PageIntro, Panel, QuietLink, UnitLabel } from "./ui";
import { IntakeReview } from "./intake-review";

function dateLabel(date: string | null, type: DateType) {
  if (!date || type === "UNKNOWN") return "Date unknown";
  return `${type.toLowerCase().replaceAll("_", " ")} · ${date}`;
}

export function KitchenInventory() {
  const live = useLiveRecords("kitchen");
  const items = live.records as KitchenObservation[];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = items.filter((item) => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (filter === "all" || (item.amount === null || item.date_type === "UNKNOWN")));
  return <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:pt-10">
    <PageIntro eyebrow="Kitchen" title="Know what you have" description="Review confirmed household records returned by the API. Dates and amounts stay unknown until recorded." />
    <LiveDestinationNotice />
    {live.phase === "ready" && <div className="mb-5 grid grid-cols-2 gap-3"><Panel className="p-4"><p className="text-sm text-muted">Recorded items</p><p className="mt-1 text-2xl font-semibold">{items.length}</p></Panel><Panel className="p-4"><p className="text-sm text-muted">Need a check</p><p className="mt-1 text-2xl font-semibold">{items.filter((item) => item.amount === null || item.date_type === "UNKNOWN").length}</p></Panel></div>}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="kitchen-search">Search kitchen</label><Input id="kitchen-search" placeholder="Search your kitchen" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="flex gap-2"><button onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={`min-h-11 rounded-full px-4 text-sm font-medium ${filter === "all" ? "bg-primary text-white" : "bg-surface-muted text-primary"}`}>All items</button><button onClick={() => setFilter("unknown")} aria-pressed={filter === "unknown"} className={`min-h-11 rounded-full px-4 text-sm font-medium ${filter === "unknown" ? "bg-primary text-white" : "bg-surface-muted text-primary"}`}>Needs a check</button></div></div>
    {live.phase === "loading" && <div role="status"><Panel>Loading household kitchen…</Panel></div>}{live.phase === "error" && <div role="alert"><Panel><p className="text-sm text-danger">{live.error}</p><button className="mt-3 min-h-11 underline" onClick={live.refresh}>Retry</button></Panel></div>}{live.phase === "ready" && (filtered.length === 0 ? <Panel><h2 className="text-lg font-semibold">{items.length ? "No matching food" : "No confirmed food yet"}</h2><p className="mt-2 text-sm text-muted">{items.length ? "Try another search or clear the filter." : "The household API returned an empty kitchen."}</p></Panel> : <div className="grid gap-3 md:grid-cols-2">{filtered.map((item) => <article key={item.item_id} className="rounded-3xl border border-border bg-surface p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-muted">Household record · {item.storage ?? "Storage unknown"}</p><h2 className="mt-1 text-lg font-semibold text-foreground">{item.name}</h2><p className="mt-1 text-sm text-muted"><UnitLabel amount={item.amount} unit={item.unit} /></p><p className="mt-3 border-t border-border pt-3 text-xs text-muted">{dateLabel(item.date_value, item.date_type as DateType)} · observed {new Date(item.observed_at).toLocaleDateString()}</p><p className="mt-2 text-xs text-muted">Check the item yourself. The API record does not assess condition or safety.</p></article>)}</div>)}{live.phase === "idle" && <Panel><p className="text-sm text-muted">Sign in and choose a household to view its Kitchen. No browser demo records are substituted.</p></Panel>}
    <div className="mt-7 grid gap-3 sm:grid-cols-2"><Panel className="bg-surface-muted"><p className="text-xs font-semibold uppercase tracking-wide text-primary">A gentle reminder</p><h2 className="mt-2 text-lg font-semibold">Check, then choose</h2><p className="mt-1 text-sm leading-5 text-muted">A stored date or photo cannot tell whether food is safe to eat. Use your own observations.</p><QuietLink href="/ask">Ask about a meal</QuietLink></Panel><Panel><p className="text-xs font-semibold uppercase tracking-wide text-muted">Recorded activity</p><h2 className="mt-2 text-lg font-semibold">See what you logged</h2><p className="mt-1 text-sm text-muted">Confirmed items and outcomes stay separate from meal ideas.</p><QuietLink href="/activity">Open activity</QuietLink></Panel></div>
  </div>;
}

function UnavailableKitchenFlow({ title, details }: { title: string; details: string }) {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-6 sm:px-6 lg:pt-10"><PageIntro eyebrow="Kitchen · unavailable" title={title} description={details} /><Notice tone="warn">Photo capture, item details, and draft review are unavailable. Account contains manual fact, outcome, shopping, and owner-reported private-sharing controls; changes remain disabled pending live identity and database acceptance.</Notice><Panel><h2 className="text-lg font-semibold">Continue with supported controls</h2><p className="mt-2 text-sm leading-relaxed text-muted">Account controls require a signed-in owner, an explicit household, and enabled command configuration. They confirm each supported change and check current versions.</p><div className="mt-4 flex flex-wrap gap-2"><QuietLink href="/account">Open Account controls</QuietLink><QuietLink href="/kitchen">Back to Kitchen</QuietLink></div></Panel></div>;
}

type IntakeMode = "MANUAL" | "TEXT";

function makeEntries(mode: IntakeMode, values: { name: string; amount: string; unit: string; date: string; dateType: string; storage: string; text: string }): IntakeEntry[] {
  if (mode === "TEXT") {
    const lines = values.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) throw new Error("Enter at least one food name, one per line.");
    if (lines.length > 10) throw new Error("Enter no more than 10 food names at a time.");
    if (lines.some((line) => line.length > 120 || /[\u0000-\u001f\u007f]/.test(line))) throw new Error("Each food name must be 120 characters or fewer.");
    return lines.map((name) => ({ name, amount: null, unit: null, date_value: null, date_type: "UNKNOWN", date_source: null, storage: null }));
  }

  const name = values.name.trim();
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error("Enter a food name up to 120 characters.");
  const amountText = values.amount.trim();
  const enteredAmount = amountText ? Number(amountText) : null;
  if (enteredAmount !== null && (!Number.isFinite(enteredAmount) || enteredAmount < 0 || enteredAmount > 1_000_000)) throw new Error("Enter a positive amount up to 1,000,000, or enter 0 / leave blank for unknown.");
  const amount = enteredAmount === 0 ? null : enteredAmount;
  const unit = amount === null ? null : values.unit;
  if (amount !== null && !unit) throw new Error("Choose a unit for the amount.");
  const dateValue = values.date || null;
  const dateType = dateValue ? values.dateType : "UNKNOWN";
  if (dateValue && dateType === "UNKNOWN") throw new Error("Choose what the date means.");
  return [{ name, amount, unit, date_value: dateValue, date_type: dateType as IntakeEntry["date_type"], date_source: dateValue ? "USER" : null, storage: values.storage || null }];
}

function intakeMessage(error: unknown): string {
  if (error instanceof CanonicalApiError) return error.message;
  return "The intake could not be confirmed. Check the entries and try again.";
}

export function CaptureFood() {
  const household = useLiveHousehold();
  const scopeKey = household.auth === "signed-in" && household.user && household.householdId ? `${household.user.uid}:${household.householdId}` : "no-household";
  return <CaptureFoodForm key={scopeKey} auth={household.auth} user={household.user} householdId={household.householdId} />;
}

function CaptureFoodForm({ auth, user, householdId }: Pick<ReturnType<typeof useLiveHousehold>, "auth" | "user" | "householdId">) {
  const [mode, setMode] = useState<IntakeMode>("MANUAL");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState("");
  const [dateType, setDateType] = useState("UNKNOWN");
  const [storage, setStorage] = useState("");
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "busy" | "error" | "cancelled" | "success">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [pending, setPending] = useState<{ command: IntakeCommand; fingerprint: string } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const enabled = process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true";

  useEffect(() => {
    return () => controller.current?.abort();
  }, []);

  async function send(command: IntakeCommand, fingerprint: string) {
    if (auth !== "signed-in" || !user || !householdId) {
      setError("Sign in and choose an active household before preparing candidates.");
      setPhase("error");
      return;
    }
    if (!enabled) {
      setError("Household changes are disabled for this app. Candidate intake has not been sent.");
      setPhase("error");
      return;
    }
    const requestController = new AbortController();
    controller.current = requestController;
    setPending({ command, fingerprint });
    setPhase("busy");
    setError("");
    setResult(null);
    try {
      const token = await user.getIdToken();
      if (requestController.signal.aborted) return;
      const response = await submitIntake(token, householdId, command, requestController.signal);
      if (!requestController.signal.aborted) {
        setResult(response);
        setPending(null);
        setPhase("success");
      }
    } catch (failure) {
      if (requestController.signal.aborted) {
        setPhase("cancelled");
        setError("You stopped waiting. The service may still have received this request; retry these exact entries to safely check the same intake.");
      } else {
        setPhase("error");
        setError(intakeMessage(failure));
      }
    } finally {
      if (controller.current === requestController) controller.current = null;
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    try {
      const entries = makeEntries(mode, { name, amount, unit, date, dateType, storage, text });
      const fingerprint = JSON.stringify({ source: mode, entries });
      const key = pending?.fingerprint === fingerprint ? pending.command.idempotency_key : crypto.randomUUID();
      void send({ schema_version: 1, idempotency_key: key, source: mode, entries }, fingerprint);
    } catch (failure) {
      setPhase("error");
      setError(failure instanceof Error ? failure.message : "Review the intake fields.");
    }
  }

  let samePendingEntries = false;
  if (pending) {
    try {
      const currentEntries = makeEntries(mode, { name, amount, unit, date, dateType, storage, text });
      samePendingEntries = JSON.stringify({ source: mode, entries: currentEntries }) === pending.fingerprint;
    } catch {
      samePendingEntries = false;
    }
  }

  return <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
    <PageIntro eyebrow="Kitchen · capture" title="Add food candidates" description="Record what you know by hand, or enter a short list of names. These stay as drafts until you review and confirm them." />
    <LiveDestinationNotice />
    <Notice tone="warn">These are unconfirmed candidate drafts. They do not change Kitchen stock. Nothing is confirmed until a later review step.</Notice>
    {!enabled && <Notice tone="info">Candidate intake is disabled by the current app configuration. You can prepare entries, but they will not be sent.</Notice>}

    <Panel className="mt-4">
      <div className="mb-5 flex gap-2" role="group" aria-label="Choose intake type">
        <button type="button" onClick={() => setMode("MANUAL")} aria-pressed={mode === "MANUAL"} className={`min-h-11 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${mode === "MANUAL" ? "bg-primary text-white" : "bg-surface-muted text-primary"}`}>Manual entry</button>
        <button type="button" onClick={() => setMode("TEXT")} aria-pressed={mode === "TEXT"} className={`min-h-11 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${mode === "TEXT" ? "bg-primary text-white" : "bg-surface-muted text-primary"}`}>List of names</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "MANUAL" ? <>
          <label className="block text-sm font-medium" htmlFor="intake-name">Food name<Input id="intake-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. spinach" className="mt-1" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium" htmlFor="intake-amount">Amount <span className="font-normal text-muted">(optional)</span><Input id="intake-amount" type="number" inputMode="decimal" min="0" max="1000000" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Blank or 0 = unknown" className="mt-1" /><span className="mt-1 block text-xs text-muted">Enter a positive amount; 0 leaves the amount unknown.</span></label>
            <label className="block text-sm font-medium" htmlFor="intake-unit">Unit{amount && Number(amount) > 0 && <span className="text-danger"> · required</span>}<select id="intake-unit" required={Boolean(amount && Number(amount) > 0)} disabled={!amount || Number(amount) <= 0} value={unit} onChange={(event) => setUnit(event.target.value)} className="mt-1 min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"><option value="">{amount && Number(amount) > 0 ? "Choose a unit" : "Unknown"}</option>{["g", "kg", "ml", "l", "pieces", "portions"].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium" htmlFor="intake-date">Date <span className="font-normal text-muted">(optional)</span><Input id="intake-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1" /></label>
            <label className="block text-sm font-medium" htmlFor="intake-date-type">Date means{date && <span className="text-danger"> · required</span>}<select id="intake-date-type" required={Boolean(date)} disabled={!date} value={dateType} onChange={(event) => setDateType(event.target.value)} className="mt-1 min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"><option value="UNKNOWN">Unknown</option><option value="USE_BY">Use by</option><option value="EXPIRY">Expiry</option><option value="BEST_BEFORE">Best before</option><option value="USER_TARGET">My target date</option></select></label>
          </div>
          <label className="block text-sm font-medium" htmlFor="intake-storage">Storage <span className="font-normal text-muted">(optional)</span><select id="intake-storage" value={storage} onChange={(event) => setStorage(event.target.value)} className="mt-1 min-h-12 w-full rounded-control border border-line bg-white px-4 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"><option value="">Unknown</option><option value="fridge">Fridge</option><option value="freezer">Freezer</option><option value="pantry">Pantry</option></select></label>
        </> : <>
          <label className="block text-sm font-medium" htmlFor="intake-text">Food names <span className="font-normal text-muted">(one per line, up to 10)</span><textarea id="intake-text" required rows={7} maxLength={3500} value={text} onChange={(event) => setText(event.target.value)} placeholder={"Spinach\nRice\nTomatoes"} className="mt-1 w-full rounded-control border border-line bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" /><span className="mt-1 block text-xs text-muted">Each name is up to 120 characters. Amount, date, and storage stay unknown.</span></label>
        </>}
        {error && <div role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="submit" disabled={phase === "busy" || auth !== "signed-in" || !householdId || !enabled} className="min-h-11 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-55">{phase === "busy" ? "Sending…" : samePendingEntries && (phase === "error" || phase === "cancelled") ? "Retry same entries" : "Prepare candidate drafts"}</button>
          {phase === "busy" ? <button type="button" onClick={() => controller.current?.abort()} className="min-h-11 rounded-full bg-surface-muted px-4 text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Cancel waiting</button> : <QuietLink href="/kitchen">Cancel and return to Kitchen</QuietLink>}
        </div>
        {pending && samePendingEntries && (phase === "error" || phase === "cancelled") && <p className="break-all text-xs text-muted">Retry key retained for these exact entries: {pending.command.idempotency_key}</p>}
        {auth === "loading" && <p role="status" className="text-sm text-muted">Checking sign-in…</p>}
        {auth === "signed-out" && <p className="text-sm text-muted">Sign in and choose a household to prepare candidate drafts.</p>}
        {auth === "signed-in" && !householdId && <p className="text-sm text-muted">Choose an active household above to continue.</p>}
      </form>
    </Panel>

    {phase === "busy" && <div className="mt-4" role="status"><Panel>Sending your candidate intake… No Kitchen stock is changed by this request.</Panel></div>}
    {phase === "success" && result && <section aria-labelledby="candidate-results-title" className="mt-5 space-y-3">
      <Notice tone="success">Candidate intake received. These drafts are still unconfirmed; Kitchen stock has not changed.</Notice>
      <h2 id="candidate-results-title" className="text-xl font-semibold">Candidate drafts <span className="text-base font-normal text-muted">· {result.candidates.length}</span></h2>
      {result.candidates.length === 0 ? <Panel><h3 className="font-semibold">No candidates returned</h3><p className="mt-1 text-sm text-muted">The service returned an empty candidate list. Nothing was added to Kitchen.</p></Panel> : <div className="grid gap-3">{result.candidates.map((candidate) => <article key={candidate.candidate_id} className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Unconfirmed candidate draft</p>
        <h3 className="mt-1 text-lg font-semibold">{candidate.name}</h3>
        <p className="mt-1 text-sm text-muted"><UnitLabel amount={candidate.amount} unit={candidate.unit} /> · {dateLabel(candidate.date_value, candidate.date_type as DateType)}</p>
        <p className="mt-1 text-sm text-muted">Storage: {candidate.storage ?? "Unknown"}</p>
        {candidate.uncertainty.length > 0 && <p className="mt-2 text-xs text-muted">Unknown details: {candidate.uncertainty.map((item) => item === "AMOUNT_UNKNOWN" ? "amount" : item === "DATE_UNKNOWN" ? "date" : "storage").join(", ")}.</p>}
      </article>)}</div>}
      <p className="text-xs text-muted">Intake reference: {result.intake_id}. Review and confirmation are a separate step.</p>
      <div className="flex flex-wrap gap-2"><QuietLink href={`/kitchen/review?id=${encodeURIComponent(result.intake_id)}`}>Review candidates</QuietLink><QuietLink href="/kitchen">Return to Kitchen</QuietLink></div>
    </section>}
  </div>;
}
export function ReviewFood() { return <IntakeReview />; }
export function ItemDetail({ itemId }: { itemId: string }) { return <UnavailableKitchenFlow title="Food record details" details={`The canonical detail view for item ${itemId} is not connected. The Kitchen list contains only records returned by the household API.`} />; }
export function ShareItem({ itemId }: { itemId: string }) { return <UnavailableKitchenFlow title="Private sharing controls" details={`Private sharing commands for item ${itemId} are not connected. Account can show owner-private sharing history, but it cannot prepare or record a new share here.`} />; }
