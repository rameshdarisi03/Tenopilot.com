"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
  X,
} from "lucide-react";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { occupantStore } from "@/constants/mockOccupants";
import { calculateOccupantFinancialStatement } from "@/utils/domainSSOT";

export interface PortfolioProperty {
  id: string;
  name: string;
  location: string;
  bedsCount: number;
  occupancyRate: string;
  collectionRate: string;
  status: "HEALTHY" | "TASKS PENDING";
  tasksCount?: number;
  gradient?: string;
}

export default function HomeWorkspacePage() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);

  // New property form state
  const [newPropName, setNewPropName] = useState("");
  const [newPropLocation, setNewPropLocation] = useState("");
  const [newPropBeds, setNewPropBeds] = useState(30);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to compute 100% LIVE real-time metrics for Sunshine Luxury PG
  const computeLiveSunshineMetrics = (): PortfolioProperty => {
    const structure = propertyStore.getStructure();
    let totalBeds = 0;
    let occupiedBeds = 0;

    structure.forEach((floor) => {
      floor.rooms.forEach((room) => {
        room.beds.forEach((bed) => {
          totalBeds++;
          if (bed.status === "Occupied" || bed.status === "Vacating" || bed.status === "Guest" || bed.occupant) {
            occupiedBeds++;
          }
        });
      });
    });

    const occPct = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) + "%" : "0%";

    const occupants = occupantStore.getOccupants();
    let totalPaid = 0;
    let totalDue = 0;

    occupants.forEach((occ) => {
      if (occ.lifecycleStatus !== "Past") {
        const stmt = calculateOccupantFinancialStatement(occ);
        totalPaid += stmt.totalPaid;
        totalDue += stmt.totalGrossDue;
      }
    });

    const colPct = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) + "%" : "100%";

    return {
      id: "sunshine-pg",
      name: "Sunshine Luxury PG",
      location: "Hitech City, Hyderabad",
      bedsCount: totalBeds || 52,
      occupancyRate: occPct,
      collectionRate: colPct,
      status: "HEALTHY",
    };
  };

  // Load live properties & subscribe to real-time store changes
  useEffect(() => {
    const liveSunshine = computeLiveSunshineMetrics();
    let customProps: PortfolioProperty[] = [];
    try {
      const saved = localStorage.getItem("tenopilot_portfolio_properties");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          customProps = parsed.filter((p: PortfolioProperty) => p.id !== "sunshine-pg");
        }
      }
    } catch (e) {
      console.error("Failed to load portfolio properties", e);
    }

    setProperties([liveSunshine, ...customProps]);

    // Reactive subscription to real-time propertyStore & occupantStore!
    const unsubProperty = propertyStore.subscribe(() => {
      const updatedLive = computeLiveSunshineMetrics();
      setProperties((prev) => [updatedLive, ...prev.filter((p) => p.id !== "sunshine-pg")]);
    });

    const unsubOccupant = occupantStore.subscribe(() => {
      const updatedLive = computeLiveSunshineMetrics();
      setProperties((prev) => [updatedLive, ...prev.filter((p) => p.id !== "sunshine-pg")]);
    });

    return () => {
      unsubProperty();
      unsubOccupant();
    };
  }, []);

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim()) return;

    const slugId = newPropName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newBuilding: PortfolioProperty = {
      id: slugId || `prop-${Date.now()}`,
      name: newPropName.trim(),
      location: newPropLocation.trim() || "Hyderabad, Telangana",
      bedsCount: Number(newPropBeds) || 30,
      occupancyRate: "100%",
      collectionRate: "100%",
      status: "HEALTHY",
    };

    const updatedProps = [...properties, newBuilding];
    setProperties(updatedProps);

    try {
      localStorage.setItem("tenopilot_portfolio_properties", JSON.stringify(updatedProps));
    } catch (err) {
      console.error("Failed to persist new property", err);
    }

    setNewPropName("");
    setNewPropLocation("");
    setNewPropBeds(30);
    setShowAddPropertyModal(false);

    triggerToast(`🏢 Successfully onboarded building "${newBuilding.name}" into portfolio!`);
  };

  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#201a17] flex flex-col justify-between selection:bg-[#964407] selection:text-white pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

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
              className="relative p-2 rounded-full hover:bg-[#f8ede3] text-[#554339] transition-colors active:scale-95 cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#964407]"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#f8ede3] transition-all active:scale-95 cursor-pointer"
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
            {properties.length} {properties.length === 1 ? "property" : "properties"} active in your portfolio. Tap a building card below to launch its operational dashboard.
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
                href="/p/sunshine-pg/overview"
                id="portfolio-dashboard-btn"
                className="w-full py-3.5 px-5 rounded-full bg-white text-[#964407] font-bold text-xs sm:text-sm hover:bg-[#fff8f6] transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                View Portfolio Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Dynamic Active Property Cards */}
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="group relative rounded-2xl border border-[#d7c2b9] overflow-hidden min-h-[360px] flex flex-col justify-end shadow-md hover:shadow-xl transition-all duration-300 bg-[#201a17]"
            >
              <div className="absolute inset-0 z-0 bg-[#201a17]">
                <div className="w-full h-full bg-gradient-to-br from-[#725949] to-[#201a17] opacity-90"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#201a17] via-[#201a17]/50 to-transparent"></div>
              </div>

              <div className="relative z-10 p-6 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-[#059669]/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 tracking-widest uppercase">
                    <Verified className="w-3 h-3" /> {prop.status}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                    {prop.bedsCount} BEDS
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-2xl font-bold text-white">
                    {prop.name}
                  </h3>
                  <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#ffb68e]" /> {prop.location}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-left">
                  <div>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                      Occupancy
                    </p>
                    <p className="font-serif text-xl font-bold text-[#ffb68e]">
                      {prop.occupancyRate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                      Rent Collection
                    </p>
                    <p className="font-serif text-xl font-bold text-emerald-400">
                      {prop.collectionRate}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/p/${prop.id}/overview`}
                  className="w-full py-3.5 px-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs hover:bg-white hover:text-[#964407] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                >
                  View Dashboard <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}

          {/* Card 3: Add New Property Card Trigger */}
          <button
            onClick={() => setShowAddPropertyModal(true)}
            className="group border-2 border-dashed border-[#d7c2b9] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[360px] hover:border-[#964407] hover:bg-[#f8ede3]/40 transition-all text-center active:scale-98 cursor-pointer"
          >
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

      {/* 🏢 ADD NEW PROPERTY MODAL */}
      {showAddPropertyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddPropertyModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-[#d7c2b9] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 text-xs text-[#201a17]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f8ede3] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#f8ede3] text-[#964407]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#201a17]">
                    Onboard New Building
                  </h3>
                  <p className="text-[11px] text-[#554339] font-medium">
                    Expand your PG / Hostel portfolio
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPropertyModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1">
                  Building / Property Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meridian Men's Executive PG"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-medium text-xs bg-[#fff8f6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1">
                  Location / Area *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gachibowli, Hyderabad"
                  value={newPropLocation}
                  onChange={(e) => setNewPropLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-medium text-xs bg-[#fff8f6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1">
                  Initial Bed Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={newPropBeds}
                  onChange={(e) => setNewPropBeds(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-medium text-xs bg-[#fff8f6]"
                />
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-[10px] text-orange-950 font-medium leading-relaxed">
                💡 <strong>Dynamic Routing:</strong> Adding this building creates a dedicated multi-tenant URL (`/p/${newPropName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/overview`) with its own isolated layout and financial ledger.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f8ede3]">
                <button
                  type="button"
                  onClick={() => setShowAddPropertyModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold cursor-pointer shadow-md transition-all"
                >
                  + Create & Register Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-[#d7c2b9]/40 text-center text-xs text-[#554339]">
        © 2026 TenoPilot Inc. Single Source of Truth for Property Management.
      </footer>
    </div>
  );
}
