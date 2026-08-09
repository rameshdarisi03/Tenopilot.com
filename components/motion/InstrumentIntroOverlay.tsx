"use client";

import React, { useEffect, useState, useRef } from "react";

interface InstrumentIntroOverlayProps {
  onComplete?: () => void;
}

/**
 * InstrumentIntroOverlay - Ultra-Premium 3D Cinematic Brand Reveal Intro Video
 * 
 * Features:
 * 1. Plays 9-second hardware-accelerated /tenopilot_intro.mp4 seamlessly
 * 2. On video ended callback -> Smooth curtain slide-up transition
 * 3. 1-Tap Skip button on top right for power users
 * 4. Session Storage optimization -> Plays once per boot session
 */
export const InstrumentIntroOverlay: React.FC<InstrumentIntroOverlayProps> = ({
  onComplete,
}) => {
  const [exited, setExited] = useState(false);
  const [removed, setRemoved] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Check if user has already seen intro in this browser session
    try {
      const seen = sessionStorage.getItem("tenopilot_intro_seen");
      if (seen === "true") {
        setRemoved(true);
        if (onComplete) onComplete();
        return;
      }
    } catch {}

    // Fallback exit timer at 9.2s in case video end event doesn't trigger
    const fallbackTimer = setTimeout(() => {
      handleExit();
    }, 9200);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleExit = () => {
    if (exited) return;
    try {
      sessionStorage.setItem("tenopilot_intro_seen", "true");
    } catch {}

    setExited(true);
    setTimeout(() => {
      setRemoved(true);
      if (onComplete) onComplete();
    }, 800);
  };

  if (removed) return null;

  return (
    <div
      id="intro"
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#07090e] transition-transform duration-800 ease-[cubic-bezier(.76,0,.24,1)] overflow-hidden select-none ${
        exited ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Skip Button */}
      <button
        type="button"
        onClick={handleExit}
        className="absolute top-6 right-6 z-40 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/90 hover:text-white font-bold text-xs transition-all cursor-pointer border border-white/20 active:scale-95 flex items-center gap-1.5 shadow-lg"
      >
        <span>⏩ Skip Intro</span>
      </button>

      {/* Cinematic 3D Video Player */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src="/tenopilot_intro.mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleExit}
          className="w-full h-full object-contain md:object-cover"
        />
      </div>
    </div>
  );
};
