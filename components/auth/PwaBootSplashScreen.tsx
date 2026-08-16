"use client";

import { useState, useEffect } from "react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { Sparkles, ShieldCheck } from "lucide-react";

export function PwaBootSplashScreen({
  onComplete,
  durationMs = 1100,
}: {
  onComplete?: () => void;
  durationMs?: number;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, durationMs - 300);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [durationMs, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#1a1412] flex flex-col items-center justify-center transition-opacity duration-300 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Ambient Glow */}
      <div className="absolute w-72 h-72 rounded-full bg-[#c2652a]/20 blur-3xl animate-pulse pointer-events-none" />

      {/* Central Animated Boot Logo */}
      <div className="relative z-10 flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#964407] to-[#c2652a] p-0.5 shadow-2xl shadow-orange-950/60 flex items-center justify-center">
            <div className="w-full h-full bg-[#201a17] rounded-[22px] flex items-center justify-center border border-amber-500/20">
              <span className="font-serif font-black text-3xl text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-orange-300 to-amber-500 tracking-tight">
                T
              </span>
            </div>
          </div>
          {/* Subtle Corner Pulse Accent */}
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#1a1412] animate-ping" />
        </div>

        <div className="text-center space-y-1">
          <h1 className="font-serif font-bold text-xl tracking-wider text-white">
            T E N O P I L O T
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/60 font-semibold">
            Estate Operating System
          </p>
        </div>

        {/* Subtle Boot Indicator */}
        <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#c2652a] to-amber-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
