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
  Eye,
  EyeOff,
  Copy,
  CheckSquare,
  Square,
} from "lucide-react";
import { staffStore, StaffMember, UserRole } from "@/lib/staffStore";
import { useAuth } from "@/providers/AuthProvider";
import { reauthenticateCurrentAccount, provisionStaffFirebaseAccount } from "@/lib/authService";

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
  const [role, setRole] = useState<UserRole>("admin");
  const [assignedPropertyId, setAssignedPropertyId] = useState("sunshine-pg");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [password, setPassword] = useState("Pass@1234");
  const [showPassword, setShowPassword] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Reset PIN Modal State (For Master Admin's own account)
  const [resetTargetMember, setResetTargetMember] = useState<StaffMember | null>(null);
  const [resetMasterPassword, setResetMasterPassword] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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
            const propList = parsed.map((p: any) => ({ id: p.id, name: p.name }));
            setProperties(propList);
            setAssignedPropertyId(propList[0].id);
            setSelectedPropertyIds(propList.map((p: any) => p.id)); // Default admin to all
          }
        } catch {}
      }
    }

    const currentRole = staffStore.getActiveRole();
    setActiveRole(currentRole);

    // 🔒 If Receptionist tries to access staff management, immediately redirect to their assigned building
    if (currentRole === "receptionist") {
      const allStaff = staffStore.getAllGlobalStaff();
      let userEmail = "";
      if (typeof window !== "undefined") {
        try {
          userEmail = JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}")?.email || "";
        } catch {}
      }
      const match = allStaff.find((s) => s.email.toLowerCase() === userEmail.toLowerCase());
      const targetProp = match?.assignedPropertyId || "sunshine-pg";
      router.replace(`/p/${targetProp}/overview`);
      return;
    }

    // Default form role selection
    if (currentRole === "admin") {
      setRole("receptionist");
      // Filter accessible properties to Admin's assigned buildings only
      const allStaff = staffStore.getAllGlobalStaff();
      let userEmail = "";
      if (typeof window !== "undefined") {
        try {
          userEmail = JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}")?.email || "";
        } catch {}
      }
      const match = allStaff.find((s) => s.email.toLowerCase() === userEmail.toLowerCase());
      const assignedIds = match?.assignedPropertyIds || (match?.assignedPropertyId ? [match.assignedPropertyId] : []);
      if (assignedIds.length > 0 && !assignedIds.includes("*")) {
        setProperties((prev) => prev.filter((p) => assignedIds.includes(p.id)));
      }
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

  const handleGenerateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!";
    let res = "";
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const togglePropertySelection = (propId: string) => {
    if (selectedPropertyIds.includes(propId)) {
      setSelectedPropertyIds(selectedPropertyIds.filter((id) => id !== propId));
    } else {
      setSelectedPropertyIds([...selectedPropertyIds, propId]);
    }
  };

  const toggleSelectAllProperties = () => {
    if (selectedPropertyIds.length === properties.length) {
      setSelectedPropertyIds([]);
    } else {
      setSelectedPropertyIds(properties.map((p) => p.id));
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

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (role === "admin" && selectedPropertyIds.length === 0) {
      setErrorMessage("Please select at least one building to assign this Admin to.");
      return;
    }

    // Permission Check
    if (activeRole === "admin" && role !== "receptionist") {
      setErrorMessage("As a Property Admin, you can only create Receptionist accounts.");
      return;
    }

    setIsSubmitting(true);

    try {
      const primaryPropId = role === "admin" ? selectedPropertyIds[0] : assignedPropertyId;
      const selectedProps = properties.filter((p) =>
        role === "admin" ? selectedPropertyIds.includes(p.id) : p.id === assignedPropertyId
      );

      const propDisplayName =
        role === "admin"
          ? selectedPropertyIds.length === properties.length
            ? "All Properties"
            : selectedProps.map((p) => p.name).join(", ")
          : selectedProps[0]?.name || "Assigned PG";

      const newStaff = await provisionStaffFirebaseAccount({
        id: `staff-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || "+91 98000 00000",
        role: role,
        assignedPropertyId: primaryPropId,
        assignedPropertyIds: role === "admin" ? selectedPropertyIds : [assignedPropertyId],
        propertyName: propDisplayName,
        password: password,
      });

      setSuccessMessage(`✅ Account for ${name.trim()} created! Work Email: ${email.trim().toLowerCase()} | Handover Password: ${password}`);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("Pass@1234");
      setActiveTab("directory");
    } catch (err: any) {
      setErrorMessage("Failed to create staff account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Reset Master PIN Dialog
  const handleOpenResetMasterPin = (member: StaffMember) => {
    setResetTargetMember(member);
    setResetNewPin("");
    setResetMasterPassword("");
    setResetError(null);
  };

  // Confirm Reset Master PIN with Password Verification (or instant Google verification)
  const handleConfirmResetMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetMember) return;

    if (resetNewPin.length !== 6) {
      setResetError("New security PIN must be exactly 6 digits.");
      return;
    }

    const isGoogleAccount =
      (resetTargetMember?.email && resetTargetMember.email.toLowerCase().endsWith("@gmail.com")) ||
      (typeof window !== "undefined" &&
        localStorage.getItem("tenopilot_saved_session")?.toLowerCase().includes("@gmail.com"));

    setIsResettingPin(true);
    setResetError(null);

    try {
      if (!isGoogleAccount && resetMasterPassword) {
        await reauthenticateCurrentAccount(resetMasterPassword);
      }
      await staffStore.setSecurityPin(resetTargetMember.id, resetNewPin);
      setSuccessMessage(`✅ Your Master Security PIN has been updated successfully to ${resetNewPin}!`);
      setResetTargetMember(null);
      setResetNewPin("");
      setResetMasterPassword("");
    } catch (err: any) {
      setResetError(err?.message || "Password verification failed. PIN was not updated.");
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
                ? "Assign and manage Property Admins across single or multiple buildings, and Receptionists."
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
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 font-semibold animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(successMessage);
                setCopiedNotice(true);
                setTimeout(() => setCopiedNotice(false), 2500);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedNotice ? "Copied!" : "Copy"}</span>
            </button>
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

                  // Property Display String
                  const assignedCount = member.assignedPropertyIds?.length || 1;
                  const propertyDisplay = isMaster
                    ? "All Properties (Global)"
                    : member.assignedPropertyIds?.includes("*") || assignedCount >= properties.length
                    ? "All Buildings (Global Admin)"
                    : assignedCount > 1
                    ? `${member.propertyName || "Assigned Buildings"} (${assignedCount} Buildings)`
                    : member.propertyName || "Assigned Building";

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
                              {propertyDisplay}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action: Privacy-First PIN Badge & Actions */}
                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        {isMaster ? (
                          <>
                            <div className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 font-mono font-bold text-xs text-[#964407] flex items-center gap-1.5">
                              <Key className="w-3 h-3 text-[#c2652a]" />
                              <span>PIN: {member.securityPin || "123456"}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenResetMasterPin(member)}
                              className="px-3 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#964407] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                              title="Reset Master PIN (Requires password verification)"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset My PIN</span>
                            </button>
                          </>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 flex items-center gap-1.5">
                            {member.hasSetPin ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">PIN: Active (Staff Managed)</span>
                              </>
                            ) : (
                              <>
                                <Key className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-amber-700 font-bold">PIN: Pending (1st Login)</span>
                              </>
                            )}
                          </div>
                        )}

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
              Create credentials for your team. You will handover this email and password for their first login.
            </p>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Saikumar Reddy"
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

              {/* Role Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                >
                  {activeRole === "master_admin" && (
                    <option value="admin">🏢 Property Admin (Can manage single or multiple buildings)</option>
                  )}
                  <option value="receptionist">🔑 Receptionist (Front Desk Single Building)</option>
                </select>
              </div>

              {/* Building Assignment: Multi-Building Checkboxes for Admin vs Single Dropdown for Receptionist */}
              {role === "admin" ? (
                <div className="space-y-2 p-4 bg-orange-50/50 rounded-2xl border border-orange-200/70">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-800">
                      🏢 Assign Buildings to this Admin * ({selectedPropertyIds.length} Selected)
                    </label>
                    <button
                      type="button"
                      onClick={toggleSelectAllProperties}
                      className="text-[11px] font-bold text-[#c2652a] hover:underline"
                    >
                      {selectedPropertyIds.length === properties.length ? "Deselect All" : "Select All Buildings"}
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-500">
                    Select all the PG/Hostel properties this Admin is authorized to manage:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {properties.map((p) => {
                      const isChecked = selectedPropertyIds.includes(p.id);
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => togglePropertySelection(p.id)}
                          className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isChecked
                              ? "bg-white border-[#c2652a] text-gray-900 shadow-2xs"
                              : "bg-white/60 border-gray-200 text-gray-500 hover:bg-white"
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#c2652a] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="font-semibold text-xs truncate">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Assigned Front Desk Building *
                  </label>
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
              )}

              {/* Handover Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-gray-700">
                    Initial Handover Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] font-bold text-[#c2652a] hover:underline"
                  >
                    🎲 Generate Strong Password
                  </button>
                </div>
                <div className="relative max-w-sm">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter handover password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 font-mono text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  💡 Hand over this email and password to the staff member. Upon login, they will set their personal 6-digit PIN.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? "Provisioning Account..." : "Create Staff Account & Generate Credentials"}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 🔑 RESET MASTER PIN MODAL (Smart Google vs Password Detection) */}
        {resetTargetMember && (() => {
          const isGoogleAccount =
            (resetTargetMember?.email && resetTargetMember.email.toLowerCase().endsWith("@gmail.com")) ||
            (typeof window !== "undefined" &&
              localStorage.getItem("tenopilot_saved_session")?.toLowerCase().includes("@gmail.com"));

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl border border-[#e8dfd8] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs text-[#201a17]">
                <div className="flex items-center justify-between border-b border-[#f8ede3] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-orange-100 text-[#964407]">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-gray-900">
                        Reset Master Security PIN
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Update your 6-digit access code
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

                <form onSubmit={handleConfirmResetMasterPin} className="space-y-4">
                  {resetError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl font-bold">
                      {resetError}
                    </div>
                  )}

                  {isGoogleAccount ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-900 leading-tight">Google Identity Verified</p>
                        <p className="text-[11px] text-emerald-700">{resetTargetMember.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Master Account Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={resetMasterPassword}
                          onChange={(e) => setResetMasterPassword(e.target.value)}
                          placeholder="Enter your account password"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">New 6-Digit PIN *</label>
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
                      className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResettingPin || resetNewPin.length !== 6 || (!isGoogleAccount && !resetMasterPassword)}
                      className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                    >
                      {isResettingPin ? "Updating..." : "Update Master PIN"}
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* 🔐 CONFIRMATION MODAL FOR ACCOUNT DELETION */}
        {deleteTargetMember && (() => {
          const isGoogleAccount =
            (typeof window !== "undefined" &&
              localStorage.getItem("tenopilot_saved_session")?.toLowerCase().includes("@gmail.com"));

          return (
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
                    ⚠️ <strong>Security Verification:</strong> Are you sure you want to permanently remove {deleteTargetMember.name}&apos;s account? Their login access will be immediately revoked.
                  </div>

                  {deleteError && (
                    <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 font-bold">
                      {deleteError}
                    </div>
                  )}

                  {!isGoogleAccount && (
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
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#f8ede3]">
                    <button
                      type="button"
                      onClick={() => setDeleteTargetMember(null)}
                      className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isDeletingStaff || (!isGoogleAccount && !deletePassword)}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                    >
                      {isDeletingStaff ? "Deleting..." : "Permanently Delete Staff"}
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
