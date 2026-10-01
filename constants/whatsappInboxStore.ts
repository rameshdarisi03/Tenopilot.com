import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface WhatsAppInboundItem {
  id: string;
  wamid: string;
  senderPhone: string;
  senderName: string;
  occupantId?: string | null;
  occupantName?: string | null;
  roomNumber?: string | null;
  bedCode?: string | null;
  propertyId: string;
  type: "PAYMENT_PROOF" | "PAYMENT_CLAIM" | "TEXT_MESSAGE" | "SUPPORT_QUERY";
  rawText: string;
  mediaUrl?: string | null;
  mimeType?: string | null;
  extractedData?: {
    amount?: number;
    utr?: string;
    paymentApp?: string;
    status?: string;
  };
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  resolution?: {
    resolvedAt?: string;
    resolvedBy?: string;
    receiptId?: string;
    amountCollected?: number;
  };
  timestamp: string;
}

const INBOX_MAP = new Map<string, WhatsAppInboundItem[]>();
const ACTIVE_UNSUBSCRIBES = new Map<string, () => void>();
const LISTENERS = new Set<() => void>();

function notify() {
  LISTENERS.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn("WhatsApp inbox listener notice:", e);
    }
  });
}

export const whatsappInboxStore = {
  subscribe(fn: () => void) {
    LISTENERS.add(fn);
    return () => LISTENERS.delete(fn);
  },

  initFirebaseListener(propertyId: string) {
    if (!propertyId || typeof window === "undefined" || !db) return;
    if (ACTIVE_UNSUBSCRIBES.has(propertyId)) return;

    try {
      const colRef = collection(db, `properties/${propertyId}/whatsapp_inbox`);
      const q = query(colRef, orderBy("timestamp", "desc"), limit(50));

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: WhatsAppInboundItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              wamid: data.wamid || docSnap.id,
              senderPhone: data.senderPhone || "",
              senderName: data.senderName || "Resident",
              occupantId: data.occupantId || null,
              occupantName: data.occupantName || null,
              roomNumber: data.roomNumber || null,
              bedCode: data.bedCode || null,
              propertyId,
              type: data.type || "TEXT_MESSAGE",
              rawText: data.rawText || "",
              mediaUrl: data.mediaUrl || null,
              mimeType: data.mimeType || null,
              extractedData: data.extractedData || {},
              status: data.status || "PENDING",
              resolution: data.resolution,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          });

          INBOX_MAP.set(propertyId, items);
          notify();
        },
        (err) => {
          console.warn(`WhatsApp inbox snapshot notice for ${propertyId}:`, err);
        }
      );

      ACTIVE_UNSUBSCRIBES.set(propertyId, unsub);
    } catch (e) {
      console.warn(`Failed to attach WhatsApp inbox listener for ${propertyId}:`, e);
    }
  },

  getItems(propertyId?: string): WhatsAppInboundItem[] {
    if (!propertyId) return [];
    return INBOX_MAP.get(propertyId) || [];
  },

  getPendingItems(propertyId?: string): WhatsAppInboundItem[] {
    if (!propertyId) return [];
    const items = INBOX_MAP.get(propertyId) || [];
    return items.filter((item) => item.status === "PENDING");
  },

  getPendingCount(propertyId?: string): number {
    return this.getPendingItems(propertyId).length;
  },

  async markResolved(
    propertyId: string,
    itemId: string,
    resolution: {
      resolvedBy?: string;
      receiptId?: string;
      amountCollected?: number;
    }
  ) {
    if (!propertyId || !itemId || !db) return;
    try {
      const docRef = doc(db, `properties/${propertyId}/whatsapp_inbox`, itemId);
      await setDoc(
        docRef,
        {
          status: "RESOLVED",
          resolution: {
            ...resolution,
            resolvedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );

      // Local optimistic update
      const items = INBOX_MAP.get(propertyId) || [];
      const updated = items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              status: "RESOLVED" as const,
              resolution: { ...resolution, resolvedAt: new Date().toISOString() },
            }
          : it
      );
      INBOX_MAP.set(propertyId, updated);
      notify();
    } catch (err) {
      console.error("Failed to mark WhatsApp inbox item as resolved:", err);
    }
  },

  async dismissItem(propertyId: string, itemId: string) {
    if (!propertyId || !itemId || !db) return;
    try {
      const docRef = doc(db, `properties/${propertyId}/whatsapp_inbox`, itemId);
      await setDoc(
        docRef,
        {
          status: "DISMISSED",
          resolution: {
            resolvedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );

      const items = INBOX_MAP.get(propertyId) || [];
      const updated = items.map((it) =>
        it.id === itemId ? { ...it, status: "DISMISSED" as const } : it
      );
      INBOX_MAP.set(propertyId, updated);
      notify();
    } catch (err) {
      console.error("Failed to dismiss WhatsApp inbox item:", err);
    }
  },
};
