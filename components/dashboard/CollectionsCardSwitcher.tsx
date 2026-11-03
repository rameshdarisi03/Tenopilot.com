"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Coins, Layers } from "lucide-react";
import { CollectionsViewMode } from "@/hooks/useCollectionsViewMode";

interface CollectionsCardSwitcherProps {
  mode: CollectionsViewMode;
  onSelect: (mode: CollectionsViewMode) => void;
  rentAmount: number;
  grossAmount: number;
  className?: string;
}

export function CollectionsCardSwitcher({
  mode,
  onSelect,
  rentAmount,
  grossAmount,
  className = "",
}: CollectionsCardSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (newMode: CollectionsViewMode, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(newMode);
    setIsOpen(false);
  };

  const isRent = mode === "RENT";

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Interactive Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        title="Click to switch between Rent Collections and Gross Collections"
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-2xs cursor-pointer border active:scale-95 ${
          isRent
            ? "bg-orange-50 border-orange-200 text-[#c2652a] hover:bg-orange-100 hover:border-[#c2652a] ring-2 ring-orange-400/20"
            : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-400 ring-2 ring-purple-400/20"
        }`}
      >
        <span className="flex items-center gap-1">
          {isRent ? (
            <Coins className="w-3.5 h-3.5 text-[#c2652a] shrink-0" />
          ) : (
            <Layers className="w-3.5 h-3.5 text-purple-700 shrink-0" />
          )}
          <span className="tracking-wide uppercase font-extrabold text-[10px]">
            {isRent ? "Rent" : "Gross"}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          } ${isRent ? "text-[#c2652a]" : "text-purple-700"}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-0 top-full mt-1.5 w-60 sm:w-64 rounded-2xl bg-white border border-gray-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 border-b border-gray-100 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Select Collections View
            </span>
          </div>

          {/* Option 1: Rent Collections */}
          <button
            type="button"
            onClick={(e) => handleSelect("RENT", e)}
            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
              isRent
                ? "bg-orange-50/80 text-gray-900 border border-orange-200"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  isRent ? "bg-orange-100 text-[#c2652a]" : "bg-gray-100 text-gray-500"
                }`}
              >
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Rent Collections</p>
                <p className="text-[10px] text-gray-500">Rent, Pro-rata & Parking</p>
                <p className="text-xs font-black text-emerald-600 mt-0.5">
                  ₹{rentAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            {isRent && <Check className="w-4 h-4 text-[#c2652a] shrink-0" />}
          </button>

          {/* Option 2: Gross Collections */}
          <button
            type="button"
            onClick={(e) => handleSelect("GROSS", e)}
            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer mt-1 ${
              !isRent
                ? "bg-purple-50/80 text-gray-900 border border-purple-200"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  !isRent ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Gross Collections</p>
                <p className="text-[10px] text-gray-500">Rent + Deposits + Deductions</p>
                <p className="text-xs font-black text-purple-700 mt-0.5">
                  ₹{grossAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            {!isRent && <Check className="w-4 h-4 text-purple-700 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}
