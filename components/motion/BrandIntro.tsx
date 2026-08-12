"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface BrandIntroProps {
  onComplete?: () => void;
}

/**
 * BrandIntro - YouTube Motion Graphics Award-Winning Logo Reveal & Shared-Element Handoff
 * 
 * Features:
 * 1. Uses the 100% exact official TenoPilot logo badge (Winged 'T' + 4-Point Compass Star) & wordmark
 * 2. Phase 1: Particle Spark Ignition & Radial Shockwave Ring
 * 3. Phase 2: Elastic Spring Badge Pop, Diagonal Light Glare Sweep & Kinetic Clip Unmask
 * 4. Phase 3: Seamless Header Handoff -> Glides directly into top-left dashboard sidebar
 */
export const BrandIntro: React.FC<BrandIntroProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<"ignite" | "reveal" | "handoff" | "done">("ignite");
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    // Check if intro has already played in this browser session
    try {
      const seen = sessionStorage.getItem("tenopilot_brand_intro_v3");
      if (seen === "true") {
        setRemoved(true);
        if (onComplete) onComplete();
        return;
      }
    } catch {}

    // High-Energy Motion Graphics Timeline
    const timer1 = setTimeout(() => setStage("reveal"), 750);   // Elastic Badge Pop & Glare Sweep
    const timer2 = setTimeout(() => setStage("handoff"), 1850); // Gliding Header Handoff
    const timer3 = setTimeout(() => handleFinish(), 2750);     // Unmount & complete

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const handleFinish = () => {
    try {
      sessionStorage.setItem("tenopilot_brand_intro_v3", "true");
    } catch {}
    setStage("done");
    setTimeout(() => {
      setRemoved(true);
      if (onComplete) onComplete();
    }, 400);
  };

  if (removed) return null;

  return (
    <div
      onClick={handleFinish}
      className={`fixed inset-0 z-[400] flex items-center justify-center select-none overflow-hidden cursor-pointer transition-opacity duration-500 ${
        stage === "done" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundColor: stage === "handoff" ? "transparent" : "#050811",
        transition: "background-color 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Dark Curtain Backdrop */}
      <div
        className={`absolute inset-0 bg-[#050811] transition-opacity duration-800 pointer-events-none ${
          stage === "handoff" ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Motion Graphics Pulse Shockwave Ring */}
      <div
        className={`absolute w-[500px] h-[500px] rounded-full border border-amber-500/20 pointer-events-none transition-all duration-1000 ${
          stage === "ignite"
            ? "scale-50 opacity-100"
            : stage === "reveal"
            ? "scale-125 opacity-30"
            : "scale-150 opacity-0"
        }`}
      />

      {/* Radial Warm Amber Ambient Glow */}
      <div
        className={`absolute w-[700px] h-[700px] rounded-full pointer-events-none transition-all duration-1000 ${
          stage === "handoff" ? "opacity-0 scale-50" : "opacity-50 scale-100"
        }`}
        style={{
          background: "radial-gradient(circle, rgba(200,91,43,0.4) 0%, rgba(5,8,17,0) 70%)",
        }}
      />

      {/* Skip Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleFinish();
        }}
        className={`absolute top-6 right-6 z-50 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/90 hover:text-white font-bold text-xs transition-all border border-white/20 active:scale-95 shadow-xl flex items-center gap-1.5 ${
          stage === "handoff" ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <span>⏩ Skip Intro</span>
      </button>

      {/* 🔥 THE SHARED LOGO LOCKUP CONTAINER */}
      <div
        className="relative z-20 flex items-center gap-5 transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform:
            stage === "handoff"
              ? "translate(calc(-50vw + 140px), calc(-50vh + 42px)) scale(0.48)"
              : "translate(0, 0) scale(1)",
        }}
      >
        {/* 🟧 1. OFFICIAL TERRACOTTA BADGE (WINGED 'T' + COMPASS STAR) */}
        <div
          className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-[28px] shadow-2xl flex items-center justify-center transition-all duration-700 ${
            stage === "ignite"
              ? "scale-0 opacity-0 rotate-12"
              : "scale-100 opacity-100 rotate-0 shadow-orange-950/80 ring-2 ring-amber-300/40"
          }`}
          style={{
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Official Badge Image Asset */}
          <Image
            src="/tenopilot_official_badge.png"
            alt="Official TenoPilot Badge"
            width={128}
            height={128}
            className="w-full h-full object-contain rounded-[28px] drop-shadow-2xl"
            priority
          />

          {/* Dynamic Light Glare Sheen Sweep */}
          <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none">
            <div
              className={`absolute -top-full -left-full w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/40 to-transparent transform rotate-45 transition-transform duration-900 ${
                stage === "reveal" ? "translate-x-full translate-y-full" : "-translate-x-full -translate-y-full"
              }`}
            />
          </div>

          {/* ✦ Central Sparkle Ignite Flash during ignite stage */}
          {stage === "ignite" && (
            <div className="absolute inset-0 flex items-center justify-center animate-ping">
              <span className="text-white text-4xl font-bold">✦</span>
            </div>
          )}
        </div>

        {/* 🪶 2. OFFICIAL SERIF WORDMARK "TenoPilot.com" */}
        <div className="flex flex-col">
          <div
            className={`overflow-hidden transition-all duration-800 ease-out ${
              stage === "ignite" ? "max-w-0 opacity-0" : "max-w-[420px] opacity-100"
            }`}
          >
            <h1 className="font-serif font-bold text-3xl sm:text-5xl text-white tracking-tight flex items-center drop-shadow-2xl whitespace-nowrap">
              <span>TenoPilot</span>
              <span className="text-amber-400 font-serif font-medium">.com</span>
            </h1>
          </div>

          {/* Subtitle Tagline */}
          <p
            className={`text-[10px] sm:text-xs font-sans tracking-[0.25em] uppercase font-extrabold text-amber-200/90 mt-1.5 transition-all duration-700 delay-200 whitespace-nowrap ${
              stage === "ignite" ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
            }`}
          >
            Single Source of Truth for Property Management
          </p>
        </div>
      </div>
    </div>
  );
};
