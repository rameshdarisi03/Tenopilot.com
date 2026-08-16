"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Smartphone,
  Monitor,
  Share2,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
} from "lucide-react";
import { usePWAInstaller } from "@/hooks/usePWAInstaller";

export default function PwaInstallPage() {
  const { isInstalled, promptInstall } = usePWAInstaller();
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const iOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const androidDevice = /android/.test(userAgent);

      setIsIOS(iOSDevice);
      setIsAndroid(androidDevice);

      // If Android / Desktop Chrome, automatically trigger install prompt after 800ms
      if (!iOSDevice && !isInstalled) {
        const timer = setTimeout(() => {
          promptInstall();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isInstalled, promptInstall]);

  const handleInstall = async () => {
    if (isInstalled) {
      setInstallSuccess(true);
      return;
    }
    await promptInstall();
  };

  return (
    <div className="min-h-screen bg-[#140e0c] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Background Ambient Glow */}
      <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[#c2652a]/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#201a17]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 relative z-10 text-center">
        
        {/* App Icon */}
        <div className="inline-flex justify-center">
          <div className="relative p-1 rounded-3xl bg-gradient-to-tr from-[#964407] to-amber-500 shadow-2xl shadow-orange-950/80">
            <Image
              src="/tenopilot-app-icon.png"
              alt="TenoPilot Official App Icon"
              width={72}
              height={72}
              className="rounded-[22px] shadow-md"
              priority
            />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Official Native PWA App</span>
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Install TenoPilot App
          </h1>
          <p className="text-xs text-amber-100/70 font-medium">
            Next-Gen Estate Management & Coliving OS
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 py-1 text-[11px] text-gray-300 font-semibold border-y border-white/10">
          <div className="p-2 bg-white/5 rounded-xl flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Instant Launch</span>
          </div>
          <div className="p-2 bg-white/5 rounded-xl flex flex-col items-center gap-1">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Offline Sync</span>
          </div>
          <div className="p-2 bg-white/5 rounded-xl flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>Fintech PIN</span>
          </div>
        </div>

        {/* Platform-Specific Instructions */}
        {isIOS ? (
          /* iOS Safari Step-by-Step Instructions */
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left space-y-3">
            <h3 className="font-bold text-xs text-amber-300 flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Install on iPhone / iPad in 3 Taps:
            </h3>

            <div className="space-y-2 text-[11px] text-gray-200">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  1
                </span>
                <span>
                  Tap the <strong>Share button</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> in Safari
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  2
                </span>
                <span>
                  Scroll down & tap <strong>&quot;Add to Home Screen&quot;</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-400" />
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>&quot;Add&quot;</strong> at top right corner
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Android / Desktop Chrome 1-Click Install */
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleInstall}
              className="w-full py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#c2652a] via-[#e07a38] to-[#964407] hover:opacity-95 text-white shadow-xl shadow-orange-950/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 animate-pulse"
            >
              <Smartphone className="w-4 h-4 text-amber-200" />
              <span>📲 1-Click Install Official App</span>
            </button>

            {isInstalled && (
              <p className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> App is installed on this device!
              </p>
            )}
          </div>
        )}

        {/* Fallback to Web App */}
        <div className="pt-1 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-gray-400">Prefer browser version?</span>
          <Link
            href="/login"
            className="font-bold text-amber-300 hover:text-white flex items-center gap-1 hover:underline"
          >
            <span>Open Web Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      {/* Footer Branding */}
      <div className="text-center pt-6 text-[11px] text-gray-500 font-medium">
        © 2026 TenoPilot.com • Single Source of Truth for Property Management
      </div>
    </div>
  );
}
