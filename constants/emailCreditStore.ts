import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface EmailCreditTransaction {
  id: string;
  type: "PURCHASE" | "USAGE" | "STARTER_BONUS";
  amount: number; // Positive for purchase/bonus, negative for usage
  balanceAfter: number;
  description: string;
  recipientEmail?: string;
  recipientName?: string;
  messageType?: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "COMPLAINT_UPDATE" | "CUSTOM" | "SYSTEM";
  timestamp: string;
  status: "DELIVERED" | "SENT" | "FAILED" | "PENDING";
}

export const DEFAULT_STARTER_EMAIL_CREDITS = 30; // 3X default starter

interface PropertyEmailWalletState {
  credits: number;
  transactions: EmailCreditTransaction[];
}

const PROPERTY_EMAIL_WALLET_MAP = new Map<string, PropertyEmailWalletState>();
const ACTIVE_EMAIL_WALLET_UNSUBSCRIBES = new Map<string, () => void>();
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn("emailCreditStore listener error:", e);
    }
  });
}

function getStoredEmailWallet(propertyId: string): PropertyEmailWalletState {
  if (typeof window === "undefined") {
    return { credits: DEFAULT_STARTER_EMAIL_CREDITS, transactions: [] };
  }
  try {
    const saved = localStorage.getItem(`tenopilot_email_wallet_${propertyId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.credits === "number" && Array.isArray(parsed.transactions)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`Failed reading localStorage email wallet for ${propertyId}:`, e);
  }
  return {
    credits: DEFAULT_STARTER_EMAIL_CREDITS,
    transactions: [
      {
        id: `tx-email-bonus-${Date.now()}`,
        type: "STARTER_BONUS",
        amount: DEFAULT_STARTER_EMAIL_CREDITS,
        balanceAfter: DEFAULT_STARTER_EMAIL_CREDITS,
        description: "30 Free Complimentary Cloud Email Credits (3X Plan Ratio)",
        timestamp: new Date().toISOString(),
        status: "DELIVERED",
      },
    ],
  };
}

function setStoredEmailWallet(propertyId: string, state: PropertyEmailWalletState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`tenopilot_email_wallet_${propertyId}`, JSON.stringify(state));
  } catch (e) {
    console.warn(`Failed writing localStorage email wallet for ${propertyId}:`, e);
  }
}

export const emailCreditStore = {
  getWallet(propertyId: string): PropertyEmailWalletState {
    if (PROPERTY_EMAIL_WALLET_MAP.has(propertyId)) {
      return PROPERTY_EMAIL_WALLET_MAP.get(propertyId)!;
    }
    const fromStorage = getStoredEmailWallet(propertyId);
    PROPERTY_EMAIL_WALLET_MAP.set(propertyId, fromStorage);
    return fromStorage;
  },

  initFirebaseListener(propertyId?: string) {
    if (!propertyId || typeof window === "undefined" || !db) return;
    if (ACTIVE_EMAIL_WALLET_UNSUBSCRIBES.has(propertyId)) return;

    try {
      const docRef = doc(db, `properties/${propertyId}/email/wallet`);
      const unsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const credits = typeof data.credits === "number" ? data.credits : DEFAULT_STARTER_EMAIL_CREDITS;
            const transactions: EmailCreditTransaction[] = Array.isArray(data.transactions) ? data.transactions : [];

            const state: PropertyEmailWalletState = {
              credits,
              transactions,
            };
            PROPERTY_EMAIL_WALLET_MAP.set(propertyId, state);
            setStoredEmailWallet(propertyId, state);
            notify();
          }
        },
        (err) => {
          console.warn(`Realtime Email wallet snapshot notice for ${propertyId}:`, err);
        }
      );
      ACTIVE_EMAIL_WALLET_UNSUBSCRIBES.set(propertyId, unsub);
    } catch (e) {
      console.warn(`Failed to attach Email wallet onSnapshot for ${propertyId}`, e);
    }
  },

  async fetchWalletFromFirestore(propertyId?: string) {
    if (!propertyId || !db) return;
    try {
      const docRef = doc(db, `properties/${propertyId}/email/wallet`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const credits = typeof data.credits === "number" ? data.credits : DEFAULT_STARTER_EMAIL_CREDITS;
        const transactions: EmailCreditTransaction[] = Array.isArray(data.transactions) ? data.transactions : [];

        const state: PropertyEmailWalletState = {
          credits,
          transactions,
        };
        PROPERTY_EMAIL_WALLET_MAP.set(propertyId, state);
        setStoredEmailWallet(propertyId, state);
        notify();
      } else {
        // First-time initialization in Firestore ONLY if wallet doc does not exist
        const defaultState = getStoredEmailWallet(propertyId);
        await this.syncToFirestore(propertyId, defaultState);
      }
    } catch (e) {
      console.warn(`fetchWalletFromFirestore notice for ${propertyId}:`, e);
    }
  },

  getCredits(propertyId?: string): number {
    if (!propertyId) return DEFAULT_STARTER_EMAIL_CREDITS;
    const current = this.getWallet(propertyId);
    return current.credits;
  },

  getTransactions(propertyId?: string): EmailCreditTransaction[] {
    if (!propertyId) return [];
    return this.getWallet(propertyId).transactions;
  },

  deductCredit(
    propertyId: string,
    details?: {
      recipientEmail?: string;
      recipientName?: string;
      messageType?: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "COMPLAINT_UPDATE" | "CUSTOM";
      description?: string;
    }
  ): boolean {
    const current = this.getWallet(propertyId);
    if (current.credits <= 0) return false;

    const newCredits = current.credits - 1;
    const tx: EmailCreditTransaction = {
      id: `tx-email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: "USAGE",
      amount: -1,
      balanceAfter: newCredits,
      description: details?.description || `Dispatched ${details?.messageType?.replace(/_/g, " ").toLowerCase() || "Email message"} to ${details?.recipientName || details?.recipientEmail || "Resident"}`,
      recipientEmail: details?.recipientEmail,
      recipientName: details?.recipientName,
      messageType: details?.messageType || "RENT_REMINDER",
      timestamp: new Date().toISOString(),
      status: "DELIVERED",
    };

    const nextState: PropertyEmailWalletState = {
      credits: newCredits,
      transactions: [tx, ...current.transactions].slice(0, 100),
    };

    PROPERTY_EMAIL_WALLET_MAP.set(propertyId, nextState);
    setStoredEmailWallet(propertyId, nextState);
    this.syncToFirestore(propertyId, nextState);
    notify();
    return true;
  },

  addCredits(propertyId: string, amount: number, description?: string, type: "PURCHASE" | "STARTER_BONUS" = "PURCHASE"): number {
    const current = this.getWallet(propertyId);
    const newCredits = current.credits + amount;

    const tx: EmailCreditTransaction = {
      id: `tx-email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      amount,
      balanceAfter: newCredits,
      description: description || `Added ${amount} Email Credits`,
      timestamp: new Date().toISOString(),
      status: "DELIVERED",
    };

    const nextState: PropertyEmailWalletState = {
      credits: newCredits,
      transactions: [tx, ...current.transactions].slice(0, 100),
    };

    PROPERTY_EMAIL_WALLET_MAP.set(propertyId, nextState);
    setStoredEmailWallet(propertyId, nextState);
    this.syncToFirestore(propertyId, nextState);
    notify();
    return newCredits;
  },

  async syncToFirestore(propertyId: string, state: PropertyEmailWalletState) {
    if (!propertyId || !db) return;
    try {
      const docRef = doc(db, `properties/${propertyId}/email/wallet`);
      await setDoc(
        docRef,
        {
          credits: state.credits,
          transactions: state.transactions.slice(0, 100),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn(`Failed writing Email wallet to Firestore for ${propertyId}:`, e);
    }
  },

  subscribe(listener: () => void): () => void {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
