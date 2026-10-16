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
import {
  CanonicalApiError,
  readCanonicalRecords,
  type CanonicalData,
} from "@/lib/canonical-api";
import { CanonicalCommandControls } from "./command-controls";
import { PrivateHistory } from "./private-history";

type AuthState =
  | "loading"
  | "unavailable"
  | "signed-out"
  | "signed-in"
  | "error";

export function AccountConnection() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"sign-in" | "create">("sign-in");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState("");
  const [selectedHousehold, setSelectedHousehold] = useState("");
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<CanonicalData | null>(null);
  const [dataError, setDataError] = useState<CanonicalApiError | null>(null);
  const [loadingKind, setLoadingKind] = useState<"kitchen" | "shopping" | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const requestRef = useRef<AbortController | null>(null);
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
              identityRef.current = nextKey;
            }
            setUser(nextUser);
            setAuthState(nextUser ? "signed-in" : "signed-out");
          },
          (error) => {
            requestRef.current?.abort();
            requestRef.current = null;
            identityRef.current = "";
            setData(null);
            setDataError(null);
            setLoadingKind(null);
            setNotice("");
            setHouseholdId("");
            setSelectedHousehold("");
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
    clearRecords();
    setHouseholdId("");
    setSelectedHousehold("");
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
    setRevision((value) => value + 1);
    clearRecords("Household selected. Load records to check your access.");
  }

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
          records stay separate from this browser’s demo. Opening them does not
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
            Household sign-in is not configured for this app yet. You can
            continue using the separate local demo.
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

      <Card
        className="space-y-4 border border-line p-5 sm:p-6"
        aria-labelledby="scope-title"
      >
        <div>
          <Heading id="scope-title" as="h2">
            Choose a household
          </Heading>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Enter the exact household ID you were given. Access is checked by
            the API for every request; this screen cannot join or create a
            household.
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
            Your household choice is cleared when you change accounts or leave
            this page.
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
            You can view your connected household here. Demo records are kept in
            this browser and are never sent with these requests.
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
