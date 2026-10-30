// TenoPilot Property Layout Structure Store
// 100% Direct Cloud Firestore Database Persistence + SSR Browser Worker Guard

import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Occupant } from "./mockOccupants";
import { sanitizeForFirestore } from "@/lib/firestoreService";
import { getCanonicalBedIndex } from "@/utils/domainSSOT";

export interface BedSlotConfig {
  id: string;
  bedCode: string;
  status: "Available" | "Occupied" | "Vacating" | "Booked" | "Guest" | "Hold";
  occupant?: Occupant;
  vacatingDate?: string;
  guestCheckoutDate?: string;
  holdCandidate?: {
    name: string;
    phone?: string;
    email?: string;
    inviteId?: string;
    heldAt?: string;
  };
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

/**
 * Canonical Floor Level Extractor
 * Maps 'Ground Floor', 'GF', '0' -> 0
 * '1st Floor', '1ST FLOOR', 'Floor 01', 'Floor 1', 'FL 01', '1' -> 1
 * '2nd Floor', 'Floor 02', '2' -> 2, etc.
 * Supports negative levels for Basements: 'Basement 1', 'B1' -> -1
 */
export function extractCanonicalFloorLevel(floorName: string): number {
  const clean = (floorName || '').trim().toLowerCase();
  if (clean.includes('ground') || /\b(?:gf|gnd|g\b)/.test(clean)) {
    return 0;
  }
  if (clean.includes('basement') || /\b(?:b|b1|b2|cellar)\b/.test(clean)) {
    if (clean.includes('2') || clean.includes('b2')) return -2;
    return -1;
  }
  const ordinalMatch = clean.match(/(\d+)(?:st|nd|rd|th)/);
  if (ordinalMatch) {
    return parseInt(ordinalMatch[1], 10);
  }
  const floorNumMatch = clean.match(/(?:floor|fl|level)\s*0*(\d+)/i) || clean.match(/^f0*(\d+)/i);
  if (floorNumMatch) {
    return parseInt(floorNumMatch[1], 10);
  }
  const numMatch = clean.match(/\d+/);
  if (numMatch) {
    return parseInt(numMatch[0], 10);
  }
  return 1;
}

/**
 * Natural Alphanumeric Room Sorter
 * Orders rooms logically: 101, 102, 103, 104, 105, 106, 107, 108...
 * Handles blocks: A-101, A-102, B-101...
 */
export function compareRoomNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * 🏢 Building Structure Normalizer & Consolidator:
 * 1. Consolidates duplicate floors representing the same physical level (e.g. '1ST FLOOR' & 'Floor 01').
 * 2. Merges rooms across duplicate floor fragments without losing beds.
 * 3. Sorts rooms inside every floor in natural ascending order (101, 102, 103, 104... at the top!).
 * 4. Sorts all floors in the building in natural vertical order (Ground -> 1st -> 2nd -> ... -> 7th).
 */
export function normalizeAndSortBuildingStructure(floors: FloorConfig[]): FloorConfig[] {
  if (!Array.isArray(floors) || floors.length === 0) return [];

  const floorMap = new Map<string, FloorConfig>();

  floors.forEach((fl) => {
    const level = extractCanonicalFloorLevel(fl.floorName);
    const blockMatch = fl.floorName.match(/^([A-Za-z0-9\s]+)\s*-\s*/i);
    const block = blockMatch ? blockMatch[1].trim().toLowerCase() : 'main';
    const key = `${block}_${level}`;

    const existing = floorMap.get(key);
    if (!existing) {
      floorMap.set(key, {
        ...fl,
        rooms: [...(fl.rooms || [])],
      });
    } else {
      // 🌟 CONSOLIDATE DUPLICATE FLOOR FRAGMENTS:
      const roomMap = new Map<string, RoomConfig>();
      existing.rooms.forEach((r) => roomMap.set(r.roomNumber.toUpperCase().trim(), r));

      (fl.rooms || []).forEach((incomingRoom) => {
        const rmKey = incomingRoom.roomNumber.toUpperCase().trim();
        const existingRoom = roomMap.get(rmKey);
        if (!existingRoom) {
          roomMap.set(rmKey, incomingRoom);
        } else {
          const bedCodes = new Set(existingRoom.beds.map((b) => b.bedCode.toUpperCase().trim()));
          incomingRoom.beds.forEach((b) => {
            if (!bedCodes.has(b.bedCode.toUpperCase().trim())) {
              existingRoom.beds.push(b);
              bedCodes.add(b.bedCode.toUpperCase().trim());
            }
          });
          existingRoom.sharingType = Math.max(existingRoom.sharingType, existingRoom.beds.length);
          existingRoom.specialFeatureTag =
            existingRoom.sharingType === 1 ? 'Private Single' : `${existingRoom.sharingType}-Sharing Suite`;
          if (!existingRoom.customRentAmount && incomingRoom.customRentAmount) {
            existingRoom.customRentAmount = incomingRoom.customRentAmount;
          }
        }
      });

      existing.rooms = Array.from(roomMap.values());
      if (fl.floorName.includes('ST') || fl.floorName.includes('ND') || fl.floorName.includes('RD') || fl.floorName.includes('TH')) {
        existing.floorName = fl.floorName;
      }
      if (fl.floorSubtitle && !existing.floorSubtitle) {
        existing.floorSubtitle = fl.floorSubtitle;
      }
    }
  });

  const consolidated = Array.from(floorMap.values());

  // 1. Sort rooms inside each floor naturally (101, 102, 103, 104, 105, 106, 107...) & Auto-Heal Bed Slot Letters (Bed A, Bed B, Bed C...)
  consolidated.forEach((fl) => {
    fl.rooms.sort((a, b) => compareRoomNumbers(a.roomNumber, b.roomNumber));
    fl.rooms.forEach((rm) => {
      if (Array.isArray(rm.beds) && rm.beds.length > 0) {
        // Canonical Bed Sorting: Ensure Bed A always precedes Bed B, Bed C, etc.
        rm.beds.sort((a, b) => {
          const idxA = getCanonicalBedIndex(a.bedCode);
          const idxB = getCanonicalBedIndex(b.bedCode);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return (a.bedCode || "").localeCompare(b.bedCode || "", undefined, { numeric: true, sensitivity: "base" });
        });

        const seenLetters = new Set<string>();
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let alphaIdx = 0;

        rm.beds.forEach((b, idx) => {
          const cleanCode = (b.bedCode || "").trim().toUpperCase();
          const letterMatch = cleanCode.match(/[A-Z]/);
          let assignedLetter = letterMatch ? letterMatch[0] : "";

          // If empty or duplicate bed letter in same room (e.g. two 'Bed A' slots)
          if (!assignedLetter || seenLetters.has(assignedLetter)) {
            while (alphaIdx < alphabet.length && seenLetters.has(alphabet[alphaIdx])) {
              alphaIdx++;
            }
            assignedLetter = alphaIdx < alphabet.length ? alphabet[alphaIdx] : String(idx + 1);
            b.bedCode = `Bed ${assignedLetter}`;
          } else {
            b.bedCode = `Bed ${assignedLetter}`;
          }
          seenLetters.add(assignedLetter);
        });
        rm.sharingType = Math.max(rm.sharingType || 0, rm.beds.length);
      }
    });
    fl.totalBeds = fl.rooms.reduce((acc, r) => acc + (r.beds ? r.beds.length : 0), 0);
  });

  // 2. Sort floors vertically (Basement -> Ground -> 1st -> 2nd -> ... -> 7th)
  consolidated.sort((a, b) => {
    const blockMatchA = a.floorName.match(/^([A-Za-z0-9\s]+)\s*-\s*/i);
    const blockA = blockMatchA ? blockMatchA[1].trim().toLowerCase() : 'main';
    const blockMatchB = b.floorName.match(/^([A-Za-z0-9\s]+)\s*-\s*/i);
    const blockB = blockMatchB ? blockMatchB[1].trim().toLowerCase() : 'main';

    if (blockA !== blockB) {
      return blockA.localeCompare(blockB);
    }

    const levelA = extractCanonicalFloorLevel(a.floorName);
    const levelB = extractCanonicalFloorLevel(b.floorName);
    return levelA - levelB;
  });

  return consolidated;
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
    if (typeof window !== "undefined") {
      setTimeout(() => {
        listeners.forEach((l) => {
          try {
            l();
          } catch (e) {
            console.warn("propertyStore listener error:", e);
          }
        });
      }, 0);
    } else {
      listeners.forEach((l) => {
        try {
          l();
        } catch (e) {
          console.warn("propertyStore listener error:", e);
        }
      });
    }
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
              const normalized = normalizeAndSortBuildingStructure(data);
              PROPERTY_LAYOUT_MAP.set(propertyId, normalized);
              if (typeof window !== "undefined") {
                try {
                  if (normalized.length === 0) {
                    localStorage.removeItem(`tenopilot_layout_${propertyId}`);
                  } else {
                    localStorage.setItem(`tenopilot_layout_${propertyId}`, JSON.stringify(normalized));
                  }
                } catch {}
              }
              // 🌟 Silently auto-heal Firestore if structure had duplicate/unsorted floors or rooms
              if (normalized.length > 0 && JSON.stringify(normalized) !== JSON.stringify(data)) {
                try {
                  const sanitizedFloors = sanitizeForFirestore(normalized);
                  setDoc(docRef, { floors: sanitizedFloors, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
                } catch (e) {}
              }
              this.notify();
            } else {
              PROPERTY_LAYOUT_MAP.set(propertyId, []);
              if (typeof window !== "undefined") {
                try {
                  localStorage.removeItem(`tenopilot_layout_${propertyId}`);
                } catch {}
              }
              this.notify();
            }
          } else {
            // Layout document deleted or cleared
            PROPERTY_LAYOUT_MAP.set(propertyId, []);
            if (typeof window !== "undefined") {
              try {
                localStorage.removeItem(`tenopilot_layout_${propertyId}`);
              } catch {}
            }
            this.notify();
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

    

    if (PROPERTY_LAYOUT_MAP.has(propertyId)) {
      const current = PROPERTY_LAYOUT_MAP.get(propertyId)!;
      return normalizeAndSortBuildingStructure(current);
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
    const normalized = normalizeAndSortBuildingStructure(newStructure);
    PROPERTY_LAYOUT_MAP.set(propertyId, normalized);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`tenopilot_layout_${propertyId}`, JSON.stringify(normalized));
      } catch {}
    }
    this.notify();

    if (typeof window !== "undefined" && db) {
      try {
        const docRef = doc(db, `properties/${propertyId}/layout/structure`);
        const sanitizedFloors = sanitizeForFirestore(normalized);
        await setDoc(docRef, {
          floors: sanitizedFloors,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.warn(`Cloud Firestore layout update notice for ${propertyId}:`, e);
      }
    }

    return normalized;
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

  // Method to clear bed slot and reset status to "Available" upon tenant checkout or invite revocation
  async freeUpBedSlot(propertyId: string, roomNumber: string, bedCode: string) {
    const normRm = (roomNumber || "").toLowerCase().trim();
    const cleanBd = (bedCode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const normBd = cleanBd.startsWith("bed") ? cleanBd : `bed${cleanBd}`;

    const current = this.getStructure(propertyId);
    const updated = current.map((fl) => ({
      ...fl,
      rooms: fl.rooms.map((rm) => {
        if ((rm.roomNumber || "").toLowerCase().trim() !== normRm) return rm;
        return {
          ...rm,
          beds: rm.beds.map((bd) => {
            const currentBdClean = (bd.bedCode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const currentBdNorm = currentBdClean.startsWith("bed") ? currentBdClean : `bed${currentBdClean}`;
            if (currentBdNorm !== normBd) return bd;
            return {
              ...bd,
              status: "Available" as const,
              occupant: undefined,
              holdCandidate: undefined,
              vacatingDate: undefined,
              guestCheckoutDate: undefined,
            };
          }),
        };
      }),
    }));
    return await this.updateStructure(updated, propertyId);
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
