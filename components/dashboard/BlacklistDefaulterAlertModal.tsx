"use client";

import React from "react";
import { AlertTriangle, ShieldAlert, X, ArrowRight, Ban, CheckCircle } from "lucide-react";
import { DefaulterRecord } from "@/utils/phoneLookup";

interface BlacklistDefaulterAlertModalProps {
  isOpen: boolean;
  defaulter: DefaulterRecord | null;
  onCancel: () => void;
  onProceedAnyway: () => void;
}

export function BlacklistDefaulterAlertModal({
  isOpen,
  defaulter,
  onCancel,
  onProceedAnyway,
}: BlacklistDefaulterAlertModalProps) {
  if (!isOpen || !defaulter) return null;

  const isAbsconded = defaulter.exitDisposition === "ABSCONDED";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 text-white shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                Security & Fraud Shield
              </span>
              <h3 className="text-lg font-black tracking-tight leading-snug">
                🚨 Blacklist & Defaulter Alert
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-red-900">
              <span>Incident Category:</span>
              <span className="px-2 py-0.5 rounded-md bg-red-200/80 text-red-950 font-black uppercase text-[10px]">
                {isAbsconded ? "🚨 Absconded / Escaped" : "⚠️ Disputed Rent Refusal"}
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs text-gray-800">
              <div className="flex justify-between">
                <span className="text-gray-500">Resident Name:</span>
                <span className="font-bold text-gray-950">{defaulter.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone Number:</span>
                <span className="font-mono font-bold text-gray-900">{defaulter.phone}</span>
              </div>
              {defaulter.aadhaarNumber && defaulter.aadhaarNumber !== "Skipped" && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Aadhaar / ID:</span>
                  <span className="font-mono font-bold text-gray-900">{defaulter.aadhaarNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Previous Stay:</span>
                <span className="font-medium text-gray-900">
                  {defaulter.stayType} • Room {defaulter.roomNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Incident Date:</span>
                <span className="font-medium text-gray-900">{defaulter.incidentDate}</span>
              </div>
            </div>
          </div>

          {/* Bad Debt Financial Impact */}
          {defaulter.badDebtAmount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Unrecovered Bad Debt / Loss
                </p>
                <p className="text-xl font-black font-sans text-amber-950">
                  ₹{defaulter.badDebtAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-200/60 px-2.5 py-1 rounded-xl">
                Unpaid Arrears
              </span>
            </div>
          )}

          {defaulter.notes && (
            <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
              &quot;{defaulter.notes}&quot;
            </p>
          )}

          <p className="text-[11px] text-gray-500 leading-relaxed text-center">
            This individual has an active blacklist record in the property registry. We advise clearing previous dues before allocating a bed.
          </p>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Ban className="w-4 h-4" />
              <span>Cancel & Reject Onboarding</span>
            </button>

            <button
              type="button"
              onClick={onProceedAnyway}
              className="w-full py-2.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Proceed Anyway (Owner Override)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
