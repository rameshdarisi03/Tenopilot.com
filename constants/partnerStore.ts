import { doc, setDoc, onSnapshot } from "firebase/firestore";
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

export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccountConfig[] = [];

let partnerState: PartnerConfig[] = [...DEFAULT_PARTNERS];
let categoryState: ExpenseCategoryConfig[] = [...DEFAULT_EXPENSE_CATEGORIES];
let paymentAccountState: PaymentAccountConfig[] = [...DEFAULT_PAYMENT_ACCOUNTS];
let listeners: Array<() => void> = [];
let activePartnerUnsub: (() => void) | null = null;
let activePropId: string | null = null;

// Load persisted state from localStorage on init if in browser
if (typeof window !== "undefined") {
  try {
    const savedPartners = localStorage.getItem("tenopilot_partner_ownership");
    if (savedPartners) {
      const parsed = JSON.parse(savedPartners);
      if (Array.isArray(parsed) && parsed.length > 0) {
        partnerState = parsed;
      }
    }
    const savedCats = localStorage.getItem("tenopilot_expense_categories");
    if (savedCats) {
      const parsedCats = JSON.parse(savedCats);
      if (Array.isArray(parsedCats) && parsedCats.length > 0) {
        categoryState = parsedCats;
      }
    }
    const savedAccounts = localStorage.getItem("tenopilot_payment_accounts");
    if (savedAccounts) {
      const parsedAccs = JSON.parse(savedAccounts);
      if (Array.isArray(parsedAccs) && parsedAccs.length > 0) {
        paymentAccountState = parsedAccs;
      }
    }
  } catch (e) {
    console.error("Failed to load partnerStore from localStorage", e);
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export const partnerStore = {
  initFirebaseListener(propertyId = "sunshine-pg") {
    if (typeof window === "undefined" || !db) return;
    if (activePropId === propertyId && activePartnerUnsub) return;

    if (activePartnerUnsub) {
      activePartnerUnsub();
      activePartnerUnsub = null;
    }

    activePropId = propertyId;

    try {
      const docRef = doc(db, `properties/${propertyId}/partners/config`);
      activePartnerUnsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.partners && Array.isArray(data.partners)) partnerState = data.partners;
            if (data.categories && Array.isArray(data.categories)) categoryState = data.categories;
            if (data.paymentAccounts && Array.isArray(data.paymentAccounts)) paymentAccountState = data.paymentAccounts;
            
            if (typeof window !== "undefined") {
              localStorage.setItem("tenopilot_partner_ownership", JSON.stringify(partnerState));
              localStorage.setItem("tenopilot_expense_categories", JSON.stringify(categoryState));
              localStorage.setItem("tenopilot_payment_accounts", JSON.stringify(paymentAccountState));
            }
            notify();
          }
        },
        (err) => {
          console.warn("Realtime partner store snapshot notice:", err);
        }
      );
    } catch (e) {
      console.warn("Failed to attach partnerStore onSnapshot", e);
    }
  },

  getPartners(propertyId?: string): PartnerConfig[] {
    if (!propertyId) return [];
    this.initFirebaseListener(propertyId);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`tenopilot_partners_${propertyId}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn(`Failed to read partners for ${propertyId}:`, e);
      }
    }
    return partnerState;
  },

  async syncToFirestore(propertyId?: string) {
    if (!propertyId) return;
    try {
      if (db) {
        const docRef = doc(db, `properties/${propertyId}/partners/config`);
        await setDoc(
          docRef,
          {
            partners: partnerState,
            categories: categoryState,
            paymentAccounts: paymentAccountState,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn("Firestore partnerStore sync notice:", e);
    }
  },

  updatePartners(newPartners: PartnerConfig[], propertyId?: string) {
    partnerState = newPartners;
    // Auto sync partner accounts into payment accounts
    const partnerAccs: PartnerConfig[] = newPartners;
    const partnerAccountConfigs: PaymentAccountConfig[] = partnerAccs.map((p) => ({
      id: `acc-partner-${p.id}`,
      name: p.name,
      type: "Partner Account",
    }));

    const nonPartnerAccs = paymentAccountState.filter(
      (a) => a.type !== "Partner Account"
    );
    paymentAccountState = [...nonPartnerAccs, ...partnerAccountConfigs];

    if (typeof window !== "undefined" && propertyId) {
      try {
        localStorage.setItem(`tenopilot_partners_${propertyId}`, JSON.stringify(newPartners));
        localStorage.setItem(`tenopilot_payment_accounts_${propertyId}`, JSON.stringify(paymentAccountState));
      } catch (e) {
        console.error("Failed to save partners to localStorage", e);
      }
    }
    notify();
    this.syncToFirestore(propertyId);
  },

  getPaymentAccounts(propertyId?: string): PaymentAccountConfig[] {
    if (!propertyId) return [];
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`tenopilot_payment_accounts_${propertyId}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn(`Failed to read payment accounts for ${propertyId}:`, e);
      }
    }
    return paymentAccountState;
  },

  addPaymentAccount(name: string, type: PaymentAccountConfig["type"] = "Bank Account") {
    const newAcc: PaymentAccountConfig = {
      id: `acc-${Date.now()}`,
      name: name.trim(),
      type,
    };
    paymentAccountState = [...paymentAccountState, newAcc];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_payment_accounts", JSON.stringify(paymentAccountState));
      } catch (e) {
        console.error("Failed to save payment account", e);
      }
    }
    notify();
    return newAcc;
  },

  deletePaymentAccount(id: string) {
    paymentAccountState = paymentAccountState.filter((a) => a.id !== id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_payment_accounts", JSON.stringify(paymentAccountState));
      } catch (e) {
        console.error("Failed to delete payment account", e);
      }
    }
    notify();
  },

  getCategories(): ExpenseCategoryConfig[] {
    return categoryState;
  },

  addCategory(name: string, icon = "Wrench", color = "#964407") {
    const newCat: ExpenseCategoryConfig = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      icon,
      color,
    };
    categoryState = [...categoryState, newCat];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_expense_categories", JSON.stringify(categoryState));
      } catch (e) {
        console.error("Failed to save expense categories", e);
      }
    }
    notify();
    return newCat;
  },

  deleteCategory(id: string) {
    categoryState = categoryState.filter((c) => c.id !== id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_expense_categories", JSON.stringify(categoryState));
      } catch (e) {
        console.error("Failed to delete category", e);
      }
    }
    notify();
  },

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
