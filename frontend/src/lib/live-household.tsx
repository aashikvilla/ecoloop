"use client";

import type { User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getFirebaseClient } from "./firebase-client";

type LiveHouseholdState = {
  auth: "loading" | "unavailable" | "signed-out" | "signed-in" | "error";
  user: User | null;
  householdId: string;
  setHouseholdId: (value: string) => void;
};
const LiveHouseholdContext = createContext<LiveHouseholdState | null>(null);

export function LiveHouseholdProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<LiveHouseholdState["auth"]>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdIdState] = useState("");
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
        setUser(next);
        setHouseholdIdState("");
        setAuth(next ? "signed-in" : "signed-out");
      }, () => { authResolved = true; window.clearTimeout(authTimeout); setUser(null); setHouseholdIdState(""); setAuth("error"); });
    }).catch(() => { authResolved = true; window.clearTimeout(authTimeout); if (active) setAuth("error"); });
    return () => { active = false; window.clearTimeout(authTimeout); unsubscribe(); };
  }, []);
  const value = useMemo(() => ({ auth, user, householdId, setHouseholdId: setHouseholdIdState }), [auth, user, householdId]);
  return <LiveHouseholdContext.Provider value={value}>{children}</LiveHouseholdContext.Provider>;
}

export function useLiveHousehold() {
  const value = useContext(LiveHouseholdContext);
  if (!value) throw new Error("LiveHouseholdProvider is missing.");
  return value;
}
