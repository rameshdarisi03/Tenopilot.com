import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCw, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | TenoPilot.com",
  description:
    "Official Refund and Cancellation Policy of TenoPilot.com. Understand our SaaS software subscription cancellation terms and tenant security deposit settlement policies.",
  alternates: {
    canonical: "https://www.tenopilot.com/refund-policy",
  },
};

export default function RefundPolicyPage() {
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
            <RefreshCw className="w-4 h-4" /> Billing & Settlements
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#201a17] mb-4">
            Refund & Cancellation Policy
          </h1>
          <p className="text-sm md:text-base text-[#554339] max-w-2xl mx-auto leading-relaxed">
            Transparent policies regarding TenoPilot software subscriptions and clarification on tenant security deposit settlements.
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
            TenoPilot SaaS Software Subscription Terms
          </h2>
          <p>
            TenoPilot provides cloud-hosted property management software on a recurring subscription basis (monthly or annual billing cycles based on managed bed capacity).
          </p>
          
          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#d7c2b9]/60">
              <h3 className="font-bold text-[#201a17] text-sm sm:text-base mb-1">A. 10-Day Full Access Free Trial</h3>
              <p className="text-xs sm:text-sm text-[#554339]">
                Every new property account receives a 10-day trial with 100% full feature access. No payment card is charged prior to explicit user subscription selection. Property owners are encouraged to test bed allocations, receipt dispatches, and WhatsApp integrations during this period.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#d7c2b9]/60">
              <h3 className="font-bold text-[#201a17] text-sm sm:text-base mb-1">B. Subscription Cancellations</h3>
              <p className="text-xs sm:text-sm text-[#554339]">
                You can cancel your paid subscription at any time directly through Property Settings or by notifying <a href="mailto:billing@tenopilot.com" className="text-[#964407] font-semibold underline">billing@tenopilot.com</a>. Upon cancellation, your access remains uninterrupted until the end of your prepaid billing period, and no further recurring charges will occur.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#d7c2b9]/60">
              <h3 className="font-bold text-[#201a17] text-sm sm:text-base mb-1">C. Software Refund Eligibility</h3>
              <p className="text-xs sm:text-sm text-[#554339]">
                If you experience a verified technical disruption that prevents software operation, or if an accidental duplicate subscription charge occurs, please submit a refund request within <strong>7 days</strong> of the transaction date. Eligible duplicate or erroneous charges will be refunded to the original payment method within 5–7 business days.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">2</span>
            Tenant Rent Payments & Security Deposit Settlements
          </h2>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
              <span>Independent Tenancy Relationship Notice</span>
            </div>
            TenoPilot is a software computing provider and does not receive, hold, or escrow tenant rental funds. All rent transactions and security deposits are transacted directly between the Tenant and the Property Owner.
          </div>
          <p>
            Regarding tenant payments and move-out settlements:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
            <li><strong>Security Deposit Refunds:</strong> At check-out, TenoPilot provides property managers with an itemized settlement calculation engine to audit room handover, unpaid dues, and maintenance deductions. The actual disbursement of the refundable balance is executed directly by the property owner to the resident.</li>
            <li><strong>Dispute Resolution:</strong> Any disputes concerning security deposit deductions, room condition charges, or notice period penalties must be addressed between the tenant and the respective property management desk in accordance with their rental agreement.</li>
            <li><strong>Electronic Receipt Verification:</strong> TenoPilot-generated settlement PDF documents reflect the verified ledger state recorded by the property administrator at the time of move-out.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-4 bg-white p-8 sm:p-10 rounded-2xl border border-[#d7c2b9]/60 shadow-xs">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201a17] flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#964407] text-white text-xs flex items-center justify-center font-bold">3</span>
            Billing Assistance & Support
          </h2>
          <p>
            For any billing queries, plan upgrades/downgrades, or invoice receipts regarding your TenoPilot subscription:
          </p>
          <div className="p-6 rounded-xl bg-[#fff8f6] border border-[#d7c2b9] text-xs sm:text-sm space-y-1.5">
            <p><strong>Department:</strong> TenoPilot Subscriptions & Billing</p>
            <p><strong>Email:</strong> <a href="mailto:billing@tenopilot.com" className="text-[#964407] font-semibold underline">billing@tenopilot.com</a></p>
            <p><strong>Support Desk:</strong> <a href="mailto:support@tenopilot.com" className="text-[#964407] font-semibold underline">support@tenopilot.com</a></p>
            <p><strong>Response Time:</strong> Within 24 business hours</p>
          </div>
        </section>
      </main>

      {/* Global Public Footer */}
      <PublicFooter />
    </div>
  );
}
