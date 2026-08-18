// TenoPilot Portfolio & Multi-Building Synchronization Store
// 100% Direct Cloud Firestore Database Real-time Sync across all devices (Desktop, Mobile, Tablet)

import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PortfolioProperty {
  id: string;
  name: string;
  location: string;
  bedsCount: number;
  occupancyRate: string;
  collectionRate: string;
  status: "HEALTHY" | "TASKS PENDING";
  tasksCount?: number;
  gradient?: string;
  createdAt?: string;
  ownerEmail?: string;
}

// In-Memory Cloud Firestore Real-time Reactive Cache
let IN_MEMORY_PROPERTIES: PortfolioProperty[] = [];
let ACTIVE_PORTFOLIO_UNSUB: (() => void) | null = null;
let currentOwnerKey = "global_master";
const listeners = new Set<() => void>();

function sanitizeOwnerKey(email?: string | null): string {
  if (!email || typeof email !== "string") return "global_master";
  const clean = email.toLowerCase().trim();
  if (clean === "isharapandey01@gmail.com" || clean.includes("admin")) {
    return "global_master";
  }
  return clean.replace(/[^a-z0-9]/g, "_");
}

function loadInitialLocalStorage(): PortfolioProperty[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("tenopilot_portfolio_properties");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export const portfolioStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  notify() {
    listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.warn("portfolioStore listener error:", e);
      }
    });
  },

  /**
   * Initialize Real-time Cloud Firestore WebSocket Listener for Portfolio
   * Subscribes to: doc(db, "portfolios", ownerKey)
   */
  initFirebaseListener(ownerEmail?: string | null) {
    if (typeof window === "undefined") return;

    const ownerKey = sanitizeOwnerKey(ownerEmail);
    if (ACTIVE_PORTFOLIO_UNSUB && currentOwnerKey === ownerKey) {
      return;
    }

    if (ACTIVE_PORTFOLIO_UNSUB) {
      ACTIVE_PORTFOLIO_UNSUB();
      ACTIVE_PORTFOLIO_UNSUB = null;
    }

    currentOwnerKey = ownerKey;

    // Load initial local storage cache
    const localProps = loadInitialLocalStorage();
    if (localProps.length > 0 && IN_MEMORY_PROPERTIES.length === 0) {
      IN_MEMORY_PROPERTIES = localProps;
    }

    try {
      const portfolioRef = doc(db, "users", `portfolio_${ownerKey}`);

      ACTIVE_PORTFOLIO_UNSUB = onSnapshot(
        portfolioRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const remoteProps = Array.isArray(data?.properties) ? (data.properties as PortfolioProperty[]) : [];

            // ID-based Map Merge: Merge remote properties with any unique local properties
            const mergedMap = new Map<string, PortfolioProperty>();
            remoteProps.forEach((p) => {
              if (p?.id) mergedMap.set(p.id, p);
            });

            // Check if local cache has any property that remote doesn't have yet (Auto-Upload Migration)
            let hasLocalOnly = false;
            localProps.forEach((lp) => {
              if (lp?.id && !mergedMap.has(lp.id)) {
                mergedMap.set(lp.id, lp);
                hasLocalOnly = true;
              }
            });

            const mergedList = Array.from(mergedMap.values());
            IN_MEMORY_PROPERTIES = mergedList;

            // Sync to local storage for offline resilience
            try {
              localStorage.setItem("tenopilot_portfolio_properties", JSON.stringify(mergedList));
            } catch {}

            // If local properties were migrated, save merged back to Firestore
            if (hasLocalOnly) {
              try {
                await setDoc(portfolioRef, { properties: mergedList, updatedAt: new Date().toISOString() }, { merge: true });
              } catch (err) {
                console.warn("Failed to sync migrated local properties to Firestore:", err);
              }
            }

            portfolioStore.notify();
          } else {
            // Document doesn't exist yet on Firestore -> initialize it with existing local properties
            if (localProps.length > 0) {
              IN_MEMORY_PROPERTIES = localProps;
              try {
                await setDoc(portfolioRef, { properties: localProps, updatedAt: new Date().toISOString() }, { merge: true });
              } catch (err) {
                console.warn("Failed to initialize portfolio document in Firestore:", err);
              }
            }
            portfolioStore.notify();
          }
        },
        (error) => {
          console.warn("Firestore portfolio onSnapshot notice:", error);
        }
      );
    } catch (e) {
      console.warn("Failed to attach portfolioStore onSnapshot:", e);
    }
  },

  /**
   * Get all currently synced properties
   */
  getProperties(): PortfolioProperty[] {
    if (IN_MEMORY_PROPERTIES.length > 0) {
      return IN_MEMORY_PROPERTIES;
    }
    const local = loadInitialLocalStorage();
    if (local.length > 0) {
      IN_MEMORY_PROPERTIES = local;
      return local;
    }
    return [];
  },

  /**
   * Add a new building/property and sync in real-time to Cloud Firestore
   */
  async addProperty(newProperty: PortfolioProperty, ownerEmail?: string | null): Promise<void> {
    const ownerKey = sanitizeOwnerKey(ownerEmail);

    // Update in-memory
    const existingIndex = IN_MEMORY_PROPERTIES.findIndex((p) => p.id === newProperty.id);
    if (existingIndex >= 0) {
      IN_MEMORY_PROPERTIES[existingIndex] = newProperty;
    } else {
      IN_MEMORY_PROPERTIES = [...IN_MEMORY_PROPERTIES, newProperty];
    }

    // Save to local storage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_portfolio_properties", JSON.stringify(IN_MEMORY_PROPERTIES));
      } catch {}
    }

    portfolioStore.notify();

    // Persist directly to Cloud Firestore
    try {
      const portfolioRef = doc(db, "users", `portfolio_${ownerKey}`);
      await setDoc(
        portfolioRef,
        {
          properties: IN_MEMORY_PROPERTIES,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to save new property to Firestore:", error);
    }
  },

  /**
   * Update an existing building/property and sync in real-time to Cloud Firestore
   */
  async updateProperty(updatedProperty: PortfolioProperty, ownerEmail?: string | null): Promise<void> {
    const ownerKey = sanitizeOwnerKey(ownerEmail);

    IN_MEMORY_PROPERTIES = IN_MEMORY_PROPERTIES.map((p) =>
      p.id === updatedProperty.id ? { ...p, ...updatedProperty } : p
    );

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_portfolio_properties", JSON.stringify(IN_MEMORY_PROPERTIES));
      } catch {}
    }

    portfolioStore.notify();

    try {
      const portfolioRef = doc(db, "users", `portfolio_${ownerKey}`);
      await setDoc(
        portfolioRef,
        {
          properties: IN_MEMORY_PROPERTIES,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to update property in Firestore:", error);
    }
  },

  /**
   * Delete a building/property and sync in real-time to Cloud Firestore
   */
  async deleteProperty(propertyId: string, ownerEmail?: string | null): Promise<void> {
    const ownerKey = sanitizeOwnerKey(ownerEmail);

    IN_MEMORY_PROPERTIES = IN_MEMORY_PROPERTIES.filter((p) => p.id !== propertyId);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_portfolio_properties", JSON.stringify(IN_MEMORY_PROPERTIES));
      } catch {}
    }

    portfolioStore.notify();

    try {
      const portfolioRef = doc(db, "users", `portfolio_${ownerKey}`);
      await setDoc(
        portfolioRef,
        {
          properties: IN_MEMORY_PROPERTIES,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to delete property from Firestore:", error);
    }
  },
};
