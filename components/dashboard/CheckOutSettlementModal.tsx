"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Occupant, occupantStore } from "@/constants/mockOccupants";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { expenseStore } from "@/constants/expenseStore";
import { complianceLogStore } from "@/constants/complianceLogStore";

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
  onSuccess?: () => void;
}) {
  // Step 1: Handover Checklist State
  const [keysReturned, setKeysReturned] = useState(true);
  const [drawerKeysReturned, setDrawerKeysReturned] = useState(true);
  const [acRemoteReturned, setAcRemoteReturned] = useState(true);
  const [roomInspected, setRoomInspected] = useState(true);

  // Step 2: Financial Settlement Calculator State
  const initialDeposit = occupant.securityDeposit !== undefined ? occupant.securityDeposit : (occupant.rentAmount ? occupant.rentAmount * 2 : 0);
  const [unpaidRentDues, setUnpaidRentDues] = useState<number>(0);
  const [repairDeductions, setRepairDeductions] = useState<number>(0);
  const [maintenanceExpenses, setMaintenanceExpenses] = useState<number>(0); // Cleaning, painting fees

  // Calculated Net Refundable Deposit
  const totalDeductions = unpaidRentDues + repairDeductions + maintenanceExpenses;
  const netRefundableAmount = Math.max(0, initialDeposit - totalDeductions);

  // Step 3: Refund Payment Channel State
  const [paymentChannel, setPaymentChannel] = useState<"Online payments (UPI)" | "Cash Desk">("Online payments (UPI)");
  const [settlementNotes, setSettlementNotes] = useState("");
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

      // 1. Update Occupant Status to "Past" (Reusing standard Past Alumni Tenant category)
      const updatedOccupant: Occupant = {
        ...occupant,
        lifecycleStatus: "Past",
        vacatingDate: todayStr,
        paymentHistory: [
          ...(occupant.paymentHistory || []),
          {
            id: `pay-ref-${Date.now()}`,
            amount: netRefundableAmount,
            date: todayStr,
            month: todayStr,
            mode: paymentChannel,
            receiptNo: `REF-${Date.now().toString().slice(-6)}`,
            status: "PAID" as const,
          },
        ],
      };

      // Update occupantStore SSOT
      occupantStore.updateOccupant(updatedOccupant, propertyId);

      // 2. Reset Bed Status to "Available" (Reusing standard Available category)
      propertyStore.freeUpBedSlot(propertyId, roomNumber, bedCode);

      // 3. Log Financial Outflow in expenseStore (Operational Ledger)
      if (netRefundableAmount > 0) {
        expenseStore.addExpense(propertyId, {
          category: "Deposit Refund",
          amount: netRefundableAmount,
          paidFrom: paymentChannel,
          property: "Sunshine Luxury PG",
          date: todayStr,
          hasReceipt: false,
        });
      }

      // 4. 🔒 Write Permanent Immutable Record to Master Police & Legal Register
      complianceLogStore.addLog(propertyId, {
        propertyId,
        occupantId: occupant.id,
        name: occupant.name,
        phone: occupant.phone,
        emergencyPhone: occupant.emergencyContact?.phone || "—",
        emergencyRelation: occupant.emergencyContact?.relation || "Family",
        address: occupant.address || "Bengaluru, Karnataka",
        aadhaarNumber: occupant.aadhaarNumber || "Skipped",
        photoUrl: occupant.kycDocs?.photoUrl || occupant.avatar,
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
        penaltyPaid: totalDeductions,
        kycVerified: Boolean(occupant.kycVerified),
      });

      setIsSubmitting(false);
      onSuccess?.();
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
              🔑 FORMAL TENANT CHECK-OUT & SETTLEMENT
            </span>
            <h2 className="font-serif font-bold text-xl text-gray-900 mt-2">
              Check-Out: {occupant.name}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Room {roomNumber} ({bedCode}) • Promised Vacating Date: {occupant.vacatingDate || "06 Aug 2026"}
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

        {/* SECTION 1: Physical Assets Handover Checklist */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <Key className="w-4 h-4 text-[#c2652a]" /> Physical Key & Asset Handover Checklist
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
            <span className="text-[10px] font-mono font-bold text-gray-500">
              Initial Deposit Paid: ₹{initialDeposit.toLocaleString("en-IN")}
            </span>
          </div>

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
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Net Refundable Amount to Tenant
              </span>
              <span className="text-xl font-serif font-bold text-emerald-950">
                ₹{netRefundableAmount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-right text-[10px] text-emerald-800 font-medium">
              Deductions Subtotal: ₹{totalDeductions.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* SECTION 3: Refund Payment Channel & Notes */}
        <div className="space-y-3">
          <label className="block font-bold text-gray-900 text-xs">
            Refund Payment Mode (Channel) *
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
        </div>

        {/* SECTION 4: Final Execution Action */}
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
            disabled={isSubmitting || !keysReturned}
            onClick={handleExecuteCheckout}
            className="flex-1 py-3.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> Complete Check-Out & Release Bed
          </button>
        </div>
      </div>
    </div>
  );
}
