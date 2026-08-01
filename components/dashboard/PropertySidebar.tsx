"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Wallet,
  Wrench,
  BarChart3,
  UserCheck,
  Settings,
  HelpCircle,
} from "lucide-react";

export function PropertySidebar({
  propertyId = "sunshine-pg",
}: {
  propertyId?: string;
}) {
  const pathname = usePathname();

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
        {/* Brand Logo - Clicking TenoPilot.com redirects to /home */}
        <Link
          href="/home"
          id="sidebar-brand-link"
          className="px-2 pt-2 flex items-center gap-3 group transition-transform active:scale-98"
          title="Return to Welcome Home Dashboard"
        >
          <div className="w-9 h-9 rounded-xl bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm group-hover:bg-[#c2652a] transition-colors">
            T
          </div>
          <div>
            <span className="font-serif font-bold text-xl tracking-tight text-[#201a17]">
              TenoPilot.com
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#964407] block -mt-1">
              Business OS
            </span>
          </div>
        </Link>

        {/* 8 Primary Clean Menu Nav */}
        <nav className="space-y-1 pt-2">
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
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
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
          href={`/p/${propertyId}/settings`}
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
