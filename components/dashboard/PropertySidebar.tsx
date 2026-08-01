"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Wallet,
  Wrench,
  BarChart3,
  UserCheck,
  Settings,
  ChevronDown,
  Building2,
  HelpCircle,
} from "lucide-react";

export function PropertySidebar({
  propertyId = "sunshine-pg",
  propertyName = "Sunshine PG",
}: {
  propertyId?: string;
  propertyName?: string;
}) {
  const pathname = usePathname();
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);

  const navItems = [
    {
      name: "Overview",
      href: `/p/${propertyId}/overview`,
      icon: LayoutDashboard,
    },
    {
      name: "Property Map",
      href: `/p/${propertyId}/property-map`,
      icon: MapPin,
    },
    {
      name: "Tenants",
      href: `/p/${propertyId}/tenants`,
      icon: Users,
    },
    {
      name: "Financial Hub",
      href: `/p/${propertyId}/financial-hub`,
      icon: Wallet,
    },
    {
      name: "Complaints",
      href: `/p/${propertyId}/complaints`,
      icon: Wrench,
    },
    {
      name: "Reports",
      href: `/p/${propertyId}/reports`,
      icon: BarChart3,
    },
    {
      name: "Staff Management",
      href: `/p/${propertyId}/staff`,
      icon: UserCheck,
    },
    {
      name: "Settings",
      href: `/p/${propertyId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-[#fff8f6] border-r border-[#d7c2b9]/60 flex flex-col justify-between h-screen sticky top-0 shrink-0 z-40 select-none">
      <div className="p-4 space-y-6">
        {/* Brand Logo */}
        <div className="px-2 pt-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm">
            T
          </div>
          <div>
            <span className="font-serif font-bold text-xl tracking-tight text-[#201a17]">
              TenoPilot
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#964407] block -mt-1">
              Business OS
            </span>
          </div>
        </div>

        {/* Selected Property Switcher Widget */}
        <div className="relative">
          <button
            onClick={() => setShowPropertyMenu(!showPropertyMenu)}
            className="w-full bg-[#964407] hover:bg-[#c2652a] text-white p-3 rounded-xl shadow-md transition-all flex items-center justify-between text-left group"
          >
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/80 block">
                SELECTED PROPERTY
              </span>
              <span className="font-serif font-bold text-sm text-white block truncate">
                {propertyName}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-white/90 transition-transform duration-300 ${
                showPropertyMenu ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          {/* Switcher Dropdown */}
          {showPropertyMenu && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-[#d7c2b9] shadow-xl py-2 z-50 text-xs font-medium text-[#201a17]">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#554339] border-b border-[#f8ede3]">
                Switch Property Context
              </div>
              <Link
                href="/p/sunshine-pg/financial-hub"
                onClick={() => setShowPropertyMenu(false)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-[#f8ede3] text-[#964407] font-bold"
              >
                <Building2 className="w-4 h-4" /> Sunshine PG
              </Link>
              <Link
                href="/p/sands-residences/financial-hub"
                onClick={() => setShowPropertyMenu(false)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-[#f8ede3]"
              >
                <Building2 className="w-4 h-4" /> The Sands Residences
              </Link>
              <Link
                href="/p/meridian-hostel/financial-hub"
                onClick={() => setShowPropertyMenu(false)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-[#f8ede3]"
              >
                <Building2 className="w-4 h-4" /> Meridian PG & Hostel
              </Link>
              <div className="border-t border-[#f8ede3] pt-1 mt-1">
                <Link
                  href="/home"
                  onClick={() => setShowPropertyMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[#f8ede3] text-[#725949] font-bold"
                >
                  ← All Properties (Home)
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 8 Primary Menu Nav */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.name === "Financial Hub" && pathname?.includes("financial-hub")) ||
              (item.name === "Overview" && pathname?.includes("overview"));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#f8ede3] text-[#964407] border-l-4 border-[#964407] shadow-xs"
                    : "text-[#554339] hover:bg-[#f8ede3]/60 hover:text-[#201a17]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#964407]" : "text-[#725949]"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-[#d7c2b9]/40 space-y-2 text-xs font-semibold text-[#554339]">
        <Link
          href="/p/sunshine-pg/settings"
          className="flex items-center gap-3 px-3.5 py-2 rounded-lg hover:bg-[#f8ede3] transition-colors"
        >
          <Settings className="w-4 h-4 text-[#725949]" />
          <span>Settings</span>
        </Link>
        <a
          href="#support"
          className="flex items-center gap-3 px-3.5 py-2 rounded-lg hover:bg-[#f8ede3] transition-colors text-[#554339]"
        >
          <HelpCircle className="w-4 h-4 text-[#725949]" />
          <span>Support</span>
        </a>
      </div>
    </aside>
  );
}
