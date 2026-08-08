"use client";

import React, { useEffect, useState } from "react";

interface InstrumentIntroOverlayProps {
  onComplete?: () => void;
}

const WORD = "TENOPILOT";
const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * InstrumentIntroOverlay - Split-Flap Flight Board Logo Intro Overlay
 * 
 * Features:
 * 1. Radar conic sweep backdrop
 * 2. Radial gauge dial settling with 250deg spring rotation + T logo mark pop
 * 3. 3D Split-flap flight board mechanical letter flipping for TENOPILOT
 * 4. System diagnostic ticker (OCCUPANCY ✓, RENT ✓, ALERTS ✓)
 * 5. Smooth translateY(-100%) curtain exit revealing main home dashboard
 */
export const InstrumentIntroOverlay: React.FC<InstrumentIntroOverlayProps> = ({
  onComplete,
}) => {
  const [exited, setExited] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [cellLetters, setCellLetters] = useState<string[]>(() =>
    WORD.split("").map(() => POOL[Math.floor(Math.random() * POOL.length)])
  );
  const [flippingIndices, setFlippingIndices] = useState<boolean[]>(
    new Array(WORD.length).fill(false)
  );

  useEffect(() => {
    // 1. Split-flap letter flip animation timing
    WORD.split("").forEach((targetChar, index) => {
      const startDelay = 1250 + index * 55;
      let flipCount = 0;
      const maxFlips = 6;

      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          setFlippingIndices((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
          });

          setCellLetters((prev) => {
            const next = [...prev];
            if (flipCount < maxFlips - 1) {
              next[index] = POOL[Math.floor(Math.random() * POOL.length)];
            } else {
              next[index] = targetChar;
            }
            return next;
          });

          flipCount++;
          if (flipCount >= maxFlips) {
            clearInterval(interval);
            setTimeout(() => {
              setFlippingIndices((prev) => {
                const next = [...prev];
                next[index] = false;
                return next;
              });
            }, 100);
          }
        }, 90);
      }, startDelay);
    });

    // 2. Auto-exit curtain lift at 3.7s
    const exitTimer = setTimeout(() => {
      handleExit();
    }, 3700);

    return () => {
      clearTimeout(exitTimer);
    };
  }, []);

  const handleExit = () => {
    if (exited) return;
    setExited(true);
    setTimeout(() => {
      setRemoved(true);
      if (onComplete) onComplete();
    }, 900);
  };

  if (removed) return null;

  return (
    <div
      id="intro"
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-[#201812] to-[#140F0B] transition-transform duration-900 ease-[cubic-bezier(.76,0,.24,1)] overflow-hidden select-none ${
        exited ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Radar Conic Sweeper */}
      <div
        className="absolute -inset-[20%] z-0 opacity-40 animate-spin"
        style={{
          animationDuration: "9s",
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(198,87,42,0.25) 20deg, transparent 60deg, transparent 360deg)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, black 0%, black 30%, transparent 65%)",
          maskImage:
            "radial-gradient(circle at 50% 50%, black 0%, black 30%, transparent 65%)",
        }}
      />

      {/* Skip Button */}
      <button
        onClick={handleExit}
        className="absolute bottom-8 right-10 z-30 font-sans text-xs font-semibold tracking-wider text-white/40 hover:text-white/90 transition-colors bg-transparent border-none cursor-pointer"
      >
        Skip intro →
      </button>

      {/* Intro Center Stack */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Instrument Dial */}
        <div className="relative w-[74px] h-[74px] mb-6">
          <svg
            className="opacity-100 animate-in fade-in zoom-in duration-700"
            width="74"
            height="74"
            viewBox="0 0 74 74"
          >
            <circle
              cx="37"
              cy="37"
              r="30"
              fill="none"
              stroke="rgba(232,161,92,0.4)"
              strokeWidth="1.4"
              strokeDasharray="3 4"
            />
            <circle
              cx="37"
              cy="37"
              r="30"
              fill="none"
              stroke="rgba(232,161,92,0.15)"
              strokeWidth="1"
            />
            <line
              x1="37"
              y1="37"
              x2="37"
              y2="11"
              stroke="#E8A15C"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 w-9 h-9 -mt-45 -ml-45 rounded-xl bg-gradient-to-br from-[#C6572A] to-[#A8451F] text-white flex items-center justify-center font-bold font-sans text-lg shadow-lg animate-in zoom-in-50 duration-500 delay-500">
            T
          </div>
        </div>

        {/* 3D Split-Flap Wordmark */}
        <div className="flex gap-1">
          {cellLetters.map((letter, idx) => (
            <div
              key={idx}
              className={`relative w-[30px] h-[40px] bg-white/5 rounded-md flex items-center justify-center shadow-inner border border-white/10 ${
                flippingIndices[idx] ? "animate-pulse" : ""
              }`}
            >
              <div className="absolute left-1 right-1 top-1/2 h-[1px] bg-black/45 z-20" />
              <span className="font-mono font-bold text-xl text-[#F3E8DE] z-10">
                {letter}
              </span>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div className="mt-4 font-sans text-[11px] tracking-[0.35em] text-white/50 uppercase animate-in fade-in slide-in-from-bottom-2 duration-500 delay-1000">
          Home Dashboard
        </div>

        {/* System Diagnostic Checklist */}
        <div className="flex gap-5 mt-5 font-mono text-[10px] tracking-wider text-white/45">
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300 delay-1000">
            <span>OCCUPANCY</span>
            <span className="text-emerald-400 font-bold">✓</span>
          </div>
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300 delay-1000">
            <span>RENT</span>
            <span className="text-emerald-400 font-bold">✓</span>
          </div>
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300 delay-1000">
            <span>ALERTS</span>
            <span className="text-emerald-400 font-bold">✓</span>
          </div>
        </div>

        {/* Loading Bar Track */}
        <div className="w-40 h-[2px] bg-white/12 mt-7 rounded-sm overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#C6572A] to-[#E8A15C] w-full animate-in slide-in-from-left duration-1000 delay-1000" />
        </div>
      </div>
    </div>
  );
};
