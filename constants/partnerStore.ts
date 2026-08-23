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

export function getOwnerDisplayName(): string {
  if (typeof window === "undefined") return "Property Owner";
  try {
    const session = localStorage.getItem("tenopilot_saved_session");
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.name) return parsed.name;
      if (parsed.displayName) return parsed.displayName;
    }
    const profile = localStorage.getItem("tenopilot_user_profile");
    if (profile) {
      const parsed = JSON.parse(profile);
      if (parsed.displayName) return parsed.displayName;
      if (parsed.name) return parsed.name;
    }
  } catch {}
  return "Property Owner";
}

export function getDefaultPartners(ownerName?: string): PartnerConfig[] {
  const resolvedName = ownerName?.trim() || getOwnerDisplayName();
  return [
    {
      id: "p-owner-1",
      name: resolvedName,
      ownershipPercentage: 100,
      color: "#964407",
      accountType: "Personal Account",
    },
  ];
}

export const DEFAULT_PARTNERS: PartnerConfig[] = getDefaultPartners();

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryConfig[] = [
  { id: "cat-1", name: "Electricity", icon: "Zap", color: "#d97706" },
  { id: "cat-2", name: "Water Supply", icon: "Droplet", color: "#1d4ed8" },
  { id: "cat-3", name: "Staff Salary", icon: "Users", color: "#059669" },
  { id: "cat-4", name: "Internet / Wi-Fi", icon: "Wifi", color: "#7e22ce" },
  { id: "cat-5", name: "Repairs & Maintenance", icon: "Wrench", color: "#964407" },
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
            if (data.partners && Array.isArray(data.partners) && data.partners.length > 0) {
              PROPERTY_PARTNERS_MAP.set(propertyId, data.partners);
              setStoredArray(`tenopilot_partners_${propertyId}`, data.partners);
            }
            if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
              PROPERTY_CATEGORIES_MAP.set(propertyId, data.categories);
              setStoredArray(`tenopilot_expense_categories_${propertyId}`, data.categories);
            }
            if (data.paymentAccounts && Array.isArray(data.paymentAccounts) && data.paymentAccounts.length > 0) {
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

  async fetchPartnerConfigFromFirestore(propertyId?: string, fallbackOwnerName?: string) {
    if (!propertyId || !db) return;
    try {
      const docRef = doc(db, `properties/${propertyId}/partners/config`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.partners && Array.isArray(data.partners) && data.partners.length > 0) {
          PROPERTY_PARTNERS_MAP.set(propertyId, data.partners);
          setStoredArray(`tenopilot_partners_${propertyId}`, data.partners);
        }
        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          PROPERTY_CATEGORIES_MAP.set(propertyId, data.categories);
          setStoredArray(`tenopilot_expense_categories_${propertyId}`, data.categories);
        }
        if (data.paymentAccounts && Array.isArray(data.paymentAccounts) && data.paymentAccounts.length > 0) {
          PROPERTY_PAYMENT_ACCOUNTS_MAP.set(propertyId, data.paymentAccounts);
          setStoredArray(`tenopilot_payment_accounts_${propertyId}`, data.paymentAccounts);
        }
        notify();
      }
    } catch (e) {
      console.warn(`fetchPartnerConfigFromFirestore notice for ${propertyId}:`, e);
    }
  },

  async fetchPartnersFromFirestore(propertyId?: string, fallbackOwnerName?: string) {
    return this.fetchPartnerConfigFromFirestore(propertyId, fallbackOwnerName);
  },

  getPartners(propertyId?: string, fallbackOwnerName?: string): PartnerConfig[] {
    const defaultList = getDefaultPartners(fallbackOwnerName);
    if (!propertyId) return defaultList;
    if (PROPERTY_PARTNERS_MAP.has(propertyId)) {
      const existing = PROPERTY_PARTNERS_MAP.get(propertyId)!;
      if (existing && existing.length > 0) return existing;
    }
    const fromStorage = getStoredArray<PartnerConfig>(`tenopilot_partners_${propertyId}`, defaultList);
    const finalPartners = (fromStorage && fromStorage.length > 0) ? fromStorage : defaultList;
    PROPERTY_PARTNERS_MAP.set(propertyId, finalPartners);
    return finalPartners;
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
    const partners = this.getPartners(propertyId);
    const partnerAccountConfigs: PaymentAccountConfig[] = partners.map((p) => ({
      id: `acc-partner-${p.id}`,
      name: p.name,
      type: "Partner Account",
    }));

    if (!propertyId) {
      const base = [...DEFAULT_PAYMENT_ACCOUNTS];
      const nonPartner = base.filter((a) => a.type !== "Partner Account");
      return [...nonPartner, ...partnerAccountConfigs];
    }
    if (PROPERTY_PAYMENT_ACCOUNTS_MAP.has(propertyId)) {
      const cached = PROPERTY_PAYMENT_ACCOUNTS_MAP.get(propertyId)!;
      if (cached && cached.length > 0) {
        const nonPartner = cached.filter((a) => a.type !== "Partner Account");
        return [...nonPartner, ...partnerAccountConfigs];
      }
    }
    const fromStorage = getStoredArray<PaymentAccountConfig>(`tenopilot_payment_accounts_${propertyId}`, DEFAULT_PAYMENT_ACCOUNTS);
    const baseList = (fromStorage && fromStorage.length > 0) ? fromStorage : DEFAULT_PAYMENT_ACCOUNTS;
    const nonPartner = baseList.filter((a) => a.type !== "Partner Account");
    const finalAccounts = [...nonPartner, ...partnerAccountConfigs];
    PROPERTY_PAYMENT_ACCOUNTS_MAP.set(propertyId, finalAccounts);
    return finalAccounts;
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

  renameCategory(id: string, newName: string, propertyId?: string) {
    if (!propertyId || !newName.trim()) return;
    const current = this.getCategories(propertyId);
    const updated = current.map((c) => (c.id === id ? { ...c, name: newName.trim() } : c));
    PROPERTY_CATEGORIES_MAP.set(propertyId, updated);
    setStoredArray(`tenopilot_expense_categories_${propertyId}`, updated);
    notify();
    this.syncToFirestore(propertyId);
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
