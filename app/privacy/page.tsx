import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Mail, FileText, CheckCircle2, ArrowLeft } from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Privacy Policy | TenoPilot.com",
  description:
    "Official Privacy Policy of TenoPilot.com. Understand how we collect, protect, and process data for property owners, PG residents, and hostel tenants in compliance with DPDPA and global standards.",
  alternates: {
    canonical: "https://www.tenopilot.com/privacy",
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 13, 2026";

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
            <Link href="/how-it-works" className="hover:text-[#964407] transition-colors">How It Works</Link>
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
            <ShieldCheck className="w-4 h-4" /> Legal & Data Protection
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#201a17] mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm md:text-base text-[#554339] max-w-2xl mx-auto leading-relaxed">
            How TenoPilot collects, secures, and handles information for property administrators, PG residents, and hostel guests.
          </p>
          <p className="text-xs text-[#554339]/70 mt-4 font-medium">
            Effective & Last Updated: <strong>{lastUpdated}</strong>
          </p>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="py-16 px-6 max-w-4xl mx-auto space-y-12 leading-relaxed text-[#3b2f27] text-sm sm:text-base">
        {/* Section 1 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">1</span>
            Introduction & Platform Scope
          </h2>
          <p>
            Welcome to <strong>TenoPilot.com</strong> (referred to as &quot;TenoPilot&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), an enterprise property operating system engineered for Paying Guest (PG) accommodations, student hostels, co-living facilities, and residential rental properties, operated by TenoPilot Inc. headquartered in Bengaluru, Karnataka, India.
          </p>
          <p>
            This Privacy Policy governs our data processing practices across our web portal, progressive web applications (PWA), administrative dashboards, and automated resident notification gateways. We are fully committed to upholding the privacy of both <strong>Property Owners/Managers</strong> (our direct SaaS subscribers) and <strong>Occupants/Tenants</strong> whose data is processed within the system.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">2</span>
            Information We Collect
          </h2>
          <p>
            To deliver precision property administration, digital rent invoicing, room allocation, and statutory police verification records, we process the following categories of information:
          </p>
          
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#d7c2b9]/60">
              <h3 className="font-bold text-[#201a17] text-sm sm:text-base mb-1">A. Property Owner & Administrator Information</h3>
              <p className="text-xs sm:text-sm text-[#554339]">
                Full name, administrative phone number, business email, property address, floor & room layout maps, bank account labels / UPI IDs configured for rent collection receipts, and security PIN authentication credentials.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#d7c2b9]/60">
              <h3 className="font-bold text-[#201a17] text-sm sm:text-base mb-1">B. Resident & Tenant Information (Data Processor Role)</h3>
              <p className="text-xs sm:text-sm text-[#554339]">
                Full legal name, phone number, email address, assigned room and bed identifier, check-in date, notice period, contractual monthly rent, security deposit amount, emergency contact numbers, and government-issued identity documents (Aadhaar, Passport, or Voter ID) collected strictly to assist property managers with mandatory local police tenant verification compliance.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#d7c2b9]/60">
              <h3 className="font-bold text-[#201a17] text-sm sm:text-base mb-1">C. Financial Transaction & Ledger Data</h3>
              <p className="text-xs sm:text-sm text-[#554339]">
                Dual-ledger records distinguishing monthly rent payments from refundable security deposits, payment methods (UPI, Cash desk, Net Banking), transaction dates, digital receipt numbers, and itemized move-out deduction records.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#d7c2b9]/60">
              <h3 className="font-bold text-[#201a17] text-sm sm:text-base mb-1">D. Technical & Diagnostic Data</h3>
              <p className="text-xs sm:text-sm text-[#554339]">
                Browser type, operating system, IP address, delivery receipt timestamps, bounce telemetry, and session cookies strictly required for authentication and security rate-limiting.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">3</span>
            Purpose & Lawful Basis of Processing
          </h2>
          <p>
            We process personal data strictly under lawful bases, including contractual necessity and statutory compliance under the Indian Information Technology Act, 2000, and the Digital Personal Data Protection Act (DPDPA), 2023:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
            <li><strong>SaaS Service Delivery:</strong> To calculate floor occupancy, bed availability, partner equity distributions, and dynamic pro-rata rent calculations.</li>
            <li><strong>Automated Transactional Communication:</strong> To dispatch payment receipts, rent due reminders, check-out settlement statements, and digital onboarding links requested by the user.</li>
            <li><strong>Regulatory Compliance:</strong> To generate standardized tenant registers required by local municipal and police authorities for residential accommodations.</li>
            <li><strong>Fraud Prevention & Ledger Integrity:</strong> To maintain tamper-resistant electronic accounting records and verify staff authorization using 2-step manager PINs.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">4</span>
            Strict No-Spam & Transactional Messaging Policy
          </h2>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed">
            <p className="font-bold mb-1">🛡️ Zero Marketing Spam Guarantee</p>
            TenoPilot maintains an uncompromising zero-tolerance policy against unsolicited email, SMS, and WhatsApp spam. We <strong>NEVER sell, rent, monetize, or disclose</strong> resident phone numbers or email addresses to third-party advertising networks, data brokers, or loan marketers.
          </div>
          <p>
            All messages dispatched through our infrastructure (via Amazon Simple Email Service, Brevo SMTP/API, or Meta WhatsApp Cloud API) meet the following criteria:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
            <li><strong>100% 1-to-1 Transactional:</strong> Every message corresponds to a discrete financial or administrative event (e.g., &quot;Rent Payment Receipt #REC-10492&quot;).</li>
            <li><strong>Verified Resident Consent:</strong> Recipients are active residents who provided their contact information upon room booking or digital onboarding check-in.</li>
            <li><strong>Automated Suppression Management:</strong> Any email address that triggers a hard bounce or complaint is automatically isolated and suppressed by our webhook engine to prevent future transmissions.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">5</span>
            Data Storage, Infrastructure & Security
          </h2>
          <p>
            We deploy multi-layered, enterprise-grade safeguards to protect your personal and property records:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
            <li><strong>Encryption at Rest & In Transit:</strong> All customer data is secured with AES-256 encryption at rest and TLS 1.3 protocol encryption during all web and API transmissions.</li>
            <li><strong>Cloud Architecture:</strong> Our databases and serverless endpoints are hosted on secure, certified Google Cloud / Firebase data centers with high-availability replication.</li>
            <li><strong>Access Controls:</strong> Administrative access is strictly restricted through multi-factor authentication, granular role-based permissions, and localized property PIN verification.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">6</span>
            Data Retention & Deletion Rights
          </h2>
          <p>
            We retain tenant and transaction records for the duration of the resident&apos;s active stay and for a reasonable statutory period thereafter to allow property owners to satisfy tax, accounting, and legal audit requirements.
          </p>
          <p>
            Tenants and Property Owners possess the right under the Digital Personal Data Protection Act to request access to, rectification of, or complete erasure of their personal information once all active tenancy dues, settlements, and statutory compliance periods have concluded.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">7</span>
            Grievance Redressal & Contact Officer
          </h2>
          <p>
            In compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the DPDPA, 2023, the details of our designated Grievance Officer are provided below:
          </p>
          <div className="p-6 rounded-xl bg-[#fff8f6] border border-[#d7c2b9] text-xs sm:text-sm space-y-2">
            <p><strong>Grievance Officer:</strong> H. V. Ramesh Darisi</p>
            <p><strong>Designation:</strong> Compliance & Operations Lead</p>
            <p><strong>Entity:</strong> TenoPilot Inc. / TenoPilot Operations</p>
            <p><strong>Registered Address:</strong> Mahadevapura, Bengaluru, Karnataka 560048, India</p>
            <p><strong>Direct Privacy Email:</strong> <a href="mailto:privacy@tenopilot.com" className="text-[#964407] font-semibold underline">privacy@tenopilot.com</a></p>
            <p><strong>General Support:</strong> <a href="mailto:support@tenopilot.com" className="text-[#964407] font-semibold underline">support@tenopilot.com</a></p>
            <p className="text-[#554339]/70 pt-2 text-[11px]">
              Grievances will be formally acknowledged within 24 hours and addressed within 15 business days as stipulated by applicable law.
            </p>
          </div>
        </section>
      </main>

      {/* Global Public Footer */}
      <PublicFooter />
    </div>
  );
}
