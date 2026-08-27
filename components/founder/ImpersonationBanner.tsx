"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ShieldCheck, Eye, LogOut, ArrowLeft } from "lucide-react";

export function ImpersonationBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isImpersonating = searchParams.get("impersonate") === "true";

  if (!isImpersonating) return null;

  const handleExitImpersonation = () => {
    router.push("/apex-command/clients");
  };

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white px-4 py-2.5 shadow-xl flex items-center justify-between text-xs font-bold font-sans">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-lg bg-black/30 text-white">
          <Eye className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-black/30 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/20">
            👑 GOD MODE IMPERSONATION ACTIVE
          </span>
          <span className="hidden sm:inline text-white/90">
            Viewing client operating dashboard with full Super-Admin privileges
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleExitImpersonation}
        className="px-3.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-white border border-white/30 text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Exit God Mode</span>
      </button>
    </div>
  );
}
