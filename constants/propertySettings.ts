// TenoPilot Property Financial & Operations Settings Store
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PaymentQRProfile {
  id: string;
  name: string; // e.g. "Main PhonePe PG Account"
  bankLabel: string; // e.g. "PhonePe / Yes Bank"
  upiId: string; // e.g. "saharapg@ybl"
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
  managerPhone: string;
  qrProfiles: PaymentQRProfile[];
  rentalTiers: {
    sharing1: number; // 1-Sharing Private Room (e.g. ₹18,000)
    sharing2: number; // 2-Sharing Double Room (e.g. ₹14,500)
    sharing3: number; // 3-Sharing Triple Room (e.g. ₹11,000)
    sharing4: number; // 4-Sharing Four Room (e.g. ₹8,500)
  };
}

export const DEFAULT_PROPERTY_SETTINGS: PropertySettingsData = {
  billingCycleDates: "1st to End of Month",
  desiredDueDate: 5,
  gracePeriodDays: 5,
  defaultSecurityDeposit: 25000,
  upiPaymentId: "tenopilot.sunshine@okicici",
  propertyName: "Sunshine Heights PG",
  managerPhone: "+91 98765 43210",
  qrProfiles: DEFAULT_QR_PROFILES,
  rentalTiers: {
    sharing1: 18000,
    sharing2: 14500,
    sharing3: 11000,
    sharing4: 8500,
  },
};

let currentSettings: PropertySettingsData = { ...DEFAULT_PROPERTY_SETTINGS };

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

  getSettings(): PropertySettingsData {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tenopilot_property_settings");
      if (saved) {
        try {
          currentSettings = { ...DEFAULT_PROPERTY_SETTINGS, ...JSON.parse(saved) };
        } catch {
          // fallback to default
        }
      }
    }
    return currentSettings;
  },

  async updateSettings(newSettings: Partial<PropertySettingsData>, propertyId = "sunshine-pg"): Promise<PropertySettingsData> {
    currentSettings = { ...currentSettings, ...newSettings };
    if (typeof window !== "undefined") {
      localStorage.setItem("tenopilot_property_settings", JSON.stringify(currentSettings));
    }

    // Trigger reactive dynamic cascade across all subscribed UI components
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

  async fetchSettingsFromFirestore(propertyId = "sunshine-pg"): Promise<PropertySettingsData> {
    try {
      if (db) {
        const docRef = doc(db, `properties/${propertyId}/settings/config`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as PropertySettingsData;
          currentSettings = { ...DEFAULT_PROPERTY_SETTINGS, ...data };
          if (typeof window !== "undefined") {
            localStorage.setItem("tenopilot_property_settings", JSON.stringify(currentSettings));
          }
        }
      }
    } catch (e) {
      console.warn("Firestore settings fetch notice:", e);
    }
    return currentSettings;
  },
};
