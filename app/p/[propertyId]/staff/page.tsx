"use client";

import { use, useState, useEffect } from "react";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { staffStore, StaffMember, UserRole } from "@/lib/staffStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import {
  reauthenticateCurrentAccount,
  syncUserSecurityPinToCloud,
  updateStaffFirebaseAccount,
  checkStaffCredentialConflict,
  formatStaffRoleDisplay,
} from "@/lib/authService";
import { useAuth } from "@/providers/AuthProvider";
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
  Pencil,
  Check,
  Loader2,
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

  const { profile } = useAuth();

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneCountryCode, setEditPhoneCountryCode] = useState("+91");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("receptionist");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [editEmailStatus, setEditEmailStatus] = useState<"idle" | "checking" | "available" | "conflict">("idle");
  const [editPhoneStatus, setEditPhoneStatus] = useState<"idle" | "checking" | "available" | "conflict">("idle");
  const [editEmailConflictMsg, setEditEmailConflictMsg] = useState<string | null>(null);
  const [editPhoneConflictMsg, setEditPhoneConflictMsg] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  // Real-time debounced conflict checking for Edit Gmail ID
  useEffect(() => {
    if (!editingStaff) return;
    const cleanGmail = editEmail.trim().toLowerCase();
    const oldEmail = (editingStaff.email || "").trim().toLowerCase();

    // If unchanged and valid
    if (cleanGmail && cleanGmail === oldEmail && !cleanGmail.endsWith("@phone.tenopilot.auth")) {
      setEditEmailStatus("available");
      setEditEmailConflictMsg(null);
      return;
    }

    if (!cleanGmail || cleanGmail.endsWith("@phone.tenopilot.auth") || !cleanGmail.endsWith("@gmail.com")) {
      setEditEmailStatus("idle");
      setEditEmailConflictMsg(null);
      return;
    }

    setEditEmailStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await checkStaffCredentialConflict({
          email: cleanGmail,
          excludeStaffId: editingStaff.id,
          excludeEmail: editingStaff.email,
          currentOrgId: profile?.organizationId,
          currentOwnerEmail: profile?.email,
          currentMasterUid: profile?.uid,
        });
        if (res.emailConflict) {
          setEditEmailStatus("conflict");
          if (res.emailConflictType === "same_org" && res.emailConflictDetails) {
            setEditEmailConflictMsg(
              `Already enrolled in this organization as ${res.emailConflictDetails.name} (${res.emailConflictDetails.role} - ${res.emailConflictDetails.propertyName}).`
            );
          } else {
            setEditEmailConflictMsg("This email ID is already in use by another organization.");
          }
        } else {
          setEditEmailStatus("available");
          setEditEmailConflictMsg(null);
        }
      } catch {
        setEditEmailStatus("idle");
        setEditEmailConflictMsg(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [editEmail, editingStaff, profile]);

  // Real-time debounced conflict checking for Edit Mobile Number
  useEffect(() => {
    if (!editingStaff) return;
    const pure10 = editPhone.replace(/\D/g, "").slice(-10);
    const oldPure10 = (editingStaff.phone || "").replace(/\D/g, "").slice(-10);

    // If unchanged and already 10 digits
    if (pure10 && pure10 === oldPure10 && pure10.length === 10) {
      setEditPhoneStatus("available");
      setEditPhoneConflictMsg(null);
      return;
    }

    if (!pure10 || pure10.length < 10) {
      setEditPhoneStatus("idle");
      setEditPhoneConflictMsg(null);
      return;
    }

    setEditPhoneStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await checkStaffCredentialConflict({
          phone: pure10,
          excludeStaffId: editingStaff.id,
          excludePhone: editingStaff.phone,
          currentOrgId: profile?.organizationId,
          currentOwnerEmail: profile?.email,
          currentMasterUid: profile?.uid,
        });
        if (res.phoneConflict) {
          setEditPhoneStatus("conflict");
          if (res.phoneConflictType === "same_org" && res.phoneConflictDetails) {
            setEditPhoneConflictMsg(
              `Already enrolled in this organization as ${res.phoneConflictDetails.name} (${res.phoneConflictDetails.role} - ${res.phoneConflictDetails.propertyName}).`
            );
          } else {
            setEditPhoneConflictMsg("This mobile number is already in use by another organization.");
          }
        } else {
          setEditPhoneStatus("available");
          setEditPhoneConflictMsg(null);
        }
      } catch {
        setEditPhoneStatus("idle");
        setEditPhoneConflictMsg(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [editPhone, editingStaff, profile]);

  const handleOpenEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setEditName(member.name || "");
    const cleanMail =
      member.email && !member.email.endsWith("@phone.tenopilot.auth") ? member.email : "";
    setEditEmail(cleanMail);
    setEditPhoneCountryCode(member.phoneCountryCode || "+91");
    const rawDigits = (member.phone || "").replace(/\D/g, "").slice(-10);
    setEditPhone(rawDigits);
    setEditRole(member.role);
    setEditStatus(member.status || "Active");
    setEditError(null);
    setEditEmailConflictMsg(null);
    setEditPhoneConflictMsg(null);
    setEditEmailStatus(cleanMail ? "available" : "idle");
    setEditPhoneStatus(rawDigits.length === 10 ? "available" : "idle");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Please enter staff member's full name.");
      return;
    }

    const cleanGmail = editEmail.trim().toLowerCase();
    const rawDigits = editPhone.replace(/\D/g, "");
    const pure10 = rawDigits.slice(-10);

    if (!cleanGmail && !pure10) {
      setEditError("Please provide either a Gmail ID (for Google Sign-In) or a Mobile Number (for WhatsApp OTP), or both.");
      return;
    }

    if (cleanGmail && !cleanGmail.endsWith("@gmail.com")) {
      setEditError("Gmail ID must end with @gmail.com (e.g. staffname@gmail.com). Google Sign-In requires an active Gmail address.");
      return;
    }

    if (editPhone.trim() && pure10.length !== 10) {
      setEditError("Please enter a valid 10-digit mobile number for WhatsApp OTP login.");
      return;
    }

    if (editEmailStatus === "conflict") {
      setEditError(editEmailConflictMsg || "This Gmail ID is already in use.");
      return;
    }

    if (editPhoneStatus === "conflict") {
      setEditError(editPhoneConflictMsg || "This mobile number is already in use.");
      return;
    }

    setIsSavingEdit(true);

    try {
      const cleanCountryCode = editPhoneCountryCode.trim() || "+91";
      const fullPhone = pure10 ? `${cleanCountryCode} ${pure10}` : "";

      await updateStaffFirebaseAccount({
        id: editingStaff.id,
        name: editName.trim(),
        email: cleanGmail,
        phone: fullPhone,
        countryCode: cleanCountryCode,
        role: editRole,
        assignedPropertyId: editingStaff.assignedPropertyId || propertyId,
        assignedPropertyIds: editingStaff.assignedPropertyIds || [propertyId],
        propertyName: editingStaff.propertyName || propertySettings.propertyName,
        status: editStatus,
        oldEmail: editingStaff.email,
        oldPhone: editingStaff.phone,
        organizationId: profile?.organizationId,
        masterAdminUid: profile?.uid,
        ownerEmail: profile?.email,
        ownerPhone: profile?.phone,
      });

      triggerToast(`✅ Updated account for ${editName.trim()}! Login credentials updated.`);
      setEditingStaff(null);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update staff account. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
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
      if (resetTargetStaff.email) {
        await syncUserSecurityPinToCloud(resetTargetStaff.email, resetNewPin);
      }
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
    if (!deleteTargetStaff) return;

    const isGoogleAccount =
      typeof window !== "undefined" &&
      localStorage.getItem("tenopilot_saved_session")?.toLowerCase().includes("@gmail.com");

    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (!isGoogleAccount && deletePassword) {
        try {
          await reauthenticateCurrentAccount(deletePassword);
        } catch (reauthErr) {
          console.warn("Re-authentication check fallback:", reauthErr);
        }
      }

      await staffStore.deleteGlobalStaff(deleteTargetStaff.id);
      triggerToast(`✓ Removed ${deleteTargetStaff.name} from team.`);
      setDeleteTargetStaff(null);
      setDeletePassword("");
    } catch (err: any) {
      setDeleteError(err?.message || "Deletion failed. Please try again.");
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
                const canEdit = staffStore.canUserEditStaff(activeRole, member.role) || member.email === profile?.email;

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

                        {/* Edit Staff Details & Mobile Number */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(member)}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#c2652a] text-xs font-bold flex items-center gap-1 border border-orange-200 transition-colors cursor-pointer"
                            title="Edit Staff Details & Mobile Number"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        )}
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
      {deleteTargetStaff && (() => {
        const isGoogleAccount =
          (typeof window !== "undefined" &&
            localStorage.getItem("tenopilot_saved_session")?.toLowerCase().includes("@gmail.com"));

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-red-100 text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-gray-900">
                      Confirm Permanent Deletion
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Deleting {deleteTargetStaff.name} ({deleteTargetStaff.role})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTargetStaff(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={confirmDeleteStaffWithPassword} className="space-y-4 text-xs">
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-700 leading-relaxed">
                  ⚠️ <strong>Security Check:</strong> Are you sure you want to permanently delete {deleteTargetStaff.name}&apos;s account? Their login access will be immediately revoked.
                </div>

                {deleteError && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-900 font-bold">
                    {deleteError}
                  </div>
                )}

                {!isGoogleAccount && (
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
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeleteTargetStaff(null)}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeleting || (!isGoogleAccount && !deletePassword)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    {isDeleting ? "Deleting..." : "Permanently Delete Staff"}
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ✏️ EDIT STAFF ACCOUNT MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#e8dfd8] shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-4 animate-in zoom-in-95 text-xs text-[#201a17] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f8ede3] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-100 text-[#964407]">
                  <Pencil className="w-5 h-5 text-[#c2652a]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Edit Staff Account
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Update credentials & mobile enrollment for {editingStaff.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Staff Full Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                />
              </div>

              {/* Gmail ID (for Google Sign-In) */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Gmail ID (for Google Sign-In)</label>
                <div className="relative">
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="staffname@gmail.com"
                    className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border font-medium text-gray-900 focus:ring-2 bg-white text-xs transition-colors ${
                      editEmailStatus === "conflict"
                        ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                        : editEmailStatus === "available"
                        ? "border-emerald-400 focus:ring-emerald-500"
                        : "border-gray-300 focus:ring-[#c2652a]"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    {editEmailStatus === "checking" && (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    )}
                    {editEmailStatus === "available" && (
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    {editEmailStatus === "conflict" && (
                      <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
                {editEmailStatus === "conflict" && editEmailConflictMsg && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <span>{editEmailConflictMsg}</span>
                  </p>
                )}
              </div>

              {/* Mobile Number (for WhatsApp OTP Login) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-gray-700">Mobile Number (for WhatsApp OTP Login)</label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    Enables Instant 1-Tap Login
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editPhoneCountryCode}
                    onChange={(e) => setEditPhoneCountryCode(e.target.value)}
                    placeholder="+91"
                    className="w-20 px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-center text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                  />
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="9876543210 (10 digits)"
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border font-medium text-gray-900 focus:ring-2 bg-white text-xs transition-colors ${
                        editPhoneStatus === "conflict"
                          ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                          : editPhoneStatus === "available"
                          ? "border-emerald-400 focus:ring-emerald-500"
                          : "border-gray-300 focus:ring-[#c2652a]"
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      {editPhoneStatus === "checking" && (
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      )}
                      {editPhoneStatus === "available" && (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      {editPhoneStatus === "conflict" && (
                        <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {editPhoneStatus === "conflict" && editPhoneConflictMsg && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <span>{editPhoneConflictMsg}</span>
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                  Saving a 10-digit number enables this staff member to immediately sign in using WhatsApp OTP.
                </p>
              </div>

              {/* Role Selection */}
              {editingStaff.role !== "master_admin" && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Role *</label>
                  <select
                    value={editRole}
                    disabled={activeRole === "admin"}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {activeRole === "master_admin" && (
                      <option value="admin">🏢 Property Admin (Manage assigned building)</option>
                    )}
                    <option value="receptionist">🔑 Receptionist (Front-Desk staff)</option>
                  </select>
                </div>
              )}

              {/* Account Status */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Account Status</label>
                <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setEditStatus("Active")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editStatus === "Active"
                        ? "bg-emerald-600 text-white shadow-xs font-extrabold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Active 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("Inactive")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editStatus === "Inactive"
                        ? "bg-gray-700 text-white shadow-xs font-extrabold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Inactive ⚪
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#f8ede3]">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingEdit ||
                    editEmailStatus === "checking" ||
                    editPhoneStatus === "checking" ||
                    editEmailStatus === "conflict" ||
                    editPhoneStatus === "conflict"
                  }
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c2652a] to-[#a8451f] hover:from-[#a8451f] hover:to-[#964407] text-white font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Staff Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
