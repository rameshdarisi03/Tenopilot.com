"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";

export default function PropertyErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PropertyErrorBoundary] Captured runtime exception:", error);
  }, [error]);

  const handleClearCacheAndReset = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.clear();
      } catch {}
    }
    reset();
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex flex-col justify-between p-6 select-none font-sans">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <Link href="/home" className="cursor-pointer">
          <TenoPilotLogo size="sm" />
        </Link>
        <Link
          href="/home"
          className="text-xs font-bold text-gray-600 hover:text-[#c2652a] flex items-center gap-1.5 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>All Properties</span>
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full bg-white rounded-3xl border border-gray-200/80 shadow-xl p-6 sm:p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-[#c2652a] mx-auto flex items-center justify-center shadow-inner">
          <AlertTriangle className="w-8 h-8 text-[#c2652a]" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif font-bold text-2xl text-gray-900 tracking-tight">
            Workspace Temporarily Syncing
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            The workspace was interrupted while loading real-time property records. Click below to refresh your connection.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-left font-mono text-[10px] text-gray-600 max-h-48 overflow-y-auto break-all whitespace-pre-wrap select-text">
            <p className="font-bold text-rose-600 mb-1">{error.name}: {error.message}</p>
            {error.stack && <p className="text-gray-400 text-[9px] mt-1 font-mono leading-tight">{error.stack}</p>}
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={handleClearCacheAndReset}
            className="w-full py-3 px-4 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Workspace</span>
          </button>

          <Link
            href="/home"
            className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4 text-gray-600" />
            <span>Return to Portfolio</span>
          </Link>
        </div>
      </main>

      <footer className="text-center text-[11px] text-gray-400 py-4">
        TenoPilot Enterprise • Real-Time Database Protected
      </footer>
    </div>
  );
}
