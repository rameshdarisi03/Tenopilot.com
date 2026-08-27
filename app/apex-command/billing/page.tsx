"use client";

import { useState } from "react";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  CreditCard,
  Zap,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Download,
  Building2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Plus,
} from "lucide-react";

interface SaaSInvoice {
  id: string;
  invoiceNo: string;
  pgName: string;
  ownerName: string;
  plan: string;
  amount: number;
  date: string;
  method: "Razorpay UPI" | "Auto-Debit" | "NetBanking";
  status: "PAID" | "PENDING";
}

const INITIAL_INVOICES: SaaSInvoice[] = [
  {
    id: "inv-201",
    invoiceNo: "INV-2026-081",
    pgName: "Sunshine PG",
    ownerName: "Ramesh Darisi",
    plan: "Pro Growth (Monthly)",
    amount: 1499,
    date: "2026-08-15",
    method: "Razorpay UPI",
    status: "PAID",
  },
  {
    id: "inv-202",
    invoiceNo: "INV-2026-080",
    pgName: "Meghana Haven PG",
    ownerName: "K. Meghana",
    plan: "Growth (Annual VIP)",
    amount: 14990,
    date: "2026-08-01",
    method: "Auto-Debit",
    status: "PAID",
  },
  {
    id: "inv-203",
    invoiceNo: "INV-2026-079",
    pgName: "Royal Comfort PG",
    ownerName: "Venkat Rao",
    plan: "Pro Growth (Monthly)",
    amount: 1499,
    date: "2026-07-28",
    method: "Razorpay UPI",
    status: "PAID",
  },
];

export default function ApexCommandBillingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [invoices, setInvoices] = useState<SaaSInvoice[]>(INITIAL_INVOICES);

  return (
    <div className="flex min-h-screen bg-[#0d0f12] text-slate-100 font-sans selection:bg-[#ff3366]/30 selection:text-white">
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <FounderHeader
          title="SaaS Plans, Invoices & WhatsApp Credit Wallets"
          subtitle="Manage software subscription pricing, client invoice history, and WhatsApp gateway credits"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 flex-1 max-w-[1400px] mx-auto w-full pb-24">
          {/* Top 4 Financial Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">ACTIVE MRR</span>
              <h2 className="font-sans font-extrabold text-3xl text-emerald-400">₹68,500</h2>
              <p className="text-xs text-slate-400">Monthly recurring software fees</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">ANNUAL RUN RATE</span>
              <h2 className="font-sans font-extrabold text-3xl text-white">₹8.22 Lakhs</h2>
              <p className="text-xs text-emerald-400 font-bold">+22.4% MoM Growth</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">WA CREDITS BALANCE</span>
              <h2 className="font-sans font-extrabold text-3xl text-purple-400">41,550</h2>
              <p className="text-xs text-slate-400">Platform-wide wallet reserve</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">DISPATCHED (AUG)</span>
              <h2 className="font-sans font-extrabold text-3xl text-[#ff5436]">18,450</h2>
              <p className="text-xs text-slate-400">Rent reminders & invoices</p>
            </div>
          </div>

          {/* Section 1: The 3 SaaS Subscription Tiers */}
          <div className="space-y-4">
            <div className="border-b border-white/8 pb-3">
              <h3 className="font-serif font-bold text-xl text-white">
                TenoPilot SaaS Subscription Plans
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Standard pricing plans offered to PG owners across India
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Plan 1: Starter */}
              <div className="p-6 rounded-3xl bg-[#16191f] border border-white/8 space-y-4 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">STARTER PG</span>
                  <h4 className="font-serif font-bold text-2xl text-white">₹999 <span className="text-xs font-sans text-slate-400">/ month</span></h4>
                  <p className="text-xs text-slate-400">For small PGs & hostels (up to 30 beds)</p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">✓ Up to 30 Bed inventory</li>
                    <li className="flex items-center gap-2">✓ Rent receipts & Dual-Ledger</li>
                    <li className="flex items-center gap-2">✓ 250 Free WhatsApp Reminders</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-white/8">
                  <span className="text-[11px] font-bold text-slate-400">12 Active PGs on this plan</span>
                </div>
              </div>

              {/* Plan 2: Pro Growth */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1c2027] to-[#16191f] border border-[#ff3366]/40 space-y-4 relative flex flex-col justify-between shadow-xl">
                <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[9px] font-black uppercase bg-gradient-to-r from-[#ff3366] to-[#ff8400] text-white shadow-md">
                  MOST POPULAR
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#ff5436]">PRO GROWTH</span>
                  <h4 className="font-serif font-bold text-2xl text-white">₹1,499 <span className="text-xs font-sans text-slate-400">/ month</span></h4>
                  <p className="text-xs text-slate-400">For mid-size PGs (up to 80 beds)</p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">✓ Up to 80 Bed inventory</li>
                    <li className="flex items-center gap-2">✓ FastTrack AI Register Migration</li>
                    <li className="flex items-center gap-2">✓ 1-Click CA Multi-Sheet Excel Pack</li>
                    <li className="flex items-center gap-2">✓ 1,000 Free WhatsApp Reminders</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-white/8">
                  <span className="text-[11px] font-bold text-[#ff5436]">28 Active PGs on this plan</span>
                </div>
              </div>

              {/* Plan 3: Enterprise */}
              <div className="p-6 rounded-3xl bg-[#16191f] border border-white/8 space-y-4 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">ENTERPRISE MULTI</span>
                  <h4 className="font-serif font-bold text-2xl text-white">₹3,999 <span className="text-xs font-sans text-slate-400">/ month</span></h4>
                  <p className="text-xs text-slate-400">For chains & multi-building operators</p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">✓ Unlimited Bed capacity</li>
                    <li className="flex items-center gap-2">✓ Multi-Building & Partner Equity Hub</li>
                    <li className="flex items-center gap-2">✓ Dedicated Account Manager</li>
                    <li className="flex items-center gap-2">✓ 5,000 Free WhatsApp Reminders</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-white/8">
                  <span className="text-[11px] font-bold text-purple-400">8 Active PGs on this plan</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Recent SaaS Subscription Invoices */}
          <div className="bg-[#16191f] border border-white/8 rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-white">
                  Client Subscription Invoices (Audit Ledger)
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Recent software subscription payments collected via Razorpay & Auto-Debit
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                100% On-Time Collections 🟢
              </span>
            </div>

            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/2">
                    <th className="py-3 px-4 rounded-l-xl">Invoice No</th>
                    <th className="py-3 px-4">PG Client & Owner</th>
                    <th className="py-3 px-4">Subscribed Plan</th>
                    <th className="py-3 px-4 text-right">Amount (INR)</th>
                    <th className="py-3 px-4">Billing Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 font-medium">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-white">
                        {inv.invoiceNo}
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <strong className="text-white text-xs">{inv.pgName}</strong>
                          <p className="text-[10px] text-slate-400">{inv.ownerName}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {inv.plan}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        ₹{inv.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-slate-400 font-mono">
                        {inv.date}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          ✓ PAID
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          title="Download Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
