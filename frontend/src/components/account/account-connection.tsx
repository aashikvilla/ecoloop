"use client";

import type { User } from "firebase/auth";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { getFirebaseClient } from "@/lib/firebase-client";
import { useLiveHousehold } from "@/lib/live-household";
import {
  CanonicalApiError,
  createCanonicalHousehold,
  readCanonicalRecords,
  type CanonicalData,
  type CreatedHousehold,
} from "@/lib/canonical-api";
import { CanonicalCommandControls } from "./command-controls";
import { OutcomeControls } from "./outcome-controls";
import { PrivateHistory } from "./private-history";
import { ShareControls } from "./share-controls";

type AuthState =
  | "loading"
  | "unavailable"
  | "signed-out"
  | "signed-in"
  | "error";

export function AccountConnection() {
  const liveHousehold = useLiveHousehold();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"sign-in" | "create">("sign-in");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState("");
  const [selectedHousehold, setSelectedHousehold] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [onboardingStep, setOnboardingStep] = useState<"name" | "review" | "complete">("name");
  const [createRequestId, setCreateRequestId] = useState("");
  const [createdHousehold, setCreatedHousehold] = useState<CreatedHousehold | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<CanonicalApiError | null>(null);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<CanonicalData | null>(null);
  const [dataError, setDataError] = useState<CanonicalApiError | null>(null);
  const [loadingKind, setLoadingKind] = useState<"kitchen" | "shopping" | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const createRequestRef = useRef<AbortController | null>(null);
  const identityRef = useRef("");

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    void getFirebaseClient()
      .then(async (firebase) => {
        if (!active) return;
        if (!firebase) {
          setAuthState("unavailable");
          return;
        }
        const { onAuthStateChanged } = await import("firebase/auth");
        if (!active) return;
        unsubscribe = onAuthStateChanged(
          firebase.auth,
          (nextUser) => {
            const nextKey = nextUser?.uid ?? "";
            if (identityRef.current !== nextKey) {
              requestRef.current?.abort();
              createRequestRef.current?.abort();
              createRequestRef.current = null;
              setData(null);
              setDataError(null);
              setLoadingKind(null);
              setNotice(
                nextUser
                  ? ""
                  : identityRef.current
                    ? "Signed out. Loaded household records were cleared from this page."
                    : "",
              );
              setHouseholdId("");
              setSelectedHousehold("");
              setHouseholdName("");
              setOnboardingStep("name");
              setCreateRequestId("");
              setCreatedHousehold(null);
              setCreatePending(false);
              setCreateError(null);
              identityRef.current = nextKey;
            }
            setUser(nextUser);
            setAuthState(nextUser ? "signed-in" : "signed-out");
          },
          (error) => {
            requestRef.current?.abort();
            requestRef.current = null;
            createRequestRef.current?.abort();
            createRequestRef.current = null;
            identityRef.current = "";
            setData(null);
            setDataError(null);
            setLoadingKind(null);
            setNotice("");
            setHouseholdId("");
            setSelectedHousehold("");
            setHouseholdName("");
            setOnboardingStep("name");
            setCreateRequestId("");
            setCreatedHousehold(null);
            setCreatePending(false);
            setCreateError(null);
            setUser(null);
            setAuthState("error");
            setAuthError(authMessage(error));
          },
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setAuthState("error");
          setAuthError(authMessage(error));
        }
      });
    return () => {
      active = false;
      requestRef.current?.abort();
      createRequestRef.current?.abort();
      unsubscribe();
    };
  }, []);

  const getIdToken = useCallback(async () => {
    if (!user)
      throw new CanonicalApiError(
        "unauthenticated",
        "Sign in before accessing household records.",
      );
    return user.getIdToken();
  }, [user]);

  function clearRecords(message = "") {
    requestRef.current?.abort();
    requestRef.current = null;
    setData(null);
    setDataError(null);
    setLoadingKind(null);
    setNotice(message);
  }

  async function handleSignIn() {
    setBusy(true);
    setAuthError("");
    setNotice("");
    try {
      const firebase = await getFirebaseClient();
      if (!firebase) {
        setAuthState("unavailable");
        return;
      }
      const { signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(firebase.auth, firebase.provider);
    } catch (error) {
      setAuthError(authMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    setNotice("");
    try {
      const firebase = await getFirebaseClient();
      if (!firebase) {
        setAuthState("unavailable");
        return;
      }
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword } =
        await import("firebase/auth");
      if (emailMode === "create") {
        await createUserWithEmailAndPassword(
          firebase.auth,
          email.trim(),
          password,
        );
      } else {
        await signInWithEmailAndPassword(firebase.auth, email.trim(), password);
      }
      setPassword("");
    } catch (error) {
      setAuthError(authMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    createRequestRef.current?.abort();
    createRequestRef.current = null;
    setCreatePending(false);
    clearRecords();
    setHouseholdId("");
    setSelectedHousehold("");
    liveHousehold.setHouseholdId("");
    setBusy(true);
    setAuthError("");
    try {
      const firebase = await getFirebaseClient();
      if (!firebase) return;
      const { signOut } = await import("firebase/auth");
      await signOut(firebase.auth);
    } catch (error) {
      setAuthError(authMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function updateHousehold(value: string) {
    setHouseholdId(value);
    setSelectedHousehold("");
    clearRecords();
    liveHousehold.setHouseholdId("");
  }

  async function loadRecords(kind: "kitchen" | "shopping") {
    if (!user) {
      setDataError(
        new CanonicalApiError(
          "unauthenticated",
          "Sign in before loading household data.",
        ),
      );
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setData(null);
    setDataError(null);
    setNotice("");
    setLoadingKind(kind);
    try {
      const token = await user.getIdToken();
      if (controller.signal.aborted) return;
      const result = await readCanonicalRecords(
        kind,
        token,
        selectedHousehold,
        controller.signal,
      );
      if (!controller.signal.aborted && identityRef.current === user.uid)
        setData(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      setDataError(
        error instanceof CanonicalApiError
          ? error
          : new CanonicalApiError(
              "unexpected",
              "Household records could not be loaded.",
            ),
      );
    } finally {
      if (!controller.signal.aborted) setLoadingKind(null);
    }
  }

  function submitHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scope = householdId.trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(scope)) return;
    setSelectedHousehold(scope);
    liveHousehold.setHouseholdId(scope);
    setRevision((value) => value + 1);
    clearRecords("Household selected. Load records to check your access.");
  }

  function reviewHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = householdName.trim();
    if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return;
    setHouseholdName(name);
    setCreateRequestId(crypto.randomUUID());
    setCreateError(null);
    setOnboardingStep("review");
  }

  async function createHousehold() {
    if (!user || authState !== "signed-in" || onboardingStep !== "review" || !createRequestId || createPending) return;
    createRequestRef.current?.abort();
    const controller = new AbortController();
    createRequestRef.current = controller;
    const identity = user.uid;
    setCreatePending(true);
    setCreateError(null);
    try {
      const token = await user.getIdToken();
      if (controller.signal.aborted) return;
      const result = await createCanonicalHousehold(token, householdName, createRequestId, controller.signal);
      if (controller.signal.aborted || identityRef.current !== identity) return;
      clearRecords();
      setHouseholdId(result.household_id);
      setSelectedHousehold(result.household_id);
      liveHousehold.setHouseholdId(result.household_id);
      setRevision((value) => value + 1);
      setCreatedHousehold(result);
      setOnboardingStep("complete");
      setNotice("Household created and selected for this tab.");
    } catch (error) {
      if (controller.signal.aborted) return;
      setCreateError(error instanceof CanonicalApiError ? error : new CanonicalApiError("unexpected", "The household service could not confirm this request."));
    } finally {
      if (!controller.signal.aborted) setCreatePending(false);
    }
  }

  const canChangeHouseholdName = !createError || ["validation", "unauthenticated", "forbidden"].includes(createError.code);

  function commandCommitted() {
    clearRecords(
      "Change recorded. Reload household lists to see the latest versions.",
    );
    setRevision((value) => value + 1);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Badge tone="amber" className="mb-3">
          HOUSEHOLD ACCOUNT
        </Badge>
        <Heading as="h1">Household connection</Heading>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Sign in to view records for a household you already belong to. These
          records are read from the household service. Opening them does not
          change your records or membership.
        </p>
      </header>

      <Card
        className="space-y-4 border border-line p-5 sm:p-6"
        aria-labelledby="identity-title"
      >
        <div>
          <Heading id="identity-title" as="h2">
            Your account
          </Heading>
          <p className="mt-1 text-sm text-muted">
            Sign in with Google or an email and password. Your session lasts for
            this browser tab.
          </p>
        </div>
        {authState === "loading" && (
          <p role="status" className="text-sm text-muted">
            Checking sign-in status…
          </p>
        )}
        {authState === "unavailable" && (
          <div
            role="status"
            className="rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed text-muted"
          >
            Household sign-in is not configured for this app yet. No demo
            account or local household records are provided here.
          </div>
        )}
        {authState === "signed-out" && (
          <div className="space-y-5">
            <Button onClick={handleSignIn} disabled={busy} aria-busy={busy}>
              {busy ? "Opening Google sign-in…" : "Continue with Google"}
            </Button>
            <div
              className="flex border-b border-line"
              role="group"
              aria-label="Email account action"
            >
              <button
                type="button"
                className={`min-h-11 border-b-2 px-3 text-sm font-semibold ${emailMode === "sign-in" ? "border-primary text-primary" : "border-transparent text-muted"}`}
                onClick={() => {
                  setEmailMode("sign-in");
                  setAuthError("");
                }}
              >
                Sign in with email
              </button>
              <button
                type="button"
                className={`min-h-11 border-b-2 px-3 text-sm font-semibold ${emailMode === "create" ? "border-primary text-primary" : "border-transparent text-muted"}`}
                onClick={() => {
                  setEmailMode("create");
                  setAuthError("");
                }}
              >
                Create account
              </button>
            </div>
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <label
                htmlFor="account-email"
                className="block text-sm font-semibold text-foreground"
              >
                Email
              </label>
              <Input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label
                htmlFor="account-password"
                className="block text-sm font-semibold text-foreground"
              >
                Password
              </label>
              <Input
                id="account-password"
                type="password"
                autoComplete={
                  emailMode === "create" ? "new-password" : "current-password"
                }
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={busy}
                aria-busy={busy}
              >
                {busy
                  ? "Connecting…"
                  : emailMode === "create"
                    ? "Create account"
                    : "Sign in with email"}
              </Button>
            </form>
          </div>
        )}
        {authState === "signed-in" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-primary">Signed in</p>
              <p className="break-all text-sm text-muted">
                {user?.email || "Google account"}
              </p>
            </div>
            <Button variant="secondary" onClick={handleSignOut} disabled={busy}>
              {busy ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        )}
        {authState === "error" && (
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload and retry sign-in
          </Button>
        )}
        {authError && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {authError}
          </p>
        )}
      </Card>

      {authState === "signed-in" && (!selectedHousehold || onboardingStep === "complete") && (
        <Card className="space-y-4 border border-line p-5 sm:p-6" aria-labelledby="onboarding-title">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Household setup</span>
            <Badge>{onboardingStep === "complete" ? "Ready" : `Step ${onboardingStep === "name" ? "1" : "2"} of 2`}</Badge>
          </div>
          <div>
            <Heading id="onboarding-title" as="h2">
              {onboardingStep === "complete" ? "Your kitchen is ready" : onboardingStep === "review" ? "Review your household" : "Who’s sharing your kitchen?"}
            </Heading>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {onboardingStep === "complete" ? "This household is selected in the current tab. Your sign-in and household membership stay under your control." : onboardingStep === "review" ? "Check the name once more. EcoLoop will create the household only after you confirm." : "Start with your own private kitchen. You can use it right away once the household service is enabled."}
            </p>
          </div>
          {onboardingStep === "name" && (
            <form onSubmit={reviewHousehold} className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" aria-hidden="true" />
                <div className="pl-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-primary">Just me</p>
                      <p className="mt-0.5 text-xs text-muted">Your personal kitchen</p>
                    </div>
                    <span aria-label="Selected" className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">✓</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs text-muted">
                    <li>• Your own household records</li>
                    <li>• No invitations or shared access are set up</li>
                  </ul>
                  <div className="mt-4 border-t border-line pt-3">
                    <label htmlFor="new-household-name" className="block text-xs font-semibold text-primary">Household name</label>
                    <Input id="new-household-name" className="mt-2 bg-surface-muted text-sm" required maxLength={80} autoComplete="off" value={householdName} onChange={(event) => setHouseholdName(event.target.value)} placeholder="For example, My kitchen" aria-describedby="new-household-help" />
                    <p id="new-household-help" className="mt-2 text-xs leading-relaxed text-muted">Choose a name you’ll recognize. No food or personal details are needed.</p>
                  </div>
                </div>
              </div>
              <Card className="bg-primary-soft/60 p-4 text-xs leading-relaxed text-primary">Your personal order history stays private. This setup does not invite other people or share records.</Card>
              <Button type="submit" fullWidth>Continue</Button>
            </form>
          )}
          {onboardingStep === "review" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface-muted p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Household name</p>
                <p className="mt-1 break-words text-lg font-semibold text-primary">{householdName}</p>
              </div>
              {process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_HOUSEHOLD_CREATE !== "true" && <p role="status" className="text-sm leading-relaxed text-muted">Household creation is currently disabled for this app. Your name is saved only on this page; no request has been sent.</p>}
              {createError && <Card role="alert" className="space-y-2 border border-danger/25 bg-danger-soft/40 p-4"><p className="text-sm font-semibold text-danger">{createError.message}</p>{createError.requestId && <p className="text-xs text-muted">Request reference: {createError.requestId}</p>}{(createError.code === "timeout" || createError.code === "network" || createError.code === "unavailable") && <p className="text-xs text-muted">Retrying keeps the same request reference so the service can recognize this creation attempt.</p>}</Card>}
              {createError && !canChangeHouseholdName && <p role="status" className="text-xs leading-relaxed text-muted">Retry this same request before changing the name. The previous result could not be confirmed.</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setOnboardingStep("name")} variant="secondary" disabled={createPending || !canChangeHouseholdName}>Back</Button>
                <Button onClick={() => void createHousehold()} fullWidth disabled={createPending || process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_HOUSEHOLD_CREATE !== "true"} aria-busy={createPending}>{createPending ? "Creating household…" : createError ? "Retry household creation" : "Create household"}</Button>
              </div>
            </div>
          )}
          {onboardingStep === "complete" && createdHousehold && (
            <div className="space-y-3" role="status">
              <div className="rounded-2xl bg-primary-soft p-4">
                <p className="font-semibold text-primary">{createdHousehold.name}</p>
                <p className="mt-1 break-all text-xs text-muted">Household ID: {createdHousehold.household_id}</p>
                <p className="mt-1 text-xs text-muted">Your role: {createdHousehold.role}</p>
              </div>
              <p className="text-sm leading-relaxed text-muted">You can now open Home, Kitchen, Ask, or Shop with this selected household.</p>
            </div>
          )}
        </Card>
      )}

      <Card
        className="space-y-4 border border-line p-5 sm:p-6"
        aria-labelledby="scope-title"
      >
        <div>
          <Heading id="scope-title" as="h2">
            Choose a household
          </Heading>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Use the exact ID for a household you already belong to. Access is
            checked by the API for every request; this picker does not change
            household membership.
          </p>
        </div>
        <form onSubmit={submitHousehold} className="space-y-3">
          <label
            htmlFor="household-id"
            className="block text-sm font-semibold text-foreground"
          >
            Household ID
          </label>
          <Input
            id="household-id"
            value={householdId}
            onChange={(event) => updateHousehold(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={128}
            pattern="[A-Za-z0-9_-]{1,128}"
            placeholder="Enter household ID"
            aria-describedby="household-help"
          />
          <p id="household-help" className="text-xs leading-relaxed text-muted">
            Your household choice is kept in this tab to load the four main
            destinations and is cleared when you change accounts or sign out.
          </p>
          <Button type="submit" variant="secondary">
            Use this household
          </Button>
        </form>
        {notice && (
          <p role="status" className="text-sm text-muted">
            {notice}
          </p>
        )}
      </Card>

      <section aria-labelledby="canonical-title" className="space-y-4">
        <div>
          <Heading id="canonical-title" as="h2">
            View household records
          </Heading>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Kitchen and shopping records below are fetched from the household
            API. Viewing them does not change records or membership.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="primary"
            onClick={() => void loadRecords("kitchen")}
            disabled={
              !user ||
              authState !== "signed-in" ||
              !selectedHousehold ||
              loadingKind !== null
            }
            aria-busy={loadingKind === "kitchen"}
          >
            {loadingKind === "kitchen" ? "Loading kitchen…" : "Load kitchen"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void loadRecords("shopping")}
            disabled={
              !user ||
              authState !== "signed-in" ||
              !selectedHousehold ||
              loadingKind !== null
            }
            aria-busy={loadingKind === "shopping"}
          >
            {loadingKind === "shopping" ? "Loading shopping…" : "Load shopping"}
          </Button>
        </div>
        {dataError && (
          <Card
            className="space-y-3 border border-danger/25 bg-danger-soft/40 p-4"
            role="alert"
          >
            <p className="text-sm font-semibold text-danger">
              {dataError.message}
            </p>
            {dataError.requestId && (
              <p className="text-xs text-muted">
                Request reference: {dataError.requestId}
              </p>
            )}
            {dataError.code === "unauthenticated" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSignIn}
                disabled={busy}
              >
                Sign in again
              </Button>
            )}
            {dataError.code === "conflict" && (
              <p className="text-xs text-muted">
                Reload the selected records to get the current version.
              </p>
            )}
            {dataError.code === "rate_limited" && (
              <p className="text-xs text-muted">Retry after waiting briefly.</p>
            )}
            {dataError.code === "unavailable" && (
              <p className="text-xs text-muted">
                Retry when the service is available.
              </p>
            )}
          </Card>
        )}
        {loadingKind && (
          <Card
            role="status"
            className="border border-line p-5 text-sm text-muted"
          >
            Loading household {loadingKind} records…
          </Card>
        )}
        {data && data.records.length === 0 && (
          <Card className="border border-dashed border-line p-6 text-center">
            <p className="font-semibold text-primary">No {data.kind} records</p>
            <p className="mt-1 text-sm text-muted">
              There are no recorded items in this household list.
            </p>
          </Card>
        )}
        {data && data.records.length > 0 && (
          <Card className="border border-line p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Heading as="h3">
                {data.kind === "kitchen" ? "Kitchen" : "Shopping"}
              </Heading>
              <Badge>
                {data.records.length}{" "}
                {data.records.length === 1 ? "record" : "records"}
              </Badge>
            </div>
            <ul className="divide-y divide-line">
              {data.kind === "kitchen"
                ? data.records.map((record) => (
                    <li
                      key={record.item_id}
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <p className="font-semibold text-primary">
                        {record.name}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {record.amount === null
                          ? "Amount unknown"
                          : `${record.amount} ${record.unit}`}{" "}
                        ·{" "}
                        {record.date_type === "UNKNOWN"
                          ? "Date unknown"
                          : record.date_value || record.date_type}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Version {record.version} · Confirmed{" "}
                        {formatDate(record.observed_at)}
                      </p>
                    </li>
                  ))
                : data.records.map((record) => (
                    <li
                      key={record.entry_id}
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <p className="font-semibold text-primary">
                        {record.item_name}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {record.desired_amount === null
                          ? "Amount unspecified"
                          : `${record.desired_amount} ${record.unit}`}{" "}
                        · Version {record.version}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Updated {formatDate(record.updated_at)}
                      </p>
                    </li>
                  ))}
            </ul>
          </Card>
        )}
      </section>
      {user && authState === "signed-in" && selectedHousehold ? (
        <div
          key={`${user.uid}:${selectedHousehold}:${revision}`}
          className="space-y-6"
        >
          <CanonicalCommandControls
            getIdToken={getIdToken}
            householdId={selectedHousehold}
            enabled={process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true"}
            onCommitted={commandCommitted}
          />
          <OutcomeControls
            getIdToken={getIdToken}
            householdId={selectedHousehold}
            enabled={process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true"}
            onCommitted={commandCommitted}
          />
          <ShareControls
            getIdToken={getIdToken}
            householdId={selectedHousehold}
            ownerUid={user.uid}
            enabled={process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true"}
            onCommitted={commandCommitted}
          />
          <PrivateHistory
            getIdToken={getIdToken}
            householdId={selectedHousehold}
            ownerUid={user.uid}
          />
        </div>
      ) : (
        <Card className="border border-line p-5 text-sm leading-relaxed text-muted">
          Sign in and select a household to access private history. Household
          changes remain unavailable until this app’s connection has been
          verified and enabled.
        </Card>
      )}
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "time unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function authMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  )
    return "The email or password is incorrect.";
  if (code === "auth/weak-password")
    return "Choose a stronger password with at least six characters.";
  if (code === "auth/operation-not-allowed")
    return "This sign-in method is not enabled in Firebase Authentication settings.";
  if (code === "auth/popup-closed-by-user")
    return "Sign-in was cancelled. You can continue when you are ready.";
  if (code === "auth/unauthorized-domain")
    return "This site is not authorized for Firebase sign-in. Add its hostname in Firebase Authentication settings.";
  if (code === "auth/popup-blocked")
    return "The browser blocked the sign-in popup. Allow popups for this site, then try again.";
  return "Firebase sign-in could not be completed. Check the Firebase Auth configuration and try again.";
}
