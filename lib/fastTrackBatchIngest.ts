/**
 * TenoPilot FastTrack Batch Ingestion Service
 * Commits parsed tenant rosters into occupantStore and Cloud Firestore with full financial lifecycle tracking.
 */

import { Occupant, occupantStore, PaymentHistoryItem } from "@/constants/mockOccupants";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { autoProvisionBuildingFromRoster } from "./autoBuildingProvisioner";
import { FastTrackParsedRow, validateParsedRow, isVacantRow } from "./fastTrackHeuristicParser";
import { saveOccupantToFirestore } from "./firestoreService";
import { getEffectiveTenantLimit, evaluateSubscription } from "./subscriptionEngine";
import { generateReceiptNumber } from "./invoiceNumberEngine";

export interface BatchIngestOptions {
  autoProvisionBuilding: boolean;
  rebuildLayout?: boolean; // When true, clears dummy rooms and generates fresh from sheet
  markDepositsPaid?: boolean;
  markCurrentMonthRentPaid?: boolean;
  userProfile?: any;
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

  // 🔒 Subscription Status Guard Rail: Expired trials cannot ingest new tenants
  if (options.userProfile) {
    const sub = evaluateSubscription(options.userProfile);
    if (sub.status === "EXPIRED") {
      return {
        success: false,
        enrolledCount: 0,
        createdRoomsCount: 0,
        createdBedsCount: 0,
        totalMonthlyRevenue: 0,
        occupants: [],
        errors: ["🔒 Free Trial Ended: Your trial has expired. Upgrade to the Pro Plan to import and onboard tenants."],
      };
    }
  }

  // 🔒 Master Controls Capacity Enforcement
  const existingOccupants = occupantStore.getOccupants(propertyId) || [];
  const existingActiveCount = existingOccupants.filter((o) => o.lifecycleStatus !== "Past").length;
  const effectiveLimit = getEffectiveTenantLimit(options.userProfile);

  if (existingActiveCount + rows.length > effectiveLimit) {
    const errorMsg = `Platform Capacity Exceeded: Your plan limit is ${effectiveLimit} active tenants. You currently have ${existingActiveCount} active tenants. Ingesting ${rows.length} occupants would exceed your quota (${existingActiveCount + rows.length}/${effectiveLimit}). Please upgrade your plan or purchase +25 Tenant Extension Packs.`;
    return {
      success: false,
      enrolledCount: 0,
      createdRoomsCount: 0,
      createdBedsCount: 0,
      totalMonthlyRevenue: 0,
      occupants: [],
      errors: [errorMsg],
    };
  }

  // 🔒 Strict Mandatory Field Validation
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const valResult = validateParsedRow(r);
    if (!valResult.isValid) {
      return {
        success: false,
        enrolledCount: 0,
        createdRoomsCount: 0,
        createdBedsCount: 0,
        totalMonthlyRevenue: 0,
        occupants: [],
        errors: [`Resident #${i + 1} (${r.fullName || "Unnamed"}): ${valResult.warnings.join(", ")}`],
      };
    }
  }

  // 1. Auto-Provision or Smart-Merge Building Structure
  let createdRoomsCount = 0;
  let createdBedsCount = 0;
  if (options.autoProvisionBuilding) {
    try {
      const provResult = autoProvisionBuildingFromRoster(propertyId, rows, {
        rebuildLayout: options.rebuildLayout,
      });
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
  const newOccupants: Occupant[] = [];
  let totalMonthlyRevenue = 0;

  const roomBedCounters = new Map<string, number>();
  const roomUsedLetters = new Map<string, Set<string>>();

  rows.forEach((row, idx) => {
    const rawRoom = (row.roomNumber || "").toUpperCase().trim().replace(/^ROOM\s*/i, "");
    let usedLetters = roomUsedLetters.get(rawRoom);
    if (!usedLetters) {
      usedLetters = new Set<string>();
      roomUsedLetters.set(rawRoom, usedLetters);
    }

    const currentBedNum = (roomBedCounters.get(rawRoom) || 0) + 1;
    roomBedCounters.set(rawRoom, currentBedNum);

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const candidateMatch = (row.bedCode || "").toUpperCase().match(/[A-Z]/);
    let assignedLetter = candidateMatch ? candidateMatch[0] : "";

    // Guarantee unique sequential bed code per room
    if (!assignedLetter || usedLetters.has(assignedLetter)) {
      let aIdx = 0;
      while (aIdx < alphabet.length && usedLetters.has(alphabet[aIdx])) {
        aIdx++;
      }
      assignedLetter = aIdx < alphabet.length ? alphabet[aIdx] : String(currentBedNum);
    }
    usedLetters.add(assignedLetter);
    const finalBedCode = `Bed ${assignedLetter}`;

    // Skip creating occupant for vacant / available beds
    if (isVacantRow(row)) {
      return;
    }

    const occupantId = `occ_ft_${propertyId}_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
    const rent = Number(row.rentAmount) || 0;
    const deposit = Number(row.securityDeposit) >= 0 ? Number(row.securityDeposit) : 0;
    const priorArrears = Number(row.priorArrearsAmount) > 0 ? Number(row.priorArrearsAmount) : 0;
    const isRentPaid = row.isCurrentMonthRentPaid !== undefined ? Boolean(row.isCurrentMonthRentPaid) : (options.markCurrentMonthRentPaid ?? false);
    const isDepositPaid = row.isSecurityDepositPaid !== undefined ? Boolean(row.isSecurityDepositPaid) : (options.markDepositsPaid !== false);
    totalMonthlyRevenue += rent;

    // Calculate clean current-cycle invoice date from tenant's joining date
    // If tenant joined historically, anchor invoice date to the current month on their joining day
    let currentCycleInvoiceDate = now.toISOString().split("T")[0];
    if (row.joiningDate) {
      try {
        const rawJoin = new Date(row.joiningDate);
        if (!isNaN(rawJoin.getTime())) {
          const joinDay = rawJoin.getDate();
          // Current month year & month
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth(); // 0-indexed
          // Find max days in current month
          const maxDays = new Date(currentYear, currentMonth + 1, 0).getDate();
          const safeDay = Math.min(joinDay, maxDays);
          const monthStr = String(currentMonth + 1).padStart(2, "0");
          const dayStr = String(safeDay).padStart(2, "0");
          currentCycleInvoiceDate = `${currentYear}-${monthStr}-${dayStr}`;
        }
      } catch {}
    }

    // Build initial payment ledger items
    const paymentHistory: PaymentHistoryItem[] = [];

    // 1. If security deposit was paid during historical move-in
    if (isDepositPaid) {
      const depReceiptNo = generateReceiptNumber(settings, {
        date: row.joiningDate || now,
        manualSequence: idx * 2 + 1,
      });
      paymentHistory.push({
        id: `pay_dep_${Date.now()}_${idx}`,
        month: "Security Deposit",
        date: row.joiningDate || now.toISOString().split("T")[0],
        amount: deposit,
        depositAmount: deposit,
        rentAmount: 0,
        mode: "UPI",
        receiptNo: depReceiptNo,
        status: "PAID",
      });
    }

    // 2. If current month rent is marked as paid
    if (isRentPaid) {
      const rentReceiptNo = generateReceiptNumber(settings, {
        date: currentCycleInvoiceDate,
        manualSequence: idx * 2 + 2,
      });
      paymentHistory.push({
        id: `pay_rent_${Date.now()}_${idx}`,
        month: currentMonthStr,
        date: currentCycleInvoiceDate,
        amount: rent,
        rentAmount: rent,
        depositAmount: 0,
        mode: row.paymentMode || "UPI",
        receiptNo: rentReceiptNo,
        status: "PAID",
      });
    }

    // Row-specific payment status
    let rowPaymentStatus: "Paid" | "Due" | "Overdue" = "Due";
    let rowDaysRemainingText = "DUE TODAY";
    if (isRentPaid) {
      rowPaymentStatus = "Paid";
      rowDaysRemainingText = "PAID (CURRENT CYCLE)";
    } else if (daysDiff < -settings.gracePeriodDays) {
      rowPaymentStatus = "Overdue";
      rowDaysRemainingText = `${Math.abs(daysDiff)} DAYS OVERDUE`;
    } else if (daysDiff <= 0) {
      rowPaymentStatus = "Due";
      rowDaysRemainingText = "DUE TODAY";
    } else {
      rowPaymentStatus = "Due";
      rowDaysRemainingText = `Due in ${daysDiff} Days`;
    }

    const initials = row.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "TN";

    const occ: Occupant = {
      id: occupantId,
      name: row.fullName,
      avatar: "",
      roomNumber: rawRoom,
      bedCode: finalBedCode,
      rentAmount: rent,
      joiningDate: row.joiningDate || now.toISOString().split("T")[0],
      lastPaidDate: isRentPaid ? currentMonthStr : "—",
      dueDate: dueDateStr,
      dueDay,
      daysRemainingText: rowDaysRemainingText,
      daysDiff: isRentPaid ? 30 : daysDiff,
      paymentStatus: rowPaymentStatus,
      lifecycleStatus: "Active",
      stayType: row.stayType === "Guest" ? "Guest" : "Tenant",
      phone: row.phone || "9876543210",
      email: `${row.fullName.toLowerCase().replace(/[^a-z0-9]/g, "")}@resident.tenopilot.com`,
      aadhaarNumber: "XXXX-XXXX-XXXX",
      workplace: row.workplace || "",
      occupation: row.occupation || "",
      purposeOfVisit: row.purposeOfVisit || "",
      emergencyContact: {
        name: `${row.fullName} Guardian`,
        phone: row.phone || "9876543210",
        relation: "Guardian",
      },
      kycVerified: false,
      hasPdfAgreement: false,
      kycDocs: undefined,
      securityDeposit: deposit,
      depositStatus: isDepositPaid ? "PAID" : "PENDING",
      arrearsBalance: priorArrears,
      paymentHistory,
    };

    newOccupants.push(occ);
  });

  // 4. Smart De-duplication & Update Occupant Store & Cloud Firestore
  const mergedOccupants: Occupant[] = [...existingOccupants];

  newOccupants.forEach((newOcc, occIdx) => {
    const cleanNewPhone = (newOcc.phone || "").replace(/\D/g, "").slice(-10);
    const newNormName = (newOcc.name || "").trim().toLowerCase();
    const newRoom = (newOcc.roomNumber || "").trim().toUpperCase();
    const newBed = (newOcc.bedCode || "").trim().toUpperCase();

    const existingIndex = mergedOccupants.findIndex((ex) => {
      const cleanExPhone = (ex.phone || "").replace(/\D/g, "").slice(-10);
      const exNormName = (ex.name || "").trim().toLowerCase();
      const exRoom = (ex.roomNumber || "").trim().toUpperCase();
      const exBed = (ex.bedCode || "").trim().toUpperCase();

      // Case 1: Matching valid phone number (not dummy 9876543210)
      if (cleanNewPhone.length === 10 && cleanNewPhone !== "9876543210" && cleanExPhone === cleanNewPhone) {
        return true;
      }
      // Case 2: Matching Room + Bed Code
      if (newRoom && exRoom === newRoom && newBed && exBed === newBed) {
        return true;
      }
      // Case 3: Matching Room + Name
      if (newRoom && exRoom === newRoom && (exNormName === newNormName || exNormName.includes(newNormName) || newNormName.includes(exNormName))) {
        return true;
      }
      return false;
    });

    if (existingIndex >= 0) {
      // Merge into existing occupant with Dual-Ledger Financial Override
      const ex = mergedOccupants[existingIndex];
      const updatedHistory = [...(ex.paymentHistory || [])];

      // 🌟 Security Deposit Dual Ledger Reconciliation:
      let depositStatus = ex.depositStatus || "PENDING";
      const depReceiptIdx = updatedHistory.findIndex((p) => p.month === "Security Deposit" || p.id.startsWith("pay_dep_"));
      const finalDepAmount = newOcc.securityDeposit ?? 0;
      if (newOcc.depositStatus === "PAID") {
        depositStatus = "PAID";
        if (depReceiptIdx >= 0) {
          updatedHistory[depReceiptIdx] = {
            ...updatedHistory[depReceiptIdx],
            amount: finalDepAmount,
            depositAmount: finalDepAmount,
            rentAmount: 0,
            status: "PAID",
          };
        } else if (finalDepAmount > 0) {
          const depReceiptNo = generateReceiptNumber(settings, {
            date: ex.joiningDate || newOcc.joiningDate || now,
            manualSequence: occIdx * 2 + 1,
          });
          updatedHistory.unshift({
            id: `pay_dep_${Date.now()}_${occIdx}`,
            month: "Security Deposit",
            date: ex.joiningDate || newOcc.joiningDate || now.toISOString().split("T")[0],
            amount: finalDepAmount,
            depositAmount: finalDepAmount,
            rentAmount: 0,
            mode: "UPI",
            receiptNo: depReceiptNo,
            status: "PAID",
          });
        }
      } else {
        // Owner marked Security Deposit as NO / Pending: remove onboarding deposit receipt
        depositStatus = "PENDING";
        if (depReceiptIdx >= 0) {
          updatedHistory.splice(depReceiptIdx, 1);
        }
      }

      // 🌟 Rent Dual Ledger Reconciliation:
      let paymentStatus = ex.paymentStatus;
      let lastPaidDate = ex.lastPaidDate;
      const rentReceiptIdx = updatedHistory.findIndex((p) => p.month === currentMonthStr || p.id.startsWith("pay_rent_"));
      if (newOcc.paymentStatus === "Paid") {
        paymentStatus = "Paid";
        lastPaidDate = currentMonthStr;
        if (rentReceiptIdx >= 0) {
          updatedHistory[rentReceiptIdx] = {
            ...updatedHistory[rentReceiptIdx],
            amount: newOcc.rentAmount,
            rentAmount: newOcc.rentAmount,
            depositAmount: 0,
            status: "PAID",
          };
        } else if (newOcc.rentAmount > 0) {
          const rentReceiptNo = generateReceiptNumber(settings, {
            date: now,
            manualSequence: occIdx * 2 + 2,
          });
          updatedHistory.push({
            id: `pay_rent_${Date.now()}_${occIdx}`,
            month: currentMonthStr,
            date: now.toISOString().split("T")[0],
            amount: newOcc.rentAmount,
            rentAmount: newOcc.rentAmount,
            depositAmount: 0,
            mode: newOcc.paymentHistory?.[0]?.mode || "UPI",
            receiptNo: rentReceiptNo,
            status: "PAID",
          });
        }
      } else {
        // Owner marked Rent as NO / Due: remove onboarding rent receipt
        paymentStatus = newOcc.paymentStatus || "Due";
        lastPaidDate = "—";
        if (rentReceiptIdx >= 0) {
          updatedHistory.splice(rentReceiptIdx, 1);
        }
      }

      mergedOccupants[existingIndex] = {
        ...ex,
        name: newOcc.name || ex.name,
        roomNumber: newOcc.roomNumber || ex.roomNumber,
        bedCode: newOcc.bedCode || ex.bedCode,
        rentAmount: newOcc.rentAmount || ex.rentAmount,
        securityDeposit: newOcc.securityDeposit ?? ex.securityDeposit,
        workplace: newOcc.workplace || ex.workplace,
        occupation: newOcc.occupation || ex.occupation,
        purposeOfVisit: newOcc.purposeOfVisit || ex.purposeOfVisit,
        depositStatus,
        paymentStatus,
        lastPaidDate,
        paymentHistory: updatedHistory,
      };
      saveOccupantToFirestore(propertyId, mergedOccupants[existingIndex]).catch((err) =>
        console.warn(`Firestore background update notice for ${ex.name}:`, err)
      );
    } else {
      // Brand new occupant
      mergedOccupants.push(newOcc);
      saveOccupantToFirestore(propertyId, newOcc).catch((err) =>
        console.warn(`Firestore background save notice for ${newOcc.name}:`, err)
      );
    }
  });

  occupantStore.updateOccupants(mergedOccupants, propertyId);

  // 5. Synchronize Room Bed Occupancies in Property Layout Store (Accurate Bed-Code Matching)
  const currentStructure = propertyStore.getStructure(propertyId);
  if (currentStructure && currentStructure.length > 0) {
    let structureUpdated = false;

    // Group active occupants by room number
    const activeOccupantsByRoom = new Map<string, Occupant[]>();
    mergedOccupants
      .filter((o) => o.lifecycleStatus !== "Past")
      .forEach((occ) => {
        const rm = occ.roomNumber.toUpperCase().trim();
        const list = activeOccupantsByRoom.get(rm) || [];
        list.push(occ);
        activeOccupantsByRoom.set(rm, list);
      });

    currentStructure.forEach((floor) => {
      floor.rooms.forEach((room) => {
        const roomOccupants = activeOccupantsByRoom.get(room.roomNumber.toUpperCase().trim()) || [];
        const usedOccIdsInRoom = new Set<string>();

        room.beds.forEach((bed) => {
          const cleanBedCode = (bed.bedCode || "").toUpperCase().trim();
          // Match by bedCode first, fallback to first unassigned occupant in room
          const matchingOcc =
            roomOccupants.find(
              (o) =>
                !usedOccIdsInRoom.has(o.id) &&
                (o.bedCode || "").toUpperCase().trim() === cleanBedCode
            ) || roomOccupants.find((o) => !usedOccIdsInRoom.has(o.id));

          if (matchingOcc) {
            usedOccIdsInRoom.add(matchingOcc.id);
            bed.status =
              matchingOcc.lifecycleStatus === "Notice"
                ? "Vacating"
                : matchingOcc.stayType === "Guest"
                ? "Guest"
                : "Occupied";
            bed.occupant = matchingOcc;
            matchingOcc.bedCode = bed.bedCode; // Align bed code to physical layout
            structureUpdated = true;
          } else {
            bed.status = "Available";
            bed.occupant = undefined;
            bed.vacatingDate = undefined;
            bed.guestCheckoutDate = undefined;
            structureUpdated = true;
          }
        });
      });
    });

    if (structureUpdated) {
      propertyStore.updateStructure(currentStructure, propertyId);
      occupantStore.updateOccupants(mergedOccupants, propertyId);
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
