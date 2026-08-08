"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ShieldCheck, Zap, ArrowRight, X } from "lucide-react";
import { DigitRollingOdometer } from "./DigitRollingOdometer";
import { fireCelebrationConfetti } from "./ConfettiBurst";

interface GrandWelcomeOverlayProps {
  ownerName?: string;
  onComplete?: () => void;
}

/**
 * GrandWelcomeOverlay - World-Class Cinematic Welcome Entrance Overlay
 * 
 * Phase 1 (0s - 1.5s): Dark copper glass canvas with pulsing 3D TenoPilot Emblem Crest
 * Phase 2 (1.5s - 3.2s): Personal greeting reveal "Welcome Back, Ramesh Darisi" & live stats ticker
 * Phase 3 (3.2s onwards): Smooth curtain spring reveal bringing properties into the limelight
 */
export const GrandWelcomeOverlay: React.FC<GrandWelcomeOverlayProps> = ({
  ownerName = "Ramesh Darisi",
  onComplete,
}) => {
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    // Phase 1 -> Phase 2 at 1.4s
    const t1 = setTimeout(() => setPhase(2), 1400);

    // Trigger celebration confetti burst at Phase 2 (2.0s)
    const tConfetti = setTimeout(() => fireCelebrationConfetti(), 2000);

    // Phase 2 -> Phase 3 curtain reveal at 3.6s
    const t2 = setTimeout(() => setPhase(3), 3600);

    // Complete overlay fadeout at 4.6s
    const t3 = setTimeout(() => {
      setPhase(4);
      if (onComplete) onComplete();
    }, 4600);

    return () => {
      clearTimeout(t1);
      clearTimeout(tConfetti);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (phase === 4) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#120e0c] select-none transition-all duration-700 ${
        phase === 3 ? "opacity-0 pointer-events-none scale-105" : "opacity-100"
      }`}
    >
      {/* Dynamic Ambient Aurora Gold Glow Canvas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-amber-600/30 via-orange-500/20 to-yellow-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-600/15 rounded-full blur-2xl" />
      </div>

      {/* Skip Button */}
      <button
        onClick={() => {
          setPhase(4);
          if (onComplete) onComplete();
        }}
        className="absolute top-6 right-6 z-50 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg"
      >
        <span>Skip Intro</span>
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Main Glass Content Container */}
      <div className="relative z-10 max-w-2xl w-full mx-4 text-center space-y-8">
        {/* Phase 1: 3D Pulsing Crest */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-600 opacity-60 blur-xl animate-pulse" />
            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-[#c2652a] to-[#964407] border-2 border-amber-300/40 shadow-2xl flex items-center justify-center transform transition-transform duration-700 hover:scale-105">
              <span className="font-serif font-bold text-4xl md:text-5xl text-white tracking-tight drop-shadow-md">
                T
              </span>
            </div>
          </div>
        </div>

        {/* Phase 2: Personal Greeting Burst */}
        <div
          className={`space-y-3 transition-all duration-700 transform ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 backdrop-blur-md text-amber-300 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Welcome to TenoPilot.com</span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Welcome Back,{" "}
            <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 bg-clip-text text-transparent">
              {ownerName}
            </span>
          </h1>

          <p className="text-amber-100/70 text-sm md:text-base max-w-lg mx-auto">
            Your PG Empire Operations are Live across 6 Floors & 200 Beds.
          </p>
        </div>

        {/* Dynamic Metric Badges */}
        <div
          className={`grid grid-cols-3 gap-3 md:gap-4 max-w-lg mx-auto transition-all duration-700 delay-200 transform ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
              Occupancy
            </p>
            <p className="text-lg md:text-xl font-bold text-white font-sans mt-0.5">
              <DigitRollingOdometer value={98.5} suffix="%" decimals={1} />
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
              Rent Collected
            </p>
            <p className="text-lg md:text-xl font-bold text-emerald-400 font-sans mt-0.5">
              ₹10.58L
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
              KYC Status
            </p>
            <p className="text-lg md:text-xl font-bold text-amber-300 font-sans mt-0.5 flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 inline" /> 100%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
