"use client";

import React, { useEffect, useState } from "react";

interface BrandIntroProps {
  onComplete?: () => void;
}

/**
 * BrandIntro - World-Class 60 FPS Vector SVG Logo Reveal & Shared-Element Handoff
 * 
 * Phases:
 * 0.0s - 1.0s: Compass Star Ignition & Monogram Laser Stroke Draw
 * 1.0s - 1.8s: Terracotta Badge 3D Pop & "TenoPilot.com" Serif Wordmark Unmask
 * 1.8s - 2.8s: 🔥 Shared-Element Handoff -> Logo scales & glides to top-left header as app reveals
 */
export const BrandIntro: React.FC<BrandIntroProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<"ignite" | "reveal" | "handoff" | "done">("ignite");
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    // Check if intro has already played in this browser session
    try {
      const seen = sessionStorage.getItem("tenopilot_brand_intro_v2");
      if (seen === "true") {
        setRemoved(true);
        if (onComplete) onComplete();
        return;
      }
    } catch {}

    // Timeline Timers
    const timer1 = setTimeout(() => setStage("reveal"), 900);   // Terracotta pop & wordmark unmask
    const timer2 = setTimeout(() => setStage("handoff"), 1900); // Gliding handoff to top-left header
    const timer3 = setTimeout(() => handleFinish(), 2800);     // Complete & unmount

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const handleFinish = () => {
    try {
      sessionStorage.setItem("tenopilot_brand_intro_v2", "true");
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
        backgroundColor: stage === "handoff" ? "transparent" : "#070a11",
        transition: "background-color 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Dark Backdrop Curtain that dissolves on handoff */}
      <div
        className={`absolute inset-0 bg-[#070a11] transition-opacity duration-800 pointer-events-none ${
          stage === "handoff" ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Radial Ambient Glow */}
      <div
        className={`absolute w-[600px] h-[600px] rounded-full pointer-events-none transition-all duration-1000 ${
          stage === "handoff" ? "opacity-0 scale-50" : "opacity-40 scale-100"
        }`}
        style={{
          background: "radial-gradient(circle, rgba(200,91,43,0.35) 0%, rgba(11,19,43,0) 70%)",
        }}
      />

      {/* Skip Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleFinish();
        }}
        className={`absolute top-6 right-6 z-50 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/80 hover:text-white font-bold text-xs transition-all border border-white/15 active:scale-95 shadow-md ${
          stage === "handoff" ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <span>⏩ Skip Intro</span>
      </button>

      {/* 🔥 THE SHARED LOGO LOCKUP CONTAINER */}
      <div
        className="relative z-20 flex items-center gap-4 transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform:
            stage === "handoff"
              ? "translate(calc(-50vw + 140px), calc(-50vh + 42px)) scale(0.48)"
              : "translate(0, 0) scale(1)",
        }}
      >
        {/* 🟧 1. OFFICIAL TERRACOTTA MONOGRAM ICON BADGE */}
        <div
          className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-[26px] bg-gradient-to-br from-[#d4602f] via-[#c85b2b] to-[#a8451f] shadow-2xl flex items-center justify-center border border-white/20 transition-all duration-700 ${
            stage === "ignite"
              ? "scale-90 opacity-90 shadow-orange-950/20"
              : "scale-100 opacity-100 shadow-orange-950/80 ring-2 ring-amber-300/30"
          }`}
        >
          {/* Specular Light Sheen Overlay */}
          <div className="absolute inset-0 rounded-[26px] overflow-hidden pointer-events-none">
            <div
              className={`absolute -top-full -left-full w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/25 to-transparent transform rotate-45 transition-transform duration-1000 ${
                stage === "reveal" ? "translate-x-full translate-y-full" : ""
              }`}
            />
          </div>

          {/* ✦ Pure Vector SVG Monogram "T" + Compass Star */}
          <svg
            className="w-16 h-16 sm:w-18 sm:h-18 text-white drop-shadow-md"
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
            <g
              className={`transition-all duration-700 origin-center ${
                stage === "ignite" ? "scale-125 opacity-100 filter drop-shadow-[0_0_12px_rgba(255,255,255,1)]" : "scale-100 opacity-95"
              }`}
            >
              {/* Star Core Geometry */}
              <path
                d="M 50 38 C 50 48 40 50 30 50 C 40 50 50 52 50 62 C 50 52 60 50 70 50 C 60 50 50 48 50 38 Z"
                fill="#ffffff"
              />
              {/* Outer Radiant Lens Rays */}
              <path
                d="M 50 30 L 50 70 M 30 50 L 70 50"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.85"
              />
            </g>
          </svg>
        </div>

        {/* 🪶 2. OFFICIAL SERIF WORDMARK "TenoPilot.com" */}
        <div className="flex flex-col">
          <div
            className={`overflow-hidden transition-all duration-800 ease-out ${
              stage === "ignite" ? "max-w-0 opacity-0" : "max-w-[400px] opacity-100"
            }`}
          >
            <h1 className="font-serif font-bold text-3xl sm:text-5xl text-white tracking-tight flex items-center drop-shadow-lg whitespace-nowrap">
              <span>TenoPilot</span>
              <span className="text-amber-400 font-serif font-medium">.com</span>
            </h1>
          </div>

          {/* Subtitle Tagline */}
          <p
            className={`text-[11px] sm:text-xs font-sans tracking-[0.25em] uppercase font-bold text-amber-200/80 mt-1 transition-all duration-700 delay-200 whitespace-nowrap ${
              stage === "ignite" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}
          >
            Single Source of Truth for Property Management
          </p>
        </div>
      </div>
    </div>
  );
};
