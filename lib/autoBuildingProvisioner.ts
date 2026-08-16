/**
 * TenoPilot FastTrack Auto-Building Provisioning Engine
 * Automatically generates or smart-merges Floor, Room, and Bed layouts from raw tenant rosters.
 */

import { FloorConfig, RoomConfig, BedSlotConfig, propertyStore } from "@/constants/propertyLayoutStore";
import { FastTrackParsedRow, inferRoomBlockAndFloor } from "./fastTrackHeuristicParser";

export function autoProvisionBuildingFromRoster(
  propertyId: string,
  rows: FastTrackParsedRow[],
  options?: {
    rebuildLayout?: boolean;
    defaultTariffs?: { sharing1: number; sharing2: number; sharing3: number; sharing4: number };
  }
): {
  createdFloorsCount: number;
  createdRoomsCount: number;
  createdBedsCount: number;
  structure: FloorConfig[];
} {
  const existingStructure = propertyStore.getStructure(propertyId) || [];
  const rebuild = options?.rebuildLayout === true;

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

  // Build FloorConfig objects from roster
  const generatedFloors: FloorConfig[] = [];
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

    generatedFloors.push({
      id: `floor_${flIdx + 1}_${Date.now()}`,
      floorName,
      floorSubtitle,
      totalBeds: rooms.reduce((acc, r) => acc + r.beds.length, 0),
      rooms,
    });
  });

  let finalStructure = generatedFloors;

  // 🌟 SMART MERGE ENGINE: If existing structure exists and user chose to KEEP existing rooms
  if (existingStructure.length > 0 && !rebuild) {
    const merged = JSON.parse(JSON.stringify(existingStructure)) as FloorConfig[];

    // 1. Process each incoming room from the roster
    roomOccupantMap.forEach((occupantsInRoom, rm) => {
      let roomFound = false;

      merged.forEach((fl) => {
        const targetRoom = fl.rooms.find((r) => r.roomNumber.toUpperCase() === rm.toUpperCase());
        if (targetRoom) {
          roomFound = true;
          // Auto-expand capacity if roster has more tenants than current configured beds
          const neededBeds = occupantsInRoom.length;
          if (neededBeds > targetRoom.beds.length) {
            const currentCount = targetRoom.beds.length;
            for (let i = currentCount; i < neededBeds; i++) {
              const bedLetter = String.fromCharCode(65 + i);
              targetRoom.beds.push({
                id: `bed_${rm.toLowerCase()}_${bedLetter.toLowerCase()}_${Date.now()}_${i}`,
                bedCode: `Bed ${bedLetter}`,
                status: "Occupied",
              });
            }
            targetRoom.sharingType = targetRoom.beds.length;
            targetRoom.specialFeatureTag = `${targetRoom.beds.length}-Sharing Suite`;
          }
          fl.totalBeds = fl.rooms.reduce((acc, r) => acc + r.beds.length, 0);
        }
      });

      // 2. If room does not exist in any floor, append it to matching floor or create floor
      if (!roomFound) {
        const inferred = inferRoomBlockAndFloor(rm);
        const floorKey =
          inferred.blockName && inferred.blockName !== "Main Building"
            ? `${inferred.blockName} - ${inferred.floorName}`
            : inferred.floorName;

        let targetFloor = merged.find((f) => f.floorName.toLowerCase() === floorKey.toLowerCase());
        if (!targetFloor) {
          targetFloor = {
            id: `floor_${merged.length + 1}_${Date.now()}`,
            floorName: floorKey,
            floorSubtitle: `${floorKey} Executive Wings`,
            totalBeds: 0,
            rooms: [],
          };
          merged.push(targetFloor);
        }

        const capacity = Math.max(occupantsInRoom.length, 2);
        const beds: BedSlotConfig[] = [];
        for (let b = 0; b < capacity; b++) {
          const bedLetter = String.fromCharCode(65 + b);
          beds.push({
            id: `bed_${rm.toLowerCase()}_${bedLetter.toLowerCase()}_${Date.now()}_${b}`,
            bedCode: `Bed ${bedLetter}`,
            status: occupantsInRoom[b] ? "Occupied" : "Available",
          });
        }

        targetFloor.rooms.push({
          id: `room_${rm.toLowerCase()}_${Date.now()}`,
          roomNumber: rm,
          sharingType: capacity,
          beds,
          specialFeatureTag: capacity === 1 ? "Private Single" : `${capacity}-Sharing Suite`,
        });
        targetFloor.totalBeds = targetFloor.rooms.reduce((acc, r) => acc + r.beds.length, 0);
      }
    });

    finalStructure = merged;
  }

  // Update propertyStore and trigger broadcast
  propertyStore.updateStructure(finalStructure, propertyId);

  const totalFinalBeds = finalStructure.reduce((acc, f) => acc + (f.totalBeds || 0), 0);
  const totalFinalRooms = finalStructure.reduce((acc, f) => acc + f.rooms.length, 0);

  return {
    createdFloorsCount: finalStructure.length,
    createdRoomsCount: totalFinalRooms,
    createdBedsCount: totalFinalBeds,
    structure: finalStructure,
  };
}
