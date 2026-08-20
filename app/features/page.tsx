import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Wallet,
  Users,
  QrCode,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Receipt,
  Wrench,
  Clock,
  Building2,
} from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";

export const metadata: Metadata = {
  title: "PG & Hostel Management Features | TenoPilot.com",
  description:
    "Explore TenoPilot's rental operating engine: Date-aware bed allocation, WhatsApp rent invoicing, partner profit settlements, and 24/7 maintenance complaints.",
  alternates: {
    canonical: "https://www.tenopilot.com/features",
  },
  openGraph: {
    title: "TenoPilot.com Features — Precision Rental OS for PGs & Hostels",
    description:
      "Automate bed allocation, digital WhatsApp invoicing, multi-owner profit splits, and tenant maintenance ticketing.",
    url: "https://www.tenopilot.com/features",
  },
};

export default function FeaturesPage() {
  const featureList = [
    {
      icon: Sparkles,
      tag: "Room Allocation Engine",
      title: "Date-Aware Dynamic Room & Bed Allocation",
      description:
        "Eliminate spreadsheet confusion and double-bookings. Our calendar-synchronized bed slot engine computes exact check-in, notice, and checkout dates in real-time, giving you 100% accurate live occupancy rates.",
      highlights: [
        "Real-time vacating alerts & upcoming vacancy timeline",
        "Visual floor-by-floor room and bed map",
        "Prevent accidental overlaps with strict date guards",
        "Instant bed swapping and upgrade workflows",
      ],
      previewContent: (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-white border border-[#d7c2b9] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xs">
                W-104
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#201a17]">Executive Double Suite</h4>
                <p className="text-xs text-[#554339]">Bed A • Air-Conditioned</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-[#964407] border border-amber-200">
              Vacating in 4d
            </span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#d7c2b9] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                E-201
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#201a17]">Single Studio Deluxe</h4>
                <p className="text-xs text-[#554339]">Bed 1 • Balcony View</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Available Now
            </span>
          </div>
        </div>
      ),
    },
    {
      icon: Wallet,
      tag: "Settlement & Accounting",
      title: "Partner Profit Settlement & Financial Engine",
      description:
        "Manage single-owner or multi-partner properties with mathematical precision. Track every rent transaction, utility expense, and staff salary to calculate net operating profit and automated equity payouts.",
      highlights: [
        "Configurable multi-owner profit share percentages (e.g. 60/40, 50/50)",
        "Automated revenue collection ledger with UPI & Cash tags",
        "Categorized expense logging (Electricity, Wi-Fi, Cook, Maintenance)",
        "1-Click PDF Financial Statements & Monthly Summaries",
      ],
      previewContent: (
        <div className="p-6 rounded-2xl bg-white border border-[#d7c2b9] space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-[#d7c2b9]/60 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#554339]">Net Monthly Profit</span>
            <span className="font-serif font-bold text-2xl text-[#201a17]">₹4,82,500</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-[#554339]">Gross Rent Collected</span>
              <span className="font-bold text-emerald-700">+₹5,80,000</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-[#554339]">Operating Expenses</span>
              <span className="font-bold text-rose-700">-₹97,500</span>
            </div>
            <div className="flex justify-between py-1 pt-2 font-bold text-[#964407]">
              <span>Partner A (60%) Share</span>
              <span>₹2,89,500</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Users,
      tag: "KYC & Directory",
      title: "Unified Tenant & Daily Guest Directory",
      description:
        "Manage long-term monthly tenants and short-term daily guests in one cohesive directory. Store Aadhaar KYC, emergency contacts, notice terms, and payment histories securely.",
      highlights: [
        "Contactless self-onboarding tokens via WhatsApp link",
        "Aadhaar card and ID document vault with encryption",
        "Distinct billing models: Monthly rent vs Daily tariff",
        "Automated guest checkout state transitions",
      ],
      previewContent: (
        <div className="p-6 rounded-2xl bg-white border border-[#d7c2b9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#d7c2b9]/60 pb-3">
            <span className="font-bold text-sm text-[#201a17]">Self-Onboarding Token</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              KYC Verified
            </span>
          </div>
          <div className="py-2 text-xs text-[#554339] space-y-1.5 font-mono">
            <p>• Tenant: Rahul Verma (Room 302-A)</p>
            <p>• Monthly Rent: ₹12,500</p>
            <p>• Security Deposit: ₹25,000</p>
            <p>• Notice Period: 30 Days</p>
          </div>
        </div>
      ),
    },
    {
      icon: QrCode,
      tag: "Maintenance & Ticketing",
      title: "24/7 QR Code Complaints Desk",
      description:
        "Empower residents to report plumbing, electrical, Wi-Fi, or housekeeping issues in seconds by scanning a QR code placed in corridors — zero tenant login required.",
      highlights: [
        "Dedicated public complaint page per property",
        "10-digit mobile auto-verification of active residents",
        "Category tagging (Plumbing, Electrical, Wi-Fi, AC, Housekeeping)",
        "Real-time ticket updates and resolution timestamps",
      ],
      previewContent: (
        <div className="p-6 rounded-2xl bg-white border border-[#d7c2b9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#d7c2b9]/60 pb-3">
            <span className="font-bold text-sm text-[#201a17]">Ticket #CMP-104</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-[#964407] border border-amber-200">
              In Progress
            </span>
          </div>
          <div className="py-2 text-xs text-[#554339] space-y-1">
            <p className="font-bold text-[#201a17]">Geyser heating failure in bathroom</p>
            <p className="text-[#554339]">Room 204 • Logged 25m ago</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#fff8f6] text-[#201a17]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#fff8f6]/85 backdrop-blur-xl border-b border-[#d7c2b9]/60">
        <div className="max-w-[1240px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <TenoPilotLogo size="md" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#554339]">
            <Link href="/verticals" className="hover:text-[#964407] transition-colors">Verticals</Link>
            <Link href="/features" className="text-[#964407] font-bold">Features</Link>
            <Link href="/how-it-works" className="hover:text-[#964407] transition-colors">How It Works</Link>
            <Link href="/pricing" className="hover:text-[#964407] transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-[#554339] hover:text-[#964407] px-3 py-2">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2 rounded-xl bg-white border border-[#d7c2b9] hover:border-[#964407] text-[#201a17] font-bold text-sm shadow-xs"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="pt-16 pb-12 text-center max-w-4xl mx-auto px-6">
        <div className="inline-flex items-center gap-2 bg-[#f8ede3] text-[#964407] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-[#d7c2b9]">
          <Building2 className="w-3.5 h-3.5" /> Built for Scale & Precision
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#201a17] tracking-tight">
          Everything You Need to Run High-Performing Properties
        </h1>
        <p className="text-base sm:text-lg text-[#554339] max-w-2xl mx-auto mt-4 leading-relaxed">
          From first check-in to automated partner settlements, TenoPilot replaces disconnected spreadsheets with a unified operating system.
        </p>
      </header>

      {/* Feature Deep Dives */}
      <main className="max-w-[1240px] mx-auto px-6 pb-24 space-y-24">
        {featureList.map((item, idx) => {
          const Icon = item.icon;
          const isEven = idx % 2 === 0;
          return (
            <div
              key={idx}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center`}
            >
              <div className={isEven ? "order-1" : "order-1 lg:order-2"}>
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#964407] flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[#964407] font-bold text-xs uppercase tracking-widest block mb-2">
                  {item.tag}
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#201a17] mb-4">
                  {item.title}
                </h2>
                <p className="text-[#554339] text-base leading-relaxed mb-6">
                  {item.description}
                </p>
                <ul className="space-y-3 text-sm font-semibold text-[#201a17]">
                  {item.highlights.map((highlight, hIdx) => (
                    <li key={hIdx} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#964407] shrink-0" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={isEven ? "order-2" : "order-2 lg:order-1"}>
                <div className="p-8 rounded-3xl bg-[#fff8f6] border border-[#d7c2b9] shadow-md">
                  {item.previewContent}
                </div>
              </div>
            </div>
          );
        })}

        {/* CTA */}
        <div className="rounded-3xl bg-[#964407] text-white p-10 md:p-14 text-center relative overflow-hidden">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Experience TenoPilot on Your Properties</h2>
          <p className="text-white/90 max-w-xl mx-auto mb-8 text-sm sm:text-base">
            Start with our 10-day free trial. Setup your property in under 30 minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#964407] font-bold text-sm shadow-xl hover:bg-[#fff8f6] hover:scale-105 transition-all"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#fff8f6] border-t border-[#d7c2b9]/60 py-12 px-6 text-xs text-[#554339] mt-auto">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-base">
              T
            </div>
            <span className="font-serif font-bold text-xl text-[#201a17]">TenoPilot.com</span>
          </div>
          <p>© 2026 TenoPilot Inc. Engineered for Excellence in Property Management.</p>
          <div className="flex gap-6 font-semibold">
            <Link href="/features" className="text-[#964407]">Features</Link>
            <Link href="/pricing" className="hover:text-[#964407] transition-colors">Pricing</Link>
            <Link href="/how-it-works" className="hover:text-[#964407] transition-colors">How It Works</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
