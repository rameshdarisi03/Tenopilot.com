"use client";

import React from "react";

interface TenoPilotLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  variant?: "light" | "dark" | "terracotta";
  className?: string;
}

export const TenoPilotLogo: React.FC<TenoPilotLogoProps> = ({
  size = "md",
  showWordmark = true,
  variant = "terracotta",
  className = "",
}) => {
  const iconSizeClasses = {
    sm: "w-7 h-7 rounded-lg text-xs",
    md: "w-9 h-9 rounded-xl text-sm",
    lg: "w-12 h-12 rounded-2xl text-base",
    xl: "w-16 h-16 rounded-2xl text-xl",
  };

  const wordmarkSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-4xl",
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 🟧 OFFICIAL TERRACOTTA MONOGRAM SQUIRCLE BADGE */}
      <div
        className={`${iconSizeClasses[size]} bg-gradient-to-br from-[#d4602f] via-[#c85b2b] to-[#a8451f] text-white flex items-center justify-center shadow-sm relative border border-white/20 shrink-0`}
      >
        {/* ✦ Pure Vector SVG Monogram "T" + Compass Star */}
        <svg
          className="w-[68%] h-[68%] text-white drop-shadow-xs"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Top Serif Bar */}
          <path
            d="M 22 25 L 78 25 C 80 25 81 27 81 29 L 81 33 C 81 35 80 36 78 36 L 73 36 L 73 38 C 73 40 71 42 69 42 L 67 42 C 65 42 63 40 63 38 L 63 36 L 37 36 L 37 38 C 37 40 35 42 33 42 L 31 42 C 29 42 27 40 27 38 L 27 36 L 22 36 C 20 36 19 35 19 33 L 19 29 C 19 27 20 25 22 25 Z"
            fill="currentColor"
          />
          {/* Vertical Stem & Aerodynamic Wing Curve */}
          <path
            d="M 42 36 L 58 36 L 58 65 C 58 72 63 76 72 76 L 78 76 C 80 76 81 77 81 79 L 81 83 C 81 85 80 86 78 86 L 68 86 C 54 86 46 78 46 64 L 46 42 L 34 42 C 32 42 30 40 30 38 L 30 36 Z"
            fill="currentColor"
          />
          {/* ✦ Central 4-Point Compass Star Sparkle */}
          <path
            d="M 50 38 C 50 48 40 50 30 50 C 40 50 50 52 50 62 C 50 52 60 50 70 50 C 60 50 50 48 50 38 Z"
            fill="#ffffff"
          />
        </svg>
      </div>

      {/* 🪶 OFFICIAL SERIF WORDMARK "TenoPilot.com" */}
      {showWordmark && (
        <div className="flex flex-col">
          <span
            className={`font-serif font-bold tracking-tight ${wordmarkSizeClasses[size]} ${
              variant === "light" ? "text-white" : "text-[#0b132b]"
            }`}
          >
            TenoPilot<span className={variant === "light" ? "text-amber-300" : "text-[#c85b2b]"}>.com</span>
          </span>
          {size !== "sm" && (
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 block -mt-1">
              Property Management OS
            </span>
          )}
        </div>
      )}
    </div>
  );
};
