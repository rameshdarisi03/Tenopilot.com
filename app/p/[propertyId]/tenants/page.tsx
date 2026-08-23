"use client";

export const dynamic = "force-dynamic";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, occupantStore, Occupant, PaymentHistoryItem } from "@/constants/mockOccupants";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { runAutoCheckInEngine } from "@/utils/autoCheckInEngine";
import { propertySettingsStore, DEFAULT_QR_PROFILES } from "@/constants/propertySettings";
import { subscribeOccupantsFromFirestore, deleteOccupantFromFirestore, purgeAllMockOccupantsFromFirestore, isGenuineOccupantId } from "@/lib/firestoreService";
import { sanitizeSearchInput, normalizePhoneNumber } from "@/utils/security";
import { calculateOccupantFinancialStatement, calculateProRataRent, resolveOccupantLastPaidInfo, resolveOccupantPaymentDueDate } from "@/utils/domainSSOT";
import { activityAuditStore } from "@/utils/activityAuditStore";
import { useAuth } from "@/providers/AuthProvider";
import { CheckOutSettlementModal } from "@/components/dashboard/CheckOutSettlementModal";
import { QRCodeSVG } from "qrcode.react";
import { AnimatedNumberCounter } from "@/components/motion/AnimatedNumberCounter";
import { GlidingTabs, TabOption } from "@/components/motion/GlidingTabs";
import { MagneticGlowCard } from "@/components/motion/MagneticGlowCard";
import { StaggerItem } from "@/components/motion/StaggerContainer";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";
import { FastTrackImportModal } from "@/components/dashboard/FastTrackImportModal";
import { WhatsAppWalletModal } from "@/components/dashboard/WhatsAppWalletModal";
import { whatsappCreditStore } from "@/constants/whatsappCreditStore";
import {
  Search,
  Plus,
  Sparkles,
  Filter,
  Phone,
  MessageSquare,
  MoreVertical,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  X,
  UserPlus,
  ShieldCheck,
  ChevronDown,
  Trash2,
  Eye,
  User,
  CreditCard,
  ArrowRightLeft,
  FileText,
  ArrowUpDown,
  Upload,
  QrCode,
  ExternalLink,
  ImageIcon,
  Users,
  Zap,
  RefreshCw,
} from "lucide-react";

export default function TenantsDirectoryPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  const { profile } = useAuth();

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic Occupants Store State (Updates in real time per property scope)
  const [occupantsList, setOccupantsList] = useState<Occupant[]>(() => occupantStore.getOccupants(propertyId));

  useEffect(() => {
    setOccupantsList(occupantStore.getOccupants(propertyId));

    const unsubscribeLocal = occupantStore.subscribe(() => {
      setOccupantsList(occupantStore.getOccupants(propertyId));
    });

    const unsubscribeFirestore = subscribeOccupantsFromFirestore(propertyId, (fsOccupants) => {
      if (fsOccupants && fsOccupants.length > 0) {
        occupantStore.setOccupantsFromFirestore(fsOccupants, propertyId);
        setOccupantsList(occupantStore.getOccupants(propertyId));
      } else {
        occupantStore.setOccupantsFromFirestore([], propertyId);
        setOccupantsList([]);
      }
    });

    return () => {
      unsubscribeLocal();
      unsubscribeFirestore();
    };
  }, [propertyId]);

  // Filter & Search states
  const [rawSearchTerm, setRawSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState<
    "All" | "Booked" | "Active" | "Notice" | "Past" | "Guests"
  >("All");

  // Dropdown filter states
  const [tenantStatusFilter, setTenantStatusFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [paymentDueFilter, setPaymentDueFilter] = useState("All");
  const [floorFilter, setFloorFilter] = useState("All Floors");
  const [roomFilter, setRoomFilter] = useState("All Rooms");

  // Interactive Column Sorting state
  const [sortColumn, setSortColumn] = useState<
    "name" | "dueDate" | "room" | "rent"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Mobile Tactile Multi-Select Mode (Long-press activated)
  const [isMobileMultiSelectMode, setIsMobileMultiSelectMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Sorting dropdown helper sync
  const [sortBy, setSortBy] = useState<
    "name-asc" | "name-desc" | "room" | "rent-desc" | "due"
  >("name-asc");

  // Selection state for bulk actions (Default empty, no ghost selected banners!)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);
  const [activeActionDropdownId, setActiveActionDropdownId] = useState<string | null>(null);

  // Collect Rent Modal State
  const [collectRentOccupant, setCollectRentOccupant] = useState<Occupant | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>("2026-08-01");
  const [paymentPurpose, setPaymentPurpose] = useState<"RENT" | "DEPOSIT" | "COMBINED">("RENT");
  const [rentPaymentPortion, setRentPaymentPortion] = useState<number>(14500);
  const [depositPaymentPortion, setDepositPaymentPortion] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(14500);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [showLedgerBreakdownDetail, setShowLedgerBreakdownDetail] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentSettings, setCurrentSettings] = useState(() =>
    typeof window !== "undefined" ? propertySettingsStore.getSettings(propertyId) : propertySettingsStore.getSettings()
  );

  // Sync initial allocation when opening Collect Payment Modal
  useEffect(() => {
    if (collectRentOccupant) {
      const stmt = calculateOccupantFinancialStatement(collectRentOccupant, currentSettings);
      const rentDue = stmt.remainingRentDue > 0 ? stmt.remainingRentDue : collectRentOccupant.rentAmount;
      const depDue = stmt.remainingDepositDue;

      if (stmt.remainingRentDue === 0 && depDue > 0) {
        setPaymentPurpose("DEPOSIT");
        setRentPaymentPortion(0);
        setDepositPaymentPortion(depDue);
      } else if (stmt.remainingRentDue > 0 && depDue > 0) {
        setPaymentPurpose("RENT");
        setRentPaymentPortion(rentDue);
        setDepositPaymentPortion(depDue);
      } else {
        setPaymentPurpose("RENT");
        setRentPaymentPortion(rentDue);
        setDepositPaymentPortion(0);
      }
    }
  }, [collectRentOccupant, currentSettings]);

  // Rent Reminder QR Code & WhatsApp Broadcast Modal State
  const [showRentReminderQRModal, setShowRentReminderQRModal] = useState(false);
  const [activeQrIndex, setActiveQrIndex] = useState<number>(0);
  const [selectedQrType, setSelectedQrType] = useState<"phonepe" | "gpay" | "hdfc" | "custom">("phonepe");
  const [customUpiId, setCustomUpiId] = useState<string>("tenopilot@ybl");
  const [uploadedQrName, setUploadedQrName] = useState<string | null>(null);
  const [deletePastTenantTarget, setDeletePastTenantTarget] = useState<Occupant | null>(null);

  // WhatsApp Cloud Gateway & Credit Wallet States
  const [showWhatsAppWalletModal, setShowWhatsAppWalletModal] = useState(false);
  const [whatsappCredits, setWhatsappCredits] = useState<number>(() => whatsappCreditStore.getCredits(propertyId));
  const [isSendingCloudWhatsApp, setIsSendingCloudWhatsApp] = useState(false);
  const [cloudSendProgress, setCloudSendProgress] = useState<{ sent: number; total: number } | null>(null);

  // Booked Tenant Check-In & Postpone Modal State
  const [checkInModalOccupant, setCheckInModalOccupant] = useState<Occupant | null>(null);
  const [showCompleteCheckInPopup, setShowCompleteCheckInPopup] = useState<boolean>(false);
  const [showPostponeModal, setShowPostponeModal] = useState<boolean>(false);
  const [postponedDate, setPostponedDate] = useState<string>("2026-08-15");
  const [checkOutModalOccupant, setCheckOutModalOccupant] = useState<Occupant | null>(null);

  // Silent Automated Move-In Date Auto-Checkin Engine & Property Settings Reactive Subscriber
  useEffect(() => {
    runAutoCheckInEngine();
    propertySettingsStore.initFirebaseListener(propertyId);
    setCurrentSettings(propertySettingsStore.getSettings(propertyId));
    const unsubscribeSettings = propertySettingsStore.subscribe(() => {
      setCurrentSettings(propertySettingsStore.getSettings(propertyId));
    });

    whatsappCreditStore.initFirebaseListener(propertyId);
    whatsappCreditStore.fetchWalletFromFirestore(propertyId);
    setWhatsappCredits(whatsappCreditStore.getCredits(propertyId));
    const unsubscribeWallet = whatsappCreditStore.subscribe(() => {
      setWhatsappCredits(whatsappCreditStore.getCredits(propertyId));
    });

    return () => {
      unsubscribeSettings();
      unsubscribeWallet();
    };
  }, [propertyId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1-Tap Central WhatsApp Cloud Dispatch Handler
  const handleSendCloudWhatsAppReminders = async () => {
    const profiles = currentSettings.qrProfiles && currentSettings.qrProfiles.length > 0 ? currentSettings.qrProfiles : DEFAULT_QR_PROFILES;
    const activeQr = profiles[activeQrIndex] || profiles[0];
    const selectedOccupants = occupantsList.filter((o) => selectedIds.includes(o.id));

    if (selectedOccupants.length === 0) {
      triggerToast("Please select at least one tenant to send reminders.");
      return;
    }

    const currentBal = whatsappCreditStore.getCredits(propertyId);
    if (currentBal < selectedOccupants.length) {
      triggerToast(`⚠️ Insufficient WhatsApp Credits! You need ${selectedOccupants.length} credits, but have ${currentBal}. Please recharge.`);
      setShowWhatsAppWalletModal(true);
      return;
    }

    setIsSendingCloudWhatsApp(true);
    setCloudSendProgress({ sent: 0, total: selectedOccupants.length });

    let sentCount = 0;
    for (const occ of selectedOccupants) {
      try {
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            messages: [
              {
                toPhone: occ.phone,
                recipientName: occ.name,
                propertyId,
                propertyName: currentSettings.propertyName || "TenoPilot PG",
                type: "RENT_REMINDER",
                params: {
                  roomNumber: occ.roomNumber,
                  bedCode: occ.bedCode,
                  amount: occ.rentAmount,
                  dueDate: occ.dueDate,
                  upiId: activeQr?.upiId,
                  bankLabel: activeQr?.bankLabel,
                },
              },
            ],
          }),
        });

        if (res.ok) {
          whatsappCreditStore.deductCredit(propertyId, {
            recipientPhone: occ.phone,
            recipientName: occ.name,
            messageType: "RENT_REMINDER",
            description: `Auto-sent Rent Reminder to ${occ.name} (Room ${occ.roomNumber})`,
          });
          sentCount++;
          setCloudSendProgress({ sent: sentCount, total: selectedOccupants.length });
        }
      } catch (err) {
        console.warn("Failed sending WhatsApp for", occ.name, err);
      }
    }

    setIsSendingCloudWhatsApp(false);
    setCloudSendProgress(null);
    setShowRentReminderQRModal(false);
    triggerToast(`🎉 Successfully dispatched ${sentCount} automated WhatsApp reminders via TenoPilot Cloud!`);

    activityAuditStore.logActivity(propertyId, {
      type: "PAYMENT",
      title: `WhatsApp Reminders: ${sentCount} Sent`,
      subtitle: `Batch dispatched to ${sentCount} selected tenants via Cloud API`,
      staffName: profile?.displayName || "Manager",
      staffRole: "Property Admin",
    });
  };

  // Handle Complete Check-In Submission
  const handleConfirmCompleteCheckIn = () => {
    if (!checkInModalOccupant) return;
    const todayStr = new Date().toLocaleDateString("en-GB");
    checkInModalOccupant.lifecycleStatus = "Active";
    checkInModalOccupant.joiningDate = todayStr;

    triggerToast(`🎉 Completed Check-In for ${checkInModalOccupant.name}! Status updated to Active Tenant.`);
    setShowCompleteCheckInPopup(false);
    setCheckInModalOccupant(null);
  };

  // Handle Postpone Check-In Submission
  const handlePostponeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInModalOccupant) return;

    checkInModalOccupant.joiningDate = postponedDate;
    triggerToast(`✓ Postponed move-in date for ${checkInModalOccupant.name} to ${postponedDate}`);
    setShowPostponeModal(false);
    setCheckInModalOccupant(null);
  };

  // Handle Rent Collection Submission (Supports Rent, Deposit, and Combined Allocations)
  const handleCollectRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectRentOccupant) return;

    const effectiveRent = paymentPurpose === "DEPOSIT" ? 0 : (rentPaymentPortion || 0);
    const effectiveDeposit = paymentPurpose === "RENT" ? 0 : (depositPaymentPortion || 0);
    const totalCollected = effectiveRent + effectiveDeposit;

    if (totalCollected <= 0) {
      triggerToast("⚠️ Please enter a payment amount greater than ₹0.");
      return;
    }

    const dParts = paymentDate.split("-");
    const formattedPaidDate = `${dParts[2]} ${
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
        parseInt(dParts[1], 10) - 1
      ] || "Aug"
    } ${dParts[0]}`;

    const staffName = profile?.displayName || "Admin";
    const staffRole = profile?.role === "master_admin" ? "Master Admin" : profile?.role === "receptionist" ? "Receptionist" : "Admin";
    const modeLabel =
      paymentMode === "UPI"
        ? `UPI (${transactionRef || "GPay"})`
        : paymentMode === "Bank Transfer"
        ? `Bank Transfer (${transactionRef || "NEFT"})`
        : "Cash";

    const currentBillingMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const newReceipts: PaymentHistoryItem[] = [];

    // 🏠 Rent Receipt
    if (effectiveRent > 0) {
      newReceipts.push({
        id: `rcpt_rent_${Date.now()}`,
        receiptNo: `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        month: currentBillingMonth,
        amount: effectiveRent,
        date: formattedPaidDate,
        mode: modeLabel,
        status: "PAID",
        collectedBy: {
          id: profile?.uid,
          name: staffName,
          role: staffRole,
          email: profile?.email,
        },
      });
    }

    // 🔒 Security Deposit Receipt
    if (effectiveDeposit > 0) {
      newReceipts.push({
        id: `rcpt_dep_${Date.now() + 1}`,
        receiptNo: `DEP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        month: "Security Deposit",
        amount: effectiveDeposit,
        date: formattedPaidDate,
        mode: modeLabel,
        status: "PAID",
        collectedBy: {
          id: profile?.uid,
          name: staffName,
          role: staffRole,
          email: profile?.email,
        },
      });
    }

    const updatedHistory = [...newReceipts, ...(collectRentOccupant.paymentHistory || [])];
    const updatedDraft: Occupant = {
      ...collectRentOccupant,
      paymentHistory: updatedHistory,
    };
    const stmt = calculateOccupantFinancialStatement(updatedDraft, currentSettings);

    const updated: Occupant = {
      ...collectRentOccupant,
      paymentStatus: stmt.isFullyPaid ? "Paid" : "Due",
      lastPaidDate: formattedPaidDate,
      daysRemainingText: stmt.isFullyPaid ? "—" : "PARTIAL DUE",
      depositStatus: stmt.depositStatusLabel,
      partialPaidThisCycle: stmt.totalPaid,
      paymentHistory: updatedHistory,
    };

    occupantStore.updateOccupant(updated, propertyId);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed occupant status in propertyStore!
    const currentStructure = propertyStore.getStructure(propertyId);
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        if (room.roomNumber !== collectRentOccupant.roomNumber) return room;
        return {
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.bedCode !== collectRentOccupant.bedCode) return bed;
            return {
              ...bed,
              occupant: updated,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure, propertyId);

    activityAuditStore.logActivity(propertyId, {
      type: "PAYMENT",
      title: `Payment Collected: ₹${totalCollected.toLocaleString("en-IN")}`,
      subtitle: `${collectRentOccupant.name} (Room ${collectRentOccupant.roomNumber})`,
      staffName,
      staffRole,
      staffEmail: profile?.email,
    });

    fireCelebrationConfetti();
    if (paymentPurpose === "COMBINED") {
      triggerToast(
        `🎉 Total ₹${totalCollected.toLocaleString("en-IN")} (Rent: ₹${effectiveRent.toLocaleString("en-IN")}, Deposit: ₹${effectiveDeposit.toLocaleString("en-IN")}) recorded for ${collectRentOccupant.name} 🟢`
      );
    } else if (paymentPurpose === "DEPOSIT") {
      triggerToast(
        `🎉 Security Deposit of ₹${effectiveDeposit.toLocaleString("en-IN")} recorded for ${collectRentOccupant.name} 🔒`
      );
    } else {
      triggerToast(
        `🎉 Rent of ₹${effectiveRent.toLocaleString("en-IN")} recorded for ${collectRentOccupant.name} 🟢`
      );
    }

    setCollectRentOccupant(null);
    setTransactionRef("");
  };

  // Dynamic Rent Metrics Calculations
  const rentMetrics = useMemo(() => {
    // Only Active & Notice occupants have active monthly/stay rent obligations (Excludes Booked & Past)
    const billableOccupants = occupantsList.filter(
      (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
    );

    let dueTodayCount = 0;
    let dueTodaySum = 0;
    let dueTomorrowCount = 0;
    let dueTomorrowSum = 0;
    let dueNext2DaysCount = 0;
    let dueNext2DaysSum = 0;
    let overdueCount = 0;
    let overdueSum = 0;
    let sumCollected = 0;
    let totalExpected = 0;

    billableOccupants.forEach((curr) => {
      const stmt = calculateOccupantFinancialStatement(curr, currentSettings);
      totalExpected += stmt.proRataRent + stmt.priorArrears;
      sumCollected += stmt.totalRentPaid;

      if (!stmt.isFullyPaid) {
        const netDue = stmt.netOutstandingBalance;
        if (stmt.isOverdue || curr.paymentStatus === "Overdue" || curr.daysDiff < 0) {
          overdueCount++;
          overdueSum += netDue;
        } else if (curr.daysDiff === 0) {
          dueTodayCount++;
          dueTodaySum += netDue;
        } else if (curr.daysDiff === 1) {
          dueTomorrowCount++;
          dueTomorrowSum += netDue;
        } else {
          dueNext2DaysCount++;
          dueNext2DaysSum += netDue;
        }
      }
    });

    const collectionPct = totalExpected > 0 ? Number(((sumCollected / totalExpected) * 100).toFixed(1)) : 0;

    return {
      dueTodayCount,
      dueTodaySum,
      dueTomorrowCount,
      dueTomorrowSum,
      dueNext2DaysCount,
      dueNext2DaysSum,
      overdueCount,
      overdueSum,
      collectionPct,
      sumCollected,
      totalExpected,
    };
  }, [occupantsList, currentSettings]);

  // XSS Sanitized & Tokenized Search Filtering + Sorting
  const filteredOccupants = useMemo(() => {
    // 1. Sanitize raw input against script injection
    const cleanSearch = sanitizeSearchInput(rawSearchTerm).toLowerCase().trim();
    const searchTokens = cleanSearch.split(/\s+/).filter(Boolean);
    const numericDigitsOnly = normalizePhoneNumber(cleanSearch);

    const matched = occupantsList.filter((occ) => {
      // 1. Robust multi-attribute search matching (Global Search Override)
      if (searchTokens.length > 0) {
        const occNameLower = occ.name.toLowerCase();
        const occRoomLower = occ.roomNumber.toLowerCase();
        const occPhoneDigits = normalizePhoneNumber(occ.phone);
        const occAadhaar = occ.aadhaarNumber.toLowerCase();

        // Check if entered tokens match name prefix (startsWith word), room, or phone
        const matchesAllTokens = searchTokens.every((token) => {
          const cleanName = occNameLower.replace(/[^a-z0-9\s]/g, "");
          const nameWords = cleanName.split(/\s+/).filter(Boolean);
          // Match if full name starts with token OR any word in name starts with token
          const nameMatchesPrefix = occNameLower.startsWith(token) || nameWords.some((w) => w.startsWith(token));
          const roomMatches = occRoomLower.startsWith(token) || occRoomLower.includes(token);
          const aadhaarMatches = occAadhaar.startsWith(token);
          const phoneMatches = numericDigitsOnly.length >= 2 && occPhoneDigits.includes(numericDigitsOnly);

          return nameMatchesPrefix || roomMatches || aadhaarMatches || phoneMatches;
        });

        // If searching, return true if matches query (Ignore tab & dropdown filters for True Global Search)
        return matchesAllTokens;
      }

      // 2. Status Segmented Tab Filter (Only applied when NOT searching)
      if (activeFilterTab === "Booked" && occ.lifecycleStatus !== "Booked") return false;
      if (activeFilterTab === "Active" && occ.lifecycleStatus !== "Active") return false;
      if (activeFilterTab === "Notice" && occ.lifecycleStatus !== "Notice") return false;
      if (activeFilterTab === "Past" && occ.lifecycleStatus !== "Past") return false;
      if (activeFilterTab === "Guests" && occ.stayType !== "Guest") return false;

      // Dropdown Filters
      if (tenantStatusFilter !== "All" && occ.lifecycleStatus !== tenantStatusFilter) return false;
      if (paymentStatusFilter !== "All" && occ.paymentStatus !== paymentStatusFilter) return false;
      if (paymentDueFilter !== "All") {
        if (paymentDueFilter === "Today" && (occ.daysDiff !== 0 || occ.paymentStatus !== "Due")) return false;
        if (paymentDueFilter === "Tomorrow" && (occ.daysDiff !== 1 || occ.paymentStatus !== "Due")) return false;
        if (paymentDueFilter === "Overdue" && occ.paymentStatus !== "Overdue") return false;
      }
      if (roomFilter !== "All Rooms" && occ.roomNumber !== roomFilter) return false;

      return true;
    });

    // 2. Priority Relevance Ranking + Interactive Column Sorting
    return matched.sort((a, b) => {
      // Relevance Ranking: If user is typing a query, prioritize names whose FIRST NAME starts with search token
      if (searchTokens.length > 0) {
        const token = searchTokens[0];
        const getScore = (occName: string) => {
          const nameLower = occName.toLowerCase().trim();
          const cleanName = nameLower.replace(/[^a-z0-9\s]/g, "");
          const words = cleanName.split(/\s+/).filter(Boolean);
          // Score 1: First name / full name starts directly with token (e.g. Ramesh, Ranbir, Ravindra)
          if (nameLower.startsWith(token) || (words[0] && words[0].startsWith(token))) return 1;
          // Score 2: Last name starts with token (e.g. KL Rahul)
          if (words.some((w) => w.startsWith(token))) return 2;
          return 3;
        };

        const scoreA = getScore(a.name);
        const scoreB = getScore(b.name);
        if (scoreA !== scoreB) {
          return scoreA - scoreB; // Priority 1 (First Name startsWith) ranks first!
        }
      }

      let comparison = 0;

      if (sortColumn === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === "room") {
        comparison = parseInt(a.roomNumber) - parseInt(b.roomNumber);
      } else if (sortColumn === "rent") {
        comparison = a.rentAmount - b.rentAmount;
      } else if (sortColumn === "dueDate") {
        comparison = a.dueDay - b.dueDay;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    occupantsList,
    rawSearchTerm,
    activeFilterTab,
    tenantStatusFilter,
    paymentStatusFilter,
    paymentDueFilter,
    roomFilter,
    sortColumn,
    sortDirection,
  ]);

  // Handle Header Cell Click for Column Sorting
  const handleHeaderSort = (column: "name" | "dueDate" | "room" | "rent") => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Pagination slice
  const totalPages = Math.ceil(filteredOccupants.length / pageSize);
  const paginatedOccupants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOccupants.slice(start, start + pageSize);
  }, [filteredOccupants, currentPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedOccupants.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const counts = useMemo(() => {
    return {
      All: occupantsList.length,
      Booked: occupantsList.filter((o) => o.lifecycleStatus === "Booked").length,
      Active: occupantsList.filter((o) => o.lifecycleStatus === "Active").length,
      Notice: occupantsList.filter((o) => o.lifecycleStatus === "Notice").length,
      Past: occupantsList.filter((o) => o.lifecycleStatus === "Past").length,
      Guests: occupantsList.filter((o) => o.stayType === "Guest").length,
    };
  }, [occupantsList]);

  return (
    <div className="flex min-h-screen bg-[#fcf9f8] text-gray-900 font-sans selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* Responsive Left Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">
        {/* Top Header with Synchronized Search */}
        <PropertyHeader
          title="Tenant Operations"
          showSearch={true}
          propertyId={propertyId}
          searchValue={rawSearchTerm}
          onSearchChange={(val) => {
            setRawSearchTerm(val);
            setCurrentPage(1);
          }}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Directory Body */}
        <div className="p-4 md:p-8 space-y-6 flex-1 pb-28">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-gray-800">
                Tenant Operations
              </h1>
              <p className="text-gray-500 text-xs md:text-sm mt-1">
                Manage tenants across their lifecycle and track rent collection
              </p>
            </div>

            {/* Top Action Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* FastTrack Migration Button */}
              <button
                onClick={() => setShowFastTrackModal(true)}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white text-xs md:text-sm font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>FastTrack Import</span>
                <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-extrabold tracking-wider">
                  AI
                </span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="px-5 py-2.5 rounded-lg bg-[#c2652a] hover:bg-[#c2652a]/90 text-white text-sm font-semibold transition-all shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-5 h-5" /> Add Resident
                </button>

              {showAddMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl py-2 z-50 text-xs font-semibold text-gray-800 animate-in fade-in">
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      setShowFastTrackModal(true);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-purple-50 flex items-center gap-2 text-purple-700 font-bold border-b border-gray-100 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" /> ⚡ FastTrack 1-Click Import
                  </button>
                  <Link
                    href={`/p/${propertyId}/tenants/onboard-tenant`}
                    onClick={() => setShowAddMenu(false)}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 flex items-center gap-2 text-[#c2652a] block"
                  >
                    <UserPlus className="w-4 h-4 text-[#c2652a]" /> + New Tenant (Long-term)
                  </Link>
                  <Link
                    href={`/p/${propertyId}/tenants/onboard-guest`}
                    onClick={() => setShowAddMenu(false)}
                    className="w-full text-left px-4 py-2.5 hover:bg-purple-50 flex items-center gap-2 text-purple-700 block"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-700" /> + New Guest (Short-term)
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {/* Operational Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MagneticGlowCard glowColor="rgba(150, 68, 7, 0.15)" className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-orange-50 text-[#964407] p-2.5 h-10 w-10 flex items-center justify-center rounded-lg shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#964407] tracking-wider">
                  Active Members
                </p>
                <p className="text-xl font-bold font-sans text-gray-900">
                  <AnimatedNumberCounter value={counts.Active + counts.Guests} />
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  {counts.Active} Tenants • {counts.Guests} Guests
                </p>
              </div>
            </MagneticGlowCard>

            <MagneticGlowCard glowColor="rgba(16, 185, 129, 0.15)" className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-emerald-50 text-emerald-600 p-2.5 h-10 w-10 flex items-center justify-center rounded-lg shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                  Collected This Month
                </p>
                <p className="text-xl font-bold font-sans text-gray-900">
                  <AnimatedNumberCounter value={rentMetrics.sumCollected} prefix="₹" />
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  <AnimatedNumberCounter value={rentMetrics.collectionPct} suffix="%" decimals={1} /> of Total Expected
                </p>
              </div>
            </MagneticGlowCard>

            <MagneticGlowCard glowColor="rgba(245, 158, 11, 0.15)" className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-amber-50 text-amber-600 p-2.5 h-10 w-10 flex items-center justify-center rounded-lg shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
                  Rent Pending Due
                </p>
                <p className="text-xl font-bold font-sans text-gray-900">
                  <AnimatedNumberCounter value={rentMetrics.dueTodaySum + rentMetrics.dueTomorrowSum + rentMetrics.dueNext2DaysSum} prefix="₹" />
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  {rentMetrics.dueTodayCount + rentMetrics.dueTomorrowCount + rentMetrics.dueNext2DaysCount} Pending Bills
                </p>
              </div>
            </MagneticGlowCard>

            <MagneticGlowCard glowColor="rgba(220, 38, 38, 0.15)" className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-red-100 text-red-600 p-2.5 h-10 w-10 flex items-center justify-center rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
                  Overdue Rent
                </p>
                <p className="text-xl font-bold font-sans text-gray-900">
                  <AnimatedNumberCounter value={rentMetrics.overdueSum} prefix="₹" />
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  <AnimatedNumberCounter value={rentMetrics.overdueCount} /> Overdue Accounts
                </p>
              </div>
            </MagneticGlowCard>
          </div>

          {/* 🔍 Dedicated In-Page Search Bar (Full-Width on Mobile & Desktop) */}
          <div className="relative max-w-lg w-full pt-1">
            <input
              type="text"
              value={rawSearchTerm}
              onChange={(e) => {
                setRawSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search resident name, room, phone..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 focus:border-[#c2652a] rounded-2xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#c2652a]/20 shadow-xs transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-4" />
            {rawSearchTerm && (
              <button
                type="button"
                onClick={() => setRawSearchTerm("")}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 absolute right-2.5 top-3 cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Spring-Physics Gliding Status Filter Tabs (Positioned directly below KPI cards) */}
          <div className="overflow-x-auto pb-1 max-w-4xl pt-1">
            <GlidingTabs
              tabs={[
                { id: "All", label: "All", count: counts.All, badgeColor: "bg-gray-200 text-gray-700", activeTextColor: "text-gray-900 font-bold" },
                { id: "Booked", label: "Booked", count: counts.Booked, badgeColor: "bg-blue-100 text-blue-700", activeTextColor: "text-blue-700 font-bold" },
                { id: "Active", label: "Active", count: counts.Active, badgeColor: "bg-green-600 text-white font-bold", activeTextColor: "text-green-700 font-bold" },
                { id: "Notice", label: "Notice", count: counts.Notice, badgeColor: "bg-orange-100 text-orange-700", activeTextColor: "text-orange-700 font-bold" },
                { id: "Past", label: "Past", count: counts.Past, badgeColor: "bg-gray-200 text-gray-700", activeTextColor: "text-gray-800 font-bold" },
                { id: "Guests", label: "Guests", count: counts.Guests, badgeColor: "bg-purple-100 text-purple-700", activeTextColor: "text-purple-700 font-bold" },
              ]}
              activeTab={activeFilterTab}
              onChange={(newTab) => {
                setActiveFilterTab(newTab);
                if (newTab !== "Guests") {
                  setTenantStatusFilter(newTab);
                }
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Active Search Query Tag (Only shows when user types in top search bar) */}
          {rawSearchTerm && (
            <div className="flex items-center gap-2 pt-1">
              <div className="bg-orange-50 text-[#c2652a] px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-orange-200 font-bold">
                Search: "{rawSearchTerm}"
                <X
                  className="w-3.5 h-3.5 cursor-pointer hover:text-red-500"
                  onClick={() => setRawSearchTerm("")}
                />
              </div>
              <button
                type="button"
                onClick={() => setRawSearchTerm("")}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium underline"
              >
                Clear Search
              </button>
            </div>
          )}

                     {/* Desktop Data Table (Continuous Scroll View - No Page Splitting) */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs max-h-[75vh] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredOccupants.length > 0 &&
                        filteredOccupants.every((o) => selectedIds.includes(o.id))
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-[#c2652a] focus:ring-[#c2652a]"
                    />
                  </th>
                  <th
                    onClick={() => handleHeaderSort("name")}
                    className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#c2652a] select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tenant</span>
                      {sortColumn === "name" && (
                        <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleHeaderSort("room")}
                    className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#c2652a] select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Room & Bed</span>
                      {sortColumn === "room" && (
                        <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Last Paid Date
                  </th>
                  <th
                    onClick={() => handleHeaderSort("dueDate")}
                    className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#c2652a] select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Payment Due</span>
                      {sortColumn === "dueDate" && (
                        <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Rent Status
                  </th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredOccupants.length > 0 ? (
                  filteredOccupants.map((occ) => {
                    const isSelected = selectedIds.includes(occ.id);
                    const isPastTenant = occ.lifecycleStatus === "Past";

                    return (
                      <tr
                        key={occ.id}
                        className={`hover:bg-orange-50/40 transition-colors animate-stagger-up ${
                          isSelected ? "bg-orange-50/60" : ""
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(occ.id)}
                            className="rounded border-gray-300 text-[#c2652a] focus:ring-[#c2652a]"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden border border-gray-200">
                              {occ.avatar && occ.avatar.length > 0 && !occ.avatar.includes("dicebear") ? (
                                <img
                                  src={occ.avatar}
                                  alt={occ.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <Link
                                href={`/p/${propertyId}/tenants/${occ.id}`}
                                className="font-bold text-gray-900 hover:text-[#c2652a] block text-xs flex items-center gap-1.5"
                              >
                                {occ.name}
                                {occ.stayType === "Guest" && (
                                  <span className="bg-purple-100 text-purple-700 px-1.5 py-0.2 text-[9px] font-extrabold rounded-full uppercase">
                                    Guest
                                  </span>
                                )}
                              </Link>
                              {occ.stayType === "Guest" && (occ.purposeOfVisit || occ.workplace) ? (
                                <span className="text-[10px] text-purple-700 font-semibold block truncate max-w-[180px]" title={occ.purposeOfVisit || occ.workplace}>
                                  🎯 {occ.purposeOfVisit || occ.workplace}
                                </span>
                              ) : (occ.occupation || occ.workplace) ? (
                                <span className="text-[10px] text-gray-600 font-medium block truncate max-w-[180px]" title={`${occ.occupation || ""} ${occ.workplace ? `@ ${occ.workplace}` : ""}`}>
                                  {occ.occupation ? `${occ.occupation}${occ.workplace ? ` @ ${occ.workplace}` : ""}` : `🏢 ${occ.workplace}`}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-500 font-mono block">
                                  📞 {occ.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-gray-800">
                          {isPastTenant ? (
                            <span className="text-gray-400 italic font-normal">— (Vacated)</span>
                          ) : (
                            <>
                              <span className="block font-bold text-gray-900">Room {occ.roomNumber} ({occ.bedCode})</span>
                              <span className="text-[10px] text-gray-400 block font-normal">
                                {propertySettingsStore.getSettings(propertyId)?.propertyName || (propertyId === "sunshine-pg" ? "Sunshine Heights PG" : "My Property")}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="p-4 font-mono text-gray-600 text-[11px]">
                          {occ.lastPaidDate}
                        </td>
                        <td className="p-4 font-mono font-bold text-[#c2652a] text-[11px]">
                          {occ.dueDate}
                        </td>
                        <td className="p-4">
                          {(() => {
                            const stmt = calculateOccupantFinancialStatement(occ, currentSettings);
                            return (
                              <span
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                                  stmt.isFullyPaid
                                    ? "bg-green-100 text-green-700"
                                    : stmt.isPartialPaid
                                    ? "bg-orange-100 text-orange-800 border border-orange-200"
                                    : occ.paymentStatus === "Overdue"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-orange-100 text-orange-600"
                                }`}
                              >
                                {stmt.isFullyPaid
                                  ? "Paid"
                                  : stmt.isPartialPaid
                                  ? `Partial (₹${stmt.netOutstandingBalance.toLocaleString("en-IN")})`
                                  : occ.paymentStatus}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`https://wa.me/91${occ.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${occ.name}, rent reminder for Room ${occ.roomNumber}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                              title="Send WhatsApp Message"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                            <a
                              href={`tel:${occ.phone}`}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              title="Call Tenant"
                            >
                              <Phone className="w-4 h-4" />
                            </a>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveActionDropdownId(
                                    activeActionDropdownId === occ.id ? null : occ.id
                                  )
                                }
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeActionDropdownId === occ.id && (
                                <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl border border-gray-200 shadow-xl py-1 text-xs font-semibold animate-in fade-in">
                                  <Link
                                    href={`/p/${propertyId}/tenants/${occ.id}`}
                                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-orange-50 text-gray-700"
                                  >
                                    <User className="w-3.5 h-3.5 text-gray-500" /> Profile & Documents
                                  </Link>
                                  <button
                                    onClick={() => {
                                      setActiveActionDropdownId(null);
                                      setCollectRentOccupant(occ);
                                      setPaymentAmount(occ.rentAmount);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-orange-50 text-gray-700"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Collect Rent
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveActionDropdownId(null);
                                      triggerToast(`Initiated Room Transfer for ${occ.name}`);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-orange-50 text-gray-700"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-gray-500" /> Transfer Room
                                  </button>

                                  {occ.lifecycleStatus === "Past" && (
                                    <button
                                      onClick={() => {
                                        setActiveActionDropdownId(null);
                                        setDeletePastTenantTarget(occ);
                                      }}
                                      className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-rose-50 text-rose-600 border-t border-gray-100"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                      <span>{occ.stayType === "Guest" ? "Delete Guest" : "Delete Past Tenant"}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-gray-500">
                      No matching occupants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Continuous Scroll Total Footer */}
            <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs font-semibold text-gray-600">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#c2652a]" /> Showing All {filteredOccupants.length} Occupants (Continuous Scroll View)
              </span>
              <span className="text-[11px] text-gray-400 font-normal">
Scroll vertically to browse all residents without pagination limits
              </span>
            </div>
          </div>

          {/* Mobile Card List View (Samsung One UI 1.0s Long-Press Multi-Select Pattern) */}
          <div className="md:hidden space-y-4">
            {/* 📱 Samsung One UI Style Top Header Bar in Selection Mode */}
            {isMobileMultiSelectMode || selectedIds.length > 0 ? (
              <div className="bg-slate-900 text-white rounded-2xl p-3 px-4 shadow-xl flex items-center justify-between animate-in slide-in-from-top-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = filteredOccupants.map((o) => o.id);
                      const areAllSelected = allIds.every((id) => selectedIds.includes(id));
                      if (areAllSelected) {
                        setSelectedIds([]);
                      } else {
                        setSelectedIds(allIds);
                        setIsMobileMultiSelectMode(true);
                      }
                    }}
                    className="flex items-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 active:scale-95 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-slate-700"
                  >
                    <span className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold">
                      {filteredOccupants.length > 0 && filteredOccupants.every((o) => selectedIds.includes(o.id)) ? "✓" : ""}
                    </span>
                    <span>Select All</span>
                  </button>

                  <span className="text-xs font-extrabold bg-[#c2652a] px-3 py-1 rounded-full text-white shadow-xs">
                    {selectedIds.length} Selected
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMultiSelectMode(false);
                    setSelectedIds([]);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200 text-orange-950 text-[11px] font-medium flex items-center justify-between">
                <span>💡 <strong>Tip:</strong> Press & hold any card (0.5s) 📳 to select multiple tenants.</span>
              </div>
            )}

            {paginatedOccupants.length > 0 ? (
              paginatedOccupants.map((occ) => {
                const isSelected = selectedIds.includes(occ.id);
                const isPastTenant = occ.lifecycleStatus === "Past" || activeFilterTab === "Past";
                const isActionMenuOpen = activeActionDropdownId === occ.id;

                const startTouchTimer = (e: React.TouchEvent | React.MouseEvent) => {
                  if (isMobileMultiSelectMode) return;
                  const timer = setTimeout(() => {
                    setIsMobileMultiSelectMode(true);
                    handleSelectOne(occ.id);
                    if (typeof window !== "undefined" && navigator.vibrate) {
                      try {
                        navigator.vibrate(60);
                      } catch {}
                    }
                  }, 450); // 450ms standard native mobile long-press threshold
                  setLongPressTimer(timer);
                };

                const clearTouchTimer = () => {
                  if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    setLongPressTimer(null);
                  }
                };

                return (
                  <div
                    key={occ.id}
                    onTouchStart={startTouchTimer}
                    onTouchEnd={clearTouchTimer}
                    onTouchMove={clearTouchTimer}
                    onMouseDown={startTouchTimer}
                    onMouseUp={clearTouchTimer}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => {
                      if (isMobileMultiSelectMode) {
                        e.preventDefault();
                        handleSelectOne(occ.id);
                      }
                    }}
                    style={{
                      WebkitTouchCallout: "none",
                      WebkitUserSelect: "none",
                      userSelect: "none",
                    }}
                    className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3 transition-all relative select-none touch-manipulation cursor-pointer ${
                      isSelected ? "border-[#c2652a] bg-orange-50/40 ring-1 ring-[#c2652a]" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden">
                            {occ.avatar && occ.avatar.length > 0 && !occ.avatar.includes("dicebear") ? (
                              <img
                                src={occ.avatar}
                                alt={occ.name}
                                className="w-full h-full object-cover pointer-events-none"
                                draggable={false}
                              />
                            ) : (
                              <User className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#c2652a] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md animate-in zoom-in-50">
                              ✓
                            </div>
                          )}
                        </div>

                        <Link
                          href={isMobileMultiSelectMode ? "#" : `/p/${propertyId}/tenants/${occ.id}`}
                          onContextMenu={(e) => e.preventDefault()}
                          draggable={false}
                          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
                          onClick={(e) => {
                            if (isMobileMultiSelectMode) {
                              e.preventDefault();
                              handleSelectOne(occ.id);
                            }
                          }}
                          className="flex-1 min-w-0 select-none"
                        >
                          <h3 className="font-bold text-sm text-gray-900 hover:text-[#c2652a] transition-colors flex items-center gap-2 truncate select-none">
                            {occ.name}
                            {occ.stayType === "Guest" && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                                🟣 GUEST
                              </span>
                            )}
                          </h3>
                          {occ.stayType === "Guest" && (occ.purposeOfVisit || occ.workplace) ? (
                            <p className="text-[11px] text-purple-700 font-semibold truncate select-none">
                              🎯 {occ.purposeOfVisit || occ.workplace}
                            </p>
                          ) : (occ.occupation || occ.workplace) ? (
                            <p className="text-[11px] text-gray-600 font-medium truncate select-none">
                              {occ.occupation ? `${occ.occupation}${occ.workplace ? ` @ ${occ.workplace}` : ""}` : `🏢 ${occ.workplace}`}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 font-mono truncate select-none">{occ.phone}</p>
                          )}
                        </Link>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase select-none ${
                            occ.paymentStatus === "Paid"
                              ? "bg-green-100 text-green-700"
                              : occ.paymentStatus === "Overdue"
                              ? "bg-red-100 text-red-600"
                              : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          {occ.paymentStatus}
                        </span>

                        {/* Mobile Three-Dots Action Button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionDropdownId(isActionMenuOpen ? null : occ.id);
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Mobile Action Dropdown Popup */}
                          {isActionMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-30 animate-in fade-in zoom-in-95 text-xs space-y-1 font-semibold"
                            >
                              <Link
                                href={`/p/${propertyId}/tenants/${occ.id}`}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-orange-50 hover:text-[#c2652a] transition-all"
                              >
                                <Eye className="w-4 h-4 text-gray-400" /> View Details & KYC
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionDropdownId(null);
                                  setCollectRentOccupant(occ);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-700 hover:bg-emerald-50 transition-all text-left cursor-pointer"
                              >
                                <CreditCard className="w-4 h-4 text-emerald-600" /> Collect / Record Rent
                              </button>
                              <Link
                                href={`/p/${propertyId}/property-map`}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-orange-50 hover:text-[#c2652a] transition-all"
                              >
                                <ArrowRightLeft className="w-4 h-4 text-gray-400" /> Swap / Transfer Room
                              </Link>
                              {occ.lifecycleStatus === "Active" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionDropdownId(null);
                                    setCheckOutModalOccupant(occ);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 transition-all text-left cursor-pointer font-bold border-t border-gray-100"
                                >
                                  <FileText className="w-4 h-4 text-rose-600" /> Check-Out & Settle
                                </button>
                              )}
                              {isPastTenant && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionDropdownId(null);
                                    setDeletePastTenantTarget(occ);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-all text-left cursor-pointer font-bold border-t border-gray-100"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" /> Delete Past Tenant 🗑️
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-gray-100 py-2.5 my-1">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                          Room & Bed Allocation
                        </span>
                        <span className="font-bold text-gray-900">
                          Room {occ.roomNumber} ({occ.bedCode})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                          Payment Due
                        </span>
                        <span className={`font-bold ${occ.paymentStatus === "Paid" ? "text-emerald-700" : "text-[#c2652a]"}`}>
                          {resolveOccupantPaymentDueDate(occ)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/p/${propertyId}/tenants/${occ.id}`}
                        className="flex-1 py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <User className="w-3.5 h-3.5 text-gray-400" /> View Profile
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollectRentOccupant(occ);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Collect Rent
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-600">No matching tenants found</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Try adjusting your search query or status filter.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Unified Floating Bulk Action Bar (Responsive Mobile & Desktop) */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 bg-slate-900 text-white border border-slate-800 shadow-2xl rounded-2xl p-3 sm:px-5 sm:py-3.5 flex items-center justify-between sm:justify-start gap-3 sm:gap-5 animate-in slide-in-from-bottom-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-7 h-7 rounded-xl bg-[#c2652a] text-white font-bold flex items-center justify-center text-xs font-mono shadow-xs">
                {selectedIds.length}
              </span>
              <div className="hidden sm:block">
                <span className="font-bold text-white block">Tenants Selected</span>
                <span className="text-[10px] text-slate-400">
                  Batch Rent Reminders & Payment QR
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRentReminderQRModal(true)}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Reminders & QR ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => triggerToast(`Calling ${selectedIds.length} selected tenants`)}
                className="hidden md:flex px-3.5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold items-center gap-1.5 transition-all"
              >
                <Phone className="w-4 h-4" /> Call Selected
              </button>

              <button
                type="button"
                onClick={() => triggerToast(`Exported CSV for ${selectedIds.length} tenants`)}
                className="hidden md:flex px-3.5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" /> Export
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  setIsMobileMultiSelectMode(false);
                }}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Cancel selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Collect Rent Interactive Modal */}
        {collectRentOccupant && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
              {/* 📌 Sticky Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 shrink-0 bg-white">
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 flex items-center gap-1.5">
                    <span>💰 Collect Payment</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {collectRentOccupant.name} • Room {collectRentOccupant.roomNumber} ({collectRentOccupant.bedCode})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCollectRentOccupant(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 📜 Scrollable Body */}
              <form
                id="directory-collect-rent-form"
                onSubmit={handleCollectRentSubmit}
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs overscroll-contain"
              >
                {/* 🏷️ 1-Tap Payment Purpose / Allocation Category */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Payment Category *
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentPurpose("RENT")}
                      className={`py-1.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                        paymentPurpose === "RENT"
                          ? "bg-[#c2652a] text-white border-[#c2652a] shadow-xs"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      <span>🏠 Rent Only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPurpose("DEPOSIT")}
                      className={`py-1.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                        paymentPurpose === "DEPOSIT"
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      <span>🔒 Deposit Only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPurpose("COMBINED")}
                      className={`py-1.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                        paymentPurpose === "COMBINED"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      <span>⚡ Combined</span>
                    </button>
                  </div>
                </div>

                {/* 📅 Date & Payment Mode in 2-Column Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    >
                      <option value="UPI">UPI (Google Pay / PhonePe)</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT)</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                {/* 💵 Dynamic Amount Inputs Based on Selected Category */}
                {paymentPurpose === "RENT" && (
                  <div className="animate-in fade-in space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-gray-700">
                        Rent Amount Collected (₹) *
                      </label>
                      {(() => {
                        const stmt = calculateOccupantFinancialStatement(collectRentOccupant, currentSettings);
                        return (
                          <span className="text-[10px] text-gray-500 font-medium">
                            Due: ₹{stmt.remainingRentDue.toLocaleString("en-IN")}
                          </span>
                        );
                      })()}
                    </div>
                    <input
                      type="number"
                      required
                      value={rentPaymentPortion ? rentPaymentPortion : ""}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setRentPaymentPortion(val === "" ? 0 : parseInt(val, 10));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
                )}

                {paymentPurpose === "DEPOSIT" && (
                  <div className="animate-in fade-in space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-purple-900">
                        Security Deposit Amount Collected (₹) *
                      </label>
                      {(() => {
                        const stmt = calculateOccupantFinancialStatement(collectRentOccupant, currentSettings);
                        return (
                          <span className="text-[10px] text-purple-700 font-bold">
                            Pending: ₹{stmt.remainingDepositDue.toLocaleString("en-IN")}
                          </span>
                        );
                      })()}
                    </div>
                    <input
                      type="number"
                      required
                      value={depositPaymentPortion ? depositPaymentPortion : ""}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setDepositPaymentPortion(val === "" ? 0 : parseInt(val, 10));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 text-sm font-mono font-bold text-purple-950 focus:ring-1 focus:ring-purple-600 bg-purple-50/20"
                    />
                  </div>
                )}

                {paymentPurpose === "COMBINED" && (
                  <div className="animate-in fade-in space-y-2 p-3 bg-gradient-to-br from-gray-50 to-emerald-50/20 border border-gray-200 rounded-2xl">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-gray-700">
                          1. Rent Portion (₹)
                        </label>
                        {(() => {
                          const stmt = calculateOccupantFinancialStatement(collectRentOccupant, currentSettings);
                          return (
                            <span className="text-[10px] text-gray-500">
                              Due: ₹{stmt.remainingRentDue.toLocaleString("en-IN")}
                            </span>
                          );
                        })()}
                      </div>
                      <input
                        type="number"
                        value={rentPaymentPortion ? rentPaymentPortion : ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setRentPaymentPortion(val === "" ? 0 : parseInt(val, 10));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-mono font-bold text-gray-900 bg-white focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-purple-900">
                          2. Security Deposit Portion (₹)
                        </label>
                        {(() => {
                          const stmt = calculateOccupantFinancialStatement(collectRentOccupant, currentSettings);
                          return (
                            <span className="text-[10px] text-purple-700 font-bold">
                              Pending: ₹{stmt.remainingDepositDue.toLocaleString("en-IN")}
                            </span>
                          );
                        })()}
                      </div>
                      <input
                        type="number"
                        value={depositPaymentPortion ? depositPaymentPortion : ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setDepositPaymentPortion(val === "" ? 0 : parseInt(val, 10));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-purple-300 text-sm font-mono font-bold text-purple-950 bg-white focus:ring-1 focus:ring-purple-600"
                      />
                    </div>

                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between font-bold text-gray-900">
                      <span>Total Combined:</span>
                      <span className="font-mono text-sm text-emerald-700 font-extrabold">
                        ₹{((rentPaymentPortion || 0) + (depositPaymentPortion || 0)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Optional Transaction ID for UPI or Bank Transfer */}
                {(paymentMode === "UPI" || paymentMode === "Bank Transfer") && (
                  <div className="animate-in fade-in">
                    <label className="block font-bold text-gray-700 mb-1">
                      Transaction / Ref Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. UPI/42819201928 or Ref-99120"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
                )}

                {/* 💰 COMPACT RECEIVABLE SUMMARY & AUTO-FILL BUTTONS */}
                {(() => {
                  const stmt = calculateOccupantFinancialStatement(collectRentOccupant, currentSettings);
                  const isTenant = collectRentOccupant.stayType === "Tenant";
                  const proRataInfo = calculateProRataRent(collectRentOccupant.rentAmount, collectRentOccupant.joiningDate);
                  const targetAutoFill = stmt.netOutstandingBalance;

                  return (
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between font-extrabold text-xs">
                        <span className="text-amber-950 flex items-center gap-1">
                          💰 Total Outstanding Dues:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#c2652a] text-sm">
                            ₹{stmt.netOutstandingBalance.toLocaleString("en-IN")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowLedgerBreakdownDetail(!showLedgerBreakdownDetail)}
                            className="text-[10px] text-amber-800 underline font-normal cursor-pointer"
                          >
                            {showLedgerBreakdownDetail ? "Hide Details ▴" : "Details ▾"}
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Details */}
                      {showLedgerBreakdownDetail && (
                        <div className="pt-2 border-t border-amber-200/80 space-y-1.5 text-[11px] text-gray-700 font-medium animate-in fade-in">
                          {isTenant ? (
                            <>
                              <div className="flex justify-between items-center">
                                <span>▫️ Rent ({proRataInfo.isFullMonth ? "Full Month" : `${proRataInfo.remainingDays}d Pro-Rata`}):</span>
                                <span className="font-mono font-bold">₹{stmt.proRataRent.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>▫️ Security Deposit:</span>
                                <span className="font-mono font-bold">₹{stmt.securityDepositRequired.toLocaleString("en-IN")}</span>
                              </div>
                              {stmt.priorArrears > 0 && (
                                <div className="flex justify-between items-center text-red-700">
                                  <span>▫️ Prior Arrears:</span>
                                  <span className="font-mono font-bold">₹{stmt.priorArrears.toLocaleString("en-IN")}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span>▫️ Stay Package:</span>
                              <span className="font-mono font-bold">₹{(stmt.proRataRent + stmt.securityDepositRequired).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                        </div>
                      )}

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (paymentPurpose === "RENT") {
                                setRentPaymentPortion(stmt.remainingRentDue > 0 ? stmt.remainingRentDue : collectRentOccupant.rentAmount);
                              } else if (paymentPurpose === "DEPOSIT") {
                                setDepositPaymentPortion(stmt.remainingDepositDue);
                              } else {
                                setRentPaymentPortion(stmt.remainingRentDue);
                                setDepositPaymentPortion(stmt.remainingDepositDue);
                              }
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-98"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              ⚡ Auto-Fill Pending Dues ({paymentPurpose === "RENT" ? `₹${(stmt.remainingRentDue > 0 ? stmt.remainingRentDue : collectRentOccupant.rentAmount).toLocaleString("en-IN")}` : paymentPurpose === "DEPOSIT" ? `₹${stmt.remainingDepositDue.toLocaleString("en-IN")}` : `₹${stmt.netOutstandingBalance.toLocaleString("en-IN")}`})
                            </span>
                          </button>
                        </div>
                    </div>
                  );
                })()}
              </form>

              {/* 📌 Sticky Action Footer */}
              <div className="p-3 sm:p-4 border-t border-gray-100 flex items-center justify-end gap-2.5 bg-gray-50/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setCollectRentOccupant(null)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="directory-collect-rent-form"
                  className="px-4 sm:px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <span>Confirm & Record</span>
                  <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                    ₹{(
                      paymentPurpose === "RENT"
                        ? (rentPaymentPortion || 0)
                        : paymentPurpose === "DEPOSIT"
                        ? (depositPaymentPortion || 0)
                        : (rentPaymentPortion || 0) + (depositPaymentPortion || 0)
                    ).toLocaleString("en-IN")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETE CHECK-IN CONFIRMATION POPUP */}
        {showCompleteCheckInPopup && checkInModalOccupant && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Confirm Tenant Check-In
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      MOVE STATUS: BOOKED 🔵 → ACTIVE 🟢
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCompleteCheckInPopup(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <p className="font-bold text-sm text-emerald-950">
                  {checkInModalOccupant.name}
                </p>
                <p className="text-[11px] text-emerald-800">
                  Allocated Room: <strong>Room {checkInModalOccupant.roomNumber} ({checkInModalOccupant.bedCode})</strong>
                </p>
                <p className="text-[11px] text-emerald-800">
                  Move-In Date will be set to today (<strong>{new Date().toLocaleDateString("en-GB")}</strong>). The occupant will immediately transition to the <strong>Active Tenants</strong> tab.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCompleteCheckInPopup(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCompleteCheckIn}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md"
                >
                  Confirm Check-In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POSTPONE CHECK-IN DATEPICKER MODAL */}
        {showPostponeModal && checkInModalOccupant && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Postpone Move-In Date
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      TENANT: {checkInModalOccupant.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPostponeModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePostponeSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    New Postponed Move-in Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={postponedDate}
                    onChange={(e) => setPostponedDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-blue-700"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    The profile will remain in the Booked section until the tenant completes check-in.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowPostponeModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-md"
                  >
                    Confirm & Update Date
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RENT REMINDER PAYMENT QR CODE & WHATSAPP BROADCAST MODAL */}
        {showRentReminderQRModal && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setShowRentReminderQRModal(false)}
          >
            <div
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 text-xs max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Send Rent Reminders & Payment QR
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      {selectedIds.length} Tenant{selectedIds.length > 1 ? "s" : ""} Selected for Batch WhatsApp Notification
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppWalletModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-full font-bold text-[11px] cursor-pointer shadow-2xs transition-all"
                    title="Click to recharge credits or view delivery history"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{whatsappCredits} Credits</span>
                    <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-200/70 px-1.5 py-0.2 rounded-md">+ Add</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRentReminderQRModal(false)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Step 1: Horizontal Carousel Slider for Pre-Configured QR Profiles */}
              <div className="space-y-3 p-4 bg-orange-50/40 rounded-2xl border border-orange-200/60">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#c2652a]" />
                    <span>1. Select Pre-Configured Payment QR Profile</span>
                  </h4>

                  {(currentSettings.qrProfiles || DEFAULT_QR_PROFILES).length > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveQrIndex((prev) =>
                            prev > 0 ? prev - 1 : (currentSettings.qrProfiles || DEFAULT_QR_PROFILES).length - 1
                          )
                        }
                        className="p-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 cursor-pointer shadow-2xs"
                        title="Previous QR Profile"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-bold text-gray-600 px-1 font-mono">
                        {activeQrIndex + 1} / {(currentSettings.qrProfiles || DEFAULT_QR_PROFILES).length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveQrIndex((prev) =>
                            prev < (currentSettings.qrProfiles || DEFAULT_QR_PROFILES).length - 1 ? prev + 1 : 0
                          )
                        }
                        className="p-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 cursor-pointer shadow-2xs"
                        title="Next QR Profile"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Active QR Profile Display Card or Empty State */}
                {(() => {
                  const profiles = currentSettings.qrProfiles && currentSettings.qrProfiles.length > 0 ? currentSettings.qrProfiles : DEFAULT_QR_PROFILES;
                  
                  if (profiles.length === 0) {
                    return (
                      <div className="p-5 bg-white rounded-2xl border border-gray-200 text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#c2652a] flex items-center justify-center mx-auto">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-gray-900">No Payment QR Profiles Configured</h5>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Add your real business bank accounts or UPI QR profiles in Settings to send custom QR payment reminders.
                          </p>
                        </div>
                        <Link
                          href={`/p/${propertyId}/settings`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c2652a] text-white font-bold text-xs shadow-2xs hover:bg-[#c2652a]/90"
                        >
                          <span>Configure QR Profiles in Settings</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    );
                  }

                  const activeQr = profiles[activeQrIndex] || profiles[0];

                  return (
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-28 h-28 bg-white p-2 rounded-xl border border-gray-200 shadow-2xs shrink-0 flex flex-col items-center justify-center overflow-hidden">
                        {activeQr.qrImageUrl ? (
                          <img src={activeQr.qrImageUrl} alt={activeQr.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <QRCodeSVG
                            value={activeQr.upiId === "CASH_PAYMENT" ? "CASH_PAYMENT" : `upi://pay?pa=${activeQr.upiId}&pn=TenoPilot%20PG&cu=INR`}
                            size={96}
                            fgColor="#201a17"
                            bgColor="#ffffff"
                          />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className="font-bold text-sm text-gray-900">{activeQr.name}</span>
                          {activeQr.isDefault && (
                            <span className="bg-orange-100 text-[#c2652a] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 block">🏦 Bank: <strong>{activeQr.bankLabel}</strong></span>
                        <span className="text-xs font-mono text-[#c2652a] font-bold block bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/50 inline-block">
                          💳 UPI VPA: {activeQr.upiId}
                        </span>

                        <p className="text-[10px] text-gray-400">
                          Pre-configured via Settings → Payment QR Profiles & Accounts
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Step 2: Selected Tenants Summary & Send Action */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-xs">
                    2. Selected Tenants ({selectedIds.length}) & Instant Dispatch:
                  </h4>
                  <span className="text-[10px] text-gray-500 font-medium">
                    Auto-sends verified WhatsApp text with UPI payment details
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(() => {
                    const profiles = currentSettings.qrProfiles && currentSettings.qrProfiles.length > 0 ? currentSettings.qrProfiles : DEFAULT_QR_PROFILES;
                    const activeQr = profiles[activeQrIndex] || profiles[0];

                    return occupantsList
                      .filter((o) => selectedIds.includes(o.id))
                      .map((occ) => {
                        const cleanPhone = occ.phone.replace(/\D/g, "");
                        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                        const isCashReq = activeQr?.upiId === "CASH_PAYMENT" || activeQr?.accountType === "CASH_DESK";
                        const paymentNote = activeQr
                          ? (isCashReq
                            ? `💵 *Payment Mode*: Cash Request at ${activeQr.bankLabel}\nPlease visit reception desk to clear rent.`
                            : `💳 *Pay via UPI ID*: ${activeQr.upiId} (${activeQr.bankLabel})\nPlease scan QR code or pay via UPI.`)
                          : `💳 *Payment Details*: Please contact management for rent payment instructions.`;

                        const msg = encodeURIComponent(
                          `Hello ${occ.name},\n\nFriendly rent payment reminder for ${currentSettings.propertyName || "TenoPilot.com"}:\n🏠 *Room Location*: ${occ.roomNumber} (${occ.bedCode})\n💰 *Rent Amount Due*: ₹${occ.rentAmount.toLocaleString("en-IN")}\n📅 *Due Date*: ${occ.dueDate}\n\n${paymentNote}\n\nThank you,\n${currentSettings.propertyName || "TenoPilot.com"} Management`
                        );
                        const waUrl = `https://wa.me/${formattedPhone}?text=${msg}`;

                        return (
                          <div
                            key={occ.id}
                            className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-gray-900 block">{occ.name}</span>
                              <span className="text-[10px] text-gray-500 block">
                                Room {occ.roomNumber} ({occ.bedCode}) • Rent: ₹{occ.rentAmount.toLocaleString("en-IN")} • Due: {occ.dueDate}
                              </span>
                            </div>

                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-[10px] flex items-center gap-1 shadow-2xs"
                              title="Manual wa.me fallback"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span>Manual wa.me</span>
                            </a>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>

              {/* Bottom Action Footer with 1-Tap Cloud Dispatch */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRentReminderQRModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={isSendingCloudWhatsApp || selectedIds.length === 0}
                  onClick={handleSendCloudWhatsAppReminders}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingCloudWhatsApp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        Dispatching {cloudSendProgress?.sent || 0}/{cloudSendProgress?.total || selectedIds.length} Cloud Reminders...
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current text-yellow-300" />
                      <span>1-Tap Cloud Dispatch (Auto-Send to All {selectedIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE PAST TENANT CONFIRMATION MODAL */}
        {deletePastTenantTarget && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setDeletePastTenantTarget(null)}
          >
            <div
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    {deletePastTenantTarget.stayType === "Guest" ? "Delete Guest Record?" : "Delete Past Tenant Record?"}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Permanent Record Erasure Warning
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-gray-700 text-xs leading-relaxed">
                  Are you sure you want to permanently delete past {deletePastTenantTarget.stayType === "Guest" ? "guest" : "tenant"}{" "}
                  <strong>{deletePastTenantTarget.name}</strong> (Room {deletePastTenantTarget.roomNumber})?
                </p>

                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5 text-[11px]">
                  <span className="font-bold flex items-center gap-1 text-rose-700">
                    ⚠️ Irreversible Deletion Warning:
                  </span>
                  <p className="text-rose-800 leading-snug">
                    Confirming deletion will permanently wipe out the entire history of this {deletePastTenantTarget.stayType === "Guest" ? "guest" : "tenant"} from Cloud Firestore and local storage — including KYC verification documents, uploaded photo IDs, payment receipts, emergency contact details, and stay history.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletePastTenantTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const target = deletePastTenantTarget;
                    setDeletePastTenantTarget(null);

                    // Delete permanently from Cloud Firestore & update local store
                    await occupantStore.deleteOccupant(target.id, propertyId);

                    triggerToast(`🗑️ Permanently erased record, KYC, and documents for ${target.name}`);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deletePastTenantTarget.stayType === "Guest" ? "Delete Guest 🗑️" : "Permanently Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔑 Formal Check-Out & Settlement Modal */}
        {checkOutModalOccupant && (
          <CheckOutSettlementModal
            occupant={checkOutModalOccupant}
            roomNumber={checkOutModalOccupant.roomNumber}
            bedCode={checkOutModalOccupant.bedCode}
            propertyId={propertyId}
            isOpen={!!checkOutModalOccupant}
            onClose={() => setCheckOutModalOccupant(null)}
            onSuccess={() => {
              triggerToast(`🎉 Completed formal check-out & deposit settlement for ${checkOutModalOccupant.name}! Bed ${checkOutModalOccupant.roomNumber} (${checkOutModalOccupant.bedCode}) is now Available 🟢`);
            }}
          />
        )}

        {/* ⚡ FastTrack 1-Click Migration Modal */}
        <FastTrackImportModal
          propertyId={propertyId}
          isOpen={showFastTrackModal}
          onClose={() => setShowFastTrackModal(false)}
          onSuccess={() => {
            triggerToast("🎉 FastTrack Ingestion Complete! Building and tenants are now live.");
          }}
        />

        {/* 💬 WhatsApp Cloud Gateway & Credit Wallet Modal */}
        <WhatsAppWalletModal
          propertyId={propertyId}
          isOpen={showWhatsAppWalletModal}
          onClose={() => setShowWhatsAppWalletModal(false)}
          onRechargeSuccess={(newCredits) => {
            setWhatsappCredits(newCredits);
            triggerToast(`🎉 Recharged! Available WhatsApp Credits: ${newCredits}`);
          }}
        />
      </div>
    </div>
  );
}
