import { MOCK_OCCUPANTS_200, Occupant, generateMockOccupants, occupantStore } from "./mockOccupants";
import { savePropertyLayoutToFirestore } from "@/lib/firestoreService";
import { parseOccupantDate } from "@/utils/autoCheckInEngine";

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

// Initial 6-floor 200-bed property structure mapped to mock occupants
export function generateInitialPropertyStructure(): FloorConfig[] {
  const initialOccupants = occupantStore.getOccupants();

  const floorConfigs = [
    { id: "fl-05", name: "FLOOR 05", sub: "PENTHOUSE & TERRACE", roomStart: 501, count: 4 },
    { id: "fl-04", name: "FLOOR 04", sub: "EXECUTIVE SUITES", roomStart: 401, count: 4 },
    { id: "fl-03", name: "FLOOR 03", sub: "EXECUTIVE SUITES", roomStart: 301, count: 4 },
    { id: "fl-02", name: "FLOOR 02", sub: "PREMIUM SUITES", roomStart: 201, count: 4 },
    { id: "fl-01", name: "FLOOR 01", sub: "DELUXE SUITES", roomStart: 101, count: 4 },
    { id: "fl-00", name: "GROUND FLOOR", sub: "STANDARD SUITES", roomStart: 1, count: 4 },
  ];  const floors: FloorConfig[] = floorConfigs.map((fConfig, fIdx) => {
    const rooms: RoomConfig[] = [];
    let floorBedCount = 0;

    for (let r = 0; r < fConfig.count; r++) {
      const roomNumStr =
        fConfig.roomStart < 10
          ? `00${fConfig.roomStart + r}`
          : `${fConfig.roomStart + r}`;
      const sharing = (r % 3 === 0 ? 4 : r % 2 === 0 ? 3 : 2);
      const beds: BedSlotConfig[] = [];
      const bedLetters = Array.from({ length: 26 }, (_, i) => `BED ${String.fromCharCode(65 + i)}`);

      for (let b = 0; b < sharing; b++) {
        floorBedCount++;

        const currentBedLetter = bedLetters[b];
        const matchingOcc = initialOccupants.find(
          (o) => o.roomNumber === roomNumStr && o.bedCode.toUpperCase() === currentBedLetter.toUpperCase()
        );

        let status: "Available" | "Occupied" | "Vacating" | "Booked" | "Guest" = "Available";
        if (matchingOcc) {
          if (matchingOcc.stayType === "Guest") {
            status = "Guest";
          } else if (matchingOcc.lifecycleStatus === "Notice") {
            status = "Vacating";
          } else if (matchingOcc.lifecycleStatus === "Booked") {
            status = "Booked";
          } else {
            status = "Occupied";
          }
        }

        beds.push({
          id: `bed-${fIdx}-${r}-${b}`,
          bedCode: currentBedLetter,
          status,
          occupant: matchingOcc,
          vacatingDate: matchingOcc?.vacatingDate,
          guestCheckoutDate: matchingOcc?.stayType === "Guest" ? matchingOcc.vacatingDate : undefined,
        });
      }

      const samplePhotos = [
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
      ];

      let specialTag: string | undefined = undefined;
      let customRent: number | undefined = undefined;
      let photos: string[] | undefined = undefined;

      if (roomNumStr === "108" || roomNumStr === "202" || roomNumStr === "304") {
        specialTag = "Balcony & Park View 🌿";
        customRent = 16000;
        photos = samplePhotos;
      } else if (roomNumStr === "101" || roomNumStr === "501") {
        specialTag = "Corner Room • Extra Ventilation 💨";
        customRent = 18000;
        photos = samplePhotos.slice(0, 2);
      }

      rooms.push({
        id: `room-${fIdx}-${r}`,
        roomNumber: roomNumStr,
        sharingType: sharing,
        beds,
        customRentAmount: customRent,
        specialFeatureTag: specialTag,
        roomPhotos: photos,
      });
    }

    return {
      id: fConfig.id,
      floorName: fConfig.name,
      floorSubtitle: fConfig.sub,
      totalBeds: floorBedCount,
      rooms,
    };
  });

  return floors;
}

// Persistent Reactive Store for Property Structure (Clean v4 with real-time occupant sync)
const STORAGE_KEY = "tenopilot_property_layout_clean_v4";

let GLOBAL_PROPERTY_STRUCTURE: FloorConfig[] | null = null;
const listeners: Array<() => void> = [];

function loadStructure(): FloorConfig[] {
  if (GLOBAL_PROPERTY_STRUCTURE) return GLOBAL_PROPERTY_STRUCTURE;
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        GLOBAL_PROPERTY_STRUCTURE = JSON.parse(saved);
        return GLOBAL_PROPERTY_STRUCTURE!;
      }
    } catch (e) {
      console.warn("Failed to load property layout from localStorage", e);
    }
  }
  GLOBAL_PROPERTY_STRUCTURE = generateInitialPropertyStructure();
  return GLOBAL_PROPERTY_STRUCTURE;
}

export const propertyStore = {
  getStructure(): FloorConfig[] {
    return loadStructure();
  },

  updateStructure(newStructure: FloorConfig[], propertyId: string = "sunshine-pg") {
    GLOBAL_PROPERTY_STRUCTURE = newStructure;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newStructure));
        // Asynchronously sync layout structure to Firebase Cloud Firestore: properties/{propertyId}/layout/structure
        savePropertyLayoutToFirestore(propertyId, newStructure);
      } catch (e) {
        console.warn("Failed to save property layout to localStorage", e);
      }
    }
    listeners.forEach((l) => l());
  },

  resetPropertyStore() {
    GLOBAL_PROPERTY_STRUCTURE = generateInitialPropertyStructure();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("tenopilot_property_layout_v1");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(GLOBAL_PROPERTY_STRUCTURE));
      } catch (e) {
        console.warn("Failed to clear propertyStore localStorage", e);
      }
    }
    listeners.forEach((l) => l());
  },

  // Method to clear bed slot and reset status to "Available" upon tenant checkout
  freeUpBedSlot(propertyId: string = "sunshine-pg", roomNumber: string, bedCode: string) {
    const current = this.getStructure();
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

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },

  // Helper to extract all unique room numbers for filter dropdowns
  getRoomNumbers(): string[] {
    const roomSet = new Set<string>();
    this.getStructure().forEach((fl) => {
      fl.rooms.forEach((rm) => roomSet.add(rm.roomNumber));
    });
    return Array.from(roomSet).sort();
  },

  // Helper to extract all floor names
  getFloorNames(): string[] {
    return this.getStructure().map((fl) => fl.floorName);
  },

  // Helper to extract all rooms that have available/vacant beds (prevents double bookings!)
  getAvailableRooms(): { roomNumber: string; sharingType: number; availableBeds: string[] }[] {
    const result: { roomNumber: string; sharingType: number; availableBeds: string[] }[] = [];
    this.getStructure().forEach((fl) => {
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
  checkBedBookingConflict(
    roomNumber: string,
    bedCode: string,
    currentOccupantId?: string,
    newTargetDate?: string,
    currentVacatingDate?: string
  ): { hasConflict: boolean; bookedOccupant?: Occupant } {
    const occupants = occupantStore.getOccupants() || MOCK_OCCUPANTS_200;
    const bookedOcc = occupants.find(
      (o) =>
        o.id !== currentOccupantId &&
        o.roomNumber === roomNumber &&
        o.bedCode.toUpperCase() === bedCode.toUpperCase() &&
        o.lifecycleStatus === "Booked"
    );

    if (!bookedOcc) {
      return { hasConflict: false };
    }

    // Mathematical Date Comparison SSOT Rule:
    if (newTargetDate && currentVacatingDate) {
      const newDateObj = parseOccupantDate(newTargetDate);
      const currentDateObj = parseOccupantDate(currentVacatingDate);
      const bookedDateObj = parseOccupantDate(bookedOcc.joiningDate);

      const newTime = newDateObj ? newDateObj.getTime() : new Date(newTargetDate).getTime();
      const currentTime = currentDateObj ? currentDateObj.getTime() : new Date(currentVacatingDate).getTime();
      const bookedJoiningTime = bookedDateObj ? bookedDateObj.getTime() : new Date(bookedOcc.joiningDate).getTime();

      // RULE 1: Preponement (newTime <= currentTime) -> Vacating EARLIER than current notice date.
      // Moving departure earlier INCREASES buffer time before bookedOcc arrives. Zero conflict!
      if (!isNaN(newTime) && !isNaN(currentTime) && newTime <= currentTime) {
        return { hasConflict: false };
      }

      // RULE 2: Extension (newTime > currentTime) -> Vacating LATER.
      // Conflict occurs ONLY IF the new extended departure date reaches or passes the booked occupant's check-in date (newTime >= bookedJoiningTime).
      if (!isNaN(newTime) && !isNaN(bookedJoiningTime) && newTime >= bookedJoiningTime) {
        return { hasConflict: true, bookedOccupant: bookedOcc };
      }

      // If extended departure is still before the booked occupant's check-in date, no conflict!
      return { hasConflict: false };
    }

    return { hasConflict: true, bookedOccupant: bookedOcc };
  },
};

/**
 * Single Source of Truth helper to resolve an occupant's vacating date from a bed slot.
 * Ensures 100% data consistency regardless of whether bed.vacatingDate or bed.occupant.vacatingDate is accessed.
 */
export function getBedVacatingDate(bed: BedSlotConfig): string | undefined {
  return bed.occupant?.vacatingDate || bed.vacatingDate;
}
