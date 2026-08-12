"use client";

import { Search, Bell, Menu, X, Wrench, CreditCard, ShieldCheck, Check, User, Settings, LogOut, ChevronRight, UserCheck, Edit3 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Complaint, subscribeToComplaints, INITIAL_COMPLAINTS } from "@/lib/complaintStore";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { initializePropertyTrial, calculateTrialDaysRemaining } from "@/lib/trialService";
import { useAuth } from "@/providers/AuthProvider";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";

export function PropertyHeader({
  title = "Tenants & Guests Directory",
  sectionTabs = [],
  activeTab = "",
  searchValue = "",
  showSearch = false,
  onSearchChange,
  onTabChange,
  onMobileMenuToggle,
  propertyId = "sunshine-pg",
  actionElement,
}: {
  title?: string;
  sectionTabs?: string[];
  activeTab?: string;
  searchValue?: string;
  showSearch?: boolean;
  onSearchChange?: (val: string) => void;
  onTabChange?: (tab: string) => void;
  onMobileMenuToggle?: () => void;
  propertyId?: string;
  actionElement?: React.ReactNode;
}) {
  const { profile, updateProfileName, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editNameInput, setEditNameInput] = useState(profile?.displayName || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(10);

  const displayName = profile?.displayName || "Ishara Pandey";
  const userEmail = profile?.email || "isharapandey01@gmail.com";
  const userInitials = displayName.split(" ").map(n => n.charAt(0)).join("").toUpperCase().slice(0, 2) || "IP";

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializePropertyTrial(propertyId).then((meta) => {
      const res = calculateTrialDaysRemaining(meta.trialEndsAtMs);
      setTrialDaysLeft(res.daysRemaining);
    });

    const unsubscribe = subscribeToComplaints(propertyId, (list) => {
      if (list && list.length > 0) {
        setComplaints(list);
      }
    });
    return () => unsubscribe();
  }, [propertyId]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute real-time notification alerts from complaints & occupantStore
  const occupants = occupantStore.getOccupants();
  const openComplaints = complaints.filter((c) => c.status !== "RESOLVED");
  const overdueOccupants = occupants.filter((o) => o.daysDiff <= 0 && o.lifecycleStatus !== "Past");
  const pendingKycOccupants = occupants.filter((o) => !o.kycVerified && o.lifecycleStatus !== "Past");

  const totalAlertsCount = notificationsRead
    ? 0
    : openComplaints.length + overdueOccupants.length + pendingKycOccupants.length;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 md:px-6 h-16 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu Button & Search Bar (Only shown when showSearch is true) */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700 active:scale-95 shrink-0 cursor-pointer"
          aria-label="Toggle Mobile Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/home" className="lg:hidden shrink-0 cursor-pointer" title="Return to Multi-Property Portfolio Welcome Screen">
          <TenoPilotLogo size="sm" />
        </Link>

        {/* Full-width Search Bar Input (Rendered strictly on Tenants section or when requested) */}
        {showSearch ? (
          <div className="relative w-full">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search by name, phone, room, Aadhaar..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs md:text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-[#c2652a] focus:border-[#c2652a] transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Link
              href="/home"
              className="font-serif font-bold text-sm text-gray-900 hover:text-[#964407] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Return to Multi-Property Portfolio Welcome Screen"
            >
              <span>Portfolio</span>
            </Link>
            <span>/</span>
            <span className="font-bold text-gray-700">{title}</span>
          </div>
        )}
      </div>

      {/* Right: Notification Bell & User Avatar Dropdown */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 🔔 Real-Time Notification Bell & Drawer */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {totalAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#c2652a] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
                {totalAlertsCount}
              </span>
            )}
          </button>

          {/* Interactive Notifications Popover Menu */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 p-4 space-y-3 animate-in zoom-in-95 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#c2652a]" />
                  <span className="font-serif font-bold text-sm text-gray-900">
                    Notifications & System Alerts
                  </span>
                </div>
                {!notificationsRead && totalAlertsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setNotificationsRead(true)}
                    className="text-[10px] text-[#c2652a] font-bold hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100">
                {/* 1. Open Complaints Alerts */}
                {openComplaints.map((c) => (
                  <Link
                    key={c.id}
                    href={`/p/${propertyId}/complaints`}
                    onClick={() => setShowNotifications(false)}
                    className="pt-2 block hover:bg-orange-50/50 p-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900">
                        <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Room {c.roomNumber} ({c.category})</span>
                      </div>
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded">
                        UNRESOLVED
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-1 mt-0.5">{c.description}</p>
                    <span className="text-[9px] text-gray-400 font-mono mt-1 block">
                      Tenant: {c.tenantName} • {new Date(c.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </Link>
                ))}

                {/* 2. Overdue Tariff Payment Alerts */}
                {overdueOccupants.map((o) => (
                  <Link
                    key={o.id}
                    href={`/p/${propertyId}/tenants/${o.id}`}
                    onClick={() => setShowNotifications(false)}
                    className="pt-2 block hover:bg-red-50/50 p-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900">
                        <CreditCard className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>{o.name} (Room {o.roomNumber})</span>
                      </div>
                      <span className="text-[9px] bg-red-100 text-red-800 font-extrabold px-1.5 py-0.5 rounded">
                        {o.daysRemainingText}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5 font-mono">
                      Outstanding Rent: ₹{o.rentAmount.toLocaleString("en-IN")}
                    </p>
                  </Link>
                ))}

                {/* 3. KYC Pending Alerts */}
                {pendingKycOccupants.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    href={`/p/${propertyId}/tenants/${o.id}`}
                    onClick={() => setShowNotifications(false)}
                    className="pt-2 block hover:bg-blue-50/50 p-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>KYC Pending: {o.name}</span>
                      </div>
                      <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded">
                        ID PENDING
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Govt ID proof skipped at onboarding. Click to complete KYC.
                    </p>
                  </Link>
                ))}

                {openComplaints.length === 0 && overdueOccupants.length === 0 && pendingKycOccupants.length === 0 && (
                  <div className="py-6 text-center text-gray-400 space-y-1">
                    <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-gray-700">All System Alerts Clear!</p>
                    <p className="text-[10px]">No pending complaints or overdue payments.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ⏳ Hack-Proof 10-Day Free Trial Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>10-Day Free Trial ({trialDaysLeft} Days Left)</span>
        </div>

        {actionElement && <div className="hidden sm:block">{actionElement}</div>}

        {/* 👤 User Profile Dropdown Avatar */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-2 border-l border-gray-200 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#c2652a] to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {userInitials}
            </div>
          </button>

          {/* User Profile Popover */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 p-4 space-y-3 animate-in zoom-in-95 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#c2652a] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-sm truncate">{displayName}</p>
                  <p className="text-[10px] text-gray-400 font-medium truncate">{userEmail}</p>
                  <span className="inline-block mt-0.5 text-[9px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                    SUPER ADMIN • OWNER
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                {/* ✏️ EDIT PROFILE BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setEditNameInput(displayName);
                    setShowEditProfileModal(true);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-50 text-[#964407] font-bold transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-[#c2652a]" /> Edit Profile
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>

                <Link
                  href={`/p/${propertyId}/settings`}
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 text-gray-700 font-bold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-gray-600" /> Global Settings
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </Link>

                <Link
                  href={`/p/${propertyId}/complaints`}
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 text-gray-700 font-bold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-amber-600" /> Maintenance & Support
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </Link>

                {/* 🚪 LOGOUT BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-red-50 text-red-600 font-bold transition-colors cursor-pointer border-t border-gray-100 mt-2"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5 text-red-600" /> Sign Out / Logout
                  </span>
                </button>
              </div>

              <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
                <span>TenoPilot v2.1</span>
                <span>• {propertyId}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✏️ EDIT PROFILE MODAL */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#964407]" /> Edit Profile Details
              </h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsUpdatingName(true);
                await updateProfileName(editNameInput);
                setIsUpdatingName(false);
                setShowEditProfileModal(false);
              }}
              className="space-y-4 text-xs"
            >
              {/* Full Name (Editable) */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Full Name / Username *
                </label>
                <input
                  type="text"
                  required
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#964407] font-semibold text-gray-900"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Updating your name here will instantly update your welcome dashboard greeting and profile cards across the app.
                </p>
              </div>

              {/* Email Address (Disabled for now) */}
              <div>
                <label className="font-bold text-gray-400 block mb-1">
                  Email Address (Disabled)
                </label>
                <input
                  type="email"
                  disabled
                  value={userEmail}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 text-sm cursor-not-allowed font-mono"
                />
              </div>

              {/* Mobile Number (Disabled for now) */}
              <div>
                <label className="font-bold text-gray-400 block mb-1">
                  Mobile Number (Disabled)
                </label>
                <input
                  type="tel"
                  disabled
                  value="+91 9876543210"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 text-sm cursor-not-allowed font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingName}
                  className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingName ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
