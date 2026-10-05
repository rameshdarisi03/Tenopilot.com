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

const DEFAULT_VIBE_ITEMS: WhatsAppInboundItem[] = [
  {
    id: "inbox_vibe_darisi_proof_latest",
    wamid: "wamid.vibe_darisi_proof_latest",
    timestamp: new Date().toISOString(),
    senderPhone: "919206651295",
    senderName: "Darisi",
    propertyId: "prop-1788438308277",
    occupantId: "og-tenant-1790870124901",
    occupantName: "Darisi",
    roomNumber: "208",
    bedCode: "Bed C",
    type: "PAYMENT_PROOF",
    status: "PENDING",
    rawText: "payment done ...please check!",
    mediaUrl: null,
    mimeType: "image/jpeg",
    extractedData: {
      amount: 8500,
      utr: "UPI8500202610VIBE",
      paymentApp: "PhonePe / UPI",
    },
  },
  {
    id: "inbox_vibe_darisi_claim_1",
    wamid: "wamid.vibe_darisi_claim_1",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    senderPhone: "919206651295",
    senderName: "Darisi",
    propertyId: "prop-1788438308277",
    occupantId: "og-tenant-1790870124901",
    occupantName: "Darisi",
    roomNumber: "208",
    bedCode: "Bed C",
    type: "PAYMENT_CLAIM",
    status: "PENDING",
    rawText: "RENT PAID",
    mediaUrl: null,
    mimeType: null,
    extractedData: {
      amount: 8500,
    },
  },
];

const INBOX_MAP = new Map<string, WhatsAppInboundItem[]>([
  ["prop-1788438308277", DEFAULT_VIBE_ITEMS],
  ["sunshine-pg", DEFAULT_VIBE_ITEMS],
]);
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
          if (Array.isArray(data.items) && data.items.length > 0) {
            const current = INBOX_MAP.get(propertyId) || [];
            const mergedMap = new Map<string, WhatsAppInboundItem>();
            current.forEach((it) => mergedMap.set(it.id, it));
            data.items.forEach((it: any) => mergedMap.set(it.id, it));
            const merged = Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            INBOX_MAP.set(propertyId, merged);
            notify();
          }
        }
      } catch (e) {
        console.warn("Notice in WhatsApp inbox HTTP fetch:", e);
      }
    };

    fetchHttp();

    // Periodic background sync fallback (every 10 seconds)
    const pollInterval = setInterval(fetchHttp, 10000);

    // 2. Real-time Firestore WebSocket listeners (Property-scoped + Global Shared Inbox)
    let unsubFirestoreProp: (() => void) | null = null;
    let unsubFirestoreGlobal: (() => void) | null = null;

    const mergeAndNotify = (newItems: WhatsAppInboundItem[]) => {
      const current = INBOX_MAP.get(propertyId) || [];
      const mergedMap = new Map<string, WhatsAppInboundItem>();
      current.forEach((it) => mergedMap.set(it.id, it));
      newItems.forEach((it) => mergedMap.set(it.id, it));
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
              // Include item if it matches this property OR if it is PENDING across the owner's portfolio
              const isPending = data.status === "PENDING";
              const isForThisProp = data.propertyId === propertyId || data.propertyId === "all" || !data.propertyId || data.isUnassigned === true;

              if (isForThisProp || isPending) {
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
    INBOX_MAP.set(propertyId, items);
    notify();
  },

  addItem(item: WhatsAppInboundItem) {
    if (!item || !item.propertyId) return;
    const list = INBOX_MAP.get(item.propertyId) || [];
    const exists = list.some((i) => i.id === item.id);
    if (!exists) {
      INBOX_MAP.set(item.propertyId, [item, ...list]);
      notify();
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
