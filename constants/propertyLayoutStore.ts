import { MOCK_OCCUPANTS_200, Occupant } from "./mockOccupants";

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
  const floors: FloorConfig[] = [];
  const floorConfigs = [
    { id: "fl-05", name: "FLOOR 05", sub: "PENTHOUSE & TERRACE", roomStart: 501, count: 4 },
    { id: "fl-04", name: "FLOOR 04", sub: "EXECUTIVE SUITES", roomStart: 401, count: 4 },
    { id: "fl-03", name: "FLOOR 03", sub: "EXECUTIVE SUITES", roomStart: 301, count: 4 },
    { id: "fl-02", name: "FLOOR 02", sub: "PREMIUM SUITES", roomStart: 201, count: 4 },
    { id: "fl-01", name: "FLOOR 01", sub: "DELUXE SUITES", roomStart: 101, count: 4 },
    { id: "fl-00", name: "GROUND FLOOR", sub: "STANDARD SUITES", roomStart: 1, count: 4 },
  ];

  let occIndex = 0;

  floorConfigs.forEach((fConfig, fIdx) => {
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
        const currentOcc = MOCK_OCCUPANTS_200[occIndex % MOCK_OCCUPANTS_200.length];
        occIndex++;

        let status: "Available" | "Occupied" | "Vacating" | "Booked" | "Guest" = "Occupied";
        let vacatingDate: string | undefined = undefined;
        let guestCheckoutDate: string | undefined = undefined;

        if (currentOcc.lifecycleStatus === "Notice") {
          status = "Vacating";
          vacatingDate = currentOcc.vacatingDate || "15 Aug";
        } else if (currentOcc.lifecycleStatus === "Booked") {
          status = "Booked";
        } else if (currentOcc.stayType === "Guest") {
          status = "Guest";
          guestCheckoutDate = "12 Aug";
        } else if (occIndex % 7 === 0) {
          status = "Available";
        } else {
          status = "Occupied";
        }

        beds.push({
          id: `bed-${fIdx}-${r}-${b}`,
          bedCode: bedLetters[b],
          status,
          occupant: status === "Available" ? undefined : currentOcc,
          vacatingDate,
          guestCheckoutDate,
        });
      }

      rooms.push({
        id: `rm-${fIdx}-${r}`,
        roomNumber: roomNumStr,
        sharingType: sharing,
        beds,
      });
    }

    floors.push({
      id: fConfig.id,
      floorName: fConfig.name,
      floorSubtitle: fConfig.sub,
      totalBeds: floorBedCount,
      rooms,
    });
  });

  return floors;
}

// Persistent Reactive Store for Property Structure (Persists in localStorage across page reloads & code edits)
const STORAGE_KEY = "tenopilot_property_layout_v1";

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

  updateStructure(newStructure: FloorConfig[]) {
    GLOBAL_PROPERTY_STRUCTURE = newStructure;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newStructure));
      } catch (e) {
        console.warn("Failed to save property layout to localStorage", e);
      }
    }
    listeners.forEach((l) => l());
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
};
