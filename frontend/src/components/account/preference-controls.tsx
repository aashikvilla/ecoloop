"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { canonicalRequest, CanonicalApiError } from "@/lib/canonical-transport";
import { useLiveHousehold } from "@/lib/live-household";

type Preference = {
  preference_id: string;
  text: string | null;
  status: "ACTIVE" | "REVOKED";
  version: number;
  updated_at: string;
  consent: boolean;
  memory_bank_sync: { status: "pending" | "syncing" | "synced" | "not_configured" | "reconciliation_required"; version: number };
  memory_bank_cleanup_required: boolean;
};
type MemoryBankStatus = { status: "not_configured" | "configured_unverified" | "unavailable"; provider: "google_agent_platform" };
type PreferencesResponse = { preferences: Preference[]; cleanupPending: Preference[]; memoryBank: MemoryBankStatus };
type Attempt = { kind: "save" | "delete"; id: string; baseVersion: number; text: string; key: string };

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function result(payload: unknown): Record<string, unknown> {
  if (!object(payload) || payload.schema_version !== 1 || typeof payload.request_id !== "string" || !payload.request_id || payload.request_id.length > 128 || !object(payload.result)) {
    throw new CanonicalApiError("invalid_response", "The preference service returned an unexpected response.");
  }
  return payload.result;
}

function preference(value: unknown): value is Preference {
  if (!object(value)) return false;
  const active = value.status === "ACTIVE";
  return typeof value.preference_id === "string"
    && /^[A-Za-z0-9_-]{16,64}$/.test(value.preference_id)
    && (active || value.status === "REVOKED")
    && (active ? typeof value.text === "string" && value.text.length >= 1 && value.text.length <= 200 && value.consent === true : value.text === null && value.consent === false)
    && typeof value.version === "number" && Number.isSafeInteger(value.version) && value.version > 0
    && typeof value.updated_at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value.updated_at) && value.updated_at.length <= 40 && !Number.isNaN(Date.parse(value.updated_at))
    && object(value.memory_bank_sync) && ["pending", "syncing", "synced", "not_configured", "reconciliation_required"].includes(String(value.memory_bank_sync.status)) && value.memory_bank_sync.version === value.version
    && typeof value.memory_bank_cleanup_required === "boolean";
}

function readPreferences(payload: unknown): PreferencesResponse {
  const value = result(payload);
  if (!object(value.memory_bank) || !["not_configured", "configured_unverified", "unavailable"].includes(String(value.memory_bank.status)) || value.memory_bank.provider !== "google_agent_platform" || !Array.isArray(value.preferences) || value.preferences.length > 50 || !value.preferences.every((item) => preference(item) && item.status === "ACTIVE") || !Array.isArray(value.memory_bank_cleanup_pending) || value.memory_bank_cleanup_pending.length > 50 || !value.memory_bank_cleanup_pending.every((item) => preference(item) && item.status === "REVOKED" && item.memory_bank_cleanup_required)) {
    throw new CanonicalApiError("invalid_response", "The preference service returned invalid saved preferences.");
  }
  const records = value.preferences as Preference[];
  if (new Set(records.map((item) => item.preference_id)).size !== records.length) throw new CanonicalApiError("invalid_response", "The preference service returned duplicate preferences.");
  return { preferences: records, cleanupPending: value.memory_bank_cleanup_pending as Preference[], memoryBank: value.memory_bank as MemoryBankStatus };
}

function changedPreference(payload: unknown, attempt: Attempt): Preference {
  const value = result(payload);
  if (!preference(value) || value.preference_id !== attempt.id || value.version !== attempt.baseVersion + 1 || value.status !== (attempt.kind === "save" ? "ACTIVE" : "REVOKED") || (attempt.kind === "save" && value.text !== attempt.text)) {
    throw new CanonicalApiError("invalid_response", "The preference service could not confirm this change.");
  }
  return value;
}

export function PreferenceControls() {
  const { auth, user } = useLiveHousehold();
  return <PreferenceSession key={auth === "signed-in" ? user?.uid : auth} auth={auth} user={user} />;
}

function PreferenceSession({ auth, user }: { auth: "loading" | "unavailable" | "signed-out" | "signed-in" | "error"; user: User | null }) {
  const [records, setRecords] = useState<Preference[]>([]);
  const [cleanupPending, setCleanupPending] = useState<Preference[]>([]);
  const [memoryBank, setMemoryBank] = useState<MemoryBankStatus>({ status: "not_configured", provider: "google_agent_platform" });
  const [recordsUid, setRecordsUid] = useState("");
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">(auth === "signed-in" ? "loading" : "idle");
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [editing, setEditing] = useState<Preference | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [syncRetryId, setSyncRetryId] = useState("");
  const readRef = useRef<AbortController | null>(null);
  const writeRef = useRef<AbortController | null>(null);
  const uidRef = useRef(auth === "signed-in" ? user?.uid ?? "" : "");

  const load = useCallback(async (keepDraft = false) => {
    if (!user) return;
    readRef.current?.abort();
    const controller = new AbortController();
    readRef.current = controller;
    const uid = user.uid;
    setLoadState("loading");
    setError("");
    try {
      const token = await user.getIdToken();
      if (controller.signal.aborted) return;
      const found = readPreferences(await canonicalRequest("preferences", token, null, { signal: controller.signal }));
      if (controller.signal.aborted || uidRef.current !== uid) return;
      setRecords(found.preferences);
      setCleanupPending(found.cleanupPending);
      setMemoryBank(found.memoryBank);
      setRecordsUid(uid);
      setLoadState("ready");
      if (keepDraft) setEditing((current) => current ? found.preferences.find((item) => item.preference_id === current.preference_id) ?? null : null);
    } catch (cause) {
      if (controller.signal.aborted || uidRef.current !== uid) return;
      setError(cause instanceof CanonicalApiError ? cause.message : "Preferences could not be loaded.");
      setLoadState("error");
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    if (auth === "signed-in" && user) queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; uidRef.current = ""; readRef.current?.abort(); writeRef.current?.abort(); };
  }, [auth, user, load]);

  async function submit(change: Attempt) {
    if (!user || pending) return;
    const uid = user.uid;
    const controller = new AbortController();
    writeRef.current = controller;
    setPending(true);
    setAttempt(change);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      if (controller.signal.aborted) return;
      const payload = await canonicalRequest("preferences", token, null, {
        method: change.kind === "save" ? "PUT" : "DELETE",
        recordId: change.id,
        body: change.kind === "save"
          ? { schema_version: 1, idempotency_key: change.key, base_version: change.baseVersion, text: change.text, consent: true }
          : { schema_version: 1, idempotency_key: change.key, base_version: change.baseVersion },
        signal: controller.signal,
      });
      if (controller.signal.aborted || uidRef.current !== uid) return;
      const changed = changedPreference(payload, change);
      setRecords((previous) => change.kind === "delete" ? previous.filter((item) => item.preference_id !== changed.preference_id) : [changed, ...previous.filter((item) => item.preference_id !== changed.preference_id)]);
      setCleanupPending((previous) => change.kind === "delete" && changed.memory_bank_cleanup_required
        ? [changed, ...previous.filter((item) => item.preference_id !== changed.preference_id)]
        : previous.filter((item) => item.preference_id !== changed.preference_id));
      setText("");
      setEditing(null);
      setConsent(false);
      setAttempt(null);
      const syncCopy = changed.memory_bank_sync.status === "synced"
        ? " Managed Memory Bank sync is complete."
        : changed.memory_bank_sync.status === "reconciliation_required"
          ? " Managed Memory Bank cleanup or update needs a retry."
          : changed.memory_bank_sync.status === "not_configured"
            ? " Managed Memory Bank is not configured; canonical account data was updated."
            : " Managed Memory Bank sync is pending.";
      setNotice((change.kind === "delete" ? "Preference deleted from your private account." : "Preference saved with your consent.") + syncCopy);
    } catch (cause) {
      if (controller.signal.aborted || uidRef.current !== uid) return;
      const problem = cause instanceof CanonicalApiError ? cause : new CanonicalApiError("unexpected", "The preference change could not be confirmed.");
      setError(problem.message);
      if (!["network", "timeout", "unavailable", "invalid_response"].includes(problem.code)) setAttempt(null);
    } finally {
      if (writeRef.current === controller) writeRef.current = null;
      if (uidRef.current === uid) setPending(false);
    }
  }

  async function retryMemorySync(record: Preference) {
    if (!user || pending || syncRetryId) return;
    const uid = user.uid;
    const controller = new AbortController();
    writeRef.current = controller;
    setSyncRetryId(record.preference_id);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      if (controller.signal.aborted) return;
      const changed = changedPreference(await canonicalRequest("preference-memory-sync", token, null, {
        method: "POST",
        recordId: record.preference_id,
        body: { schema_version: 1 },
        signal: controller.signal,
      }), { kind: record.status === "REVOKED" ? "delete" : "save", id: record.preference_id, baseVersion: record.version - 1, text: record.text ?? "", key: "retry" });
      if (controller.signal.aborted || uidRef.current !== uid) return;
      setRecords((previous) => changed.status === "ACTIVE"
        ? previous.map((item) => item.preference_id === changed.preference_id ? changed : item)
        : previous.filter((item) => item.preference_id !== changed.preference_id));
      setCleanupPending((previous) => changed.status === "REVOKED" && changed.memory_bank_cleanup_required
        ? previous.map((item) => item.preference_id === changed.preference_id ? changed : item)
        : previous.filter((item) => item.preference_id !== changed.preference_id));
      setNotice(changed.memory_bank_sync.status === "synced" ? "Managed Memory Bank sync is complete." : changed.memory_bank_sync.status === "not_configured" ? "Managed Memory Bank remains unconfigured; the private account record is unchanged." : "Managed Memory Bank still needs reconciliation.");
    } catch (cause) {
      if (controller.signal.aborted || uidRef.current !== uid) return;
      setError(cause instanceof CanonicalApiError ? cause.message : "Memory sync could not be confirmed.");
    } finally {
      if (writeRef.current === controller) writeRef.current = null;
      if (uidRef.current === uid) setSyncRetryId("");
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = text.trim();
    if (!consent || !clean || clean.length > 200 || /[\u0000-\u001f\u007f]/.test(clean) || pending || attempt) return;
    void submit({ kind: "save", id: editing?.preference_id ?? crypto.randomUUID(), baseVersion: editing?.version ?? 0, text: clean, key: crypto.randomUUID() });
  }

  function remove(record: Preference) {
    if (!window.confirm("Delete this saved preference?")) return;
    void submit({ kind: "delete", id: record.preference_id, baseVersion: record.version, text: "", key: crypto.randomUUID() });
  }

  const visibleRecords = auth === "signed-in" && user?.uid === recordsUid ? records : [];

  return <Card className="space-y-5 border border-line p-5 sm:p-6" aria-labelledby="preferences-title">
    <div><Heading id="preferences-title" as="h2">Saved preferences</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Choose exactly what EcoLoop may remember about you. These private preferences are saved in your account. {memoryBank.status === "not_configured" ? "Managed Memory Bank is not configured." : memoryBank.status === "configured_unverified" ? "Managed Memory Bank is configured but has not been verified against Google yet." : "Managed Memory Bank is unavailable."}</p></div>
    {auth !== "signed-in" && <p className="text-sm text-muted">Sign in to manage preferences.</p>}
    {auth === "signed-in" && <>
      {loadState === "loading" && <p role="status" className="text-sm text-muted">Loading preferences…</p>}
      {loadState === "error" && <div role="alert" className="space-y-2"><p className="text-sm text-danger">{error}</p><Button variant="secondary" onClick={() => void load(true)}>Retry loading</Button></div>}
      {loadState === "ready" && visibleRecords.length === 0 && <p role="status" className="text-sm text-muted">No preferences saved. You can skip this step.</p>}
      {loadState === "ready" && visibleRecords.length > 0 && <ul className="space-y-3">{visibleRecords.map((record) => <li key={record.preference_id} className="rounded-2xl bg-surface-muted p-4"><p className="break-words text-sm text-foreground">{record.text}</p><p className="mt-2 text-xs text-muted">{record.memory_bank_sync.status === "synced" ? "Managed Memory Bank sync complete" : record.memory_bank_sync.status === "reconciliation_required" ? "Managed Memory Bank needs reconciliation" : record.memory_bank_sync.status === "syncing" || record.memory_bank_sync.status === "pending" ? "Managed Memory Bank sync pending" : "Private account only; managed sync not configured"}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={pending || !!attempt || !!syncRetryId} onClick={() => { setEditing(record); setText(record.text ?? ""); setConsent(false); setError(""); setNotice(""); }}>Edit</Button><Button size="sm" variant="danger" disabled={pending || !!attempt || !!syncRetryId || process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS !== "true"} onClick={() => remove(record)}>Delete</Button>{record.memory_bank_sync.status !== "synced" && memoryBank.status === "configured_unverified" && <Button size="sm" variant="ghost" disabled={pending || !!attempt || !!syncRetryId || process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS !== "true"} onClick={() => void retryMemorySync(record)}>{syncRetryId === record.preference_id ? "Retrying…" : "Retry memory sync"}</Button>}</div></li>)}</ul>}
      {loadState === "ready" && cleanupPending.length > 0 && <div className="space-y-3 rounded-2xl border border-line bg-surface-muted p-4"><p className="text-sm text-foreground">Some deleted preferences still need managed-memory cleanup. Their saved text has been removed from your account.</p>{cleanupPending.map((record) => <div key={record.preference_id} className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted">Cleanup status: {record.memory_bank_sync.status.replaceAll("_", " ")}</span><Button size="sm" variant="secondary" disabled={pending || !!attempt || !!syncRetryId || memoryBank.status !== "configured_unverified" || process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS !== "true"} onClick={() => void retryMemorySync(record)}>{syncRetryId === record.preference_id ? "Retrying…" : "Retry cleanup"}</Button></div>)}</div>}
      {loadState === "ready" && <form onSubmit={save} className="space-y-3"><label htmlFor="preference-text" className="block text-sm font-semibold text-foreground">{editing ? "Correct preference" : "New preference"}</label><Input id="preference-text" value={text} maxLength={200} onChange={(event) => setText(event.target.value)} disabled={pending || !!attempt} placeholder="For example, prefer vegetarian weekday dinners" required /><label className="flex min-h-11 items-center gap-3 text-sm text-foreground"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={pending || !!attempt} className="size-5 accent-primary" /><span>Remember this exact preference until I edit or delete it</span></label><div className="flex flex-wrap gap-2"><Button type="submit" disabled={!consent || !text.trim() || pending || !!attempt || process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS !== "true"} aria-busy={pending}>{pending ? "Saving…" : editing ? "Save correction" : "Save preference"}</Button>{editing && <Button variant="secondary" disabled={pending || !!attempt} onClick={() => { setEditing(null); setText(""); setConsent(false); }}>Cancel edit</Button>}</div>{process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS !== "true" && <p className="text-xs text-muted">Preference changes are disabled in this app configuration.</p>}</form>}
      {loadState !== "error" && error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {attempt && !pending && <div className="space-y-2"><p className="text-xs text-muted">The result is unknown. Retry the same change, or reload your saved preferences before editing again.</p><Button variant="secondary" onClick={() => void submit(attempt)}>Retry same change</Button><Button variant="ghost" onClick={() => { setAttempt(null); void load(true); }}>Reload preferences</Button></div>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    </>}
  </Card>;
}
