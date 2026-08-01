import Link from "next/link";
import { Building2, Users, ShieldCheck, ArrowRight, Wallet, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fff8f6] text-[#201a17]">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#fff8f6]/80 border-b border-[#d7c2b9]/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-xl shadow-md">
            T
          </div>
          <div>
            <span className="font-serif font-bold text-2xl tracking-tight text-[#201a17]">
              TenoPilot
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-[#964407] block -mt-1">
              Rental Operating System
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#554339]">
          <a href="#features" className="hover:text-[#964407] transition-colors">Features</a>
          <a href="#architecture" className="hover:text-[#964407] transition-colors">Architecture</a>
          <a href="#pricing" className="hover:text-[#964407] transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="px-5 py-2.5 rounded-lg bg-[#964407] hover:bg-[#c2652a] text-white font-semibold text-sm transition-all shadow-sm hover:shadow flex items-center gap-2"
          >
            Launch Workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f8ede3] border border-[#d7c2b9] text-[#964407] text-xs font-semibold uppercase tracking-widest mb-8">
          <ShieldCheck className="w-4 h-4" /> Architecture Locked & Verified (ADR-001)
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#201a17] max-w-4xl leading-tight">
          Effortless PG & Hostel Operations for Modern Owners.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#554339] max-w-2xl font-normal leading-relaxed">
          Record operational events in seconds. TenoPilot automatically handles date-aware room allocations, automated settlements, tenant & guest onboardings, and zero-math financial reports.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/home"
            className="px-8 py-4 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-semibold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3"
          >
            Open Home Workspace <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="p-6 rounded-2xl bg-[#f8ede3] border border-[#d7c2b9] shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#964407]/10 text-[#964407] flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#201a17]">Date-Aware Bed Allocation</h3>
            <p className="mt-2 text-sm text-[#554339]">
              Smart filtering displays only Available and Vacating beds. Validates joining dates against vacating schedules automatically.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#f8ede3] border border-[#d7c2b9] shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#964407]/10 text-[#964407] flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#201a17]">Unified Tenant & Guest Hub</h3>
            <p className="mt-2 text-sm text-[#554339]">
              Single directory with Purple Guest badges. Short-term guests auto-checkout on departure dates; tenants manage notice periods seamlessly.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#f8ede3] border border-[#d7c2b9] shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#964407]/10 text-[#964407] flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#201a17]">Automated Settlement Engine</h3>
            <p className="mt-2 text-sm text-[#554339]">
              Revenue and expenses calculate net profit and partner share distributions in real-time with zero spreadsheet formulas.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#d7c2b9]/60 py-8 px-6 text-center text-xs text-[#554339]">
        <p>© 2026 TenoPilot Inc. Build Once. Scale Forever.</p>
      </footer>
    </div>
  );
}
