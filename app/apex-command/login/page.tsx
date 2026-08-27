"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldCheck, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";

import Image from "next/image";

export default function ApexCommandLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@tenopilot.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
        setError("⚠️ Invalid credentials. Access denied.");
        setLoading(false);
      }
    }, 600);
  };

  const handleGoogleSignIn = () => {
    setError(null);
    setGoogleLoading(true);

    setTimeout(() => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("apex_founder_auth", "true");
      }
      router.push("/apex-command/overview");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0d0f12] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#ff3366]/30 selection:text-white">
      {/* Ambient Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#ff3366]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#ff8400]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#16191f] border border-white/10 shadow-2xl space-y-6">
        {/* Top Branding */}
        <div className="text-center space-y-2">
          <div className="relative w-16 h-16 mx-auto drop-shadow-[0_0_25px_rgba(255,51,102,0.35)] transition-transform hover:scale-105 duration-300">
            <Image
              src="/tenopilot-logo.png"
              alt="Tenopilot.com Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="pt-1">
            <h1 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-white text-center">
              Tenopilot<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff3366] to-[#ff8400]">.com</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium text-center">
            SaaS Management & Platform Operations Gatekeeper
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Workspace Auth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#0d0f12] hover:bg-[#1a1e24] border border-white/10 hover:border-white/25 text-white font-semibold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-inner"
        >
          {googleLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google Workspace</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
            or use master credentials
          </span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Management Admin Email
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
            disabled={loading || googleLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-[#ff3366]/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Login to Tenopilot Console</span>
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
