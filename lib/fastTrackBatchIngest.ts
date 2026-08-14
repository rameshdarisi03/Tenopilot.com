/**
 * TenoPilot FastTrack Batch Ingestion Service
 * Commits parsed tenant rosters into occupantStore and Cloud Firestore with full financial lifecycle tracking.
 */

import { Occupant, occupantStore, PaymentHistoryItem } from "@/constants/mockOccupants";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { autoProvisionBuildingFromRoster } from "./autoBuildingProvisioner";
import { FastTrackParsedRow } from "./fastTrackHeuristicParser";
import { saveOccupantToFirestore } from "./firestoreService";

export interface BatchIngestOptions {
  autoProvisionBuilding: boolean;
  markDepositsPaid?: boolean;
  markCurrentMonthRentPaid?: boolean;
}

export interface BatchIngestResult {
  success: boolean;
  enrolledCount: number;
  createdRoomsCount: number;
  createdBedsCount: number;
  totalMonthlyRevenue: number;
  occupants: Occupant[];
  errors: string[];
}

export async function executeFastTrackBatchIngest(
  propertyId: string,
  rows: FastTrackParsedRow[],
  options: BatchIngestOptions
): Promise<BatchIngestResult> {
  const errors: string[] = [];

  if (!rows || rows.length === 0) {
    return {
      success: false,
      enrolledCount: 0,
      createdRoomsCount: 0,
      createdBedsCount: 0,
      totalMonthlyRevenue: 0,
      occupants: [],
      errors: ["No valid rows provided to ingest."],
    };
  }

  // 1. Auto-Provision Building Structure if requested
  let createdRoomsCount = 0;
  let createdBedsCount = 0;
  if (options.autoProvisionBuilding) {
    try {
      const provResult = autoProvisionBuildingFromRoster(propertyId, rows);
      createdRoomsCount = provResult.createdRoomsCount;
      createdBedsCount = provResult.createdBedsCount;
    } catch (e: any) {
      console.warn("Auto-building provision warning:", e);
      errors.push(`Building structure provision note: ${e.message}`);
    }
  }

  // 2. Fetch current property settings for due dates
  const settings = propertySettingsStore.getSettings(propertyId);
  const dueDay = settings.desiredDueDate || 5;

  // Get current date context
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonthStr = now.toLocaleString("default", { month: "short", year: "numeric" }); // e.g. "Aug 2026"
  const dueDateStr = `0${dueDay} ${currentMonthStr}`;
  const daysDiff = dueDay - currentDay;

  let daysRemainingText = "DUE TODAY";
  let paymentStatus: "Paid" | "Due" | "Overdue" = "Paid";

  if (options.markCurrentMonthRentPaid) {
    daysRemainingText = "PAID (CURRENT CYCLE)";
    paymentStatus = "Paid";
  } else if (daysDiff < -settings.gracePeriodDays) {
    daysRemainingText = `${Math.abs(daysDiff)} DAYS OVERDUE`;
    paymentStatus = "Overdue";
  } else if (daysDiff <= 0) {
    daysRemainingText = "DUE TODAY";
    paymentStatus = "Due";
  } else {
    daysRemainingText = `Due in ${daysDiff} Days`;
    paymentStatus = "Due";
  }

  // 3. Build Occupant instances
  const existingOccupants = occupantStore.getOccupants(propertyId) || [];
  const newOccupants: Occupant[] = [];
  let totalMonthlyRevenue = 0;

  const roomBedCounters = new Map<string, number>();

  rows.forEach((row, idx) => {
    const rawRoom = (row.roomNumber || `10${(idx % 4) + 1}`).toUpperCase().trim();
    const currentBedNum = (roomBedCounters.get(rawRoom) || 0) + 1;
    roomBedCounters.set(rawRoom, currentBedNum);

    const bedLetter = String.fromCharCode(64 + Math.min(currentBedNum, 26)); // A, B, C...
    const finalBedCode = row.bedCode || `Bed ${bedLetter}`;

    const occupantId = `occ_ft_${propertyId}_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
    const rent = Number(row.rentAmount) || settings.rentalTiers?.sharing2 || 12000;
    const deposit = Number(row.securityDeposit) || rent * 2;
    totalMonthlyRevenue += rent;

    // Build initial payment ledger item
    const paymentHistory: PaymentHistoryItem[] = [];
    if (options.markCurrentMonthRentPaid) {
      paymentHistory.push({
        id: `pay_${Date.now()}_${idx}`,
        month: currentMonthStr,
        date: row.joiningDate || now.toISOString().split("T")[0],
        amount: rent,
        mode: row.paymentMode || "UPI",
        receiptNo: `REC-FT-${Date.now().toString().slice(-4)}-${idx + 1}`,
        status: "PAID",
      });
    }

    const initials = row.fullName
      .split(" ")
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2) || "TP";

    // Random pleasant pastel avatar background
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.fullName)}&backgroundColor=c2652a,8a4216,4f46e5,059669,d97706`;

    const occ: Occupant = {
      id: occupantId,
      name: row.fullName,
      avatar: avatarUrl,
      phone: row.phone || "9876543210",
      email: `${row.fullName.toLowerCase().replace(/[^a-z0-9]/g, "")}${idx + 1}@gmail.com`,
      stayType: "Tenant",
      roomNumber: rawRoom,
      bedCode: finalBedCode,
      joiningDate: row.joiningDate || now.toISOString().split("T")[0],
      lastPaidDate: options.markCurrentMonthRentPaid ? `01 ${currentMonthStr}` : "—",
      dueDate: dueDateStr,
      dueDay,
      daysRemainingText,
      daysDiff,
      rentAmount: rent,
      paymentStatus,
      lifecycleStatus: "Active",
      aadhaarNumber: `XXXX-XXXX-${Math.floor(1000 + Math.random() * 9000)}`,
      emergencyContact: {
        name: "Family Contact",
        phone: row.phone || "9876543210",
        relation: "Guardian",
      },
      kycVerified: false,
      hasPdfAgreement: false,
      securityDeposit: deposit,
      depositStatus: options.markDepositsPaid ? "PAID" : "PENDING",
      arrearsBalance: options.markCurrentMonthRentPaid ? 0 : rent,
      paymentHistory,
    };

    newOccupants.push(occ);
  });

  // 4. Update Occupant Store & Cloud Firestore
  const mergedOccupants = [...existingOccupants, ...newOccupants];
  occupantStore.updateOccupants(mergedOccupants, propertyId);

  // Async persist each to Cloud Firestore
  newOccupants.forEach((occ) => {
    saveOccupantToFirestore(propertyId, occ).catch((err) =>
      console.warn(`Firestore background save notice for ${occ.name}:`, err)
    );
  });

  // 5. Synchronize Room Bed Occupancies in Property Layout Store
  const currentStructure = propertyStore.getStructure(propertyId);
  if (currentStructure && currentStructure.length > 0) {
    let structureUpdated = false;
    currentStructure.forEach((floor) => {
      floor.rooms.forEach((room) => {
        room.beds.forEach((bed) => {
          const matchingOcc = newOccupants.find(
            (o) => o.roomNumber.toUpperCase() === room.roomNumber.toUpperCase() && o.bedCode.toUpperCase() === bed.bedCode.toUpperCase()
          );
          if (matchingOcc) {
            bed.status = "Occupied";
            bed.occupant = matchingOcc;
            structureUpdated = true;
          }
        });
      });
    });

    if (structureUpdated) {
      propertyStore.updateStructure(currentStructure, propertyId);
    }
  }

  return {
    success: true,
    enrolledCount: newOccupants.length,
    createdRoomsCount,
    createdBedsCount,
    totalMonthlyRevenue,
    occupants: newOccupants,
    errors,
  };
}
