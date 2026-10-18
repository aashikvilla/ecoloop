"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readCanonicalRecords, type KitchenObservation } from "@/lib/canonical-api";
import { CanonicalApiError } from "@/lib/canonical-transport";
import { identifyShoppingPhoto } from "@/lib/canonical-intake";
import { useLiveHousehold } from "@/lib/live-household";

const MAX_PHOTO_BYTES = 2_000_000;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
type MatchResult =
  | { kind: "matched"; item: KitchenObservation }
  | { kind: "zero"; item: KitchenObservation }
  | { kind: "none" };

function normalizedName(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function message(error: unknown) {
  return error instanceof CanonicalApiError ? error.message : "The product check could not be completed. Try again.";
}

export function ShoppingPhotoCheck() {
  const household = useLiveHousehold();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<"idle" | "identifying" | "checking" | "error" | "ready">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  const canUse = household.auth === "signed-in" && Boolean(household.user && household.householdId);

  useEffect(() => () => controller.current?.abort(), []);

  function reset() {
    controller.current?.abort();
    controller.current = null;
    setFile(null);
    setName("");
    setError("");
    setResult(null);
    setPhase("idle");
  }

  function choosePhoto(next: File | null) {
    setFile(next);
    setName("");
    setError("");
    setResult(null);
    setPhase("idle");
    if (!next) return;
    if (!PHOTO_TYPES.has(next.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      setPhase("error");
    } else if (next.size < 1 || next.size > MAX_PHOTO_BYTES) {
      setError("Choose an image smaller than 2 MB.");
      setPhase("error");
    }
  }

  async function identify() {
    if (!file || !household.user || !household.householdId) return;
    const request = new AbortController();
    controller.current = request;
    setPhase("identifying"); setError(""); setResult(null);
    try {
      const token = await household.user.getIdToken();
      const candidate = await identifyShoppingPhoto(token, household.householdId, file, request.signal);
      if (!request.signal.aborted) { setName(candidate.name); setPhase("ready"); }
    } catch (failure) {
      if (!request.signal.aborted) { setError(message(failure)); setPhase("error"); }
    } finally { if (controller.current === request) controller.current = null; }
  }

  async function compare() {
    const reviewedName = name.trim();
    if (!reviewedName || reviewedName.length > 120 || !household.user || !household.householdId) return;
    const request = new AbortController();
    controller.current = request;
    setPhase("checking"); setError(""); setResult(null);
    try {
      const token = await household.user.getIdToken();
      const pantry = await readCanonicalRecords("kitchen", token, household.householdId, request.signal);
      if (request.signal.aborted) return;
      if (pantry.kind !== "kitchen") throw new CanonicalApiError("invalid_response", "The household service returned the wrong record type.");
      const exactMatches = pantry.records.filter((item) => normalizedName(item.name) === normalizedName(reviewedName));
      if (exactMatches.length !== 1) {
        setResult(exactMatches.length === 0 ? { kind: "none" } : null);
        if (exactMatches.length > 1) setError("More than one exact record matched. Review Kitchen directly; this check will not guess between records.");
      } else {
        const item = exactMatches[0];
        setResult(item.amount === 0 ? { kind: "zero", item } : item.amount !== null ? { kind: "matched", item } : null);
        if (item.amount === null) setError("A matching record exists, but its quantity is unknown. EcoLoop cannot recommend skipping a purchase from this evidence.");
      }
      setPhase("ready");
    } catch (failure) {
      if (!request.signal.aborted) { setError(message(failure)); setPhase("error"); }
    } finally { if (controller.current === request) controller.current = null; }
  }

  const busy = phase === "identifying" || phase === "checking";
  return <Card className="space-y-4 border border-primary/15 bg-surface p-4 sm:p-5" aria-labelledby="shopping-photo-title">
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Before you buy</p>
      <h2 id="shopping-photo-title" className="mt-1 text-lg font-semibold">Check this product against Kitchen</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">Gemini identifies a product candidate. You review its name, then EcoLoop checks the latest confirmed household records. The photo and candidate are not saved to Kitchen.</p>
    </div>
    <label className="block space-y-1 text-sm font-medium" htmlFor="shopping-product-photo">Product photo
      <input id="shopping-product-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={(event) => choosePhoto(event.currentTarget.files?.[0] ?? null)} className="min-h-12 w-full rounded-control border border-line bg-white px-3 py-2 text-sm file:mr-3 file:min-h-9 file:rounded-full file:border-0 file:bg-primary-soft file:px-3 file:text-sm file:font-semibold file:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
    </label>
    <p className="text-xs text-muted">JPEG, PNG, or WebP · up to 2 MB. Gemini suggests a name only; it does not inspect your pantry or decide whether you should buy.</p>
    {file && <p className="truncate text-xs text-muted">Selected: {file.name}</p>}
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => void identify()} disabled={!file || !canUse || busy}>{phase === "identifying" ? "Identifying…" : "Identify product"}</Button>
      {file && <Button variant="ghost" onClick={reset} disabled={busy}>Clear</Button>}
    </div>
    {canUse && (name || file) && <div className="space-y-3 rounded-2xl bg-surface-low p-3 sm:p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">Review the product name</p>
      <label htmlFor="shopping-product-name" className="block text-sm font-medium">Product to check <span className="font-normal text-muted">(edit Gemini’s suggestion or enter it yourself)</span></label>
      <Input id="shopping-product-name" value={name} onChange={(event) => { setName(event.target.value); setResult(null); setError(""); }} maxLength={120} placeholder="e.g. spinach" disabled={busy} />
      <Button onClick={() => void compare()} disabled={!name.trim() || busy}>{phase === "checking" ? "Checking confirmed Kitchen…" : "Check latest Kitchen records"}</Button>
    </div>}
    {phase === "identifying" && <p role="status" className="text-sm text-muted">Asking Gemini for a product name. No Kitchen data is being changed.</p>}
    {phase === "checking" && <p role="status" className="text-sm text-muted">Reading the current household Kitchen before comparing an exact product name.</p>}
    {result?.kind === "matched" && <div role="status" className="space-y-2 rounded-2xl border border-primary/20 bg-primary-soft/40 p-4"><p className="font-semibold text-primary">Confirmed {result.item.amount} {result.item.unit} recorded for {result.item.name}</p><p className="text-sm leading-relaxed text-foreground">Consider skipping this purchase and using the recorded food first. Check its current condition and whether this amount meets your plan; the record cannot establish either one.</p><p className="text-xs text-muted">Kitchen record {result.item.item_id} · version {result.item.version} · observed {new Date(result.item.observed_at).toLocaleString()}</p></div>}
    {result?.kind === "zero" && <div role="status" className="rounded-2xl bg-surface-low p-4"><p className="font-semibold">Exact record found; recorded quantity is zero</p><p className="mt-1 text-sm text-muted">This is not evidence to skip a purchase. Check Kitchen and your needs.</p></div>}
    {result?.kind === "none" && <div role="status" className="rounded-2xl bg-surface-low p-4"><p className="font-semibold">No exact matching Kitchen record found</p><p className="mt-1 text-sm text-muted">This check cannot confirm that you need to buy it; an equivalent item may be recorded under another name. Review Kitchen before deciding.</p></div>}
    {error && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    {!canUse && <p className="text-sm text-muted">Sign in and choose an active household to check confirmed records.</p>}
  </Card>;
}
