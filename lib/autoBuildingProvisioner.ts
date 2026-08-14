/**
 * TenoPilot FastTrack Auto-Building Provisioning Engine
 * Automatically generates Floor, Room, and Bed layouts from raw tenant rosters.
 */

import { FloorConfig, RoomConfig, BedSlotConfig, propertyStore } from "@/constants/propertyLayoutStore";
import { FastTrackParsedRow, inferRoomBlockAndFloor } from "./fastTrackHeuristicParser";

export function autoProvisionBuildingFromRoster(
  propertyId: string,
  rows: FastTrackParsedRow[],
  defaultTariffs?: { sharing1: number; sharing2: number; sharing3: number; sharing4: number }
): {
  createdFloorsCount: number;
  createdRoomsCount: number;
  createdBedsCount: number;
  structure: FloorConfig[];
} {
  const existingStructure = propertyStore.getStructure(propertyId) || [];

  // Group incoming rows by Room Number
  const roomOccupantMap = new Map<string, FastTrackParsedRow[]>();
  rows.forEach((row) => {
    const rm = (row.roomNumber || "101").toUpperCase().trim();
    const list = roomOccupantMap.get(rm) || [];
    list.push(row);
    roomOccupantMap.set(rm, list);
  });

  // Group rooms by Floor & Block
  const floorRoomMap = new Map<string, string[]>();
  Array.from(roomOccupantMap.keys()).forEach((rm) => {
    const inferred = inferRoomBlockAndFloor(rm);
    const floorKey =
      inferred.blockName && inferred.blockName !== "Main Building"
        ? `${inferred.blockName} - ${inferred.floorName}`
        : inferred.floorName;

    const roomsInFloor = floorRoomMap.get(floorKey) || [];
    if (!roomsInFloor.includes(rm)) {
      roomsInFloor.push(rm);
    }
    floorRoomMap.set(floorKey, roomsInFloor);
  });

  // Build FloorConfig objects
  const newFloors: FloorConfig[] = [];
  let totalRooms = 0;
  let totalBeds = 0;

  // Sort floor names logically (Ground Floor, Floor 01, Floor 02, etc.)
  const sortedFloorNames = Array.from(floorRoomMap.keys()).sort((a, b) => {
    if (a.includes("Ground Floor")) return -1;
    if (b.includes("Ground Floor")) return 1;
    return a.localeCompare(b);
  });

  sortedFloorNames.forEach((floorName, flIdx) => {
    const roomNumbers = floorRoomMap.get(floorName) || [];
    const rooms: RoomConfig[] = [];

    roomNumbers.sort().forEach((rm, rmIdx) => {
      const occupantsInRoom = roomOccupantMap.get(rm) || [];
      const explicitSharing = occupantsInRoom.find((o) => o.sharingType && o.sharingType > 0)?.sharingType;
      const capacity = Math.max(occupantsInRoom.length, explicitSharing || 2); // Minimum 2 beds, explicit sharing, or occupant count

      const beds: BedSlotConfig[] = [];
      for (let b = 0; b < capacity; b++) {
        const bedLetter = String.fromCharCode(65 + b); // A, B, C, D...
        const occupant = occupantsInRoom[b];

        beds.push({
          id: `bed_${rm.toLowerCase()}_${bedLetter.toLowerCase()}_${Date.now()}_${b}`,
          bedCode: `Bed ${bedLetter}`,
          status: occupant ? "Occupied" : "Available",
        });
        totalBeds++;
      }

      // Check if custom rent override exists
      const customRent = occupantsInRoom[0]?.rentAmount;

      rooms.push({
        id: `room_${rm.toLowerCase()}_${Date.now()}_${rmIdx}`,
        roomNumber: rm,
        sharingType: capacity,
        beds,
        customRentAmount: customRent,
        specialFeatureTag: capacity === 1 ? "Private Single" : `${capacity}-Sharing Suite`,
      });
      totalRooms++;
    });

    const floorSubtitle =
      floorName === "Ground Floor"
        ? "Ground Level Reception & Suites"
        : `${floorName} Executive Resident Wings`;

    newFloors.push({
      id: `floor_${flIdx + 1}_${Date.now()}`,
      floorName,
      floorSubtitle,
      totalBeds: rooms.reduce((acc, r) => acc + r.beds.length, 0),
      rooms,
    });
  });

  // If existing structure had some floors, merge new rooms intelligently
  let finalStructure = newFloors;
  if (existingStructure.length > 0) {
    const merged = [...existingStructure];
    newFloors.forEach((newFl) => {
      const existingFlIdx = merged.findIndex((f) => f.floorName.toLowerCase() === newFl.floorName.toLowerCase());
      if (existingFlIdx !== -1) {
        // Merge rooms into existing floor
        const existingFl = merged[existingFlIdx];
        const existingRoomNumbers = existingFl.rooms.map((r) => r.roomNumber.toUpperCase());
        const roomsToAdd = newFl.rooms.filter((r) => !existingRoomNumbers.includes(r.roomNumber.toUpperCase()));
        existingFl.rooms = [...existingFl.rooms, ...roomsToAdd];
        existingFl.totalBeds = existingFl.rooms.reduce((a, b) => a + b.beds.length, 0);
      } else {
        merged.push(newFl);
      }
    });
    finalStructure = merged;
  }

  // Update propertyStore and trigger broadcast
  propertyStore.updateStructure(finalStructure, propertyId);

  return {
    createdFloorsCount: newFloors.length,
    createdRoomsCount: totalRooms,
    createdBedsCount: totalBeds,
    structure: finalStructure,
  };
}
