// TenoPilot Property Financial & Operations Settings Store
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PaymentQRProfile {
  id: string;
  name: string; // e.g. "Main PhonePe PG Account"
  bankLabel: string; // e.g. "PhonePe / Yes Bank"
  upiId: string; // e.g. "tenopilot@ybl"
  accountType: "UPI_QR" | "BANK_TRANSFER" | "CASH_DESK";
  isDefault?: boolean;
  qrImageUrl?: string; // Optional custom uploaded image URL/base64
}

export const DEFAULT_QR_PROFILES: PaymentQRProfile[] = [];

export interface PropertySettingsData {
  billingCycleDates: "1st to End of Month" | "Anniversary Date";
  desiredDueDate: number; // e.g. 5 for 5th of every month
  gracePeriodDays: number; // 5 days grace period
  defaultSecurityDeposit: number;
  upiPaymentId: string;
  propertyName: string;
  propertyAddress: string;
  managerPhone: string;
  qrProfiles: PaymentQRProfile[];
  rentalTiers: {
    sharing1: number; // 1-Sharing Private Room
    sharing2: number; // 2-Sharing Double Room
    sharing3: number; // 3-Sharing Triple Room
    sharing4: number; // 4-Sharing Four Room
  };
}

export const DEFAULT_PROPERTY_RENTAL_TIERS = {
  sharing1: 20000,
  sharing2: 12000,
  sharing3: 8500,
  sharing4: 6000,
};

export const CLEAN_ZERO_PROPERTY_SETTINGS: PropertySettingsData = {
  billingCycleDates: "1st to End of Month",
  desiredDueDate: 5,
  gracePeriodDays: 5,
  defaultSecurityDeposit: 24000,
  upiPaymentId: "",
  propertyName: "New Property Estate",
  propertyAddress: "",
  managerPhone: "",
  qrProfiles: DEFAULT_QR_PROFILES,
  rentalTiers: { ...DEFAULT_PROPERTY_RENTAL_TIERS },
};

export const DEFAULT_PROPERTY_SETTINGS: PropertySettingsData = {
  billingCycleDates: "1st to End of Month",
  desiredDueDate: 5,
  gracePeriodDays: 5,
  defaultSecurityDeposit: 24000,
  upiPaymentId: "tenopilot@ybl",
  propertyName: "Sunshine Heights PG",
  propertyAddress: "Plot 42, Silicon Valley, Hitech City, Hyderabad",
  managerPhone: "+91 98765 43210",
  qrProfiles: DEFAULT_QR_PROFILES,
  rentalTiers: { ...DEFAULT_PROPERTY_RENTAL_TIERS },
};

// In-Memory Multi-Tenant Cache & Active Listeners Map
const PROPERTY_SETTINGS_MAP = new Map<string, PropertySettingsData>();
const ACTIVE_SETTINGS_UNSUBSCRIBES = new Map<string, () => void>();

export const propertySettingsStore = {
  listeners: new Set<() => void>(),

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  },

  notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn("PropertySettings listener error:", e);
      }
    });
  },

  /**
   * Initialize Real-time Cloud Firestore listener for properties/{propertyId}/settings/config
   */
  initFirebaseListener(propertyId?: string) {
    if (!propertyId || typeof window === "undefined" || !db) return;
    if (ACTIVE_SETTINGS_UNSUBSCRIBES.has(propertyId)) return;

    try {
      const docRef = doc(db, `properties/${propertyId}/settings/config`);
      const unsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Partial<PropertySettingsData>;
            const existing = PROPERTY_SETTINGS_MAP.get(propertyId) || { ...CLEAN_ZERO_PROPERTY_SETTINGS };
            const merged: PropertySettingsData = {
              ...CLEAN_ZERO_PROPERTY_SETTINGS,
              ...existing,
              ...data,
              rentalTiers: {
                ...DEFAULT_PROPERTY_RENTAL_TIERS,
                ...(existing.rentalTiers || {}),
                ...(data.rentalTiers || {}),
              },
            };
            PROPERTY_SETTINGS_MAP.set(propertyId, merged);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(`tenopilot_settings_${propertyId}`, JSON.stringify(merged));
              } catch {}
            }
            this.notify();
          }
        },
        (err) => {
          console.warn(`Realtime settings snapshot notice for ${propertyId}:`, err);
        }
      );

      ACTIVE_SETTINGS_UNSUBSCRIBES.set(propertyId, unsub);
    } catch (e) {
      console.warn("Failed to attach settings onSnapshot listener", e);
    }
  },

  /**
   * Get Settings synchronously from in-memory cache or localStorage
   */
  getSettings(propertyId?: string): PropertySettingsData {
    if (!propertyId) return { ...CLEAN_ZERO_PROPERTY_SETTINGS };

    this.initFirebaseListener(propertyId);

    if (PROPERTY_SETTINGS_MAP.has(propertyId)) {
      return PROPERTY_SETTINGS_MAP.get(propertyId)!;
    }

    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`tenopilot_settings_${propertyId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          const merged: PropertySettingsData = {
            ...CLEAN_ZERO_PROPERTY_SETTINGS,
            ...parsed,
            rentalTiers: {
              ...DEFAULT_PROPERTY_RENTAL_TIERS,
              ...(parsed.rentalTiers || {}),
            },
          };
          PROPERTY_SETTINGS_MAP.set(propertyId, merged);
          return merged;
        }
      } catch {}
    }

    const initial = propertyId === "sunshine-pg"
      ? { ...DEFAULT_PROPERTY_SETTINGS }
      : { ...CLEAN_ZERO_PROPERTY_SETTINGS };
    PROPERTY_SETTINGS_MAP.set(propertyId, initial);
    return initial;
  },

  /**
   * Update Settings in memory, localStorage, and Cloud Firestore
   */
  async updateSettings(newSettings: Partial<PropertySettingsData>, propertyId?: string): Promise<PropertySettingsData> {
    if (!propertyId) return { ...CLEAN_ZERO_PROPERTY_SETTINGS };

    const current = this.getSettings(propertyId);
    const updated: PropertySettingsData = {
      ...current,
      ...newSettings,
      rentalTiers: {
        ...DEFAULT_PROPERTY_RENTAL_TIERS,
        ...(current.rentalTiers || {}),
        ...(newSettings.rentalTiers || {}),
      },
    };

    PROPERTY_SETTINGS_MAP.set(propertyId, updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`tenopilot_settings_${propertyId}`, JSON.stringify(updated));
      } catch {}
    }

    this.notify();

    if (typeof window !== "undefined" && db) {
      try {
        const docRef = doc(db, `properties/${propertyId}/settings/config`);
        await setDoc(docRef, updated, { merge: true });
      } catch (e) {
        console.warn(`Firestore settings update notice for ${propertyId}:`, e);
      }
    }

    return updated;
  },

  /**
   * Direct fetch from Firestore
   */
  async fetchSettingsFromFirestore(propertyId?: string): Promise<PropertySettingsData> {
    if (!propertyId) return { ...CLEAN_ZERO_PROPERTY_SETTINGS };
    this.initFirebaseListener(propertyId);

    if (typeof window !== "undefined" && db) {
      try {
        const docRef = doc(db, `properties/${propertyId}/settings/config`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<PropertySettingsData>;
          const current = this.getSettings(propertyId);
          const merged: PropertySettingsData = {
            ...current,
            ...data,
            rentalTiers: {
              ...DEFAULT_PROPERTY_RENTAL_TIERS,
              ...(current.rentalTiers || {}),
              ...(data.rentalTiers || {}),
            },
          };
          PROPERTY_SETTINGS_MAP.set(propertyId, merged);
          try {
            localStorage.setItem(`tenopilot_settings_${propertyId}`, JSON.stringify(merged));
          } catch {}
          this.notify();
          return merged;
        }
      } catch (e) {
        console.warn(`Firestore settings fetch notice for ${propertyId}:`, e);
      }
    }

    return this.getSettings(propertyId);
  },
};
