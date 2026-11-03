"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, X, Check, ShieldCheck, Sparkles } from "lucide-react";
import { CollectionsViewMode } from "@/hooks/useCollectionsViewMode";

interface CollectionsHelpPopoverProps {
  mode: CollectionsViewMode;
  breakdown?: {
    rentAndParking?: number;
    deposits?: number;
    settlementDeductions?: number;
    deficitCollected?: number;
  };
  className?: string;
}

/**
 * Clean, interactive (?) Help Popover for Collections Metric Cards.
 * Appears at the beginning of "Rent Collections" or "Gross Collections".
 * Clicking opens a simple, crystal-clear formula breakdown explaining what the metric comprises.
 * Clicking anywhere else immediately dismisses the popover.
 */
export function CollectionsHelpPopover({
  mode,
  breakdown,
  className = "",
}: CollectionsHelpPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking or tapping outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const isRent = mode === "RENT";

  return (
    <div ref={popoverRef} className={`relative inline-flex items-center ${className}`}>
      {/* Help Icon Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        title={isRent ? "View Rent Collections formula & breakdown" : "View Gross Collections formula & breakdown"}
        className={`p-0.5 rounded-full transition-all cursor-pointer shrink-0 hover:scale-110 active:scale-95 ${
          isOpen
            ? "text-[#c2652a] bg-orange-100 ring-2 ring-orange-300"
            : isRent
            ? "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
            : "text-purple-600 hover:text-purple-800 hover:bg-purple-50"
        }`}
      >
        <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      {/* Floating Formula & Breakdown Popover */}
      {isOpen && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-gray-200 shadow-2xl p-4 z-50 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRent ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-purple-500 ring-4 ring-purple-100"
                }`}
              />
              <p className="text-xs font-bold text-gray-900">
                {isRent ? "Rent Collections Breakdown" : "Gross Collections Breakdown"}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Simple Formula Pill */}
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 mb-3 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block">
              Calculation Formula
            </span>
            <p className="text-xs font-bold text-gray-800 leading-snug">
              {isRent ? (
                <>Monthly Rent + Pro-rata + Arrears + Parking</>
              ) : (
                <>Rent + Security Deposits + Move-out Deductions</>
              )}
            </p>
          </div>

          {/* Itemized List */}
          <div className="space-y-1.5 text-xs text-gray-600 mb-3">
            {isRent ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Monthly & Pro-rata Rent</span>
                  </span>
                  <span className="font-semibold text-gray-800">Included</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Vehicle Parking Fees</span>
                  </span>
                  <span className="font-semibold text-gray-800">Included</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Prior Arrears Cleared</span>
                  </span>
                  <span className="font-semibold text-gray-800">Included</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Rent Settled on Check-Out</span>
                  </span>
                  <span className="font-semibold text-gray-800">Included</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Rent & Parking Collections</span>
                  </span>
                  <span className="font-semibold text-gray-800">
                    {breakdown?.rentAndParking !== undefined
                      ? `₹${breakdown.rentAndParking.toLocaleString("en-IN")}`
                      : "Included"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Security Deposits Collected</span>
                  </span>
                  <span className="font-semibold text-gray-800">
                    {breakdown?.deposits !== undefined
                      ? `₹${breakdown.deposits.toLocaleString("en-IN")}`
                      : "Included"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Maintenance & Repair Deductions</span>
                  </span>
                  <span className="font-semibold text-gray-800">
                    {breakdown?.settlementDeductions !== undefined
                      ? `₹${breakdown.settlementDeductions.toLocaleString("en-IN")}`
                      : "Included"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Departure Deficit Collected</span>
                  </span>
                  <span className="font-semibold text-gray-800">
                    {breakdown?.deficitCollected !== undefined
                      ? `₹${breakdown.deficitCollected.toLocaleString("en-IN")}`
                      : "Included"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Simple Accounting Note Footer */}
          <div className="pt-2 border-t border-gray-100 flex items-start gap-1.5 text-[11px] text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              {isRent
                ? "Strict operating revenue. Security deposits are excluded as refundable balance sheet liabilities."
                : "Total real cash inflows and realized income collected across all channels this month."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
