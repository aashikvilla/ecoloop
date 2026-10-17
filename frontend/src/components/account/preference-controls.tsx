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
};
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
    && typeof value.updated_at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value.updated_at) && value.updated_at.length <= 40 && !Number.isNaN(Date.parse(value.updated_at));
}

function readPreferences(payload: unknown): Preference[] {
  const value = result(payload);
  if (value.memory_bank !== "not_connected" || !Array.isArray(value.preferences) || value.preferences.length > 50 || !value.preferences.every((item) => preference(item) && item.status === "ACTIVE")) {
    throw new CanonicalApiError("invalid_response", "The preference service returned invalid saved preferences.");
  }
  const records = value.preferences as Preference[];
  if (new Set(records.map((item) => item.preference_id)).size !== records.length) throw new CanonicalApiError("invalid_response", "The preference service returned duplicate preferences.");
  return records;
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
  const [recordsUid, setRecordsUid] = useState("");
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">(auth === "signed-in" ? "loading" : "idle");
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [editing, setEditing] = useState<Preference | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
      setRecords(found);
      setRecordsUid(uid);
      setLoadState("ready");
      if (keepDraft) setEditing((current) => current ? found.find((item) => item.preference_id === current.preference_id) ?? null : null);
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
      setText("");
      setEditing(null);
      setConsent(false);
      setAttempt(null);
      setNotice(change.kind === "delete" ? "Preference deleted. Its saved text has been removed." : "Preference saved with your consent.");
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
    <div><Heading id="preferences-title" as="h2">Saved preferences</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Choose exactly what EcoLoop may remember about you. These private preferences are saved in your account. Managed Memory Bank is not connected.</p></div>
    {auth !== "signed-in" && <p className="text-sm text-muted">Sign in to manage preferences.</p>}
    {auth === "signed-in" && <>
      {loadState === "loading" && <p role="status" className="text-sm text-muted">Loading preferences…</p>}
      {loadState === "error" && <div role="alert" className="space-y-2"><p className="text-sm text-danger">{error}</p><Button variant="secondary" onClick={() => void load(true)}>Retry loading</Button></div>}
      {loadState === "ready" && visibleRecords.length === 0 && <p role="status" className="text-sm text-muted">No preferences saved. You can skip this step.</p>}
      {loadState === "ready" && visibleRecords.length > 0 && <ul className="space-y-3">{visibleRecords.map((record) => <li key={record.preference_id} className="rounded-2xl bg-surface-muted p-4"><p className="break-words text-sm text-foreground">{record.text}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={pending || !!attempt} onClick={() => { setEditing(record); setText(record.text ?? ""); setConsent(false); setError(""); setNotice(""); }}>Edit</Button><Button size="sm" variant="danger" disabled={pending || !!attempt || process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS !== "true"} onClick={() => remove(record)}>Delete</Button></div></li>)}</ul>}
      {loadState === "ready" && <form onSubmit={save} className="space-y-3"><label htmlFor="preference-text" className="block text-sm font-semibold text-foreground">{editing ? "Correct preference" : "New preference"}</label><Input id="preference-text" value={text} maxLength={200} onChange={(event) => setText(event.target.value)} disabled={pending || !!attempt} placeholder="For example, prefer vegetarian weekday dinners" required /><label className="flex min-h-11 items-center gap-3 text-sm text-foreground"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={pending || !!attempt} className="size-5 accent-primary" /><span>Remember this exact preference until I edit or delete it</span></label><div className="flex flex-wrap gap-2"><Button type="submit" disabled={!consent || !text.trim() || pending || !!attempt || process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS !== "true"} aria-busy={pending}>{pending ? "Saving…" : editing ? "Save correction" : "Save preference"}</Button>{editing && <Button variant="secondary" disabled={pending || !!attempt} onClick={() => { setEditing(null); setText(""); setConsent(false); }}>Cancel edit</Button>}</div>{process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS !== "true" && <p className="text-xs text-muted">Preference changes are disabled in this app configuration.</p>}</form>}
      {loadState !== "error" && error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {attempt && !pending && <div className="space-y-2"><p className="text-xs text-muted">The result is unknown. Retry the same change, or reload your saved preferences before editing again.</p><Button variant="secondary" onClick={() => void submit(attempt)}>Retry same change</Button><Button variant="ghost" onClick={() => { setAttempt(null); void load(true); }}>Reload preferences</Button></div>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    </>}
  </Card>;
}
