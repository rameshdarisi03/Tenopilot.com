"use client";

import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { CollectionsViewMode } from "@/hooks/useCollectionsViewMode";

interface CollectionsCardSwitcherProps {
  mode: CollectionsViewMode;
  onToggle?: () => void;
  onSelect?: (mode: CollectionsViewMode) => void;
  rentAmount?: number;
  grossAmount?: number;
  className?: string;
}

/**
 * 1-Tap Slide Switcher for Collections Metric Cards.
 * Features a highlighted right-pointing arrow towards the next card.
 * Clicking instantly slides and toggles between Rent Collections and Gross Collections with zero dropdown clutter.
 */
export function CollectionsCardSwitcher({
  mode,
  onToggle,
  onSelect,
  className = "",
}: CollectionsCardSwitcherProps) {
  const isRent = mode === "RENT";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggle) {
      onToggle();
    } else if (onSelect) {
      onSelect(isRent ? "GROSS" : "RENT");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isRent ? "Click to slide to Gross Collections (Rent + Deposits)" : "Click to slide to Rent Collections"}
      className={`group relative flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-2xs cursor-pointer border active:scale-95 shrink-0 select-none ${
        isRent
          ? "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-300 ring-2 ring-purple-400/20"
          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300 ring-2 ring-emerald-400/20"
      } ${className}`}
    >
      <span className="flex items-center gap-1">
        <Sparkles className={`w-3 h-3 shrink-0 ${isRent ? "text-purple-600" : "text-emerald-600"}`} />
        <span className="tracking-wide uppercase font-extrabold text-[10px]">
          <span className="hidden sm:inline">Switch to </span>
          {isRent ? "Gross" : "Rent"}
        </span>
      </span>

      {/* Prominent Right-Pointing Arrow directed towards the next card */}
      <ArrowRight
        className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 shrink-0 ${
          isRent ? "text-purple-600" : "text-emerald-600"
        }`}
      />
    </button>
  );
}
