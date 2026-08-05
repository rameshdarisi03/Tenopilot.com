"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Occupant } from "@/constants/mockOccupants";
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
} from "lucide-react";

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
    docType: "front" | "back";
  } | null>(null);

  // Calculate stay duration & days remaining
  const checkInDateStr = occupantState.joiningDate || occupantState.lastPaidDate || "02 Aug 2026";
  const checkOutDateStr = occupantState.vacatingDate || occupantState.dueDate || "09 Aug 2026";

  const totalStayDays = 7;
  const daysElapsed = 3;
  const daysRemaining = Math.max(0, totalStayDays - daysElapsed);
  const progressPercent = Math.min(100, Math.round((daysElapsed / totalStayDays) * 100));

  return (
    <div className="space-y-6">
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
        <div className="flex items-center gap-2">
          <Link
            href={`/p/${propertyId}/tenants`}
            className="flex items-center gap-1 text-gray-600 hover:text-[#c2652a] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> TENANTS & GUESTS
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-bold uppercase">
            {occupantState.name} (GUEST PROFILE)
          </span>
        </div>
      </div>

      {/* 👤 Guest Profile Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <img
            src={occupantState.avatar}
            alt={occupantState.name}
            className="w-16 h-16 rounded-2xl bg-purple-50 p-1 border border-purple-200 object-cover shadow-2xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-gray-900">
                {occupantState.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                🟣 GUEST
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Room {occupantState.roomNumber} ({occupantState.bedCode}) • Sunshine Heights PG
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
              {totalStayDays} Days Stay Package
            </span>
          </div>

          <div className="text-purple-950 font-extrabold text-xs">
            {daysRemaining > 0 ? (
              <span>⏳ {daysRemaining} Days Remaining Until Checkout ({checkOutDateStr})</span>
            ) : (
              <span className="text-red-700">⚠️ Checkout Date Reached Today!</span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-gray-200/80 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-purple-600 to-[#c2652a] h-full rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-gray-500 font-bold">
            <span>Check-In: {checkInDateStr} ({daysElapsed} days elapsed)</span>
            <span>Checkout: {checkOutDateStr}</span>
          </div>
        </div>
      </div>

      {/* 📊 4 TAILORED GUEST METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Card 1: Total Stay Tariff Paid */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">
            TOTAL STAY TARIFF PAID
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-serif font-bold text-2xl text-gray-900">
              ₹{occupantState.rentAmount.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
              PAID 🟢
            </span>
          </div>
          <p className="text-[10px] text-gray-400">1 Payment Recorded</p>
        </div>

        {/* Metric Card 2: Outstanding Balance */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">
            OUTSTANDING BALANCE
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-serif font-bold text-2xl text-gray-900">₹0</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
              ALL CLEAR
            </span>
          </div>
          <p className="text-[10px] text-gray-400">Everything Paid for Stay</p>
        </div>

        {/* Metric Card 3: Key / Gate Pass Deposit */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">
            KEY / GATE PASS DEPOSIT
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-serif font-bold text-2xl text-gray-900">₹500</span>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full">
              REFUNDABLE
            </span>
          </div>
          <p className="text-[10px] text-gray-400">Refunded upon room key handover</p>
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
              {daysRemaining} DAYS
            </span>
          </div>
          <p className="text-[10px] text-gray-400">End of Short Stay Period</p>
        </div>
      </div>

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

          {/* 🪪 KYC Verification & Identity Card for Guests */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Identity & KYC Verification
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                VERIFIED 🟢
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Aadhaar / Govt ID</span>
                <span className="font-bold font-mono text-gray-900">
                  {occupantState.aadhaarNumber || "XXXX-XXXX-8821"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setViewKycModal({ open: true, title: "Aadhaar Card — Front Photo", docType: "front" })}
                  className="py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 font-bold hover:bg-gray-100 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" /> View Front ID
                </button>

                <button
                  type="button"
                  onClick={() => setViewKycModal({ open: true, title: "Aadhaar Card — Back Photo", docType: "back" })}
                  className="py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 font-bold hover:bg-gray-100 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" /> View Back ID
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 📷 KYC DOCUMENT LIGHTBOX MODAL */}
        {viewKycModal && viewKycModal.open && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> {viewKycModal.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setViewKycModal(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center space-y-3">
                <div className="w-full aspect-video bg-gradient-to-br from-blue-900 to-indigo-950 rounded-xl p-4 text-white flex flex-col justify-between shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200">
                      GOVERNMENT OF INDIA • AADHAAR
                    </span>
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-400/40">
                      VERIFIED 🟢
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{occupantState.name}</p>
                    <p className="font-mono text-xs text-blue-200">
                      {occupantState.aadhaarNumber || "XXXX-XXXX-8821"}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 font-semibold">
                  Encrypted Digital KYC Card Copy • TenoPilot Verification Engine
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewKycModal(null)}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold"
                >
                  Close Document
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Guest Billing & Stay Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-gray-900">
                Guest Billing & Stay Payment Log
              </h3>
              <span className="text-[10px] text-gray-400 font-bold">1 Record</span>
            </div>

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
                  <tr>
                    <td className="py-3.5">7-Day Guest Stay Package</td>
                    <td className="py-3.5">{checkInDateStr}</td>
                    <td className="py-3.5 font-bold font-mono">
                      ₹{occupantState.rentAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5">UPI (HDFC)</td>
                    <td className="py-3.5 font-mono text-[11px] text-gray-500">#REC-GST882</td>
                    <td className="py-3.5 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        PAID 🟢
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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

              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ALL CLEAR 🟢
              </span>
            </div>

            <div className="space-y-2.5 text-gray-700 font-medium">
              <div className="flex justify-between">
                <span>7-Day Stay Package Tariff</span>
                <span className="font-mono font-bold text-gray-900">
                  ₹{occupantState.rentAmount.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Key / Gate Pass Deposit</span>
                <span className="font-mono font-bold text-purple-700">₹500 (Refundable)</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-gray-100 font-bold text-gray-900 text-sm">
                <span>Total Amount Paid</span>
                <span className="font-mono text-emerald-700">
                  ₹{(occupantState.rentAmount + 500).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
