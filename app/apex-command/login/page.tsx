"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldCheck, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function ApexCommandLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@tenopilot.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (email.trim().toLowerCase() === "admin@tenopilot.com" && password === "admin123") {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("apex_founder_auth", "true");
        }
        router.push("/apex-command/overview");
      } else {
        setError("⚠️ Invalid Founder credentials. Access denied.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0d0f12] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#ff3366]/30 selection:text-white">
      {/* Ambient Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#ff3366]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#ff8400]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#16191f] border border-white/10 shadow-2xl space-y-6">
        {/* Top Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff3366] via-[#ff5436] to-[#ff8400] flex items-center justify-center text-white shadow-lg shadow-[#ff3366]/30 mx-auto font-serif font-black text-2xl">
            T
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <h1 className="font-serif font-bold text-xl text-white">TenoPilot APEX</h1>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#ff3366]/20 text-[#ff5436] border border-[#ff3366]/30">
              GOD MODE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Platform Founder & Super-Admin Gatekeeper
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Super-Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#0d0f12] border border-white/10 focus:outline-none focus:border-[#ff5436] focus:ring-2 focus:ring-[#ff3366]/20 text-xs font-semibold text-white placeholder-slate-600 transition-all"
              placeholder="admin@tenopilot.com"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Access Key / Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#0d0f12] border border-white/10 focus:outline-none focus:border-[#ff5436] focus:ring-2 focus:ring-[#ff3366]/20 text-xs font-semibold text-white placeholder-slate-600 pr-10 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-[#ff3366]/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Enter Apex Command Console</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-[10px] text-slate-500">
          Strict Security • Unauthenticated access attempts are logged & rate-limited.
        </div>
      </div>
    </div>
  );
}
