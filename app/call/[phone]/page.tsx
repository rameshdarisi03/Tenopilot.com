"use client";

import { useEffect, use } from "react";
import Link from "next/link";
import { Phone, MessageCircle, Building2, ArrowLeft } from "lucide-react";

interface CallPageProps {
  params: Promise<{
    phone: string;
  }>;
}

export default function CallDeskPage({ params }: CallPageProps) {
  const resolvedParams = use(params);
  const rawPhone = resolvedParams.phone || "";
  const cleanDigits = rawPhone.replace(/\D/g, "");
  
  // Format Indian phone number nicely
  const formattedDigits = cleanDigits.length === 10 
    ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`
    : cleanDigits.length === 12 && cleanDigits.startsWith("91")
    ? `+91 ${cleanDigits.slice(2, 7)} ${cleanDigits.slice(7)}`
    : `+${cleanDigits}`;

  const telUri = cleanDigits.length === 10 ? `tel:+91${cleanDigits}` : `tel:+${cleanDigits}`;
  const waUri = cleanDigits.length === 10 ? `https://wa.me/91${cleanDigits}` : `https://wa.me/${cleanDigits}`;

  useEffect(() => {
    // Attempt automatic dialer launch on mobile
    if (cleanDigits.length >= 10 && typeof window !== "undefined") {
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        const timer = setTimeout(() => {
          window.location.href = telUri;
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [cleanDigits, telUri]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-sm bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center">
        
        {/* Animated Phone Ripple Icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Phone className="w-10 h-10 text-white animate-bounce" />
          </div>
        </div>

        {/* Header Titles */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Building2 className="w-3.5 h-3.5" />
          <span>PG Reception Desk</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Connecting to PG Desk
        </h1>

        <p className="text-sm text-slate-400 mb-6 max-w-xs">
          Direct telephone contact with your property manager. Tap below if your phone dialer didn&apos;t open automatically.
        </p>

        {/* Display Phone Number */}
        <div className="w-full bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4 mb-6 text-center">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Manager Phone Number
          </span>
          <span className="text-2xl font-black text-emerald-400 tracking-tight font-mono">
            {formattedDigits || "No phone provided"}
          </span>
        </div>

        {/* Direct Action Buttons */}
        <div className="w-full space-y-3">
          <a
            href={telUri}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-base shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-95"
          >
            <Phone className="w-5 h-5" />
            <span>Call PG Desk Now</span>
          </a>

          <a
            href={waUri}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-600/80 transition-all duration-200 active:scale-95"
          >
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

        {/* Footer Branding */}
        <div className="mt-8 pt-6 border-t border-slate-700/50 w-full text-center">
          <p className="text-xs text-slate-500">
            Powered by <span className="font-semibold text-slate-400">TenoPilot</span> • Smart Property OS
          </p>
        </div>
      </div>
    </div>
  );
}
