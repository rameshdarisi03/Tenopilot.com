"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Lock, X } from "lucide-react";

interface FounderSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function FounderSidebar({ mobileOpen, onMobileClose }: FounderSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      label: "Platform Pulse",
      href: "/apex-command/overview",
      badge: "LIVE",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
    {
      label: "PG Onboarding Hub",
      href: "/apex-command/invites",
    },
    {
      label: "PG Master CRM",
      href: "/apex-command/clients",
      badge: "48 PGs",
      badgeColor: "bg-white/10 text-white/80 border border-white/10",
    },
    {
      label: "Risk and Alerts",
      href: "/apex-command/churn-radar",
      badge: "2 Alerts",
      badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    },
    {
      label: "Subscriptions and Billing",
      href: "/apex-command/billing",
    },
    {
      label: "Team and Access",
      href: "/apex-command/team",
    },
    {
      label: "Health Monitor",
      href: "/apex-command/monitoring",
      badge: "0 Errors",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
  ];

  const handleLockConsole = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("apex_founder_auth");
      router.push("/apex-command/login");
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0d0f12] border-r border-white/8 flex flex-col transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Logo / Brand Header */}
        <div className="p-5 border-b border-white/8 flex items-center justify-between">
          <Link href="/apex-command/overview" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 shrink-0 drop-shadow-[0_0_15px_rgba(255,51,102,0.3)] transition-transform group-hover:scale-105">
              <Image
                src="/tenopilot-logo.png"
                alt="Tenopilot Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-black text-base text-white tracking-tight">
                  Tenopilot<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff3366] to-[#ff8400]">.com</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                SaaS Management
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onMobileClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 md:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List (Text-Only Minimalist Clean Layout) */}
        <nav className="flex-1 px-3.5 py-5 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Management
          </div>

          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/apex-command/overview" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white shadow-md shadow-[#ff3366]/25 font-bold scale-[1.01]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="truncate">{item.label}</span>

                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive ? "bg-black/30 text-white" : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Super-Admin User Identity & Lock Console */}
        <div className="p-4 border-t border-white/8 space-y-3">
          <div className="p-3.5 rounded-2xl bg-[#16191f] border border-white/6 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-[#ff3366] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                👑
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    Founder
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  admin@tenopilot.com
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLockConsole}
              title="Lock Console / Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-[#ff3366] hover:bg-[#ff3366]/10 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
