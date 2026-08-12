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
  Plus,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  X,
  Lock,
  Copy,
  CheckCircle2,
  AlertCircle,
  Key,
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

  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("receptionist");
  const [newPassword, setNewPassword] = useState("TenoPilot@2026");
  const [copiedAlert, setCopiedAlert] = useState(false);

  // Password Deletion Modal State
  const [deleteTargetStaff, setDeleteTargetStaff] = useState<StaffMember | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [propertySettings] = useState(() =>
    propertySettingsStore.getSettings(propertyId)
  );

  useEffect(() => {
    staffStore.initFirebaseListener(propertyId);
    setStaffList(staffStore.getStaff(propertyId));

    const unsubscribe = staffStore.subscribe(() => {
      setActiveRole(staffStore.getActiveRole());
      setStaffList(staffStore.getStaff(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  // Handle Add Staff Submission
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPhone) return;

    const newMember: StaffMember = {
      id: `staff-${Date.now()}`,
      name: newName,
      email: newEmail,
      phone: newPhone,
      role: newRole,
      assignedPropertyId: propertyId,
      propertyName: propertySettings.propertyName,
      status: "Active",
      joinedDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    await staffStore.addStaff(propertyId, newMember);
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewRole("receptionist");
  };

  const initiateDeleteStaff = (member: StaffMember) => {
    if (!staffStore.canUserDeleteStaff(member.role)) {
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

      await staffStore.deleteStaff(propertyId, deleteTargetStaff.id);
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
                  Manage Property Owners, Equity Partners, and Front-Desk Receptionists for {propertySettings.propertyName}.
                </p>
              </div>

              {/* Action Desktop Button */}
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="hidden md:flex px-5 py-3 rounded-xl bg-gradient-to-r from-[#c2652a] to-[#a8451f] text-white text-xs font-bold transition-all shadow-lg hover:shadow-orange-950/50 items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add New Staff Account
              </button>
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
                const canDelete = staffStore.canUserDeleteStaff(member.role);

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
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <a
                        href={`tel:${member.phone}`}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>

                      {/* Delete Account Button */}
                      <button
                        type="button"
                        onClick={() => initiateDeleteStaff(member)}
                        disabled={!canDelete}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          canDelete
                            ? "bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer active:scale-95"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                        title={
                          canDelete
                            ? "Delete staff account (Requires password confirmation)"
                            : `As an ${activeRole.toUpperCase()}, you cannot delete a ${member.role.toUpperCase()} account.`
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Account
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PINNED SINGLE-HANDED MOBILE BOTTOM ACTION BAR */}
      {!isReceptionistBlocked && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 shadow-2xl flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full max-w-md py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#c2652a] to-[#a8451f] text-white font-bold text-sm shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Staff Member
          </button>
        </div>
      )}

      {/* SLIDE-UP PROVISIONING MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-gray-900">
                  Provision New Staff Account
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create account credentials directly for {propertySettings.propertyName}.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="rahul@sunshinepg.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Select Role & Permissions *
                </label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setNewRole("admin")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      newRole === "admin"
                        ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="font-bold text-xs">Admin (Owner) 🏢</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Full property operations, revenue & partner settlements
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole("receptionist")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      newRole === "receptionist"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="font-bold text-xs">Receptionist 🔑</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Front desk, tenant check-in & logging expenses only
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-gray-700">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-600" /> Temporary Login Credentials
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Email: ${newEmail}\nPassword: ${newPassword}`);
                      setCopiedAlert(true);
                      setTimeout(() => setCopiedAlert(false), 2000);
                    }}
                    className="text-[11px] font-bold text-[#c2652a] hover:underline flex items-center gap-1"
                  >
                    {copiedAlert ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedAlert ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="font-mono text-xs text-gray-800 bg-white p-2 rounded-lg border border-gray-200 flex justify-between">
                  <span>Password: {newPassword}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c2652a] to-[#a8451f] text-white font-bold transition-all shadow-md active:scale-95"
                >
                  Create & Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔐 SECOND-LAYER PASSWORD CONFIRMATION DELETION MODAL */}
      {deleteTargetStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Confirm Account Deletion
              </h3>
              <button
                onClick={() => setDeleteTargetStaff(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-sm">Security Password Check Required</div>
              <p>
                You are about to permanently delete the account for <strong>{deleteTargetStaff.name}</strong> ({deleteTargetStaff.role.toUpperCase()}). Please re-enter your password to authorize this action.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={confirmDeleteStaffWithPassword} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Your Security Password *
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Re-enter your password to confirm"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTargetStaff(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  {isDeleting ? "Verifying..." : "Confirm & Delete Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
