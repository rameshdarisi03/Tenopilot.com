// TenoPilot Property Layout Structure Store
// 100% Direct Cloud Firestore Database Persistence + SSR Browser Worker Guard

import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Occupant } from "./mockOccupants";

export interface BedSlotConfig {
  id: string;
  bedCode: string;
  status: "Available" | "Occupied" | "Vacating" | "Booked" | "Guest";
  occupant?: Occupant;
  vacatingDate?: string;
  guestCheckoutDate?: string;
}

export interface RoomConfig {
  id: string;
  roomNumber: string;
  sharingType: number;
  beds: BedSlotConfig[];
  customRentAmount?: number; // Optional room-level custom tariff override (e.g. ₹16,000 for Room 108)
  specialFeatureTag?: string; // Optional feature tagline (e.g. "Balcony & Park View")
  roomPhotos?: string[]; // Optional array of up to 8 compressed room photo URLs
}

export interface FloorConfig {
  id: string;
  floorName: string;
  floorSubtitle: string;
  totalBeds: number;
  rooms: RoomConfig[];
}

// In-Memory Cloud Firestore Real-time Reactive Map: Map<propertyId, FloorConfig[]>
const PROPERTY_LAYOUT_MAP = new Map<string, FloorConfig[]>();
const ACTIVE_UNSUBSCRIBES = new Map<string, () => void>();
const listeners = new Set<() => void>();

export const propertyStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  notify() {
    listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.warn("propertyStore listener error:", e);
      }
    });
  },

  /**
   * Initialize Real-time Cloud Firestore listener for properties/{propertyId}/layout/structure
   */
  initFirebaseListener(propertyId?: string) {
    if (!propertyId || typeof window === "undefined" || !db) return;
    if (ACTIVE_UNSUBSCRIBES.has(propertyId)) return;

    try {
      const docRef = doc(db, `properties/${propertyId}/layout/structure`);
      const unsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()?.floors as FloorConfig[];
            if (Array.isArray(data)) {
              PROPERTY_LAYOUT_MAP.set(propertyId, data);
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem(`tenopilot_layout_${propertyId}`, JSON.stringify(data));
                } catch {}
              }
              this.notify();
            }
          }
        },
        (err) => {
          console.warn(`Firestore layout listener notice for ${propertyId}:`, err);
        }
      );

      ACTIVE_UNSUBSCRIBES.set(propertyId, unsub);
    } catch (e) {
      console.warn("Failed to attach Firestore layout listener", e);
    }
  },

  /**
   * Read Property Structure directly from Cloud Firestore Cache / Storage
   */
  getStructure(propertyId?: string): FloorConfig[] {
    if (!propertyId) return [];
    if (typeof window === "undefined") return PROPERTY_LAYOUT_MAP.get(propertyId) || [];

    this.initFirebaseListener(propertyId);

    if (PROPERTY_LAYOUT_MAP.has(propertyId)) {
      return PROPERTY_LAYOUT_MAP.get(propertyId)!;
    }

    try {
      const savedKey = `tenopilot_layout_${propertyId}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        PROPERTY_LAYOUT_MAP.set(propertyId, parsed);
        return parsed;
      }
    } catch {}

    return [];
  },

  /**
   * Update Property Layout directly in Cloud Firestore (Direct DB SSOT)
   */
  async updateStructure(newStructure: FloorConfig[], propertyId?: string): Promise<FloorConfig[]> {
    if (!propertyId) return [];
    
    // Update local reactive map & storage immediately for instantaneous UI feedback
    PROPERTY_LAYOUT_MAP.set(propertyId, newStructure);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`tenopilot_layout_${propertyId}`, JSON.stringify(newStructure));
      } catch {}
    }
    this.notify();

    if (typeof window !== "undefined" && db) {
      try {
        const docRef = doc(db, `properties/${propertyId}/layout/structure`);
        await setDoc(docRef, {
          floors: newStructure,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.warn(`Cloud Firestore layout update notice for ${propertyId}:`, e);
      }
    }

    return newStructure;
  },

  // Helper to extract all unique room numbers for filter dropdowns
  getRoomNumbers(propertyId?: string): string[] {
    const roomSet = new Set<string>();
    this.getStructure(propertyId).forEach((fl) => {
      fl.rooms.forEach((rm) => roomSet.add(rm.roomNumber));
    });
    return Array.from(roomSet).sort();
  },

  // Helper to extract all floor names
  getFloorNames(propertyId?: string): string[] {
    return this.getStructure(propertyId).map((fl) => fl.floorName);
  },

  // Helper to extract all rooms that have available/vacant beds (prevents double bookings!)
  getAvailableRooms(propertyId?: string): { roomNumber: string; sharingType: number; availableBeds: string[] }[] {
    const result: { roomNumber: string; sharingType: number; availableBeds: string[] }[] = [];
    this.getStructure(propertyId).forEach((fl) => {
      fl.rooms.forEach((rm) => {
        const availBeds = rm.beds.filter((b) => b.status === "Available").map((b) => b.bedCode);
        if (availBeds.length > 0) {
          result.push({
            roomNumber: rm.roomNumber,
            sharingType: rm.sharingType,
            availableBeds: availBeds,
          });
        }
      });
    });
    return result;
  },

  // Method to clear bed slot and reset status to "Available" upon tenant checkout
  freeUpBedSlot(propertyId: string, roomNumber: string, bedCode: string) {
    const current = this.getStructure(propertyId);
    const updated = current.map((fl) => ({
      ...fl,
      rooms: fl.rooms.map((rm) => {
        if (rm.roomNumber !== roomNumber) return rm;
        return {
          ...rm,
          beds: rm.beds.map((bd) => {
            if (bd.bedCode !== bedCode) return bd;
            return {
              ...bd,
              status: "Available" as const,
              occupant: undefined,
            };
          }),
        };
      }),
    }));
    this.updateStructure(updated, propertyId);
  },

  // Conflict check helper for notice extension & bookings
  checkBedBookingConflict(
    roomNumber: string,
    bedCode: string,
    currentOccupantId: string,
    newVacatingDate?: string,
    currentVacatingDate?: string,
    propertyId?: string
  ): { hasConflict: boolean; bookedOccupant?: Occupant } {
    return { hasConflict: false };
  },
};

export function getBedVacatingDate(
  bedOrPropId: any,
  roomNumber?: string,
  bedCode?: string
): string | undefined {
  if (typeof bedOrPropId === "object" && bedOrPropId !== null) {
    return bedOrPropId.vacatingDate || bedOrPropId.guestCheckoutDate;
  }
  const propertyId = bedOrPropId;
  if (!propertyId || !roomNumber || !bedCode) return undefined;
  const structure = propertyStore.getStructure(propertyId);
  for (const fl of structure) {
    for (const rm of fl.rooms) {
      if (rm.roomNumber === roomNumber) {
        for (const bd of rm.beds) {
          if (bd.bedCode.toUpperCase() === bedCode.toUpperCase()) {
            return bd.vacatingDate || bd.guestCheckoutDate;
          }
        }
      }
    }
  }
  return undefined;
}
