import Link from "next/link";
import {
  Building2,
  Users,
  ShieldCheck,
  ArrowRight,
  Wallet,
  CheckCircle2,
  XCircle,
  Sparkles,
  Hotel,
  School,
  Building,
  Landmark,
  PlayCircle,
  FileText,
  Wrench,
  Clock,
  ChevronRight,
  Check,
  HelpCircle,
} from "lucide-react";
import { LandingPageClient } from "@/components/LandingPageClient";
import { PWAInstallBanner } from "@/components/pwa/PWAInstallBanner";

export default function Home() {
  const faqData = [
    {
      question: "How fast can I onboard my PG or Hostel?",
      answer:
        "Most properties are fully operational within 30 minutes. You can set up your floors, rooms, and beds, configure notice terms and QR codes, and begin date-aware onboarding for tenants and guests immediately.",
    },
    {
      question: "How does TenoPilot handle Tenants vs Guests?",
      answer:
        "TenoPilot uses a unified Occupant Model. Long-term Tenants follow a monthly billing cycle with notice periods and rental agreements, while short-term Guests use check-in/out dates with zero agreement requirement and 100% automated check-out transitions.",
    },
    {
      question: "How are partner profit settlements calculated?",
      answer:
        "Our built-in Settlement Engine tracks all revenue operations (rent collections, guest stay charges) and operational expenses, automatically calculating net profit and partner share distributions based on configured ownership ratios.",
    },
    {
      question: "Is my business data secure and accessible offline?",
      answer:
        "Yes! TenoPilot uses enterprise-grade Firebase encryption at rest and in transit. Thanks to native offline persistence (ADR-005), mobile users can record payments and view occupancy even with intermittent internet connectivity.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#fff8f6] text-[#201a17] selection:bg-[#964407] selection:text-white">
      {/* 1. Global Navigation */}
      <nav className="sticky top-0 z-50 bg-[#fff8f6]/85 backdrop-blur-xl border-b border-[#d7c2b9]/60 transition-all">
        <div className="max-w-[1240px] mx-auto px-6 h-20 flex items-center justify-between">
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

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#554339]">
            <a href="#verticals" className="hover:text-[#964407] transition-colors">
              Verticals
            </a>
            <a href="#features" className="hover:text-[#964407] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#964407] transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-[#964407] transition-colors">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              id="nav-login-btn"
              className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-[#554339] hover:text-[#964407] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/home"
              id="nav-cta-btn"
              className="px-6 py-2.5 rounded-full bg-[#964407] hover:bg-[#c2652a] text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
            >
              Launch Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <header className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#f8ede3] text-[#964407] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-[#d7c2b9]">
            <span className="flex h-2 w-2 rounded-full bg-[#964407] animate-pulse"></span>
            Precision Rental OS
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#201a17] max-w-5xl mx-auto leading-[1.15]">
            The Master Key to Every{" "}
            <span className="text-[#964407] italic">Property, Room, and Bed.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#554339] max-w-2xl mx-auto mt-8 leading-relaxed font-normal">
            A high-performance rental operating system for modern PGs, Hostels, and Co-living. Eliminate operational chaos and scale your business with surgical clarity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 mb-16">
            <Link
              href="/home"
              id="hero-primary-cta"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#964407] hover:bg-[#c2652a] text-white text-base font-bold transition-all shadow-xl hover:shadow-[#964407]/20 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              Start 10-Day Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              id="hero-secondary-cta"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-[#201a17] text-base font-bold border border-[#d7c2b9] shadow-md hover:bg-[#f8ede3] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5 text-[#964407]" />
              Explore Features
            </a>
          </div>

          {/* 1-Click PWA Installation & QR Code Hero Card */}
          <div className="max-w-4xl mx-auto mb-12">
            <PWAInstallBanner />
          </div>
          <div className="relative max-w-5xl mx-auto mt-12 px-2 sm:px-0">
            {/* Desktop Browser Frame */}
            <div className="relative z-0 rounded-2xl overflow-hidden border border-[#d7c2b9] bg-white shadow-2xl transition-transform duration-700 hover:scale-[1.005]">
              <div className="bg-[#f2e6e0] h-11 flex items-center px-4 gap-2 border-b border-[#d7c2b9]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
                </div>
                <div className="ml-4 flex-1 max-w-md h-6 bg-white/70 rounded-md flex items-center px-3 text-[11px] text-[#554339]/60 font-mono">
                  tenopilot.com/p/prop-101/dashboard
                </div>
              </div>

              {/* Desktop Dashboard Preview Mockup */}
              <div className="p-6 md:p-8 bg-[#fff8f6] text-left">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-[#d7c2b9]/60">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#964407]">
                      Property Workspace
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-[#201a17]">
                      Sahara Heights Luxury PG
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge-available px-3 py-1 rounded-full text-xs font-bold">
                      Active Operational Status
                    </span>
                    <button className="px-4 py-2 rounded-lg bg-[#964407] text-white text-xs font-bold shadow-sm">
                      + New Occupant
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-white border border-[#d7c2b9]">
                    <span className="text-xs text-[#554339] font-medium">Total Beds</span>
                    <p className="text-2xl font-bold font-serif text-[#201a17] mt-1">48 Beds</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#d7c2b9]">
                    <span className="text-xs text-[#554339] font-medium">Occupancy</span>
                    <p className="text-2xl font-bold font-serif text-[#059669] mt-1">91.6%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#d7c2b9]">
                    <span className="text-xs text-[#554339] font-medium">Active Tenants</span>
                    <p className="text-2xl font-bold font-serif text-[#964407] mt-1">38 Tenants</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#d7c2b9]">
                    <span className="text-xs text-[#554339] font-medium">Active Guests</span>
                    <p className="text-2xl font-bold font-serif text-purple-700 mt-1">6 Guests</p>
                  </div>
                </div>

                {/* Floor Map Simulation */}
                <div className="p-5 rounded-xl bg-white border border-[#d7c2b9]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm text-[#201a17]">Floor 1 — Smart Bed Map</h4>
                    <span className="text-xs text-[#554339]">4 Rooms / 12 Beds</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-xs font-bold text-emerald-900 block">Room 101-A</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Available</span>
                    </div>
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                      <span className="text-xs font-bold text-rose-900 block">Room 101-B</span>
                      <span className="text-[10px] text-rose-700 font-semibold">Occupied (Tenant)</span>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <span className="text-xs font-bold text-purple-900 block">Room 102-A</span>
                      <span className="text-[10px] text-purple-700 font-semibold">Occupied (Guest)</span>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="text-xs font-bold text-amber-900 block">Room 102-B</span>
                      <span className="text-[10px] text-amber-700 font-semibold">Vacating 15 Aug</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlapping Mobile Frame */}
            <div className="absolute -bottom-10 -right-2 md:right-[-20px] z-20 w-5/12 max-w-[260px] hidden sm:block">
              <div className="rounded-[2.5rem] border-[6px] border-[#201a17] bg-[#201a17] shadow-2xl overflow-hidden text-left">
                <div className="bg-[#fff8f6] p-4 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-[#964407] uppercase">Mobile Pilot</span>
                    <span className="text-[10px] font-bold text-[#554339]">₹1,48,500</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#d7c2b9] mb-3">
                    <p className="text-[10px] text-[#554339] font-bold uppercase">Net Settlement</p>
                    <p className="text-lg font-serif font-bold text-[#964407]">₹1,12,400</p>
                    <p className="text-[9px] text-[#059669] font-semibold mt-1">✓ Partner Share Ready</p>
                  </div>
                  <div className="p-3 bg-[#964407] text-white rounded-xl shadow-sm">
                    <p className="text-[10px] text-white/80 font-bold uppercase">Quick Action</p>
                    <p className="text-xs font-bold mt-0.5">Collect Rent (WhatsApp)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Audience Verticals Section */}
      <section className="py-20 md:py-28 bg-white border-y border-[#d7c2b9]/60" id="verticals">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#964407] font-bold text-xs uppercase tracking-widest">
              Universal Operating System
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold mt-3 text-[#201a17]">
              Engineered for Every Rental Vertical
            </h2>
            <p className="text-[#554339] text-base sm:text-lg max-w-2xl mx-auto mt-4 leading-relaxed">
              Whether you manage a 15-bed PG or a 5,000-bed hostel chain, TenoPilot delivers operational clarity without structural rewrites.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="p-8 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] hover:border-[#964407] hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#964407]/10 text-[#964407] flex items-center justify-center mb-6">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#201a17] mb-2">PG Owners</h3>
              <p className="text-sm text-[#554339] leading-relaxed">
                Automate monthly rent collection, notice periods, and security deposit refunds.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] hover:border-[#964407] hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#964407]/10 text-[#964407] flex items-center justify-center mb-6">
                <Hotel className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#201a17] mb-2">Hostels</h3>
              <p className="text-sm text-[#554339] leading-relaxed">
                Bunk-level allocation and short-stay guest rotations managed effortlessly.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] hover:border-[#964407] hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#964407]/10 text-[#964407] flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#201a17] mb-2">Co-living</h3>
              <p className="text-sm text-[#554339] leading-relaxed">
                Manage shared services, partner settlements, and community amenities smoothly.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] hover:border-[#964407] hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#964407]/10 text-[#964407] flex items-center justify-center mb-6">
                <School className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#201a17] mb-2">Student Housing</h3>
              <p className="text-sm text-[#554339] leading-relaxed">
                Handle academic year intake cycles, parent contacts, and semester check-ins.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] hover:border-[#964407] hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#964407]/10 text-[#964407] flex items-center justify-center mb-6">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#201a17] mb-2">Multi-Property</h3>
              <p className="text-sm text-[#554339] leading-relaxed">
                Consolidated portfolio dashboards and single-property operational workspaces.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Problem vs TenoPilot Advantage Section */}
      <section className="py-20 md:py-28 bg-[#f8ede3] overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#ba1a1a] font-bold text-xs uppercase tracking-widest block mb-3">
                Stop Revenue Leakage
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#201a17] leading-tight mb-6">
                Spreadsheets & Chat Groups Are <span className="text-[#ba1a1a]">Silent Profit Killers.</span>
              </h2>
              <p className="text-base text-[#554339] leading-relaxed mb-8">
                If you run your PG using WhatsApp messages, paper notebooks, and Excel spreadsheets, you are leaking money through unrecorded expenses and forgotten rent dues.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center shrink-0 mt-1">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[#201a17]">Fragmented Data Silos</h4>
                    <p className="text-sm text-[#554339]">
                      Maintenance on WhatsApp, rent on Excel, Aadhaar photos in gallery. It&apos;s impossible to track true net profit.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center shrink-0 mt-1">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[#201a17]">Manual Settlement Disputes</h4>
                    <p className="text-sm text-[#554339]">
                      Partners arguing over who paid cash for diesel or generator repairs at month-end.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Solution Card */}
            <div className="relative">
              <div className="bg-white p-8 md:p-10 rounded-3xl border border-[#d7c2b9] shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-[#964407] rounded-xl flex items-center justify-center text-white">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="font-serif font-bold text-2xl text-[#201a17]">
                    The TenoPilot Advantage
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#964407]/30 flex justify-between items-center">
                    <span className="font-bold text-sm text-[#201a17]">Single-Entry Automation</span>
                    <span className="badge-available px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                      Zero Math
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#d7c2b9] flex justify-between items-center">
                    <span className="font-bold text-sm text-[#201a17]">Partner Settlement Engine</span>
                    <span className="badge-booked px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                      Auto Payouts
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#d7c2b9] flex justify-between items-center">
                    <span className="font-bold text-sm text-[#201a17]">Unified Tenant & Guest Hub</span>
                    <span className="badge-guest px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                      Purple Badge
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Stat Badge */}
              <div className="absolute -top-6 -right-4 bg-[#725949] text-white p-6 rounded-2xl shadow-xl hidden sm:block border-2 border-white">
                <p className="text-3xl font-serif font-bold">+35%</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-white/80">
                  Profit Clarity
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Showcase Features Section */}
      <section className="py-20 md:py-28 bg-white" id="features">
        <div className="max-w-[1240px] mx-auto px-6">
          {/* Feature 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
            <div className="order-2 lg:order-1 p-8 rounded-3xl bg-[#fff8f6] border border-[#d7c2b9] shadow-md">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white border border-[#d7c2b9] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xs">
                      W-104
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#201a17]">Geyser Repair — Room 204</p>
                      <p className="text-xs text-[#554339]">Logged by Occupant • High Priority</p>
                    </div>
                  </div>
                  <span className="badge-vacating px-2.5 py-1 rounded-full text-[10px] font-bold">
                    In Progress
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#d7c2b9] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      W-103
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#201a17]">WiFi Router Replacement</p>
                      <p className="text-xs text-[#554339]">Assigned to Vendor • ₹1,200 Expense</p>
                    </div>
                  </div>
                  <span className="badge-available px-2.5 py-1 rounded-full text-[10px] font-bold">
                    Resolved
                  </span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="text-[#964407] font-bold text-xs uppercase tracking-widest block mb-2">
                Operational Excellence
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl font-bold text-[#201a17] leading-tight mb-6">
                Maintenance Work Orders <span className="text-[#964407] italic">Linked to Expenses.</span>
              </h3>
              <p className="text-base text-[#554339] leading-relaxed mb-8">
                Record issues by floor, room, or bed. Track status from Open to Resolved, assign internal staff or external vendors, and log expenses directly without financial duplication.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-semibold text-[#201a17]">
                  <CheckCircle2 className="w-5 h-5 text-[#964407]" /> Property, Floor, Room & Bed location mapping
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-[#201a17]">
                  <CheckCircle2 className="w-5 h-5 text-[#964407]" /> Automated expense linking without ledger duplication
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-[#201a17]">
                  <CheckCircle2 className="w-5 h-5 text-[#964407]" /> Preserved resolution history and completion notes
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#964407] font-bold text-xs uppercase tracking-widest block mb-2">
                Legal & Identity Engine
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl font-bold text-[#201a17] leading-tight mb-6">
                Generated Agreements & <span className="text-[#964407] italic">Immutable Versioning.</span>
              </h3>
              <p className="text-base text-[#554339] leading-relaxed mb-8">
                Operational data is the single source of truth. Agreements compile automatically during onboarding for explicit review (`Agree & Continue`). Room transfers generate updated agreement versions while preserving history.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-semibold text-[#201a17]">
                  <CheckCircle2 className="w-5 h-5 text-[#964407]" /> Tenant Rental Agreements with notice terms preview
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-[#201a17]">
                  <CheckCircle2 className="w-5 h-5 text-[#964407]" /> Fast Guest onboarding (Agreement not required)
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold text-[#201a17]">
                  <CheckCircle2 className="w-5 h-5 text-[#964407]" /> Confetti success dialog upon profile activation
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-3xl bg-[#fff8f6] border border-[#d7c2b9] shadow-md">
              <div className="bg-white p-6 rounded-2xl border border-[#d7c2b9]">
                <div className="flex items-center justify-between pb-4 border-b border-[#d7c2b9]">
                  <div>
                    <h4 className="font-bold text-sm text-[#201a17]">Rental Agreement v2.0</h4>
                    <p className="text-xs text-[#554339]">Occupant: Amara Okafor (Room 204 Bed B)</p>
                  </div>
                  <span className="badge-available px-3 py-1 rounded-full text-[10px] font-bold">
                    Active Contract
                  </span>
                </div>
                <div className="py-4 text-xs text-[#554339] space-y-2 font-mono">
                  <p>• Monthly Rent: ₹12,500</p>
                  <p>• Security Deposit: ₹25,000</p>
                  <p>• Notice Period: 30 Days</p>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-[#964407] text-white text-xs font-bold">
                  Agree & Continue (Preview Verified)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Corrected 5-Step Operational Timeline Section */}
      <section className="py-20 md:py-28 bg-[#f8ede3]" id="how-it-works">
        <div className="max-w-[1240px] mx-auto px-6 text-center">
          <span className="text-[#964407] font-bold text-xs uppercase tracking-widest block mb-2">
            Simple 5-Step Flow
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#201a17] mb-16">
            From Setup to Pilot in Minutes
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-white border border-[#d7c2b9] shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-[#964407] text-white font-bold flex items-center justify-center mb-4">
                1
              </div>
              <h4 className="font-bold text-base text-[#201a17] mb-1">Add Property</h4>
              <p className="text-xs text-[#554339] leading-relaxed">
                Create your property container within the Organization.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#d7c2b9] shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-[#964407] text-white font-bold flex items-center justify-center mb-4">
                2
              </div>
              <h4 className="font-bold text-base text-[#201a17] mb-1">Configure Settings</h4>
              <p className="text-xs text-[#554339] leading-relaxed">
                Set payment QR codes, notice policies, and expense accounts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#d7c2b9] shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-[#964407] text-white font-bold flex items-center justify-center mb-4">
                3
              </div>
              <h4 className="font-bold text-base text-[#201a17] mb-1">Setup Floors & Rooms</h4>
              <p className="text-xs text-[#554339] leading-relaxed">
                Define floor levels, room numbers, and bed capacities.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#d7c2b9] shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-[#964407] text-white font-bold flex items-center justify-center mb-4">
                4
              </div>
              <h4 className="font-bold text-base text-[#201a17] mb-1">Onboard Occupants</h4>
              <p className="text-xs text-[#554339] leading-relaxed">
                Date-aware onboarding for Tenants and short-term Guests.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#d7c2b9] shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-[#964407] text-white font-bold flex items-center justify-center mb-4">
                5
              </div>
              <h4 className="font-bold text-base text-[#201a17] mb-1">Automated Settlements</h4>
              <p className="text-xs text-[#554339] leading-relaxed">
                Revenue, expenses, and partner profit shares calculate automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Transparent Pricing Section (INR Currency & 10-Day Trial) */}
      <section className="py-20 md:py-28 bg-white" id="pricing">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#964407] font-bold text-xs uppercase tracking-widest block mb-2">
              Transparent Pricing
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#201a17]">
              Simple Plans for Every Portfolio
            </h2>
            <p className="text-[#554339] text-base max-w-xl mx-auto mt-3">
              10-Day Full Access Trial included. Read-only mode preserves your reports if subscription pauses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="p-8 rounded-3xl bg-[#fff8f6] border border-[#d7c2b9] flex flex-col hover:shadow-lg transition-all">
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-[#554339]">
                  Starter
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-serif font-bold text-[#201a17]">₹999</span>
                  <span className="text-sm text-[#554339] font-medium">/month</span>
                </div>
                <p className="text-xs text-[#554339] mt-3">Up to 25 beds per property.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm font-medium text-[#201a17]">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Date-Aware Room Allocation
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Digital Rent Receipts (WhatsApp)
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Unified Tenant & Guest Directory
                </li>
              </ul>
              <Link
                href="/home"
                className="w-full text-center py-3.5 rounded-xl border-2 border-[#964407] text-[#964407] font-bold text-sm hover:bg-[#964407] hover:text-white transition-all"
              >
                Start 10-Day Free Trial
              </Link>
            </div>

            {/* Professional (Featured) */}
            <div className="p-8 rounded-3xl bg-white border-2 border-[#964407] shadow-xl relative flex flex-col scale-105 z-10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#964407] text-white text-[10px] font-bold px-4 py-1 rounded-full tracking-widest uppercase">
                MOST POPULAR
              </div>
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-[#554339]">
                  Professional
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-serif font-bold text-[#201a17]">₹2,499</span>
                  <span className="text-sm text-[#554339] font-medium">/month</span>
                </div>
                <p className="text-xs text-[#554339] mt-3">Up to 100 beds per property.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm font-medium text-[#201a17]">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Partner Settlement Engine
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Maintenance Work Order Tracking
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Automated Guest Checkouts
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Multi-Property Portfolio Dashboard
                </li>
              </ul>
              <Link
                href="/home"
                className="w-full text-center py-3.5 rounded-xl bg-[#964407] text-white font-bold text-sm shadow-md hover:bg-[#c2652a] transition-all"
              >
                Start 10-Day Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-3xl bg-[#fff8f6] border border-[#d7c2b9] flex flex-col hover:shadow-lg transition-all">
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-[#554339]">
                  Enterprise
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-serif font-bold text-[#201a17]">Custom</span>
                </div>
                <p className="text-xs text-[#554339] mt-3">Unlimited properties and beds.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm font-medium text-[#201a17]">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Custom Subdomain & Branding
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Granular Staff Role Permissions
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#964407]" /> Dedicated Account Specialist
                </li>
              </ul>
              <Link
                href="/home"
                className="w-full text-center py-3.5 rounded-xl border-2 border-[#964407] text-[#964407] font-bold text-sm hover:bg-[#964407] hover:text-white transition-all"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section className="py-20 md:py-28 bg-[#f8ede3]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#964407] font-bold text-xs uppercase tracking-widest block mb-2">
              Got Questions?
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#201a17]">
              Expert Answers for Property Owners
            </h2>
          </div>

          <LandingPageClient faqItems={faqData} />
        </div>
      </section>

      {/* 9. Final CTA Banner */}
      <section className="py-24 bg-[#964407] text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Join the Future of Rental Operations.
          </h2>
          <p className="text-lg text-white/90 mb-10 max-w-xl mx-auto leading-relaxed">
            Trade spreadsheet chaos for surgical clarity. Start managing your PG or Hostel with TenoPilot today.
          </p>
          <Link
            href="/home"
            id="final-cta-btn"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-white text-[#964407] font-bold text-base shadow-2xl hover:bg-[#fff8f6] hover:scale-105 transition-all"
          >
            Open Main Dashboard <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="bg-[#fff8f6] border-t border-[#d7c2b9]/60 py-16 px-6 text-xs text-[#554339]">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-base">
              T
            </div>
            <span className="font-serif font-bold text-xl text-[#201a17]">TenoPilot.com</span>
          </div>

          <p>© 2026 TenoPilot Inc. Engineered for Excellence in Property Management.</p>

          <div className="flex gap-6 font-semibold">
            <a href="#features" className="hover:text-[#964407] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#964407] transition-colors">Pricing</a>
            <a href="#how-it-works" className="hover:text-[#964407] transition-colors">How It Works</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
