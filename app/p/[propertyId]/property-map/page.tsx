"use client";

import { use, useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { Occupant, occupantStore } from "@/constants/mockOccupants";
import { subscribeOccupantsFromFirestore, updateOccupantInFirestore, sanitizeForFirestore } from "@/lib/firestoreService";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";
import { parseOccupantDate } from "@/utils/autoCheckInEngine";
import {
  propertyStore,
  FloorConfig,
  RoomConfig,
  BedSlotConfig,
} from "@/constants/propertyLayoutStore";
import {
  getBedOccupantsTimeline,
  BedOccupantsTimeline,
  getRoomTariff,
  getCanonicalBedIndex,
  normalizeBedCode,
  canonicalBedKey,
  normalizeRoomNumber,
  matchesTenoPilotSearch,
  calculateOccupantFinancialStatement,
} from "@/utils/domainSSOT";
import { CheckOutSettlementModal } from "@/components/dashboard/CheckOutSettlementModal";
import { AnimatedNumberCounter } from "@/components/motion/AnimatedNumberCounter";
import { MagneticGlowCard } from "@/components/motion/MagneticGlowCard";
import {
  ChevronLeft,
  Settings,
  User,
  Phone,
  MessageSquare,
  X,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  ChevronDown,
  Info,
  Eye,
  EyeOff,
  Camera,
  Download,
  Lock,
  UserPlus,
  Search,
  BellRing,
  Copy,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Send,
  Clock,
  Users,
  ArrowUpDown,
  Banknote,
  Check,
  CheckSquare,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { selfKycStore, SelfKycSubmission, SelfKycInvite } from "@/lib/selfKycStore";
import { whatsappCreditStore } from "@/constants/whatsappCreditStore";
import { emailCreditStore } from "@/constants/emailCreditStore";
import { propertySettingsStore, PaymentQRProfile, PAY_BY_CASH_PROFILE } from "@/constants/propertySettings";
import { staffStore, UserRole } from "@/lib/staffStore";
import { buildWhatsAppUrl } from "@/utils/security";

function PropertyMapContent({
  propertyId,
}: {
  propertyId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dropdown menu state for onboarding from bed drawer
  const [showOnboardMenu, setShowOnboardMenu] = useState(false);

  // Reactive Property Layout Structure State (Subscribed to propertyStore)
  const [propertyGrid, setPropertyGrid] = useState<FloorConfig[]>(() =>
    typeof window !== "undefined" ? propertyStore.getStructure(propertyId) : []
  );
  const [occupants, setOccupants] = useState<Occupant[]>(() =>
    occupantStore.getOccupants(propertyId) || []
  );
  const [isMounted, setIsMounted] = useState(false);

  const [propertySettings, setPropertySettings] = useState(() =>
    propertySettingsStore.getSettings(propertyId)
  );

  useEffect(() => {
    propertySettingsStore.initFirebaseListener(propertyId);
    setPropertySettings(propertySettingsStore.getSettings(propertyId));
    const unsubscribe = propertySettingsStore.subscribe(() => {
      setPropertySettings(propertySettingsStore.getSettings(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  const [activeRole, setActiveRole] = useState<UserRole>(() => staffStore.getActiveRole());

  useEffect(() => {
    const unsub = staffStore.subscribe(() => {
      setActiveRole(staffStore.getActiveRole());
    });
    return unsub;
  }, []);

  useEffect(() => {
    setIsMounted(true);
    propertyStore.initFirebaseListener(propertyId);
    setPropertyGrid(propertyStore.getStructure(propertyId));
    setOccupants([...occupantStore.getOccupants(propertyId)]);
    const unsubscribe = propertyStore.subscribe(() => {
      setPropertyGrid([...propertyStore.getStructure(propertyId)]);
    });

    const unsubscribeOccupantsFirestore = subscribeOccupantsFromFirestore(propertyId, (fsOccupants) => {
      if (fsOccupants && fsOccupants.length > 0) {
        occupantStore.setOccupantsFromFirestore(fsOccupants, propertyId);
      } else {
        occupantStore.setOccupantsFromFirestore([], propertyId);
      }
      setOccupants([...occupantStore.getOccupants(propertyId)]);
      setPropertyGrid([...propertyStore.getStructure(propertyId)]);
    });

    const unsubscribeOccupantsLocal = occupantStore.subscribe(() => {
      setOccupants([...occupantStore.getOccupants(propertyId)]);
      setPropertyGrid([...propertyStore.getStructure(propertyId)]);
    });

    return () => {
      unsubscribe();
      unsubscribeOccupantsFirestore();
      unsubscribeOccupantsLocal();
    };
  }, [propertyId]);

  // Real-Time Self-KYC Submissions & Invites Subscriptions
  const [kycSubmissions, setKycSubmissions] = useState<SelfKycSubmission[]>(() =>
    selfKycStore.getSubmissions(propertyId)
  );
  const [kycInvites, setKycInvites] = useState<SelfKycInvite[]>(() =>
    selfKycStore.getInvites(propertyId)
  );

  useEffect(() => {
    if (!propertyId) return;
    const unsubSubs = selfKycStore.subscribeSubmissions(propertyId, (list) => {
      setKycSubmissions(list);
    });
    const unsubInvs = selfKycStore.subscribeInvites(propertyId, (list) => {
      setKycInvites(list);
    });
    return () => {
      unsubSubs();
      unsubInvs();
    };
  }, [propertyId]);

  // Self-healing: automatically clear orphaned hold candidates & misplaced bed occupants in property layout structure
  const hasCheckedOrphansRef = useRef<boolean>(false);
  useEffect(() => {
    if (!propertyId || hasCheckedOrphansRef.current) return;
    const currentGrid = propertyStore.getStructure(propertyId);
    if (!currentGrid || currentGrid.length === 0) return;

    // Only perform check once KYC data is loaded
    if (kycInvites.length === 0 && kycSubmissions.length === 0) return;
    hasCheckedOrphansRef.current = true;

    let hasChanges = false;
    const cleanedGrid = currentGrid.map((fl) => ({
      ...fl,
      rooms: fl.rooms.map((rm) => {
        const cleanRm = normalizeRoomNumber(rm.roomNumber);
        return {
          ...rm,
          beds: rm.beds.map((bd) => {
            let updatedBed = { ...bd };
            const cleanBd = normalizeBedCode(bd.bedCode);

            // 1. Clear orphaned hold candidate
            if (updatedBed.holdCandidate || updatedBed.status === "Hold") {
              const hasActiveInvite = kycInvites.some(
                (i) => i.status === "ACTIVE" && normalizeRoomNumber(i.roomNumber) === cleanRm && normalizeBedCode(i.bedCode) === cleanBd
              );
              const hasPendingKyc = kycSubmissions.some(
                (s) => s.status === "PENDING" && normalizeRoomNumber(s.roomNumber) === cleanRm && normalizeBedCode(s.bedCode) === cleanBd
              );
              if (!hasActiveInvite && !hasPendingKyc) {
                const targetStatus = updatedBed.occupant ? "Occupied" : "Available";
                if (updatedBed.status !== targetStatus || updatedBed.holdCandidate !== undefined) {
                  hasChanges = true;
                  updatedBed = {
                    ...updatedBed,
                    status: targetStatus as any,
                    holdCandidate: undefined,
                  };
                }
              }
            }
            return updatedBed;
          }),
        };
      }),
    }));

    if (hasChanges) {
      propertyStore.updateStructure(cleanedGrid, propertyId);
    }
  }, [propertyId, kycInvites, kycSubmissions]);

  // Filters state (Hold is now unified into Booked, Financial filters: Due & Overdue)
  const [selectedFloor, setSelectedFloor] = useState<string>("ALL FLOORS");
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL ROOMS");
  const [activeFilterStatus, setActiveFilterStatus] = useState<
    "ALL" | "Available" | "Occupied" | "Vacating" | "Booked" | "Guest" | "Due" | "Overdue"
  >(() => {
    const f = searchParams?.get("filter")?.toLowerCase();
    if (f === "available" || f === "vacant") return "Available";
    if (f === "occupied") return "Occupied";
    if (f === "vacating") return "Vacating";
    if (f === "booked" || f === "hold" || f === "onhold") return "Booked";
    if (f === "guest" || f === "guests") return "Guest";
    if (f === "due" || f === "pending" || f === "pendingdue") return "Due";
    if (f === "overdue") return "Overdue";
    return "ALL";
  });

  // Interactive Sorting state (Default: Room Number Low to High)
  const [sortColumn, setSortColumn] = useState<
    "room" | "duePriority" | "overduePriority" | "name"
  >("room");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  // Single clubbed sort options matching Tenants Operations
  const sortOptions = useMemo(() => [
    { id: "room-asc", label: "Room: Low to High", shortLabel: "Room (1→9)", column: "room" as const, direction: "asc" as const, icon: "🏢" },
    { id: "room-desc", label: "Room: High to Low", shortLabel: "Room (9→1)", column: "room" as const, direction: "desc" as const, icon: "🏢" },
    { id: "due-priority-desc", label: "Due: High to Low Priority", shortLabel: "Due: High→Low", column: "duePriority" as const, direction: "desc" as const, icon: "⏳" },
    { id: "due-priority-asc", label: "Due: Low to High Priority", shortLabel: "Due: Low→High", column: "duePriority" as const, direction: "asc" as const, icon: "⏳" },
    { id: "overdue-priority-desc", label: "Overdue: High to Low Priority", shortLabel: "Overdue: High→Low", column: "overduePriority" as const, direction: "desc" as const, icon: "🚨" },
    { id: "overdue-priority-asc", label: "Overdue: Low to High Priority", shortLabel: "Overdue: Low→High", column: "overduePriority" as const, direction: "asc" as const, icon: "🚨" },
    { id: "name-asc", label: "Name: A to Z", shortLabel: "Name (A→Z)", column: "name" as const, direction: "asc" as const, icon: "🔤" },
    { id: "name-desc", label: "Name: Z to A", shortLabel: "Name (Z→A)", column: "name" as const, direction: "desc" as const, icon: "🔤" },
  ], []);

  const currentSortOption = useMemo(() => {
    return (
      sortOptions.find((opt) => opt.column === sortColumn && opt.direction === sortDirection) ||
      sortOptions[0]
    );
  }, [sortOptions, sortColumn, sortDirection]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    if (!isSortDropdownOpen) return;
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleGlobalClick);
    window.addEventListener("touchstart", handleGlobalClick);
    return () => {
      window.removeEventListener("mousedown", handleGlobalClick);
      window.removeEventListener("touchstart", handleGlobalClick);
    };
  }, [isSortDropdownOpen]);

  // Dynamic Floor & Room Filter options derived from propertyStore
  const availableFloors = useMemo(() => propertyStore.getFloorNames(propertyId), [propertyGrid, propertyId]);
  const availableRooms = useMemo(() => {
    if (selectedFloor === "ALL FLOORS") {
      return propertyStore.getRoomNumbers(propertyId);
    }
    const fl = propertyGrid.find((f) => f.floorName === selectedFloor);
    return fl ? fl.rooms.map((r) => r.roomNumber) : [];
  }, [propertyGrid, propertyId, selectedFloor]);

  // Smart 2-way sync between Floor and Room dropdowns
  const handleFloorChange = (newFloor: string) => {
    setSelectedFloor(newFloor);
    if (newFloor === "ALL FLOORS") {
      setSelectedRoom("ALL ROOMS");
    } else {
      const fl = propertyGrid.find((f) => f.floorName === newFloor);
      const hasRoom = fl?.rooms.some((r) => r.roomNumber === selectedRoom);
      if (!hasRoom) {
        setSelectedRoom("ALL ROOMS");
      }
    }
  };

  const handleRoomChange = (newRoom: string) => {
    setSelectedRoom(newRoom);
    if (newRoom !== "ALL ROOMS") {
      const parentFloor = propertyGrid.find((fl) => fl.rooms.some((r) => r.roomNumber === newRoom));
      if (parentFloor && parentFloor.floorName !== selectedFloor) {
        setSelectedFloor(parentFloor.floorName);
      }
    }
  };

  // 🔍 Real-Time In-Page Search Bar State (Resident name, room, phone, vehicle plate)
  const [rawSearchTerm, setRawSearchTerm] = useState<string>("");

  // Sync active filter status if URL search params change
  useEffect(() => {
    const f = searchParams?.get("filter")?.toLowerCase();
    if (f === "available" || f === "vacant") {
      setActiveFilterStatus("Available");
    } else if (f === "occupied") {
      setActiveFilterStatus("Occupied");
    } else if (f === "vacating") {
      setActiveFilterStatus("Vacating");
    } else if (f === "booked" || f === "hold" || f === "onhold") {
      setActiveFilterStatus("Booked");
    } else if (f === "guest" || f === "guests") {
      setActiveFilterStatus("Guest");
    } else if (f === "due" || f === "pending" || f === "pendingdue") {
      setActiveFilterStatus("Due");
    } else if (f === "overdue") {
      setActiveFilterStatus("Overdue");
    }
  }, [searchParams]);

  // Selected Bed Slot state for Quick-View Drawer
  const [activeBedSlot, setActiveBedSlot] = useState<{
    bed: BedSlotConfig;
    roomNumber: string;
    floorName: string;
    timeline?: BedOccupantsTimeline;
    resolvedOccupant?: Occupant;
    isVacant?: boolean;
  } | null>(null);

  // Global Price Privacy Mode Toggle state (Masks prices as ₹ ••••• when showing screen to tenants)
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(false);

  // Active Photo Gallery Lightbox state
  const [activePhotoGallery, setActivePhotoGallery] = useState<{
    roomNumber: string;
    photos: string[];
    specialTag?: string;
  } | null>(null);

  // Bed Monthly Schedule Modal state
  const [showScheduleModalBed, setShowScheduleModalBed] = useState<{
    bed: BedSlotConfig;
    roomNumber: string;
    floorName: string;
    timeline: BedOccupantsTimeline;
  } | null>(null);

  // Formal Check-Out & Settlement Modal state
  const [checkOutOccupantData, setCheckOutOccupantData] = useState<{
    occupant: Occupant;
    roomNumber: string;
    bedCode: string;
  } | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 💬 Multi-Select Mode & Bulk Reminders State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedOccupantIds, setSelectedOccupantIds] = useState<string[]>([]);
  // Mobile Tactile Multi-Select Mode (Long-press activated)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  // Auto-cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);
  const [showRentReminderModal, setShowRentReminderModal] = useState(false);
  const [activeQrIndex, setActiveQrIndex] = useState(0);
  const [selectedReminderChannels, setSelectedReminderChannels] = useState<{
    whatsapp: boolean;
    email: boolean;
  }>({ whatsapp: true, email: false });
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderProgress, setReminderProgress] = useState<{ sent: number; total: number; channel?: string } | null>(null);
  const [whatsappCredits, setWhatsappCredits] = useState(() => whatsappCreditStore.getCredits(propertyId));
  const [emailCredits, setEmailCredits] = useState(() => emailCreditStore.getCredits(propertyId));

  useEffect(() => {
    if (!propertyId) return;
    whatsappCreditStore.initFirebaseListener(propertyId);
    whatsappCreditStore.fetchWalletFromFirestore(propertyId);
    setWhatsappCredits(whatsappCreditStore.getCredits(propertyId));
    const unsubWa = whatsappCreditStore.subscribe(() => {
      setWhatsappCredits(whatsappCreditStore.getCredits(propertyId));
    });

    emailCreditStore.initFirebaseListener(propertyId);
    emailCreditStore.fetchWalletFromFirestore(propertyId);
    setEmailCredits(emailCreditStore.getCredits(propertyId));
    const unsubEmail = emailCreditStore.subscribe(() => {
      setEmailCredits(emailCreditStore.getCredits(propertyId));
    });

    return () => {
      unsubWa();
      unsubEmail();
    };
  }, [propertyId]);

  const allDueOccupants = useMemo(() => {
    return occupants.filter((o) => {
      if (o.lifecycleStatus === "Past") return false;
      const stmt = calculateOccupantFinancialStatement(o, propertySettings);
      return !stmt.isFullyPaid;
    });
  }, [occupants, propertySettings]);

  const selectedOccupants = useMemo(() => {
    return occupants.filter((o) => selectedOccupantIds.includes(o.id));
  }, [occupants, selectedOccupantIds]);

  const handleToggleSelectOccupant = (occId: string) => {
    setSelectedOccupantIds((prev) => {
      const next = prev.includes(occId) ? prev.filter((id) => id !== occId) : [...prev, occId];
      if (next.length === 0) {
        setIsMultiSelectMode(false);
      }
      return next;
    });
  };

  const getReminderPaymentCards = (): PaymentQRProfile[] => {
    const configured = propertySettings.qrProfiles && propertySettings.qrProfiles.length > 0
      ? propertySettings.qrProfiles
      : (propertySettings.upiPaymentId ? [{
          id: "default-upi-profile",
          name: "Primary UPI Account",
          bankLabel: "Primary Bank Account",
          upiId: propertySettings.upiPaymentId,
          accountType: "UPI_QR" as const,
          isDefault: true,
        }] : []);

    const hasCashCard = configured.some(
      (p) => p.accountType === "CASH_DESK" || p.upiId === "CASH_PAYMENT" || p.id === PAY_BY_CASH_PROFILE.id
    );

    return hasCashCard ? configured : [...configured, PAY_BY_CASH_PROFILE];
  };

  const handleSendBulkReminders = async () => {
    if (!selectedReminderChannels.whatsapp && !selectedReminderChannels.email) {
      triggerToast("⚠️ Please select at least one delivery channel (WhatsApp or Email).");
      return;
    }

    if (selectedOccupants.length === 0) {
      triggerToast("⚠️ Please select at least one tenant to send reminders.");
      return;
    }

    if (selectedReminderChannels.whatsapp) {
      const currentWaBal = whatsappCreditStore.getCredits(propertyId);
      if (currentWaBal < selectedOccupants.length) {
        triggerToast(`⚠️ Insufficient WhatsApp Credits! You need ${selectedOccupants.length} credits, but have ${currentWaBal}. Please recharge or uncheck WhatsApp.`);
        return;
      }
    }

    if (selectedReminderChannels.email) {
      const currentEmailBal = emailCreditStore.getCredits(propertyId);
      if (currentEmailBal < selectedOccupants.length) {
        triggerToast(`⚠️ Insufficient Email Credits! You need ${selectedOccupants.length} credits, but have ${currentEmailBal}. Please recharge or uncheck Email.`);
        return;
      }
    }

    setIsSendingReminders(true);
    setReminderProgress({ sent: 0, total: selectedOccupants.length, channel: "" });

    const reminderCards = getReminderPaymentCards();
    const activeQr = reminderCards[activeQrIndex] || reminderCards[0];

    let waSent = 0;
    let emailSent = 0;

    try {
      if (selectedReminderChannels.whatsapp) {
        setReminderProgress({ sent: 0, total: selectedOccupants.length, channel: "WhatsApp" });
        for (const occ of selectedOccupants) {
          const occStmt = calculateOccupantFinancialStatement(occ, propertySettings);
          const effectiveAmount = occStmt.netOutstandingBalance > 0 ? occStmt.netOutstandingBalance : occ.rentAmount;
          const cleanPhone = (occ.phone || "").replace(/\D/g, "");

          try {
            const waRes = await fetch("/api/whatsapp/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                propertyId,
                userId: profile?.uid || user?.uid,
                userEmail: profile?.email || user?.email,
                messages: [
                  {
                    toPhone: cleanPhone,
                    recipientName: occ.name,
                    propertyId,
                    propertyName: propertySettings.propertyName || "TenoPilot PG",
                    type: "RENT_REMINDER",
                    params: {
                      roomNumber: occ.roomNumber,
                      bedCode: occ.bedCode,
                      amountDue: effectiveAmount,
                      dueDate: occ.dueDate || "1st of the month",
                      upiId: activeQr?.upiId || propertySettings.upiPaymentId,
                      payeeName: activeQr?.name || propertySettings.propertyName,
                    },
                  },
                ],
              }),
            });

            if (waRes.ok) {
              whatsappCreditStore.deductCredit(propertyId, {
                recipientPhone: occ.phone,
                recipientName: occ.name,
                messageType: "RENT_REMINDER",
                description: `Rent reminder for Room ${occ.roomNumber} (${occ.bedCode})`,
              });
              waSent++;
            }
          } catch (err) {
            console.error("Error sending WhatsApp reminder:", err);
          }
          setReminderProgress({ sent: waSent, total: selectedOccupants.length, channel: "WhatsApp" });
        }
      }

      if (selectedReminderChannels.email) {
        setReminderProgress({ sent: 0, total: selectedOccupants.length, channel: "Email" });
        for (const occ of selectedOccupants) {
          const occStmt = calculateOccupantFinancialStatement(occ, propertySettings);
          const effectiveAmount = occStmt.netOutstandingBalance > 0 ? occStmt.netOutstandingBalance : occ.rentAmount;
          const rawEmail = (occ.email || "").trim().toLowerCase();
          const hasRealEmail = Boolean(
            rawEmail &&
            rawEmail.includes("@") &&
            !rawEmail.includes("resident.tenopilot.com") &&
            !rawEmail.includes("example.com") &&
            !rawEmail.includes("example-tenant.com") &&
            !rawEmail.includes("tenopilot.auth") &&
            !rawEmail.startsWith("phone_")
          );

          if (!hasRealEmail) continue;

          try {
            const emailRes = await fetch("/api/email/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                propertyId,
                userId: profile?.uid || user?.uid,
                userEmail: profile?.email || user?.email,
                messages: [
                  {
                    toEmail: rawEmail,
                    recipientName: occ.name,
                    propertyId,
                    propertyName: propertySettings.propertyName || "TenoPilot PG",
                    replyToEmail: profile?.email || user?.email,
                    type: "RENT_REMINDER",
                    params: {
                      roomNumber: occ.roomNumber,
                      bedCode: occ.bedCode,
                      amountDue: effectiveAmount,
                      dueDate: occ.dueDate || "1st of the month",
                      upiId: activeQr?.upiId || propertySettings.upiPaymentId,
                      payeeName: activeQr?.name || propertySettings.propertyName,
                    },
                  },
                ],
              }),
            });

            if (emailRes.ok) {
              emailCreditStore.deductCredit(propertyId, {
                recipientEmail: rawEmail,
                recipientName: occ.name,
                messageType: "RENT_REMINDER",
                description: `Rent reminder for Room ${occ.roomNumber} (${occ.bedCode})`,
              });
              emailSent++;
            }
          } catch (err) {
            console.error("Error sending Email reminder:", err);
          }
          setReminderProgress({ sent: emailSent, total: selectedOccupants.length, channel: "Email" });
        }
      }

      fireCelebrationConfetti();
      triggerToast(`🎉 Dispatched rent reminders to ${selectedOccupants.length} tenants!`);
      setShowRentReminderModal(false);
      setSelectedOccupantIds([]);
      setIsMultiSelectMode(false);
    } catch (e: any) {
      triggerToast(`⚠️ Dispatch error: ${e?.message || "Failed to send reminders"}`);
    } finally {
      setIsSendingReminders(false);
      setReminderProgress(null);
    }
  };

  // 1-Click Instant Revoke Invite / Free Bed from Quick Drawer
  const handleRevokeInvite = async (inviteId?: string, roomNo?: string, bedCd?: string) => {
    if (!propertyId) return;
    const targetRoom = roomNo || activeBedSlot?.roomNumber || "";
    const targetBed = bedCd || activeBedSlot?.bed?.bedCode || "";
    const invId = inviteId || activeBedSlot?.bed?.holdCandidate?.inviteId || "";

    try {
      if (invId) {
        await selfKycStore.revokeInvite(propertyId, invId, targetRoom, targetBed);
      }
      await propertyStore.freeUpBedSlot(propertyId, targetRoom, targetBed);
      setActiveBedSlot(null);
      triggerToast(`Bed ${targetBed} released to Available`);
    } catch (err) {
      console.error("Failed to revoke invite:", err);
      triggerToast("Failed to revoke invite");
    }
  };

  // Dynamic Rent & Financial SSOT Metrics Calculations (Matching Tenants Operations)
  const rentMetrics = useMemo(() => {
    const billableOccupants = occupants.filter(
      (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
    );

    let dueCount = 0;
    let dueSum = 0;
    let overdueCount = 0;
    let overdueSum = 0;
    let sumCollected = 0;
    let totalExpected = 0;

    billableOccupants.forEach((curr) => {
      const stmt = calculateOccupantFinancialStatement(curr, propertySettings);
      totalExpected += stmt.proRataRent + stmt.priorArrears;
      sumCollected += stmt.totalRentPaid;

      if (!stmt.isFullyPaid) {
        const netDue = stmt.netOutstandingBalance;
        const isActuallyOverdue = stmt.isOverdue && !stmt.statusBadgeText.startsWith("DUE");
        if (isActuallyOverdue) {
          overdueCount++;
          overdueSum += netDue;
        } else {
          dueCount++;
          dueSum += netDue;
        }
      }
    });

    const collectionPct = totalExpected > 0 ? Number(((sumCollected / totalExpected) * 100).toFixed(1)) : 0;

    return {
      dueCount,
      dueSum,
      overdueCount,
      overdueSum,
      collectionPct,
      sumCollected,
      totalExpected,
    };
  }, [occupants, propertySettings]);

  // Compute exact bed counts for Donut Ring Chart & Filter Badges (scoped to selected floor when chosen)
  const bedCounts = useMemo(() => {
    let available = 0;
    let occupied = 0;
    let vacating = 0;
    let booked = 0;
    let guest = 0;
    let due = 0;
    let overdue = 0;

    const targetFloors = selectedFloor === "ALL FLOORS"
      ? propertyGrid
      : propertyGrid.filter((fl) => fl.floorName === selectedFloor);

    targetFloors.forEach((floor) => {
      floor.rooms.forEach((room) => {
        const sortedBeds = [...(room.beds || [])].sort((a, b) =>
          getCanonicalBedIndex(a.bedCode) - getCanonicalBedIndex(b.bedCode)
        );
        const roomClaimedOccIds = new Set<string>();

        sortedBeds.forEach((bed) => {
          const timeline = getBedOccupantsTimeline(room.roomNumber, bed.bedCode, bed, propertyId, room.beds);
          const cleanRm = normalizeRoomNumber(room.roomNumber);
          const cleanBd = normalizeBedCode(bed.bedCode);
          const bedCanonicalIdx = getCanonicalBedIndex(bed.bedCode);

          let primaryOcc = timeline.activeOccupant;

          // Deduplicate: If this occupant was already claimed by an earlier bed in this room, do not duplicate
          if (primaryOcc) {
            if (roomClaimedOccIds.has(primaryOcc.id)) {
              primaryOcc = undefined;
            } else {
              roomClaimedOccIds.add(primaryOcc.id);
            }
          }
          const rawNext = timeline.nextBooking;
          const nextOcc =
            rawNext && primaryOcc && (rawNext.id === primaryOcc.id || rawNext.name?.toLowerCase() === primaryOcc.name?.toLowerCase())
              ? undefined
              : rawNext;

          const hasPendingKyc = kycSubmissions.some((s) => {
            if (s.status !== "PENDING") return false;
            const sRm = normalizeRoomNumber(s.roomNumber);
            const sBd = normalizeBedCode(s.bedCode);
            return sRm === cleanRm && sBd === cleanBd;
          });

          const hasActiveInvite = kycInvites.some((i) => {
            if (i.status !== "ACTIVE") return false;
            const iRm = normalizeRoomNumber(i.roomNumber);
            const iBd = normalizeBedCode(i.bedCode);
            return iRm === cleanRm && iBd === cleanBd;
          });

          const isBooked =
            (!primaryOcc && !!nextOcc && nextOcc.stayType !== "Guest") ||
            bed.status === "Booked" ||
            hasPendingKyc ||
            hasActiveInvite;

          const effectiveStatus = primaryOcc
            ? primaryOcc.lifecycleStatus === "Notice"
              ? "Vacating"
              : primaryOcc.stayType === "Guest"
              ? "Guest"
              : "Occupied"
            : nextOcc && nextOcc.stayType === "Guest"
            ? "Guest"
            : isBooked
            ? "Booked"
            : "Available";

          if (effectiveStatus === "Available") available++;
          else if (effectiveStatus === "Occupied") occupied++;
          else if (effectiveStatus === "Vacating") vacating++;
          else if (effectiveStatus === "Booked") booked++;
          else if (effectiveStatus === "Guest") guest++;
          else available++;

          // Financial counts for bed
          if (primaryOcc) {
            const stmt = calculateOccupantFinancialStatement(primaryOcc, propertySettings);
            if (!stmt.isFullyPaid) {
              const isActuallyOverdue = stmt.isOverdue && !stmt.statusBadgeText.startsWith("DUE");
              if (isActuallyOverdue) {
                overdue++;
              } else {
                due++;
              }
            }
          }
        });
      });
    });

    const total = available + occupied + vacating + booked + guest;

    return { total, available, occupied, vacating, booked, guest, due, overdue };
  }, [propertyGrid, propertyId, kycSubmissions, kycInvites, occupants, selectedFloor, propertySettings]);

  // Seamless Donut Ring Gradient (100% circular, zero overlapping stroke caps, zero jagged notches)
  const donutConicGradient = useMemo(() => {
    const total = bedCounts.total || 1;
    const occDeg = (bedCounts.occupied / total) * 360;
    const availDeg = occDeg + (bedCounts.available / total) * 360;
    const vacDeg = availDeg + (bedCounts.vacating / total) * 360;
    const bookedDeg = vacDeg + (bedCounts.booked / total) * 360;

    return `conic-gradient(
      #c2652a 0deg ${occDeg}deg,
      #10b981 ${occDeg}deg ${availDeg}deg,
      #f97316 ${availDeg}deg ${vacDeg}deg,
      #3b82f6 ${vacDeg}deg ${bookedDeg}deg,
      #a855f7 ${bookedDeg}deg 360deg
    )`;
  }, [bedCounts]);

  // Filtered Floors & Rooms according to Floor, Room, Status Pill, and In-Page Search
  const filteredGrid = useMemo(() => {
    const query = rawSearchTerm.toLowerCase().trim();

    return propertyGrid
      .filter((fl) => {
        if (selectedFloor !== "ALL FLOORS" && fl.floorName !== selectedFloor)
          return false;
        return true;
      })
      .map((fl) => {
        const matchingRooms = fl.rooms
          .filter((rm) => {
            if (selectedRoom !== "ALL ROOMS" && rm.roomNumber !== selectedRoom)
              return false;
            return true;
          })
          .map((rm) => {
            const sortedBeds = [...(rm.beds || [])].sort((a, b) =>
              getCanonicalBedIndex(a.bedCode) - getCanonicalBedIndex(b.bedCode)
            );
            const rmClaimedOccIds = new Set<string>();
            const roomMatchesQuery = query ? matchesTenoPilotSearch({ roomNumber: rm.roomNumber }, query) : false;

            const enrichedBeds = sortedBeds.map((bd) => {
              const cleanRm = normalizeRoomNumber(rm.roomNumber);
              const cleanBd = normalizeBedCode(bd.bedCode);
              const bdCanonicalIdx = getCanonicalBedIndex(bd.bedCode);

              const timeline = getBedOccupantsTimeline(rm.roomNumber, bd.bedCode, bd, propertyId, rm.beds);
              let primaryOcc = timeline.activeOccupant;

              if (primaryOcc) {
                if (rmClaimedOccIds.has(primaryOcc.id)) {
                  primaryOcc = undefined;
                } else {
                  rmClaimedOccIds.add(primaryOcc.id);
                }
              }
              const rawNext = timeline.nextBooking;
              const nextOcc =
                rawNext && primaryOcc && (rawNext.id === primaryOcc.id || rawNext.name?.toLowerCase() === primaryOcc.name?.toLowerCase())
                  ? undefined
                  : rawNext;

              const hasPendingKyc = kycSubmissions.some((s) => {
                if (s.status !== "PENDING") return false;
                const sRm = normalizeRoomNumber(s.roomNumber);
                const sBd = normalizeBedCode(s.bedCode);
                return sRm === cleanRm && sBd === cleanBd;
              });

              const hasActiveInvite = kycInvites.some((i) => {
                if (i.status !== "ACTIVE") return false;
                const iRm = normalizeRoomNumber(i.roomNumber);
                const iBd = normalizeBedCode(i.bedCode);
                return iRm === cleanRm && iBd === cleanBd;
              });

              const isBooked =
                (!primaryOcc && !!nextOcc && nextOcc.stayType !== "Guest") ||
                bd.status === "Booked" ||
                hasPendingKyc ||
                hasActiveInvite;

              const effStatus = primaryOcc
                ? primaryOcc.lifecycleStatus === "Notice"
                  ? "Vacating"
                  : primaryOcc.stayType === "Guest"
                  ? "Guest"
                  : "Occupied"
                : nextOcc && nextOcc.stayType === "Guest"
                ? "Guest"
                : isBooked
                ? "Booked"
                : "Available";

              // 💳 SSOT Financial Calculation for Bed
              const finStmt = primaryOcc
                ? calculateOccupantFinancialStatement(primaryOcc, propertySettings)
                : undefined;
              const isRentOverdue = Boolean(
                finStmt && !finStmt.isFullyPaid && finStmt.isOverdue && !finStmt.statusBadgeText.startsWith("DUE")
              );
              const isRentDue = Boolean(finStmt && !finStmt.isFullyPaid && !isRentOverdue);
              const isRentPaid = Boolean(finStmt && finStmt.isFullyPaid);
              const outstandingBalance = finStmt?.netOutstandingBalance || 0;

              // Direct bed search matching (specific bed code, occupant name, phone, vehicle)
              const bdCodeMatch = query ? bd.bedCode?.toLowerCase().includes(query) : false;
              const primaryMatch = query && primaryOcc ? matchesTenoPilotSearch(primaryOcc, query) : false;
              const nextMatch = query && nextOcc ? matchesTenoPilotSearch(nextOcc, query) : false;
              const isDirectSearchMatch = Boolean(bdCodeMatch || primaryMatch || nextMatch);

              return {
                ...bd,
                effectiveStatus: effStatus,
                resolvedOccupant: primaryOcc,
                timeline,
                isDirectSearchMatch,
                financialStatement: finStmt,
                isRentOverdue,
                isRentDue,
                isRentPaid,
                outstandingBalance,
              };
            });

            // 🌟 STRICT ISOLATION FILTERING:
            // 1. If activeFilterStatus is "Due", strictly isolate beds with pending dues!
            // 2. If activeFilterStatus is "Overdue", strictly isolate overdue beds!
            // 3. If activeFilterStatus is not "ALL", isolate beds matching status!
            // 4. If search query is active, isolate direct matches!
            const visibleBeds = enrichedBeds.filter((bd) => {
              if (activeFilterStatus === "Due") {
                if (!bd.isRentDue && !bd.isRentOverdue) return false;
              } else if (activeFilterStatus === "Overdue") {
                if (!bd.isRentOverdue) return false;
              } else if (activeFilterStatus !== "ALL" && bd.effectiveStatus !== activeFilterStatus) {
                return false;
              }
              if (query && !roomMatchesQuery && !bd.isDirectSearchMatch) {
                return false;
              }
              return true;
            });

            const roomTotalDue = enrichedBeds.reduce((sum, bd) => sum + (bd.outstandingBalance || 0), 0);
            const hasOverdueBed = enrichedBeds.some((bd) => bd.isRentOverdue);
            const hasDueBed = enrichedBeds.some((bd) => bd.isRentDue);
            const firstOccName = enrichedBeds.find((bd) => bd.resolvedOccupant)?.resolvedOccupant?.name || "";

            return {
              ...rm,
              isRoomIncluded: visibleBeds.length > 0,
              totalPhysicalBeds: rm.beds ? rm.beds.length : (rm.sharingType || 2),
              allPhysicalBeds: rm.beds || [],
              beds: visibleBeds,
              roomTotalDue,
              hasOverdueBed,
              hasDueBed,
              firstOccName,
            };
          })
          .filter((rm) => rm.isRoomIncluded);

        // Sort matching rooms within the floor based on sortColumn and sortDirection
        matchingRooms.sort((a, b) => {
          if (sortColumn === "room") {
            const aNum = parseInt(a.roomNumber.replace(/\D/g, ""), 10) || 0;
            const bNum = parseInt(b.roomNumber.replace(/\D/g, ""), 10) || 0;
            return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
          }
          if (sortColumn === "duePriority") {
            const aDue = a.roomTotalDue || 0;
            const bDue = b.roomTotalDue || 0;
            if (aDue !== bDue) {
              return sortDirection === "desc" ? bDue - aDue : aDue - bDue;
            }
            const aNum = parseInt(a.roomNumber.replace(/\D/g, ""), 10) || 0;
            const bNum = parseInt(b.roomNumber.replace(/\D/g, ""), 10) || 0;
            return aNum - bNum;
          }
          if (sortColumn === "overduePriority") {
            const aOverdue = a.hasOverdueBed ? 1 : 0;
            const bOverdue = b.hasOverdueBed ? 1 : 0;
            if (aOverdue !== bOverdue) {
              return sortDirection === "desc" ? bOverdue - aOverdue : aOverdue - bOverdue;
            }
            const aDue = a.roomTotalDue || 0;
            const bDue = b.roomTotalDue || 0;
            return sortDirection === "desc" ? bDue - aDue : aDue - bDue;
          }
          if (sortColumn === "name") {
            const aName = a.firstOccName || "";
            const bName = b.firstOccName || "";
            return sortDirection === "asc"
              ? aName.localeCompare(bName)
              : bName.localeCompare(aName);
          }
          return 0;
        });

        const floorTotalDue = matchingRooms.reduce((sum, r) => sum + (r.roomTotalDue || 0), 0);
        const floorHasOverdue = matchingRooms.some((r) => r.hasOverdueBed);

        return {
          ...fl,
          rooms: matchingRooms,
          floorTotalDue,
          floorHasOverdue,
        };
      })
      .filter((fl) => fl.rooms.length > 0)
      .sort((a, b) => {
        // If sorting by duePriority or overduePriority across all floors, bring floors with due/overdue to top
        if (sortColumn === "duePriority") {
          const aDue = a.floorTotalDue || 0;
          const bDue = b.floorTotalDue || 0;
          if (aDue !== bDue) {
            return sortDirection === "desc" ? bDue - aDue : aDue - bDue;
          }
        }
        if (sortColumn === "overduePriority") {
          const aOv = a.floorHasOverdue ? 1 : 0;
          const bOv = b.floorHasOverdue ? 1 : 0;
          if (aOv !== bOv) {
            return sortDirection === "desc" ? bOv - aOv : aOv - bOv;
          }
          const aDue = a.floorTotalDue || 0;
          const bDue = b.floorTotalDue || 0;
          return sortDirection === "desc" ? bDue - aDue : aDue - bDue;
        }
        return 0;
      });
  }, [propertyGrid, selectedFloor, selectedRoom, activeFilterStatus, rawSearchTerm, kycSubmissions, kycInvites, occupants, sortColumn, sortDirection, propertySettings]);

  return (
    <div className="flex min-h-screen bg-[#fcf9f8] text-gray-900 font-sans selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* Left Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">
        <PropertyHeader
          title="Property Map"
          showSearch={false}
          propertyId={propertyId}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Property Map Content Body */}
        <div className="p-4 md:p-8 space-y-6 flex-1 pb-28">
          {/* Top Breadcrumb & Setup Button */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <span>Dashboard</span>
                <span>›</span>
                <span>Properties</span>
                <span>›</span>
                <span className="text-gray-800 font-bold">{propertySettings.propertyName}</span>
              </div>
              <h1 className="font-serif text-3xl font-bold text-gray-900 mt-1">
                {propertySettings.propertyName}
              </h1>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 font-medium">
                📍 {propertySettings.propertyAddress}
              </p>
            </div>

            {activeRole === "receptionist" ? (
              <div
                title="Room & floor configuration is restricted to Property Admins"
                className="px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-gray-400 text-xs font-bold flex items-center gap-2 cursor-not-allowed select-none opacity-70"
              >
                <Lock className="w-4 h-4 text-gray-400" />
                <span>Property Setup</span>
                <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md uppercase font-bold">Admin Only</span>
              </div>
            ) : (
              <Link
                href={`/p/${propertyId}/property-setup`}
                className={`px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white text-xs font-bold shadow-md flex items-center gap-2 active:scale-95 transition-all ${
                  propertyGrid.length === 0 ? "ring-4 ring-[#964407]/40 animate-pulse shadow-xl" : ""
                }`}
              >
                <Settings className="w-4 h-4" /> Property Setup
              </Link>
            )}
          </div>

          {/* Toast Callout */}
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {/* 📊 Operational Financial Metrics Row - Matching Tenants Operations */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* 1. Active Members & Total Beds */}
            <MagneticGlowCard
              glowColor="rgba(150, 68, 7, 0.15)"
              onClick={() => {
                setActiveFilterStatus("ALL");
                setRawSearchTerm("");
              }}
              className={`bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
                activeFilterStatus === "ALL"
                  ? "border-[#c2652a]/40 ring-2 ring-[#c2652a]/20"
                  : "border-gray-100 hover:border-[#c2652a]/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                <p className="text-[10px] sm:text-[11px] uppercase font-bold text-[#964407] tracking-wider truncate">
                  Active Members
                </p>
                <div className="bg-orange-50 text-[#964407] p-1.5 sm:p-2 h-7 w-7 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-black font-sans text-gray-900 tracking-tight leading-tight truncate">
                  <AnimatedNumberCounter value={bedCounts.occupied + bedCounts.vacating + bedCounts.guest} />
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate mt-0.5">
                  {bedCounts.occupied} Active • {bedCounts.available} Available Beds
                </p>
              </div>
            </MagneticGlowCard>

            {/* 2. Collected This Month */}
            <MagneticGlowCard
              glowColor="rgba(16, 185, 129, 0.15)"
              className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                <p className="text-[10px] sm:text-[11px] uppercase font-bold text-emerald-600 tracking-wider truncate">
                  Collected
                </p>
                <div className="bg-emerald-50 text-emerald-600 p-1.5 sm:p-2 h-7 w-7 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-black font-sans text-gray-900 tracking-tight leading-tight truncate">
                  {isPrivacyMode ? "₹••••••" : <AnimatedNumberCounter value={rentMetrics.sumCollected} prefix="₹" />}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate mt-0.5">
                  <AnimatedNumberCounter value={rentMetrics.collectionPct} suffix="%" decimals={1} /> of Expected
                </p>
              </div>
            </MagneticGlowCard>

            {/* 3. Rent Pending Due */}
            <MagneticGlowCard
              glowColor="rgba(245, 158, 11, 0.15)"
              onClick={() => {
                setActiveFilterStatus((prev) => (prev === "Due" ? "ALL" : "Due"));
                setRawSearchTerm("");
              }}
              className={`bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
                activeFilterStatus === "Due"
                  ? "border-amber-400 ring-2 ring-amber-400/50 bg-amber-50/20"
                  : "border-gray-100 hover:border-amber-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                <p className="text-[10px] sm:text-[11px] uppercase font-bold text-amber-600 tracking-wider truncate">
                  Pending Due
                </p>
                <div className="bg-amber-50 text-amber-600 p-1.5 sm:p-2 h-7 w-7 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-black font-sans text-gray-900 tracking-tight leading-tight truncate">
                  {isPrivacyMode ? "₹••••" : <AnimatedNumberCounter value={rentMetrics.dueSum} prefix="₹" />}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate mt-0.5">
                  <AnimatedNumberCounter value={rentMetrics.dueCount} /> Pending Bill{rentMetrics.dueCount === 1 ? "" : "s"}
                </p>
              </div>
            </MagneticGlowCard>

            {/* 4. Overdue Rent */}
            <MagneticGlowCard
              glowColor="rgba(220, 38, 38, 0.15)"
              onClick={() => {
                setActiveFilterStatus((prev) => (prev === "Overdue" ? "ALL" : "Overdue"));
                setRawSearchTerm("");
              }}
              className={`bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
                activeFilterStatus === "Overdue"
                  ? "border-red-400 ring-2 ring-red-400/50 bg-red-50/20"
                  : "border-gray-100 hover:border-red-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                <p className="text-[10px] sm:text-[11px] uppercase font-bold text-red-600 tracking-wider truncate">
                  Overdue Rent
                </p>
                <div className="bg-red-100 text-red-600 p-1.5 sm:p-2 h-7 w-7 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-black font-sans text-gray-900 tracking-tight leading-tight truncate">
                  {isPrivacyMode ? "₹••••" : <AnimatedNumberCounter value={rentMetrics.overdueSum} prefix="₹" />}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate mt-0.5">
                  <AnimatedNumberCounter value={rentMetrics.overdueCount} /> Overdue Account{rentMetrics.overdueCount === 1 ? "" : "s"}
                </p>
              </div>
            </MagneticGlowCard>
          </div>

          {/* Compact Floor Navigation & Native Donut Ring Header Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left Controls & Status Filters */}
            <div className="space-y-4 flex-1 w-full">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif font-bold text-xl text-gray-900">
                    Floor Navigation
                  </h2>
                  <p className="text-xs text-gray-500">
                    Real-time bed-level tracking across all {bedCounts.total} property beds
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* ☑️ Multi-Select Toggle Button (for Batch Reminders) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isMultiSelectMode) {
                        setIsMultiSelectMode(false);
                        setSelectedOccupantIds([]);
                      } else {
                        setIsMultiSelectMode(true);
                        const dueIds = allDueOccupants.map((o) => o.id);
                        setSelectedOccupantIds(dueIds);
                        if (dueIds.length > 0) {
                          triggerToast(`Selected ${dueIds.length} tenants with pending dues. Tap beds to add/remove or tap Send Reminders.`);
                        }
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                      isMultiSelectMode
                        ? "bg-[#c2652a] text-white border-[#c2652a] ring-2 ring-orange-300"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                    title="Select multiple tenants to send batch reminders"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{isMultiSelectMode ? "Exit Select" : "Select"}</span>
                    {selectedOccupantIds.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                        isMultiSelectMode ? "bg-white text-[#c2652a] font-extrabold" : "bg-orange-100 text-[#c2652a]"
                      }`}>
                        {selectedOccupantIds.length}
                      </span>
                    )}
                  </button>

                  {/* ⇅ Interactive Sort Dropdown (Matching Tenants Operations) */}
                  <div className="relative" ref={sortDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-all cursor-pointer"
                    title="Sort rooms by number, pending dues, overdue priority, or resident name"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#c2652a]" />
                    <span>{currentSortOption.icon} {currentSortOption.shortLabel}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isSortDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isSortDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-50 text-xs font-semibold text-gray-800 animate-in fade-in">
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 tracking-wider border-b border-gray-100">
                        Sort Property Map
                      </div>
                      {sortOptions.map((opt) => {
                        const isSelected = opt.column === sortColumn && opt.direction === sortDirection;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSortColumn(opt.column);
                              setSortDirection(opt.direction);
                              setIsSortDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected ? "bg-orange-50 text-[#c2652a] font-bold" : "hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{opt.icon}</span>
                              <span>{opt.label}</span>
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#c2652a]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold pt-1">
                <button
                  onClick={() => {
                    setActiveFilterStatus("ALL");
                    setRawSearchTerm("");
                  }}
                  className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                    activeFilterStatus === "ALL"
                      ? "bg-[#c2652a] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  ALL (<span suppressHydrationWarning>{bedCounts.total}</span>)
                </button>

                <button
                  onClick={() => {
                    setActiveFilterStatus("Available");
                    setRawSearchTerm("");
                  }}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeFilterStatus === "Available"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> AVAILABLE (<span suppressHydrationWarning>{bedCounts.available}</span>)
                </button>

                <button
                  onClick={() => {
                    setActiveFilterStatus("Occupied");
                    setRawSearchTerm("");
                  }}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeFilterStatus === "Occupied"
                      ? "bg-amber-900 text-white shadow-xs"
                      : "bg-[#f7f2ee] text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-700"></span> OCCUPIED (<span suppressHydrationWarning>{bedCounts.occupied}</span>)
                </button>

                <button
                  onClick={() => {
                    setActiveFilterStatus("Vacating");
                    setRawSearchTerm("");
                  }}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeFilterStatus === "Vacating"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> VACATING (<span suppressHydrationWarning>{bedCounts.vacating}</span>)
                </button>

                <button
                  onClick={() => {
                    setActiveFilterStatus("Booked");
                    setRawSearchTerm("");
                  }}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeFilterStatus === "Booked"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> BOOKED (<span suppressHydrationWarning>{bedCounts.booked}</span>)
                </button>

                <button
                  onClick={() => {
                    setActiveFilterStatus("Guest");
                    setRawSearchTerm("");
                  }}
                  className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeFilterStatus === "Guest"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> GUESTS (<span suppressHydrationWarning>{bedCounts.guest}</span>)
                </button>
              </div>
            </div>

            {/* Right: Seamless Donut Ring Chart */}
            <div className="relative flex items-center justify-center shrink-0 w-36 h-36">
              <div
                className="w-36 h-36 rounded-full flex items-center justify-center p-3.5 shadow-2xs"
                style={{ background: donutConicGradient }}
              >
                <div className="w-full h-full bg-white rounded-full flex flex-col items-center justify-center text-center shadow-xs">
                  <span suppressHydrationWarning className="font-serif text-2xl font-bold text-gray-900 leading-none">
                    {bedCounts.total}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">
                    BEDS TOTAL
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 🔍 Dedicated In-Page Search Bar (Search resident name, room, phone, vehicle plate...) */}
          <div className="relative max-w-lg w-full">
            <input
              type="text"
              value={rawSearchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setRawSearchTerm(val);
                if (val.trim() && activeFilterStatus !== "ALL") {
                  setActiveFilterStatus("ALL");
                }
              }}
              placeholder="Search resident name, room, phone, vehicle plate..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 focus:border-[#c2652a] rounded-2xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#c2652a]/20 shadow-xs transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            {rawSearchTerm && (
              <button
                type="button"
                onClick={() => setRawSearchTerm("")}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 absolute right-2.5 top-2.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Floors & Rooms Grid Section */}
          <div className="space-y-8">
            {filteredGrid.length > 0 ? (
              filteredGrid.map((floor) => (
                <div key={floor.id} className="space-y-4">
                  {/* Floor Header Bar */}
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-800">
                        {floor.floorName}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">
                        — {floor.floorSubtitle}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {floor.totalBeds || floor.rooms.reduce((a, b) => a + ((b as any).totalPhysicalBeds || b.beds.length), 0)} BEDS TOTAL ({floor.floorName.toLowerCase()})
                    </span>
                  </div>

                  {/* Rooms Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {floor.rooms.map((room) => (
                      <div
                        key={room.id}
                        className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4"
                      >
                        {/* Room Title Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-serif text-xl font-bold text-gray-900">
                              Room {room.roomNumber}
                            </h3>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">
                              TOTAL BEDS: {(room as any).totalPhysicalBeds || room.sharingType || room.beds.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {(room as any).roomTotalDue > 0 && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border flex items-center gap-1 shadow-2xs ${
                                  (room as any).hasOverdueBed
                                    ? "bg-red-50 text-red-700 border-red-300 animate-pulse"
                                    : "bg-amber-50 text-amber-800 border-amber-300"
                                }`}
                                title={(room as any).hasOverdueBed ? "Room has overdue rent accounts" : "Room has pending rent dues"}
                              >
                                {(room as any).hasOverdueBed ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                                    <span>OVERDUE {isPrivacyMode ? "₹••••" : `₹${(room as any).roomTotalDue.toLocaleString("en-IN")}`}</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>DUE {isPrivacyMode ? "₹••••" : `₹${(room as any).roomTotalDue.toLocaleString("en-IN")}`}</span>
                                  </>
                                )}
                              </span>
                            )}
                            <span className="bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              {room.sharingType} SHARING
                            </span>
                          </div>
                        </div>

                        {/* Bed Slots Grid (Dynamic sizing based on bed count) */}
                        {(() => {
                          const bedCount = room.beds.length;
                          const gridCols =
                            bedCount <= 4
                              ? "grid-cols-2"
                              : bedCount <= 8
                              ? "grid-cols-3"
                              : bedCount <= 16
                              ? "grid-cols-4"
                              : "grid-cols-5";

                          const sortedBeds = [...(room.beds || [])].sort((a, b) =>
                            getCanonicalBedIndex(a.bedCode) - getCanonicalBedIndex(b.bedCode)
                          );
                          const roomCardClaimedOccIds = new Set<string>();

                          return (
                            <div className="space-y-3">
                              <div className={`grid ${gridCols} gap-2.5`}>
                                {sortedBeds.map((bed) => {
                                  const cleanRm = normalizeRoomNumber(room.roomNumber);
                                  const cleanBd = normalizeBedCode(bed.bedCode);
                                  const bedCanonicalIdx = getCanonicalBedIndex(bed.bedCode);

                                  // SSOT: Always evaluate room against its COMPLETE physical bed layout, never the filtered subset!
                                  const physicalRoomBeds = (room as any).allPhysicalBeds && (room as any).allPhysicalBeds.length > 0
                                    ? (room as any).allPhysicalBeds
                                    : (room.beds || []);

                                  const timeline = (bed as any).timeline || getBedOccupantsTimeline(room.roomNumber, bed.bedCode, bed, propertyId, physicalRoomBeds);

                                  // SSOT: If bed was pre-resolved as Available in enrichedBeds, enforce Available status!
                                  const preResolvedStatus = (bed as any).effectiveStatus;
                                  const isAvailableLocked = preResolvedStatus === "Available";

                                  let primaryOcc = isAvailableLocked
                                     ? undefined
                                     : ((bed as any).resolvedOccupant || timeline.activeOccupant);

                                  // Deduplicate: If an occupant was already rendered on an earlier bed in this room, do NOT duplicate
                                  if (primaryOcc) {
                                    if (roomCardClaimedOccIds.has(primaryOcc.id)) {
                                      primaryOcc = undefined;
                                    } else {
                                      roomCardClaimedOccIds.add(primaryOcc.id);
                                    }
                                  }
                                  const rawNext = timeline.nextBooking;
                                  const nextOcc =
                                    rawNext && primaryOcc && (rawNext.id === primaryOcc.id || rawNext.name?.toLowerCase() === primaryOcc.name?.toLowerCase())
                                      ? undefined
                                      : rawNext;

                                  let badgeStyle = "";
                                  let icon = <User className="w-3.5 h-3.5" />;
                                  let statusLabel: string = bed.status;

                                  // Check if there is an active pending KYC submission for this room & bed
                                  const pendingKycSub = kycSubmissions.find((s) => {
                                    if (s.status !== "PENDING") return false;
                                    const sRm = normalizeRoomNumber(s.roomNumber);
                                    const sBd = normalizeBedCode(s.bedCode);
                                    return sRm === cleanRm && sBd === cleanBd;
                                  });

                                  // Check if there is an active KYC invite for this room & bed
                                  const activeKycInvite = kycInvites.find((i) => {
                                    if (i.status !== "ACTIVE") return false;
                                    const iRm = normalizeRoomNumber(i.roomNumber);
                                    const iBd = normalizeBedCode(i.bedCode);
                                    return iRm === cleanRm && iBd === cleanBd;
                                  });

                                  const isKycSubPending = Boolean(pendingKycSub);
                                  const isKycInviteSent = !isKycSubPending && Boolean(activeKycInvite);
                                  const candidateName =
                                    pendingKycSub?.name ||
                                    activeKycInvite?.candidateName ||
                                    "";

                                  const hasCorrectionRequested = isKycInviteSent && kycSubmissions.some((s) => {
                                    if (s.status !== "REJECTED") return false;
                                    const sRm = normalizeRoomNumber(s.roomNumber);
                                    const sBd = normalizeBedCode(s.bedCode);
                                    return (s.inviteId && activeKycInvite && s.inviteId === activeKycInvite.id) || (sRm === cleanRm && sBd === cleanBd);
                                  });

                                  const isBooked =
                                    (!primaryOcc && !!nextOcc && nextOcc.stayType !== "Guest") ||
                                    isKycSubPending ||
                                    isKycInviteSent ||
                                    bed.status === "Booked";

                                  const effectiveStatus = isAvailableLocked
                                    ? "Available"
                                    : primaryOcc
                                    ? primaryOcc.lifecycleStatus === "Notice"
                                      ? "Vacating"
                                      : primaryOcc.stayType === "Guest"
                                      ? "Guest"
                                      : "Occupied"
                                    : nextOcc && nextOcc.stayType === "Guest"
                                    ? "Guest"
                                    : isBooked
                                    ? "Booked"
                                    : "Available";

                                  const isGuestBed = !primaryOcc && nextOcc?.stayType === "Guest";
                                  const isBookedBed = !primaryOcc && isBooked;
                                  const rawVacDate = primaryOcc?.vacatingDate || bed.vacatingDate || "";
                                  
                                  // Evaluate if promised vacating date is past/overdue (strictly day after promised vacating date without checkout)
                                  let isOverdueVacating = false;
                                  if (effectiveStatus === "Vacating" && rawVacDate) {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const parsedVac = parseOccupantDate(rawVacDate) || new Date(rawVacDate);
                                    if (parsedVac && !isNaN(parsedVac.getTime())) {
                                      parsedVac.setHours(0, 0, 0, 0);
                                      isOverdueVacating = today > parsedVac;
                                    }
                                  }

                                  // ⚠️ Evaluate if guest checkout date is past/overdue (guest scheduled checkout has passed without formal checkout)
                                  const rawGuestCheckoutDate = primaryOcc?.vacatingDate || primaryOcc?.guestCheckoutDate || primaryOcc?.dueDate || bed.vacatingDate || bed.guestCheckoutDate || "";
                                  let isOverdueGuest = false;
                                  if (isGuestBed && primaryOcc && rawGuestCheckoutDate) {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const parsedGuestOut = parseOccupantDate(rawGuestCheckoutDate) || new Date(rawGuestCheckoutDate);
                                    if (parsedGuestOut && !isNaN(parsedGuestOut.getTime())) {
                                      parsedGuestOut.setHours(0, 0, 0, 0);
                                      isOverdueGuest = today > parsedGuestOut;
                                    }
                                  }

                                  if (isBookedBed) {
                                    // 📅 Clean Booked theme restored (blue card)
                                    badgeStyle =
                                      "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 shadow-2xs";
                                    // Clean tenant name without 'Booked' and without brackets
                                    statusLabel = candidateName || (nextOcc ? nextOcc.name : "Incoming Resident");
                                  } else if (effectiveStatus === "Available" && !nextOcc) {
                                    badgeStyle =
                                      "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
                                    statusLabel = "Available";
                                  } else if (isGuestBed) {
                                    badgeStyle = isOverdueGuest
                                      ? "bg-red-50 text-red-950 border-2 border-red-500 hover:bg-red-100 shadow-md ring-2 ring-red-400/50 animate-pulse"
                                      : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100";
                                    statusLabel = isOverdueGuest
                                      ? `Overdue (${primaryOcc?.name || "Guest"})`
                                      : primaryOcc ? primaryOcc.name : nextOcc ? nextOcc.name : "Guest";
                                  } else if (effectiveStatus === "Vacating") {
                                    badgeStyle = isOverdueVacating
                                      ? "bg-red-50 text-red-950 border-2 border-red-400 hover:bg-red-100 shadow-md ring-2 ring-red-400/50 animate-pulse"
                                      : "bg-orange-50 text-orange-950 border-2 border-orange-400 hover:bg-orange-100 shadow-md ring-2 ring-orange-300/80 animate-pulse";
                                    statusLabel = isOverdueVacating
                                      ? `Overdue (${primaryOcc?.name || "Move-Out"})`
                                      : `Vacating (${primaryOcc?.name || "Notice"})`;
                                  } else if (primaryOcc) {
                                    if ((bed as any).isRentOverdue) {
                                      badgeStyle = "bg-red-50/70 text-red-950 border-2 border-red-400 hover:bg-red-100 shadow-sm ring-1 ring-red-400/30";
                                    } else if ((bed as any).isRentDue) {
                                      badgeStyle = "bg-amber-50/70 text-amber-950 border border-amber-300 hover:bg-amber-100 shadow-2xs";
                                    } else {
                                      badgeStyle = "bg-[#f7f2ee] text-amber-900 border-amber-200 hover:bg-amber-100";
                                    }
                                    statusLabel = primaryOcc.name;
                                  } else {
                                    badgeStyle =
                                      "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
                                    statusLabel = "Available";
                                  }

                                   const query = rawSearchTerm.toLowerCase().trim();
                                   const roomMatchesQuery = query ? matchesTenoPilotSearch({ roomNumber: room.roomNumber }, query) : false;
                                   const isDirectMatch = Boolean((bed as any).isDirectSearchMatch);
                                   const isSearchHighlighted = Boolean(query && !roomMatchesQuery && isDirectMatch);

                                   const startBedTouchTimer = (e: React.TouchEvent | React.MouseEvent) => {
                                     if (isMultiSelectMode || !primaryOcc) return;
                                     isLongPressTriggeredRef.current = false;
                                     const timer = setTimeout(() => {
                                       isLongPressTriggeredRef.current = true;
                                       setIsMultiSelectMode(true);
                                       handleToggleSelectOccupant(primaryOcc.id);
                                       if (typeof window !== "undefined" && navigator.vibrate) {
                                         try {
                                           navigator.vibrate(60);
                                         } catch {}
                                       }
                                     }, 450); // 450ms standard native mobile long-press threshold
                                     setLongPressTimer(timer);
                                   };

                                   const clearBedTouchTimer = () => {
                                     if (longPressTimer) {
                                       clearTimeout(longPressTimer);
                                       setLongPressTimer(null);
                                     }
                                   };

                                   return (
                                     <button
                                       key={bed.id}
                                       onTouchStart={startBedTouchTimer}
                                       onTouchEnd={clearBedTouchTimer}
                                       onTouchMove={clearBedTouchTimer}
                                       onMouseDown={startBedTouchTimer}
                                       onMouseUp={clearBedTouchTimer}
                                       onContextMenu={(e) => {
                                         if (primaryOcc) e.preventDefault();
                                       }}
                                       style={{
                                         WebkitTouchCallout: "none",
                                         WebkitUserSelect: "none",
                                         userSelect: "none",
                                       }}
                                       onClick={(e) => {
                                         // If long-press just triggered, suppress subsequent synthetic click
                                         if (isLongPressTriggeredRef.current) {
                                           e.preventDefault();
                                           e.stopPropagation();
                                           isLongPressTriggeredRef.current = false;
                                           return;
                                         }

                                         // 1. If in Multi-Select Mode, toggle selection of occupant
                                         if (isMultiSelectMode) {
                                           if (primaryOcc) {
                                             handleToggleSelectOccupant(primaryOcc.id);
                                           }
                                           return;
                                         }

                                         // 2. If KYC review is pending, open review desk
                                         if (isKycSubPending && pendingKycSub) {
                                           router.push(
                                             `/p/${propertyId}/self-kyc?reviewSubmissionId=${pendingKycSub.id}&room=${encodeURIComponent(room.roomNumber)}&bed=${encodeURIComponent(bed.bedCode)}`
                                           );
                                           return;
                                         }

                                         // 3. ⚡ BYPASS DRAWER MODAL for Occupied & Vacating tenants -> Route directly to full profile!
                                         if (
                                           primaryOcc &&
                                           (effectiveStatus === "Occupied" ||
                                             effectiveStatus === "Vacating" ||
                                             primaryOcc.lifecycleStatus === "Active" ||
                                             primaryOcc.lifecycleStatus === "Notice")
                                         ) {
                                           router.push(`/p/${propertyId}/tenants/${primaryOcc.id}`);
                                           return;
                                         }

                                         // 4. Otherwise (Available beds, Booked reservations) open bed drawer
                                         const isVacant = isAvailableLocked || effectiveStatus === "Available" || (!primaryOcc && !nextOcc && !isKycSubPending && !isKycInviteSent);
                                         setActiveBedSlot({
                                           bed,
                                           roomNumber: room.roomNumber,
                                           floorName: floor.floorName,
                                           timeline: isVacant ? { totalUpcomingCount: 0, futureBookings: [] } : timeline,
                                           resolvedOccupant: isVacant ? undefined : primaryOcc,
                                           isVacant,
                                         });
                                       }}
                                       className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center group cursor-pointer active:scale-95 relative select-none touch-manipulation ${
                                         primaryOcc && selectedOccupantIds.includes(primaryOcc.id)
                                           ? "ring-2 ring-[#c2652a] bg-orange-50/70 border-[#c2652a] shadow-md"
                                           : badgeStyle
                                       } ${
                                         isSearchHighlighted
                                           ? "ring-2 ring-[#c2652a] shadow-md scale-[1.02]"
                                           : ""
                                       }`}
                                     >
                                      {/* ☑️ Multi-Select Checkbox Indicator */}
                                      {isMultiSelectMode && primaryOcc && (
                                        <div className={`absolute top-1.5 left-1.5 w-4 h-4 rounded-md border flex items-center justify-center transition-all z-10 ${
                                          selectedOccupantIds.includes(primaryOcc.id)
                                            ? "bg-[#c2652a] border-[#c2652a] text-white shadow-xs"
                                            : "bg-white/95 border-gray-400 text-transparent"
                                        }`}>
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                      )}
                                      {/* 🟠 TOP-RIGHT VACATING / OVERDUE BADGE PILL */}
                                      {effectiveStatus === "Vacating" && (
                                        <span className={`absolute top-1.5 right-1.5 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 ${
                                          isOverdueVacating
                                            ? "bg-red-200 text-red-950 border border-red-400"
                                            : "bg-orange-200 text-orange-950 border border-orange-400 animate-pulse"
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                            isOverdueVacating ? "bg-red-600 animate-ping" : "bg-orange-600 animate-ping"
                                          }`} />
                                          {isOverdueVacating ? "OVERDUE ⚠️" : "VACATING 🟠"}
                                        </span>
                                      )}

                                      {/* 🟣 TOP-RIGHT GUEST / OVERDUE BADGE PILL */}
                                      {isGuestBed && (
                                        <span className={`absolute top-1.5 right-1.5 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 ${
                                          isOverdueGuest
                                            ? "bg-red-200 text-red-950 border border-red-400"
                                            : "bg-purple-200 text-purple-950 border border-purple-300"
                                        }`}>
                                          {isOverdueGuest && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                                          )}
                                          {isOverdueGuest ? "OVERDUE ⚠️" : "GUEST"}
                                        </span>
                                      )}

                                      <div className="p-1 rounded-full bg-white/70 shadow-2xs">
                                        {icon}
                                      </div>
                                      <span className="font-bold text-[11px] truncate w-full">
                                        {bed.bedCode}
                                      </span>
                                      <span className="text-[9px] font-semibold opacity-90 leading-tight truncate w-full">
                                        {primaryOcc ? primaryOcc.name : statusLabel}
                                      </span>

                                      {/* 🟢/⏳/🚨 SSOT Rent Payment Status Badge */}
                                      {primaryOcc && !isBookedBed && (
                                        <div className="w-full flex items-center justify-center mt-0.5">
                                          {(bed as any).isRentOverdue ? (
                                            <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 flex items-center gap-1 shadow-2xs animate-pulse">
                                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                                              <span>OVERDUE {isPrivacyMode ? "₹••••" : `₹${(bed as any).outstandingBalance?.toLocaleString("en-IN")}`}</span>
                                            </span>
                                          ) : (bed as any).isRentDue ? (
                                            <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                                              <Clock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                              <span>DUE {isPrivacyMode ? "₹••••" : `₹${(bed as any).outstandingBalance?.toLocaleString("en-IN")}`}</span>
                                            </span>
                                          ) : (
                                            <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                              <span>PAID</span>
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {/* Active Occupant / Booked Status Badge (Styled with exact solid blue filter theme) */}
                                      {isBookedBed && (
                                        <>
                                          {isKycSubPending ? (
                                            <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-full mt-0.5 truncate max-w-full bg-blue-600 text-white shadow-md flex items-center justify-center gap-1 animate-kyc-buzz cursor-pointer">
                                              <span className="animate-bell-wobble">🔔</span>
                                              <span className="tracking-wide">KYC Review Pending</span>
                                            </span>
                                          ) : isKycInviteSent ? (
                                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full mt-0.5 truncate max-w-full text-white shadow-2xs flex items-center justify-center gap-1 ${
                                              hasCorrectionRequested ? "bg-amber-600" : "bg-blue-600"
                                            }`}>
                                              <span>{hasCorrectionRequested ? "⚠️ Correction Requested" : "✉️ Sent for KYC"}</span>
                                            </span>
                                          ) : nextOcc?.joiningDate ? (
                                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full mt-0.5 truncate max-w-full bg-blue-600 text-white shadow-2xs font-mono">
                                              Check-In: {nextOcc.joiningDate}
                                            </span>
                                          ) : (
                                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full mt-0.5 truncate max-w-full bg-blue-600 text-white shadow-2xs">
                                              Reserved
                                            </span>
                                          )}
                                        </>
                                      )}
                                      {effectiveStatus === "Vacating" && (
                                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full mt-0.5 truncate max-w-full flex items-center justify-center gap-1 ${
                                          isOverdueVacating
                                            ? "bg-red-200 text-red-950 border border-red-400 font-extrabold"
                                            : "bg-orange-200 text-orange-950 border border-orange-400 animate-pulse font-bold"
                                        }`}>
                                          {isOverdueVacating ? "🚨 OVERDUE: " : "🟠 Vacating: "}{rawVacDate || "Notice"}
                                        </span>
                                      )}
                                      {isGuestBed && primaryOcc && (
                                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full mt-0.5 truncate max-w-full flex items-center justify-center gap-1 ${
                                          isOverdueGuest
                                            ? "bg-red-200 text-red-950 border border-red-400 font-extrabold"
                                            : "bg-purple-200/80 text-purple-950"
                                        }`}>
                                          {isOverdueGuest ? "🚨 Out Overdue: " : "Out: "}
                                          {rawGuestCheckoutDate || "12 Aug"}
                                        </span>
                                      )}

                                      {/* Check-In Date Badge for upcoming reservations when bed is currently vacant */}
                                      {!primaryOcc && nextOcc && !isBookedBed && (
                                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full mt-0.5 truncate max-w-full font-mono ${
                                          nextOcc.stayType === "Guest"
                                            ? "bg-purple-100 text-purple-950 border border-purple-200"
                                            : "bg-blue-100 text-blue-950 border border-blue-200"
                                        }`}>
                                          Check-In: {nextOcc.joiningDate}
                                        </span>
                                      )}

                                      {/* 🔮 DYNAMIC PRE-BOOKED REPLACEMENT SUB-BADGE (Only when bed already has an ACTIVE resident!) */}
                                      {primaryOcc && nextOcc && (
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowScheduleModalBed({
                                              bed,
                                              roomNumber: room.roomNumber,
                                              floorName: floor.floorName,
                                              timeline,
                                            });
                                          }}
                                          className={`mt-1.5 w-full p-1.5 rounded-lg border text-[8px] font-extrabold text-left leading-tight shadow-2xs transition-transform hover:scale-102 ${
                                            nextOcc.stayType === "Guest"
                                              ? "bg-purple-100 text-purple-950 border-purple-300"
                                              : "bg-amber-100 text-amber-950 border-amber-300"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-0.5">
                                            <span className="truncate">
                                              {nextOcc.stayType === "Guest" ? "🟣 NEXT GUEST:" : "🟠 NEXT TENANT:"} {nextOcc.name}
                                            </span>
                                          </div>
                                          <div className="text-[7.5px] opacity-80 font-mono">
                                            Check-In: {nextOcc.joiningDate}
                                          </div>

                                          {timeline.totalUpcomingCount > 1 && (
                                            <div className="mt-0.5 text-[7px] text-purple-700 underline font-bold">
                                              + {timeline.totalUpcomingCount - 1} More Scheduled 📅
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </button>
                                  );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                        {/* 📷 Room Photos Lightbox Trigger Button (Only rendered if photos exist) */}
                        {room.roomPhotos && room.roomPhotos.length > 0 && (
                          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                            <button
                              type="button"
                              onClick={() =>
                                setActivePhotoGallery({
                                  roomNumber: room.roomNumber,
                                  photos: room.roomPhotos!,
                                  specialTag: room.specialFeatureTag,
                                })
                              }
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold transition-all"
                            >
                              <Camera className="w-3.5 h-3.5 text-[#c2652a]" />
                              <span>Photos ({room.roomPhotos.length})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : propertyGrid.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-[#d7c2b9] p-10 text-center max-w-lg mx-auto my-12 space-y-4 shadow-sm animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-[#f8ede3] text-[#964407] flex items-center justify-center mx-auto border border-[#d7c2b9]">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-serif font-bold text-xl text-[#201a17]">
                    Building Layout Not Configured Yet
                  </h3>
                  <p className="text-xs text-[#554339] leading-relaxed">
                    Start by configuring your building floors, room sharing types, and bed capacities using <strong>Property Setup</strong>.
                  </p>
                </div>
                {activeRole === "receptionist" ? (
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-xs cursor-not-allowed opacity-70">
                    <Lock className="w-4 h-4" />
                    <span>Configuration Restricted (Contact Admin)</span>
                  </div>
                ) : (
                  <Link
                    href={`/p/${propertyId}/property-setup`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer mt-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configure Building Layout Now</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200 space-y-3 p-6">
                <Search className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="font-bold text-gray-700 text-sm">
                  {rawSearchTerm
                    ? `No rooms or residents matching "${rawSearchTerm}"`
                    : "No matching beds or rooms found for the selected filter."}
                </p>
                {rawSearchTerm ? (
                  <button
                    type="button"
                    onClick={() => setRawSearchTerm("")}
                    className="px-4 py-2 rounded-xl bg-[#c2652a] text-white text-xs font-bold hover:bg-[#a8451f] transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFloor("ALL FLOORS");
                      setSelectedRoom("ALL ROOMS");
                      setActiveFilterStatus("ALL");
                      setRawSearchTerm("");
                    }}
                    className="px-4 py-2 rounded-xl bg-[#c2652a] text-white text-xs font-bold hover:bg-[#a8451f] transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters to Default
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick-View Slide-Over Drawer */}
        {activeBedSlot && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in"
            onClick={() => setActiveBedSlot(null)}
          >
            <div
              className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-xl text-gray-900">
                    {activeBedSlot.floorName} • Room {activeBedSlot.roomNumber} ({activeBedSlot.bed.bedCode})
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Bed Details & Occupant Overview
                  </p>
                </div>
                <button
                  onClick={() => setActiveBedSlot(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const cleanSlotRm = normalizeRoomNumber(activeBedSlot.roomNumber);
                const cleanSlotBd = normalizeBedCode(activeBedSlot.bed.bedCode);
                const slotCanonicalIdx = getCanonicalBedIndex(activeBedSlot.bed.bedCode);

                const isExplicitlyVacant = activeBedSlot.isVacant;

                const activeOcc = isExplicitlyVacant
                  ? undefined
                  : (activeBedSlot.resolvedOccupant || activeBedSlot.timeline?.activeOccupant);

                const rawNext = isExplicitlyVacant
                  ? undefined
                  : activeBedSlot.timeline?.nextBooking;

                const nextOcc =
                  rawNext && activeOcc && (rawNext.id === activeOcc.id || rawNext.name?.toLowerCase() === activeOcc.name?.toLowerCase())
                    ? undefined
                    : rawNext;

                const displayOcc = activeOcc || nextOcc;

                const activePendingSub = kycSubmissions.find((s) => {
                  if (s.status !== "PENDING") return false;
                  const sRm = normalizeRoomNumber(s.roomNumber);
                  const sBd = normalizeBedCode(s.bedCode);
                  return sRm === cleanSlotRm && sBd === cleanSlotBd;
                });

                const activeInvite = kycInvites.find((i) => {
                  if (i.status !== "ACTIVE") return false;
                  const iRm = normalizeRoomNumber(i.roomNumber);
                  const iBd = normalizeBedCode(i.bedCode);
                  return iRm === cleanSlotRm && iBd === cleanSlotBd;
                });

                const isSlotKycSubPending = Boolean(activePendingSub);
                const isSlotKycInviteSent = !isSlotKycSubPending && Boolean(activeInvite);

                if (isSlotKycSubPending && activePendingSub) {
                  return (
                    <div className="space-y-5 text-xs text-center py-6">
                      <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl font-bold shadow-inner ring-4 ring-amber-200/50 animate-bounce">
                        🔔
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 mb-2 animate-pulse">
                          ⚡ KYC REVIEW PENDING
                        </span>
                        <h4 className="font-serif font-bold text-lg text-gray-900">
                          Candidate Submitted Documents
                        </h4>
                        <p className="text-gray-500 mt-1 max-w-xs mx-auto text-xs">
                          {activePendingSub.name} has submitted their KYC form & ID proof for {activeBedSlot.floorName} Room {activeBedSlot.roomNumber} ({activeBedSlot.bed.bedCode}). Ready for your review and approval.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-left space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-semibold">Candidate:</span>
                          <span className="font-bold text-gray-900">{activePendingSub.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-semibold">Phone:</span>
                          <span className="font-mono text-gray-900">{activePendingSub.phone}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-semibold">Assigned Tariff:</span>
                          <span className="font-mono font-bold text-[#c2652a]">₹{activePendingSub.rentAmount?.toLocaleString("en-IN")}/mo</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Link
                          href={`/p/${propertyId}/self-kyc?reviewSubmissionId=${activePendingSub.id}&room=${encodeURIComponent(activeBedSlot.roomNumber)}&bed=${encodeURIComponent(activeBedSlot.bed.bedCode)}`}
                          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#964407] to-[#c2652a] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all block cursor-pointer"
                        >
                          <span>Review & Approve KYC</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(activePendingSub.inviteId, activeBedSlot.roomNumber, activeBedSlot.bed.bedCode)}
                          className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Revoke Submission & Free Bed</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isSlotKycInviteSent) {
                  const slotRejectedSub = kycSubmissions.find((s) => {
                    if (s.status !== "REJECTED") return false;
                    const sRm = normalizeRoomNumber(s.roomNumber);
                    const sBd = normalizeBedCode(s.bedCode);
                    return (s.inviteId && activeInvite && s.inviteId === activeInvite.id) || (sRm === cleanSlotRm && sBd === cleanSlotBd);
                  });

                  return (
                    <div className="space-y-5 text-xs text-center py-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner ${
                        slotRejectedSub ? "bg-amber-100 text-amber-700 ring-4 ring-amber-200/50" : "bg-blue-100 text-blue-700"
                      }`}>
                        {slotRejectedSub ? "⚠️" : "✉️"}
                      </div>
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-2 ${
                          slotRejectedSub
                            ? "bg-amber-100 text-amber-950 border-amber-300"
                            : "bg-blue-100 text-blue-900 border-blue-200"
                        }`}>
                          {slotRejectedSub ? "⚠️ CORRECTION REQUESTED" : "BOOKED • SENT FOR KYC"}
                        </span>
                        <h4 className="font-serif font-bold text-lg text-gray-900">
                          {slotRejectedSub ? "Awaiting Applicant Document Revision" : "Bed Reserved for Incoming Resident"}
                        </h4>
                        <p className="text-gray-500 mt-1 max-w-xs mx-auto text-xs">
                          {slotRejectedSub
                            ? `Applicant was asked to revise proofs for ${activeBedSlot.floorName} Room ${activeBedSlot.roomNumber} (${activeBedSlot.bed.bedCode}). Bed remains on hold.`
                            : `A digital Self-KYC invite has been generated for ${activeBedSlot.floorName} Room ${activeBedSlot.roomNumber} (${activeBedSlot.bed.bedCode}). Bed cannot be booked by others until resolved.`}
                        </p>
                      </div>

                      {activeInvite && (
                        <div className={`p-3.5 rounded-2xl text-left space-y-1.5 border ${
                          slotRejectedSub ? "bg-amber-50/70 border-amber-200" : "bg-blue-50/60 border-blue-200"
                        }`}>
                          <p className="font-bold text-gray-900 text-xs">
                            Candidate: {activeInvite.candidateName}
                          </p>
                          {activeInvite.candidatePhone && (
                            <p className="text-[11px] text-gray-700 font-mono">
                              Phone: {activeInvite.candidatePhone}
                            </p>
                          )}
                          {slotRejectedSub?.rejectionReason && (
                            <div className="mt-2 p-2 rounded-xl bg-amber-100/80 border border-amber-300 text-[11px] text-amber-950 font-medium">
                              <span className="font-bold block text-[10px] uppercase text-amber-800">Reason / Requested Fix:</span>
                              &quot;{slotRejectedSub.rejectionReason}&quot;
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Link
                          href={`/p/${propertyId}/self-kyc`}
                          className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all block cursor-pointer"
                        >
                          <span>Open Self-KYC Desk</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(activeInvite?.id, activeBedSlot.roomNumber, activeBedSlot.bed.bedCode)}
                          className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Revoke Invite & Release Bed</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                if (displayOcc) {
                  const isBooked = !activeOcc && !!nextOcc;
                  const isGuest = displayOcc.stayType === "Guest";
                  const rawGuestCheckout = displayOcc.vacatingDate || displayOcc.guestCheckoutDate || displayOcc.dueDate || "";
                  let isGuestOverdue = false;
                  if (isGuest && !isBooked && rawGuestCheckout) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const parsedGuestOut = parseOccupantDate(rawGuestCheckout) || new Date(rawGuestCheckout);
                    if (parsedGuestOut && !isNaN(parsedGuestOut.getTime())) {
                      parsedGuestOut.setHours(0, 0, 0, 0);
                      isGuestOverdue = today > parsedGuestOut;
                    }
                  }
                  const rawVacDateModal = displayOcc.vacatingDate || "";
                  let isVacatingOverdue = false;
                  if (!isGuest && !isBooked && displayOcc.lifecycleStatus === "Notice" && rawVacDateModal) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const parsedVac = parseOccupantDate(rawVacDateModal) || new Date(rawVacDateModal);
                    if (parsedVac && !isNaN(parsedVac.getTime())) {
                      parsedVac.setHours(0, 0, 0, 0);
                      isVacatingOverdue = today > parsedVac;
                    }
                  }
                  // 💳 SSOT Financial Statement for Drawer Occupant
                  const displayOccStmt = !isBooked ? calculateOccupantFinancialStatement(displayOcc, propertySettings) : undefined;
                  const isRentOverdue = Boolean(
                    displayOccStmt && !displayOccStmt.isFullyPaid && displayOccStmt.isOverdue && !displayOccStmt.statusBadgeText.startsWith("DUE")
                  );
                  const isRentDue = Boolean(displayOccStmt && !displayOccStmt.isFullyPaid && !isRentOverdue);
                  const isRentPaid = Boolean(displayOccStmt && displayOccStmt.isFullyPaid);
                  const netOutstanding = displayOccStmt?.netOutstandingBalance || 0;

                  return (
                    <div className="space-y-6 text-xs">
                      <div
                        className={`flex items-center gap-4 p-4 rounded-2xl border ${
                          isBooked
                            ? isGuest
                              ? "bg-purple-50/80 border-purple-200"
                              : "bg-blue-50/80 border-blue-200"
                            : isRentOverdue
                            ? "bg-red-50/70 border-red-300 ring-1 ring-red-400/30"
                            : isRentDue
                            ? "bg-amber-50/60 border-amber-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <img
                          src={
                            displayOcc.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                              displayOcc.name
                            )}`
                          }
                          alt={displayOcc.name}
                          className="w-14 h-14 rounded-full border border-gray-300 object-cover bg-white shadow-2xs"
                        />
                        <div>
                          <h4 className="font-serif font-bold text-lg text-gray-900">
                            {displayOcc.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isBooked
                                  ? isGuest
                                    ? "bg-purple-200 text-purple-900 border border-purple-300"
                                    : "bg-blue-100 text-blue-900 border border-blue-300"
                                  : isGuest
                                  ? isGuestOverdue
                                    ? "bg-red-100 text-red-900 border border-red-300"
                                    : "bg-purple-100 text-purple-700"
                                  : isVacatingOverdue
                                  ? "bg-red-100 text-red-900 border border-red-300"
                                  : displayOcc.lifecycleStatus === "Notice"
                                  ? "bg-orange-100 text-orange-700 border border-orange-200"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {isBooked
                                ? isGuest
                                  ? "🟣 BOOKED GUEST"
                                  : "🔵 BOOKED"
                                : isGuest
                                ? "🟣 GUEST"
                                : displayOcc.lifecycleStatus === "Notice"
                                ? "🟧 NOTICE"
                                : "🟢 ACTIVE"}
                            </span>
                            {(isGuestOverdue || isVacatingOverdue) && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 shadow-2xs animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                                OVERDUE ⚠️
                              </span>
                            )}
                            <span className="text-gray-500 font-medium font-mono">
                              {displayOcc.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isGuestOverdue && (
                        <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-center gap-2.5 text-red-950 shadow-2xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                          <div className="text-xs">
                            <span className="font-extrabold text-red-900">⚠️ Checkout Overdue ({rawGuestCheckout}):</span>{" "}
                            <span className="text-red-800 font-medium">Guest stay has expired. Please initiate formal checkout or renew stay.</span>
                          </div>
                        </div>
                      )}
                      {isVacatingOverdue && (
                        <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-center gap-2.5 text-red-950 shadow-2xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                          <div className="text-xs">
                            <span className="font-extrabold text-red-900">⚠️ Vacating Notice Overdue ({rawVacDateModal}):</span>{" "}
                            <span className="text-red-800 font-medium">Scheduled move-out date has passed. Please complete formal checkout.</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-medium">Rent Status</span>
                          <span
                            className={`font-bold flex items-center gap-1.5 ${
                              isRentOverdue
                                ? "text-red-600"
                                : isBooked
                                ? isGuest
                                  ? "text-purple-700"
                                  : "text-blue-700"
                                : isRentDue
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {isRentOverdue ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                <span>OVERDUE {isPrivacyMode ? "₹••••" : `(₹${netOutstanding.toLocaleString("en-IN")})`} 🚨</span>
                              </>
                            ) : isBooked ? (
                              "CONFIRMED RESERVATION 🔵"
                            ) : isRentDue ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>DUE {isPrivacyMode ? "₹••••" : `(₹${netOutstanding.toLocaleString("en-IN")})`} ⏳</span>
                              </>
                            ) : (
                              "PAID 🟢"
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-medium">Monthly Rent</span>
                          <span className="font-mono font-bold text-[#c2652a]">
                            {isPrivacyMode ? "₹••••" : `₹${(displayOcc.rentAmount || 0).toLocaleString("en-IN")}`}
                          </span>
                        </div>

                        {displayOccStmt && !isRentPaid && (
                          <div className="flex justify-between items-center bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                            <div className="space-y-0.5">
                              <span className="text-amber-950 font-bold block text-xs">Total Outstanding</span>
                              {displayOccStmt.remainingDepositDue > 0 && (
                                <span className="text-[10px] text-amber-700 block">
                                  Incl. ₹{displayOccStmt.remainingDepositDue.toLocaleString("en-IN")} deposit
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-black text-amber-900 text-sm">
                              {isPrivacyMode ? "₹••••" : `₹${netOutstanding.toLocaleString("en-IN")}`}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-medium">
                            {isBooked ? "Scheduled Move-In Date" : isGuest ? "Check-In Date" : "Move-In / Joining Date"}
                          </span>
                          <span className="font-bold text-blue-700 font-mono">
                            {displayOcc.joiningDate || "—"}
                          </span>
                        </div>
                        {(displayOcc.vacatingDate || displayOcc.guestCheckoutDate || (isGuest && displayOcc.dueDate)) && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">{isGuest ? "Scheduled Checkout" : "Vacating Date"}</span>
                            <span className={`font-bold font-mono ${isGuestOverdue || isVacatingOverdue ? "text-red-600 flex items-center gap-1" : "text-orange-600"}`}>
                              {(isGuestOverdue || isVacatingOverdue) && "🚨 "}
                              {displayOcc.vacatingDate || displayOcc.guestCheckoutDate || displayOcc.dueDate}
                            </span>
                          </div>
                        )}
                        {!isBooked && displayOcc.lastPaidDate && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">Last Paid Date</span>
                            <span className="font-semibold text-gray-900 font-mono">
                              {displayOcc.lastPaidDate}
                            </span>
                          </div>
                        )}
                        {displayOcc.securityDeposit !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">Security Deposit</span>
                            <span className="font-mono font-bold text-gray-800">
                              {isPrivacyMode ? "₹••••" : `₹${(displayOcc.securityDeposit || 0).toLocaleString("en-IN")}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ⚡ Instant 1-Tap Financial Actions */}
                      {displayOccStmt && !isRentPaid && (
                        <div className="space-y-2 pt-1">
                          <Link
                            href={`/p/${propertyId}/tenants?collectRent=${displayOcc.id}`}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Collect Rent ({isPrivacyMode ? "₹••••" : `₹${netOutstanding.toLocaleString("en-IN")}`})</span>
                          </Link>

                          <a
                            href={buildWhatsAppUrl(
                              displayOcc.phone,
                              `Hi ${displayOcc.name}, this is a gentle payment reminder from ${propertySettings.propertyName || "TenoPilot PG"}. Your rent of ₹${netOutstanding.toLocaleString("en-IN")} for Room ${activeBedSlot.roomNumber} (${activeBedSlot.bed.bedCode}) is due. Please clear your dues at your earliest convenience. Thank you!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
                          >
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                            <span>Send WhatsApp Rent Reminder</span>
                          </a>
                        </div>
                      )}

                      {/* If there is an active resident AND an upcoming next booking */}
                      {activeOcc && nextOcc && (
                        <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-blue-900">
                              Upcoming Reservation
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                              {nextOcc.stayType === "Guest" ? "🟣 GUEST" : "🔵 BOOKED"}
                            </span>
                          </div>
                          <p className="font-bold text-gray-900 text-sm">
                            {nextOcc.name}
                          </p>
                          <p className="text-[11px] text-blue-950 font-medium">
                            Check-In: <strong className="font-mono">{nextOcc.joiningDate}</strong>
                          </p>
                          <Link
                            href={`/p/${propertyId}/tenants/${nextOcc.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline pt-1"
                          >
                            View Booking Details <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <a
                          href={`tel:${displayOcc.phone}`}
                          className="flex-1 py-2.5 rounded-xl bg-orange-50 text-[#c2652a] font-bold flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors cursor-pointer text-center"
                        >
                          <Phone className="w-4 h-4" /> Call
                        </a>
                        <a
                          href={buildWhatsAppUrl(
                            displayOcc.phone,
                            `Hi ${displayOcc.name}, reaching out from ${propertySettingsStore.getSettings(propertyId).propertyName || "the PG"} regarding your room ${activeBedSlot.roomNumber} (Bed ${activeBedSlot.bed.bedCode}).`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors cursor-pointer text-center"
                        >
                          <MessageSquare className="w-4 h-4" /> WhatsApp
                        </a>
                      </div>

                      {/* Formal checkout only for currently residing active/notice tenants */}
                      {activeOcc && (
                        <button
                          type="button"
                          onClick={() => {
                            setCheckOutOccupantData({
                              occupant: activeOcc,
                              roomNumber: activeBedSlot.roomNumber,
                              bedCode: activeBedSlot.bed.bedCode,
                            });
                          }}
                          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                        >
                          🔑 Formal Check-Out & Deposit Settlement
                        </button>
                      )}

                      <Link
                        href={`/p/${propertyId}/tenants/${displayOcc.id}`}
                        className="w-full py-3 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 font-bold text-xs flex items-center justify-center gap-2 transition-all block text-center"
                      >
                        View Full Profile <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6 text-xs text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-lg text-gray-900">
                        Bed is Vacant & Ready
                      </h4>
                      <p className="text-gray-500 mt-1">
                        No occupant is assigned to {activeBedSlot.floorName} Room {activeBedSlot.roomNumber} ({activeBedSlot.bed.bedCode})
                      </p>
                    </div>

                    {/* + Add Resident Dropdown Menu */}
                    <div className="relative pt-2">
                      <button
                        type="button"
                        onClick={() => setShowOnboardMenu(!showOnboardMenu)}
                        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-between shadow-md transition-all cursor-pointer active:scale-98"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          <span>+ Add Resident to Bed</span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            showOnboardMenu ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {showOnboardMenu && (
                        <div className="absolute left-0 right-0 bottom-full mb-2 bg-white rounded-2xl border border-gray-200 shadow-2xl py-2 z-50 text-xs font-semibold text-gray-800 animate-in fade-in slide-in-from-bottom-2">
                          <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 text-left">
                            Select Resident Type:
                          </div>
                          <Link
                            href={`/p/${propertyId}/tenants/onboard-tenant?room=${encodeURIComponent(
                              activeBedSlot.roomNumber
                            )}&bed=${encodeURIComponent(activeBedSlot.bed.bedCode)}`}
                            onClick={() => setShowOnboardMenu(false)}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50/80 flex items-center justify-between text-[#c2652a] transition-colors group block"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-orange-100 text-[#c2652a] group-hover:bg-orange-200 shrink-0">
                                <UserPlus className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">Monthly Tenant (Long-term)</div>
                                <div className="text-[10px] text-gray-500 font-normal">
                                  Monthly rent cycle, deposit & KYC agreement
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#c2652a] transition-transform group-hover:translate-x-0.5 shrink-0" />
                          </Link>

                          <Link
                            href={`/p/${propertyId}/tenants/onboard-guest?room=${encodeURIComponent(
                              activeBedSlot.roomNumber
                            )}&bed=${encodeURIComponent(activeBedSlot.bed.bedCode)}`}
                            onClick={() => setShowOnboardMenu(false)}
                            className="w-full text-left px-4 py-3 hover:bg-purple-50/80 flex items-center justify-between text-purple-700 transition-colors group border-t border-gray-100 block"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-200 shrink-0">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">Daily Guest (Short-term)</div>
                                <div className="text-[10px] text-gray-500 font-normal">
                                  Per-day tariff, instant check-in for hostels & travelers
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-700 transition-transform group-hover:translate-x-0.5 shrink-0" />
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Send Self-KYC Invite Link Button (Right below Add Resident to Bed) */}
                    <Link
                      href={`/p/${propertyId}/self-kyc?tab=INVITES&action=invite&room=${encodeURIComponent(
                        activeBedSlot.roomNumber
                      )}&bed=${encodeURIComponent(activeBedSlot.bed.bedCode)}`}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-300/80 hover:border-[#c2652a] text-[#964407] font-bold text-xs flex items-center justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-98 block group"
                      title={`Generate and dispatch digital Self-KYC invite link for Room ${activeBedSlot.roomNumber} (${activeBedSlot.bed.bedCode})`}
                    >
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-[#c2652a]" />
                        <span>Send Self-KYC Invite Link</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#c2652a]/70 group-hover:text-[#964407] group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </Link>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 📷 ROOM LIGHTBOX PHOTO GALLERY MODAL (With 1-Click Download Action) */}
        {activePhotoGallery && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setActivePhotoGallery(null)}
          >
            <div
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-100 text-[#c2652a]">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2">
                      Room {activePhotoGallery.roomNumber} Photos
                      {activePhotoGallery.specialTag && (
                        <span className="text-xs bg-emerald-100 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full">
                          {activePhotoGallery.specialTag}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {activePhotoGallery.photos.length} High-Res Room Images Available
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePhotoGallery(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photo Gallery Grid & Lightbox */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {activePhotoGallery.photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-2xl overflow-hidden border border-gray-200 aspect-4/3 bg-gray-100"
                  >
                    <img
                      src={photo}
                      alt={`Room ${activePhotoGallery.roomNumber} Photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <a
                      href={photo}
                      download={`Room-${activePhotoGallery.roomNumber}-Photo-${idx + 1}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-xs transition-all opacity-90 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerToast(`📥 Downloading Room ${activePhotoGallery.roomNumber} Photo ${idx + 1}...`);
                      }}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-medium">
                  💡 Share room photos with inquiring tenants directly via WhatsApp!
                </span>
                <button
                  type="button"
                  onClick={() => setActivePhotoGallery(null)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                >
                  Close Gallery
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🗓️ BED MONTHLY OCCUPANCY & RESERVATION SCHEDULE MODAL */}
        {showScheduleModalBed && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setShowScheduleModalBed(null)}
          >
            <div
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Bed Occupancy & Reservation Schedule
                    </h3>
                    <p className="text-[11px] text-gray-500 font-semibold">
                      {showScheduleModalBed.floorName} • Room {showScheduleModalBed.roomNumber} ({showScheduleModalBed.bed.bedCode})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScheduleModalBed(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* 1. Primary Active Resident */}
                {showScheduleModalBed.timeline.activeOccupant && (
                  <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-950 bg-orange-200 px-2 py-0.5 rounded">
                        🟢 CURRENT RESIDENT (PHYSICALLY RESIDING NOW)
                      </span>
                      <span className="font-bold text-orange-950">
                        {showScheduleModalBed.timeline.activeOccupant.stayType === "Guest" ? "Guest 🟣" : "Tenant 🟠"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {showScheduleModalBed.timeline.activeOccupant.name}
                        </p>
                        <p className="text-[11px] text-gray-600 font-mono">
                          {showScheduleModalBed.timeline.activeOccupant.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xs text-orange-950 block">
                          Vacating: {showScheduleModalBed.timeline.activeOccupant.vacatingDate || showScheduleModalBed.timeline.activeOccupant.dueDate || "Notice Active"}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          Joined: {showScheduleModalBed.timeline.activeOccupant.joiningDate}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Upcoming Pre-Booked Reservations */}
                <div className="space-y-3">
                  <h4 className="font-serif font-bold text-sm text-gray-900 flex items-center justify-between">
                    <span>📅 Upcoming Confirmed Pre-Bookings</span>
                    <span className="text-xs bg-purple-100 text-purple-900 font-extrabold px-2 py-0.5 rounded-full">
                      {showScheduleModalBed.timeline.totalUpcomingCount} Scheduled
                    </span>
                  </h4>

                  {showScheduleModalBed.timeline.futureBookings.length > 0 ? (
                    showScheduleModalBed.timeline.futureBookings.map((occ, idx) => (
                      <div
                        key={occ.id}
                        className={`p-3.5 rounded-2xl border space-y-2 ${
                          occ.stayType === "Guest"
                            ? "bg-purple-50/70 border-purple-200 text-purple-950"
                            : "bg-amber-50/70 border-amber-200 text-amber-950"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            occ.stayType === "Guest" ? "bg-purple-200 text-purple-950" : "bg-amber-200 text-amber-950"
                          }`}>
                            #{idx + 1} UPCOMING {occ.stayType.toUpperCase()}
                          </span>
                          <span className="font-bold text-[11px] font-mono">
                            Check-In Target: {occ.joiningDate}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <div>
                            <p className="font-bold text-xs text-gray-900">{occ.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{occ.phone}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-xs text-gray-900 block">
                              ₹{occ.rentAmount.toLocaleString("en-IN")} {occ.stayType === "Guest" ? "Tariff" : "/mo"}
                            </span>
                            <span className="text-[9px] text-emerald-700 font-bold">
                              PRE-BOOKED 🟢
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center text-gray-500 font-medium">
                      No additional future bookings scheduled for this bed slot yet.
                    </div>
                  )}
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[10px] text-blue-900 font-semibold leading-relaxed">
                  💡 <strong>Handover Protocol:</strong> The bed card remains assigned to current physical resident until checkout. On check-in date, pre-booked guest automatically becomes primary active occupant.
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModalBed(null)}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs"
                >
                  Close Schedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔑 Formal Check-Out & Settlement Modal */}
        {checkOutOccupantData && (
          <CheckOutSettlementModal
            occupant={checkOutOccupantData.occupant}
            roomNumber={checkOutOccupantData.roomNumber}
            bedCode={checkOutOccupantData.bedCode}
            propertyId={propertyId}
            isOpen={!!checkOutOccupantData}
            onClose={() => setCheckOutOccupantData(null)}
            onSuccess={() => {
              triggerToast(`🎉 Completed formal check-out & deposit settlement for ${checkOutOccupantData.occupant.name}! Bed ${checkOutOccupantData.roomNumber} (${checkOutOccupantData.bedCode}) is now Available 🟢`);
              setActiveBedSlot(null);
            }}
          />
        )}
        {/* 📱 Floating Bulk Action Bar (for Batch Reminders on Property Map) */}
        {selectedOccupantIds.length > 0 && (
          <div className="fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 bg-slate-900 text-white border border-slate-800 shadow-2xl rounded-2xl p-3 sm:px-5 sm:py-3.5 flex items-center justify-between sm:justify-start gap-3 sm:gap-4 animate-in slide-in-from-bottom-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-7 h-7 rounded-xl bg-[#c2652a] text-white font-bold flex items-center justify-center text-xs font-mono shadow-xs">
                {selectedOccupantIds.length}
              </span>
              <div className="hidden sm:block">
                <span className="font-bold text-white block">Tenants Selected</span>
                <span className="text-[10px] text-slate-400">
                  Batch Rent Reminders (WhatsApp & Email)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const dueIds = allDueOccupants.map((o) => o.id);
                  const allDuesSelected = dueIds.length > 0 && dueIds.every((id) => selectedOccupantIds.includes(id));
                  if (allDuesSelected) {
                    setSelectedOccupantIds([]);
                  } else {
                    setSelectedOccupantIds(dueIds);
                  }
                }}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer hidden md:flex items-center gap-1"
              >
                <span>Select All Due ({allDueOccupants.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRentReminderModal(true)}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Reminders ({selectedOccupantIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedOccupantIds([]);
                  setIsMultiSelectMode(false);
                }}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Cancel selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 💬 Send Rent Reminders Modal (Native on Property Map) */}
        {showRentReminderModal && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
            onClick={() => setShowRentReminderModal(false)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-100 shadow-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-xs max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Drag Handle */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto sm:hidden mb-1 shrink-0" />

              {/* Clean Responsive Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif font-bold text-sm sm:text-base text-gray-900 leading-tight truncate">
                      Send Rent Reminders
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                      {selectedOccupants.length} of {allDueOccupants.length} Tenants Selected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 border rounded-full font-bold text-[10px] sm:text-[11px] shadow-2xs ${
                      whatsappCredits <= 0
                        ? "bg-rose-50 border-rose-300 text-rose-800"
                        : "bg-emerald-50 border-emerald-200 text-emerald-800"
                    }`}
                  >
                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                    <span>{whatsappCredits} WhatsApp Credits</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRentReminderModal(false)}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Step 1: Payment Method Selector */}
              {(() => {
                const reminderCards = getReminderPaymentCards();
                return (
                  <div className="space-y-2 p-3 sm:p-3.5 bg-orange-50/40 rounded-2xl border border-orange-200/60">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-[#c2652a]" />
                        <span>1. Receiving Account / QR</span>
                      </h4>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {reminderCards.length} available
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                      {reminderCards.map((card, idx) => {
                        const isSelected = idx === activeQrIndex;
                        const isCardCash = card.upiId === "CASH_PAYMENT" || card.accountType === "CASH_DESK";

                        return (
                          <button
                            key={card.id || idx}
                            type="button"
                            onClick={() => setActiveQrIndex(idx)}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                              isSelected
                                ? isCardCash
                                  ? "bg-amber-50/90 border-amber-300 ring-1.5 ring-amber-400/50 shadow-xs"
                                  : "bg-orange-50/90 border-orange-300 ring-1.5 ring-[#c2652a]/50 shadow-xs"
                                : "bg-white border-gray-200 hover:bg-gray-50/80"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isCardCash
                                    ? isSelected ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800"
                                    : isSelected ? "bg-[#c2652a] text-white" : "bg-orange-100 text-[#c2652a]"
                                }`}
                              >
                                {isCardCash ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-gray-900 truncate">{card.name}</span>
                                  {card.isDefault && (
                                    <span className="bg-orange-100 text-[#c2652a] text-[8px] px-1.5 py-0.2 rounded font-bold uppercase">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 truncate">
                                  {isCardCash ? "Cash Desk Handover" : `UPI: ${card.upiId}`}
                                </div>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "border-[#c2652a] bg-[#c2652a] text-white" : "border-gray-300"
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Step 2: Selected Recipients List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                  <span>2. Selected Recipients ({selectedOccupants.length}):</span>
                  <button
                    type="button"
                    onClick={() => {
                      const dueIds = allDueOccupants.map((o) => o.id);
                      setSelectedOccupantIds(dueIds);
                    }}
                    className="text-[11px] text-[#c2652a] hover:underline"
                  >
                    Select All Due ({allDueOccupants.length})
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {selectedOccupants.map((occ) => {
                    const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
                    const netDue = stmt.netOutstandingBalance > 0 ? stmt.netOutstandingBalance : occ.rentAmount;

                    return (
                      <div key={occ.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-gray-50">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectOccupant(occ.id)}
                            className="w-4 h-4 rounded border-2 border-[#c2652a] bg-[#c2652a] text-white flex items-center justify-center text-[10px] shrink-0"
                          >
                            ✓
                          </button>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs text-gray-900 block truncate">{occ.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              Room {occ.roomNumber} ({occ.bedCode}) • {occ.phone}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-xs text-red-600 block">
                            ₹{netDue.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[9px] text-gray-400">Due</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Channels (WhatsApp & Email) */}
              <div className="space-y-2 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                <h4 className="font-bold text-xs text-gray-900">3. Delivery Channels:</h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedReminderChannels.whatsapp}
                        onChange={(e) => setSelectedReminderChannels((prev) => ({ ...prev, whatsapp: e.target.checked }))}
                        className="w-4 h-4 accent-emerald-600 rounded"
                      />
                      <div>
                        <span className="font-bold text-xs text-gray-900 block">WhatsApp Message</span>
                        <span className="text-[10px] text-gray-500">Official Cloud API with payment QR & statement</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {whatsappCredits} Credits
                    </span>
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedReminderChannels.email}
                        onChange={(e) => setSelectedReminderChannels((prev) => ({ ...prev, email: e.target.checked }))}
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <div>
                        <span className="font-bold text-xs text-gray-900 block">Email Dispatch</span>
                        <span className="text-[10px] text-gray-500">Branded email invoice to tenant inbox</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {emailCredits} Credits
                    </span>
                  </label>
                </div>
              </div>

              {/* Step 4: Dispatch Action */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={
                    isSendingReminders ||
                    selectedOccupants.length === 0 ||
                    (!selectedReminderChannels.whatsapp && !selectedReminderChannels.email)
                  }
                  onClick={handleSendBulkReminders}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {isSendingReminders ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        {reminderProgress?.channel
                          ? `Sending ${reminderProgress.channel} (${reminderProgress.sent}/${reminderProgress.total})...`
                          : "Dispatching Reminders..."}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      <span>Send Rent Reminders ({selectedOccupants.length})</span>
                    </div>
                  )}
                </button>

                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/p/${propertyId}/tenants?sendReminders=true&selectedIds=${selectedOccupantIds.join(",")}`}
                    className="text-[11px] text-gray-500 hover:text-gray-800 underline font-semibold"
                  >
                    Open in Tenants Operations Desk →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowRentReminderModal(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PropertyMapPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center text-gray-500 font-bold text-sm">Loading Floor Navigation...</div>}>
      <PropertyMapContent propertyId={propertyId} />
    </Suspense>
  );
}

