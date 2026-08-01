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
  MapPin,
  Verified,
} from "lucide-react";

export default function HomeWorkspacePage() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#201a17] flex flex-col justify-between selection:bg-[#964407] selection:text-white pb-12">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 bg-[#fff8f6]/90 backdrop-blur-md border-b border-[#d7c2b9]/60">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand */}
          <Link href="/home" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-lg sm:text-xl shadow-md group-hover:bg-[#c2652a] transition-colors">
              T
            </div>
            <div>
              <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-[#201a17]">
                TenoPilot
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#964407] block -mt-1">
                Home Dashboard
              </span>
            </div>
          </Link>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              className="relative p-2 rounded-full hover:bg-[#f8ede3] text-[#554339] transition-colors active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#964407]"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#f8ede3] transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-full bg-[#964407] text-white font-bold flex items-center justify-center text-xs sm:text-sm border-2 border-[#964407]/20 shadow-sm">
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

      {/* Main Mobile-Optimized Body */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 space-y-6 sm:space-y-10 w-full">
        {/* Welcome Greeting */}
        <section className="max-w-3xl">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#964407] block mb-1.5">
            Welcome Home
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-[#201a17] leading-tight">
            Good morning, Alex.<br />
            <span className="text-[#725949] font-normal">Your portfolio is calling.</span>
          </h1>
          <p className="text-sm sm:text-lg text-[#554339] mt-2 font-normal leading-relaxed">
            3 properties require operational focus today. Tap a dashboard below to streamline collections and occupancy.
          </p>
        </section>

        {/* Tactile Mobile Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Consolidated Portfolio Dashboard Card */}
          <div className="bg-gradient-to-br from-[#964407] to-[#c2652a] text-white rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden min-h-[260px] sm:min-h-[340px]">
            <div className="relative z-10 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 block">
                Global Overview
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                View All Properties
              </h3>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal">
                Manage all active properties and aggregated financial metrics across your entire estate.
              </p>
            </div>

            <div className="relative z-10 mt-6">
              <Link
                href="/portfolio/dashboard"
                id="portfolio-dashboard-btn"
                className="w-full py-3.5 px-5 rounded-full bg-white text-[#964407] font-bold text-xs sm:text-sm hover:bg-[#fff8f6] transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                View Portfolio Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Property Card 1: The Sands Residences */}
          <div className="group relative rounded-2xl border border-[#d7c2b9] overflow-hidden min-h-[360px] flex flex-col justify-end shadow-md hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 z-0 bg-[#201a17]">
              {/* Visual Background Simulation */}
              <div className="w-full h-full bg-gradient-to-br from-[#725949] to-[#201a17] opacity-90"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#201a17] via-[#201a17]/50 to-transparent"></div>
            </div>

            <div className="relative z-10 p-6 text-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-[#059669]/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 tracking-widest uppercase">
                  <Verified className="w-3 h-3" /> HEALTHY
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                  48 BEDS
                </span>
              </div>

              <div>
                <h3 className="font-serif text-2xl font-bold text-white">
                  The Sands Residences
                </h3>
                <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#ffb68e]" /> Kondapur, Hyderabad
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-left">
                <div>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    Occupancy
                  </p>
                  <p className="font-serif text-xl font-bold text-[#ffb68e]">98.5%</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    Rent Collection
                  </p>
                  <p className="font-serif text-xl font-bold text-emerald-400">100%</p>
                </div>
              </div>

              <Link
                href="/p/sands-residences/dashboard"
                className="w-full py-3.5 px-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs hover:bg-white hover:text-[#964407] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
              >
                View Dashboard <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Property Card 2: Meridian PG & Hostel */}
          <div className="group relative rounded-2xl border border-[#d7c2b9] overflow-hidden min-h-[360px] flex flex-col justify-end shadow-md hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 z-0 bg-[#201a17]">
              <div className="w-full h-full bg-gradient-to-br from-[#964407]/80 to-[#201a17] opacity-90"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#201a17] via-[#201a17]/50 to-transparent"></div>
            </div>

            <div className="relative z-10 p-6 text-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-[#b65c21]/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 tracking-widest uppercase">
                  <AlertCircle className="w-3 h-3" /> 3 TASKS PENDING
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                  32 BEDS
                </span>
              </div>

              <div>
                <h3 className="font-serif text-2xl font-bold text-white">
                  Meridian PG & Hostel
                </h3>
                <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#ffb68e]" /> Gachibowli, Hyderabad
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-left">
                <div>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    Occupancy
                  </p>
                  <p className="font-serif text-xl font-bold text-[#ffb68e]">92.0%</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    Rent Collection
                  </p>
                  <p className="font-serif text-xl font-bold text-[#ffb68e]">94%</p>
                </div>
              </div>

              <Link
                href="/p/meridian-hostel/dashboard"
                className="w-full py-3.5 px-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs hover:bg-white hover:text-[#964407] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
              >
                View Dashboard <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Property Card 3: Copper Crest Estate */}
          <div className="group relative rounded-2xl border border-[#d7c2b9] overflow-hidden min-h-[360px] flex flex-col justify-end shadow-md hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 z-0 bg-[#201a17]">
              <div className="w-full h-full bg-gradient-to-br from-[#725949] to-[#201a17] opacity-90"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#201a17] via-[#201a17]/50 to-transparent"></div>
            </div>

            <div className="relative z-10 p-6 text-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-[#059669]/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 tracking-widest uppercase">
                  <Verified className="w-3 h-3" /> HEALTHY
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                  60 BEDS
                </span>
              </div>

              <div>
                <h3 className="font-serif text-2xl font-bold text-white">
                  Copper Crest Estate
                </h3>
                <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#ffb68e]" /> Hitech City, Hyderabad
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-left">
                <div>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    Occupancy
                  </p>
                  <p className="font-serif text-xl font-bold text-[#ffb68e]">100%</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    Rent Collection
                  </p>
                  <p className="font-serif text-xl font-bold text-emerald-400">100%</p>
                </div>
              </div>

              <Link
                href="/p/copper-crest/dashboard"
                className="w-full py-3.5 px-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs hover:bg-white hover:text-[#964407] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
              >
                View Dashboard <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 5: Add New Property Card */}
          <button className="group border-2 border-dashed border-[#d7c2b9] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[360px] hover:border-[#964407] hover:bg-[#f8ede3]/40 transition-all text-center active:scale-98">
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

      {/* Footer */}
      <footer className="py-6 border-t border-[#d7c2b9]/40 text-center text-xs text-[#554339]">
        © 2026 TenoPilot Inc. Single Source of Truth for Property Management.
      </footer>
    </div>
  );
}
