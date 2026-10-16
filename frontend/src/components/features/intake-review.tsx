"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveHousehold } from "@/lib/live-household";
import { CanonicalApiError } from "@/lib/canonical-transport";
import { confirmIntake, readIntake, type IntakeCandidate, type IntakeConfirmationCommand, type IntakeEntry, type IntakeRecord } from "@/lib/canonical-intake";
import { Input } from "@/components/ui/input";
import { Notice, PageIntro, Panel, QuietLink, UnitLabel } from "./ui";

type EditableCandidate = IntakeCandidate & { selected: boolean };
type Phase = "loading" | "ready" | "error" | "busy" | "conflict" | "confirmed" | "unavailable";
type PendingConfirmation = { command: IntakeConfirmationCommand; fingerprint: string };

function editable(candidate: IntakeCandidate): EditableCandidate {
  return { ...candidate, uncertainty: [...candidate.uncertainty], selected: true };
}

function entryOf(candidate: EditableCandidate): IntakeEntry {
  const name = candidate.name.trim();
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error("Enter a food name up to 120 characters.");
  const amountText = candidate.amount === null ? "" : String(candidate.amount);
  const amount = amountText === "" ? null : Number(amountText);
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000)) throw new Error("Enter a positive amount up to 1,000,000, or leave it blank for unknown.");
  const unit = amount === null ? null : candidate.unit?.trim() || null;
  if (amount !== null && !unit) throw new Error("Choose a unit when an amount is entered.");
  const dateValue = candidate.date_value || null;
  const dateType = dateValue ? candidate.date_type : "UNKNOWN";
  if (dateValue && dateType === "UNKNOWN") throw new Error("Choose what the date means.");
  if (candidate.storage && (candidate.storage.length > 120 || /[\u0000-\u001f\u007f]/.test(candidate.storage))) throw new Error("Storage must be 120 characters or fewer.");
  return { name, amount, unit, date_value: dateValue, date_type: dateType, date_source: dateValue ? "USER" : null, storage: candidate.storage?.trim() || null };
}

function failureMessage(error: unknown) {
  return error instanceof CanonicalApiError ? error.message : "The intake could not be loaded. Check your connection and try again.";
}

function inputClass() {
  return "mt-1 min-h-12 w-full rounded-control border border-line bg-white px-3 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60";
}

export function IntakeReview() {
  const search = useSearchParams();
  const intakeId = search.get("id")?.trim() ?? "";
  const { auth, user, householdId } = useLiveHousehold();
  const scopeKey = auth === "signed-in" && user && householdId ? `${user.uid}:${householdId}:${intakeId}` : `no-scope:${intakeId}`;
  return <IntakeReviewForm key={scopeKey} auth={auth} user={user} householdId={householdId} intakeId={intakeId} />;
}

function IntakeReviewForm({ auth, user, householdId, intakeId }: { auth: ReturnType<typeof useLiveHousehold>["auth"]; user: ReturnType<typeof useLiveHousehold>["user"]; householdId: string; intakeId: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [record, setRecord] = useState<IntakeRecord | null>(null);
  const [candidates, setCandidates] = useState<EditableCandidate[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const enabled = process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true";

  const load = useCallback(async () => {
    if (!intakeId) { setPhase("error"); setError("This review link is missing its intake ID."); return; }
    if (auth === "loading") { setPhase("loading"); return; }
    if (auth !== "signed-in" || !user || !householdId) { setPhase("unavailable"); setRecord(null); setCandidates([]); setError("Sign in and choose a household to review this intake."); return; }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setPhase("loading");
    setError("");
    try {
      const token = await user.getIdToken(true);
      if (request.signal.aborted) return;
      const response = await readIntake(token, householdId, intakeId, request.signal);
      if (request.signal.aborted) return;
      setRecord(response);
      setCandidates(response.candidates.map(editable));
      setPending(null);
      setReviewed(false);
      setPhase(response.status === "CONFIRMED" ? "confirmed" : "ready");
    } catch (failure) {
      if (!request.signal.aborted && !(failure instanceof Error && failure.name === "AbortError")) {
        setPhase(failure instanceof CanonicalApiError && failure.code === "unavailable" ? "unavailable" : "error");
        setError(failureMessage(failure));
      }
    } finally {
      if (controller.current === request) controller.current = null;
    }
  }, [auth, householdId, intakeId, user]);

  useEffect(() => {
    void load();
    return () => { controller.current?.abort(); controller.current = null; };
  }, [load]);

  function update(candidateId: string, patch: Partial<EditableCandidate>) {
    setCandidates((current) => current.map((candidate) => candidate.candidate_id === candidateId ? { ...candidate, ...patch } : candidate));
    setReviewed(false);
    setError("");
  }

  async function send(command: IntakeConfirmationCommand, fingerprint: string) {
    if (!user || !householdId || !enabled) return;
    const request = new AbortController();
    controller.current?.abort();
    controller.current = request;
    const exact = { command, fingerprint };
    setPending(exact);
    setPhase("busy");
    setError("");
    try {
      const token = await user.getIdToken(true);
      if (request.signal.aborted) return;
      const result = await confirmIntake(token, householdId, intakeId, command, request.signal);
      if (request.signal.aborted) return;
      setRecord(result);
      setCandidates(result.candidates.map(editable));
      setPending(null);
      setPhase("confirmed");
      setError("");
    } catch (failure) {
      if (!request.signal.aborted && !(failure instanceof Error && failure.name === "AbortError")) {
        if (failure instanceof CanonicalApiError && failure.code === "conflict") setPhase("conflict");
        else setPhase("error");
        setError(failureMessage(failure));
      }
    } finally {
      if (controller.current === request) controller.current = null;
    }
  }

  function prepareConfirmation() {
    if (!record || !reviewed) return;
    try {
      const chosen = candidates.filter((candidate) => candidate.selected);
      if (chosen.length === 0 || chosen.length > 10) throw new Error("Select between 1 and 10 candidates to confirm.");
      const command: IntakeConfirmationCommand = {
        schema_version: 1,
        idempotency_key: crypto.randomUUID(),
        base_version: record.version,
        candidates: chosen.map((candidate) => ({ candidate_id: candidate.candidate_id, ...entryOf(candidate) })),
      };
      const fingerprint = JSON.stringify(command);
      void send(command, fingerprint);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Review the selected candidate details.");
    }
  }

  const locked = phase === "busy" || Boolean(pending);
  const selectedCount = candidates.filter((candidate) => candidate.selected).length;

  return <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
    <PageIntro eyebrow="Kitchen · review" title="Review food candidates" description="Check each detail and choose which candidates to add to the household Kitchen." />
    <Notice tone="warn">Nothing here is canonical until you confirm it. Photos, dates, and model suggestions cannot assess food safety; check the food yourself.</Notice>
    {!enabled && <Notice tone="info">Confirmation is disabled by the current app configuration. You can review this intake; no changes will be sent.</Notice>}
    {auth === "loading" && <div role="status" className="mt-4"><Panel>Checking sign-in…</Panel></div>}
    {phase === "unavailable" && <div role="status" className="mt-4"><Panel><h2 className="font-semibold">Review is unavailable</h2><p className="mt-1 text-sm text-muted">{error || "Sign in and choose a household to view candidate details."}</p><QuietLink href="/account">Open Account</QuietLink></Panel></div>}
    {phase === "loading" && auth === "signed-in" && <div role="status" className="mt-4"><Panel>Loading candidate details…</Panel></div>}
    {(phase === "error" || phase === "conflict") && <div role="alert" className="mt-4"><Panel><h2 className="font-semibold">{phase === "conflict" ? "This intake changed" : "Could not load or confirm this intake"}</h2><p className="mt-1 text-sm text-danger">{error}</p>{pending && <p className="mt-2 text-sm text-muted">The exact confirmation request is preserved. Retry it or reload current candidates before making a different choice.</p>}<div className="mt-3 flex flex-wrap gap-3">{pending && phase !== "conflict" && <button type="button" disabled={!enabled} onClick={() => void send(pending.command, pending.fingerprint)} className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white disabled:opacity-55">Retry same confirmation</button>}<button type="button" onClick={() => void load()} className="min-h-11 rounded-full bg-surface-muted px-4 text-sm font-medium text-primary">Reload intake</button>{!pending && <QuietLink href="/kitchen">Return to Kitchen</QuietLink>}</div></Panel></div>}
    {phase === "busy" && <div role="status" className="mt-4"><Panel><p className="font-medium">Confirming selected candidates…</p><p className="mt-1 text-sm text-muted">The request may take a moment. It will not be sent again automatically.</p><button type="button" onClick={() => { controller.current?.abort(); setPhase("error"); setError("You stopped waiting. The service may have received the confirmation; retry the exact request or reload the intake."); }} className="mt-3 min-h-11 rounded-full bg-surface-muted px-4 text-sm font-medium text-primary">Stop waiting</button></Panel></div>}
    {phase === "confirmed" && <section className="mt-4 space-y-3" aria-live="polite"><Notice tone="success">This intake is confirmed. The selected candidates are now canonical household records.</Notice><Panel><h2 className="font-semibold">Confirmed records</h2><ul className="mt-2 space-y-2">{record?.candidates.map((candidate) => <li key={candidate.candidate_id} className="text-sm"><span className="font-medium">{candidate.name}</span> · {candidate.candidate_id}</li>)}</ul><p className="mt-3 text-sm text-muted">Confirmation records details only. It does not assess condition or safety.</p><div className="mt-4 flex flex-wrap gap-3"><QuietLink href="/kitchen">Open Kitchen</QuietLink><QuietLink href="/kitchen/add">Add more food</QuietLink></div></Panel></section>}
    {phase === "ready" && record && <section className="mt-4 space-y-4" aria-label="Candidate review">
      <Panel className="space-y-1"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Unconfirmed intake · version {record.version}</p><p className="text-sm text-muted">Select candidates to confirm. Blank amount, date, or storage stays unknown.</p></Panel>
      {candidates.length === 0 ? <Panel><h2 className="font-semibold">No candidates to review</h2><p className="mt-1 text-sm text-muted">This intake has no candidates. Nothing can be confirmed.</p></Panel> : candidates.map((candidate, index) => <article key={candidate.candidate_id} className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3"><input id={`candidate-${index}-selected`} type="checkbox" checked={candidate.selected} disabled={locked} onChange={(event) => update(candidate.candidate_id, { selected: event.target.checked })} className="mt-1 size-5 accent-[var(--color-primary)]" /><div className="min-w-0 flex-1"><label htmlFor={`candidate-${index}-selected`} className="block min-h-11 cursor-pointer py-1 text-sm font-semibold">Select this candidate</label><p className="break-all text-xs text-muted">Candidate ID · {candidate.candidate_id}</p></div></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium" htmlFor={`candidate-${index}-name`}>Food name<Input id={`candidate-${index}-name`} maxLength={120} value={candidate.name} disabled={locked} onChange={(event) => update(candidate.candidate_id, { name: event.target.value })} className="mt-1" /></label>
          <div className="grid grid-cols-[1fr_1fr] gap-2"><label className="block text-sm font-medium" htmlFor={`candidate-${index}-amount`}>Amount <span className="font-normal text-muted">(blank unknown)</span><Input id={`candidate-${index}-amount`} type="number" inputMode="decimal" min="0.000001" max="1000000" step="any" value={candidate.amount ?? ""} disabled={locked} onChange={(event) => update(candidate.candidate_id, { amount: event.target.value === "" ? null : Number(event.target.value) })} placeholder="Unknown" className="mt-1" /></label><label className="block text-sm font-medium" htmlFor={`candidate-${index}-unit`}>Unit<Input id={`candidate-${index}-unit`} maxLength={32} pattern="[A-Za-z][A-Za-z0-9_-]*" value={candidate.amount === null ? "" : candidate.unit ?? ""} disabled={locked || candidate.amount === null} onChange={(event) => update(candidate.candidate_id, { unit: event.target.value || null })} placeholder={candidate.amount === null ? "Unknown" : "e.g. g or pieces"} className="mt-1" /></label></div>
          <label className="block text-sm font-medium" htmlFor={`candidate-${index}-date`}>Date <span className="font-normal text-muted">(blank unknown)</span><Input id={`candidate-${index}-date`} type="date" value={candidate.date_value ?? ""} disabled={locked} onChange={(event) => update(candidate.candidate_id, { date_value: event.target.value || null, date_type: event.target.value ? candidate.date_value ? candidate.date_type : "UNKNOWN" : "UNKNOWN" })} className="mt-1" /></label>
          <label className="block text-sm font-medium" htmlFor={`candidate-${index}-date-type`}>Date means<select id={`candidate-${index}-date-type`} value={candidate.date_value ? candidate.date_type : "UNKNOWN"} disabled={locked || !candidate.date_value} onChange={(event) => update(candidate.candidate_id, { date_type: event.target.value as IntakeCandidate["date_type"] })} className={inputClass()}><option value="UNKNOWN">Choose when date exists</option><option value="USE_BY">Use by</option><option value="EXPIRY">Expiry</option><option value="BEST_BEFORE">Best before</option><option value="USER_TARGET">My target date</option></select></label>
          <label className="block text-sm font-medium sm:col-span-2" htmlFor={`candidate-${index}-storage`}>Storage <span className="font-normal text-muted">(blank unknown)</span><Input id={`candidate-${index}-storage`} maxLength={120} value={candidate.storage ?? ""} disabled={locked} onChange={(event) => update(candidate.candidate_id, { storage: event.target.value || null })} placeholder="e.g. fridge, freezer, pantry" className="mt-1" /></label>
        </div>
        <p className="mt-3 text-xs text-muted">Current entry: <UnitLabel amount={candidate.amount} unit={candidate.unit} /> · {candidate.date_value ? `${candidate.date_type.toLowerCase().replaceAll("_", " ")} · ${candidate.date_value}` : "Date unknown"} · Storage {candidate.storage ?? "unknown"}</p>
      </article>)}
      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {pending && <Panel><p role="alert" className="text-sm text-danger">The confirmation response was not received. Keep and retry this exact request, or reload the intake to check its current status.</p><button type="button" disabled={!enabled || phase === "busy"} onClick={() => void send(pending.command, pending.fingerprint)} className="mt-3 min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white disabled:opacity-55">Retry same confirmation</button></Panel>}
      {!pending && candidates.length > 0 && <Panel className="space-y-3"><label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5 accent-[var(--color-primary)]" checked={reviewed} disabled={locked || selectedCount === 0} onChange={(event) => setReviewed(event.target.checked)} /><span>I reviewed the selected details and want to add {selectedCount} {selectedCount === 1 ? "record" : "records"} to Kitchen.</span></label><button type="button" disabled={!enabled || !reviewed || selectedCount === 0 || locked} onClick={prepareConfirmation} className="min-h-12 w-full rounded-full bg-primary px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-55">Confirm {selectedCount} {selectedCount === 1 ? "candidate" : "candidates"}</button></Panel>}
      <p className="text-center text-xs text-muted">Confirmation will not tell you whether food is safe to eat.</p>
      <QuietLink href="/kitchen">Cancel and return to Kitchen</QuietLink>
    </section>}
  </div>;
}
