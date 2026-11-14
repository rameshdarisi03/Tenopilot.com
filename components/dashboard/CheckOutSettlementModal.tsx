"use client";

import { useState, useMemo } from "react";
import {
  X,
  CheckCircle2,
  Key,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  Receipt,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Info,
} from "lucide-react";
import { Occupant, occupantStore } from "@/constants/mockOccupants";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { expenseStore } from "@/constants/expenseStore";
import { complianceLogStore } from "@/constants/complianceLogStore";
import { sanitizeOccupantForCompliance } from "@/utils/dpdpRetentionEngine";
import { propertySettingsStore } from "@/constants/propertySettings";
import { getCanonicalPortalOrigin } from "@/utils/urlUtils";
import { calculateOccupantFinancialStatement } from "@/utils/domainSSOT";
import { saveOccupantToFirestore } from "@/lib/firestoreService";
import { partnerStore } from "@/constants/partnerStore";

export function CheckOutSettlementModal({
  occupant,
  roomNumber,
  bedCode,
  propertyId = "sunshine-pg",
  isOpen,
  onClose,
  onSuccess,
}: {
  occupant: Occupant;
  roomNumber: string;
  bedCode: string;
  propertyId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedOccupant?: Occupant) => void;
}) {
  // Step 1: Handover Checklist State
  const [keysReturned, setKeysReturned] = useState(true);
  const [drawerKeysReturned, setDrawerKeysReturned] = useState(true);
  const [acRemoteReturned, setAcRemoteReturned] = useState(true);
  const [roomInspected, setRoomInspected] = useState(true);

  // Step 2: Live Financial Statement & Dues Detection
  const settings = propertySettingsStore.getSettings(propertyId);
  const liveStmt = useMemo(
    () => (occupant ? calculateOccupantFinancialStatement(occupant, settings) : null),
    [occupant, settings]
  );
  const liveUnpaidRent = liveStmt ? Math.max(0, liveStmt.netOutstandingBalance) : 0;

  // Detect Unpaid Security Deposit
  const requiredDeposit = liveStmt?.securityDepositRequired ?? (occupant.securityDeposit !== undefined ? occupant.securityDeposit : (occupant.rentAmount ? occupant.rentAmount * 2 : 0));
  const liveUnpaidDeposit = liveStmt ? Math.max(0, liveStmt.remainingDepositDue) : (occupant.depositStatus === "PAID" ? 0 : requiredDeposit);
  const hasUnpaidDeposit = liveUnpaidDeposit > 0 || (occupant.depositStatus !== "PAID" && requiredDeposit > 0);

  // Actual deposit received/held (if deposit was never paid, owner holds 0)
  const actualDepositReceived = occupant.checkoutSettlement?.initialDeposit !== undefined
    ? occupant.checkoutSettlement.initialDeposit
    : liveStmt
    ? liveStmt.totalDepositPaid
    : (occupant.depositStatus === "PAID" ? requiredDeposit : 0);

  // Step 3: Financial Settlement Calculator State
  const initialDeposit = actualDepositReceived;
  const [exitDisposition, setExitDisposition] = useState<"NORMAL" | "ABSCONDED" | "DEFAULTED">("NORMAL");

  const [unpaidRentDues, setUnpaidRentDues] = useState<number>(() => {
    if (occupant.checkoutSettlement?.unpaidRentDeduction !== undefined) {
      return occupant.checkoutSettlement.unpaidRentDeduction;
    }
    return liveUnpaidRent;
  });
  const [repairDeductions, setRepairDeductions] = useState<number>(() => occupant.checkoutSettlement?.repairDeduction ?? 0);
  const [maintenanceExpenses, setMaintenanceExpenses] = useState<number>(() => occupant.checkoutSettlement?.maintenanceDeduction ?? 0); // Cleaning, painting fees

  const isBadDebtExit = exitDisposition === "ABSCONDED" || exitDisposition === "DEFAULTED";

  // Calculated Net Settlement Math (2-Way: Refund vs Deficit vs Bad Debt)
  const totalDeductions = unpaidRentDues + repairDeductions + maintenanceExpenses;
  const netDifference = initialDeposit - totalDeductions;

  // For absconded or defaulted exits, no refund is ever given to the resident.
  const netRefundableAmount = isBadDebtExit ? 0 : Math.max(0, netDifference);
  const netDeficitToCollect = isBadDebtExit ? 0 : Math.max(0, -netDifference);

  // Bad Debt loss: Outstanding dues exceeding the forfeited security deposit
  const badDebtAmount = isBadDebtExit ? Math.max(0, totalDeductions - initialDeposit) : 0;

  const [paymentChannel, setPaymentChannel] = useState<"Online payments (UPI)" | "Cash Desk">(() =>
    (occupant.checkoutSettlement?.paymentChannel as any) || "Online payments (UPI)"
  );

  const paymentAccounts = useMemo(() => partnerStore.getPaymentAccounts(propertyId), [propertyId]);
  const partners = useMemo(() => partnerStore.getPartners(propertyId), [propertyId]);
  const [refundAccount, setRefundAccount] = useState<string>(() => {
    return occupant.checkoutSettlement?.paidFrom || (paymentAccounts[0]?.name || partners[0]?.name || "Main Business Account");
  });

  const [settlementNotes, setSettlementNotes] = useState(() => occupant.checkoutSettlement?.notes || "");
  const [sendWhatsAppNotice, setSendWhatsAppNotice] = useState(true);
  const [sendEmailNotice, setSendEmailNotice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !occupant) return null;

  const handleExecuteCheckout = async () => {
    setIsSubmitting(true);
    try {
      const todayStr = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const settlementStatus: "FULL_REFUND" | "PARTIAL_REFUND" | "NO_REFUND" | "BAD_DEBT_WRITTEN_OFF" =
        isBadDebtExit
          ? badDebtAmount > 0
            ? "BAD_DEBT_WRITTEN_OFF"
            : "NO_REFUND"
          : totalDeductions === 0
          ? "FULL_REFUND"
          : netRefundableAmount > 0
          ? "PARTIAL_REFUND"
          : "NO_REFUND";

      // 1. Build official ledger settlement entries
      const settlementRecords: any[] = [];
      const totalMaintCharges = (maintenanceExpenses || 0) + (repairDeductions || 0);

      // A. If unpaid rent dues were settled (adjusted against deposit or collected on exit)
      if (unpaidRentDues > 0 && !isBadDebtExit) {
        settlementRecords.push({
          id: `pay-settle-rent-${Date.now()}`,
          amount: unpaidRentDues,
          date: todayStr,
          month: `Rent Cleared on Checkout (${netDifference >= 0 ? "Adjusted from Security Deposit" : "Collected on Departure"})`,
          mode: netDifference >= 0 ? "Deposit Settlement" : (paymentChannel === "Online payments (UPI)" ? "UPI" : "Cash"),
          paidTo: refundAccount || paymentChannel,
          receiptNo: `SET-RENT-${Date.now().toString().slice(-4)}`,
          status: "PAID" as const,
          rentAmount: unpaidRentDues,
          depositAmount: 0,
          parkingAmount: 0,
          maintenanceAmount: 0,
        });
      }

      // B. If net deposit refund is returned to the tenant (only on normal exit)
      if (netRefundableAmount > 0 && !isBadDebtExit) {
        settlementRecords.push({
          id: `pay-ref-${Date.now()}`,
          amount: netRefundableAmount,
          date: todayStr,
          month: "Security Deposit Refund",
          mode: paymentChannel === "Online payments (UPI)" ? "UPI" : "Cash",
          paidTo: refundAccount || paymentChannel,
          receiptNo: `REF-${Date.now().toString().slice(-6)}`,
          status: "PAID" as const,
          depositAmount: initialDeposit,
          rentAmount: unpaidRentDues > 0 ? unpaidRentDues : 0,
          parkingAmount: 0,
          maintenanceAmount: totalMaintCharges > 0 ? totalMaintCharges : 0,
        });
      }

      const checkoutSettlement = {
        settledDate: todayStr,
        initialDeposit,
        unpaidRentDeduction: unpaidRentDues,
        repairDeduction: repairDeductions,
        maintenanceDeduction: maintenanceExpenses,
        totalDeductions,
        netRefunded: netRefundableAmount,
        netDeficitCollected: netDeficitToCollect,
        badDebtWrittenOff: badDebtAmount,
        exitDisposition,
        status: settlementStatus,
        paymentChannel,
        paidFrom: refundAccount || paymentChannel,
        notes: settlementNotes.trim() || undefined,
      };

      // 1. Update Occupant Status to "Past" with strict Defaulter and Forfeited Deposit audit
      const updatedOccupant: Occupant = {
        ...occupant,
        lifecycleStatus: "Past",
        depositStatus: isBadDebtExit ? (initialDeposit > 0 ? "FORFEITED" : "PENDING") : "REFUNDED",
        exitDisposition,
        badDebtAmount,
        paymentStatus: badDebtAmount > 0 ? "Overdue" : "Paid",
        arrearsBalance: badDebtAmount,
        vacatingDate: todayStr,
        checkoutSettlement,
        paymentHistory: [
          ...(occupant.paymentHistory || []),
          ...settlementRecords,
        ],
      };

      // Update occupantStore SSOT & Cloud Firestore
      occupantStore.updateOccupant(updatedOccupant, propertyId);
      await saveOccupantToFirestore(propertyId, updatedOccupant);

      // 2. Reset Bed Status to "Available" (Reusing standard Available category)
      propertyStore.freeUpBedSlot(propertyId, roomNumber || occupant.roomNumber, bedCode || occupant.bedCode, occupant.id);

      // 3. Log Financial Outflow / Bad Debt in expenseStore (Expense Ledger)
      const propName = propertySettingsStore.getSettings(propertyId)?.propertyName || "PG Property";
      const todayIso = new Date().toISOString().slice(0, 10);

      if (netRefundableAmount > 0 && !isBadDebtExit) {
        expenseStore.addExpense(propertyId, {
          category: "Security Deposit Refund",
          amount: netRefundableAmount,
          paidFrom: refundAccount || paymentChannel || "Main Business Account",
          property: propName,
          date: todayIso,
          hasReceipt: false,
          notes: `Check-out deposit refund for ${occupant.name} (Room ${roomNumber || occupant.roomNumber || "N/A"} - ${bedCode || occupant.bedCode || "N/A"}) via ${refundAccount || paymentChannel}`,
        });
      } else if (badDebtAmount > 0) {
        // Record non-cash bad debt operating write-off
        expenseStore.addExpense(propertyId, {
          category: "Bad Debt & Absconded Losses",
          amount: badDebtAmount,
          paidFrom: "Non-Cash Write-Off",
          property: propName,
          date: todayIso,
          hasReceipt: false,
          notes: `Unrecovered bad debt write-off for ${occupant.name} (${occupant.stayType} - Rm ${roomNumber || occupant.roomNumber}) - ${exitDisposition === "ABSCONDED" ? "Absconded without notice" : "Disputed default / Refused to pay dues"}. Rent/Dues: ₹${totalDeductions.toLocaleString("en-IN")}, Forfeited Deposit: ₹${initialDeposit.toLocaleString("en-IN")}.`,
        });
      }

      // 4. 🔒 Write DPDP Act 2023 Sanitized Immutable Record to Master Police Register
      const sanitizedComplianceEntry = sanitizeOccupantForCompliance({
        propertyId,
        occupantId: occupant.id,
        name: occupant.name,
        phone: occupant.phone,
        address: occupant.address || "Bengaluru, Karnataka",
        aadhaarNumber: occupant.aadhaarNumber,
        stayType: occupant.stayType || "Tenant",
        roomNumber: roomNumber || occupant.roomNumber || "101",
        bedCode: bedCode || occupant.bedCode || "BED A",
        checkInDate: occupant.joiningDate,
        checkInTime: "10:00 AM",
        checkOutDate: todayStr,
        checkOutTime: "11:00 AM",
        totalDaysStayed: Math.max(1, Math.round((Date.now() - new Date(occupant.joiningDate).getTime()) / 86400000)) || 30,
        purposeOfVisit: occupant.purposeOfVisit || occupant.workplace || "Long-Term Residence",
        exitCategory: occupant.lifecycleStatus === "Notice" ? "Notice Period Completed" : "Standard Scheduled Departure",
        exitReason: settlementNotes.trim() || `Formal check-out & deposit settlement executed. Room inspected, keys returned. Deductions: ₹${totalDeductions.toLocaleString("en-IN")}.`,
        totalPaid: occupant.rentAmount || 0,
        depositRefunded: netRefundableAmount,
        penaltyPaid: repairDeductions,
        maintenancePaid: maintenanceExpenses,
        kycVerified: Boolean(occupant.kycVerified),
      });

      complianceLogStore.addLog(propertyId, sanitizedComplianceEntry);

      // 5. 💬 Auto-Dispatch Move-Out Settlement PDF Receipt via WhatsApp & Email
      if ((sendWhatsAppNotice || sendEmailNotice) && !isBadDebtExit) {
        try {
          const baseUrl = getCanonicalPortalOrigin();
          const receiptNoStr = `REF-${Date.now().toString().slice(-6)}`;
          const settings = propertySettingsStore.getSettings(propertyId);
          const propName = settings?.propertyName || "TenoPilot PG";

          const totalMaintFee = (maintenanceExpenses || 0) + (repairDeductions || 0);
          const pdfParams = new URLSearchParams({
            receiptNo: receiptNoStr,
            propertyName: propName,
            propertyAddress: settings?.propertyAddress || "",
            managerPhone: settings?.managerPhone || "",
            residentName: occupant.name,
            roomNumber: roomNumber || occupant.roomNumber || "N/A",
            bedCode: bedCode || occupant.bedCode || "Bed 1",
            tenantPhone: occupant.phone || "",
            phone: occupant.phone || "",
            guestMobile: occupant.phone || "",
            amount: String(netRefundableAmount > 0 ? netRefundableAmount : netDeficitToCollect),
            paidDate: todayStr,
            paymentMode: paymentChannel,
            isSettlement: "true",
            initialDeposit: String(initialDeposit),
            unpaidRent: String(unpaidRentDues),
            repairs: String(repairDeductions),
            maintenance: String(totalMaintFee),
            maintenanceAmount: String(totalMaintFee),
            rentAmount: String(unpaidRentDues),
            depositAmount: String(initialDeposit),
            totalDeductions: String(totalDeductions),
            netRefunded: String(netRefundableAmount),
            netDeficit: String(netDeficitToCollect),
            checkoutDate: todayStr,
            status: settlementStatus,
            notes: settlementNotes.trim(),
          });

          const pdfUrl = `${baseUrl}/api/receipt/pdf?${pdfParams.toString()}`;

          // WhatsApp Dispatch (if checked)
          if (sendWhatsAppNotice && occupant.phone) {
            fetch("/api/whatsapp/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                propertyId,
                messages: [
                  {
                    toPhone: occupant.phone,
                    recipientName: occupant.name,
                    propertyId,
                    propertyName: propName,
                    occupantId: occupant.id,
                    type: "CHECKOUT_THANK_YOU",
                    params: {
                      receiptId: receiptNoStr,
                      receiptUrl: pdfUrl,
                      amount: netRefundableAmount > 0 ? netRefundableAmount : 0,
                      paidDate: todayStr,
                      paymentMode: paymentChannel,
                      roomNumber: roomNumber || occupant.roomNumber,
                      bedCode: bedCode || occupant.bedCode,
                      managerPhone: settings?.managerPhone,
                    },
                  },
                ],
              }),
            }).catch((e) => console.warn("Notice dispatching WhatsApp checkout thank you:", e));
          }

          // Email Dispatch (if checked)
          if (sendEmailNotice && occupant.email && !occupant.email.includes("resident.tenopilot.com")) {
              fetch("/api/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  propertyId,
                  messages: [
                    {
                      toEmail: occupant.email,
                      recipientName: occupant.name,
                      propertyId,
                      propertyName: propName,
                      type: "CHECKOUT_THANK_YOU",
                      params: {
                        receiptId: receiptNoStr,
                        receiptUrl: pdfUrl,
                        amount: netRefundableAmount,
                        initialDeposit,
                        unpaidRent: unpaidRentDues,
                        repairs: repairDeductions,
                        maintenance: maintenanceExpenses,
                        totalDeductions,
                        netRefunded: netRefundableAmount,
                        paidDate: todayStr,
                        paymentMode: paymentChannel,
                        roomNumber: roomNumber || occupant.roomNumber,
                        bedCode: bedCode || occupant.bedCode,
                        managerPhone: settings?.managerPhone,
                        notes: settlementNotes.trim(),
                      },
                    },
                  ],
                }),
              }).catch((e) => console.warn("Notice dispatching Email checkout thank you:", e));
            }
        } catch (dispatchErr) {
          console.warn("Notice dispatching digital notices:", dispatchErr);
        }
      }

      setIsSubmitting(false);
      onSuccess?.(updatedOccupant);
      onClose();
    } catch (err) {
      console.error("Check-Out settlement error:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 text-xs relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span className="badge-booked px-3 py-1 rounded-full text-[10px] font-bold">
              🔑 FORMAL RESIDENT CHECK-OUT & SETTLEMENT
            </span>
            <h2 className="font-serif font-bold text-xl text-gray-900 mt-2">
              Check-Out: {occupant.name} ({occupant.stayType === "Guest" ? "Guest" : "Tenant"})
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Room {roomNumber} ({bedCode}) • {occupant.vacatingDate ? `Promised Vacating Date: ${occupant.vacatingDate}` : "Immediate Departure (No Notice Logged)"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECTION 0: Exit Disposition Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block">
            Exit Type / Departure Reason
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setExitDisposition("NORMAL");
                setKeysReturned(true);
                setDrawerKeysReturned(true);
                setAcRemoteReturned(true);
                setRoomInspected(true);
                setSendWhatsAppNotice(true);
                setSendEmailNotice(true);
                setSettlementNotes("");
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                exitDisposition === "NORMAL"
                  ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold shadow-2xs"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Normal Departure</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                Keys returned, room inspected, deposit settled cleanly.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setExitDisposition("ABSCONDED");
                setKeysReturned(false);
                setDrawerKeysReturned(false);
                setAcRemoteReturned(false);
                setRoomInspected(false);
                setSendWhatsAppNotice(false);
                setSendEmailNotice(false);
                setSettlementNotes("Resident absconded without notice/intimation. Left room uninspected with pending dues.");
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                exitDisposition === "ABSCONDED"
                  ? "border-red-500 bg-red-50/80 ring-2 ring-red-500/20 text-red-950 font-bold shadow-2xs"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>🚨 Absconded / Runaway</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                Escaped without notice. Deposit forfeited & bad debt recorded.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setExitDisposition("DEFAULTED");
                setSendWhatsAppNotice(false);
                setSendEmailNotice(false);
                setSettlementNotes("Resident refused to clear outstanding rent/damages before vacating.");
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                exitDisposition === "DEFAULTED"
                  ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 text-amber-950 font-bold shadow-2xs"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                <TrendingDown className="w-4 h-4 text-amber-600" />
                <span>⚠️ Refused to Pay</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                Disputed checkout. Unpaid dues logged as written-off loss.
              </p>
            </button>
          </div>
        </div>

        {/* SECTION 1: Physical Assets Handover Checklist */}
        <div className={`p-4 rounded-2xl border space-y-3 transition-colors ${isBadDebtExit ? "bg-red-50/40 border-red-200" : "bg-amber-50/60 border-amber-200"}`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <div className={`flex items-center gap-2 ${isBadDebtExit ? "text-red-900" : "text-amber-900"}`}>
              <Key className="w-4 h-4 text-[#c2652a]" /> Physical Key & Asset Handover Checklist
            </div>
            {isBadDebtExit && (
              <span className="text-[10px] font-black text-red-700 uppercase bg-red-100 px-2 py-0.5 rounded-full">
                Uninspected Departure
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-amber-200 cursor-pointer hover:bg-amber-100/40">
              <input
                type="checkbox"
                checked={keysReturned}
                onChange={(e) => setKeysReturned(e.target.checked)}
                className="w-4 h-4 rounded text-[#c2652a] focus:ring-[#c2652a]"
              />
              <span className="font-bold text-gray-800 text-xs">🔑 Room Main Key Handed Over</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-amber-200 cursor-pointer hover:bg-amber-100/40">
              <input
                type="checkbox"
                checked={drawerKeysReturned}
                onChange={(e) => setDrawerKeysReturned(e.target.checked)}
                className="w-4 h-4 rounded text-[#c2652a] focus:ring-[#c2652a]"
              />
              <span className="font-bold text-gray-800 text-xs">🔐 Closet / Drawer Key Returned</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-amber-200 cursor-pointer hover:bg-amber-100/40">
              <input
                type="checkbox"
                checked={acRemoteReturned}
                onChange={(e) => setAcRemoteReturned(e.target.checked)}
                className="w-4 h-4 rounded text-[#c2652a] focus:ring-[#c2652a]"
              />
              <span className="font-bold text-gray-800 text-xs">📺 AC Remote & Access Card</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-amber-200 cursor-pointer hover:bg-amber-100/40">
              <input
                type="checkbox"
                checked={roomInspected}
                onChange={(e) => setRoomInspected(e.target.checked)}
                className="w-4 h-4 rounded text-[#c2652a] focus:ring-[#c2652a]"
              />
              <span className="font-bold text-gray-800 text-xs">🧹 Room Condition Inspection Verified</span>
            </label>
          </div>
        </div>

        {/* SECTION 2: Security Deposit & Financial Settlement Calculator */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
              <Receipt className="w-4 h-4 text-[#c2652a]" /> Financial Settlement & Deposit Calculator
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold block text-gray-500">
                Deposit: ₹{initialDeposit.toLocaleString("en-IN")}
              </span>
              {hasUnpaidDeposit && (
                <span className="text-[9px] font-extrabold text-rose-600 block">
                  ⚠️ ₹{liveUnpaidDeposit.toLocaleString("en-IN")} Unpaid
                </span>
              )}
            </div>
          </div>

          {/* Live Status Notification Banner for Unpaid Rent & Deposit */}
          {(liveUnpaidRent > 0 || hasUnpaidDeposit) ? (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {liveUnpaidRent > 0 && hasUnpaidDeposit
                  ? `Unpaid Dues: ₹${liveUnpaidRent.toLocaleString("en-IN")} Rent + ₹${liveUnpaidDeposit.toLocaleString("en-IN")} Deposit`
                  : liveUnpaidRent > 0
                  ? `Unpaid Dues: ₹${liveUnpaidRent.toLocaleString("en-IN")} Rent`
                  : `Unpaid Dues: ₹${liveUnpaidDeposit.toLocaleString("en-IN")} Deposit`}
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All Dues Cleared (₹0)</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-gray-700 text-[11px] mb-1">
                (-) Unpaid Rent Dues (₹)
              </label>
              <input
                type="number"
                min="0"
                value={unpaidRentDues ? unpaidRentDues : ""}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setUnpaidRentDues(val === "" ? 0 : parseInt(val, 10));
                }}
                className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 text-[11px] mb-1">
                (-) Repair / Damage Deductions (₹)
              </label>
              <input
                type="number"
                min="0"
                value={repairDeductions ? repairDeductions : ""}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setRepairDeductions(val === "" ? 0 : parseInt(val, 10));
                }}
                className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 text-[11px] mb-1">
                (-) Maintenance Expenses (₹)
              </label>
              <input
                type="number"
                min="0"
                value={maintenanceExpenses ? maintenanceExpenses : ""}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setMaintenanceExpenses(val === "" ? 0 : parseInt(val, 10));
                }}
                className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
              />
            </div>
          </div>

          {/* Dynamic Net Settlement Summary Banner */}
          {isBadDebtExit ? (
            <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-900 bg-red-200/80 px-2 py-0.5 rounded-full">
                  Security Deposit: FORFEITED
                </span>
                {badDebtAmount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                    🚨 Bad Debt Write-Off Required
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    🛡️ Covered by Forfeited Deposit
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">
                    Unrecovered Net Loss / Bad Debt:
                  </span>
                  <span className="text-xl font-serif font-black text-red-950 font-sans">
                    ₹{badDebtAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="text-right text-[10px] text-red-800 font-medium">
                  Deposit Forfeited: ₹{initialDeposit.toLocaleString("en-IN")} • Dues: ₹{totalDeductions.toLocaleString("en-IN")}
                </div>
              </div>

              <p className="text-[11px] text-red-900 leading-snug pt-1">
                {badDebtAmount > 0
                  ? `₹${badDebtAmount.toLocaleString("en-IN")} will be written off as an unrecovered operating loss in Financial Hub. Resident's Phone & Aadhaar will be flagged on the Property Blacklist.`
                  : `Security deposit of ₹${initialDeposit.toLocaleString("en-IN")} is retained as penalty income. No refund will be issued.`}
              </p>
            </div>
          ) : netDifference >= 0 ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  👉 Net Refund to Pay to Resident
                </span>
                <span className="text-xl font-serif font-bold text-emerald-950">
                  ₹{netRefundableAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right text-[10px] text-emerald-800 font-medium">
                Deposit: ₹{initialDeposit.toLocaleString("en-IN")} • Deductions: ₹{totalDeductions.toLocaleString("en-IN")}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-center justify-between animate-in fade-in">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                  👉 Net Deficit to Collect from Resident
                </span>
                <span className="text-xl font-serif font-bold text-rose-950">
                  ₹{netDeficitToCollect.toLocaleString("en-IN")} 🔴
                </span>
              </div>
              <div className="text-right text-[10px] text-rose-800 font-medium">
                Deposit: ₹{initialDeposit.toLocaleString("en-IN")} • Deductions: ₹{totalDeductions.toLocaleString("en-IN")}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Refund / Deficit Payment Channel & Notes */}
        {!isBadDebtExit && (
          <div className="space-y-3">
            <label className="block font-bold text-gray-900 text-xs">
              {netDifference >= 0 ? "Refund Payment Mode (Channel) *" : "Deficit Collection Mode (Channel) *"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentChannel("Online payments (UPI)")}
                className={`p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer text-left flex items-center gap-2 ${
                  paymentChannel === "Online payments (UPI)"
                    ? "bg-orange-50 border-[#c2652a] text-[#c2652a] ring-1 ring-[#c2652a]"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <CreditCard className="w-4 h-4" /> Online payments (UPI)
              </button>

              <button
                type="button"
                onClick={() => setPaymentChannel("Cash Desk")}
                className={`p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer text-left flex items-center gap-2 ${
                  paymentChannel === "Cash Desk"
                    ? "bg-orange-50 border-[#c2652a] text-[#c2652a] ring-1 ring-[#c2652a]"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> Cash Desk
              </button>
            </div>

            {(paymentAccounts.length > 0 || partners.length > 0) && netDifference >= 0 && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-slate-700 font-semibold text-xs">
                  Disbursed From Partner / Bank Account *
                </label>
                <select
                  value={refundAccount}
                  onChange={(e) => setRefundAccount(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                >
                  {paymentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.name}>
                      {acc.name} ({acc.bankLabel || acc.accountType || "Bank"})
                    </option>
                  ))}
                  {partners.map((p) => (
                    <option key={p.id} value={p.name}>
                      Partner: {p.name}
                    </option>
                  ))}
                  <option value="Property Cash Box">Property Cash Box</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: Automated Digital Dispatch (WhatsApp & Email Options) */}
        {!isBadDebtExit ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-2.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
              📬 Digital Delivery Channels (Check to Send):
            </span>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendWhatsAppNotice}
                  onChange={(e) => setSendWhatsAppNotice(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-xs text-gray-800 flex items-center gap-1">
                  <span>💬</span> WhatsApp Notice & PDF
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendEmailNotice}
                  onChange={(e) => setSendEmailNotice(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-xs text-gray-800 flex items-center gap-1">
                  <span>✉️</span> Email Notice & PDF
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <span className="font-bold">⚠️ Absconded / Unsettled Default:</span> Friendly thank-you notices are automatically disabled. Tenancy termination is preserved in police compliance records.
          </div>
        )}

        {/* SECTION 5: Final Execution Action */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || (!isBadDebtExit && !keysReturned)}
            onClick={handleExecuteCheckout}
            className={`flex-1 py-3.5 rounded-xl text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
              isBadDebtExit
                ? "bg-red-600 hover:bg-red-700"
                : netDifference >= 0
                ? "bg-[#c2652a] hover:bg-[#c2652a]/90"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isBadDebtExit
                ? exitDisposition === "ABSCONDED"
                  ? `Confirm Absconded (${badDebtAmount > 0 ? `₹${badDebtAmount.toLocaleString("en-IN")} Bad Debt` : "Forfeit Deposit"})`
                  : `Confirm Default (${badDebtAmount > 0 ? `₹${badDebtAmount.toLocaleString("en-IN")} Loss` : "Forfeit Deposit"})`
                : netDifference >= 0
                ? "Complete Check-Out & Release Bed"
                : `Collect ₹${netDeficitToCollect.toLocaleString("en-IN")} & Complete Check-Out`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
