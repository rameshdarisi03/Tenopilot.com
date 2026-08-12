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
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-16 h-16",
    xl: "w-22 h-22",
  };

  const wordmarkSizeClasses = {
    sm: "text-xl font-extrabold",
    md: "text-2xl sm:text-3xl font-extrabold",
    lg: "text-3xl sm:text-4xl font-extrabold",
    xl: "text-5xl sm:text-6xl font-extrabold",
  };

  return (
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 select-none ${className}`}>
      {/* 🟧 OFFICIAL TERRACOTTA BADGE — OPTICALLY ALIGNED TO WORDMARK CAP-HEIGHT */}
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

      {/* 🪶 OFFICIAL SERIF WORDMARK "TenoPilot.com" */}
      {showWordmark && (
        <div className="flex items-center leading-none">
          <span
            className={`font-serif tracking-tight leading-none ${wordmarkSizeClasses[size]} ${
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
