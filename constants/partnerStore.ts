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

export const DEFAULT_PARTNERS: PartnerConfig[] = [
  {
    id: "p1",
    name: "Ramesh",
    ownershipPercentage: 40,
    color: "#964407",
    accountType: "Personal Account",
    phone: "+91 98765 43210",
  },
  {
    id: "p2",
    name: "Suresh",
    ownershipPercentage: 40,
    color: "#059669",
    accountType: "Personal Account",
    phone: "+91 98765 43211",
  },
  {
    id: "p3",
    name: "Mahesh",
    ownershipPercentage: 20,
    color: "#7e22ce",
    accountType: "Personal Account",
    phone: "+91 98765 43212",
  },
];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryConfig[] = [
  { id: "cat-1", name: "Electricity", icon: "Zap", color: "#d97706" },
  { id: "cat-2", name: "Water Supply", icon: "Droplet", color: "#1d4ed8" },
  { id: "cat-3", name: "Staff Salary", icon: "Users", color: "#059669" },
  { id: "cat-4", name: "Internet / Wi-Fi", icon: "Wifi", color: "#7e22ce" },
  { id: "cat-5", name: "Property Maintenance", icon: "Wrench", color: "#964407" },
  { id: "cat-6", name: "Food & Grocery", icon: "Utensils", color: "#be123c" },
  { id: "cat-7", name: "Property Tax & License", icon: "FileText", color: "#475569" },
];

export interface PaymentAccountConfig {
  id: string;
  name: string;
  type: "Business Account" | "Petty Cash" | "Partner Account" | "Bank Account";
  isDefault?: boolean;
}

export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccountConfig[] = [
  { id: "acc-1", name: "Business Account", type: "Business Account", isDefault: true },
  { id: "acc-2", name: "Petty Cash", type: "Petty Cash", isDefault: true },
  { id: "acc-3", name: "Ramesh", type: "Partner Account" },
  { id: "acc-4", name: "Suresh", type: "Partner Account" },
  { id: "acc-5", name: "Mahesh", type: "Partner Account" },
];

let listeners: (() => void)[] = [];
let partnerState: PartnerConfig[] = DEFAULT_PARTNERS;
let categoryState: ExpenseCategoryConfig[] = DEFAULT_EXPENSE_CATEGORIES;
let paymentAccountState: PaymentAccountConfig[] = DEFAULT_PAYMENT_ACCOUNTS;

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
  getPartners(): PartnerConfig[] {
    return partnerState;
  },

  updatePartners(newPartners: PartnerConfig[]) {
    partnerState = newPartners;
    // Auto sync partner accounts into payment accounts
    const partnerAccs: PaymentAccountConfig[] = newPartners.map((p) => ({
      id: `acc-partner-${p.id}`,
      name: p.name,
      type: "Partner Account",
    }));

    const nonPartnerAccs = paymentAccountState.filter(
      (a) => a.type !== "Partner Account"
    );
    paymentAccountState = [...nonPartnerAccs, ...partnerAccs];

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_partner_ownership", JSON.stringify(newPartners));
        localStorage.setItem("tenopilot_payment_accounts", JSON.stringify(paymentAccountState));
      } catch (e) {
        console.error("Failed to save partners to localStorage", e);
      }
    }
    notify();
  },

  getPaymentAccounts(): PaymentAccountConfig[] {
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
