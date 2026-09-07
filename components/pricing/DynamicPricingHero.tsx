"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePlatformConfig } from "@/lib/usePlatformConfig";

export function DynamicPricingSubtitle() {
  const { config } = usePlatformConfig();
  return (
    <p className="text-base sm:text-lg text-[#554339] max-w-2xl mx-auto mt-4 leading-relaxed">
      Every plan includes a {config.trialDays}-Day Full Access Free Trial. No hidden fees. Read-only mode preserves your financial data if your subscription ever pauses.
    </p>
  );
}

export function DynamicPricingBottomCta() {
  const { config } = usePlatformConfig();
  return (
    <div className="rounded-3xl bg-[#964407] text-white p-10 md:p-14 text-center relative overflow-hidden">
      <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
        Start Your {config.trialDays}-Day Free Trial Today
      </h2>
      <p className="text-white/90 max-w-xl mx-auto mb-8 text-sm sm:text-base">
        Join hundreds of PG & Hostel owners managing properties with surgical accuracy.
      </p>
      <Link
        href="/signup"
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#964407] font-bold text-sm shadow-xl hover:bg-[#fff8f6] hover:scale-105 transition-all"
      >
        <span>Create Your Free Account</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export function DynamicLandingPricingSubtitle() {
  const { config } = usePlatformConfig();
  return (
    <p className="text-[#554339] text-base max-w-xl mx-auto mt-3">
      {config.trialDays}-Day Full Access Trial included. Read-only mode preserves your reports if subscription pauses.
    </p>
  );
}

export function DynamicTrialDaysSpan({ fallback = 10 }: { fallback?: number }) {
  const { config } = usePlatformConfig();
  return <>{config.trialDays || fallback}</>;
}
