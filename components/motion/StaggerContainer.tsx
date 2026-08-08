"use client";

import React from "react";

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelayMs?: number;
}

/**
 * StaggerContainer & StaggerItem - 60fps Staggered Entry Cascades
 * Provides soft waterfall entrance timing for tables, card grids, and list items
 */
export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
};

export const StaggerItem: React.FC<{ children: React.ReactNode; index: number; className?: string }> = ({
  children,
  index,
  className = "",
}) => {
  const delay = Math.min(index * 20, 400); // Max 400ms delay cap

  return (
    <div
      className={`transition-all duration-300 transform opacity-100 ${className}`}
      style={{
        animation: `staggerFadeUp 350ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`,
      }}
    >
      {children}
    </div>
  );
};
