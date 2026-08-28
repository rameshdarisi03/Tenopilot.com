"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ticket,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  PhoneCall,
  Lock,
} from "lucide-react";
import { founderStore } from "@/constants/founderStore";

export default function ClientActivationPage() {
  const router = useRouter();
  const [activationCode, setActivationCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activatedSuccess, setActivatedSuccess] = useState<any | null>(null);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await founderStore.redeemActivationCode(activationCode, email);

      if (res.success && res.invite) {
        setActivatedSuccess(res.invite);
        setLoading(false);
        // Automatically redirect after celebration
        setTimeout(() => {
          router.push("/p/sunshine-pg/overview");
        }, 2200);
      } else {
        setError(res.message);
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please verify your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f12] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#ff3366]/30 selection:text-white">
      {/* Ambient Cyber Glows */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#ff3366]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#ff8400]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-lg w-full p-6 sm:p-10 rounded-3xl bg-[#16191f] border border-white/10 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ff3366] via-[#ff5436] to-[#ff8400] flex items-center justify-center text-white shadow-xl shadow-[#ff3366]/30 mx-auto font-serif font-black text-2xl">
            T
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <h1 className="font-serif font-bold text-2xl text-white">Activate Your Property</h1>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#ff3366]/20 text-[#ff5436] border border-[#ff3366]/30">
              EXCLUSIVE ACCESS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Enter the Activation Code provided by your TenoPilot onboarding representative
          </p>
        </div>

        {/* Celebration State */}
        {activatedSuccess ? (
          <div className="p-6 rounded-3xl bg-gradient-to-tr from-emerald-950/80 via-[#16191f] to-emerald-950/80 border border-emerald-500/40 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl animate-bounce">
              🎉
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-white">
                {activatedSuccess.pgName} is Live!
              </h2>
              <p className="text-xs text-emerald-400 font-medium mt-1">
                ✓ Activation Code {activatedSuccess.activationCode} redeemed successfully
              </p>
            </div>
            <p className="text-xs text-slate-400 animate-pulse">
              Redirecting to your property command dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Mobile Number or Email Address *
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#0d0f12] border border-white/10 focus:outline-none focus:border-[#ff5436] focus:ring-2 focus:ring-[#ff3366]/20 text-xs font-semibold text-white placeholder-slate-600 transition-all"
                placeholder="9876543210 or owner@gmail.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Activation Code *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#0d0f12] border border-white/10 focus:outline-none focus:border-[#ff5436] focus:ring-2 focus:ring-[#ff3366]/20 font-mono font-black text-lg text-center tracking-widest text-[#ff5436] placeholder-slate-600 transition-all uppercase"
                  placeholder="8K4N-9X2M"
                />
                <Ticket className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                Strict 1-time pass: Bound strictly to your verified contact details
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] hover:opacity-95 text-white font-bold text-xs shadow-xl shadow-[#ff3366]/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Redeem Code & Activate PG ➔</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Support Info */}
        <div className="pt-2 border-t border-white/8 text-center space-y-2">
          <p className="text-xs text-slate-400">
            Don&apos;t have an activation code?
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-300">
            <a
              href="tel:+919876543210"
              className="hover:text-[#ff5436] flex items-center gap-1.5 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#ff5436]" />
              <span>Call Onboarding Desk</span>
            </a>
            <span>•</span>
            <Link
              href="/login"
              className="hover:text-white transition-colors"
            >
              Existing User Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
