import type { Metadata } from "next";
import Link from "next/link";
import { Hotel, School, Building, Landmark, ArrowRight, CheckCircle2 } from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";

export const metadata: Metadata = {
  title: "Industry Verticals — PG, Hostel & Co-Living Solutions | TenoPilot.com",
  description:
    "Tailored property management solutions for Paying Guest (PG) accommodations, Student Hostels, Co-Living communities, and Serviced Apartments in India.",
  alternates: {
    canonical: "https://www.tenopilot.com/verticals",
  },
  openGraph: {
    title: "TenoPilot.com Solutions — Tailored for PGs, Hostels & Co-Living",
    description:
      "Engineered to match the operational dynamics of student hostels, executive PGs, and multi-location co-living operators.",
    url: "https://www.tenopilot.com/verticals",
  },
};

export default function VerticalsPage() {
  const verticals = [
    {
      icon: Hotel,
      title: "Paying Guest (PG) Accommodations",
      tagline: "For executive & working professional residences",
      description:
        "Automate monthly rent collection cycles, notice period governance, electricity sub-meter calculations, and partner profit distributions.",
      features: [
        "Monthly automated WhatsApp rent invoices with UPI QR",
        "Aadhaar KYC & digital token self-onboarding",
        "Configurable notice period rules (15/30/45 days)",
        "Partner profit split ledger with automated accounting",
      ],
    },
    {
      icon: School,
      title: "Student Hostels & Campus Housing",
      tagline: "For university dorms & coaching hub accommodations",
      description:
        "Manage semester billing schedules, parental emergency contacts, room allocation by batches, and digital attendance logs.",
      features: [
        "Semester & academic term billing cycles",
        "Emergency guardian and college verification records",
        "Mess & housekeeping maintenance ticket workflows",
        "Real-time room occupancy and vacating trackers",
      ],
    },
    {
      icon: Building,
      title: "Modern Co-Living Communities",
      tagline: "For premium, amenity-rich urban shared living",
      description:
        "Delight residents with a 24/7 QR maintenance complaint portal, digital agreements, instant bed upgrades, and community announcements.",
      features: [
        "24/7 Corridor QR complaint ticketing desk",
        "Flexible check-in / check-out date flexibility",
        "Transparent utility & common amenity expense splitting",
        "Multi-property central management console",
      ],
    },
    {
      icon: Landmark,
      title: "Short-Stay & Serviced Apartments",
      tagline: "For hybrid daily guests and temporary lodgings",
      description:
        "Manage daily tariff rates, date-based booking schedules, instant checkouts, and zero-agreement guest records effortlessly.",
      features: [
        "Day-wise guest stay charging and invoices",
        "Zero-agreement streamlined check-in workflows",
        "Automated room readiness & cleaning indicators",
        "Unified financial reporting across short & long stays",
      ],
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
            <Link href="/verticals" className="text-[#964407] font-bold">Verticals</Link>
            <Link href="/features" className="hover:text-[#964407] transition-colors">Features</Link>
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
          Tailored Solutions
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#201a17] tracking-tight">
          Purpose-Built for Every Rental Model
        </h1>
        <p className="text-base sm:text-lg text-[#554339] max-w-2xl mx-auto mt-4 leading-relaxed">
          Whether you operate a 20-bed boutique PG or a 500-bed student housing portfolio, TenoPilot adapts to your specific operational workflows.
        </p>
      </header>

      {/* Verticals Grid */}
      <main className="max-w-[1240px] mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {verticals.map((vert, idx) => {
            const Icon = vert.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-white border border-[#d7c2b9] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#964407] flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h2 className="font-serif font-bold text-2xl text-[#201a17] mb-1">{vert.title}</h2>
                  <p className="text-xs font-semibold text-[#964407] mb-4">{vert.tagline}</p>
                  <p className="text-[#554339] text-sm leading-relaxed mb-6">{vert.description}</p>
                  <ul className="space-y-3 text-xs sm:text-sm font-semibold text-[#201a17] mb-8">
                    {vert.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#964407] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/signup"
                  className="w-full text-center py-3 rounded-xl border border-[#d7c2b9] hover:border-[#964407] hover:bg-[#fff8f6] text-[#201a17] font-bold text-xs transition-all"
                >
                  Start 10-Day Free Trial
                </Link>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="rounded-3xl bg-[#964407] text-white p-10 md:p-14 text-center relative overflow-hidden">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Start Managing Your Property Today</h2>
          <p className="text-white/90 max-w-xl mx-auto mb-8 text-sm sm:text-base">
            No credit card required. Experience surgical operational clarity on your properties.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#964407] font-bold text-sm shadow-xl hover:bg-[#fff8f6] hover:scale-105 transition-all"
          >
            Create Your Account <ArrowRight className="w-4 h-4" />
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
            <Link href="/verticals" className="text-[#964407]">Verticals</Link>
            <Link href="/features" className="hover:text-[#964407] transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-[#964407] transition-colors">Pricing</Link>
            <Link href="/how-it-works" className="hover:text-[#964407] transition-colors">How It Works</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
