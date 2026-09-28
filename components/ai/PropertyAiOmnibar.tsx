"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Mic, Command } from "lucide-react";
import { useAiCopilotStore } from "@/lib/aiCopilotStore";

const ROTATING_PROMPTS = [
  "Ask AI: Who has not paid rent this month?",
  "Ask AI: Ee roju evaru join ayyaru? (తెలుగు)",
  "Ask AI: Kiski rent pending hai? (हिंदी)",
  "Ask AI: কার কার ভাড়া বাকি আছে? (বাংলা)",
  "Ask AI: Vacant beds on 2nd floor?",
  "Ask AI: Any open plumbing or Wi-Fi complaints?",
  "Ask AI: Room attrition rate this month?",
  "Ask AI: ಯಾರ ಬಾಡಿಗೆ ಬಾಕಿ ಇದೆ? (ಕನ್ನಡ)",
  "Ask AI: வாடகை தராதவர்கள் யார்? (தமிழ்)",
];

export function PropertyAiOmnibar({ propertyId }: { propertyId?: string }) {
  const { openCopilot } = useAiCopilotStore();
  const [promptIndex, setPromptIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Cross-fade rotating placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPromptIndex((prev) => (prev + 1) % ROTATING_PROMPTS.length);
        setFade(true);
      }, 300);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openCopilot();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCopilot]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onClick={() => openCopilot()}
        className="group relative flex items-center justify-between w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/95 hover:bg-white border border-[#c2652a]/25 hover:border-[#c2652a]/60 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer backdrop-blur-md"
      >
        {/* Ambient Shimmer Sheen */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#c2652a]/5 via-amber-500/10 to-[#964407]/5 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Left: Sparkle Badge & Rotating Text */}
        <div className="relative flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#c2652a] to-[#964407] flex items-center justify-center shrink-0 shadow-xs shadow-[#c2652a]/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>

          <div className="truncate text-xs sm:text-sm font-medium text-gray-500 group-hover:text-gray-800 transition-colors">
            <span
              className={`inline-block transition-opacity duration-300 ${
                fade ? "opacity-100" : "opacity-0"
              }`}
            >
              {ROTATING_PROMPTS[promptIndex]}
            </span>
          </div>
        </div>

        {/* Right: Quick Voice Mic & Shortcut Badge */}
        <div className="relative flex items-center gap-2 shrink-0 pl-2">
          {/* Quick Voice Mic Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openCopilot("", true);
            }}
            title="Ask via Voice (Telugu, Hindi, English, Kannada, Tamil, Malayalam)"
            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/90 text-[#c2652a] hover:text-[#964407] border border-amber-200/80 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-bold pr-0.5">Voice</span>
          </button>

          {/* Desktop Shortcut Pill */}
          <div className="hidden md:flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 text-[10px] font-semibold text-gray-500">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
