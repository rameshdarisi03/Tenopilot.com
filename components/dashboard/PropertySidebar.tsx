"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
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
  X,
} from "lucide-react";

import { useState, useEffect } from "react";
import { staffStore, UserRole } from "@/lib/staffStore";

export function PropertySidebar({
  propertyId = "sunshine-pg",
  mobileOpen = false,
  onMobileClose,
}: {
  propertyId?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const [activeRole, setActiveRole] = useState<UserRole>(() => staffStore.getActiveRole());

  useEffect(() => {
    const unsubscribe = staffStore.subscribe(() => {
      setActiveRole(staffStore.getActiveRole());
    });
    return unsubscribe;
  }, []);

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

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-white border-r border-gray-200 select-none">
      <div className="p-6 space-y-6">
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between">
          <Link
            href="/home"
            id="sidebar-brand-link"
            className="group transition-transform active:scale-98"
            title="Return to Welcome Home Dashboard"
          >
            <TenoPilotLogo size="md" />
          </Link>

          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1 rounded-full text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Primary Clean Menu Nav (RBAC Filtered) */}
        <nav className="space-y-1 pt-2">
          {navItems
            .filter((item) => {
              if (activeRole === "receptionist") {
                return !["Staff Management", "Settings"].includes(item.name);
              }
              return true;
            })
            .map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.name === "Tenants" && pathname?.includes("tenants")) ||
              (item.name === "Financial Hub" && pathname?.includes("financial-hub")) ||
              (item.name === "Overview" && pathname?.includes("overview"));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onMobileClose && onMobileClose()}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-[#c2652a] font-bold border-l-4 border-[#c2652a] shadow-xs"
                    : "text-gray-600 hover:bg-orange-50/60 hover:text-[#c2652a] hover:translate-x-1"
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? "text-[#c2652a] scale-110" : "text-gray-500 group-hover:scale-110"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-100 space-y-1 text-xs text-gray-600">
        <Link
          href={`/p/${propertyId}/settings`}
          onClick={() => onMobileClose && onMobileClose()}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100"
        >
          <Settings className="w-4 h-4 text-gray-500" />
          <span>Settings</span>
        </Link>
        <a
          href="#support"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <HelpCircle className="w-4 h-4 text-gray-500" />
          <span>Support</span>
        </a>

        {/* User Profile Card */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#c2652a] text-white font-bold flex items-center justify-center text-xs border-2 border-white shadow-xs">
              RD
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Ramesh Darisi</p>
              <p className="text-[10px] text-gray-500">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on lg screens) */}
      <aside className="hidden lg:flex lg:w-64 h-screen sticky top-0 shrink-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onMobileClose}
          ></div>
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
