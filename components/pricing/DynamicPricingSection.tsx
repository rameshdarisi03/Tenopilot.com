"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Building2, Users, ArrowRight, MessageCircle } from "lucide-react";
import { usePlatformConfig } from "@/lib/usePlatformConfig";

interface DynamicPricingSectionProps {
  variant?: "pricing" | "landing";
  defaultInterval?: "monthly" | "annual";
}

export function DynamicPricingSection({
  variant = "pricing",
  defaultInterval = "monthly",
}: DynamicPricingSectionProps) {
  const { config } = usePlatformConfig();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(defaultInterval);

  const ctaHref = variant === "landing" ? "/home" : "/signup";
  const annualSavings = config.proMonthlyPrice * 12 - config.proAnnualPrice;
  const effectiveMonthlyFromAnnual = Math.round(config.proAnnualPrice / 12);

  return (
    <div className="w-full">
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center bg-[#f8ede3] p-1.5 rounded-2xl border border-[#d7c2b9]">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === "monthly"
                ? "bg-white text-[#201a17] shadow-xs"
                : "text-[#554339] hover:text-[#964407]"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === "annual"
                ? "bg-[#964407] text-white shadow-xs"
                : "text-[#554339] hover:text-[#964407]"
            }`}
          >
            <span>Annual Billing</span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                billingCycle === "annual"
                  ? "bg-amber-300 text-amber-950"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* 3 Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-10">
        {/* Card 1: Starter / Express Trial */}
        <div className="p-8 rounded-3xl bg-white border border-[#d7c2b9] flex flex-col shadow-xs hover:shadow-md transition-all">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#554339]">
                Starter Plan
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {config.trialDays}-DAY TRIAL
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-serif font-bold text-[#201a17]">
                ₹0
              </span>
              <span className="text-sm text-[#554339] font-medium">
                for {config.trialDays} days
              </span>
            </div>
            <p className="text-xs text-[#554339] mt-3">
              Full access to setup and run boutique PGs & small guest homes up to {config.trialTenantLimit} beds.
            </p>
          </div>

          <ul className="space-y-3.5 mb-8 flex-1 text-sm font-medium text-[#201a17]">
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Date-Aware Room Allocation</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Digital WhatsApp Rent Receipts</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Unified Tenant & Guest Directory</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Offline Data Synchronization</span>
            </li>
            <li className="flex items-center gap-3 text-slate-500 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1.5 mr-2"></span>
              <span>Includes up to {config.trialTenantLimit} active beds/tenants</span>
            </li>
          </ul>

          <Link
            href={ctaHref}
            className="w-full text-center py-3.5 rounded-xl border-2 border-[#964407] text-[#964407] font-bold text-sm hover:bg-[#964407] hover:text-white transition-all shadow-xs"
          >
            Start {config.trialDays}-Day Free Trial
          </Link>
        </div>

        {/* Card 2: Professional (Featured & Most Popular) */}
        <div className="p-8 rounded-3xl bg-white border-2 border-[#964407] shadow-xl relative flex flex-col scale-105 z-10">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#964407] text-white text-[10px] font-bold px-4 py-1 rounded-full tracking-widest uppercase shadow-sm">
            MOST POPULAR
          </div>

          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#554339]">
              Professional Plan
            </span>

            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-serif font-bold text-[#201a17]">
                ₹
                {billingCycle === "annual"
                  ? config.proAnnualPrice.toLocaleString("en-IN")
                  : config.proMonthlyPrice.toLocaleString("en-IN")}
              </span>
              <span className="text-sm text-[#554339] font-medium">
                {billingCycle === "annual" ? "/year" : "/month"}
              </span>
            </div>

            {billingCycle === "annual" ? (
              <p className="text-[11px] text-emerald-700 font-bold mt-2 bg-emerald-50 py-1 px-2 rounded-lg border border-emerald-200 inline-block">
                ₹{effectiveMonthlyFromAnnual.toLocaleString("en-IN")}/mo • Save ₹
                {annualSavings.toLocaleString("en-IN")} (2 Months Free!)
              </p>
            ) : (
              <p className="text-xs text-[#554339] mt-2">
                Engineered for scaling PGs, hostels & multi-partner operations up to {config.proTenantLimit} beds.
              </p>
            )}
          </div>

          <ul className="space-y-3.5 mb-8 flex-1 text-sm font-medium text-[#201a17]">
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Partner Profit Settlement Engine</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>FastTrack AI 1-Click Migration</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>24/7 QR Complaints & Work Orders</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Automated Daily Guest Checkouts</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Multi-Property Portfolio Dashboard</span>
            </li>
            <li className="flex items-center gap-3 text-slate-500 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#964407] ml-1.5 mr-2"></span>
              <span>Covers up to {config.proTenantLimit} active beds/tenants</span>
            </li>
          </ul>

          <Link
            href={ctaHref}
            className="w-full text-center py-3.5 rounded-xl bg-[#964407] text-white font-bold text-sm shadow-md hover:bg-[#c2652a] transition-all flex items-center justify-center gap-2"
          >
            <span>Start {config.trialDays}-Day Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 3: Enterprise */}
        <div className="p-8 rounded-3xl bg-white border border-[#d7c2b9] flex flex-col shadow-xs hover:shadow-md transition-all">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#554339]">
              Enterprise Plan
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-serif font-bold text-[#201a17]">
                Custom
              </span>
            </div>
            <p className="text-xs text-[#554339] mt-3">
              For large co-living brands, hostel chains, and campus portfolios with {config.proTenantLimit}+ beds.
            </p>
          </div>

          <ul className="space-y-3.5 mb-8 flex-1 text-sm font-medium text-[#201a17]">
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Unlimited Properties & Beds</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Custom Subdomain & White-Label</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Dedicated Account Specialist</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#964407] shrink-0" />
              <span>Custom ERP & Tally Integrations</span>
            </li>
          </ul>

          <a
            href={`https://wa.me/91${config.founderWhatsapp}?text=${encodeURIComponent(
              `Hi Ramesh, I am managing a large property portfolio (${config.proTenantLimit}+ beds) and would like to discuss the TenoPilot Enterprise Plan.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center py-3.5 rounded-xl border-2 border-[#964407] text-[#964407] font-bold text-sm hover:bg-[#964407] hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contact Enterprise Sales</span>
          </a>
        </div>
      </div>

      {/* Dynamic Add-Ons Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#f8ede3]/80 border border-[#d7c2b9] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#554339]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#964407] flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-[#201a17]">
              Multi-Property Add-on: ₹{config.multiPropertyPrice.toLocaleString("en-IN")}/month
            </p>
            <p className="text-[11px] text-[#554339]">
              Stack additional branch locations under your unified master portfolio.
            </p>
          </div>
        </div>

        <div className="h-px sm:h-8 w-full sm:w-px bg-[#d7c2b9]"></div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-[#201a17]">
              Capacity Expansion Pack: ₹{config.tenantPackPrice.toLocaleString("en-IN")}/month
            </p>
            <p className="text-[11px] text-[#554339]">
              Add +50 tenant/bed quota beyond {config.proTenantLimit} beds with zero downtime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
