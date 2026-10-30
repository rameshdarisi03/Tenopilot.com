"use client";

import { use, useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ScanFace,
  Users,
  QrCode,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ShieldCheck,
  Phone,
  Mail,
  Home,
  Car,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  Printer,
  Sparkles,
  ExternalLink,
  ChevronDown,
  X,
  FileText,
  UserCheck2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  MessageSquare,
  RefreshCw,
  Search,
  Loader2,
  Link2,
} from "lucide-react";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import {
  selfKycStore,
  SelfKycSubmission,
  SelfKycInvite,
} from "@/lib/selfKycStore";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { propertySettingsStore } from "@/constants/propertySettings";
import { SelfKycDeskStandeeModal } from "@/components/SelfKycDeskStandeeModal";
import { buildWhatsAppUrl, normalizePhoneNumber, formatDisplayPhone } from "@/utils/security";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";
import { getCanonicalPortalOrigin } from "@/utils/urlUtils";
import { useAuth } from "@/providers/AuthProvider";

function SelfKycDeskContent({
  propertyId,
}: {
  propertyId: string;
}) {
  const searchParams = useSearchParams();
  const reviewSubmissionId = searchParams?.get("reviewSubmissionId") || searchParams?.get("reviewId") || "";
  const urlRoom = searchParams?.get("room") || "";
  const urlBed = searchParams?.get("bed") || "";
  const urlTab = searchParams?.get("tab") || "";

  const { profile, user } = useAuth();

  const [activeTab, setActiveTab] = useState<"INVITES" | "REVIEW" | "APPROVED">(
    urlTab === "REVIEW" || reviewSubmissionId || urlRoom ? "REVIEW" : "INVITES"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submissions, setSubmissions] = useState<SelfKycSubmission[]>([]);
  const [invites, setInvites] = useState<SelfKycInvite[]>([]);
  const [occupantsList, setOccupantsList] = useState<Occupant[]>(() => {
    try {
      return occupantStore.getOccupants(propertyId) || [];
    } catch {
      return [];
    }
  });
  const [propertyStructure, setPropertyStructure] = useState(() =>
    propertyStore.getStructure(propertyId)
  );

  // Standee Modal State
  const [showStandeeModal, setShowStandeeModal] = useState(false);

  // Send Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteStayType, setInviteStayType] = useState<"Tenant" | "Guest">("Tenant");
  const [inviteCheckInDate, setInviteCheckInDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [inviteRoomNumber, setInviteRoomNumber] = useState("");
  const [inviteBedCode, setInviteBedCode] = useState("");
  const [inviteCandidateName, setInviteCandidateName] = useState("");
  const [inviteCandidatePhone, setInviteCandidatePhone] = useState("");
  const [inviteCountryCode, setInviteCountryCode] = useState("+91");
  const [inviteCandidateEmail, setInviteCandidateEmail] = useState("");
  const [inviteRentAmount, setInviteRentAmount] = useState<number>(12000);
  const [inviteDepositAmount, setInviteDepositAmount] = useState<number>(24000);
  const [inviteDailyRate, setInviteDailyRate] = useState<number>(400);
  const [inviteDispatchLoading, setInviteDispatchLoading] = useState(false);

  // Active resident phone & email lookup maps (to detect conflict in Send Invite modal)
  const [existingResidentMap, setExistingResidentMap] = useState<
    Map<string, { name: string; roomNumber: string; bedCode: string }>
  >(new Map());
  const [existingResidentEmailMap, setExistingResidentEmailMap] = useState<
    Map<string, { name: string; roomNumber: string; bedCode: string }>
  >(new Map());

  useEffect(() => {
    if (!propertyId) return;

    const buildMaps = (occupantsList: any[]) => {
      const phoneMap = new Map<string, { name: string; roomNumber: string; bedCode: string }>();
      const emailMap = new Map<string, { name: string; roomNumber: string; bedCode: string }>();
      occupantsList.forEach((occ) => {
        if (occ.lifecycleStatus !== "Past") {
          if (occ.phone) {
            const digits = String(occ.phone).replace(/\D/g, "").slice(-10);
            if (digits.length === 10) {
              phoneMap.set(digits, {
                name: occ.name || "Active Resident",
                roomNumber: occ.roomNumber || "",
                bedCode: occ.bedCode || "",
              });
            }
          }
          if (occ.email) {
            const cleanEm = String(occ.email).trim().toLowerCase();
            if (cleanEm.length > 3 && cleanEm.includes("@")) {
              emailMap.set(cleanEm, {
                name: occ.name || "Active Resident",
                roomNumber: occ.roomNumber || "",
                bedCode: occ.bedCode || "",
              });
            }
          }
        }
      });
      return { phoneMap, emailMap };
    };

    // 1. Instantly populate from occupantStore (0ms latency from memory/cache)
    try {
      const localOccs = occupantStore.getOccupants(propertyId);
      if (localOccs && localOccs.length > 0) {
        setOccupantsList(localOccs);
        const { phoneMap, emailMap } = buildMaps(localOccs);
        setExistingResidentMap(phoneMap);
        setExistingResidentEmailMap(emailMap);
      }
    } catch (e) {
      console.warn("Failed reading local occupantStore:", e);
    }

    // 2. Fetch latest from Firestore SSOT
    async function loadOccupants() {
      try {
        const snap = await getDocs(collection(db, "properties", propertyId, "occupants"));
        const fromFs: any[] = [];
        snap.docs.forEach((d) => fromFs.push(d.data()));
        if (fromFs.length > 0) {
          setOccupantsList(fromFs as Occupant[]);
          const { phoneMap, emailMap } = buildMaps(fromFs);
          setExistingResidentMap(phoneMap);
          setExistingResidentEmailMap(emailMap);
        }
      } catch (e) {
        console.warn("Notice checking existing occupants:", e);
      }
    }
    loadOccupants();
  }, [propertyId]);

  // Conflict calculation in Send Invite modal
  const cleanCandidateDigits = useMemo(() => {
    return inviteCandidatePhone.replace(/\D/g, "").slice(0, 10);
  }, [inviteCandidatePhone]);

  const existingResidentConflict = useMemo(() => {
    if (cleanCandidateDigits.length !== 10) return null;
    return existingResidentMap.get(cleanCandidateDigits) || null;
  }, [cleanCandidateDigits, existingResidentMap]);

  const cleanCandidateEmail = useMemo(() => {
    return inviteCandidateEmail.trim().toLowerCase();
  }, [inviteCandidateEmail]);

  const existingResidentEmailConflict = useMemo(() => {
    if (!cleanCandidateEmail || !cleanCandidateEmail.includes("@")) return null;
    return existingResidentEmailMap.get(cleanCandidateEmail) || null;
  }, [cleanCandidateEmail, existingResidentEmailMap]);

  // Review & Verification Modal State
  const [activeReviewSubmission, setActiveReviewSubmission] = useState<SelfKycSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [zoomDocUrl, setZoomDocUrl] = useState<string | null>(null);
  const [reviewActionState, setReviewActionState] = useState<"approving" | "rejecting" | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type?: "success" | "error" | "info";
  } | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleManualRefresh = async () => {
    if (!propertyId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        selfKycStore.refreshSubmissions(propertyId),
        selfKycStore.refreshInvites(propertyId),
      ]);
      triggerToast("Live submissions synchronized with cloud", "success");
    } catch (e) {
      console.warn("Manual refresh failed:", e);
      triggerToast("Failed to sync with cloud", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Subscriptions to self-kyc store and layout store
  useEffect(() => {
    propertyStore.initFirebaseListener(propertyId);
    setPropertyStructure(propertyStore.getStructure(propertyId));

    const unsubStructure = propertyStore.subscribe(() => {
      setPropertyStructure(propertyStore.getStructure(propertyId));
    });

    const unsubSubs = selfKycStore.subscribeSubmissions(propertyId, (list) => {
      setSubmissions(list);
    });

    const unsubInvs = selfKycStore.subscribeInvites(propertyId, (list) => {
      setInvites(list);
    });

    // Proactively fetch fresh state from Firestore on mount
    selfKycStore.refreshSubmissions(propertyId);
    selfKycStore.refreshInvites(propertyId);

    // Auto-refresh when manager returns to the tab
    const handleFocus = () => {
      selfKycStore.refreshSubmissions(propertyId);
      selfKycStore.refreshInvites(propertyId);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubStructure();
      unsubSubs();
      unsubInvs();
      window.removeEventListener("focus", handleFocus);
    };
  }, [propertyId]);

  // Refresh submissions whenever the owner switches tabs
  useEffect(() => {
    if (propertyId) {
      selfKycStore.refreshSubmissions(propertyId);
      selfKycStore.refreshInvites(propertyId);
    }
  }, [activeTab, propertyId]);

  // Auto-switch to REVIEW tab when deep-linked from Property Map
  useEffect(() => {
    if (urlTab === "REVIEW" || reviewSubmissionId || urlRoom) {
      setActiveTab("REVIEW");
    }
  }, [urlTab, reviewSubmissionId, urlRoom]);

  // Direct 1-Click KYC Verification: Auto-select targeted resident and open Review & Verification modal
  useEffect(() => {
    if (!reviewSubmissionId && !urlRoom) return;
    if (submissions.length === 0) return;

    const cleanUrlRoom = urlRoom.toLowerCase().trim();
    const cleanUrlBed = urlBed.toLowerCase().replace(/[^a-z0-9]/g, "");

    const matchedSub = submissions.find((s) => {
      if (reviewSubmissionId && s.id === reviewSubmissionId) return true;
      if (cleanUrlRoom && cleanUrlBed) {
        const sRm = (s.roomNumber || "").toLowerCase().trim();
        const sBd = (s.bedCode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return sRm === cleanUrlRoom && sBd === cleanUrlBed;
      }
      return false;
    });

    if (matchedSub && (!activeReviewSubmission || activeReviewSubmission.id !== matchedSub.id)) {
      setActiveTab("REVIEW");
      setActiveReviewSubmission(matchedSub);
      setShowRejectionInput(false);
      setRejectionReason("");
    }
  }, [reviewSubmissionId, urlRoom, urlBed, submissions]);

  // Derived lists
  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status === "PENDING"),
    [submissions]
  );

  // Sorted / prioritized pending submissions: if navigating from Property Map, pin the target candidate to the top
  const sortedPendingSubmissions = useMemo(() => {
    if (!reviewSubmissionId && !urlRoom) return pendingSubmissions;
    const cleanUrlRoom = urlRoom.toLowerCase().trim();
    const cleanUrlBed = urlBed.toLowerCase().replace(/[^a-z0-9]/g, "");

    return [...pendingSubmissions].sort((a, b) => {
      const aMatch =
        (reviewSubmissionId && a.id === reviewSubmissionId) ||
        (cleanUrlRoom &&
          cleanUrlBed &&
          (a.roomNumber || "").toLowerCase().trim() === cleanUrlRoom &&
          (a.bedCode || "").toLowerCase().replace(/[^a-z0-9]/g, "") === cleanUrlBed);
      const bMatch =
        (reviewSubmissionId && b.id === reviewSubmissionId) ||
        (cleanUrlRoom &&
          cleanUrlBed &&
          (b.roomNumber || "").toLowerCase().trim() === cleanUrlRoom &&
          (b.bedCode || "").toLowerCase().replace(/[^a-z0-9]/g, "") === cleanUrlBed);

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [pendingSubmissions, reviewSubmissionId, urlRoom, urlBed]);

  const approvedSubmissions = useMemo(
    () => submissions.filter((s) => s.status === "APPROVED"),
    [submissions]
  );

  // Sent Invites Log: Only active invites awaiting candidate action (first fill or re-upload after rejection)
  // Transitions OUT when candidate submits (enters Review KYC), or when candidate is Approved
  const activeInvites = useMemo(() => {
    const pendingInviteIds = new Set(
      pendingSubmissions.map((s) => s.inviteId).filter(Boolean)
    );
    const pendingPhones = new Set(
      pendingSubmissions.map((s) => (s.phone || "").replace(/\D/g, "").slice(-10)).filter(Boolean)
    );

    const approvedInviteIds = new Set(
      approvedSubmissions.map((s) => s.inviteId).filter(Boolean)
    );
    const approvedPhones = new Set(
      approvedSubmissions.map((s) => (s.phone || "").replace(/\D/g, "").slice(-10)).filter(Boolean)
    );

    return invites.filter((inv) => {
      if (inv.status === "REVOKED" || inv.status === "COMPLETED") return false;

      // Filter out if currently pending in Review KYC
      if (pendingInviteIds.has(inv.id)) return false;
      const cleanPhone = (inv.candidatePhone || "").replace(/\D/g, "").slice(-10);
      if (cleanPhone && pendingPhones.has(cleanPhone)) return false;

      // Filter out if already approved
      if (approvedInviteIds.has(inv.id)) return false;
      if (cleanPhone && approvedPhones.has(cleanPhone)) return false;

      return true;
    });
  }, [invites, pendingSubmissions, approvedSubmissions]);

  // Helper to prevent redundant "Bed Bed" prefix
  const formatBedLabel = (bedCode?: string): string => {
    if (!bedCode) return "";
    const trimmed = bedCode.trim();
    if (/^bed\s+/i.test(trimmed)) return trimmed;
    return `Bed ${trimmed}`;
  };

  // Resolve link to the approved resident's profile in the tenant directory
  const getOccupantProfileLink = (sub: SelfKycSubmission) => {
    if (sub.occupantId) {
      return `/p/${propertyId}/tenants/${sub.occupantId}`;
    }
    const cleanSubPhone = (sub.phone || "").replace(/\D/g, "").slice(-10);
    if (cleanSubPhone) {
      const matched = occupantsList.find(
        (o) => (o.phone || "").replace(/\D/g, "").slice(-10) === cleanSubPhone
      );
      if (matched?.id) return `/p/${propertyId}/tenants/${matched.id}`;
    }
    if (sub.roomNumber && sub.bedCode) {
      const matched = occupantsList.find(
        (o) => o.roomNumber === sub.roomNumber && o.bedCode === sub.bedCode
      );
      if (matched?.id) return `/p/${propertyId}/tenants/${matched.id}`;
    }
    if (sub.name) {
      const matched = occupantsList.find(
        (o) => o.name?.trim().toLowerCase() === sub.name?.trim().toLowerCase()
      );
      if (matched?.id) return `/p/${propertyId}/tenants/${matched.id}`;
    }
    return `/p/${propertyId}/tenants`;
  };

  // Helper to normalize bed codes (e.g. "Bed A" -> "A")
  const normBed = (b?: string) => (b || "").replace(/^bed\s*/i, "").trim().toUpperCase();

  // List of available rooms & beds for invite creation (dynamically filtered for target check-in date)
  const availableBeds = useMemo(() => {
    const list: { roomNumber: string; bedCode: string; floorName: string; tariff: number }[] = [];
    const targetDate = inviteCheckInDate || new Date().toISOString().split("T")[0];

    // Track beds that are already on hold from active invites or pending submissions
    const reservedBeds = new Set<string>();
    activeInvites.forEach((i) => {
      if (i.roomNumber && i.bedCode) {
        reservedBeds.add(`${i.roomNumber}___${normBed(i.bedCode)}`);
      }
    });
    pendingSubmissions.forEach((s) => {
      if (s.roomNumber && s.bedCode) {
        reservedBeds.add(`${s.roomNumber}___${normBed(s.bedCode)}`);
      }
    });

    propertyStructure.forEach((fl) => {
      fl.rooms.forEach((rm) => {
        rm.beds.forEach((bd) => {
          const bedKey = `${rm.roomNumber}___${normBed(bd.bedCode)}`;
          if (reservedBeds.has(bedKey)) return;

          // Cross-verify with live occupants list to ensure no ghost availability
          const currentResident = occupantsList.find(
            (o) =>
              o.roomNumber === rm.roomNumber &&
              normBed(o.bedCode) === normBed(bd.bedCode) &&
              o.lifecycleStatus !== "Past"
          );

          const isDirectlyAvailable =
            (bd.status === "Available" || (!bd.status && !bd.occupant)) && !currentResident;
          const isVacatingBeforeTarget =
            (bd.status === "Occupied" || bd.status === "Booked" || Boolean(currentResident)) &&
            Boolean(bd.vacatingDate || currentResident?.vacatingDate) &&
            (bd.vacatingDate || currentResident?.vacatingDate || "") <= targetDate;

          if (isDirectlyAvailable || isVacatingBeforeTarget) {
            list.push({
              roomNumber: rm.roomNumber,
              bedCode: bd.bedCode,
              floorName: fl.floorName,
              tariff: rm.customRentAmount || 12000,
            });
          }
        });
      });
    });
    return list;
  }, [propertyStructure, inviteCheckInDate, activeInvites, pendingSubmissions, occupantsList]);

  // When room changes in invite modal, auto-pick first available bed and tariff
  const availableRoomsList = useMemo(() => {
    const set = new Set<string>();
    availableBeds.forEach((b) => set.add(b.roomNumber));
    return Array.from(set);
  }, [availableBeds]);

  const handleRoomSelect = (roomNum: string) => {
    setInviteRoomNumber(roomNum);
    const firstBed = availableBeds.find((b) => b.roomNumber === roomNum);
    if (firstBed) {
      setInviteBedCode(firstBed.bedCode);
      setInviteRentAmount(firstBed.tariff);
      setInviteDepositAmount(firstBed.tariff * 2);
      setInviteDailyRate(Math.round(firstBed.tariff / 30));
    }
  };

  // Keep room and bed in sync when check-in date or availableBeds change
  useEffect(() => {
    if (!showInviteModal) return;
    if (availableBeds.length > 0) {
      const isCurrentStillValid = availableBeds.some(
        (b) => b.roomNumber === inviteRoomNumber && b.bedCode === inviteBedCode
      );
      if (!isCurrentStillValid) {
        const first = availableBeds[0];
        setInviteRoomNumber(first.roomNumber);
        setInviteBedCode(first.bedCode);
        setInviteRentAmount(first.tariff);
        setInviteDepositAmount(first.tariff * 2);
        setInviteDailyRate(Math.round(first.tariff / 30));
      }
    } else {
      setInviteRoomNumber("");
      setInviteBedCode("");
    }
  }, [availableBeds, showInviteModal, inviteRoomNumber, inviteBedCode]);

  // Open Invite Modal helper
  const handleOpenInviteModal = () => {
    const today = new Date().toISOString().split("T")[0];
    setInviteCheckInDate(today);
    if (availableBeds.length > 0) {
      const first = availableBeds[0];
      setInviteRoomNumber(first.roomNumber);
      setInviteBedCode(first.bedCode);
      setInviteRentAmount(first.tariff);
      setInviteDepositAmount(first.tariff * 2);
      setInviteDailyRate(Math.round(first.tariff / 30));
    } else {
      setInviteRoomNumber("");
      setInviteBedCode("");
    }
    setInviteCandidateName("");
    setInviteCandidatePhone("");
    setInviteCandidateEmail("");
    setShowInviteModal(true);
  };

  // Handle Send Invite Submit (Dispatches WhatsApp + Email, Puts Bed on Hold)
  const handleSendInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteRoomNumber || !inviteBedCode) {
      triggerToast("Please select an available room and bed.", "error");
      return;
    }
    const cleanPhone = normalizePhoneNumber(inviteCandidatePhone);
    const cleanEmail = inviteCandidateEmail.trim().toLowerCase();

    if (!cleanPhone && !cleanEmail) {
      triggerToast("Please provide at least a Mobile Number (for WhatsApp) or an Email Address.", "error");
      return;
    }

    if (cleanPhone && cleanPhone.length !== 10) {
      triggerToast("Mobile phone number must be exactly 10 digits.", "error");
      return;
    }

    if (cleanEmail && (!cleanEmail.includes("@") || !cleanEmail.includes("."))) {
      triggerToast("Please enter a valid email address.", "error");
      return;
    }

    if (inviteCandidateName.trim().length === 0) {
      triggerToast("Please enter candidate's full legal name.", "error");
      return;
    }

    if (inviteCandidateName.includes("@")) {
      triggerToast("Please enter candidate's legal name, not an email address.", "error");
      return;
    }

    if (cleanPhone && existingResidentConflict) {
      triggerToast(
        `This mobile number is already registered with ${existingResidentConflict.name} in Room ${existingResidentConflict.roomNumber}.`,
        "error"
      );
      return;
    }

    if (cleanEmail && existingResidentEmailConflict) {
      triggerToast(
        `This email address is already registered with ${existingResidentEmailConflict.name} in Room ${existingResidentEmailConflict.roomNumber}.`,
        "error"
      );
      return;
    }

    setInviteDispatchLoading(true);

    const token = `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const fullPhone = cleanPhone ? `${inviteCountryCode} ${cleanPhone}` : "";

    const newInvite: SelfKycInvite = {
      id: token,
      propertyId,
      stayType: inviteStayType,
      roomNumber: inviteRoomNumber,
      bedCode: inviteBedCode,
      rentAmount: inviteRentAmount,
      securityDeposit: inviteStayType === "Tenant" ? inviteDepositAmount : undefined,
      guestDailyRate: inviteStayType === "Guest" ? (inviteDailyRate || Math.round(inviteRentAmount / 30)) : undefined,
      candidateName: inviteCandidateName.trim(),
      candidatePhone: fullPhone,
      candidateEmail: cleanEmail || undefined,
      status: "ACTIVE",
      whatsappStatus: cleanPhone ? "SENT" : undefined,
      emailStatus: cleanEmail ? "SENT" : undefined,
      createdAt: new Date().toISOString(),
    };

    // 1. Create Invite & Put Bed on Hold in propertyStore & Firestore
    await selfKycStore.createInvite(newInvite);

    // 2. Build portal invite link with self-contained property parameter & candidate name
    const portalOrigin = getCanonicalPortalOrigin();
    const candidateNameParam = newInvite.candidateName ? `&name=${encodeURIComponent(newInvite.candidateName)}` : "";
    const inviteLink = `${portalOrigin}/self-onboard/${token}?p=${propertyId}${candidateNameParam}`;

    // 3. Attempt WhatsApp & Email dispatch
    try {
      const settings = propertySettingsStore.getSettings(propertyId);
      const propName = settings?.propertyName || "Ramesh Residencies";
      const waMsg =
        `Hello ${newInvite.candidateName}! 👋\n\n` +
        `Welcome to *${propName}*. Your bed has been placed on hold:\n` +
        `🏠 *Room ${newInvite.roomNumber} (${formatBedLabel(newInvite.bedCode)})*\n` +
        `💰 *Tariff*: ₹${newInvite.rentAmount.toLocaleString("en-IN")} / month\n\n` +
        `👉 Please complete your 2-minute digital Self-KYC check-in here:\n` +
        `${inviteLink}\n\n` +
        `Takes under 2 minutes. Once submitted, management will approve your check-in!`;

      // 1. Dispatch WhatsApp via backend gateway (if mobile was provided)
      if (cleanPhone) {
        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            messages: [
              {
                toPhone: cleanPhone,
                recipientName: newInvite.candidateName,
                propertyId,
                propertyName: propName,
                type: "ONBOARDING_INVITE",
                params: {
                  roomNumber: newInvite.roomNumber,
                  bedCode: newInvite.bedCode,
                  amount: newInvite.rentAmount,
                  onboardUrl: inviteLink,
                  customMessage: waMsg,
                },
              },
            ],
          }),
        }).catch((e) => console.warn("WhatsApp dispatch API error:", e));
      }

      // 2. Dispatch Email via Zoho / Brevo / SES if candidate email is provided
      if (newInvite.candidateEmail) {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            messages: [
              {
                toEmail: newInvite.candidateEmail,
                recipientName: newInvite.candidateName,
                propertyId,
                propertyName: propName,
                type: "ONBOARDING_INVITE",
                params: {
                  roomNumber: newInvite.roomNumber,
                  bedCode: newInvite.bedCode,
                  rentAmount: newInvite.rentAmount,
                  onboardUrl: inviteLink,
                },
              },
            ],
          }),
        }).catch((e) => console.warn("Email dispatch API error:", e));
      }
    } catch (e) {
      console.warn("Dispatch error:", e);
    }

    setInviteDispatchLoading(false);
    setShowInviteModal(false);
    setActiveTab("INVITES");
    setInvites((prev) => [newInvite, ...prev.filter((i) => i.id !== newInvite.id)]);
    const dispatchMethod = cleanPhone && newInvite.candidateEmail
      ? "WhatsApp & Email"
      : cleanPhone
      ? "WhatsApp"
      : "Email";
    triggerToast(`✅ Self-KYC invite sent to ${newInvite.candidateName} via ${dispatchMethod}! Room ${inviteRoomNumber} (${formatBedLabel(inviteBedCode)}) is now ON HOLD 🔒`);
  };

  // 1-Tap Share Invite Directly via WhatsApp Web / App
  const handleShareInviteViaWhatsApp = (inv: SelfKycInvite) => {
    const origin = getCanonicalPortalOrigin();
    const nameParam = inv.candidateName ? `&name=${encodeURIComponent(inv.candidateName)}` : "";
    const url = `${origin}/self-onboard/${inv.id}?p=${inv.propertyId || propertyId}${nameParam}`;
    const cleanDigits = (inv.candidatePhone || "").replace(/\D/g, "");
    const targetPhone = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : "";
    const settings = propertySettingsStore.getSettings(propertyId);
    const propName = settings?.propertyName || "Ramesh Residencies";
    const msg =
      `Hello ${inv.candidateName}! 👋\n\n` +
      `Welcome to *${propName}*. Your bed has been placed on hold:\n` +
      `🏠 *Room ${inv.roomNumber} (${formatBedLabel(inv.bedCode)})*\n` +
      `💰 *Tariff*: ₹${inv.rentAmount.toLocaleString("en-IN")} / month\n\n` +
      `👉 Please complete your 2-minute digital Self-KYC check-in here:\n` +
      `${url}\n\n` +
      `Takes under 2 minutes. Once submitted, management will approve your check-in!`;

    const waUrl = targetPhone
      ? `https://wa.me/91${targetPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  // Revoke Invite (Returns bed to Available)
  const handleRevokeInvite = async (inviteId: string, roomNum: string, bedCode: string) => {
    if (!confirm(`Are you sure you want to cancel this invite? Room ${roomNum} (${formatBedLabel(bedCode)}) will return to Available.`)) {
      return;
    }
    await selfKycStore.revokeInvite(propertyId, inviteId, roomNum, bedCode);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId && !(i.roomNumber === roomNum && i.bedCode === bedCode)));
    triggerToast(`Invite canceled. Room ${roomNum} (${formatBedLabel(bedCode)}) is now Available 🟢`, "info");
  };

  // Copy Invite URL
  const handleCopyInviteUrl = (inviteToken: string, candidateName?: string) => {
    const origin = getCanonicalPortalOrigin();
    const nameParam = candidateName ? `&name=${encodeURIComponent(candidateName)}` : "";
    const url = `${origin}/self-onboard/${inviteToken}?p=${propertyId}${nameParam}`;
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    triggerToast("📋 Invite link copied to clipboard!", "info");
  };

  // Approve Submission
  const handleApproveSubmission = async () => {
    if (!activeReviewSubmission) return;
    setReviewActionState("approving");

    try {
      const createdResident = await selfKycStore.approveSubmission(
        activeReviewSubmission,
        "PG Admin"
      );

      const settings = propertySettingsStore.getSettings(propertyId);
      const propName = settings?.propertyName || "TenoPilot PG";

      const billingCycleText = settings?.billingCycleDates === "Anniversary Date"
        ? "Anniversary Date (Due on Move-in Date)"
        : `1st to End of Month (Due by ${settings?.desiredDueDate || 5}th)`;
      const houseRulesText = (settings as any)?.houseRulesAndRegulations || "";
      const ownerSigName = (settings as any)?.ownerName || profile?.displayName || "Property Owner";

      // 1. Automated WhatsApp Welcome & Agreement Notification
      try {
        const cleanPhone = createdResident.phone.replace(/\D/g, "");
        const fullPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : createdResident.phone;

        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            userId: profile?.uid || user?.uid,
            userEmail: profile?.email || user?.email,
            messages: [
              {
                toPhone: fullPhone,
                recipientName: createdResident.name,
                propertyId,
                propertyName: propName,
                type: "TENANT_WELCOME",
                params: {
                  roomNumber: createdResident.roomNumber,
                  bedCode: createdResident.bedCode,
                  joiningDate: createdResident.joiningDate,
                  dueDate: createdResident.joiningDate,
                  paidDate: createdResident.joiningDate,
                  amount: createdResident.rentAmount,
                  rentAmount: createdResident.rentAmount,
                  depositAmount: createdResident.securityDeposit || 0,
                  propertyAddress: settings?.propertyAddress,
                  houseRules: houseRulesText,
                  billingCycle: billingCycleText,
                  ownerName: ownerSigName,
                  onboardUrl: `${getCanonicalPortalOrigin()}/p/${propertyId}/tenants/${createdResident.id}`,
                },
              },
            ],
          }),
        });
      } catch (waErr) {
        console.warn("WhatsApp welcome dispatch notice:", waErr);
      }

      // 2. Automated Welcome Email to Tenant (Identical to Owner Managed Form Welcome Engine)
      let emailDispatched = false;
      const candidateEmail = (activeReviewSubmission.email || createdResident.email || "").trim().toLowerCase();
      const isGenuineEmail = candidateEmail && candidateEmail.includes("@") && !candidateEmail.includes("resident.tenopilot.com");

      if (isGenuineEmail) {
        try {
          await fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              propertyId,
              userId: profile?.uid || user?.uid,
              userEmail: profile?.email || user?.email,
              messages: [
                {
                  toEmail: candidateEmail,
                  recipientName: createdResident.name,
                  propertyId,
                  propertyName: propName,
                  replyToEmail: profile?.email || user?.email,
                  type: "TENANT_WELCOME",
                  params: {
                    roomNumber: createdResident.roomNumber,
                    bedCode: createdResident.bedCode,
                    joiningDate: createdResident.joiningDate,
                    paidDate: createdResident.joiningDate,
                    dueDate: createdResident.joiningDate,
                    rentAmount: createdResident.rentAmount,
                    depositAmount: createdResident.securityDeposit || 0,
                    managerPhone: settings?.managerPhone,
                    phone: createdResident.phone,
                    propertyAddress: settings?.propertyAddress,
                    houseRules: houseRulesText,
                    billingCycle: billingCycleText,
                    ownerName: ownerSigName,
                    onboardUrl: `${getCanonicalPortalOrigin()}/p/${propertyId}/tenants/${createdResident.id}`,
                  },
                },
              ],
            }),
          });
          emailDispatched = true;
        } catch (emailErr) {
          console.warn("Welcome email dispatch catch:", emailErr);
        }
      }

      fireCelebrationConfetti();
      triggerToast(
        `🎉 ${createdResident.name} approved & checked in! Room ${createdResident.roomNumber} (${formatBedLabel(createdResident.bedCode)}) updated. Welcome notice sent via ${emailDispatched ? "WhatsApp & Email ✉️" : "WhatsApp"}.`
      );
      setActiveReviewSubmission(null);
      setActiveTab("APPROVED");
    } catch (e) {
      console.error(e);
      triggerToast("Error approving KYC submission. Please try again.", "error");
    } finally {
      setReviewActionState(null);
    }
  };

  // Reject Submission
  const handleRejectSubmission = async () => {
    if (!activeReviewSubmission) return;
    if (!rejectionReason.trim()) {
      triggerToast("Please provide a reason for rejection / re-upload.", "error");
      return;
    }

    setReviewActionState("rejecting");
    const subToReject = activeReviewSubmission;
    const currentReason = rejectionReason.trim();

    try {
      await selfKycStore.rejectSubmission(
        propertyId,
        subToReject.id,
        currentReason
      );

      const settings = propertySettingsStore.getSettings(propertyId);
      const propName = settings?.propertyName || "Ramesh Residencies";
      const origin = getCanonicalPortalOrigin();
      const reuploadNameParam = subToReject.name ? `&name=${encodeURIComponent(subToReject.name)}` : "";
      const reuploadUrl = subToReject.inviteId
        ? `${origin}/self-onboard/${subToReject.inviteId}?p=${propertyId}${reuploadNameParam}`
        : `${origin}/p/${propertyId}/self-kyc-checkin`;

      // 🔍 Identify all target recipients (Original invite phone/email + submitted phone/email)
      const matchingInv = subToReject.inviteId
        ? invites.find((i) => i.id === subToReject.inviteId) ||
          selfKycStore.getInviteByToken(subToReject.inviteId)?.invite
        : null;

      // Collect unique valid mobile numbers to notify
      const phonesToNotify = new Set<string>();
      if (matchingInv?.candidatePhone && matchingInv.candidatePhone.trim()) {
        phonesToNotify.add(matchingInv.candidatePhone.trim());
      }
      if (subToReject.phone && subToReject.phone.trim()) {
        phonesToNotify.add(subToReject.phone.trim());
      }

      // 1. Dispatch Instant WhatsApp Notification to all relevant channels
      for (const phoneTarget of phonesToNotify) {
        try {
          await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              propertyId,
              messages: [
                {
                  toPhone: phoneTarget,
                  recipientName: matchingInv?.candidateName || subToReject.name,
                  propertyId,
                  propertyName: propName,
                  type: "KYC_CORRECTION_REQUEST",
                  params: {
                    roomNumber: subToReject.roomNumber,
                    bedCode: subToReject.bedCode,
                    rejectionReason: currentReason,
                    onboardUrl: reuploadUrl,
                  },
                },
              ],
            }),
          });
        } catch (err) {
          console.warn(`WhatsApp rejection notification failed for ${phoneTarget}:`, err);
        }
      }

      // Collect unique valid emails to notify
      const emailsToNotify = new Set<string>();
      if (matchingInv?.candidateEmail && matchingInv.candidateEmail.trim()) {
        emailsToNotify.add(matchingInv.candidateEmail.trim().toLowerCase());
      }
      if (subToReject.email && subToReject.email.trim()) {
        emailsToNotify.add(subToReject.email.trim().toLowerCase());
      }

      // 2. Dispatch Email Notification if candidate email is available
      for (const emailTarget of emailsToNotify) {
        if (!emailTarget.includes("@") || emailTarget.includes("resident.tenopilot.com")) continue;
        try {
          await fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              propertyId,
              messages: [
                {
                  toEmail: emailTarget,
                  recipientName: matchingInv?.candidateName || subToReject.name,
                  propertyId,
                  propertyName: propName,
                  type: "KYC_CORRECTION_REQUEST",
                  params: {
                    roomNumber: subToReject.roomNumber,
                    bedCode: subToReject.bedCode,
                    rejectionReason: currentReason,
                    onboardUrl: reuploadUrl,
                  },
                },
              ],
            }),
          });
        } catch (err) {
          console.warn(`Email rejection notification failed for ${emailTarget}:`, err);
        }
      }

      const targetPhonesList = Array.from(phonesToNotify).join(", ");
      triggerToast(
        `Correction requested for ${subToReject.name}. Application moved back to Sent Invites Log. Candidate notified on WhatsApp (${targetPhonesList || "Candidate Phone"})!`,
        "success"
      );
      setActiveReviewSubmission(null);
      setShowRejectionInput(false);
      setRejectionReason("");
      setActiveTab("INVITES");
    } catch (e) {
      console.error(e);
      triggerToast("Error rejecting submission.", "error");
    } finally {
      setReviewActionState(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#fcf9f8] text-gray-900 font-sans antialiased overflow-hidden selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Global Property Header */}
        <PropertyHeader
          propertyId={propertyId}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in fade-in slide-in-from-top-4 ${
              toastMessage.type === "error"
                ? "bg-red-50 text-red-900 border-red-300"
                : toastMessage.type === "info"
                ? "bg-blue-50 text-blue-900 border-blue-300"
                : "bg-emerald-50 text-emerald-950 border-emerald-300"
            }`}
          >
            {toastMessage.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Scrollable Main Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header & Quick Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mb-1">
                <Link href={`/p/${propertyId}/overview`} className="hover:underline">
                  Portfolio
                </Link>
                <span>/</span>
                <span className="text-[#c2652a] font-bold">Self-KYC Desk</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
                <span>Self-KYC Digital Gate Desk</span>
                {pendingSubmissions.length > 0 && (
                  <span className="text-xs font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                    {pendingSubmissions.length} Pending
                  </span>
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                title="Force refresh live submissions from cloud without reloading the page"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${isRefreshing ? "animate-spin text-[#c2652a]" : ""}`} />
                <span>{isRefreshing ? "Syncing..." : "Sync Cloud"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowStandeeModal(true)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <QrCode className="w-4 h-4 text-[#c2652a]" />
                <span>Self KYC QR</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInviteModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#964407] to-[#c2652a] hover:opacity-95 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Send Invite Link</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation (Transition Pipeline: Sent Invites -> Review KYC -> Approved) */}
          <div className="flex items-center gap-2 border-b border-gray-200">
            {/* 1. Sent Invites */}
            <button
              onClick={() => setActiveTab("INVITES")}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "INVITES"
                  ? "border-[#c2652a] text-[#c2652a]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <span>Sent Invites</span>
              {activeInvites.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold">
                  {activeInvites.length}
                </span>
              )}
            </button>

            {/* 2. Review KYC (Formerly Pending Verifications) */}
            <button
              onClick={() => setActiveTab("REVIEW")}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "REVIEW"
                  ? "border-[#c2652a] text-[#c2652a]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <span>Review KYC</span>
              {pendingSubmissions.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-black animate-pulse">
                  {pendingSubmissions.length}
                </span>
              )}
            </button>

            {/* 3. Approved */}
            <button
              onClick={() => setActiveTab("APPROVED")}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "APPROVED"
                  ? "border-[#c2652a] text-[#c2652a]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <span>Approved ({approvedSubmissions.length})</span>
            </button>
          </div>

          {/* STAGE 1: SENT INVITES LOG (Awaiting Candidate KYC Submission) */}
          {activeTab === "INVITES" && (
            <div className="space-y-4">
              {activeInvites.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl font-bold">
                    ✉️
                  </div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    No active self-KYC invite links.
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Click <strong>"+ Send Invite Link"</strong> to generate a link for an incoming tenant and lock their room on hold.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
                  {/* Mobile Stacked Card View */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {activeInvites.map((inv) => {
                      const cleanPhone = (inv.candidatePhone || "").replace(/\D/g, "").slice(-10);
                      const lastRejection = submissions.find(
                        (s) =>
                          s.status === "REJECTED" &&
                          (s.inviteId === inv.id || (s.phone && cleanPhone && s.phone.replace(/\D/g, "").slice(-10) === cleanPhone))
                      );

                      return (
                        <div key={inv.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  inv.stayType === "Guest"
                                    ? "bg-purple-100 text-purple-900"
                                    : "bg-blue-100 text-blue-900"
                                }`}>
                                  {inv.stayType}
                                </span>
                                <span className="font-bold text-sm text-gray-900">{inv.candidateName}</span>
                              </div>
                              <p className="font-mono text-xs text-gray-600 mt-0.5">
                                {inv.candidatePhone || (inv.candidateEmail ? <span className="font-sans text-gray-500">{inv.candidateEmail}</span> : "Invite link")}
                              </p>
                            </div>
                            <span className="font-mono font-bold text-[#c2652a] text-xs">
                              ₹{(inv.rentAmount ?? 0).toLocaleString("en-IN")}/mo
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono text-[11px] ${
                              lastRejection
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : "bg-rose-50 text-rose-900 border-rose-300"
                            }`}>
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>Room {inv.roomNumber} ({formatBedLabel(inv.bedCode)})</span>
                            </span>

                            {lastRejection ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <span>⚠️</span> Correction Requested
                              </span>
                            ) : inv.candidatePhone && inv.candidateEmail ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" /> WhatsApp & Email
                              </span>
                            ) : inv.candidatePhone ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" /> WhatsApp Sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                <Check className="w-3 h-3 text-blue-600" /> Email Sent
                              </span>
                            )}
                          </div>

                          {lastRejection?.rejectionReason && (
                            <p className="text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded-xl border border-amber-200 italic">
                              Note: "{lastRejection.rejectionReason}"
                            </p>
                          )}

                          <div className="grid grid-cols-4 gap-1.5 pt-1">
                            <a
                              href={`/self-onboard/${inv.id}?p=${inv.propertyId || propertyId}${inv.candidateName ? `&name=${encodeURIComponent(inv.candidateName)}` : ""}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open</span>
                            </a>
                            <button
                              onClick={() => handleShareInviteViaWhatsApp(inv)}
                              className="py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span>Chat</span>
                            </button>
                            <button
                              onClick={() => handleCopyInviteUrl(inv.id, inv.candidateName)}
                              className="py-1.5 rounded-xl border border-gray-300 bg-gray-50 text-gray-700 text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Link</span>
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(inv.id, inv.roomNumber, inv.bedCode)}
                              className="py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#fff8f6] border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                        <tr>
                          <th className="py-3 px-4">Candidate</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4">Reserved Bed</th>
                          <th className="py-3 px-4">Tariff</th>
                          <th className="py-3 px-4">Delivery Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeInvites.map((inv) => {
                          const cleanPhone = (inv.candidatePhone || "").replace(/\D/g, "").slice(-10);
                          const lastRejection = submissions.find(
                            (s) =>
                              s.status === "REJECTED" &&
                              (s.inviteId === inv.id || (s.phone && cleanPhone && s.phone.replace(/\D/g, "").slice(-10) === cleanPhone))
                          );

                          return (
                            <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    inv.stayType === "Guest"
                                      ? "bg-purple-100 text-purple-900"
                                      : "bg-blue-100 text-blue-900"
                                  }`}>
                                    {inv.stayType}
                                  </span>
                                  <span>{inv.candidateName}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">
                                {inv.candidatePhone ? (
                                  <div>{inv.candidatePhone}</div>
                                ) : (
                                  <div className="text-gray-400 font-sans italic text-xs">No phone (Email invite)</div>
                                )}
                                {inv.candidateEmail && (
                                  <div className="text-[10px] font-sans text-gray-400">{inv.candidateEmail}</div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-gray-900">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] ${
                                  lastRejection
                                    ? "bg-amber-50 text-amber-900 border-amber-300"
                                    : "bg-rose-50 text-rose-900 border-rose-300"
                                }`}>
                                  <Lock className="w-3 h-3 text-rose-600" />
                                  <span>Room {inv.roomNumber} ({formatBedLabel(inv.bedCode)})</span>
                                  <span className="text-[9px] font-bold text-rose-700 ml-1">On Hold</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-[#c2652a]">
                                ₹{(inv.rentAmount ?? 0).toLocaleString("en-IN")}/mo
                              </td>
                              <td className="py-3.5 px-4">
                                {lastRejection ? (
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      <span>⚠️</span>
                                      <span>Correction Requested</span>
                                    </span>
                                    {lastRejection.rejectionReason && (
                                      <span className="text-[10px] text-amber-700 italic max-w-xs truncate" title={lastRejection.rejectionReason}>
                                        "{lastRejection.rejectionReason}"
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1 items-start">
                                    {inv.candidatePhone && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span>WhatsApp Sent</span>
                                      </span>
                                    )}
                                    {inv.candidateEmail && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                        <Check className="w-3 h-3 text-blue-600" />
                                        <span>Email Sent</span>
                                      </span>
                                    )}
                                    {!inv.candidatePhone && !inv.candidateEmail && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                        <span>Link Ready</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                <a
                                  href={`/self-onboard/${inv.id}?p=${inv.propertyId || propertyId}${inv.candidateName ? `&name=${encodeURIComponent(inv.candidateName)}` : ""}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Open candidate onboarding link in new tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Open</span>
                                </a>
                                <button
                                  onClick={() => handleShareInviteViaWhatsApp(inv)}
                                  className="px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                  title="Open candidate WhatsApp chat with prefilled invite"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </button>
                                <button
                                  onClick={() => handleCopyInviteUrl(inv.id, inv.candidateName)}
                                  className="px-2.5 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Copy self-onboard link"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Link</span>
                                </button>
                                <button
                                  onClick={() => handleRevokeInvite(inv.id, inv.roomNumber, inv.bedCode)}
                                  className="px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Cancel invite & release bed to available"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Revoke</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 2: REVIEW KYC (Candidate Submitted, Awaiting Manager Approval) */}
          {activeTab === "REVIEW" && (
            <div className="space-y-4">
              {pendingSubmissions.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
                    ✓
                  </div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    All caught up! Zero pending KYC submissions.
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    New applicants who scan the reception desk QR or complete a self-KYC link will appear here for your review and approval.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#c2652a]" : ""}`} />
                      <span>{isRefreshing ? "Checking cloud..." : "Check for New Submissions"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedPendingSubmissions.map((sub) => {
                    const isTargetCandidate =
                      (reviewSubmissionId && sub.id === reviewSubmissionId) ||
                      (urlRoom &&
                        urlBed &&
                        (sub.roomNumber || "").toLowerCase().trim() === urlRoom.toLowerCase().trim() &&
                        (sub.bedCode || "").toLowerCase().replace(/[^a-z0-9]/g, "") === urlBed.toLowerCase().replace(/[^a-z0-9]/g, ""));

                    return (
                      <div
                        key={sub.id}
                        className={`p-5 rounded-3xl bg-white border transition-all flex flex-col justify-between space-y-4 ${
                          isTargetCandidate
                            ? "border-[#c2652a] ring-2 ring-[#c2652a]/80 shadow-md"
                            : "border-gray-200 shadow-xs hover:shadow-md"
                        }`}
                      >
                        <div>
                          {/* Top Badge Row */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                sub.stayType === "Guest"
                                  ? "bg-purple-100 text-purple-900 border border-purple-200"
                                  : "bg-blue-100 text-blue-900 border border-blue-200"
                              }`}>
                                {sub.stayType === "Guest" ? "🟣 Guest Stay" : "🔵 Monthly Tenant"}
                              </span>
                              {isTargetCandidate && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c2652a] text-white shadow-2xs">
                                  Selected Bed
                                </span>
                              )}
                            </div>

                          <span className="text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rose-500" />
                            <span>Awaiting Review</span>
                          </span>
                        </div>

                        {/* Candidate Header */}
                        <div className="flex items-center gap-3">
                          <img
                            src={sub.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sub.name)}`}
                            alt={sub.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-gray-200 bg-gray-50"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 truncate">
                              {sub.name}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {formatDisplayPhone(sub.phone, sub.countryCode)}
                            </p>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              {sub.submissionType === "WALK_IN_QR" ? "Lobby QR Scan" : "Invite Link"}
                            </span>
                          </div>
                        </div>

                        {/* Room & Tariff Box */}
                        <div className="mt-3.5 p-3 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 text-xs space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">Assigned Bed:</span>
                            <span className="font-bold text-gray-900">
                              Room {sub.roomNumber} ({formatBedLabel(sub.bedCode)})
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">Monthly Rent:</span>
                            <span className="font-mono font-bold text-[#c2652a]">
                              ₹{(sub.rentAmount ?? 0).toLocaleString("en-IN")} / mo
                            </span>
                          </div>
                          {sub.securityDeposit != null && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 font-medium">Security Deposit:</span>
                              <span className="font-mono font-bold text-gray-900">
                                ₹{Number(sub.securityDeposit).toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                            <span className="text-gray-500 font-medium">Move-In Date:</span>
                            <span className="font-semibold text-gray-900">
                              {sub.joiningDate}
                            </span>
                          </div>
                        </div>

                        {/* Document Proof Badge Indicator */}
                        <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-gray-600">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Aadhaar: {sub.aadhaarNumber ? `✓ ${sub.aadhaarNumber.slice(-4)}` : "Uploaded"}</span>
                          </span>
                          {sub.vehicleNumbers && sub.vehicleNumbers.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 flex items-center gap-1 font-mono">
                              <Car className="w-3 h-3 text-slate-600" />
                              <span>{sub.vehicleNumbers.length} Vehicle</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Review Button */}
                      <button
                        onClick={() => {
                          setActiveReviewSubmission(sub);
                          setShowRejectionInput(false);
                          setRejectionReason("");
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Review & Verify KYC</span>
                      </button>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APPROVED RESIDENTS */}
          {activeTab === "APPROVED" && (
            <div className="space-y-4">
              {approvedSubmissions.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto text-2xl font-bold">
                    📋
                  </div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    No approved self-KYC history yet.
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Approved applicants will be stored here for future compliance audit and quick navigation to their tenant profiles.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#fff8f6] border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                        <tr>
                          <th className="py-3 px-4">Resident</th>
                          <th className="py-3 px-4">Mobile</th>
                          <th className="py-3 px-4">Allocated Room</th>
                          <th className="py-3 px-4">Tariff</th>
                          <th className="py-3 px-4">Approved By</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {approvedSubmissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-gray-900">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={sub.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sub.name)}`}
                                  alt={sub.name}
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                />
                                <div>
                                  <span className="block font-bold">{sub.name}</span>
                                  <span className="text-[10px] font-sans text-gray-400">
                                    Joined on {sub.joiningDate}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">
                              {formatDisplayPhone(sub.phone, sub.countryCode)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-gray-900">
                              Room {sub.roomNumber} ({formatBedLabel(sub.bedCode)})
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-[#c2652a]">
                              ₹{(sub.rentAmount ?? 0).toLocaleString("en-IN")}/mo
                            </td>
                            <td className="py-3.5 px-4 text-gray-600">
                              <span className="font-semibold">{sub.reviewedBy || "Staff"}</span>
                              <span className="block text-[10px] text-gray-400">
                                {sub.reviewedAt ? new Date(sub.reviewedAt).toLocaleDateString("en-IN") : "Verified"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                href={getOccupantProfileLink(sub)}
                                className="px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 hover:border-[#c2652a] hover:text-[#c2652a] text-gray-800 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <span>View Profile</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SEND SELF-KYC INVITE (Room, Bed, Rent, Phone -> Bed to Hold)    */}
      {/* ========================================================================= */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 shrink-0 bg-white">
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#c2652a]" />
                  <span>Send Self-KYC Invite</span>
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">
                  Locks target bed to <strong>ON HOLD 🔒</strong> and dispatches digital check-in link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendInviteSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Stay Type Toggle: Tenant vs Guest */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Stay Category *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteStayType("Tenant");
                      setInviteDepositAmount(inviteRentAmount * 2);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      inviteStayType === "Tenant"
                        ? "bg-[#c2652a] text-white border-[#c2652a] shadow-xs"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Monthly Tenant</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteStayType("Guest")}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      inviteStayType === "Guest"
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Short-Term Guest</span>
                  </button>
                </div>
              </div>

              {/* Bed Selector: Available Beds Only */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-[#c2652a]" />
                    <span>Select Available Bed * (Will be placed on Hold)</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {availableBeds.length} Available
                  </span>
                </div>

                {/* Target Check-in Date Picker */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#c2652a]" />
                    <span>Target Check-In Date *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={inviteCheckInDate}
                    onChange={(e) => setInviteCheckInDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 bg-white focus:ring-1 focus:ring-[#c2652a]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Dynamically filters beds that are currently vacant or vacating on/before this date.
                  </p>
                </div>

                {availableBeds.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    ⚠️ No vacant beds available for this check-in date! Please select another date or vacate a bed.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Room</label>
                      <select
                        value={inviteRoomNumber}
                        onChange={(e) => handleRoomSelect(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 bg-white focus:ring-1 focus:ring-[#c2652a]"
                      >
                        {availableRoomsList.map((rm) => (
                          <option key={rm} value={rm}>
                            Room {rm}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Bed Code</label>
                      <select
                        value={inviteBedCode}
                        onChange={(e) => {
                          setInviteBedCode(e.target.value);
                          const target = availableBeds.find(
                            (b) => b.roomNumber === inviteRoomNumber && b.bedCode === e.target.value
                          );
                          if (target) {
                            setInviteRentAmount(target.tariff);
                            setInviteDepositAmount(target.tariff * 2);
                            setInviteDailyRate(Math.round(target.tariff / 30));
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 bg-white focus:ring-1 focus:ring-[#c2652a]"
                      >
                        {availableBeds
                          .filter((b) => b.roomNumber === inviteRoomNumber)
                          .map((b) => (
                            <option key={b.bedCode} value={b.bedCode}>
                              {formatBedLabel(b.bedCode)}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Candidate Info */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Candidate Full Name *</label>
                  <input
                    type="text"
                    name="candidateName"
                    autoComplete="off"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={inviteCandidateName}
                    onChange={(e) => setInviteCandidateName(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold text-gray-900 focus:ring-1 ${
                      inviteCandidateName.includes("@")
                        ? "border-red-500 bg-red-50/40 text-red-950 focus:ring-red-500"
                        : "border-gray-300 focus:ring-[#c2652a]"
                    }`}
                  />
                  {inviteCandidateName.includes("@") && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">
                      ⚠️ Please enter the resident's legal name, not their email address.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">Candidate Mobile Phone</label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      WhatsApp Dispatch
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteCountryCode}
                      onChange={(e) => setInviteCountryCode(e.target.value)}
                      className="w-16 px-2.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-center text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] shrink-0 bg-gray-50"
                    />
                    <input
                      type="tel"
                      maxLength={16}
                      placeholder="9876543210 (Optional if email entered)"
                      value={inviteCandidatePhone}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text");
                        const clean = normalizePhoneNumber(pasted);
                        setInviteCandidatePhone(clean);
                      }}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        const clean = digits.length > 10 ? normalizePhoneNumber(digits) : digits;
                        setInviteCandidatePhone(clean);
                      }}
                      className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-semibold text-gray-900 focus:ring-1 transition-colors ${
                        existingResidentConflict
                          ? "border-red-500 bg-red-50/40 text-red-950 focus:ring-red-500"
                          : "border-gray-300 focus:ring-[#c2652a]"
                      }`}
                    />
                  </div>
                  {existingResidentConflict && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <div className="leading-tight">
                        <span className="font-bold">⚠️ Mobile number already registered!</span>
                        <p className="text-[11px] text-red-600 mt-0.5">
                          Already registered with <strong>{existingResidentConflict.name}</strong> in Room {existingResidentConflict.roomNumber} ({formatBedLabel(existingResidentConflict.bedCode)}).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">Email Address</label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Email Invite
                    </span>
                  </div>
                  <input
                    type="email"
                    placeholder="candidate@example.com (Optional if mobile entered)"
                    value={inviteCandidateEmail}
                    onChange={(e) => setInviteCandidateEmail(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold text-gray-900 focus:ring-1 transition-colors ${
                      existingResidentEmailConflict
                        ? "border-red-500 bg-red-50/40 text-red-950 focus:ring-red-500"
                        : "border-gray-300 focus:ring-[#c2652a]"
                    }`}
                  />
                  {existingResidentEmailConflict && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <div className="leading-tight">
                        <span className="font-bold">⚠️ Email address already registered!</span>
                        <p className="text-[11px] text-red-600 mt-0.5">
                          Already registered with <strong>{existingResidentEmailConflict.name}</strong> in Room {existingResidentEmailConflict.roomNumber} ({formatBedLabel(existingResidentEmailConflict.bedCode)}).
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-tight">
                    * Provide at least <strong>Mobile Number</strong> (for WhatsApp invite) or <strong>Email Address</strong>.
                  </p>
                </div>
              </div>

              {/* Tariff & Deposit Config */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={inviteRentAmount ? String(inviteRentAmount) : ""}
                    placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      const num = val === "" ? 0 : parseInt(val, 10);
                      setInviteRentAmount(num);
                      if (inviteStayType === "Guest") {
                        setInviteDailyRate(Math.round(num / 30));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                {inviteStayType === "Tenant" ? (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Security Deposit (₹) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={inviteDepositAmount ? String(inviteDepositAmount) : ""}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setInviteDepositAmount(val === "" ? 0 : parseInt(val, 10));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Daily Rate (₹) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={inviteDailyRate ? String(inviteDailyRate) : ""}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setInviteDailyRate(val === "" ? 0 : parseInt(val, 10));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-50 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteDispatchLoading || availableBeds.length === 0 || inviteCandidateName.includes("@") || Boolean(existingResidentConflict || existingResidentEmailConflict)}
                  className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {inviteDispatchLoading ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REVIEW & VERIFY KYC SUBMISSION (Photo, Aadhaar Zoom, Approve)    */}
      {/* ========================================================================= */}
      {activeReviewSubmission && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <img
                  src={activeReviewSubmission.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activeReviewSubmission.name)}`}
                  alt={activeReviewSubmission.name}
                  className="w-10 h-10 rounded-full object-cover border border-gray-300"
                />
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 flex items-center gap-2">
                    <span>{activeReviewSubmission.name}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                      {activeReviewSubmission.stayType}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Target: Room {activeReviewSubmission.roomNumber} ({formatBedLabel(activeReviewSubmission.bedCode)}) • Submitted on {new Date(activeReviewSubmission.submittedAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveReviewSubmission(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Left Column: KYC Documents Inspection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>KYC Document Proofs</span>
                  </h4>
                  <span className="text-[10px] text-gray-400">Click photo to zoom</span>
                </div>

                {/* 1. Selfie Photo */}
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <label className="font-bold text-gray-700 block">1. Live Selfie Profile Photo</label>
                  {activeReviewSubmission.photoUrl ? (
                    <img
                      src={activeReviewSubmission.photoUrl}
                      alt="Applicant Selfie"
                      onClick={() => setZoomDocUrl(activeReviewSubmission.photoUrl || null)}
                      className="w-full h-44 object-cover rounded-xl border border-gray-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="h-28 rounded-xl bg-gray-200/50 flex items-center justify-center text-gray-400 italic">
                      No photo provided
                    </div>
                  )}
                </div>

                {/* 2. Aadhaar Front & Back Images */}
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700">2. Aadhaar / Govt ID Cards</label>
                    {activeReviewSubmission.aadhaarNumber && (
                      <span className="font-mono font-bold text-[#c2652a]">
                        Aadhaar: {activeReviewSubmission.aadhaarNumber}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {activeReviewSubmission.aadhaarFrontUrl ? (
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Front Side</span>
                        <img
                          src={activeReviewSubmission.aadhaarFrontUrl}
                          alt="Aadhaar Front"
                          onClick={() => setZoomDocUrl(activeReviewSubmission.aadhaarFrontUrl || null)}
                          className="w-full h-28 object-cover rounded-xl border border-gray-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                        />
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl bg-gray-200/50 flex items-center justify-center text-gray-400 italic">
                        No front ID
                      </div>
                    )}

                    {activeReviewSubmission.aadhaarBackUrl ? (
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Back Side</span>
                        <img
                          src={activeReviewSubmission.aadhaarBackUrl}
                          alt="Aadhaar Back"
                          onClick={() => setZoomDocUrl(activeReviewSubmission.aadhaarBackUrl || null)}
                          className="w-full h-28 object-cover rounded-xl border border-gray-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                        />
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl bg-gray-200/50 flex items-center justify-center text-gray-400 italic">
                        No back ID
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Demographics & Allocation */}
              {(() => {
                const matchingInvite = activeReviewSubmission.inviteId
                  ? invites.find((i) => i.id === activeReviewSubmission.inviteId) ||
                    selfKycStore.getInviteByToken(activeReviewSubmission.inviteId)?.invite
                  : null;
                const cleanInvPhone = (matchingInvite?.candidatePhone || "").replace(/\D/g, "").slice(-10);
                const cleanSubPhone = (activeReviewSubmission.phone || "").replace(/\D/g, "").slice(-10);
                const isPhoneDifferent = Boolean(cleanInvPhone && cleanSubPhone && cleanInvPhone !== cleanSubPhone);
                const cleanInvEmail = (matchingInvite?.candidateEmail || "").trim().toLowerCase();
                const cleanSubEmail = (activeReviewSubmission.email || "").trim().toLowerCase();
                const isEmailDifferent = Boolean(cleanInvEmail && cleanSubEmail && cleanInvEmail !== cleanSubEmail);

                return (
                  <div className="space-y-4">
                    <h4 className="font-serif font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <UserCheck2 className="w-4 h-4 text-[#c2652a]" />
                      <span>Applicant Information</span>
                    </h4>

                    {/* Personal Info Box */}
                    <div className="p-3.5 rounded-2xl bg-white border border-gray-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Full Name:</span>
                        <span className="font-bold text-gray-900">{activeReviewSubmission.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Primary Mobile:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-gray-900">{formatDisplayPhone(activeReviewSubmission.phone, activeReviewSubmission.countryCode)}</span>
                          {isPhoneDifferent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              ⚠️ Form mismatch
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Original Invited Phone (SSOT Verification) */}
                      {matchingInvite?.candidatePhone && (
                        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-blue-900 font-bold flex items-center gap-1">
                              <Link2 className="w-3.5 h-3.5 text-blue-600" />
                              Original Invite Mobile:
                            </span>
                            <span className="font-mono font-black text-blue-950">
                              {matchingInvite.candidatePhone}
                            </span>
                          </div>
                          {isPhoneDifferent && (
                            <p className="text-[10px] text-amber-900 font-medium leading-relaxed">
                              Note: The applicant typed a different number in the form ({activeReviewSubmission.phone}). When rejected, notification is automatically dispatched to the original invited WhatsApp ({matchingInvite.candidatePhone}) to ensure delivery!
                            </p>
                          )}
                        </div>
                      )}

                      {activeReviewSubmission.email && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-medium">Email Address:</span>
                          <span className="font-semibold text-gray-800">{activeReviewSubmission.email}</span>
                        </div>
                      )}

                      {matchingInvite?.candidateEmail && isEmailDifferent && (
                        <div className="flex justify-between items-center text-[11px] bg-blue-50/50 p-1.5 rounded-lg border border-blue-200">
                          <span className="text-blue-800 font-medium flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-blue-600" /> Original Invite Email:
                          </span>
                          <span className="font-semibold text-blue-950">{matchingInvite.candidateEmail}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                        <span className="text-gray-500 font-medium">Emergency Contact:</span>
                        <span className="font-mono font-bold text-rose-700">
                          {formatDisplayPhone(activeReviewSubmission.emergencyContact?.phone) || "Not Provided"}
                        </span>
                      </div>
                      {activeReviewSubmission.workplace && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-medium">Workplace / College:</span>
                          <span className="font-semibold text-amber-950">{activeReviewSubmission.workplace}</span>
                        </div>
                      )}
                      {activeReviewSubmission.vehicleNumbers && activeReviewSubmission.vehicleNumbers.length > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-medium">Registered Vehicles:</span>
                          <span className="font-mono font-bold text-gray-900">
                            {activeReviewSubmission.vehicleNumbers.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Allocation & Pricing Confirmation */}
                    <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-orange-950">Target Room & Bed:</span>
                        <span className="font-mono font-black text-orange-900 text-sm">
                          Room {activeReviewSubmission.roomNumber} ({formatBedLabel(activeReviewSubmission.bedCode)})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 font-medium">Monthly Rent:</span>
                        <span className="font-mono font-bold text-[#c2652a]">
                          ₹{(activeReviewSubmission.rentAmount ?? 0).toLocaleString("en-IN")} / mo
                        </span>
                      </div>
                      {activeReviewSubmission.securityDeposit != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 font-medium">Security Deposit:</span>
                          <span className="font-mono font-bold text-gray-900">
                            ₹{Number(activeReviewSubmission.securityDeposit).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-orange-200">
                        <span className="text-gray-600 font-medium">Agreed Joining Date:</span>
                        <span className="font-bold text-gray-900">
                          {activeReviewSubmission.joiningDate}
                        </span>
                      </div>
                    </div>

                    {/* Rejection Input Box (if toggled) */}
                    {showRejectionInput && (
                      <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2 animate-in fade-in">
                        <label className="font-bold text-red-950 block">Reason for Rejection / Re-upload Request *</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Fake contact details or blurry Aadhaar back photo. Please enter real details and re-upload."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-red-300 text-xs text-red-950 bg-white focus:ring-1 focus:ring-red-600"
                        />
                        {matchingInvite?.candidatePhone && (
                          <p className="text-[10px] text-red-800 font-medium leading-relaxed">
                            📨 Cancellation notice will reach original invited mobile (<span className="font-mono font-bold">{matchingInvite.candidatePhone}</span>)
                            {isPhoneDifferent ? ` and form mobile (${activeReviewSubmission.phone})` : ""}!
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowRejectionInput(false)}
                            disabled={reviewActionState !== null}
                            className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleRejectSubmission}
                            disabled={reviewActionState !== null}
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {reviewActionState === "rejecting" ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Rejecting & Notifying...</span>
                              </>
                            ) : (
                              <span>Confirm Rejection</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Actions: Simple names right-aligned */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveReviewSubmission(null);
                  setShowRejectionInput(false);
                }}
                disabled={reviewActionState !== null}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
              >
                Close
              </button>
              {!showRejectionInput && (
                <button
                  type="button"
                  onClick={() => setShowRejectionInput(true)}
                  disabled={reviewActionState !== null}
                  className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Reject
                </button>
              )}
              <button
                type="button"
                onClick={handleApproveSubmission}
                disabled={reviewActionState !== null}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {reviewActionState === "approving" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <span>Approve</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT ZOOM MODAL                                                       */}
      {/* ========================================================================= */}
      {zoomDocUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomDocUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={zoomDocUrl}
              alt="Zoomed Document"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setZoomDocUrl(null)}
              className="mt-3 px-4 py-2 rounded-xl bg-white/20 text-white font-bold text-xs hover:bg-white/30 backdrop-blur-xs"
            >
              Close Zoom (Click anywhere)
            </button>
          </div>
        </div>
      )}

      {/* Standee Modal */}
      <SelfKycDeskStandeeModal
        propertyId={propertyId}
        isOpen={showStandeeModal}
        onClose={() => setShowStandeeModal(false)}
      />
    </div>
  );
}

export default function SelfKycDeskPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "ramesh-residencies";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fff8f6] flex items-center justify-center text-gray-500 font-bold text-sm">
          Loading Self-KYC Desk...
        </div>
      }
    >
      <SelfKycDeskContent propertyId={propertyId} />
    </Suspense>
  );
}
