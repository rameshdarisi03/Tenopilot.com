"use client";

import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import Link from "next/link";
import {
  Building2,
  Users,
  Wallet,
  Wrench,
  ArrowUpRight,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export default function PropertyOverviewPage({
  params,
}: {
  params: { propertyId: string };
}) {
  const propertyId = params.propertyId || "sunshine-pg";

  return (
    <div className="flex min-h-screen bg-[#fff8f6] text-[#201a17]">
      {/* 256px Left Sidebar with 8 clean primary menus */}
      <PropertySidebar propertyId={propertyId} propertyName="Sunshine PG" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <PropertyHeader
          title="Overview"
          sectionTabs={["Metrics", "Recent Activity"]}
          activeTab="Metrics"
        />

        {/* Workspace Body */}
        <div className="p-6 md:p-8 space-y-8 flex-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="badge-available px-3 py-1 rounded-full text-[10px] font-bold">
                OPERATIONAL HEALTHY 🟢
              </span>
              <h2 className="font-serif font-bold text-2xl md:text-3xl text-[#201a17] mt-2">
                Sunshine PG Dashboard
              </h2>
              <p className="text-xs text-[#554339] mt-0.5">
                Kondapur, Hyderabad • 48 Total Beds • 98.5% Occupancy
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/p/${propertyId}/financial-hub`}
                className="px-4 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                Go to Financial Hub <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                Active Tenants
              </span>
              <p className="font-serif font-bold text-2xl text-[#964407] mt-1">38</p>
              <p className="text-[11px] text-[#059669] font-bold mt-1">Monthly Billing</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                Active Guests
              </span>
              <p className="font-serif font-bold text-2xl text-purple-700 mt-1">6</p>
              <p className="text-[11px] text-purple-700 font-bold mt-1">Purple Badge</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                Available Beds
              </span>
              <p className="font-serif font-bold text-2xl text-[#059669] mt-1">4</p>
              <p className="text-[11px] text-[#059669] font-bold mt-1">Ready for Allocation</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                Open Complaints
              </span>
              <p className="font-serif font-bold text-2xl text-amber-700 mt-1">2</p>
              <p className="text-[11px] text-amber-700 font-bold mt-1">In Progress</p>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href={`/p/${propertyId}/financial-hub`}
              className="p-6 rounded-2xl bg-white border border-[#d7c2b9] hover:border-[#964407] shadow-xs hover:shadow-md transition-all group"
            >
              <Wallet className="w-8 h-8 text-[#964407] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-serif font-bold text-lg text-[#201a17]">Financial Hub</h3>
              <p className="text-xs text-[#554339] mt-1">
                View Partner Settlements, log expenses, and inspect monthly net profits.
              </p>
            </Link>

            <Link
              href={`/p/${propertyId}/tenants`}
              className="p-6 rounded-2xl bg-white border border-[#d7c2b9] hover:border-[#964407] shadow-xs hover:shadow-md transition-all group"
            >
              <Users className="w-8 h-8 text-[#964407] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-serif font-bold text-lg text-[#201a17]">Tenants & Guests Directory</h3>
              <p className="text-xs text-[#554339] mt-1">
                Onboard new occupants with date-aware bed allocation and legal agreements.
              </p>
            </Link>

            <Link
              href={`/p/${propertyId}/property-map`}
              className="p-6 rounded-2xl bg-white border border-[#d7c2b9] hover:border-[#964407] shadow-xs hover:shadow-md transition-all group"
            >
              <Building2 className="w-8 h-8 text-[#964407] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-serif font-bold text-lg text-[#201a17]">Property Map</h3>
              <p className="text-xs text-[#554339] mt-1">
                Visual floor, room, and bed map with real-time occupancy status indicators.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
