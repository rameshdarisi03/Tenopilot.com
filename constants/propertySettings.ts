// TenoPilot Property Financial & Operations Settings Store
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PropertySettingsData {
  billingCycleDates: "1st to End of Month" | "Anniversary Date";
  desiredDueDate: number; // e.g. 5 for 5th of every month
  autoProrateFirstMonth: boolean;
  gracePeriodDays: number;
  defaultSecurityDeposit: number;
  upiPaymentId: string;
  propertyName: string;
  managerPhone: string;
}

export const DEFAULT_PROPERTY_SETTINGS: PropertySettingsData = {
  billingCycleDates: "1st to End of Month",
  desiredDueDate: 5,
  autoProrateFirstMonth: true,
  gracePeriodDays: 3,
  defaultSecurityDeposit: 25000,
  upiPaymentId: "tenopilot.sunshine@okicici",
  propertyName: "Sunshine Heights PG",
  managerPhone: "+91 98765 43210",
};

let currentSettings: PropertySettingsData = { ...DEFAULT_PROPERTY_SETTINGS };

export const propertySettingsStore = {
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
