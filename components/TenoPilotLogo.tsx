"use client";

import React from "react";
import Image from "next/image";

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
    sm: "w-8 h-8 rounded-xl",
    md: "w-10 h-10 rounded-xl",
    lg: "w-14 h-14 rounded-2xl",
    xl: "w-20 h-20 rounded-2xl",
  };

  const wordmarkSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-4xl",
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 🟧 OFFICIAL TERRACOTTA BADGE (WINGED 'T' + 4-POINT COMPASS STAR) */}
      <div className={`relative ${iconSizeClasses[size]} shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
        <Image
          src="/tenopilot_official_badge.png"
          alt="TenoPilot Logo Icon"
          width={80}
          height={80}
          className="w-full h-full object-contain rounded-xl drop-shadow-sm"
          priority
        />
      </div>

      {/* 🪶 OFFICIAL SERIF WORDMARK "TenoPilot.com" */}
      {showWordmark && (
        <div className="flex flex-col justify-center">
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
