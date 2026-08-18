// TenoPilot Firebase Client Initialization (TAS Chapter 4 & 9)
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  getAuth,
  Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
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

// 🛡️ Resilient Auth Multi-Persistence Fallback Chain
// Prevents "Database is closing / hidden" errors by automatically falling back to localStorage/inMemory
let authInstance: Auth;
try {
  if (typeof window !== "undefined") {
    authInstance = initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        inMemoryPersistence,
      ],
    });
  } else {
    authInstance = getAuth(app);
  }
} catch {
  authInstance = getAuth(app);
}

// 🏢 Multi-Tab Resilient Firestore Cache
// Supports multiple concurrent tabs & backgrounded tabs on Desktop, Tablets & Smartphones
let dbInstance: Firestore;
try {
  if (typeof window !== "undefined") {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } else {
    dbInstance = getFirestore(app);
  }
} catch {
  dbInstance = getFirestore(app);
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = getStorage(app);
export default app;
