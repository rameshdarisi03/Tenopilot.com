import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface WhatsAppCreditTransaction {
  id: string;
  type: "PURCHASE" | "USAGE" | "STARTER_BONUS";
  amount: number; // Positive for purchase/bonus, negative for usage
  balanceAfter: number;
  description: string;
  recipientPhone?: string;
  recipientName?: string;
  messageType?: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "COMPLAINT_UPDATE" | "SYSTEM";
  timestamp: string;
  status: "DELIVERED" | "SENT" | "FAILED" | "PENDING";
}

export interface WhatsAppCreditPackage {
  id: string;
  name: string;
  credits: number;
  priceInr: number;
  pricePerCredit: string;
  popular?: boolean;
  badge?: string;
}

export const WHATSAPP_CREDIT_PACKAGES: WhatsAppCreditPackage[] = [
  {
    id: "pack-starter",
    name: "Starter Pack",
    credits: 250,
    priceInr: 299,
    pricePerCredit: "₹1.20",
    badge: "For Small PGs",
  },
  {
    id: "pack-growth",
    name: "Growth Pack",
    credits: 750,
    priceInr: 749,
    pricePerCredit: "₹1.00",
    popular: true,
    badge: "Most Popular 🔥",
  },
  {
    id: "pack-enterprise",
    name: "Enterprise Pack",
    credits: 2000,
    priceInr: 1699,
    pricePerCredit: "₹0.85",
    badge: "Best Value 🚀",
  },
];

export const DEFAULT_STARTER_CREDITS = 10;

interface PropertyWalletState {
  credits: number;
  transactions: WhatsAppCreditTransaction[];
}

const PROPERTY_WALLET_MAP = new Map<string, PropertyWalletState>();
const ACTIVE_WALLET_UNSUBSCRIBES = new Map<string, () => void>();
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn("whatsappCreditStore listener error:", e);
    }
  });
}

function getStoredWallet(propertyId: string): PropertyWalletState {
  if (typeof window === "undefined") {
    return { credits: DEFAULT_STARTER_CREDITS, transactions: [] };
  }
  try {
    const saved = localStorage.getItem(`tenopilot_wa_wallet_${propertyId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.credits === "number" && Array.isArray(parsed.transactions)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`Failed reading localStorage wallet for ${propertyId}:`, e);
  }
  return {
    credits: DEFAULT_STARTER_CREDITS,
    transactions: [
      {
        id: `tx-bonus-${Date.now()}`,
        type: "STARTER_BONUS",
        amount: DEFAULT_STARTER_CREDITS,
        balanceAfter: DEFAULT_STARTER_CREDITS,
        description: "10 Free Complimentary Cloud WhatsApp Credits",
        timestamp: new Date().toISOString(),
        status: "DELIVERED",
      },
    ],
  };
}

function setStoredWallet(propertyId: string, state: PropertyWalletState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`tenopilot_wa_wallet_${propertyId}`, JSON.stringify(state));
  } catch (e) {
    console.warn(`Failed writing localStorage wallet for ${propertyId}:`, e);
  }
}

export const whatsappCreditStore = {
  initFirebaseListener(propertyId?: string) {
    if (!propertyId || typeof window === "undefined" || !db) return;
    if (ACTIVE_WALLET_UNSUBSCRIBES.has(propertyId)) return;

    try {
      const docRef = doc(db, `properties/${propertyId}/whatsapp/wallet`);
      const unsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const state: PropertyWalletState = {
              credits: typeof data.credits === "number" ? data.credits : DEFAULT_STARTER_CREDITS,
              transactions: Array.isArray(data.transactions) ? data.transactions : [],
            };
            PROPERTY_WALLET_MAP.set(propertyId, state);
            setStoredWallet(propertyId, state);
            notify();
          }
        },
        (err) => {
          console.warn(`Realtime WhatsApp wallet snapshot notice for ${propertyId}:`, err);
        }
      );
      ACTIVE_WALLET_UNSUBSCRIBES.set(propertyId, unsub);
    } catch (e) {
      console.warn(`Failed to attach WhatsApp wallet onSnapshot for ${propertyId}`, e);
    }
  },

  async fetchWalletFromFirestore(propertyId?: string) {
    if (!propertyId || !db) return;
    try {
      const docRef = doc(db, `properties/${propertyId}/whatsapp/wallet`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const state: PropertyWalletState = {
          credits: typeof data.credits === "number" ? data.credits : DEFAULT_STARTER_CREDITS,
          transactions: Array.isArray(data.transactions) ? data.transactions : [],
        };
        PROPERTY_WALLET_MAP.set(propertyId, state);
        setStoredWallet(propertyId, state);
        notify();
      } else {
        // First-time initialization in Firestore
        const defaultState = getStoredWallet(propertyId);
        await this.syncToFirestore(propertyId, defaultState);
      }
    } catch (e) {
      console.warn(`fetchWalletFromFirestore notice for ${propertyId}:`, e);
    }
  },

  getCredits(propertyId?: string): number {
    if (!propertyId) return DEFAULT_STARTER_CREDITS;
    if (PROPERTY_WALLET_MAP.has(propertyId)) {
      return PROPERTY_WALLET_MAP.get(propertyId)!.credits;
    }
    const fromStorage = getStoredWallet(propertyId);
    PROPERTY_WALLET_MAP.set(propertyId, fromStorage);
    return fromStorage.credits;
  },

  getTransactions(propertyId?: string): WhatsAppCreditTransaction[] {
    if (!propertyId) return [];
    if (PROPERTY_WALLET_MAP.has(propertyId)) {
      return PROPERTY_WALLET_MAP.get(propertyId)!.transactions;
    }
    const fromStorage = getStoredWallet(propertyId);
    PROPERTY_WALLET_MAP.set(propertyId, fromStorage);
    return fromStorage.transactions;
  },

  async syncToFirestore(propertyId: string, state: PropertyWalletState) {
    if (!propertyId || !db) return;
    try {
      const docRef = doc(db, `properties/${propertyId}/whatsapp/wallet`);
      await setDoc(
        docRef,
        {
          credits: state.credits,
          transactions: state.transactions.slice(0, 100), // Keep latest 100
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn(`Firestore WhatsApp wallet sync notice for ${propertyId}:`, e);
    }
  },

  deductCredit(
    propertyId: string,
    details: {
      recipientPhone: string;
      recipientName: string;
      messageType: WhatsAppCreditTransaction["messageType"];
      description?: string;
    }
  ): { success: boolean; remainingCredits: number; error?: string } {
    const currentCredits = this.getCredits(propertyId);
    if (currentCredits < 1) {
      return {
        success: false,
        remainingCredits: currentCredits,
        error: "Insufficient WhatsApp credits. Please recharge your wallet to send automated reminders.",
      };
    }

    const newBalance = currentCredits - 1;
    const newTx: WhatsAppCreditTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: "USAGE",
      amount: -1,
      balanceAfter: newBalance,
      description: details.description || `Sent automated ${details.messageType?.replace(/_/g, " ").toLowerCase() || "message"} to ${details.recipientName}`,
      recipientPhone: details.recipientPhone,
      recipientName: details.recipientName,
      messageType: details.messageType || "RENT_REMINDER",
      timestamp: new Date().toISOString(),
      status: "DELIVERED",
    };

    const currentTxs = this.getTransactions(propertyId);
    const updatedState: PropertyWalletState = {
      credits: newBalance,
      transactions: [newTx, ...currentTxs],
    };

    PROPERTY_WALLET_MAP.set(propertyId, updatedState);
    setStoredWallet(propertyId, updatedState);
    notify();
    this.syncToFirestore(propertyId, updatedState);

    return {
      success: true,
      remainingCredits: newBalance,
    };
  },

  addCredits(
    propertyId: string,
    amount: number,
    packName: string = "Credit Recharge"
  ): number {
    const currentCredits = this.getCredits(propertyId);
    const newBalance = currentCredits + amount;

    const newTx: WhatsAppCreditTransaction = {
      id: `tx-buy-${Date.now()}`,
      type: "PURCHASE",
      amount: amount,
      balanceAfter: newBalance,
      description: `Recharged ${amount} WhatsApp Credits (${packName})`,
      timestamp: new Date().toISOString(),
      status: "DELIVERED",
    };

    const currentTxs = this.getTransactions(propertyId);
    const updatedState: PropertyWalletState = {
      credits: newBalance,
      transactions: [newTx, ...currentTxs],
    };

    PROPERTY_WALLET_MAP.set(propertyId, updatedState);
    setStoredWallet(propertyId, updatedState);
    notify();
    this.syncToFirestore(propertyId, updatedState);

    return newBalance;
  },

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
