"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  Plus,
  Bell,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  User,
  LogOut,
  LayoutDashboard,
  FileText,
  Settings,
  Sparkles,
} from "lucide-react";

export default function HomeWorkspacePage() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#201a17] flex flex-col justify-between selection:bg-[#964407] selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 bg-[#fff8f6]/90 backdrop-blur-md border-b border-[#d7c2b9]/60">
        <div className="max-w-[1240px] mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand */}
          <Link href="/home" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-xl shadow-md group-hover:bg-[#c2652a] transition-colors">
              T
            </div>
            <div>
              <span className="font-serif font-bold text-2xl tracking-tight text-[#201a17]">
                TenoPilot
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#964407] block -mt-1">
                Home Workspace
              </span>
            </div>
          </Link>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-5">
            <button className="relative p-2 rounded-full hover:bg-[#f8ede3] text-[#554339] transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1.5 rounded-full hover:bg-[#f8ede3] transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-[#964407] text-white font-bold flex items-center justify-center text-sm border-2 border-[#964407]/20">
                  AS
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#201a17]">Alex Stratton</span>
                  <span className="text-[10px] text-[#554339] uppercase font-bold tracking-wider">
                    Principal Manager
                  </span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#d7c2b9] shadow-xl py-2 z-50 text-xs font-medium text-[#201a17]">
                  <div className="px-4 py-2 border-b border-[#f8ede3]">
                    <p className="font-bold text-sm">Alex Stratton</p>
                    <p className="text-xs text-[#554339]">admin@gmail.com</p>
                  </div>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-[#ba1a1a] transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="max-w-[1240px] mx-auto px-6 py-10 flex-1 space-y-10 w-full">
        {/* Welcome Greeting */}
        <section className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-widest text-[#964407] block mb-2">
            Welcome Home
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#201a17]">
            Good morning, Alex. Your portfolio is calling.
          </h1>
          <p className="text-base sm:text-lg text-[#554339] mt-3 font-normal">
            3 properties require your operational focus today. Select a workspace below to streamline collections and bed occupancy.
          </p>
        </section>

        {/* Workspace Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Card 1: Consolidated Portfolio Workspace Card */}
          <div className="bg-gradient-to-br from-[#964407] to-[#c2652a] text-white rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden min-h-[360px]">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-white">
                View All Properties
              </h3>
              <p className="text-xs text-white/90 leading-relaxed font-normal">
                Consolidated portfolio dashboard. Manage all active properties and aggregate financial metrics across your entire estate.
              </p>
            </div>

            <div className="relative z-10 mt-6">
              <Link
                href="/portfolio/dashboard"
                id="portfolio-dashboard-btn"
                className="w-full py-3.5 px-4 rounded-full bg-white text-[#964407] font-bold text-xs hover:bg-[#fff8f6] transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
              >
                View Portfolio Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Property Card 1: The Sands Residences */}
          <div className="bg-white border border-[#d7c2b9] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="p-6 pb-4 border-b border-[#f8ede3]">
                <div className="flex justify-between items-start mb-3">
                  <span className="badge-available px-3 py-1 rounded-full text-[10px] font-bold">
                    HEALTHY 🟢
                  </span>
                  <span className="text-[10px] font-bold text-[#554339] uppercase">
                    48 BEDS
                  </span>
                </div>
                <h4 className="font-serif text-xl font-bold text-[#201a17]">
                  The Sands Residences
                </h4>
                <p className="text-xs text-[#554339] mt-0.5">Kondapur, Hyderabad</p>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339] block">
                    Occupancy
                  </span>
                  <span className="text-xl font-serif font-bold text-[#964407]">
                    98.5%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339] block">
                    Rent Collected
                  </span>
                  <span className="text-xl font-serif font-bold text-[#059669]">
                    100%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0">
              <Link
                href="/p/sands-residences/dashboard"
                className="w-full py-3 rounded-full border border-[#d7c2b9] text-[#201a17] font-bold text-xs hover:bg-[#964407] hover:text-white hover:border-[#964407] transition-all flex items-center justify-center gap-1.5"
              >
                View Workspace <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Property Card 2: Meridian PG & Hostel */}
          <div className="bg-white border border-[#d7c2b9] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="p-6 pb-4 border-b border-[#f8ede3]">
                <div className="flex justify-between items-start mb-3">
                  <span className="badge-booked px-3 py-1 rounded-full text-[10px] font-bold">
                    3 TASKS PENDING 🟡
                  </span>
                  <span className="text-[10px] font-bold text-[#554339] uppercase">
                    32 BEDS
                  </span>
                </div>
                <h4 className="font-serif text-xl font-bold text-[#201a17]">
                  Meridian PG & Hostel
                </h4>
                <p className="text-xs text-[#554339] mt-0.5">Gachibowli, Hyderabad</p>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339] block">
                    Occupancy
                  </span>
                  <span className="text-xl font-serif font-bold text-[#964407]">
                    92.0%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339] block">
                    Rent Collected
                  </span>
                  <span className="text-xl font-serif font-bold text-[#964407]">
                    94%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0">
              <Link
                href="/p/meridian-hostel/dashboard"
                className="w-full py-3 rounded-full border border-[#d7c2b9] text-[#201a17] font-bold text-xs hover:bg-[#964407] hover:text-white hover:border-[#964407] transition-all flex items-center justify-center gap-1.5"
              >
                View Workspace <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Property Card 3: Copper Crest Estate */}
          <div className="bg-white border border-[#d7c2b9] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="p-6 pb-4 border-b border-[#f8ede3]">
                <div className="flex justify-between items-start mb-3">
                  <span className="badge-available px-3 py-1 rounded-full text-[10px] font-bold">
                    HEALTHY 🟢
                  </span>
                  <span className="text-[10px] font-bold text-[#554339] uppercase">
                    60 BEDS
                  </span>
                </div>
                <h4 className="font-serif text-xl font-bold text-[#201a17]">
                  Copper Crest Estate
                </h4>
                <p className="text-xs text-[#554339] mt-0.5">Hitech City, Hyderabad</p>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339] block">
                    Occupancy
                  </span>
                  <span className="text-xl font-serif font-bold text-[#964407]">
                    100%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339] block">
                    Rent Collected
                  </span>
                  <span className="text-xl font-serif font-bold text-[#059669]">
                    100%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0">
              <Link
                href="/p/copper-crest/dashboard"
                className="w-full py-3 rounded-full border border-[#d7c2b9] text-[#201a17] font-bold text-xs hover:bg-[#964407] hover:text-white hover:border-[#964407] transition-all flex items-center justify-center gap-1.5"
              >
                View Workspace <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 5: Add New Property Card */}
          <button className="group border-2 border-dashed border-[#d7c2b9] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[360px] hover:border-[#964407] hover:bg-[#f8ede3]/40 transition-all text-center">
            <div className="w-14 h-14 bg-[#f8ede3] rounded-full flex items-center justify-center mb-4 text-[#554339] group-hover:bg-[#964407]/10 group-hover:text-[#964407] transition-colors">
              <Plus className="w-7 h-7 transition-transform group-hover:rotate-90 duration-300" />
            </div>
            <span className="font-serif font-bold text-xl text-[#201a17] group-hover:text-[#964407] transition-colors">
              Add New Property
            </span>
            <p className="text-xs text-[#554339] mt-1">Expand your PG or Hostel portfolio</p>
          </button>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-xl border border-[#d7c2b9] shadow-2xl rounded-full px-6 py-2.5 flex gap-8 items-center text-xs">
        <Link href="/home" className="flex flex-col items-center text-[#964407] font-bold">
          <Building2 className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-tight mt-0.5">Portfolio</span>
        </Link>
        <Link href="/portfolio/dashboard" className="flex flex-col items-center text-[#554339] hover:text-[#964407]">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-tight mt-0.5">Analytics</span>
        </Link>
        <Link href="/home" className="flex flex-col items-center text-[#554339] hover:text-[#964407]">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-tight mt-0.5">Settings</span>
        </Link>
      </nav>

      {/* Footer */}
      <footer className="py-6 border-t border-[#d7c2b9]/40 text-center text-xs text-[#554339]">
        © 2026 TenoPilot Inc. Single Source of Truth for Property Management.
      </footer>
    </div>
  );
}
