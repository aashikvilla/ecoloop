import type { Auth, GoogleAuthProvider } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";

export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

export type FirebaseClient = { app: FirebaseApp; auth: Auth; provider: GoogleAuthProvider };

function readPublicConfig(): FirebasePublicConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (![apiKey, authDomain, projectId, appId].every((value) => typeof value === "string" && value.trim().length > 0)) return null;
  return {
    apiKey: apiKey!.trim(),
    authDomain: authDomain!.trim(),
    projectId: projectId!.trim(),
    appId: appId!.trim(),
  };
}

let clientPromise: Promise<FirebaseClient> | null = null;

export async function getFirebaseClient(): Promise<FirebaseClient | null> {
  const config = readPublicConfig();
  if (!config || typeof window === "undefined") return null;
  clientPromise ??= Promise.all([import("firebase/app"), import("firebase/auth")]).then(([appSdk, authSdk]) => {
    const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(config);
    return {
      app,
      auth: authSdk.initializeAuth(app, {
        persistence: authSdk.inMemoryPersistence,
        popupRedirectResolver: authSdk.browserPopupRedirectResolver,
      }),
      provider: new authSdk.GoogleAuthProvider(),
    };
  }).catch((error: unknown) => {
    clientPromise = null;
    throw error;
  });
  return clientPromise;
}
