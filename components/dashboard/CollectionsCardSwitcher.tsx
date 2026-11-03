"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { CollectionsViewMode } from "@/hooks/useCollectionsViewMode";

interface CollectionsCardSwitcherProps {
  mode: CollectionsViewMode;
  onToggle?: () => void;
  onSelect?: (mode: CollectionsViewMode) => void;
  className?: string;
}

/**
 * 1-Tap Highlighted Arrow Switcher for Collections Metric Cards.
 * Features a highlighted right-pointing arrow towards the next card with zero text clutter.
 * Clicking instantly slides and toggles between Rent Collections and Gross Collections.
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
      title={isRent ? "Switch to Gross Collections (Rent + Deposits)" : "Switch to Rent Collections"}
      className={`group relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full sm:rounded-xl transition-all shadow-2xs cursor-pointer border active:scale-90 shrink-0 select-none ${
        isRent
          ? "bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300 ring-2 ring-purple-400/30"
          : "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-300 ring-2 ring-emerald-400/30"
      } ${className}`}
    >
      <ArrowRight
        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0 ${
          isRent ? "text-purple-700" : "text-emerald-700"
        }`}
      />
    </button>
  );
}
