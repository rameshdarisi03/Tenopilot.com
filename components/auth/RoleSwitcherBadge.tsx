"use client";

import React, { useState, useEffect } from "react";
import { staffStore, UserRole } from "@/lib/staffStore";
import { Shield, ShieldAlert, ShieldCheck, ChevronDown, Check } from "lucide-react";

export const RoleSwitcherBadge: React.FC = () => {
  const [activeRole, setActiveRole] = useState<UserRole>(() => staffStore.getActiveRole());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = staffStore.subscribe(() => {
      setActiveRole(staffStore.getActiveRole());
    });
    return unsubscribe;
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    staffStore.setActiveRole(role);
    setOpen(false);
  };

  const roleConfigs = {
    master_admin: {
      label: "Master Admin 👑",
      bg: "bg-purple-900/90 hover:bg-purple-800 text-purple-100 border-purple-400/40",
      icon: ShieldAlert,
      description: "Full System Authority & Renewal Rights",
    },
    admin: {
      label: "Owner / Admin 🏢",
      bg: "bg-amber-900/90 hover:bg-amber-800 text-amber-100 border-amber-400/40",
      icon: ShieldCheck,
      description: "Property Operations, Revenue & Settlements",
    },
    receptionist: {
      label: "Receptionist 🔑",
      bg: "bg-emerald-900/90 hover:bg-emerald-800 text-emerald-100 border-emerald-400/40",
      icon: Shield,
      description: "Front-Desk Tenants, KYC & Expenses Only",
    },
  };

  const currentConfig = roleConfigs[activeRole];
  const Icon = currentConfig.icon;

  return (
    <div className="relative inline-block select-none z-50">
      {/* Floating Role Pill */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-full border text-xs font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${currentConfig.bg}`}
        title="Switch Active Testing Role"
      >
        <Icon className="w-3.5 h-3.5" />
        <span>ROLE: {currentConfig.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-[#121826] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-2 border-b border-white/10 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block">
              RBAC Live Tester
            </span>
            <p className="text-[11px] text-gray-300">
              Select active role to test navigation guards & permissions instantly:
            </p>
          </div>

          {(["master_admin", "admin", "receptionist"] as UserRole[]).map((r) => {
            const cfg = roleConfigs[r];
            const RIcon = cfg.icon;
            const isSelected = activeRole === r;

            return (
              <button
                key={r}
                onClick={() => handleRoleSelect(r)}
                className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <RIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">{cfg.label}</div>
                    <div className="text-[10px] text-gray-400">{cfg.description}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
