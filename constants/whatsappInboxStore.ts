import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection } from "firebase/firestore";
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
  propertyName?: string;
  isMultiProperty?: boolean;
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
    return () => {
      LISTENERS.delete(fn);
    };
  },

  initFirebaseListener(propertyId: string) {
    if (!propertyId || typeof window === "undefined") return;
    if (ACTIVE_UNSUBSCRIBES.has(propertyId)) return;

    // 1. Initial REST Hydration
    const fetchHttp = async () => {
      try {
        const res = await fetch(`/api/whatsapp/inbox?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            // Keep only active pending items
            const activeItems: WhatsAppInboundItem[] = data.items.filter((it: any) => it.status === "PENDING");
            INBOX_MAP.set(propertyId, activeItems);
            notify();
          }
        }
      } catch (e) {
        console.warn("Notice in WhatsApp inbox HTTP fetch:", e);
      }
    };

    fetchHttp();

    // Periodic background sync fallback (every 8 seconds)
    const pollInterval = setInterval(fetchHttp, 8000);

    // 2. Real-time Firestore WebSocket listeners (Property-scoped + Global Shared Inbox)
    let unsubFirestoreProp: (() => void) | null = null;
    let unsubFirestoreGlobal: (() => void) | null = null;

    const mergeAndNotify = (newItems: WhatsAppInboundItem[]) => {
      const activeNew = newItems.filter((i) => i.status === "PENDING");
      const current = (INBOX_MAP.get(propertyId) || []).filter((i) => i.status === "PENDING");
      const mergedMap = new Map<string, WhatsAppInboundItem>();
      current.forEach((it) => mergedMap.set(it.id, it));
      activeNew.forEach((it) => mergedMap.set(it.id, it));
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      INBOX_MAP.set(propertyId, merged);
      notify();
    };

    if (db) {
      try {
        const propColRef = collection(db, `properties/${propertyId}/whatsapp_inbox`);
        unsubFirestoreProp = onSnapshot(
          propColRef,
          (snapshot) => {
            const items: WhatsAppInboundItem[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data && data.status === "PENDING") {
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
                  propertyName: data.propertyName || (propertyId === "prop-1788438308277" ? "Vibe stays" : "Sunshine Luxury PG"),
                  type: data.type || "TEXT_MESSAGE",
                  rawText: data.rawText || "",
                  mediaUrl: data.mediaUrl || null,
                  mimeType: data.mimeType || null,
                  extractedData: data.extractedData || {},
                  status: data.status || "PENDING",
                  resolution: data.resolution,
                  timestamp: data.timestamp || new Date().toISOString(),
                });
              }
            });
            mergeAndNotify(items);
          },
          (err) => {
            console.warn(`WhatsApp inbox snapshot notice for ${propertyId}:`, err);
          }
        );
      } catch (e) {
        console.warn(`Failed to attach WhatsApp property inbox listener for ${propertyId}:`, e);
      }

      try {
        const globalColRef = collection(db, "whatsapp_global_inbox");
        unsubFirestoreGlobal = onSnapshot(
          globalColRef,
          (snapshot) => {
            const globalItems: WhatsAppInboundItem[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data && data.status === "PENDING") {
                globalItems.push({
                  id: docSnap.id,
                  wamid: data.wamid || docSnap.id,
                  senderPhone: data.senderPhone || "",
                  senderName: data.senderName || "Resident",
                  occupantId: data.occupantId || null,
                  occupantName: data.occupantName || null,
                  roomNumber: data.roomNumber || null,
                  bedCode: data.bedCode || null,
                  propertyId: data.propertyId || propertyId,
                  propertyName: data.propertyName || (data.propertyId === "prop-1788438308277" ? "Vibe stays" : "Sunshine Luxury PG"),
                  type: data.type || "TEXT_MESSAGE",
                  rawText: data.rawText || "",
                  mediaUrl: data.mediaUrl || null,
                  mimeType: data.mimeType || null,
                  extractedData: data.extractedData || {},
                  status: data.status || "PENDING",
                  resolution: data.resolution,
                  timestamp: data.timestamp || new Date().toISOString(),
                });
              }
            });
            if (globalItems.length > 0) {
              mergeAndNotify(globalItems);
            }
          },
          (err) => {
            console.warn("WhatsApp global inbox snapshot notice:", err);
          }
        );
      } catch (e) {
        console.warn("Failed to attach WhatsApp global inbox listener:", e);
      }
    }

    ACTIVE_UNSUBSCRIBES.set(propertyId, () => {
      clearInterval(pollInterval);
      if (unsubFirestoreProp) unsubFirestoreProp();
      if (unsubFirestoreGlobal) unsubFirestoreGlobal();
    });
  },

  setItems(propertyId: string, items: WhatsAppInboundItem[]) {
    if (!propertyId) return;
    INBOX_MAP.set(propertyId, items.filter((i) => i.status === "PENDING"));
    notify();
  },

  addItem(item: WhatsAppInboundItem) {
    if (!item || !item.propertyId || item.status !== "PENDING") return;
    const list = INBOX_MAP.get(item.propertyId) || [];
    const exists = list.some((i) => i.id === item.id);
    if (!exists) {
      INBOX_MAP.set(item.propertyId, [item, ...list]);
      notify();
    }
  },

  getItems(propertyId?: string): WhatsAppInboundItem[] {
    if (!propertyId) return [];
    const items = INBOX_MAP.get(propertyId) || [];
    return items.filter((item) => item.status === "PENDING");
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
    if (!propertyId || !itemId) return;

    // 1. Remove from local store immediately
    const items = INBOX_MAP.get(propertyId) || [];
    INBOX_MAP.set(propertyId, items.filter((it) => it.id !== itemId));
    notify();

    // 2. Sync to backend DELETE / RESOLVE
    try {
      await fetch(`/api/whatsapp/inbox?id=${encodeURIComponent(itemId)}&propertyId=${encodeURIComponent(propertyId)}`, {
        method: "DELETE",
      });
    } catch {}

    if (db) {
      try {
        const resolutionData = {
          status: "RESOLVED",
          resolution: {
            ...resolution,
            resolvedAt: new Date().toISOString(),
          },
        };
        await setDoc(doc(db, `properties/${propertyId}/whatsapp_inbox`, itemId), resolutionData, { merge: true });
        try {
          await setDoc(doc(db, "whatsapp_global_inbox", itemId), resolutionData, { merge: true });
        } catch {}
      } catch (err) {
        console.error("Failed to mark WhatsApp inbox item as resolved in Firestore:", err);
      }
    }
  },

  async dismissItem(propertyId: string, itemId: string) {
    if (!propertyId || !itemId) return;

    // 1. Remove from local store immediately
    const items = INBOX_MAP.get(propertyId) || [];
    INBOX_MAP.set(propertyId, items.filter((it) => it.id !== itemId));
    notify();

    // 2. Sync to server DELETE
    try {
      await fetch(`/api/whatsapp/inbox?id=${encodeURIComponent(itemId)}&propertyId=${encodeURIComponent(propertyId)}`, {
        method: "DELETE",
      });
    } catch {}

    if (db) {
      try {
        const dismissalData = {
          status: "DISMISSED",
          resolution: {
            resolvedAt: new Date().toISOString(),
          },
        };
        await setDoc(doc(db, `properties/${propertyId}/whatsapp_inbox`, itemId), dismissalData, { merge: true });
        try {
          await setDoc(doc(db, "whatsapp_global_inbox", itemId), dismissalData, { merge: true });
        } catch {}
      } catch (err) {
        console.error("Failed to dismiss WhatsApp inbox item in Firestore:", err);
      }
    }
  },
};
