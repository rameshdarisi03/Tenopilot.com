import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// TenoPilot Single Source of Truth (SSOT) Partner Ownership & Expense Categories Store

export interface PartnerConfig {
  id: string;
  name: string;
  ownershipPercentage: number;
  color: string;
  accountType: string;
  phone?: string;
}

export interface ExpenseCategoryConfig {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

export interface PaymentAccountConfig {
  id: string;
  name: string;
  type: "Business Account" | "Petty Cash" | "Bank Account" | "Partner Account";
  isDefault?: boolean;
}

export const DEFAULT_PARTNERS: PartnerConfig[] = [];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryConfig[] = [
  { id: "cat-1", name: "Electricity", icon: "Zap", color: "#d97706" },
  { id: "cat-2", name: "Water Supply", icon: "Droplet", color: "#1d4ed8" },
  { id: "cat-3", name: "Staff Salary", icon: "Users", color: "#059669" },
  { id: "cat-4", name: "Internet / Wi-Fi", icon: "Wifi", color: "#7e22ce" },
  { id: "cat-5", name: "Property Maintenance", icon: "Wrench", color: "#964407" },
  { id: "cat-[#be123c]", name: "Food & Kitchen Supplies", icon: "Utensils", color: "#be123c" },
  { id: "cat-[#0f766e]", name: "Gas Cylinders & Fuel", icon: "Fuel", color: "#0f766e" },
  { id: "cat-[#4338ca]", name: "Security & Housekeeping", icon: "Shield", color: "#4338ca" },
];

export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccountConfig[] = [
  { id: "acc-1", name: "Main Business Account", type: "Business Account", isDefault: true },
  { id: "acc-2", name: "Petty Cash", type: "Petty Cash" },
];

// Multi-tenant in-memory maps keyed by propertyId
const PROPERTY_PARTNERS_MAP = new Map<string, PartnerConfig[]>();
const PROPERTY_CATEGORIES_MAP = new Map<string, ExpenseCategoryConfig[]>();
const PROPERTY_PAYMENT_ACCOUNTS_MAP = new Map<string, PaymentAccountConfig[]>();
const ACTIVE_PARTNERS_UNSUBSCRIBES = new Map<string, () => void>();

let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn("partnerStore listener error:", e);
    }
  });
}

function getStoredArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(`Failed reading localStorage ${key}:`, e);
  }
  return fallback;
}

function setStoredArray<T>(key: string, val: T[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`Failed writing localStorage ${key}:`, e);
  }
}

export const partnerStore = {
  initFirebaseListener(propertyId?: string) {
    if (!propertyId || typeof window === "undefined" || !db) return;
    if (ACTIVE_PARTNERS_UNSUBSCRIBES.has(propertyId)) return;

    try {
      const docRef = doc(db, `properties/${propertyId}/partners/config`);
      const unsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.partners && Array.isArray(data.partners)) {
              PROPERTY_PARTNERS_MAP.set(propertyId, data.partners);
              setStoredArray(`tenopilot_partners_${propertyId}`, data.partners);
            }
            if (data.categories && Array.isArray(data.categories)) {
              PROPERTY_CATEGORIES_MAP.set(propertyId, data.categories);
              setStoredArray(`tenopilot_expense_categories_${propertyId}`, data.categories);
            }
            if (data.paymentAccounts && Array.isArray(data.paymentAccounts)) {
              PROPERTY_PAYMENT_ACCOUNTS_MAP.set(propertyId, data.paymentAccounts);
              setStoredArray(`tenopilot_payment_accounts_${propertyId}`, data.paymentAccounts);
            }
            notify();
          }
        },
        (err) => {
          console.warn(`Realtime partner store snapshot notice for ${propertyId}:`, err);
        }
      );
      ACTIVE_PARTNERS_UNSUBSCRIBES.set(propertyId, unsub);
    } catch (e) {
      console.warn(`Failed to attach partnerStore onSnapshot for ${propertyId}`, e);
    }
  },

  async fetchPartnerConfigFromFirestore(propertyId?: string) {
    if (!propertyId || !db) return;
    try {
      const docRef = doc(db, `properties/${propertyId}/partners/config`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.partners && Array.isArray(data.partners)) {
          PROPERTY_PARTNERS_MAP.set(propertyId, data.partners);
          setStoredArray(`tenopilot_partners_${propertyId}`, data.partners);
        }
        if (data.categories && Array.isArray(data.categories)) {
          PROPERTY_CATEGORIES_MAP.set(propertyId, data.categories);
          setStoredArray(`tenopilot_expense_categories_${propertyId}`, data.categories);
        }
        if (data.paymentAccounts && Array.isArray(data.paymentAccounts)) {
          PROPERTY_PAYMENT_ACCOUNTS_MAP.set(propertyId, data.paymentAccounts);
          setStoredArray(`tenopilot_payment_accounts_${propertyId}`, data.paymentAccounts);
        }
        notify();
      }
    } catch (e) {
      console.warn(`fetchPartnerConfigFromFirestore notice for ${propertyId}:`, e);
    }
  },

  async fetchPartnersFromFirestore(propertyId?: string) {
    return this.fetchPartnerConfigFromFirestore(propertyId);
  },

  getPartners(propertyId?: string): PartnerConfig[] {
    if (!propertyId) return [...DEFAULT_PARTNERS];
    if (PROPERTY_PARTNERS_MAP.has(propertyId)) {
      return PROPERTY_PARTNERS_MAP.get(propertyId)!;
    }
    const fromStorage = getStoredArray<PartnerConfig>(`tenopilot_partners_${propertyId}`, DEFAULT_PARTNERS);
    PROPERTY_PARTNERS_MAP.set(propertyId, fromStorage);
    return fromStorage;
  },

  async syncToFirestore(propertyId?: string) {
    if (!propertyId || !db) return;
    try {
      const partners = this.getPartners(propertyId);
      const categories = this.getCategories(propertyId);
      const paymentAccounts = this.getPaymentAccounts(propertyId);
      const docRef = doc(db, `properties/${propertyId}/partners/config`);
      await setDoc(
        docRef,
        {
          partners,
          categories,
          paymentAccounts,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn(`Firestore partnerStore sync notice for ${propertyId}:`, e);
    }
  },

  updatePartners(newPartners: PartnerConfig[], propertyId?: string) {
    if (!propertyId) return;
    PROPERTY_PARTNERS_MAP.set(propertyId, newPartners);
    setStoredArray(`tenopilot_partners_${propertyId}`, newPartners);

    // Auto sync partner accounts into payment accounts
    const partnerAccountConfigs: PaymentAccountConfig[] = newPartners.map((p) => ({
      id: `acc-partner-${p.id}`,
      name: p.name,
      type: "Partner Account",
    }));

    const currentAccounts = this.getPaymentAccounts(propertyId);
    const nonPartnerAccs = currentAccounts.filter((a) => a.type !== "Partner Account");
    const updatedAccounts = [...nonPartnerAccs, ...partnerAccountConfigs];
    PROPERTY_PAYMENT_ACCOUNTS_MAP.set(propertyId, updatedAccounts);
    setStoredArray(`tenopilot_payment_accounts_${propertyId}`, updatedAccounts);

    notify();
    this.syncToFirestore(propertyId);
  },

  getPaymentAccounts(propertyId?: string): PaymentAccountConfig[] {
    if (!propertyId) return [...DEFAULT_PAYMENT_ACCOUNTS];
    if (PROPERTY_PAYMENT_ACCOUNTS_MAP.has(propertyId)) {
      return PROPERTY_PAYMENT_ACCOUNTS_MAP.get(propertyId)!;
    }
    const fromStorage = getStoredArray<PaymentAccountConfig>(`tenopilot_payment_accounts_${propertyId}`, DEFAULT_PAYMENT_ACCOUNTS);
    PROPERTY_PAYMENT_ACCOUNTS_MAP.set(propertyId, fromStorage);
    return fromStorage;
  },

  addPaymentAccount(name: string, type: PaymentAccountConfig["type"] = "Bank Account", propertyId?: string) {
    if (!propertyId) return null;
    const current = this.getPaymentAccounts(propertyId);
    const newAcc: PaymentAccountConfig = {
      id: `acc-${Date.now()}`,
      name: name.trim(),
      type,
    };
    const updated = [...current, newAcc];
    PROPERTY_PAYMENT_ACCOUNTS_MAP.set(propertyId, updated);
    setStoredArray(`tenopilot_payment_accounts_${propertyId}`, updated);
    notify();
    this.syncToFirestore(propertyId);
    return newAcc;
  },

  deletePaymentAccount(id: string, propertyId?: string) {
    if (!propertyId) return;
    const current = this.getPaymentAccounts(propertyId);
    const updated = current.filter((a) => a.id !== id);
    PROPERTY_PAYMENT_ACCOUNTS_MAP.set(propertyId, updated);
    setStoredArray(`tenopilot_payment_accounts_${propertyId}`, updated);
    notify();
    this.syncToFirestore(propertyId);
  },

  getCategories(propertyId?: string): ExpenseCategoryConfig[] {
    if (!propertyId) return [...DEFAULT_EXPENSE_CATEGORIES];
    if (PROPERTY_CATEGORIES_MAP.has(propertyId)) {
      return PROPERTY_CATEGORIES_MAP.get(propertyId)!;
    }
    const fromStorage = getStoredArray<ExpenseCategoryConfig>(`tenopilot_expense_categories_${propertyId}`, DEFAULT_EXPENSE_CATEGORIES);
    PROPERTY_CATEGORIES_MAP.set(propertyId, fromStorage);
    return fromStorage;
  },

  addCategory(name: string, icon = "Wrench", color = "#964407", propertyId?: string) {
    if (!propertyId) return null;
    const current = this.getCategories(propertyId);
    const newCat: ExpenseCategoryConfig = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      icon,
      color,
    };
    const updated = [...current, newCat];
    PROPERTY_CATEGORIES_MAP.set(propertyId, updated);
    setStoredArray(`tenopilot_expense_categories_${propertyId}`, updated);
    notify();
    this.syncToFirestore(propertyId);
    return newCat;
  },

  deleteCategory(id: string, propertyId?: string) {
    if (!propertyId) return;
    const current = this.getCategories(propertyId);
    const updated = current.filter((c) => c.id !== id);
    PROPERTY_CATEGORIES_MAP.set(propertyId, updated);
    setStoredArray(`tenopilot_expense_categories_${propertyId}`, updated);
    notify();
    this.syncToFirestore(propertyId);
  },

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
