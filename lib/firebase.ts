// TenoPilot Firebase Client Initialization (TAS Chapter 4 & 9)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Prevent duplicate initialization during Hot Module Replacement (HMR)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreDb: Firestore;
try {
  if (typeof window !== "undefined") {
    // Enable multi-tab IndexedDB disk persistence for 0ms offline loads and resilience to slow network/loss
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } else {
    firestoreDb = getFirestore(app);
  }
} catch {
  firestoreDb = getFirestore(app);
}

export const auth = getAuth(app);
export const db = firestoreDb;
export const storage = getStorage(app);
export default app;
