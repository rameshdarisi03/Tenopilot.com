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
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  const wordmarkSizeClasses = {
    sm: "text-xl",
    md: "text-2xl md:text-3xl",
    lg: "text-3xl md:text-4xl",
    xl: "text-5xl md:text-6xl",
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 🟧 OFFICIAL TERRACOTTA BADGE (WINGED 'T' + 4-POINT COMPASS STAR) — NO BOX SHADOW OR BACKGROUND FRAMES */}
      <div className={`relative ${iconSizeClasses[size]} shrink-0 transition-transform group-hover:scale-105`}>
        <Image
          src="/tenopilot_official_badge.png"
          alt="TenoPilot Logo Icon"
          width={80}
          height={80}
          className="w-full h-full object-contain rounded-2xl"
          priority
        />
      </div>

      {/* 🪶 OFFICIAL SERIF WORDMARK "TenoPilot.com" — NO TAGLINE BELOW */}
      {showWordmark && (
        <div className="flex items-center">
          <span
            className={`font-serif font-extrabold tracking-tight leading-none ${wordmarkSizeClasses[size]} ${
              variant === "light" ? "text-white" : "text-[#0b132b]"
            }`}
          >
            TenoPilot<span className={variant === "light" ? "text-amber-300" : "text-[#c85b2b]"}>.com</span>
          </span>
        </div>
      )}
    </div>
  );
};
