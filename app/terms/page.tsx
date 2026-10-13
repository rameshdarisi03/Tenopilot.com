import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ArrowLeft, ShieldCheck, CheckCircle2, FileText } from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Terms of Service | TenoPilot.com",
  description:
    "Official Terms of Service for TenoPilot.com. Read the legal terms governing the use of our property operating system for PG owners, hostel managers, and residents.",
  alternates: {
    canonical: "https://www.tenopilot.com/terms",
  },
};

export default function TermsOfServicePage() {
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
            <Link href="/privacy" className="hover:text-[#964407] transition-colors">Privacy Policy</Link>
            <Link href="/refund-policy" className="hover:text-[#964407] transition-colors">Refund Policy</Link>
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
            <Scale className="w-4 h-4" /> Legal Agreement
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#201a17] mb-4">
            Terms of Service
          </h1>
          <p className="text-sm md:text-base text-[#554339] max-w-2xl mx-auto leading-relaxed">
            The legal terms, rules, and conditions governing the use of the TenoPilot software platform by property administrators and residents.
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
            Acceptance of Terms
          </h2>
          <p>
            By accessing, browsing, registering an account on <strong>TenoPilot.com</strong>, downloading our Progressive Web App (PWA), or utilizing any associated APIs, you agree to be legally bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy. If you do not agree to all terms and conditions, you must not access or use the platform.
          </p>
          <p>
            You represent and warrant that you are at least 18 years of age and possess the legal capacity to enter into a binding contractual agreement under the Indian Contract Act, 1872.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">2</span>
            Nature of Platform (Technology Intermediary)
          </h2>
          <p>
            TenoPilot is a specialized Business-to-Business (B2B) Software-as-a-Service (SaaS) property operating system engineered to assist Paying Guest (PG) owners, hostel administrators, and property managers in organizing room inventories, bed slots, dual-ledger accounting, and tenant communication.
          </p>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
            <strong>Important Clarification:</strong> TenoPilot Inc. is solely a technology provider. We are <strong>not</strong> a real estate broker, landlord, tenant representative, or financial depository. We do not own, lease, manage, inspect, or insure physical properties. Any tenancy agreement, rent amount, security deposit collection, or physical room condition is strictly an independent legal arrangement between the Property Owner and the Resident.
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">3</span>
            Property Owner Responsibilities
          </h2>
          <p>As a Property Owner, Manager, or authorized Partner utilizing TenoPilot, you agree to:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
            <li><strong>Accuracy of Listings & Layouts:</strong> Ensure that all floor maps, bed capacities, room sharing types, and rent fees entered into the platform accurately reflect actual physical premises.</li>
            <li><strong>Statutory & Police Verification Compliance:</strong> Comply with all local municipal, state, and police verification regulations regarding tenant onboarding and identity documentation in your respective jurisdiction.</li>
            <li><strong>Security Deposit Integrity:</strong> Handle resident security deposits, maintenance charges, and move-out refund settlements fairly and in adherence to agreed lease terms.</li>
            <li><strong>Account & PIN Protection:</strong> Safeguard your account credentials and 2-step manager PINs. You are solely responsible for actions performed under your authorized staff accounts.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">4</span>
            Resident & Tenant Conduct
          </h2>
          <p>When residents or guests interact with TenoPilot (such as completing digital self-onboarding or reviewing electronic receipts):</p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
            <li>You must provide truthful, complete, and legally authentic identification documents (e.g., Aadhaar, Passport, Student/Employee ID).</li>
            <li>You agree to receive electronic transactional notifications regarding your accommodation, including payment confirmations, monthly dues notices, and move-out settlement statements.</li>
            <li>You must not tamper with, reverse-engineer, or attempt unauthorized access to administrative portals or other resident records.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">5</span>
            Financial Calculations & Electronic Records
          </h2>
          <p>
            TenoPilot generates mathematical ledger calculations based on input provided by the property manager (including pro-rata rent calculations, security deposit credits, and deduction entries).
          </p>
          <p>
            In accordance with the Information Technology Act, 2000, all electronic payment receipts and settlement audit summaries generated by TenoPilot are valid electronic records. TenoPilot does not hold or escrow tenant rental funds; monetary payments occur directly between tenants and property bank/UPI accounts.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">6</span>
            Subscription, Trial & Payment Terms
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
            <li><strong>Free Trial:</strong> We offer a 10-day complimentary full-access trial for new property accounts. No credit card is required to initiate the trial.</li>
            <li><strong>Paid Subscriptions:</strong> Following the trial, continued access to automated messaging, multi-property reporting, and partner settlement modules requires an active subscription based on bed capacity.</li>
            <li><strong>Cancellation:</strong> You may cancel your subscription at any time via your property settings. Your access will remain active until the conclusion of your current billing period.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">7</span>
            Governing Law & Jurisdiction
          </h2>
          <p>
            These Terms shall be governed by, construed, and enforced in accordance with the substantive laws of India, without giving effect to any principles of conflict of laws.
          </p>
          <p>
            Any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof shall be subject to the exclusive jurisdiction of the competent courts situated in <strong>Bengaluru, Karnataka, India</strong>.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">8</span>
            Contact & Legal Inquiries
          </h2>
          <p>
            If you have any questions regarding these Terms or need to deliver formal legal notice, please contact us at:
          </p>
          <div className="p-6 rounded-xl bg-[#fff8f6] border border-[#d7c2b9] text-xs sm:text-sm space-y-1.5">
            <p><strong>Legal Department:</strong> TenoPilot Inc. / Operations</p>
            <p><strong>Location:</strong> Mahadevapura, Bengaluru, Karnataka 560048, India</p>
            <p><strong>Email:</strong> <a href="mailto:support@tenopilot.com" className="text-[#964407] font-semibold underline">support@tenopilot.com</a></p>
          </div>
        </section>
      </main>

      {/* Global Public Footer */}
      <PublicFooter />
    </div>
  );
}
