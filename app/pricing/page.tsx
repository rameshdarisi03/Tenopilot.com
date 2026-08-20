import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, HelpCircle, ShieldCheck, Sparkles, Building2 } from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";

export const metadata: Metadata = {
  title: "Pricing Plans & 10-Day Free Trial | TenoPilot.com",
  description:
    "Explore transparent pricing plans for PG, Hostel & Co-Living management. Starter at ₹999/mo, Professional at ₹2,499/mo. 100% free 10-day trial with full access.",
  alternates: {
    canonical: "https://www.tenopilot.com/pricing",
  },
  openGraph: {
    title: "TenoPilot.com Pricing — Plans from ₹999/mo for PGs & Hostels",
    description:
      "Simple, transparent pricing. Date-aware bed allocation, automated rent collection, and partner settlement engine.",
    url: "https://www.tenopilot.com/pricing",
  },
};

export default function PricingPage() {
  const comparisonRows = [
    { feature: "Bed Capacity", starter: "Up to 25 Beds", pro: "Up to 100 Beds", enterprise: "Unlimited" },
    { feature: "Date-Aware Room Allocation", starter: true, pro: true, enterprise: true },
    { feature: "WhatsApp Digital Invoicing & Receipts", starter: true, pro: true, enterprise: true },
    { feature: "Unified Tenant & Guest KYC Directory", starter: true, pro: true, enterprise: true },
    { feature: "Partner Profit Settlement Engine", starter: false, pro: true, enterprise: true },
    { feature: "24/7 QR Complaints & Maintenance Portal", starter: false, pro: true, enterprise: true },
    { feature: "Automated Daily Guest Checkouts", starter: false, pro: true, enterprise: true },
    { feature: "Multi-Property Master Dashboard", starter: false, pro: true, enterprise: true },
    { feature: "Custom Subdomain & White-Label Branding", starter: false, pro: false, enterprise: true },
    { feature: "Dedicated Account Specialist", starter: false, pro: false, enterprise: true },
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
            <Link href="/how-it-works" className="hover:text-[#964407] transition-colors">How It Works</Link>
            <Link href="/pricing" className="text-[#964407] font-bold">Pricing</Link>
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

      {/* Hero Header */}
      <header className="pt-16 pb-12 text-center max-w-4xl mx-auto px-6">
        <div className="inline-flex items-center gap-2 bg-[#f8ede3] text-[#964407] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-[#d7c2b9]">
          <Sparkles className="w-3.5 h-3.5" /> Simple, Transparent Pricing
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#201a17] tracking-tight">
          Invest in Clarity. Scale with Confidence.
        </h1>
        <p className="text-base sm:text-lg text-[#554339] max-w-2xl mx-auto mt-4 leading-relaxed">
          Every plan includes a 10-Day Full Access Free Trial. No hidden fees. Read-only mode preserves your financial data if your subscription ever pauses.
        </p>
      </header>

      {/* Pricing Cards Grid */}
      <main className="max-w-[1240px] mx-auto px-6 pb-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-24">
          {/* Starter */}
          <div className="p-8 rounded-3xl bg-white border border-[#d7c2b9] flex flex-col shadow-xs hover:shadow-md transition-all">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#554339]">Starter Plan</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-serif font-bold text-[#201a17]">₹999</span>
                <span className="text-sm text-[#554339] font-medium">/month</span>
              </div>
              <p className="text-xs text-[#554339] mt-3">Ideal for boutique PGs & small guest homes up to 25 beds.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-sm font-medium text-[#201a17]">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Date-Aware Room Allocation
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Digital WhatsApp Rent Receipts
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Unified Tenant & Guest Directory
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Offline Data Synchronization
              </li>
            </ul>
            <Link
              href="/signup"
              className="w-full text-center py-3.5 rounded-xl border-2 border-[#964407] text-[#964407] font-bold text-sm hover:bg-[#964407] hover:text-white transition-all"
            >
              Start 10-Day Free Trial
            </Link>
          </div>

          {/* Professional (Featured) */}
          <div className="p-8 rounded-3xl bg-white border-2 border-[#964407] shadow-xl relative flex flex-col scale-105 z-10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#964407] text-white text-[10px] font-bold px-4 py-1 rounded-full tracking-widest uppercase shadow-sm">
              MOST POPULAR
            </div>
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#554339]">Professional Plan</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-serif font-bold text-[#201a17]">₹2,499</span>
                <span className="text-sm text-[#554339] font-medium">/month</span>
              </div>
              <p className="text-xs text-[#554339] mt-3">Engineered for scaling PGs, hostels, and multi-partner operations up to 100 beds.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-sm font-medium text-[#201a17]">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Partner Profit Settlement Engine
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> 24/7 QR Complaints & Work Orders
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Automated Daily Guest Checkouts
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Multi-Property Portfolio Dashboard
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Staff RBAC Permission Controls
              </li>
            </ul>
            <Link
              href="/signup"
              className="w-full text-center py-3.5 rounded-xl bg-[#964407] text-white font-bold text-sm shadow-md hover:bg-[#c2652a] transition-all"
            >
              Start 10-Day Free Trial
            </Link>
          </div>

          {/* Enterprise */}
          <div className="p-8 rounded-3xl bg-white border border-[#d7c2b9] flex flex-col shadow-xs hover:shadow-md transition-all">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#554339]">Enterprise Plan</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-serif font-bold text-[#201a17]">Custom</span>
              </div>
              <p className="text-xs text-[#554339] mt-3">For large co-living brands, hostel chains, and campus portfolios with 100+ beds.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-sm font-medium text-[#201a17]">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Unlimited Properties & Beds
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Custom Subdomain & Branding
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Dedicated Account Specialist
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#964407]" /> Custom ERP & Accounting Integrations
              </li>
            </ul>
            <Link
              href="/signup"
              className="w-full text-center py-3.5 rounded-xl border-2 border-[#964407] text-[#964407] font-bold text-sm hover:bg-[#964407] hover:text-white transition-all"
            >
              Contact Enterprise Sales
            </Link>
          </div>
        </div>

        {/* Feature Comparison Matrix */}
        <section className="bg-white rounded-3xl border border-[#d7c2b9] p-8 md:p-12 shadow-xs mb-20">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl font-bold text-[#201a17]">Detailed Plan Comparison</h2>
            <p className="text-sm text-[#554339] mt-2">Compare capabilities across all TenoPilot editions.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#d7c2b9]/80">
                  <th className="pb-4 font-bold text-[#201a17]">Feature</th>
                  <th className="pb-4 font-bold text-[#201a17] text-center">Starter</th>
                  <th className="pb-4 font-bold text-[#964407] text-center">Professional</th>
                  <th className="pb-4 font-bold text-[#201a17] text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d7c2b9]/40">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#fff8f6]/60 transition-colors">
                    <td className="py-4 font-medium text-[#201a17]">{row.feature}</td>
                    <td className="py-4 text-center">
                      {typeof row.starter === "boolean" ? (
                        row.starter ? (
                          <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-[#554339]">{row.starter}</span>
                      )}
                    </td>
                    <td className="py-4 text-center bg-orange-50/30">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check className="w-4 h-4 text-[#964407] mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )
                      ) : (
                        <span className="text-xs font-bold text-[#964407]">{row.pro}</span>
                      )}
                    </td>
                    <td className="py-4 text-center">
                      {typeof row.enterprise === "boolean" ? (
                        row.enterprise ? (
                          <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-[#554339]">{row.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Final CTA */}
        <div className="rounded-3xl bg-[#964407] text-white p-10 md:p-14 text-center relative overflow-hidden">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Start Your 10-Day Free Trial Today</h2>
          <p className="text-white/90 max-w-xl mx-auto mb-8 text-sm sm:text-base">
            Join hundreds of PG & Hostel owners managing properties with surgical accuracy.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#964407] font-bold text-sm shadow-xl hover:bg-[#fff8f6] hover:scale-105 transition-all"
          >
            Create Your Free Account <ArrowRight className="w-4 h-4" />
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
            <Link href="/pricing" className="text-[#964407]">Pricing</Link>
            <Link href="/how-it-works" className="hover:text-[#964407] transition-colors">How It Works</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
