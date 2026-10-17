"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveHousehold } from "@/lib/live-household";
import { submitPhotoIntake, type IntakeResult } from "@/lib/canonical-intake";
import { Notice, Panel, QuietLink } from "./ui";

const MAX_PHOTO_BYTES = 2_000_000;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function PhotoIntake() {
  const household = useLiveHousehold();
  const [file, setFile] = useState<File | null>(null);
  const [retryKey, setRetryKey] = useState("");
  const [phase, setPhase] = useState<"idle" | "busy" | "error" | "cancelled" | "success">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  const enabled = process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true";

  useEffect(() => () => controller.current?.abort(), []);

  function chooseFile(next: File | null) {
    setFile(next);
    setRetryKey("");
    setResult(null);
    setError("");
    setPhase("idle");
    if (!next) return;
    if (!ACCEPTED_TYPES.has(next.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      setPhase("error");
    } else if (next.size < 1 || next.size > MAX_PHOTO_BYTES) {
      setError("Choose an image smaller than 2 MB.");
      setPhase("error");
    }
  }

  async function sendPhoto() {
    if (!file) return;
    if (!household.user || !household.householdId || household.auth !== "signed-in") {
      setError("Sign in and choose a household before sending a photo.");
      setPhase("error");
      return;
    }
    if (!enabled) {
      setError("Candidate intake is disabled by the current app configuration. The photo was not sent.");
      setPhase("error");
      return;
    }

    const key = retryKey || crypto.randomUUID();
    setRetryKey(key);
    const request = new AbortController();
    controller.current = request;
    setPhase("busy");
    setError("");
    setResult(null);
    try {
      const token = await household.user.getIdToken();
      if (request.signal.aborted) {
        setPhase("cancelled");
        setError("You stopped waiting. Retry with this same selected file to check whether the service received it.");
        return;
      }
      const intake = await submitPhotoIntake(token, household.householdId, file, key, request.signal);
      if (!request.signal.aborted) {
        setResult(intake);
        setPhase("success");
        setRetryKey("");
      }
    } catch (failure) {
      if (request.signal.aborted) {
        setPhase("cancelled");
        setError("You stopped waiting. The service may still have received the photo; retry with this same selected file to check the same intake.");
      } else {
        setPhase("error");
        setError(failure instanceof Error ? failure.message : "The photo could not be processed. Try manual entry.");
      }
    } finally {
      if (controller.current === request) controller.current = null;
    }
  }

  return <section className="mt-4 space-y-3" aria-labelledby="photo-intake-title">
    <Panel className="space-y-3">
      <div>
        <h2 id="photo-intake-title" className="text-lg font-semibold">Add from a photo</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">Choose a photo or use your camera. Gemini suggests food candidates; check every detail before anything reaches Kitchen.</p>
      </div>
      {!enabled && <Notice tone="info">Photo intake is unavailable while household commands are disabled.</Notice>}
      <label htmlFor="intake-photo" className="block text-sm font-medium">Food photo
        <input id="intake-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={phase === "busy"} onChange={(event) => chooseFile(event.currentTarget.files?.[0] ?? null)} className="mt-1 block min-h-12 w-full cursor-pointer rounded-control border border-line bg-white px-3 py-2 text-sm text-foreground file:mr-3 file:min-h-9 file:rounded-full file:border-0 file:bg-primary-soft file:px-3 file:text-sm file:font-semibold file:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
      </label>
      <p className="text-xs leading-relaxed text-muted">JPEG, PNG, or WebP · up to 2 MB. The selected bytes are sent to the configured Gemini Developer API for this request; this flow does not store the image.</p>
      {file && <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-surface-muted px-3 py-2"><p className="min-w-0 truncate text-sm">{file.name} · {(file.size / 1024).toFixed(0)} KB</p><button type="button" onClick={() => chooseFile(null)} disabled={phase === "busy"} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Remove</button></div>}
      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void sendPhoto()} disabled={!file || !enabled || household.auth !== "signed-in" || !household.householdId || phase === "busy" || Boolean(error && !retryKey)} className="min-h-11 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-55">{phase === "busy" ? "Reviewing photo…" : phase === "error" || phase === "cancelled" ? "Retry photo" : "Find food candidates"}</button>
        {phase === "busy" && <button type="button" onClick={() => controller.current?.abort()} className="min-h-11 rounded-full bg-surface-muted px-4 text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Cancel waiting</button>}
      </div>
      {phase === "busy" && <p role="status" className="text-sm text-muted">Sending photo for candidate extraction. Nothing is confirmed or added to Kitchen yet.</p>}
      {household.auth === "signed-out" && <p className="text-sm text-muted">Sign in and choose a household to use photo intake.</p>}
      {household.auth === "signed-in" && !household.householdId && <p className="text-sm text-muted">Choose an active household above to continue.</p>}
    </Panel>
    {result && <Panel className="space-y-3" aria-live="polite">
      <Notice tone="success">Gemini returned {result.candidates.length} unconfirmed {result.candidates.length === 1 ? "candidate" : "candidates"}. The photo was not saved and Kitchen stock is unchanged.</Notice>
      <ul className="space-y-2">{result.candidates.map((candidate) => <li key={candidate.candidate_id} className="rounded-2xl border border-line bg-white p-3"><p className="font-semibold">{candidate.name}</p><p className="mt-1 text-sm text-muted">{candidate.amount === null ? "Amount unknown" : `${candidate.amount} ${candidate.unit}`} · {candidate.date_value ? `${candidate.date_type.toLowerCase().replaceAll("_", " ")} · ${candidate.date_value}` : "Date unknown"} · Storage {candidate.storage ?? "unknown"}</p></li>)}</ul>
      <p className="text-xs text-muted">Intake reference: {result.intake_id}. Review and explicitly confirm candidates in the next step.</p>
      <QuietLink href={`/kitchen/review?id=${encodeURIComponent(result.intake_id)}`}>Review candidates</QuietLink>
    </Panel>}
  </section>;
}
