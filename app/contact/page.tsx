import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone, Clock, ShieldCheck, ArrowLeft, MessageSquare } from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Contact Us & Grievance Redressal | TenoPilot.com",
  description:
    "Get in touch with the TenoPilot operations and technical support team. Registered office in Bengaluru, India. Dedicated assistance for PG owners, hostel managers, and residents.",
  alternates: {
    canonical: "https://www.tenopilot.com/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fff8f6] text-[#201a17]">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-[#fff8f6]/85 backdrop-blur-xl border-b border-[#d7c2b9]/60">
        <div className="max-w-[1240px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <TenoPilotLogo size="md" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#554339]">
            <Link href="/features" className="hover:text-[#964407] transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-[#964407] transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-[#964407] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#964407] transition-colors">Terms of Service</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#554339] hover:text-[#964407] px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="py-16 md:py-20 bg-gradient-to-b from-[#f8ede3] to-[#fff8f6] border-b border-[#d7c2b9]/40">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#964407]/10 text-[#964407] text-xs font-bold uppercase tracking-wider mb-4 border border-[#964407]/20">
            <Mail className="w-4 h-4" /> Connect with Us
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#201a17] mb-4">
            Contact & Support
          </h1>
          <p className="text-sm md:text-base text-[#554339] max-w-2xl mx-auto leading-relaxed">
            Have questions about TenoPilot, onboarding your properties, or need technical assistance? Our engineering and support team is here to help.
          </p>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="py-16 px-6 max-w-5xl mx-auto space-y-12 leading-relaxed text-[#3b2f27]">
        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Technical & General Support */}
          <div className="bg-white p-8 rounded-2xl border border-[#d7c2b9]/60 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#964407] flex items-center justify-center mb-4">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#201a17] mb-2">Customer & Tech Support</h3>
              <p className="text-xs text-[#554339] leading-relaxed mb-4">
                For property setup help, WhatsApp gateway inquiries, or account troubleshooting.
              </p>
            </div>
            <div className="pt-4 border-t border-[#d7c2b9]/40">
              <a
                href="mailto:support@tenopilot.com"
                className="text-sm font-bold text-[#964407] hover:underline"
              >
                support@tenopilot.com
              </a>
              <p className="text-[11px] text-[#554339]/70 mt-1">Average response: &lt; 2 hours</p>
            </div>
          </div>

          {/* Card 2: Sales & Property Pilots */}
          <div className="bg-white p-8 rounded-2xl border border-[#d7c2b9]/60 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#201a17] mb-2">Portfolio Onboarding</h3>
              <p className="text-xs text-[#554339] leading-relaxed mb-4">
                Managing 100+ beds or multi-branch student hostels? Request custom onboarding support.
              </p>
            </div>
            <div className="pt-4 border-t border-[#d7c2b9]/40">
              <a
                href="mailto:sales@tenopilot.com"
                className="text-sm font-bold text-[#964407] hover:underline"
              >
                sales@tenopilot.com
              </a>
              <p className="text-[11px] text-[#554339]/70 mt-1">Direct account manager support</p>
            </div>
          </div>

          {/* Card 3: Privacy & Grievances */}
          <div className="bg-white p-8 rounded-2xl border border-[#d7c2b9]/60 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#201a17] mb-2">Privacy & Grievances</h3>
              <p className="text-xs text-[#554339] leading-relaxed mb-4">
                For DPDPA data subject inquiries, suppression requests, or legal notices.
              </p>
            </div>
            <div className="pt-4 border-t border-[#d7c2b9]/40">
              <a
                href="mailto:privacy@tenopilot.com"
                className="text-sm font-bold text-[#964407] hover:underline"
              >
                privacy@tenopilot.com
              </a>
              <p className="text-[11px] text-[#554339]/70 mt-1">Official Grievance Desk</p>
            </div>
          </div>
        </div>

        {/* Corporate Headquarters & Office Details */}
        <section className="bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-[#964407] font-bold text-xs uppercase tracking-widest block mb-2">
                Operational Base
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#201a17] mb-4">
                Registered Headquarters
              </h2>
              <p className="text-sm text-[#554339] leading-relaxed mb-6">
                TenoPilot operates from Bengaluru, India&apos;s technology capital, providing high-availability cloud infrastructure to residential property managers across the country.
              </p>
              
              <div className="space-y-3 text-sm text-[#3b2f27]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#964407] shrink-0 mt-0.5" />
                  <div>
                    <strong>TenoPilot Inc. / Operations</strong>
                    <p className="text-xs text-[#554339] mt-0.5">
                      Mahadevapura, Bengaluru, Karnataka 560048, India
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#964407] shrink-0" />
                  <div>
                    <strong>Operational Hours:</strong>
                    <p className="text-xs text-[#554339]">Monday – Saturday, 9:00 AM – 7:00 PM IST</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#fff8f6] p-6 rounded-xl border border-[#d7c2b9]/60">
              <h4 className="font-bold text-sm text-[#201a17] mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#964407]" />
                Statutory Compliance Notice
              </h4>
              <p className="text-xs text-[#554339] leading-relaxed mb-3">
                In compliance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act (DPDPA), 2023, resident requests for data inspection, correction, or deletion are formally recorded and attended to by our designated Grievance Officer.
              </p>
              <div className="text-xs text-[#554339] space-y-1 bg-white p-3 rounded-lg border border-[#d7c2b9]/40">
                <p><strong>Grievance Officer:</strong> Ramesh Darisi</p>
                <p><strong>Email:</strong> privacy@tenopilot.com</p>
                <p><strong>City:</strong> Bengaluru, Karnataka, India</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Global Public Footer */}
      <PublicFooter />
    </div>
  );
}
