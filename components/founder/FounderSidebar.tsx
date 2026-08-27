"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  Users,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  Activity,
  LogOut,
  X,
  Sparkles,
  Zap,
  Building2,
  Lock,
} from "lucide-react";

interface FounderSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function FounderSidebar({ mobileOpen, onMobileClose }: FounderSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      label: "SaaS Pulse",
      href: "/apex-command/overview",
      icon: LayoutDashboard,
      badge: "LIVE",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
    {
      label: "VIP Invites & Codes",
      href: "/apex-command/invites",
      icon: Ticket,
      badge: "GTM",
      badgeColor: "bg-[#ff3366]/20 text-[#ff5436] border border-[#ff3366]/30",
    },
    {
      label: "PG Master CRM",
      href: "/apex-command/clients",
      icon: Building2,
      badge: "48 PGs",
      badgeColor: "bg-white/10 text-white/80 border border-white/10",
    },
    {
      label: "Churn Radar",
      href: "/apex-command/churn-radar",
      icon: AlertTriangle,
      badge: "2 Alerts",
      badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    },
    {
      label: "Internal Team (RBAC)",
      href: "/apex-command/team",
      icon: Users,
    },
    {
      label: "SaaS Plans & Wallets",
      href: "/apex-command/billing",
      icon: CreditCard,
    },
    {
      label: "Sentry & Observability",
      href: "/apex-command/monitoring",
      icon: Activity,
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
        <div className="p-6 border-b border-white/8 flex items-center justify-between">
          <Link href="/apex-command/overview" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff3366] via-[#ff5436] to-[#ff8400] flex items-center justify-center text-white shadow-lg shadow-[#ff3366]/20 font-serif font-black text-xl tracking-tighter">
              T
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-lg text-white tracking-tight">
                  TenoPilot
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-[#ff3366]/20 text-[#ff5436] border border-[#ff3366]/30">
                  APEX
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 tracking-wider">
                PLATFORM COMMAND
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

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Platform Command
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/apex-command/overview" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-medium text-xs transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white shadow-lg shadow-[#ff3366]/25 font-bold scale-[1.02]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-[#ff5436]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
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
