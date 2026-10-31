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
import { getCanonicalBedIndex, normalizeRoomNumber, resolveOccupantPaymentDueDate, resolveOccupantBillingCycleContext, parseOccupantDate } from "@/utils/domainSSOT";

export interface IngestProgress {
  phase: "VALIDATING" | "PROVISIONING" | "ENROLLING" | "SYNCING" | "COMPLETED";
  current: number;
  total: number;
  percentage: number;
  message: string;
}

export interface BatchIngestOptions {
  autoProvisionBuilding: boolean;
  rebuildLayout?: boolean; // When true, clears dummy rooms and generates fresh from sheet
  markDepositsPaid?: boolean;
  markCurrentMonthRentPaid?: boolean;
  userProfile?: any;
  onProgress?: (progress: IngestProgress) => void;
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
  options.onProgress?.({
    phase: "VALIDATING",
    current: 0,
    total: rows.length,
    percentage: 5,
    message: `Validating ${rows.length} resident records...`,
  });

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
    options.onProgress?.({
      phase: "PROVISIONING",
      current: 0,
      total: rows.length,
      percentage: 12,
      message: options.rebuildLayout
        ? "Rebuilding fresh building floors, rooms & bed slots..."
        : "Updating property layout & matching rooms...",
    });
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

    // Row-specific payment status & Anniversary Dynamic Due Date
    const isAnniversary = settings.billingCycleDates === "Anniversary Date";
    let occDueDay = dueDay;
    const occJoinDateStr = row.joiningDate || now.toISOString().split("T")[0];
    if (isAnniversary && row.joiningDate) {
      const parsedJD = parseOccupantDate(row.joiningDate);
      if (parsedJD && !isNaN(parsedJD.getTime())) {
        occDueDay = parsedJD.getDate();
      }
    }

    const occDueDateStr = resolveOccupantPaymentDueDate(
      { joiningDate: occJoinDateStr, dueDay: occDueDay },
      settings
    ) || dueDateStr;

    const occCycleCtx = resolveOccupantBillingCycleContext(
      { joiningDate: occJoinDateStr, dueDay: occDueDay },
      settings
    );

    let rowPaymentStatus: "Paid" | "Due" | "Overdue" = "Due";
    let rowDaysRemainingText = "DUE TODAY";
    if (isRentPaid) {
      rowPaymentStatus = "Paid";
      rowDaysRemainingText = "PAID (CURRENT CYCLE)";
    } else if (priorArrears > 0 || occCycleCtx.isPastGrace) {
      rowPaymentStatus = "Overdue";
      rowDaysRemainingText = "OVERDUE";
    } else {
      rowPaymentStatus = "Due";
      rowDaysRemainingText = "DUE";
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
      joiningDate: occJoinDateStr,
      lastPaidDate: isRentPaid ? currentMonthStr : "—",
      dueDate: occDueDateStr,
      dueDay: occDueDay,
      daysRemainingText: rowDaysRemainingText,
      daysDiff: isRentPaid ? 30 : daysDiff,
      paymentStatus: rowPaymentStatus,
      lifecycleStatus: "Active",
      stayType: row.stayType === "Guest" ? "Guest" : "Tenant",
      phone: row.phone || "",
      email: row.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim()) ? row.email.trim().toLowerCase() : "",
      aadhaarNumber: "XXXX-XXXX-XXXX",
      workplace: row.workplace || "",
      occupation: row.occupation || "",
      purposeOfVisit: row.purposeOfVisit || "",
      emergencyContact: {
        name: `${row.fullName} Guardian`,
        phone: row.phone || "",
        relation: "Guardian",
      },
      kycVerified: false,
      hasPdfAgreement: false,
      kycDocs: undefined,
      securityDeposit: deposit,
      depositStatus: isDepositPaid ? "PAID" : "PENDING",
      arrearsBalance: priorArrears,
      vehicleNumber: row.vehicleNumber?.trim() || undefined,
      vehicleNumbers: row.vehicleNumber?.trim() ? [row.vehicleNumber.trim()] : undefined,
      paymentHistory,
    };

    newOccupants.push(occ);
  });

  // 4. Smart De-duplication & Update Occupant Store & Cloud Firestore
  const mergedOccupants: Occupant[] = [...existingOccupants];
  const occupantsToSave: Occupant[] = [];

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
      // Case 2: Matching Room + Name (Resilient to shuffled rows)
      if (newRoom && exRoom === newRoom && (exNormName === newNormName || exNormName.includes(newNormName) || newNormName.includes(exNormName))) {
        return true;
      }
      // Case 3: Exact Global Name Match
      if (exNormName && newNormName && exNormName.length > 2 && exNormName === newNormName) {
        return true;
      }
      // Case 4: Matching Room + Bed Code ONLY if names are compatible (never overwrite different resident on Bed A)
      if (newRoom && exRoom === newRoom && newBed && exBed === newBed) {
        const nameConflict = exNormName && newNormName && exNormName !== newNormName && !exNormName.includes(newNormName) && !newNormName.includes(exNormName);
        if (!nameConflict) {
          return true;
        }
      }
      return false;
    });

    if (existingIndex >= 0) {
      // Merge into existing occupant with Dual-Ledger Financial Override
      const ex = mergedOccupants[existingIndex];
      if (newOcc.vehicleNumber) {
        ex.vehicleNumber = newOcc.vehicleNumber;
        ex.vehicleNumbers = newOcc.vehicleNumbers;
      }
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
      occupantsToSave.push(mergedOccupants[existingIndex]);
    } else {
      // Brand new occupant
      mergedOccupants.push(newOcc);
      occupantsToSave.push(newOcc);
    }
  });

  // 4b. Cloud Firestore Batch Sync with Real-time Progress Tracking
  const BATCH_SIZE = 15;
  const totalToSave = occupantsToSave.length;
  let savedCount = 0;

  if (totalToSave > 0) {
    options.onProgress?.({
      phase: "ENROLLING",
      current: 0,
      total: totalToSave,
      percentage: 20,
      message: `Enrolling ${totalToSave} residents to Cloud Firestore...`,
    });

    for (let i = 0; i < totalToSave; i += BATCH_SIZE) {
      const chunk = occupantsToSave.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        chunk.map((occ) =>
          saveOccupantToFirestore(propertyId, occ).catch((err) =>
            console.warn(`Firestore save notice for ${occ.name}:`, err)
          )
        )
      );
      savedCount = Math.min(totalToSave, i + chunk.length);
      const percentage = 20 + Math.round((savedCount / totalToSave) * 70); // 20% -> 90%
      options.onProgress?.({
        phase: "ENROLLING",
        current: savedCount,
        total: totalToSave,
        percentage,
        message: `Securing resident profiles in Cloud Firestore (${savedCount} / ${totalToSave})...`,
      });
    }
  }

  occupantStore.updateOccupants(mergedOccupants, propertyId);

  // 5. Synchronize Room Bed Occupancies in Property Layout Store (Accurate Bed-Code Matching)
  options.onProgress?.({
    phase: "SYNCING",
    current: totalToSave,
    total: totalToSave,
    percentage: 95,
    message: "Synchronizing live Property Map & Bed occupancy matrix...",
  });
  const currentStructure = propertyStore.getStructure(propertyId);
  if (currentStructure && currentStructure.length > 0) {
    let structureUpdated = false;

    // Group active occupants by room number
    const activeOccupantsByRoom = new Map<string, Occupant[]>();
    mergedOccupants
      .filter((o) => o.lifecycleStatus !== "Past")
      .forEach((occ) => {
        const rm = normalizeRoomNumber(occ.roomNumber);
        const list = activeOccupantsByRoom.get(rm) || [];
        list.push(occ);
        activeOccupantsByRoom.set(rm, list);
      });

    currentStructure.forEach((floor) => {
      floor.rooms.forEach((room) => {
        // 1. Canonical bed sorting: ensure Bed A precedes Bed B, Bed C...
        if (Array.isArray(room.beds)) {
          room.beds.sort((a, b) =>
            getCanonicalBedIndex(a.bedCode) - getCanonicalBedIndex(b.bedCode)
          );
        }

        const roomOccupants = activeOccupantsByRoom.get(normalizeRoomNumber(room.roomNumber)) || [];
        const usedOccIdsInRoom = new Set<string>();
        const bedAssignments = new Map<string, any>();

        // Step 1: Assign occupants who have an exact canonical bed index match
        room.beds.forEach((bed) => {
          const bedIdx = getCanonicalBedIndex(bed.bedCode);
          const exactMatch = roomOccupants.find((o) => {
            if (usedOccIdsInRoom.has(o.id)) return false;
            const oIdx = getCanonicalBedIndex(o.bedCode);
            if (bedIdx !== -1 && oIdx !== -1) return bedIdx === oIdx;
            return (o.bedCode || "").toUpperCase().trim() === (bed.bedCode || "").toUpperCase().trim();
          });
          if (exactMatch) {
            usedOccIdsInRoom.add(exactMatch.id);
            bedAssignments.set(bed.id, exactMatch);
          }
        });

        // Step 2: Sequentially allocate unassigned occupants to unassigned empty beds in canonical order (Bed A, Bed B...)
        const remainingOccupants = roomOccupants.filter((o) => !usedOccIdsInRoom.has(o.id));
        let remIdx = 0;
        room.beds.forEach((bed) => {
          if (!bedAssignments.has(bed.id) && remIdx < remainingOccupants.length) {
            const occ = remainingOccupants[remIdx++];
            usedOccIdsInRoom.add(occ.id);
            occ.bedCode = bed.bedCode; // Align occupant bedCode
            bedAssignments.set(bed.id, occ);
          }
        });

        // Step 3: Apply assignments to beds
        room.beds.forEach((bed) => {
          const matchingOcc = bedAssignments.get(bed.id);
          if (matchingOcc) {
            bed.status =
              matchingOcc.lifecycleStatus === "Notice"
                ? "Vacating"
                : matchingOcc.stayType === "Guest"
                ? "Guest"
                : "Occupied";
            bed.occupant = matchingOcc;
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

  options.onProgress?.({
    phase: "COMPLETED",
    current: newOccupants.length,
    total: newOccupants.length,
    percentage: 100,
    message: `Migration complete! Successfully enrolled ${newOccupants.length} residents.`,
  });

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
