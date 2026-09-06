import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, HelpCircle, ShieldCheck, Sparkles, Building2 } from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";

import { DynamicPricingSection } from "@/components/pricing/DynamicPricingSection";
import { DynamicPricingSubtitle, DynamicPricingBottomCta } from "@/components/pricing/DynamicPricingHero";

export const metadata: Metadata = {
  title: "Pricing Plans & Free Trial | TenoPilot.com",
  description:
    "Explore transparent pricing plans for PG, Hostel & Co-Living management. 100% free trial with full access. Date-aware allocation, FastTrack AI, and automated partner settlement.",
  alternates: {
    canonical: "https://www.tenopilot.com/pricing",
  },
  openGraph: {
    title: "TenoPilot.com Pricing — Plans for PGs & Hostels",
    description:
      "Simple, transparent pricing. Date-aware bed allocation, automated rent collection, and partner settlement engine.",
    url: "https://www.tenopilot.com/pricing",
  },
};

export default function PricingPage() {
  const comparisonRows = [
    { feature: "Bed Capacity", starter: "Up to 50 Beds", pro: "Up to 300 Beds", enterprise: "Unlimited" },
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
        <DynamicPricingSubtitle />
      </header>

      {/* Pricing Cards Grid */}
      <main className="max-w-[1240px] mx-auto px-6 pb-24 w-full">
        <div className="mb-24">
          <DynamicPricingSection variant="pricing" />
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
        <DynamicPricingBottomCta />
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
