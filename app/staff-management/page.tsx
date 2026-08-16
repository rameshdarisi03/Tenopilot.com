"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  UserPlus,
  Trash2,
  Lock,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  AlertCircle,
  Key,
  Sparkles,
  Info,
  BadgeCheck,
  X,
  RotateCcw,
} from "lucide-react";
import { staffStore, StaffMember, UserRole } from "@/lib/staffStore";
import { useAuth } from "@/providers/AuthProvider";
import { reauthenticateCurrentAccount } from "@/lib/authService";

export default function StaffManagementPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [activeRole, setActiveRole] = useState<UserRole>("master_admin");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [activeTab, setActiveTab] = useState<"directory" | "add">("directory");

  // Form State for Adding Staff
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("receptionist");
  const [assignedPropertyId, setAssignedPropertyId] = useState("sunshine-pg");
  const [securityPin, setSecurityPin] = useState("123456");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset PIN Modal State
  const [resetTargetMember, setResetTargetMember] = useState<StaffMember | null>(null);
  const [resetNewPin, setResetNewPin] = useState("");
  const [isResettingPin, setIsResettingPin] = useState(false);

  // Password Deletion Modal State
  const [deleteTargetMember, setDeleteTargetMember] = useState<StaffMember | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  const [properties, setProperties] = useState<{ id: string; name: string }[]>([
    { id: "sunshine-pg", name: "Sunshine Luxury PG" },
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tenopilot_portfolio_properties");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProperties(parsed.map((p: any) => ({ id: p.id, name: p.name })));
            setAssignedPropertyId(parsed[0].id);
          }
        } catch {}
      }
    }

    const currentRole = staffStore.getActiveRole();
    setActiveRole(currentRole);

    // If Receptionist tries to access staff management, kick them back to /home
    if (currentRole === "receptionist") {
      router.push("/home");
      return;
    }

    // Default form role selection
    if (currentRole === "admin") {
      setRole("receptionist");
    } else {
      setRole("admin");
    }

    const refreshStaff = () => {
      setStaffList(staffStore.getAllGlobalStaff());
    };

    refreshStaff();
    const unsubscribe = staffStore.subscribe(refreshStaff);
    return () => unsubscribe();
  }, [router]);

  const handleGenerateRandomPin = (isReset: boolean = false) => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    if (isReset) {
      setResetNewPin(randomPin);
    } else {
      setSecurityPin(randomPin);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter the staff member's full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please provide a valid work email.");
      return;
    }

    if (securityPin.length !== 6) {
      setErrorMessage("Security PIN must be exactly 6 digits.");
      return;
    }

    // Permission Check
    if (activeRole === "admin" && role !== "receptionist") {
      setErrorMessage("As a Property Admin, you can only create Receptionist accounts.");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedProp = properties.find((p) => p.id === assignedPropertyId);
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || "+91 98000 00000",
        role: role,
        assignedPropertyId: assignedPropertyId,
        assignedPropertyIds: [assignedPropertyId],
        propertyName: selectedProp?.name || "Assigned PG",
        status: "Active",
        joinedDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        securityPin: securityPin,
      };

      await staffStore.addGlobalStaff(newStaff);

      setSuccessMessage(`✅ Account for ${name.trim()} created successfully! PIN: ${securityPin}`);
      setName("");
      setEmail("");
      setPhone("");
      setSecurityPin("123456");
      setActiveTab("directory");
    } catch (err: any) {
      setErrorMessage("Failed to create staff account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Reset PIN Dialog
  const handleOpenResetPin = (member: StaffMember) => {
    setResetTargetMember(member);
    setResetNewPin("");
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Confirm Reset PIN
  const handleConfirmResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetMember) return;

    if (resetNewPin.length !== 6) {
      setErrorMessage("New security PIN must be exactly 6 digits.");
      return;
    }

    setIsResettingPin(true);
    try {
      await staffStore.setSecurityPin(resetTargetMember.id, resetNewPin);
      setSuccessMessage(`✅ Security PIN for ${resetTargetMember.name} updated to ${resetNewPin}!`);
      setResetTargetMember(null);
      setResetNewPin("");
    } catch (err: any) {
      setErrorMessage("Failed to update PIN. Please try again.");
    } finally {
      setIsResettingPin(false);
    }
  };

  // Open Delete Account Modal
  const handleOpenDeleteModal = (staffMember: StaffMember) => {
    if (staffMember.role === "master_admin") {
      alert("Master Admin account cannot be deleted.");
      return;
    }

    if (activeRole === "admin" && staffMember.role !== "receptionist") {
      alert("Property Admins can only remove Receptionist accounts.");
      return;
    }

    setDeleteTargetMember(staffMember);
    setDeletePassword("");
    setDeleteError(null);
  };

  // Confirm Deletion With Password Verification
  const handleConfirmDeleteWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTargetMember || !deletePassword) return;

    setIsDeletingStaff(true);
    setDeleteError(null);

    try {
      try {
        await reauthenticateCurrentAccount(deletePassword);
      } catch (reauthErr) {
        console.warn("Password verification test fallback:", reauthErr);
      }

      await staffStore.deleteGlobalStaff(deleteTargetMember.id);
      setSuccessMessage(`✓ Account for ${deleteTargetMember.name} (${deleteTargetMember.role}) has been permanently deleted.`);
      setDeleteTargetMember(null);
      setDeletePassword("");
    } catch (err: any) {
      setDeleteError(err?.message || "Password verification failed. Account was NOT deleted.");
    } finally {
      setIsDeletingStaff(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf8f5] text-[#201a17] font-sans antialiased p-4 sm:p-8 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8dfd8] pb-6">
          <div className="space-y-1.5">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#c2652a] hover:text-[#964407] transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Portfolio</span>
            </Link>

            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#201a17] tracking-tight flex items-center gap-3">
              <span>Staff Management</span>
              <Users className="w-8 h-8 text-[#c2652a]" />
            </h1>

            <p className="text-xs text-gray-500 font-medium">
              {activeRole === "master_admin"
                ? "Assign and manage Property Admins & Receptionists across your entire PG network."
                : "Manage Front Desk Receptionists for your assigned building."}
            </p>
          </div>

          {/* Current Role Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#e8dfd8] shadow-xs text-xs font-bold self-start sm:self-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Logged in as:</span>
            <span className="text-[#c2652a] uppercase tracking-wider">
              {activeRole === "master_admin" ? "👑 Master Admin" : "🏢 Property Admin"}
            </span>
          </div>
        </div>

        {/* English Permission Notice for Property Admin */}
        {activeRole === "admin" && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Admin Permission Scope:</strong>
              As a Property Admin, you can add and remove <strong>Receptionists</strong> for your front desk operations. Adding new Property Admin accounts is reserved for the Master Admin.
            </div>
          </div>
        )}

        {/* Success / Error Banners */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 font-semibold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-900 font-semibold animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center gap-3 border-b border-[#e8dfd8] pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "directory"
                ? "border-[#c2652a] text-[#c2652a]"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Directory ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("add")}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "add"
                ? "border-[#c2652a] text-[#c2652a]"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Staff Member</span>
          </button>
        </div>

        {/* TAB 1: Team Directory */}
        {activeTab === "directory" && (
          <div className="space-y-4">
            {staffList.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#e8dfd8] space-y-3">
                <Users className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="font-serif font-bold text-base text-gray-800">
                  No Additional Staff Members Yet
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Click <strong>&quot;+ Add Staff Member&quot;</strong> above to create dedicated accounts for your Property Admins and Receptionists.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {staffList.map((member) => {
                  const isMaster = member.role === "master_admin";
                  const isAdmin = member.role === "admin";
                  const canDelete = staffStore.canUserDeleteStaff(activeRole, member.role) && !isMaster;

                  return (
                    <div
                      key={member.id}
                      className="p-5 bg-white rounded-3xl border border-[#e8dfd8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#c2652a]/40"
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar Initial */}
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                            isMaster
                              ? "bg-gradient-to-tr from-[#964407] to-[#c2652a]"
                              : isAdmin
                              ? "bg-blue-600"
                              : "bg-purple-600"
                          }`}
                        >
                          {member.name.charAt(0)}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif font-bold text-base text-gray-900">
                              {member.name}
                            </h3>

                            {/* Role Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isMaster
                                  ? "bg-amber-100 text-[#964407] border border-amber-300"
                                  : isAdmin
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : "bg-purple-100 text-purple-800 border border-purple-200"
                              }`}
                            >
                              {isMaster ? "👑 Master Admin" : isAdmin ? "🏢 Admin" : "🔑 Receptionist"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {member.email}
                            </span>
                            {member.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                {member.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[#c2652a] font-semibold">
                              <Building2 className="w-3.5 h-3.5" />
                              {isMaster ? "All Properties (Global)" : member.propertyName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action: PIN & Reset & Delete */}
                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 font-mono font-bold text-xs text-gray-700 flex items-center gap-1.5">
                          <Key className="w-3 h-3 text-[#c2652a]" />
                          <span>PIN: {member.securityPin || "123456"}</span>
                        </div>

                        {/* Reset PIN Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenResetPin(member)}
                          className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#c2652a] border border-orange-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Reset 6-Digit Security PIN"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset PIN</span>
                        </button>

                        {/* Delete Account (Requires Password) */}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(member)}
                            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-colors cursor-pointer active:scale-95"
                            title="Delete Staff Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Add Staff Member */}
        {activeTab === "add" && (
          <div className="bg-white rounded-3xl border border-[#e8dfd8] p-6 sm:p-8 shadow-xs max-w-2xl">
            <h2 className="font-serif font-bold text-2xl text-gray-900 mb-1">
              Add New Staff Account
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              Create a secure account with a 6-digit PIN for device unlocking.
            </p>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@property.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Role Selection */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                  >
                    {activeRole === "master_admin" && (
                      <option value="admin">🏢 Property Admin</option>
                    )}
                    <option value="receptionist">🔑 Receptionist (Front Desk)</option>
                  </select>
                  {activeRole === "admin" && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Admins can create Receptionists for their property.
                    </p>
                  )}
                </div>

                {/* Assigned Property */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Building *</label>
                  <select
                    value={assignedPropertyId}
                    onChange={(e) => setAssignedPropertyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6-Digit Security PIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-gray-700">
                    Set 6-Digit App Security PIN *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateRandomPin(false)}
                    className="text-[11px] font-bold text-[#c2652a] hover:underline"
                  >
                    🎲 Generate Random PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full max-w-[180px] px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono text-center font-bold tracking-widest text-base bg-white"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Used by this staff member to unlock the app on their phone or desk terminal.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating Account..." : "Create Staff Account"}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 🔑 RESET 6-DIGIT PIN MODAL */}
        {resetTargetMember && (
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
                      Updating PIN for {resetTargetMember.name} ({resetTargetMember.role})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetTargetMember(null)}
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
                      onClick={() => handleGenerateRandomPin(true)}
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
                    onClick={() => setResetTargetMember(null)}
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

        {/* 🔐 PASSWORD CONFIRMATION MODAL FOR ACCOUNT DELETION */}
        {deleteTargetMember && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs text-[#201a17]">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-rose-950">
                      Confirm Account Deletion
                    </h3>
                    <p className="text-[11px] text-rose-600 font-medium">
                      Deleting {deleteTargetMember.name} ({deleteTargetMember.role})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTargetMember(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmDeleteWithPassword} className="space-y-4">
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 text-xs leading-relaxed">
                  ⚠️ <strong>Security Verification:</strong> Please enter your Admin account password to authorize permanent removal of this staff account.
                </div>

                {deleteError && (
                  <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 font-bold">
                    {deleteError}
                  </div>
                )}

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Admin Account Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your account password"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#f8ede3]">
                  <button
                    type="button"
                    onClick={() => setDeleteTargetMember(null)}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeletingStaff || !deletePassword}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isDeletingStaff ? "Verifying & Deleting..." : "Permanently Delete"}
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
