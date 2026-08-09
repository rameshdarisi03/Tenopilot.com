"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Occupant, occupantStore } from "@/constants/mockOccupants";
import { getGuestStayTimeline, getOccupantStatusBadge, calculateOccupantFinancialStatement } from "@/utils/domainSSOT";
import {
  ChevronLeft,
  Edit,
  CreditCard,
  ArrowRightLeft,
  Calendar,
  Phone,
  Mail,
  Building2,
  Download,
  CheckCircle2,
  Clock,
  X,
  User,
  ShieldCheck,
  UserPlus,
  LogOut,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Eye,
  Camera,
  Lock,
  FileText,
} from "lucide-react";
import { propertySettingsStore } from "@/constants/propertySettings";
import { UnifiedPhotoUploadSlot } from "@/components/dashboard/UnifiedPhotoUploadSlot";

interface GuestProfileViewProps {
  occupantState: Occupant;
  propertyId: string;
  onEditProfile: () => void;
  onCollectPayment: () => void;
  onTransferRoom: () => void;
  onPromoteToTenant: () => void;
  onCheckOutGuest: () => void;
  onExtendGuestStay?: () => void;
}

export function GuestProfileView({
  occupantState,
  propertyId,
  onEditProfile,
  onCollectPayment,
  onTransferRoom,
  onPromoteToTenant,
  onCheckOutGuest,
  onExtendGuestStay,
}: GuestProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "kyc">("overview");
  const [viewKycModal, setViewKycModal] = useState<{
    open: boolean;
    title: string;
    docType: "photo" | "front" | "back" | "pdf" | "";
  }>({ open: false, title: "", docType: "" });
  const [showUploadKycModal, setShowUploadKycModal] = useState<boolean>(false);
  const [guestPhotoUrl, setGuestPhotoUrl] = useState<string>(occupantState.avatar || "");
  const [guestAadhaarNum, setGuestAadhaarNum] = useState<string>(
    occupantState.aadhaarNumber !== "Skipped" ? occupantState.aadhaarNumber || "" : ""
  );
  const [guestFrontUrl, setGuestFrontUrl] = useState<string>(occupantState.kycDocs?.aadhaarFrontUrl || "");
  const [guestBackUrl, setGuestBackUrl] = useState<string>(occupantState.kycDocs?.aadhaarBackUrl || "");

  const [propertySettings, setPropertySettings] = useState(() =>
    propertySettingsStore.getSettings(propertyId)
  );

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    propertySettingsStore.initFirebaseListener(propertyId);
    setPropertySettings(propertySettingsStore.getSettings(propertyId));
    const unsubscribe = propertySettingsStore.subscribe(() => {
      setPropertySettings(propertySettingsStore.getSettings(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  // Calculate stay duration & days remaining dynamically via SSOT Domain Engine
  const checkInDateStr = occupantState.joiningDate || occupantState.lastPaidDate || "02 Aug 2026";
  const checkOutDateStr = occupantState.vacatingDate || occupantState.dueDate || "09 Aug 2026";

  const timeline = getGuestStayTimeline(
    checkInDateStr,
    checkOutDateStr,
    occupantState.lifecycleStatus === "Booked"
  );
  const statusBadge = getOccupantStatusBadge(occupantState);

  if (!isMounted) return null;
  return (
    <div className="space-y-6">
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
        <div className="flex items-center gap-2">
          <Link
            href={`/p/${propertyId}/tenants`}
            className="hover:text-purple-700 flex items-center gap-1 font-bold text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" /> Tenants & Guests Directory
          </Link>
          <span>/</span>
          <span className="text-purple-900 font-bold">
            Guest Profile: {occupantState.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEditProfile}
            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 text-[#c2652a]" /> Edit Guest
          </button>
        </div>
      </div>

      {/* 👤 Guest Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={occupantState.kycDocs?.photoUrl || occupantState.avatar}
            alt={occupantState.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-200 shadow-xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-gray-900">
                {occupantState.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge.badgeClass}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Room {occupantState.roomNumber} ({occupantState.bedCode}) • {propertySettings.propertyName}
            </p>
          </div>
        </div>

        {/* 🚀 Quick Guest Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onExtendGuestStay && (
            <button
              onClick={onExtendGuestStay}
              className="px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50 text-purple-900 font-bold text-xs hover:bg-purple-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-purple-700" /> Extend Stay ⏳
            </button>
          )}

          <button
            onClick={onCollectPayment}
            className="px-4 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" /> Collect Payment 💰
          </button>

          <button
            onClick={onTransferRoom}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#c2652a]" /> Transfer Room
          </button>

          <button
            onClick={onPromoteToTenant}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> Promote to Tenant 🟢
          </button>

          <button
            onClick={onCheckOutGuest}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Check-Out & Vacate 🏁
          </button>
        </div>
      </div>

      {/* 🏨 VISUAL GUEST STAY TIMELINE BAR */}
      <div className="bg-gradient-to-r from-purple-50 via-purple-50/50 to-orange-50 rounded-2xl p-5 border border-purple-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-gray-900">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-200/60 rounded-lg text-purple-900">
              <Clock className="w-4 h-4" />
            </span>
            <span>Guest Stay Duration Timeline</span>
            <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-extrabold">
              {timeline.totalDays} Days Stay Package
            </span>
          </div>
          <div className="text-xs font-extrabold text-purple-950 flex items-center gap-1.5">
            {timeline.isBooked ? (
              <span>🟦 BOOKED GUEST — {timeline.statusText}</span>
            ) : timeline.daysRemaining > 0 ? (
              <span>⏳ {timeline.statusText}</span>
            ) : (
              <span className="text-red-700">⚠️ Checkout Date Reached Today!</span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-gray-200/80 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-xs ${
                timeline.isBooked
                  ? "bg-blue-400"
                  : "bg-gradient-to-r from-purple-600 to-[#c2652a]"
              }`}
              style={{ width: `${timeline.progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-gray-500 font-bold">
            <span>
              {timeline.isBooked
                ? `Check-In Date: ${checkInDateStr} (Check-in pending)`
                : `Check-In: ${checkInDateStr} (${timeline.daysElapsed} days elapsed)`}
            </span>
            <span>Checkout: {checkOutDateStr}</span>
          </div>
        </div>
      </div>

      {/* 📊 4 TAILORED GUEST METRIC CARDS */}
      {(() => {
        const stmt = calculateOccupantFinancialStatement(occupantState);
        const guestHistory = occupantState.paymentHistory || [];

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric Card 1: Total Stay Tariff Paid */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">
                TOTAL PAYMENTS COLLECTED
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif font-bold text-2xl text-gray-900">
                  ₹{stmt.totalPaid.toLocaleString("en-IN")}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  stmt.isFullyPaid
                    ? "bg-emerald-100 text-emerald-800"
                    : stmt.isPartialPaid
                    ? "bg-orange-100 text-orange-800 border border-orange-200"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {stmt.isFullyPaid ? "PAID 🟢" : stmt.isPartialPaid ? "PARTIAL 🟧" : "UNPAID ⚪"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">{guestHistory.length} Payment{guestHistory.length === 1 ? "" : "s"} Recorded</p>
            </div>

            {/* Metric Card 2: Outstanding Balance */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">
                OUTSTANDING BALANCE
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif font-bold text-2xl text-gray-900">
                  ₹{stmt.netOutstandingBalance.toLocaleString("en-IN")}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  stmt.isFullyPaid
                    ? "bg-emerald-100 text-emerald-800"
                    : stmt.isPartialPaid
                    ? "bg-orange-100 text-orange-800 border border-orange-200"
                    : "bg-red-100 text-red-800"
                }`}>
                  {stmt.isFullyPaid ? "ALL CLEAR 🟢" : stmt.isPartialPaid ? "PARTIAL DUE 🟧" : "DUE NOW 🔴"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                {stmt.isFullyPaid ? "Everything Paid for Stay" : `₹${stmt.netOutstandingBalance.toLocaleString("en-IN")} Remaining to Collect`}
              </p>
            </div>

            {/* Metric Card 3: Security Deposit */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">
                SECURITY DEPOSIT
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif font-bold text-2xl text-gray-900">
                  ₹{stmt.securityDepositRequired.toLocaleString("en-IN")}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  stmt.isDepositCleared ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {stmt.isDepositCleared ? "REFUNDABLE 🟢" : "PENDING 🔴"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                {stmt.isDepositCleared ? "Refunded upon guest checkout" : "Deposit pending collection"}
              </p>
            </div>

            {/* Metric Card 4: Checkout Date */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">
                CHECKOUT DATE
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif font-bold text-xl text-[#c2652a]">
                  {checkOutDateStr}
                </span>
                <span className="text-[10px] bg-orange-100 text-orange-800 font-extrabold px-2 py-0.5 rounded-full">
                  {timeline.daysRemaining} DAYS
                </span>
              </div>
              <p className="text-[10px] text-gray-400">End of Short Stay Period</p>
            </div>
          </div>
        );
      })()}

      {/* 📋 GUEST DETAILS & BILLING GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Guest & Room Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#c2652a]" /> Occupancy & Room Details
            </h3>

            <div className="space-y-3 divide-y divide-gray-100">
              <div className="flex justify-between pt-1">
                <span className="text-gray-400">Property</span>
                <span className="font-bold text-gray-900">Sunshine Heights PG</span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-gray-400">Room & Bed</span>
                <span className="font-bold text-[#c2652a] bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                  Room {occupantState.roomNumber} ({occupantState.bedCode})
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-gray-400">Stay Tariff Rate</span>
                <span className="font-bold text-gray-900">
                  ₹{occupantState.rentAmount.toLocaleString("en-IN")} (₹500 / day)
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-gray-400">Check-In Date</span>
                <span className="font-bold text-gray-900">{checkInDateStr}</span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-gray-400">Expected Checkout</span>
                <span className="font-bold text-gray-900">{checkOutDateStr}</span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-gray-400">Phone</span>
                <span className="font-bold text-gray-900">{occupantState.phone}</span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-gray-400">Email</span>
                <span className="font-bold text-gray-900">{occupantState.email}</span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-gray-400">Purpose of Visit</span>
                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {occupantState.workplace || "Exam / Corporate Visit"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Guest KYC & Stay Package Statements */}
        <div className="lg:col-span-2 space-y-6">
          {/* 🪪 Real-Time KYC Verification & Identity Card for Guests */}
          {(() => {
            const isKycVerified = occupantState.kycVerified === true;
            const hasPhoto = Boolean(occupantState.kycDocs?.photoUrl || (occupantState.avatar && !occupantState.avatar.includes("dicebear")));
            const hasAadhaar = Boolean(
              occupantState.aadhaarNumber &&
              occupantState.aadhaarNumber !== "Skipped" &&
              occupantState.aadhaarNumber !== "XXXX-XXXX-8811"
            );

            return (
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div>
                    <h3 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                      <ShieldCheck className={`w-4.5 h-4.5 ${isKycVerified ? "text-blue-600" : "text-amber-600"}`} /> Identity & KYC Verification
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium">
                      🔒 Real-time Verification Checklist
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    isKycVerified
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : (hasPhoto || hasAadhaar)
                      ? "bg-orange-100 text-orange-800 border-orange-300"
                      : "bg-amber-100 text-amber-800 border-amber-300"
                  }`}>
                    {isKycVerified ? "VERIFIED 🟢" : (hasPhoto || hasAadhaar) ? "PARTIAL / PENDING 🟧" : "SKIPPED / PENDING 🔴"}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Itemized Checklist Container */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    {/* Row 1: Profile Photo Headshot */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-900 font-bold flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-purple-700" /> Guest Profile Photo
                        </span>
                        <p className="text-[10px] text-gray-500">
                          {hasPhoto ? "Uploaded & Locked in Database 🟢" : "Pending Upload 🔴"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${hasPhoto ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                          {hasPhoto ? "COMPLETED ✅" : "PENDING 🔴"}
                        </span>
                        {hasPhoto && (
                          <button
                            type="button"
                            onClick={() =>
                              setViewKycModal({
                                open: true,
                                title: "Guest Profile Headshot",
                                docType: "photo",
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Eye className="w-3 h-3 text-purple-700" /> View Photo
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Govt ID / Aadhaar Proof */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                      <div>
                        <span className="text-gray-900 font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Govt ID / Aadhaar Proof
                        </span>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {hasAadhaar ? occupantState.aadhaarNumber : "Skipped at Onboarding"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${hasAadhaar ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {hasAadhaar ? "COMPLETED ✅" : "SKIPPED / PENDING 🔴"}
                        </span>
                        {hasAadhaar && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setViewKycModal({
                                  open: true,
                                  title: "Govt ID — Front Photo",
                                  docType: "front",
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Eye className="w-3 h-3 text-blue-600" /> Front ID
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setViewKycModal({
                                  open: true,
                                  title: "Govt ID — Back Photo",
                                  docType: "back",
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Eye className="w-3 h-3 text-blue-600" /> Back ID
                            </button>
                          </div>
                        )}
                      </div>
                  {/* Upload & Complete KYC Call-To-Action Button */}
                  {(!isKycVerified || !hasAadhaar || !hasPhoto) && (
                    <button
                      type="button"
                      onClick={() => setShowUploadKycModal(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Camera className="w-4 h-4 text-purple-200" /> 🛡️ Upload & Complete KYC Documents
                    </button>
                  )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        </div>


          {(() => {
            const stmt = calculateOccupantFinancialStatement(occupantState);
            const guestHistory = occupantState.paymentHistory || [];

            return (
              <>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-base text-gray-900">
                      Guest Billing & Stay Payment Log
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold">{guestHistory.length} Record{guestHistory.length === 1 ? "" : "s"}</span>
                  </div>

                  {guestHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-400 uppercase font-bold text-[10px]">
                            <th className="pb-3">Stay Description</th>
                            <th className="pb-3">Payment Date</th>
                            <th className="pb-3">Amount</th>
                            <th className="pb-3">Mode</th>
                            <th className="pb-3">Receipt</th>
                            <th className="pb-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-800 font-semibold">
                          {guestHistory.map((item) => (
                            <tr key={item.id}>
                              <td className="py-3.5">{item.month || "Guest Stay Package"}</td>
                              <td className="py-3.5">{item.date}</td>
                              <td className="py-3.5 font-bold font-mono">
                                ₹{item.amount.toLocaleString("en-IN")}
                              </td>
                              <td className="py-3.5">{item.mode}</td>
                              <td className="py-3.5 font-mono text-[11px] text-gray-500">{item.receiptNo}</td>
                              <td className="py-3.5 text-right">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                  PAID 🟢
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50/70 rounded-xl border border-dashed border-gray-200 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <p className="font-serif font-bold text-gray-800 text-sm">No Payment Receipts Recorded Yet</p>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        This guest stay hasn't logged payment yet. Click <strong className="text-purple-900">"Collect Payment"</strong> above to log tariff & key deposit.
                      </p>
                    </div>
                  )}
                </div>

                {/* Guest Financial Summary Box */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-serif font-bold text-base text-gray-900">
                        Guest Stay Billing Summary
                      </h3>
                      <p className="text-[10px] text-gray-400">Short-term stay package account statement</p>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                      stmt.isFullyPaid
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : stmt.isPartialPaid
                        ? "bg-orange-100 text-orange-800 border-orange-200"
                        : "bg-red-100 text-red-800 border-red-200"
                    }`}>
                      {stmt.isFullyPaid ? "ALL CLEAR 🟢" : stmt.isPartialPaid ? "PARTIAL DUE 🟧" : "PAYMENT PENDING 🔴"}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-gray-700 font-medium">
                    <div className="flex justify-between">
                      <span>Stay Package Tariff</span>
                      <span className="font-mono font-bold text-gray-900">
                        ₹{stmt.proRataRent.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Security Deposit</span>
                      <span className="font-mono font-bold text-purple-700">₹{stmt.securityDepositRequired.toLocaleString("en-IN")} (Refundable)</span>
                    </div>

                    <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900">
                      <span>Total Stay Gross Package</span>
                      <span className="font-mono text-gray-900">
                        ₹{stmt.totalGrossDue.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Total Payments Collected</span>
                      <span className="font-mono">
                        ₹{stmt.totalPaid.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-gray-100 font-bold text-gray-900 text-sm">
                      <span>Net Outstanding Due</span>
                      <span className={`font-mono ${stmt.isFullyPaid ? "text-emerald-700" : "text-red-600"}`}>
                        ₹{stmt.netOutstandingBalance.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {/* 🔒 SECURE VIEW-ONLY KYC DOCUMENT MODAL (NO LOCAL DOWNLOAD FOR PG OWNERS) */}
          {viewKycModal.open && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 select-none">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-gray-900">
                        {viewKycModal.title}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-semibold">
                        GUEST / TENANT: {occupantState.name} ({occupantState.id})
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewKycModal({ open: false, title: "", docType: "" })}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Security Privacy Protection Banner */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>🔒 Secure View-Only Mode:</strong> Direct file downloading is disabled per SaaS privacy regulations to prevent local disk misuse of identity PII.
                  </span>
                </div>

                {/* Document Image Viewer Container */}
                <div
                  onContextMenu={(e) => e.preventDefault()}
                  className="bg-gray-900 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden border border-gray-800"
                >
                  {viewKycModal.docType === "photo" ? (
                    <img
                      src={occupantState.kycDocs?.photoUrl || occupantState.avatar}
                      alt={occupantState.name}
                      className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain border-2 border-white/20 shadow-lg pointer-events-none select-none"
                    />
                  ) : viewKycModal.docType === "front" ? (
                    <img
                      src={
                        occupantState.kycDocs?.aadhaarFrontUrl ||
                        occupantState.kycDocs?.photoUrl ||
                        occupantState.avatar
                      }
                      alt="Govt ID Front"
                      className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain border-2 border-white/20 shadow-lg pointer-events-none select-none"
                    />
                  ) : viewKycModal.docType === "back" ? (
                    <img
                      src={
                        occupantState.kycDocs?.aadhaarBackUrl ||
                        occupantState.kycDocs?.photoUrl ||
                        occupantState.avatar
                      }
                      alt="Govt ID Back"
                      className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain border-2 border-white/20 shadow-lg pointer-events-none select-none"
                    />
                  ) : (
                    /* PDF Document View */
                    <div className="w-full bg-white/95 rounded-xl p-6 text-center space-y-3 pointer-events-none select-none text-gray-900 font-mono text-xs">
                      <FileText className="w-14 h-14 text-blue-600 mx-auto" />
                      <div className="font-bold text-sm text-gray-900">
                        {occupantState.name} — GOVT ID PROOF (PDF)
                      </div>
                      <div className="text-[11px] text-gray-500 font-sans">
                        DOCUMENT NUMBER: {occupantState.aadhaarNumber || "XXXX-XXXX-4819"}
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] p-2 rounded-lg font-sans font-bold">
                        ✓ ENCRYPTED & VERIFIED IN FIREBASE CLOUD STORAGE BUCKET
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setViewKycModal({ open: false, title: "", docType: "" })}
                    className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs cursor-pointer"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🛡️ Upload & Complete KYC Modal for Guests */}
          {showUploadKycModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-purple-700" /> Complete Guest KYC Verification
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium">
                      Upload live camera headshot & Aadhaar ID for {occupantState.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUploadKycModal(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    occupantState.kycVerified = true;
                    occupantState.aadhaarNumber = guestAadhaarNum || "XXXX-XXXX-8811";
                    if (!occupantState.kycDocs) occupantState.kycDocs = {};
                    if (guestPhotoUrl) occupantState.kycDocs.photoUrl = guestPhotoUrl;
                    if (guestFrontUrl) occupantState.kycDocs.aadhaarFrontUrl = guestFrontUrl;
                    if (guestBackUrl) occupantState.kycDocs.aadhaarBackUrl = guestBackUrl;
                    if (guestPhotoUrl) occupantState.avatar = guestPhotoUrl;

                    occupantStore.updateOccupant(occupantState, propertyId);
                    setShowUploadKycModal(false);
                    alert(`🎉 Guest KYC Verification Completed & Saved for ${occupantState.name}!`);
                  }}
                  className="space-y-4"
                >
                  {/* 1. Profile Photo Headshot */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <label className="block font-bold text-gray-800 text-xs">
                      📷 1. Guest Profile Photo Headshot
                    </label>
                    <UnifiedPhotoUploadSlot
                      label="Guest Profile Photo"
                      aspectRatio="headshot"
                      value={guestPhotoUrl}
                      onChange={(base64) => setGuestPhotoUrl(base64)}
                      onRemove={() => setGuestPhotoUrl("")}
                    />
                  </div>

                  {/* 2. Aadhaar / Govt ID Input & Photos */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <label className="block font-bold text-gray-800 text-xs">
                      🪪 2. Aadhaar / Govt ID Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestAadhaarNum}
                      onChange={(e) => setGuestAadhaarNum(e.target.value)}
                      placeholder="e.g. 9812-4412-8811 or Govt ID Number"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono text-xs font-bold text-gray-900 focus:ring-1 focus:ring-purple-600"
                    />

                    <div className="space-y-3 pt-1">
                      <div className="space-y-1 text-left">
                        <label className="block font-bold text-gray-900 text-xs">
                          💳 ID Card Front Photo
                        </label>
                        <UnifiedPhotoUploadSlot
                          label="ID Card Front Photo"
                          aspectRatio="idcard"
                          value={guestFrontUrl}
                          onChange={(base64) => setGuestFrontUrl(base64)}
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="block font-bold text-gray-900 text-xs">
                          💳 ID Card Back Photo
                        </label>
                        <UnifiedPhotoUploadSlot
                          label="ID Card Back Photo"
                          aspectRatio="idcard"
                          value={guestBackUrl}
                          onChange={(base64) => setGuestBackUrl(base64)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowUploadKycModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-md cursor-pointer"
                    >
                      🚀 Complete & Save Guest KYC
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
