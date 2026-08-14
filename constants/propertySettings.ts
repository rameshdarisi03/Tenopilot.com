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

export const CLEAN_ZERO_PROPERTY_SETTINGS: PropertySettingsData = {
  billingCycleDates: "1st to End of Month",
  desiredDueDate: 5,
  gracePeriodDays: 5,
  defaultSecurityDeposit: 0,
  upiPaymentId: "",
  propertyName: "New Property Estate",
  propertyAddress: "",
  managerPhone: "",
  qrProfiles: DEFAULT_QR_PROFILES,
  rentalTiers: {
    sharing1: 0,
    sharing2: 0,
    sharing3: 0,
    sharing4: 0,
  },
};

export const DEFAULT_PROPERTY_SETTINGS = CLEAN_ZERO_PROPERTY_SETTINGS;

let currentSettings: PropertySettingsData = { ...CLEAN_ZERO_PROPERTY_SETTINGS };
let activeUnsubscribe: (() => void) | null = null;
let activePropertyId: string | null = null;

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

  initFirebaseListener(propertyId?: string) {
    if (!propertyId || typeof window === "undefined" || !db) return;
    if (activePropertyId === propertyId && activeUnsubscribe) return;

    if (activeUnsubscribe) {
      activeUnsubscribe();
      activeUnsubscribe = null;
    }

    activePropertyId = propertyId;

    try {
      const docRef = doc(db, `properties/${propertyId}/settings/config`);
      activeUnsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as PropertySettingsData;
            currentSettings = { ...CLEAN_ZERO_PROPERTY_SETTINGS, ...data };
            if (typeof window !== "undefined") {
              localStorage.setItem(`tenopilot_settings_${propertyId}`, JSON.stringify(currentSettings));
            }
            this.notify();
          } else {
            currentSettings = { ...CLEAN_ZERO_PROPERTY_SETTINGS };
            this.notify();
          }
        },
        (err) => {
          console.warn("Realtime settings snapshot notice:", err);
        }
      );
    } catch (e) {
      console.warn("Failed to attach onSnapshot listener", e);
    }
  },

  getSettings(propertyId?: string): PropertySettingsData {
    if (!propertyId) return CLEAN_ZERO_PROPERTY_SETTINGS;
    this.initFirebaseListener(propertyId);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`tenopilot_settings_${propertyId}`);
      if (saved) {
        try {
          currentSettings = { ...CLEAN_ZERO_PROPERTY_SETTINGS, ...JSON.parse(saved) };
          return currentSettings;
        } catch {
          // fallback
        }
      }
    }
    currentSettings = { ...CLEAN_ZERO_PROPERTY_SETTINGS };
    return currentSettings;
  },

  async updateSettings(newSettings: Partial<PropertySettingsData>, propertyId?: string): Promise<PropertySettingsData> {
    if (!propertyId) return CLEAN_ZERO_PROPERTY_SETTINGS;
    currentSettings = { ...currentSettings, ...newSettings };
    if (typeof window !== "undefined") {
      localStorage.setItem(`tenopilot_settings_${propertyId}`, JSON.stringify(currentSettings));
    }

    this.notify();

    try {
      if (db) {
        const docRef = doc(db, `properties/${propertyId}/settings/config`);
        await setDoc(docRef, currentSettings, { merge: true });
      }
    } catch (e) {
      console.warn("Firestore settings update notice:", e);
    }

    return currentSettings;
  },

  async fetchSettingsFromFirestore(propertyId?: string): Promise<PropertySettingsData> {
    if (!propertyId) return CLEAN_ZERO_PROPERTY_SETTINGS;
    this.initFirebaseListener(propertyId);
    try {
      if (db) {
        const docRef = doc(db, `properties/${propertyId}/settings/config`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as PropertySettingsData;
          currentSettings = { ...CLEAN_ZERO_PROPERTY_SETTINGS, ...data };
          if (typeof window !== "undefined") {
            localStorage.setItem(`tenopilot_settings_${propertyId}`, JSON.stringify(currentSettings));
          }
        }
      }
    } catch (e) {
      console.warn("Firestore settings fetch notice:", e);
    }
    return currentSettings;
  },
};
