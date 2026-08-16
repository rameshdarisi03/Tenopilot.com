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
  LogOut,
  Sparkles,
} from "lucide-react";

import { useState, useEffect } from "react";
import { staffStore, UserRole } from "@/lib/staffStore";
import { useAuth } from "@/providers/AuthProvider";
import { FastTrackImportModal } from "@/components/dashboard/FastTrackImportModal";

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
  const { profile, logout } = useAuth();

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
      name: "Tenants & Guests",
      href: `/p/${propertyId}/tenants`,
      icon: Users,
    },
    {
      name: "Financial Hub",
      href: `/p/${propertyId}/financial-hub`,
      icon: Wallet,
    },
    {
      name: "Complaints Desk",
      href: `/p/${propertyId}/complaints`,
      icon: Wrench,
    },
    {
      name: "Reports & Analytics",
      href: `/p/${propertyId}/reports`,
      icon: BarChart3,
    },
    {
      name: "Staff Management",
      href: `/p/${propertyId}/staff`,
      icon: UserCheck,
    },
  ];

  const displayName = profile?.displayName || (activeRole === "master_admin" ? "Master Admin" : "Property Admin");
  const userInitials = displayName.split(" ").map(n => n.charAt(0)).join("").toUpperCase().slice(0, 2) || (activeRole === "master_admin" ? "MA" : "PA");
  const roleDisplay = activeRole === "master_admin" ? "Master Admin 👑" : activeRole === "admin" ? "Property Admin 🏢" : "Receptionist 🔑";

  const [showFastTrackModal, setShowFastTrackModal] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#fff8f6] border-r border-[#d7c2b9]/60 select-none">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-[#d7c2b9]/40 flex items-center justify-between">
        <Link
          href={activeRole === "receptionist" ? `/p/${propertyId}/overview` : "/home"}
          className="cursor-pointer transition-transform hover:scale-[1.02] block"
          title={activeRole === "receptionist" ? "Front Desk Dashboard" : "Return to Multi-Property Portfolio Welcome Screen"}
        >
          <TenoPilotLogo size="sm" />
        </Link>
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menus */}
      <div className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
        {/* FastTrack Migration Quick Trigger */}
        <button
          type="button"
          onClick={() => {
            setShowFastTrackModal(true);
            if (onMobileClose) onMobileClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-100/80 via-amber-50 to-purple-100/80 border border-orange-200 text-orange-950 hover:shadow-xs hover:border-orange-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#c2652a] group-hover:rotate-12 transition-transform" />
            <span>FastTrack Migration</span>
          </div>
          <span className="text-[9px] bg-gradient-to-r from-[#c2652a] to-purple-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            AI
          </span>
        </button>

        <div>
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#964407]">
            Property Management
          </div>

          <nav className="space-y-1">
            {navItems
              .filter((item) => {
                if (activeRole === "receptionist") {
                  return (
                    item.name !== "Staff Management" &&
                    item.name !== "Financial Hub" &&
                    item.name !== "Reports & Analytics"
                  );
                }
                return true;
              })
              .map((item) => {
              const isActive =
                pathname === item.href ||
                (item.name === "Tenants & Guests" && pathname?.includes("tenants")) ||
                (item.name === "Financial Hub" && pathname?.includes("financial-hub")) ||
                (item.name === "Overview" && pathname?.includes("overview"));

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onMobileClose && onMobileClose()}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#201a17] text-white shadow-sm"
                      : "text-[#554339] hover:bg-[#f8ede3] hover:text-[#964407]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-[#554339]"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-[#d7c2b9]/60 space-y-2 text-xs text-[#554339]">
        {activeRole !== "receptionist" && (
          <Link
            href={`/p/${propertyId}/settings`}
            onClick={() => onMobileClose && onMobileClose()}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${
              pathname?.includes("settings")
                ? "bg-[#964407] text-white border-[#964407] shadow-sm"
                : "bg-white text-[#201a17] border-[#d7c2b9] hover:bg-[#f8ede3] hover:border-[#964407] shadow-2xs"
            }`}
          >
            <Settings className={`w-4 h-4 ${pathname?.includes("settings") ? "text-amber-300" : "text-[#964407]"}`} />
            <span>Settings</span>
          </Link>
        )}

        <a
          href="mailto:support@tenopilot.com"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white text-[#201a17] border border-[#d7c2b9] hover:bg-[#f8ede3] hover:border-[#964407] text-xs font-extrabold transition-all shadow-2xs"
        >
          <HelpCircle className="w-4 h-4 text-[#964407]" />
          <span>Support & Help</span>
        </a>

        {/* User Profile Card */}
        <div className="mt-4 p-3 bg-white rounded-xl border border-[#d7c2b9] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-[#964407] text-white font-bold flex items-center justify-center text-xs border border-amber-300 shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#201a17] truncate">{displayName}</p>
              <p className="text-[10px] text-[#554339] truncate">{roleDisplay}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sign Out / Logout"
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
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

      {/* FastTrack Migration Modal */}
      <FastTrackImportModal
        propertyId={propertyId}
        isOpen={showFastTrackModal}
        onClose={() => setShowFastTrackModal(false)}
      />
    </>
  );
}
