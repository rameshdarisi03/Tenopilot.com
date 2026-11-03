"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { CollectionsViewMode } from "@/hooks/useCollectionsViewMode";

interface CollectionsHelpPopoverProps {
  mode: CollectionsViewMode;
  className?: string;
}

/**
 * Clean, lightweight (?) Formula Help Popover for Collections Metric Cards.
 * Shows strictly the direct formula breakup without unnecessary clutter or headers.
 * Clicking anywhere else immediately dismisses the popover.
 */
export function CollectionsHelpPopover({
  mode,
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
        title={isRent ? "View Rent Collections formula" : "View Gross Collections formula"}
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

      {/* Floating Formula Breakdown Popover */}
      {isOpen && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute left-0 top-full mt-2 w-64 sm:w-72 rounded-2xl bg-white border border-gray-200 shadow-2xl p-3 z-50 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold leading-relaxed">
              {isRent ? (
                <span className="text-emerald-800 font-extrabold">
                  Monthly Rent + Arrears + Parking Charges
                </span>
              ) : (
                <span className="text-purple-800 font-extrabold">
                  Monthly Rent + Arrears + Parking Charges + Security Deposits + Move-out Deductions
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded-md hover:bg-gray-100 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
