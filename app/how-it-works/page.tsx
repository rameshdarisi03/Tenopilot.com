import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Building, Settings, LayoutGrid, UserPlus, TrendingUp } from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";

export const metadata: Metadata = {
  title: "How It Works — 5-Step Operational Guide | TenoPilot.com",
  description:
    "Discover how TenoPilot streamlines PG & Hostel management in 5 simple steps: Add property, configure settings, build floor layout, onboard tenants, and automate settlements.",
  alternates: {
    canonical: "https://www.tenopilot.com/how-it-works",
  },
  openGraph: {
    title: "How TenoPilot Works — 5-Step Operational Flow for PGs & Hostels",
    description:
      "From initial room setup to monthly partner distributions in 5 straightforward steps.",
    url: "https://www.tenopilot.com/how-it-works",
  },
};

export default function HowItWorksPage() {
  const steps = [
    {
      number: "01",
      icon: Building,
      title: "Add & Containerize Property",
      description:
        "Create your property profile under your organization. Set property address, total floors, operational manager, and bank details for rent routing.",
    },
    {
      number: "02",
      icon: Settings,
      title: "Configure Property Policies",
      description:
        "Set your default UPI payment QR code, electricity meter billing rates, security deposit rules, and notice period policies (e.g., 30 days).",
    },
    {
      number: "03",
      icon: LayoutGrid,
      title: "Design Floor & Room Layouts",
      description:
        "Visually configure floors, room numbers, AC/Non-AC tags, and bed slots (Single, Double, Triple sharing) with pricing tiers.",
    },
    {
      number: "04",
      icon: UserPlus,
      title: "Date-Aware Occupant Onboarding",
      description:
        "Onboard long-term monthly tenants with agreement KYC or short-term daily guests. Generate self-onboarding tokens via WhatsApp link.",
    },
    {
      number: "05",
      icon: TrendingUp,
      title: "Automated Profit Settlements & Reports",
      description:
        "Collect rents with auto-generated WhatsApp receipts. The settlement engine computes expenses, net operating profit, and partner share distributions.",
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
            <Link href="/features" className="hover:text-[#964407] transition-colors">Features</Link>
            <Link href="/how-it-works" className="text-[#964407] font-bold">How It Works</Link>
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
          Operational Flow
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#201a17] tracking-tight">
          From Setup to Pilot in Under 30 Minutes
        </h1>
        <p className="text-base sm:text-lg text-[#554339] max-w-2xl mx-auto mt-4 leading-relaxed">
          Follow our 5-step operational blueprint to transition from manual registers or spreadsheets to a precision operating system.
        </p>
      </header>

      {/* 5-Step Timeline Grid */}
      <main className="max-w-[1240px] mx-auto px-6 pb-24">
        <div className="space-y-8 mb-24">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-white border border-[#d7c2b9] flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 shadow-xs hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-serif font-bold text-4xl text-[#964407]/40">{step.number}</span>
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#964407] flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-serif font-bold text-2xl text-[#201a17] mb-2">{step.title}</h3>
                  <p className="text-[#554339] text-sm sm:text-base leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div className="rounded-3xl bg-[#964407] text-white p-10 md:p-14 text-center relative overflow-hidden">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Ready to Pilot Your PG?</h2>
          <p className="text-white/90 max-w-xl mx-auto mb-8 text-sm sm:text-base">
            Get full access with our 10-day free trial. Setup your first property today.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#964407] font-bold text-sm shadow-xl hover:bg-[#fff8f6] hover:scale-105 transition-all"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
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
            <Link href="/features" className="hover:text-[#964407] transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-[#964407] transition-colors">Pricing</Link>
            <Link href="/how-it-works" className="text-[#964407]">How It Works</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
