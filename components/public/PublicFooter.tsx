import Link from "next/link";
import { ShieldCheck, Mail, MapPin } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-[#fff8f6] border-t border-[#d7c2b9]/60 pt-16 pb-12 px-6 text-xs text-[#554339] mt-auto">
      <div className="max-w-[1240px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand & Overview */}
          <div className="md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-base shadow-xs">
                T
              </div>
              <span className="font-serif font-bold text-xl text-[#201a17]">TenoPilot.com</span>
            </Link>
            <p className="text-[#554339]/80 leading-relaxed text-xs">
              Precision Rental Operating System for Paying Guest (PG) accommodations, student hostels, and co-living properties in India.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-[#964407] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#964407]" />
              <span>Bank-Grade 256-bit Encryption</span>
            </div>
          </div>

          {/* Product Navigation */}
          <div>
            <h4 className="font-bold text-[#201a17] text-sm mb-4 uppercase tracking-wider text-[11px]">Product</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/features" className="hover:text-[#964407] transition-colors">Features & Capabilities</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#964407] transition-colors">Pricing & Free Trial</Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#964407] transition-colors">How It Works</Link>
              </li>
              <li>
                <Link href="/verticals" className="hover:text-[#964407] transition-colors">Verticals & Portfolios</Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="font-bold text-[#201a17] text-sm mb-4 uppercase tracking-wider text-[11px]">Trust & Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/privacy" className="hover:text-[#964407] transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#964407] transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-[#964407] transition-colors">Refund & Cancellation</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#964407] transition-colors">Contact & Grievance</Link>
              </li>
            </ul>
          </div>

          {/* Headquarters & Support */}
          <div>
            <h4 className="font-bold text-[#201a17] text-sm mb-4 uppercase tracking-wider text-[11px]">Headquarters</h4>
            <div className="space-y-2.5 text-[#554339]/90">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-[#964407] shrink-0" />
                <span>Mahadevapura, Bengaluru, Karnataka 560048, India</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#964407] shrink-0" />
                <a href="mailto:support@tenopilot.com" className="hover:text-[#964407] transition-colors">
                  support@tenopilot.com
                </a>
              </div>
              <p className="text-[11px] text-[#554339]/70 pt-1">
                Mon - Sat: 9:00 AM - 7:00 PM IST
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#d7c2b9]/40 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-[#554339]/70">
          <p>© 2026 TenoPilot Inc. All rights reserved. Precision Engineered for Property Operations.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[#964407] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#964407] transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-[#964407] transition-colors">Refunds</Link>
            <Link href="/contact" className="hover:text-[#964407] transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
