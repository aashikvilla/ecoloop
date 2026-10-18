"use client";

import type { User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getFirebaseClient } from "./firebase-client";

type LiveHouseholdState = {
  auth: "loading" | "unavailable" | "signed-out" | "signed-in" | "error";
  user: User | null;
  householdId: string;
  setHouseholdId: (value: string) => void;
};
const LiveHouseholdContext = createContext<LiveHouseholdState | null>(null);
const householdStorageKey = (uid: string) => `ecoloop:${uid}:household`;

function readSavedHousehold(uid: string) {
	try {
		return window.sessionStorage.getItem(householdStorageKey(uid)) ?? "";
	} catch {
		return "";
	}
}

export function LiveHouseholdProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<LiveHouseholdState["auth"]>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdIdState] = useState("");
	const uidRef = useRef("");
	const setHouseholdId = useCallback((value: string) => {
		setHouseholdIdState(value);
		const uid = uidRef.current;
		if (!uid) return;
		try {
			if (value) window.sessionStorage.setItem(householdStorageKey(uid), value);
			else window.sessionStorage.removeItem(householdStorageKey(uid));
		} catch {
			// The session remains usable when browser storage is unavailable.
		}
	}, []);
  useEffect(() => {
    let active = true;
    let authResolved = false;
    let unsubscribe = () => {};
    const authTimeout = window.setTimeout(() => {
      if (active && !authResolved) setAuth("error");
    }, 12_000);
    void getFirebaseClient().then(async (firebase) => {
      if (!active) return;
      if (!firebase) { authResolved = true; window.clearTimeout(authTimeout); setAuth("unavailable"); return; }
      const { onAuthStateChanged } = await import("firebase/auth");
      if (!active) return;
      unsubscribe = onAuthStateChanged(firebase.auth, (next) => {
        authResolved = true;
        window.clearTimeout(authTimeout);
			const nextUid = next?.uid ?? "";
			if (uidRef.current && uidRef.current !== nextUid) {
				try { window.sessionStorage.removeItem(householdStorageKey(uidRef.current)); } catch { /* Storage is optional. */ }
			}
			uidRef.current = nextUid;
        setUser(next);
			setHouseholdIdState(nextUid ? readSavedHousehold(nextUid) : "");
        setAuth(next ? "signed-in" : "signed-out");
		}, () => { authResolved = true; window.clearTimeout(authTimeout); uidRef.current = ""; setUser(null); setHouseholdIdState(""); setAuth("error"); });
    }).catch(() => { authResolved = true; window.clearTimeout(authTimeout); if (active) setAuth("error"); });
    return () => { active = false; window.clearTimeout(authTimeout); unsubscribe(); };
  }, []);
	const value = useMemo(() => ({ auth, user, householdId, setHouseholdId }), [auth, user, householdId, setHouseholdId]);
  return <LiveHouseholdContext.Provider value={value}>{children}</LiveHouseholdContext.Provider>;
}

export function useLiveHousehold() {
  const value = useContext(LiveHouseholdContext);
  if (!value) throw new Error("LiveHouseholdProvider is missing.");
  return value;
}
