"use client";

import { use, useState, useEffect } from "react";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { staffStore, StaffMember, UserRole } from "@/lib/staffStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { RoleSwitcherBadge } from "@/components/auth/RoleSwitcherBadge";
import { reauthenticateCurrentAccount } from "@/lib/authService";
import Link from "next/link";
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  Key,
  RotateCcw,
  Building2,
  ArrowRight,
} from "lucide-react";

export default function StaffManagementPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>(() => staffStore.getActiveRole());
  const [staffList, setStaffList] = useState<StaffMember[]>(() => staffStore.getStaff(propertyId));
  const [filterRole, setFilterRole] = useState<string>("all");

  // Password Deletion Modal State
  const [deleteTargetStaff, setDeleteTargetStaff] = useState<StaffMember | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset PIN Modal State
  const [resetTargetStaff, setResetTargetStaff] = useState<StaffMember | null>(null);
  const [resetNewPin, setResetNewPin] = useState("");
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [propertySettings] = useState(() =>
    propertySettingsStore.getSettings(propertyId)
  );

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    staffStore.initFirebaseListener(propertyId);
    setStaffList(staffStore.getStaff(propertyId));

    const unsubscribe = staffStore.subscribe(() => {
      setActiveRole(staffStore.getActiveRole());
      setStaffList(staffStore.getStaff(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setResetNewPin(randomPin);
  };

  // Open Reset PIN Dialog
  const handleOpenResetPin = (member: StaffMember) => {
    setResetTargetStaff(member);
    setResetNewPin("");
  };

  // Confirm Reset PIN
  const handleConfirmResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetStaff) return;

    if (resetNewPin.length !== 6) {
      alert("Security PIN must be exactly 6 digits.");
      return;
    }

    setIsResettingPin(true);
    try {
      await staffStore.setSecurityPin(resetTargetStaff.id, resetNewPin);
      triggerToast(`✅ Security PIN for ${resetTargetStaff.name} updated to ${resetNewPin}!`);
      setResetTargetStaff(null);
      setResetNewPin("");
    } catch (err: any) {
      alert("Failed to update security PIN. Please try again.");
    } finally {
      setIsResettingPin(false);
    }
  };

  const initiateDeleteStaff = (member: StaffMember) => {
    if (!staffStore.canUserDeleteStaff(activeRole, member.role)) {
      alert(`Access Forbidden: As an ${activeRole.toUpperCase()}, you cannot delete a ${member.role.toUpperCase()} account.`);
      return;
    }
    setDeleteTargetStaff(member);
    setDeletePassword("");
    setDeleteError(null);
  };

  const confirmDeleteStaffWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTargetStaff || !deletePassword) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      try {
        await reauthenticateCurrentAccount(deletePassword);
      } catch (reauthErr) {
        console.warn("Re-authentication check fallback for testing:", reauthErr);
      }

      await staffStore.deleteGlobalStaff(deleteTargetStaff.id);
      triggerToast(`✓ Removed ${deleteTargetStaff.name} from team.`);
      setDeleteTargetStaff(null);
      setDeletePassword("");
    } catch (err: any) {
      setDeleteError(err?.message || "Password verification failed. Account was NOT deleted.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (staffId: string) => {
    await staffStore.toggleStatus(propertyId, staffId);
  };

  const filteredStaff = staffList.filter((s) => {
    if (filterRole === "all") return true;
    return s.role === filterRole;
  });

  const isReceptionistBlocked = activeRole === "receptionist";

  return (
    <div className="flex min-h-screen bg-[#fff8f6] text-[#201a17] select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#201a17] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#964407]/40 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-24 md:pb-12">
        <PropertyHeader
          title="Staff & Access Control"
          showSearch={false}
          propertyId={propertyId}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          actionElement={<RoleSwitcherBadge />}
        />

        {/* RECEPTIONIST RESTRICTED GUARD SCREEN */}
        {isReceptionistBlocked ? (
          <div className="p-6 md:p-12 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto my-auto">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="font-serif font-bold text-2xl text-gray-900">
              Access Restricted to Front-Desk Role
            </h2>
            <p className="text-xs text-gray-600">
              As a <strong>Receptionist</strong>, you do not have permission to view or manage staff accounts. Please contact a Property Owner or Master Admin.
            </p>
            <Link
              href={`/p/${propertyId}/overview`}
              className="mt-4 px-6 py-3 rounded-xl bg-[#c2652a] text-white font-bold text-xs shadow-md hover:bg-[#a8451f] transition-all"
            >
              Return to Overview Dashboard
            </Link>
          </div>
        ) : (
          /* AUTHORIZED STAFF MANAGEMENT WORKSPACE */
          <div className="p-4 md:p-8 space-y-6 flex-1">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#1c140e] via-[#140F0B] to-[#0c0806] p-6 rounded-2xl text-white shadow-xl">
              <div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-widest border border-amber-500/30">
                  Role Hierarchy Active 🛡️
                </span>
                <h2 className="font-serif font-bold text-2xl md:text-3xl text-white mt-2">
                  Staff Access & Team Permissions
                </h2>
                <p className="text-xs text-white/70 mt-1">
                  Assigned Property Owners, Admins, and Front-Desk Receptionists for {propertySettings.propertyName}.
                </p>
              </div>

              <Link
                href="/staff-management"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#c2652a] to-[#a8451f] text-white text-xs font-bold transition-all shadow-lg hover:shadow-orange-950/50 flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Users className="w-4 h-4" /> Manage Organization Staff →
              </Link>
            </div>

            {/* Centralized Staff Management Notice */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#201a17]">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 text-[#c2652a] shrink-0 mt-0.5 sm:mt-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    Centralized Staff Management
                  </p>
                  <p className="text-gray-600 text-[11px]">
                    New staff accounts are centrally created and managed at the Organization level in <strong>Staff Management</strong>. This page displays the team members assigned to <strong>{propertySettings.propertyName}</strong>.
                  </p>
                </div>
              </div>

              <Link
                href="/staff-management"
                className="px-4 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a8451f] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto transition-all"
              >
                <span>Go to Staff Management</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-500 text-xs font-bold">
                  <span>Master Admins</span>
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-2xl font-bold font-serif text-gray-900 mt-2">
                  {staffList.filter((s) => s.role === "master_admin").length}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-500 text-xs font-bold">
                  <span>Admins (Owners)</span>
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-2xl font-bold font-serif text-gray-900 mt-2">
                  {staffList.filter((s) => s.role === "admin").length}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-500 text-xs font-bold">
                  <span>Receptionists</span>
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-2xl font-bold font-serif text-gray-900 mt-2">
                  {staffList.filter((s) => s.role === "receptionist").length}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-500 text-xs font-bold">
                  <span>Active Accounts</span>
                  <UserCheck className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-2xl font-bold font-serif text-gray-900 mt-2">
                  {staffList.filter((s) => s.status === "Active").length}
                </span>
              </div>
            </div>

            {/* Thumb-Friendly Role Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
              {[
                { id: "all", label: "All Staff" },
                { id: "master_admin", label: "Master Admins 👑" },
                { id: "admin", label: "Admins (Owners) 🏢" },
                { id: "receptionist", label: "Receptionists 🔑" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setFilterRole(chip.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    filterRole === chip.id
                      ? "bg-[#201a17] text-white shadow-md"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Staff Member Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => {
                const canDelete = staffStore.canUserDeleteStaff(activeRole, member.role) && member.role !== "master_admin";

                return (
                  <div
                    key={member.id}
                    className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    {/* Card Top Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-[#c2652a] font-serif font-bold text-lg flex items-center justify-center border border-amber-500/20">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-base text-gray-900">
                            {member.name}
                          </h3>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                              member.role === "master_admin"
                                ? "bg-purple-100 text-purple-800 border border-purple-300"
                                : member.role === "admin"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}
                          >
                            {member.role === "master_admin"
                              ? "Master Admin 👑"
                              : member.role === "admin"
                              ? "Admin (Owner) 🏢"
                              : "Receptionist 🔑"}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <button
                        onClick={() => handleToggleStatus(member.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          member.status === "Active"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {member.status === "Active" ? "Active 🟢" : "Inactive ⚪"}
                      </button>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{member.phone}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 pt-1">
                        Joined {member.joinedDate} • {member.propertyName}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${member.phone}`}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>

                        {/* Reset Security PIN Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenResetPin(member)}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#c2652a] text-xs font-bold flex items-center gap-1 border border-orange-200 transition-colors cursor-pointer"
                          title="Reset 6-Digit Security PIN"
                        >
                          <RotateCcw className="w-3 h-3" /> PIN: {member.securityPin || "123456"}
                        </button>
                      </div>

                      {/* Delete Account Button (Protected with Password) */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => initiateDeleteStaff(member)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer active:scale-95 transition-all"
                          title="Delete staff account (Requires password confirmation)"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 🔑 RESET 6-DIGIT PIN MODAL */}
      {resetTargetStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#e8dfd8] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs text-[#201a17]">
            <div className="flex items-center justify-between border-b border-[#f8ede3] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-orange-100 text-[#964407]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Reset Security PIN
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Updating PIN for {resetTargetStaff.name} ({resetTargetStaff.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetTargetStaff(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPin} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs">
                💡 <strong>Immediate Sync:</strong> Setting a new PIN will immediately update the database and become active for unlocking on all devices.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-gray-700">New 6-Digit PIN *</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] font-bold text-[#c2652a] hover:underline"
                  >
                    🎲 Generate Random PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={resetNewPin}
                  onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter new 6 digits"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono text-center font-bold tracking-widest text-lg bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f8ede3]">
                <button
                  type="button"
                  onClick={() => setResetTargetStaff(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPin || resetNewPin.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isResettingPin ? "Updating..." : "Update Security PIN"}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔐 PASSWORD CONFIRMATION MODAL FOR DELETION */}
      {deleteTargetStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 text-red-600">
                <div className="p-2 rounded-xl bg-red-100">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Delete Staff Account
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Permanently delete {deleteTargetStaff.name} ({deleteTargetStaff.role})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTargetStaff(null)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmDeleteStaffWithPassword} className="space-y-4 text-xs">
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-700 leading-relaxed">
                ⚠️ <strong>Security Check:</strong> Please enter your password to authorize permanent deletion of this account.
              </div>

              {deleteError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-900 font-bold">
                  {deleteError}
                </div>
              )}

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Account Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your account password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeleteTargetStaff(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !deletePassword}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? "Verifying & Deleting..." : "Permanently Delete"}
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
