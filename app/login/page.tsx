"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      // Mock Credential Verification
      if (email.trim().toLowerCase() === "admin@gmail.com" && password === "admin123") {
        setIsLoading(false);
        router.push("/home");
      } else {
        setIsLoading(false);
        setError("Invalid credentials. Try demo login: admin@gmail.com / admin123");
      }
    }, 600);
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/home");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#201a17] flex flex-col justify-between selection:bg-[#964407] selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-6 border-b border-[#d7c2b9]/40 bg-[#fff8f6]/80 backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-xl shadow-md group-hover:bg-[#c2652a] transition-colors">
              T
            </div>
            <div>
              <span className="font-serif font-bold text-2xl tracking-tight text-[#201a17]">
                TenoPilot
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#964407] block -mt-1">
                Rental Operating System
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-wider text-[#554339] hover:text-[#964407] transition-colors"
          >
            ← Back to Main Site
          </Link>
        </div>
      </header>

      {/* Auth Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl border border-[#d7c2b9] shadow-xl relative">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#f8ede3] text-[#964407] flex items-center justify-center mx-auto mb-4 border border-[#d7c2b9]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#201a17]">
              Welcome to TenoPilot
            </h1>
            <p className="text-sm text-[#554339] mt-2">
              Sign in to manage your properties & portfolio
            </p>
          </div>

          {/* Quick Demo Credentials Callout */}
          <div className="p-4 rounded-2xl bg-[#f8ede3] border border-[#d7c2b9] mb-6 text-xs text-[#554339]">
            <div className="flex items-center gap-2 font-bold text-[#964407] mb-1">
              <CheckCircle2 className="w-4 h-4" /> Demo Access Enabled
            </div>
            <p className="font-mono text-[11px] text-[#201a17]">
              Email: <span className="font-bold">admin@gmail.com</span>
            </p>
            <p className="font-mono text-[11px] text-[#201a17]">
              Password: <span className="font-bold">admin123</span>
            </p>
          </div>

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl border border-[#d7c2b9] bg-white hover:bg-[#f8ede3] text-[#201a17] font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-3 mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Sign in with Google
          </button>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-[#d7c2b9]/60 w-full"></div>
            <span className="bg-white px-3 text-xs uppercase font-bold text-[#554339]/60 absolute">
              Or with email
            </span>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#ba1a1a] text-xs font-semibold flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#554339] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full px-4 py-3 rounded-xl border border-[#d7c2b9] bg-[#fff8f6] text-[#201a17] text-sm focus:outline-none focus:border-[#964407] focus:ring-1 focus:ring-[#964407] transition-all pl-10"
                />
                <Mail className="w-4 h-4 text-[#554339] absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#554339] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-[#d7c2b9] bg-[#fff8f6] text-[#201a17] text-sm focus:outline-none focus:border-[#964407] focus:ring-1 focus:ring-[#964407] transition-all pl-10 pr-10"
                />
                <Lock className="w-4 h-4 text-[#554339] absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-[#554339] hover:text-[#201a17]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In to Dashboard <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[#d7c2b9]/40 text-center text-xs text-[#554339]">
        © 2026 TenoPilot Inc. All rights reserved.
      </footer>
    </div>
  );
}
