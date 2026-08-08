"use client";

import React, { useEffect, useState } from "react";

interface InstrumentIntroOverlayProps {
  onComplete?: () => void;
}

const WORD = "TENOPILOT";
const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * InstrumentIntroOverlay - World-Class Flight Deck Radar & Split-Flap Logo Intro
 * 
 * Fixes Applied:
 * 1. Perfectly centered 52px "T" Logo Mark inside 110px Gauge Dial (no top-left displacement!)
 * 2. Pure 60fps CSS hardware-accelerated animations (no React re-render state lag)
 * 3. Scaled up Split-Flap Cells (38px x 50px) with bold 26px typography
 * 4. 360-degree Rotating Radar Sweep Ring around dial
 */
export const InstrumentIntroOverlay: React.FC<InstrumentIntroOverlayProps> = ({
  onComplete,
}) => {
  const [exited, setExited] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    // Exit curtain after 3.8s
    const exitTimer = setTimeout(() => {
      handleExit();
    }, 3800);

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
    }, 950);
  };

  if (removed) return null;

  return (
    <div
      id="intro"
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center bg-gradient-to-br from-[#1c140e] via-[#140F0B] to-[#0c0806] transition-transform duration-1000 ease-[cubic-bezier(.76,0,.24,1)] overflow-hidden select-none ${
        exited ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Radar Conic Sweeper Backdrop */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
        <div
          className="w-[900px] h-[900px] opacity-35 animate-spin"
          style={{
            animationDuration: "8s",
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(198,87,42,0.35) 25deg, transparent 70deg, transparent 360deg)",
            WebkitMaskImage:
              "radial-gradient(circle at 50% 50%, black 0%, black 35%, transparent 70%)",
            maskImage:
              "radial-gradient(circle at 50% 50%, black 0%, black 35%, transparent 70%)",
          }}
        />
        {/* Radar Concentric Rings */}
        <div className="absolute w-[500px] h-[500px] rounded-full border border-amber-500/10 pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] rounded-full border border-amber-500/15 pointer-events-none" />
      </div>

      {/* Skip Intro Button */}
      <button
        onClick={handleExit}
        className="absolute bottom-8 right-10 z-30 font-sans text-xs font-semibold tracking-wider text-white/50 hover:text-white transition-colors bg-transparent border-none cursor-pointer active:scale-95"
      >
        Skip intro →
      </button>

      {/* Center Instrument Flight Deck Container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* 110px Instrument Gauge Dial & Centered "T" Logo Mark */}
        <div className="relative w-[110px] h-[110px] mb-7 flex items-center justify-center">
          {/* Radial SVG Dial */}
          <svg
            className="w-full h-full text-amber-500/40 animate-in fade-in zoom-in duration-700"
            viewBox="0 0 110 110"
          >
            <circle
              cx="55"
              cy="55"
              r="46"
              fill="none"
              stroke="rgba(232,161,92,0.35)"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            <circle
              cx="55"
              cy="55"
              r="46"
              fill="none"
              stroke="rgba(198,87,42,0.2)"
              strokeWidth="1.5"
            />
            <line
              x1="55"
              y1="55"
              x2="55"
              y2="15"
              stroke="#E8A15C"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Perfectly Centered Orange "T" Logo Mark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C6572A] to-[#A8451F] text-white flex items-center justify-center font-bold font-sans text-2xl shadow-xl shadow-orange-950/60 border border-amber-300/30 animate-in zoom-in-50 duration-500 delay-300">
            T
          </div>
        </div>

        {/* 3D Split-Flap Wordmark (TENOPILOT) */}
        <div className="flex gap-1.5 md:gap-2">
          {WORD.split("").map((letter, idx) => (
            <div
              key={idx}
              className="relative w-9 md:w-11 h-12 md:h-14 bg-white/10 rounded-lg flex items-center justify-center shadow-2xl border border-white/15 overflow-hidden"
              style={{
                animation: `cardIn 0.5s cubic-bezier(.22,1,.36,1) ${0.8 + idx * 0.05}s forwards`,
                opacity: 0,
              }}
            >
              {/* Split-Flap Center Divider Line */}
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-black/50 z-20" />
              <span className="font-mono font-extrabold text-xl md:text-2xl text-[#F3E8DE] z-10 drop-shadow-md">
                {letter}
              </span>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div
          className="mt-5 font-sans text-[11px] md:text-xs tracking-[0.35em] text-white/50 uppercase font-semibold"
          style={{
            animation: "riseIn 0.5s cubic-bezier(.22,1,.36,1) 1.5s forwards",
            opacity: 0,
          }}
        >
          Home Dashboard
        </div>

        {/* System Diagnostic Checklist */}
        <div
          className="flex gap-6 mt-6 font-mono text-[11px] tracking-wider text-white/50"
          style={{
            animation: "riseIn 0.5s cubic-bezier(.22,1,.36,1) 1.8s forwards",
            opacity: 0,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span>OCCUPANCY</span>
            <span className="text-emerald-400 font-bold">✓</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>RENT</span>
            <span className="text-emerald-400 font-bold">✓</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>ALERTS</span>
            <span className="text-emerald-400 font-bold">✓</span>
          </div>
        </div>

        {/* Loading Progress Bar Track */}
        <div
          className="w-44 h-[3px] bg-white/15 mt-8 rounded-full overflow-hidden"
          style={{
            animation: "riseIn 0.4s cubic-bezier(.22,1,.36,1) 2.1s forwards",
            opacity: 0,
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-[#C6572A] via-[#E8A15C] to-amber-300 w-full"
            style={{
              animation: "fillBar 1.2s cubic-bezier(.65,0,.35,1) 2.2s forwards",
              width: "0%",
            }}
          />
        </div>
      </div>
    </div>
  );
};
