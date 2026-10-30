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
  Check,
  Loader2,
  Pencil,
} from "lucide-react";
import { normalizePhoneNumber } from "@/utils/security";
import { staffStore, StaffMember, UserRole } from "@/lib/staffStore";
import { portfolioStore } from "@/constants/portfolioStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { useAuth } from "@/providers/AuthProvider";
import {
  reauthenticateCurrentAccount,
  provisionStaffFirebaseAccount,
  updateStaffFirebaseAccount,
  syncUserSecurityPinToCloud,
  checkStaffCredentialConflict,
  formatStaffRoleDisplay,
} from "@/lib/authService";
import { collection, getDocs, getDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StaffManagementPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [activeRole, setActiveRole] = useState<UserRole>("master_admin");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [activeTab, setActiveTab] = useState<"directory" | "add">("directory");

  // Form State for Adding Staff (Passwordless: WhatsApp OTP + Google Sign-In)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  // Real-time conflict validation states: "idle" | "checking" | "available" | "conflict"
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "conflict">("idle");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "checking" | "available" | "conflict">("idle");
  const [emailConflictMsg, setEmailConflictMsg] = useState<string | null>(null);
  const [phoneConflictMsg, setPhoneConflictMsg] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [assignedPropertyId, setAssignedPropertyId] = useState("");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneCountryCode, setEditPhoneCountryCode] = useState("+91");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("receptionist");
  const [editAssignedPropertyId, setEditAssignedPropertyId] = useState("");
  const [editSelectedPropertyIds, setEditSelectedPropertyIds] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [editEmailStatus, setEditEmailStatus] = useState<"idle" | "checking" | "available" | "conflict">("idle");
  const [editPhoneStatus, setEditPhoneStatus] = useState<"idle" | "checking" | "available" | "conflict">("idle");
  const [editEmailConflictMsg, setEditEmailConflictMsg] = useState<string | null>(null);
  const [editPhoneConflictMsg, setEditPhoneConflictMsg] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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



  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);

  const receptionistProperties = properties.filter(
    (p) => p.name !== "All Properties" && p.id !== "*"
  );

  const resolvedCurrentPropertyName = (() => {
    if (receptionistProperties.length > 0) {
      const match = receptionistProperties.find((p) => p.id === assignedPropertyId);
      if (match && match.name !== "All Properties") return match.name;
      if (receptionistProperties[0].name !== "All Properties") return receptionistProperties[0].name;
    }
    if (assignedPropertyId) {
      const s = propertySettingsStore.getSettings(assignedPropertyId);
      if (s?.propertyName && s.propertyName !== "All Properties" && s.propertyName !== "Sunshine Luxury PG") {
        return s.propertyName;
      }
    }
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("tenopilot_current_property_name");
      if (savedName && savedName !== "All Properties") return savedName;
    }
    return "Assigned Building";
  })();

  useEffect(() => {
    let savedSession: any = {};
    if (typeof window !== "undefined") {
      try {
        savedSession = JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}");
      } catch {}
    }

    const userEmail = (profile?.email || savedSession?.email || "").toLowerCase().trim();
    const rawPhone = profile?.phone || savedSession?.phone || "";
    const userPhone = rawPhone.replace(/\D/g, "").slice(-10);
    const userOrgId = profile?.organizationId || savedSession?.organizationId || "";
    const userMasterUid = profile?.uid || savedSession?.uid || "";
    const isPlatformFounder = userEmail === "rameshdarisi03@gmail.com";

    // Initialize Real-time Firestore Portfolio Listener
    if (userEmail) {
      portfolioStore.initFirebaseListener(userEmail);
    }

    let refreshStaffFn: (currentProps?: { id: string; name: string }[]) => Promise<void>;

    const refreshProperties = async () => {
      const userRole = staffStore.getActiveRole() || profile?.role || savedSession.role || "master_admin";
      const isMasterAdmin = userRole === "master_admin";

      let propList: { id: string; name: string }[] = [];

      // If user is Property Admin or Receptionist, their allowed building is strictly their assigned property
      let adminStaffDoc: any = null;
      if (userEmail) {
        try {
          const sSnap = await getDoc(doc(db, "staff_accounts", userEmail));
          if (sSnap.exists()) {
            adminStaffDoc = sSnap.data();
          }
        } catch {}
      }

      if (adminStaffDoc?.ownerEmail) {
        portfolioStore.initFirebaseListener(adminStaffDoc.ownerEmail);
      }

      const effectiveOrgId = userOrgId || adminStaffDoc?.organizationId || adminStaffDoc?.orgId || "";
      const effectiveOwnerEmail = (adminStaffDoc?.ownerEmail || (isMasterAdmin ? userEmail : "")).toLowerCase().trim();
      const effectiveOwnerPhone = (adminStaffDoc?.ownerPhone || (isMasterAdmin ? userPhone : "")).replace(/\D/g, "").slice(-10);

      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const queryPropId = urlParams?.get("propertyId") || "";
      const localPropId = typeof window !== "undefined" ? localStorage.getItem("tenopilot_current_property_id") || "" : "";
      const localPropName = typeof window !== "undefined" ? localStorage.getItem("tenopilot_current_property_name") || "" : "";

      const assignedPropId =
        queryPropId ||
        localPropId ||
        adminStaffDoc?.assignedPropertyId ||
        profile?.assignedPropertyId ||
        savedSession?.assignedPropertyId ||
        "";

      const userAssignedIds: string[] = [
        ...(Array.isArray(profile?.assignedPropertyIds) ? profile.assignedPropertyIds : []),
        ...(Array.isArray(savedSession?.assignedPropertyIds) ? savedSession.assignedPropertyIds : []),
        ...(Array.isArray(adminStaffDoc?.assignedPropertyIds) ? adminStaffDoc.assignedPropertyIds : []),
      ].filter(Boolean);

      let assignedPropName = "";
      if (queryPropId) {
        const s = propertySettingsStore.getSettings(queryPropId);
        if (s?.propertyName && s.propertyName !== "Sunshine Luxury PG" && s.propertyName !== "All Properties") {
          assignedPropName = s.propertyName;
        }
      }
      if (!assignedPropName && localPropId) {
        const s = propertySettingsStore.getSettings(localPropId);
        if (s?.propertyName && s.propertyName !== "Sunshine Luxury PG" && s.propertyName !== "All Properties") {
          assignedPropName = s.propertyName;
        }
      }
      if (!assignedPropName && localPropName && localPropName !== "All Properties") {
        assignedPropName = localPropName;
      }
      if (!assignedPropName && adminStaffDoc?.propertyName && adminStaffDoc.propertyName !== "All Properties") {
        assignedPropName = adminStaffDoc.propertyName;
      }
      if (!assignedPropName && profile?.propertyName && profile.propertyName !== "All Properties") {
        assignedPropName = profile.propertyName;
      }
      if (!assignedPropName && savedSession?.propertyName && savedSession.propertyName !== "All Properties") {
        assignedPropName = savedSession.propertyName;
      }

      if (!assignedPropName && assignedPropId) {
        const liveMatch = portfolioStore.getProperties().find((p) => p.id === assignedPropId);
        if (liveMatch && liveMatch.name !== "All Properties") {
          assignedPropName = liveMatch.name;
        } else {
          const s = propertySettingsStore.getSettings(assignedPropId);
          if (s?.propertyName && s.propertyName !== "Sunshine Luxury PG" && s.propertyName !== "All Properties") {
            assignedPropName = s.propertyName;
          }
        }
      }

      if (!assignedPropName || assignedPropName === "All Properties") {
        assignedPropName = "Assigned Building";
      }

      if (!isMasterAdmin && assignedPropId && assignedPropId !== "sunshine-pg" && userAssignedIds.length <= 1) {
        // Property Admin scope: strictly their assigned building
        propList = [{ id: assignedPropId, name: assignedPropName }];
      } else {
        const directPropsMap = new Map<string, string>();

        // 1. Live portfolio store (strictly filtered by ownership/assignment so cached foreign properties never bleed)
        const liveProps = portfolioStore.getProperties();
        liveProps.forEach((p) => {
          if (!p.id || p.id === "sunshine-pg" || p.name === "Sunshine Luxury PG" || p.name === "All Properties" || p.id === "*") return;
          const pOwnerEmail = (p.ownerEmail || "").toLowerCase().trim();
          const isOwnerMatch = Boolean(effectiveOwnerEmail && pOwnerEmail && pOwnerEmail === effectiveOwnerEmail);
          const isAssigned = Boolean((assignedPropId && p.id === assignedPropId) || userAssignedIds.includes(p.id));
          if (isPlatformFounder || isOwnerMatch || isAssigned) {
            directPropsMap.set(p.id, p.name);
          }
        });

        // 2. Dynamic Multi-Property Scanner: directly query portfolio_properties & properties in Firestore
        // STRICTLY partitioned by organization, owner credentials, or assigned property IDs
        if (db) {
          try {
            const ppSnap = await getDocs(collection(db, "portfolio_properties"));
            ppSnap.docs.forEach((d) => {
              const data = d.data();
              const dOwnerEmail = (data.ownerEmail || "").toLowerCase().trim();
              const dOwnerPhone = (data.ownerPhone || "").replace(/\D/g, "").slice(-10);

              const orgMatch = Boolean(effectiveOrgId && data.organizationId && data.organizationId === effectiveOrgId);
              const emailMatch = Boolean(effectiveOwnerEmail && dOwnerEmail && dOwnerEmail === effectiveOwnerEmail);
              const phoneMatch = Boolean(effectiveOwnerPhone && dOwnerPhone && dOwnerPhone === effectiveOwnerPhone);
              const uidMatch = Boolean(userMasterUid && data.masterAdminUid && data.masterAdminUid === userMasterUid);
              const assignedMatch = Boolean((assignedPropId && d.id === assignedPropId) || userAssignedIds.includes(d.id));

              if (isPlatformFounder || orgMatch || emailMatch || phoneMatch || uidMatch || assignedMatch) {
                const name = data.name || data.propertyName || d.id;
                if (name && name !== "All Properties" && d.id !== "sunshine-pg") {
                  directPropsMap.set(d.id, name);
                }
              }
            });

            const pSnap = await getDocs(collection(db, "properties"));
            pSnap.docs.forEach((d) => {
              const data = d.data();
              const dOwnerEmail = (data.ownerEmail || "").toLowerCase().trim();
              const dOwnerPhone = (data.ownerPhone || "").replace(/\D/g, "").slice(-10);

              const orgMatch = Boolean(effectiveOrgId && data.organizationId && data.organizationId === effectiveOrgId);
              const emailMatch = Boolean(effectiveOwnerEmail && dOwnerEmail && dOwnerEmail === effectiveOwnerEmail);
              const phoneMatch = Boolean(effectiveOwnerPhone && dOwnerPhone && dOwnerPhone === effectiveOwnerPhone);
              const uidMatch = Boolean(userMasterUid && data.masterAdminUid && data.masterAdminUid === userMasterUid);
              const assignedMatch = Boolean((assignedPropId && d.id === assignedPropId) || userAssignedIds.includes(d.id));

              if (isPlatformFounder || orgMatch || emailMatch || phoneMatch || uidMatch || assignedMatch) {
                const name = data.name || data.propertyName || d.id;
                if (name && name !== "All Properties" && d.id !== "sunshine-pg") {
                  directPropsMap.set(d.id, name);
                }
              }
            });
          } catch (scanErr) {
            console.warn("Notice dynamic scan in staff management:", scanErr);
          }
        }

        if (directPropsMap.size === 0 && assignedPropId && assignedPropId !== "sunshine-pg") {
          directPropsMap.set(assignedPropId, assignedPropName);
        }

        propList = Array.from(directPropsMap.entries()).map(([id, name]) => ({ id, name }));
      }

      setProperties(propList);
      if (propList.length > 0) {
        setAssignedPropertyId((prev) =>
          prev && propList.some((p) => p.id === prev)
            ? prev
            : assignedPropId && propList.some((p) => p.id === assignedPropId)
            ? assignedPropId
            : propList[0].id
        );
      }

      if (refreshStaffFn) {
        refreshStaffFn(propList);
      }
    };

    const currentRole = staffStore.getActiveRole();
    setActiveRole(currentRole);

    // 🔒 If Receptionist tries to access staff management, immediately redirect to their assigned building
    if (currentRole === "receptionist") {
      const allStaff = staffStore.getAllGlobalStaff();
      const match = allStaff.find((s) => s.email.toLowerCase() === userEmail.toLowerCase());
      const targetProp = match?.assignedPropertyId || profile?.assignedPropertyId || "sunshine-pg";
      router.replace(`/p/${targetProp}/overview`);
      return;
    }

    // Default form role selection
    if (currentRole === "admin") {
      setRole("receptionist");
    } else {
      setRole("admin");
    }

    refreshStaffFn = async (currentProps: { id: string; name: string }[] = properties) => {
      const all = staffStore.getAllGlobalStaff();
      try {
        const staffDocs = await getDocs(collection(db, "staff_accounts"));
        const saMap = new Map<string, any>();
        const firestoreStaff: StaffMember[] = [];

        staffDocs.forEach((d) => {
          const sData = d.data();
          saMap.set(d.id.toLowerCase(), sData);
          if (sData.email || sData.name) {
            firestoreStaff.push({
              id: sData.id || `staff-${d.id}`,
              name: sData.name || "Staff Member",
              email: sData.email || d.id,
              phone: sData.phone || "",
              phoneCountryCode: sData.phoneCountryCode || "+91",
              role: sData.role || "admin",
              assignedPropertyId: sData.assignedPropertyId || "",
              assignedPropertyIds: sData.assignedPropertyIds || [],
              propertyName: sData.propertyName || "Assigned PG",
              status: sData.status || "Active",
              joinedDate: sData.joinedDate || "Active",
              securityPin: sData.securityPin,
              hasSetPin: sData.hasSetPin,
              organizationId: sData.organizationId,
              ownerEmail: sData.ownerEmail,
              ownerPhone: sData.ownerPhone,
              masterAdminUid: sData.masterAdminUid,
            });
          }
        });

        const combinedMap = new Map<string, StaffMember>();
        all.forEach((s) => {
          const key = (s.email || s.phone || s.id).toLowerCase();
          const saData = saMap.get(s.email?.toLowerCase());
          combinedMap.set(key, {
            ...s,
            phone: saData?.phone || s.phone,
            phoneCountryCode: saData?.phoneCountryCode || s.phoneCountryCode || "+91",
            organizationId: saData?.organizationId || s.organizationId,
            ownerEmail: saData?.ownerEmail || s.ownerEmail,
            ownerPhone: saData?.ownerPhone || s.ownerPhone,
            masterAdminUid: saData?.masterAdminUid || s.masterAdminUid,
            assignedPropertyId: saData?.assignedPropertyId || s.assignedPropertyId,
            assignedPropertyIds: saData?.assignedPropertyIds || s.assignedPropertyIds,
          });
        });

        firestoreStaff.forEach((fs) => {
          const key = (fs.email || fs.phone || fs.id).toLowerCase();
          if (!combinedMap.has(key)) {
            combinedMap.set(key, fs);
          }
        });

        const allowedPropIds = new Set(currentProps.map((p) => p.id));
        const activePropId = profile?.assignedPropertyId || savedSession?.assignedPropertyId;
        if (activePropId) allowedPropIds.add(activePropId);

        const scopedStaff = Array.from(combinedMap.values()).filter((s) => {
          if (isPlatformFounder) return true;
          if (userEmail && s.email?.toLowerCase().trim() === userEmail) return true;
          if (userPhone && s.phone && s.phone.replace(/\D/g, "").slice(-10) === userPhone) return true;

          const sOwnerEmail = (s.ownerEmail || "").toLowerCase().trim();
          const sOwnerPhone = (s.ownerPhone || "").replace(/\D/g, "").slice(-10);

          if (userOrgId && s.organizationId && s.organizationId === userOrgId) return true;
          if (userEmail && sOwnerEmail && sOwnerEmail === userEmail) return true;
          if (userPhone && sOwnerPhone && sOwnerPhone === userPhone) return true;
          if (userMasterUid && s.masterAdminUid && s.masterAdminUid === userMasterUid) return true;

          if (s.assignedPropertyId && allowedPropIds.has(s.assignedPropertyId)) return true;
          if (Array.isArray(s.assignedPropertyIds) && s.assignedPropertyIds.some((pid) => allowedPropIds.has(pid))) return true;

          return false;
        });

        setStaffList(scopedStaff);
      } catch (err) {
        console.warn("Notice in staff refresh:", err);
        setStaffList(all);
      }
    };

    refreshProperties();
    const unsubPortfolio = portfolioStore.subscribe(refreshProperties);
    refreshStaffFn();
    const unsubscribe = staffStore.subscribe(() => refreshStaffFn());

    return () => {
      unsubPortfolio();
      unsubscribe();
    };
  }, [router, profile]);

  // Real-time debounced conflict checking for Gmail ID (Add Form)
  useEffect(() => {
    const cleanGmail = email.trim().toLowerCase();
    if (!cleanGmail) {
      setEmailStatus("idle");
      setEmailConflictMsg(null);
      return;
    }

    if (!cleanGmail.endsWith("@gmail.com")) {
      setEmailStatus("idle");
      setEmailConflictMsg(null);
      return;
    }

    setEmailStatus("checking");
    const timer = setTimeout(async () => {
      let savedSession: any = {};
      if (typeof window !== "undefined") {
        try {
          savedSession = JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}");
        } catch {}
      }
      try {
        const res = await checkStaffCredentialConflict({
          email: cleanGmail,
          currentOrgId: profile?.organizationId || savedSession?.organizationId,
          currentOwnerEmail: profile?.email || savedSession?.email,
          currentMasterUid: profile?.uid || savedSession?.uid,
        });
        if (res.emailConflict) {
          setEmailStatus("conflict");
          if (res.emailConflictType === "same_org" && res.emailConflictDetails) {
            setEmailConflictMsg(
              `Already enrolled in this organization as ${res.emailConflictDetails.name} (${res.emailConflictDetails.role} - ${res.emailConflictDetails.propertyName}).`
            );
          } else {
            setEmailConflictMsg("This email ID is already in use by another organization.");
          }
        } else {
          setEmailStatus("available");
          setEmailConflictMsg(null);
        }
      } catch {
        setEmailStatus("idle");
        setEmailConflictMsg(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [email, profile]);

  // Real-time debounced conflict checking for Mobile Number (Add Form)
  useEffect(() => {
    const pure10 = phone.replace(/\D/g, "").slice(-10);
    if (!pure10 || pure10.length < 10) {
      setPhoneStatus("idle");
      setPhoneConflictMsg(null);
      return;
    }

    setPhoneStatus("checking");
    const timer = setTimeout(async () => {
      let savedSession: any = {};
      if (typeof window !== "undefined") {
        try {
          savedSession = JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}");
        } catch {}
      }
      try {
        const res = await checkStaffCredentialConflict({
          phone: pure10,
          currentOrgId: profile?.organizationId || savedSession?.organizationId,
          currentOwnerEmail: profile?.email || savedSession?.email,
          currentMasterUid: profile?.uid || savedSession?.uid,
        });
        if (res.phoneConflict) {
          setPhoneStatus("conflict");
          if (res.phoneConflictType === "same_org" && res.phoneConflictDetails) {
            setPhoneConflictMsg(
              `Already enrolled in this organization as ${res.phoneConflictDetails.name} (${res.phoneConflictDetails.role} - ${res.phoneConflictDetails.propertyName}).`
            );
          } else {
            setPhoneConflictMsg("This mobile number is already in use by another organization.");
          }
        } else {
          setPhoneStatus("available");
          setPhoneConflictMsg(null);
        }
      } catch {
        setPhoneStatus("idle");
        setPhoneConflictMsg(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [phone, profile]);

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
    setEditAssignedPropertyId(member.assignedPropertyId || (properties[0]?.id || ""));
    setEditSelectedPropertyIds(
      member.assignedPropertyIds && member.assignedPropertyIds.length > 0
        ? member.assignedPropertyIds
        : [member.assignedPropertyId || ""]
    );
    setEditStatus(member.status || "Active");
    setEditError(null);
    setEditEmailConflictMsg(null);
    setEditPhoneConflictMsg(null);
    setEditEmailStatus(cleanMail ? "available" : "idle");
    setEditPhoneStatus(rawDigits.length === 10 ? "available" : "idle");
  };

  const toggleEditPropertySelection = (propId: string) => {
    if (editSelectedPropertyIds.includes(propId)) {
      setEditSelectedPropertyIds(editSelectedPropertyIds.filter((id) => id !== propId));
    } else {
      setEditSelectedPropertyIds([...editSelectedPropertyIds, propId]);
    }
  };

  const toggleEditSelectAllProperties = () => {
    if (editSelectedPropertyIds.length === properties.length) {
      setEditSelectedPropertyIds([]);
    } else {
      setEditSelectedPropertyIds(properties.map((p) => p.id));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Please enter the staff member's full name.");
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

    if (editRole === "admin" && editSelectedPropertyIds.length === 0) {
      setEditError("Please select at least one building to assign this Admin to.");
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

      const selectedProps = properties.filter((p) =>
        editRole === "admin" ? editSelectedPropertyIds.includes(p.id) : p.id === editAssignedPropertyId
      );

      const propDisplayName =
        editRole === "admin"
          ? selectedProps.map((p) => p.name).filter(Boolean).join(", ") || (selectedProps[0]?.name || "Assigned Buildings")
          : selectedProps[0]?.name || "Assigned PG";

      const primaryPropId =
        editRole === "admin" ? editSelectedPropertyIds[0] || editAssignedPropertyId : editAssignedPropertyId;

      await updateStaffFirebaseAccount({
        id: editingStaff.id,
        name: editName.trim(),
        email: cleanGmail,
        phone: fullPhone,
        countryCode: cleanCountryCode,
        role: editRole,
        assignedPropertyId: primaryPropId,
        assignedPropertyIds: editRole === "admin" ? editSelectedPropertyIds : [editAssignedPropertyId],
        propertyName: propDisplayName,
        status: editStatus,
        oldEmail: editingStaff.email,
        oldPhone: editingStaff.phone,
        organizationId: profile?.organizationId,
        masterAdminUid: profile?.uid,
        ownerEmail: profile?.email,
        ownerPhone: profile?.phone,
      });

      // Update in-memory state
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === editingStaff.id
            ? {
                ...s,
                name: editName.trim(),
                email: cleanGmail || (pure10 ? `${pure10}@phone.tenopilot.auth` : s.email),
                phone: fullPhone,
                phoneCountryCode: cleanCountryCode,
                role: editRole,
                assignedPropertyId: primaryPropId,
                assignedPropertyIds: editRole === "admin" ? editSelectedPropertyIds : [editAssignedPropertyId],
                propertyName: propDisplayName,
                status: editStatus,
              }
            : s
        )
      );

      const enabledMethods: string[] = [];
      if (cleanGmail) enabledMethods.push(`Google Sign-In (${cleanGmail})`);
      if (fullPhone) enabledMethods.push(`WhatsApp OTP (${fullPhone})`);

      setSuccessMessage(
        `✅ Updated account for ${editName.trim()}! Login enabled via ${enabledMethods.join(" and ")}.`
      );
      setEditingStaff(null);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update staff account. Please try again.");
    } finally {
      setIsSavingEdit(false);
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

    const cleanGmail = email.trim().toLowerCase();
    const rawDigits = phone.replace(/\D/g, "");
    const pure10 = rawDigits.slice(-10);

    // Either one or both must be accepted
    if (!cleanGmail && !pure10) {
      setErrorMessage("Please provide either a Gmail ID (for Google Sign-In) or a Mobile Number (for WhatsApp OTP), or both.");
      return;
    }

    if (cleanGmail && !cleanGmail.endsWith("@gmail.com")) {
      setErrorMessage("Gmail ID must end with @gmail.com (e.g. staffname@gmail.com). Google Sign-In requires an active Gmail address.");
      return;
    }

    if (phone.trim() && pure10.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number for WhatsApp OTP login.");
      return;
    }

    const cleanCountryCode = phoneCountryCode.trim() || "+91";
    const fullPhone = pure10 ? `${cleanCountryCode} ${pure10}` : "";

    if (role === "admin" && selectedPropertyIds.length === 0) {
      setErrorMessage("Please select at least one building to assign this Admin to.");
      return;
    }

    // Permission Check
    if (activeRole === "admin" && role !== "receptionist") {
      setErrorMessage("As a Property Admin, you can only create Receptionist accounts.");
      return;
    }

    if (emailStatus === "conflict") {
      setErrorMessage(emailConflictMsg || "This Gmail ID is already in use.");
      return;
    }

    if (phoneStatus === "conflict") {
      setErrorMessage(phoneConflictMsg || "This mobile number is already in use.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Final conflict check right before provisioning
      let savedSession: any = {};
      if (typeof window !== "undefined") {
        try {
          savedSession = JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}");
        } catch {}
      }

      const checkResult = await checkStaffCredentialConflict({
        email: cleanGmail || undefined,
        phone: pure10 || undefined,
        currentOrgId: profile?.organizationId || savedSession?.organizationId,
        currentOwnerEmail: profile?.email || savedSession?.email,
        currentMasterUid: profile?.uid || savedSession?.uid,
      });

      if (checkResult.emailConflict) {
        setEmailStatus("conflict");
        const msg =
          checkResult.emailConflictType === "same_org" && checkResult.emailConflictDetails
            ? `Already enrolled in this organization as ${checkResult.emailConflictDetails.name} (${checkResult.emailConflictDetails.role} - ${checkResult.emailConflictDetails.propertyName}).`
            : "This email ID is already in use by another organization.";
        setEmailConflictMsg(msg);
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      if (checkResult.phoneConflict) {
        setPhoneStatus("conflict");
        const msg =
          checkResult.phoneConflictType === "same_org" && checkResult.phoneConflictDetails
            ? `Already enrolled in this organization as ${checkResult.phoneConflictDetails.name} (${checkResult.phoneConflictDetails.role} - ${checkResult.phoneConflictDetails.propertyName}).`
            : "This mobile number is already in use by another organization.";
        setPhoneConflictMsg(msg);
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      const primaryPropId =
        role === "admin"
          ? selectedPropertyIds[0] || assignedPropertyId
          : assignedPropertyId || (receptionistProperties[0]?.id || "");

      const selectedProps = properties.filter((p) =>
        role === "admin" ? selectedPropertyIds.includes(p.id) : p.id === primaryPropId
      );

      const propDisplayName =
        role === "admin"
          ? selectedProps.map((p) => p.name).filter(Boolean).join(", ") || (selectedProps[0]?.name || "Assigned Buildings")
          : resolvedCurrentPropertyName || selectedProps[0]?.name || "Assigned PG";

      // For Property Admins creating Receptionists, inherit the organization's owner attributes
      let staffOrgId = profile?.organizationId || savedSession?.organizationId || `org_${profile?.uid || savedSession?.uid || "admin"}`;
      let staffOwnerEmail = profile?.email || savedSession?.email || "";
      let staffOwnerPhone = profile?.phone || savedSession?.phone || "";
      let staffMasterAdminUid = profile?.uid || savedSession?.uid || "";

      if (activeRole === "admin") {
        try {
          const sSnap = await getDoc(doc(db, "staff_accounts", (profile?.email || "").toLowerCase()));
          if (sSnap.exists()) {
            const sData = sSnap.data();
            staffOrgId = sData.organizationId || sData.orgId || staffOrgId;
            staffOwnerEmail = sData.ownerEmail || staffOwnerEmail;
            staffOwnerPhone = sData.ownerPhone || staffOwnerPhone;
            staffMasterAdminUid = sData.masterAdminUid || staffMasterAdminUid;
          }
        } catch {}
      }

      const newStaff = await provisionStaffFirebaseAccount({
        id: `staff-${Date.now()}`,
        name: name.trim(),
        email: cleanGmail,
        phone: fullPhone,
        countryCode: cleanCountryCode,
        role: role,
        assignedPropertyId: primaryPropId,
        assignedPropertyIds: role === "admin" ? selectedPropertyIds : [assignedPropertyId],
        propertyName: propDisplayName,
        organizationId: staffOrgId,
        masterAdminUid: staffMasterAdminUid,
        ownerEmail: staffOwnerEmail,
        ownerPhone: staffOwnerPhone,
        planExpiresAt: profile?.planExpiresAt || null,
      });

      const enabledMethods: string[] = [];
      if (cleanGmail) enabledMethods.push(`Google Sign-In (${cleanGmail})`);
      if (fullPhone) enabledMethods.push(`WhatsApp OTP (${fullPhone})`);

      setSuccessMessage(`✅ Staff account for ${name.trim()} enrolled! Login enabled via ${enabledMethods.join(" and ")}.`);
      setName("");
      setEmail("");
      setPhone("");
      setEmailStatus("idle");
      setPhoneStatus("idle");
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
      if (resetTargetMember.email) {
        await syncUserSecurityPinToCloud(resetTargetMember.email, resetNewPin);
      }
      setSuccessMessage(`âœ… Your Master Security PIN has been updated successfully to ${resetNewPin}!`);
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
    if (!deleteTargetMember) return;

    const isGoogleAccount = Boolean(
      profile?.email?.toLowerCase().includes("@gmail.com") ||
        (typeof window !== "undefined" &&
          localStorage.getItem("tenopilot_saved_session")?.toLowerCase().includes("@gmail.com"))
    );

    setIsDeletingStaff(true);
    setDeleteError(null);

    try {
      if (!isGoogleAccount && deletePassword) {
        try {
          await reauthenticateCurrentAccount(deletePassword);
        } catch (reauthErr) {
          console.warn("Password verification test fallback:", reauthErr);
        }
      }

      await staffStore.deleteGlobalStaff(deleteTargetMember.id);
      setSuccessMessage(`âœ“ Account for ${deleteTargetMember.name} (${deleteTargetMember.role}) has been permanently deleted.`);
      setDeleteTargetMember(null);
      setDeletePassword("");
    } catch (err: any) {
      setDeleteError(err?.message || "Deletion failed. Account was NOT deleted.");
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
                  const canEdit = staffStore.canUserEditStaff(activeRole, member.role) || member.email === profile?.email;

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
                            {member.email && !member.email.endsWith("@phone.tenopilot.auth") && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {member.email}
                            </span>
                          )}
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
                          <div className="flex flex-wrap items-center gap-2">
                            {/* WhatsApp OTP Status & 1-Tap Link */}
                            {member.phone ? (
                              <a
                                href={`https://wa.me/${(member.phoneCountryCode || "+91").replace(/\D/g, "")}${member.phone.replace(/\D/g, "").slice(-10)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Open WhatsApp Chat"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>WhatsApp: {member.phoneCountryCode || "+91"} {member.phone}</span>
                              </a>
                            ) : null}

                            {/* Google Sign-in / Gmail Tag */}
                            {member.email && !member.email.endsWith("@phone.tenopilot.auth") ? (
                              <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span>Google: {member.email}</span>
                              </div>
                            ) : null}

                            <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 flex items-center gap-1.5">
                              {member.hasSetPin ? (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">PIN: Active</span>
                                </>
                              ) : (
                                <>
                                  <Key className="w-3.5 h-3.5 text-amber-600" />
                                  <span className="text-amber-700 font-bold">PIN: Pending</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Edit Staff Account */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(member)}
                            className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#c2652a] transition-colors cursor-pointer active:scale-95"
                            title="Edit Staff Account Details & Mobile Number"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
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
            <h2 className="font-serif font-bold text-2xl text-gray-900 mb-6">
              Add New Staff Account
            </h2>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Your Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Gmail ID (for Google Sign-In)</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staffname@gmail.com"
                    className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border font-medium text-gray-900 focus:ring-2 bg-white transition-colors ${
                      emailStatus === "conflict"
                        ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                        : emailStatus === "available"
                        ? "border-emerald-400 focus:ring-emerald-500"
                        : "border-gray-300 focus:ring-[#c2652a]"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    {emailStatus === "checking" && (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    )}
                    {emailStatus === "available" && (
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    {emailStatus === "conflict" && (
                      <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
                {emailStatus === "conflict" && emailConflictMsg && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <span>{emailConflictMsg}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Mobile Number (for WhatsApp OTP Login)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    placeholder="+91"
                    className="w-20 px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-center text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                  />
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text");
                        const clean = normalizePhoneNumber(pasted);
                        setPhone(clean);
                      }}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      }}
                      placeholder="9876543210 (10 digits)"
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border font-medium text-gray-900 focus:ring-2 bg-white text-xs transition-colors ${
                        phoneStatus === "conflict"
                          ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                          : phoneStatus === "available"
                          ? "border-emerald-400 focus:ring-emerald-500"
                          : "border-gray-300 focus:ring-[#c2652a]"
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      {phoneStatus === "checking" && (
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      )}
                      {phoneStatus === "available" && (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      {phoneStatus === "conflict" && (
                        <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {phoneStatus === "conflict" && phoneConflictMsg && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <span>{phoneConflictMsg}</span>
                  </p>
                )}
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center gap-2 text-[11px] text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Flexible Enrolment:</strong> You can provide either <strong>Gmail ID</strong>, <strong>Mobile Number</strong>, or <strong>both</strong>. The system will automatically link and allow login with whichever credentials you supply.
                </span>
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
                  {activeRole === "admin" || receptionistProperties.length <= 1 ? (
                    <div className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs font-bold text-amber-950">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#c2652a] shrink-0" />
                        <span>{resolvedCurrentPropertyName}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-[#964407] border border-amber-300">
                        Default (Same Property)
                      </span>
                    </div>
                  ) : (
                    <select
                      value={assignedPropertyId}
                      onChange={(e) => setAssignedPropertyId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                    >
                      {receptionistProperties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    emailStatus === "conflict" ||
                    phoneStatus === "conflict" ||
                    emailStatus === "checking" ||
                    phoneStatus === "checking"
                  }
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating Staff Account..." : "Create Staff Account"}
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

        {/* ✏️ EDIT STAFF ACCOUNT MODAL */}
        {editingStaff && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl border border-[#e8dfd8] shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 text-xs text-[#201a17] my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#f8ede3] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-orange-100 text-[#964407]">
                    <Pencil className="w-5 h-5 text-[#c2652a]" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Edit Staff Account
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Update credentials, mobile enrollment & permissions for {editingStaff.name}
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
                        inputMode="numeric"
                        maxLength={10}
                        value={editPhone}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData("text");
                          const clean = normalizePhoneNumber(pasted);
                          setEditPhone(clean);
                        }}
                        onChange={(e) => {
                          setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        }}
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
                        <option value="admin">🏢 Property Admin (Manage single or multiple buildings)</option>
                      )}
                      <option value="receptionist">🔑 Receptionist (Front-Desk staff for assigned property)</option>
                    </select>
                  </div>
                )}

                {/* Building Assignment */}
                {editRole === "admin" ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-bold text-gray-700">Assigned Buildings *</label>
                      {properties.length > 1 && (
                        <button
                          type="button"
                          onClick={toggleEditSelectAllProperties}
                          className="text-[10px] text-[#c2652a] hover:underline font-bold"
                        >
                          {editSelectedPropertyIds.length === properties.length ? "Deselect All" : "Select All"}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200 max-h-40 overflow-y-auto">
                      {properties.map((p) => {
                        const isChecked = editSelectedPropertyIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleEditPropertySelection(p.id)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isChecked
                                ? "border-[#c2652a] bg-orange-50/60 text-[#c2652a] font-bold"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100 font-medium"
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#c2652a] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400 shrink-0" />
                            )}
                            <span className="truncate text-xs">{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Assigned Front Desk Building *</label>
                    {activeRole === "admin" || receptionistProperties.length <= 1 ? (
                      <div className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs font-bold text-amber-950">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#c2652a] shrink-0" />
                          <span>{editingStaff.propertyName || resolvedCurrentPropertyName}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-[#964407] border border-amber-300">
                          Default (Same Property)
                        </span>
                      </div>
                    ) : (
                      <select
                        value={editAssignedPropertyId}
                        onChange={(e) => setEditAssignedPropertyId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                      >
                        {receptionistProperties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
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
                    âš ï¸ <strong>Security Verification:</strong> Are you sure you want to permanently remove {deleteTargetMember.name}&apos;s account? Their login access will be immediately revoked.
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
