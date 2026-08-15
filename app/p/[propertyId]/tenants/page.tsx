"use client";

export const dynamic = "force-dynamic";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, occupantStore, Occupant } from "@/constants/mockOccupants";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { runAutoCheckInEngine } from "@/utils/autoCheckInEngine";
import { propertySettingsStore, DEFAULT_QR_PROFILES } from "@/constants/propertySettings";
import { subscribeOccupantsFromFirestore, deleteOccupantFromFirestore, purgeAllMockOccupantsFromFirestore, isGenuineOccupantId } from "@/lib/firestoreService";
import { sanitizeSearchInput, normalizePhoneNumber } from "@/utils/security";
import { calculateOccupantFinancialStatement } from "@/utils/domainSSOT";
import { CheckOutSettlementModal } from "@/components/dashboard/CheckOutSettlementModal";
import { QRCodeSVG } from "qrcode.react";
import { AnimatedNumberCounter } from "@/components/motion/AnimatedNumberCounter";
import { GlidingTabs, TabOption } from "@/components/motion/GlidingTabs";
import { MagneticGlowCard } from "@/components/motion/MagneticGlowCard";
import { StaggerItem } from "@/components/motion/StaggerContainer";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";
import { FastTrackImportModal } from "@/components/dashboard/FastTrackImportModal";
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
} from "lucide-react";

export default function TenantsDirectoryPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

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
    "name" | "dueDate" | "daysRemaining" | "room" | "rent"
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
  const [paymentAmount, setPaymentAmount] = useState<number>(14500);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Rent Reminder QR Code & WhatsApp Broadcast Modal State
  const [showRentReminderQRModal, setShowRentReminderQRModal] = useState(false);
  const [activeQrIndex, setActiveQrIndex] = useState<number>(0);
  const [selectedQrType, setSelectedQrType] = useState<"phonepe" | "gpay" | "hdfc" | "custom">("phonepe");
  const [customUpiId, setCustomUpiId] = useState<string>("tenopilot@ybl");
  const [uploadedQrName, setUploadedQrName] = useState<string | null>(null);
  const [deletePastTenantTarget, setDeletePastTenantTarget] = useState<Occupant | null>(null);

  // Booked Tenant Check-In & Postpone Modal State
  const [checkInModalOccupant, setCheckInModalOccupant] = useState<Occupant | null>(null);
  const [showCompleteCheckInPopup, setShowCompleteCheckInPopup] = useState<boolean>(false);
  const [showPostponeModal, setShowPostponeModal] = useState<boolean>(false);
  const [postponedDate, setPostponedDate] = useState<string>("2026-08-15");
  const [checkOutModalOccupant, setCheckOutModalOccupant] = useState<Occupant | null>(null);

  const [currentSettings, setCurrentSettings] = useState(() =>
    typeof window !== "undefined" ? propertySettingsStore.getSettings(propertyId) : propertySettingsStore.getSettings()
  );

  // Silent Automated Move-In Date Auto-Checkin Engine & Property Settings Reactive Subscriber
  useEffect(() => {
    runAutoCheckInEngine();
    propertySettingsStore.initFirebaseListener(propertyId);
    setCurrentSettings(propertySettingsStore.getSettings(propertyId));
    const unsubscribe = propertySettingsStore.subscribe(() => {
      setCurrentSettings(propertySettingsStore.getSettings(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

  // Handle Rent Collection Submission
  const handleCollectRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectRentOccupant) return;

    const dParts = paymentDate.split("-");
    const formattedPaidDate = `${dParts[2]} ${
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
        parseInt(dParts[1], 10) - 1
      ] || "Aug"
    } ${dParts[0]}`;

    // Mutate mock occupant status
    collectRentOccupant.paymentStatus = "Paid";
    collectRentOccupant.lastPaidDate = formattedPaidDate;
    collectRentOccupant.daysRemainingText = "—";

    fireCelebrationConfetti();
    triggerToast(
      `🎉 Rent collected successfully! ₹${paymentAmount.toLocaleString("en-IN")} recorded for ${collectRentOccupant.name}`
    );
    setCollectRentOccupant(null);
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
      const stmt = calculateOccupantFinancialStatement(curr);
      totalExpected += stmt.proRataRent + stmt.priorArrears;
      sumCollected += stmt.totalRentPaid;

      if (!stmt.isFullyPaid) {
        const netDue = stmt.netOutstandingBalance;
        if (curr.paymentStatus === "Overdue" || curr.daysDiff < 0) {
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
  }, [occupantsList]);

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
      } else if (sortColumn === "daysRemaining") {
        const aVal = a.paymentStatus === "Paid" ? 999 : a.paymentStatus === "Overdue" ? -5 : 2;
        const bVal = b.paymentStatus === "Paid" ? 999 : b.paymentStatus === "Overdue" ? -5 : 2;
        comparison = aVal - bVal;
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
  const handleHeaderSort = (column: "name" | "dueDate" | "daysRemaining" | "room" | "rent") => {
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

          {/* Spring-Physics Gliding Status Filter Tabs */}
          <div className="overflow-x-auto pb-1 max-w-4xl">
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

          {/* Filters & Sorting Control Bar */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Table Quick Search Input */}
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <input
                  type="text"
                  value={rawSearchTerm}
                  onChange={(e) => {
                    setRawSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter name, phone, room..."
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-xs md:text-sm bg-white text-gray-800 focus:ring-1 focus:ring-[#c2652a]"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                {rawSearchTerm && (
                  <X
                    className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 cursor-pointer hover:text-red-500"
                    onClick={() => setRawSearchTerm("")}
                  />
                )}
              </div>

              {/* Sort By Selector */}
              <div className="relative min-w-[150px]">
                <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] text-gray-400 font-bold z-10 flex items-center gap-1">
                  <ArrowUpDown className="w-2.5 h-2.5" /> Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full text-xs md:text-sm py-2 px-3 border border-gray-200 rounded-lg bg-white text-gray-800 font-medium focus:ring-1 focus:ring-[#c2652a]"
                >
                  <option value="name-asc">Name (A - Z)</option>
                  <option value="name-desc">Name (Z - A)</option>
                  <option value="room">Room Number</option>
                  <option value="rent-desc">Rent (High to Low)</option>
                  <option value="due">Payment Due Date</option>
                </select>
              </div>

              {/* Dropdown Filters Grouped Together */}
              <div className="relative min-w-[130px]">
                <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] text-gray-400 font-bold z-10">
                  Payment Status
                </label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="w-full text-xs md:text-sm py-2 px-3 border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-1 focus:ring-[#c2652a]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Due">Pending / Due</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {/* Payment Due Filter */}
              <div className="relative min-w-[130px]">
                <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] text-gray-400 font-bold z-10">
                  Payment Due
                </label>
                <select
                  value={paymentDueFilter}
                  onChange={(e) => setPaymentDueFilter(e.target.value)}
                  className="w-full text-xs md:text-sm py-2 px-3 border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-1 focus:ring-[#c2652a]"
                >
                  <option value="All">All Due Dates</option>
                  <option value="Today">Due Today</option>
                  <option value="Tomorrow">Due Tomorrow</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {/* Room Filter */}
              <div className="relative min-w-[120px]">
                <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] text-gray-400 font-bold z-10">
                  Room & Bed
                </label>
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="w-full text-xs md:text-sm py-2 px-3 border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-1 focus:ring-[#c2652a]"
                >
                  <option value="All Rooms">All Rooms</option>
                  {propertyStore.getRoomNumbers().map((rmNum) => (
                    <option key={rmNum} value={rmNum}>
                      Room {rmNum}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setTenantStatusFilter("All");
                  setPaymentStatusFilter("All");
                  setPaymentDueFilter("All");
                  setFloorFilter("All Floors");
                  setRoomFilter("All Rooms");
                  setRawSearchTerm("");
                  setSortBy("name-asc");
                }}
                className="text-xs font-medium text-gray-400 hover:text-[#c2652a] flex items-center gap-1 ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>

            {/* Active Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase">
                Active Filters ({filteredOccupants.length} matches):
              </span>
              {rawSearchTerm && (
                <div className="bg-orange-50 text-[#c2652a] px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-orange-200 font-bold">
                  Query: "{rawSearchTerm}"
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => setRawSearchTerm("")}
                  />
                </div>
              )}
              {tenantStatusFilter !== "All" && (
                <div className="bg-gray-100 px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-gray-200 text-gray-700">
                  Status: {tenantStatusFilter}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => setTenantStatusFilter("All")}
                  />
                </div>
              )}
              {paymentStatusFilter !== "All" && (
                <div className="bg-gray-100 px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-gray-200 text-gray-700">
                  Payment: {paymentStatusFilter}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => setPaymentStatusFilter("All")}
                  />
                </div>
              )}
            </div>
          </div>

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
                  <th
                    onClick={() => handleHeaderSort("daysRemaining")}
                    className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#c2652a] select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Days Remaining</span>
                      {sortColumn === "daysRemaining" && (
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
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-[#c2652a] font-bold flex items-center justify-center text-xs shrink-0">
                              {occ.avatar ? (
                                <img
                                  src={occ.avatar}
                                  alt={occ.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                occ.name.charAt(0)
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
                              <span className="text-[10px] text-gray-500 font-mono block">
                                📞 {occ.phone}
                              </span>
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
                          {occ.paymentStatus === "Paid" ? (
                            <span className="text-gray-400 font-bold text-xs">—</span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${occ.paymentStatus === "Overdue" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                              {occ.daysRemainingText}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {(() => {
                            const stmt = calculateOccupantFinancialStatement(occ);
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
                    <td colSpan={8} className="py-12 text-center text-xs text-gray-500">
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
                <span>💡 <strong>Tip:</strong> Press & hold any card for 1 sec 📳 to select multiple tenants.</span>
              </div>
            )}

            {paginatedOccupants.length > 0 ? (
              paginatedOccupants.map((occ) => {
                const isSelected = selectedIds.includes(occ.id);
                const isPastTenant = occ.lifecycleStatus === "Past" || activeFilterTab === "Past";
                const isActionMenuOpen = activeActionDropdownId === occ.id;

                const startTouchTimer = () => {
                  if (isMobileMultiSelectMode) return;
                  const timer = setTimeout(() => {
                    setIsMobileMultiSelectMode(true);
                    handleSelectOne(occ.id);
                    if (typeof window !== "undefined" && navigator.vibrate) {
                      navigator.vibrate(60);
                    }
                  }, 1000); // 1.0 second exact long-press threshold
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
                    onClick={(e) => {
                      if (isMobileMultiSelectMode) {
                        e.preventDefault();
                        handleSelectOne(occ.id);
                      }
                    }}
                    className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3 transition-all relative ${
                      isSelected ? "border-[#c2652a] bg-orange-50/40 ring-1 ring-[#c2652a]" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={occ.avatar}
                            alt={occ.name}
                            className="w-11 h-11 rounded-full border border-gray-200 object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#c2652a] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md animate-in zoom-in-50">
                              ✓
                            </div>
                          )}
                        </div>

                        <Link
                          href={isMobileMultiSelectMode ? "#" : `/p/${propertyId}/tenants/${occ.id}`}
                          onClick={(e) => {
                            if (isMobileMultiSelectMode) {
                              e.preventDefault();
                              handleSelectOne(occ.id);
                            }
                          }}
                          className="flex-1 min-w-0"
                        >
                          <h3 className="font-bold text-sm text-gray-900 hover:text-[#c2652a] transition-colors flex items-center gap-2 truncate">
                            {occ.name}
                            {occ.stayType === "Guest" && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                                🟣 GUEST
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500 font-mono truncate">{occ.phone}</p>
                        </Link>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
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
                            onClick={() => setActiveActionDropdownId(isActionMenuOpen ? null : occ.id)}
                            className="p-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Mobile Action Dropdown Popup */}
                          {isActionMenuOpen && (
                            <div className="absolute right-0 top-9 z-30 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 text-xs font-semibold animate-in fade-in zoom-in-95">
                              <Link
                                href={`/p/${propertyId}/tenants/${occ.id}`}
                                onClick={() => setActiveActionDropdownId(null)}
                                className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-orange-50 text-gray-800"
                              >
                                <Eye className="w-4 h-4 text-purple-600" /> View Profile
                              </Link>
                              {occ.lifecycleStatus !== "Past" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setActiveActionDropdownId(null);
                                      setCollectRentOccupant(occ);
                                      setPaymentAmount(occ.rentAmount);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-orange-50 text-gray-800"
                                  >
                                    <CreditCard className="w-4 h-4 text-emerald-600" /> Collect Rent
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveActionDropdownId(null);
                                      triggerToast(`Initiated Room Transfer for ${occ.name}`);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-orange-50 text-gray-800"
                                  >
                                    <ArrowRightLeft className="w-4 h-4 text-gray-500" /> Transfer Room
                                  </button>
                                </>
                              )}
                              {isPastTenant && (
                                <button
                                  onClick={() => {
                                    setActiveActionDropdownId(null);
                                    setDeletePastTenantTarget(occ);
                                  }}
                                  className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-rose-50 text-rose-600 border-t border-gray-100 font-bold"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-600" />
                                  <span>{occ.stayType === "Guest" ? "Delete Guest" : "Delete Past Tenant"}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          Room & Bed Allocation
                        </p>
                        <p className="font-semibold text-gray-800">
                          {isPastTenant ? (
                            <span className="text-gray-400 font-semibold italic">— (Vacated)</span>
                          ) : (
                            `Room ${occ.roomNumber} (${occ.bedCode})`
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          Payment Due
                        </p>
                        <p className="font-semibold text-[#c2652a]">
                          {occ.dueDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <Link
                        href={`/p/${propertyId}/tenants/${occ.id}`}
                        className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <User className="w-3.5 h-3.5 text-gray-600" /> View Profile
                      </Link>
                      <button
                        onClick={() => {
                          setCollectRentOccupant(occ);
                          setPaymentAmount(occ.rentAmount);
                        }}
                        className="flex-1 py-2 rounded-xl bg-[#c2652a] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Collect Rent
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-xs text-gray-500">
                No matching occupants found.
              </div>
            )}
          </div>

          {/* Sticky Mobile Batch WhatsApp Reminders Bar */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-4 left-4 right-4 z-40 bg-gray-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-5">
              <div>
                <p className="font-bold text-xs">
                  {selectedIds.length} Tenant{selectedIds.length > 1 ? "s" : ""} Selected
                </p>
                <p className="text-[10px] text-gray-400 font-medium">
                  Send instant rent due reminders
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRentReminderQRModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" /> Send Rent Reminders (QR Attached)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-2xl rounded-2xl p-3 md:px-6 md:py-3.5 flex items-center gap-4 md:gap-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-7 h-7 rounded-lg bg-orange-50 text-[#c2652a] font-bold flex items-center justify-center text-sm">
                {selectedIds.length}
              </span>
              <div className="hidden sm:block">
                <span className="font-bold text-gray-900 block">Tenants Selected</span>
                <span className="text-[10px] text-gray-500">
                  Batch Rent Reminders & Payment QR
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowRentReminderQRModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Rent Reminder & Attach QR ({selectedIds.length})</span>
              </button>
              <button
                onClick={() => triggerToast(`Calling ${selectedIds.length} selected tenants`)}
                className="hidden md:flex px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold items-center gap-1.5"
              >
                <Phone className="w-4 h-4" /> Call Selected
              </button>
              <button
                onClick={() => triggerToast(`Exported CSV for ${selectedIds.length} tenants`)}
                className="hidden md:flex px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Export Selected
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Collect Rent Interactive Modal */}
        {collectRentOccupant && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Collect Rent
                  </h3>
                  <p className="text-xs text-gray-500">
                    Log rent collection for {collectRentOccupant.name}
                  </p>
                </div>
                <button
                  onClick={() => setCollectRentOccupant(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCollectRentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Occupant & Room
                  </label>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-gray-900">
                    {collectRentOccupant.name} • Room {collectRentOccupant.roomNumber} ({collectRentOccupant.bedCode})
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Defaults to today. Change if logging a past/backdated payment.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Amount Collected (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCollectRentOccupant(null)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold shadow-md"
                  >
                    Confirm & Record Rent
                  </button>
                </div>
              </form>
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
                <button
                  type="button"
                  onClick={() => setShowRentReminderQRModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
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
                <h4 className="font-bold text-gray-900 text-xs">
                  2. Selected Tenants ({selectedIds.length}) & Rent Reminders:
                </h4>

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
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-2xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp 💬</span>
                            </a>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRentReminderQRModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const profiles = currentSettings.qrProfiles && currentSettings.qrProfiles.length > 0 ? currentSettings.qrProfiles : DEFAULT_QR_PROFILES;
                    const activeQr = profiles[activeQrIndex] || profiles[0];
                    const selectedOccupants = occupantsList.filter((o) => selectedIds.includes(o.id));

                    if (selectedOccupants.length > 0) {
                      const firstOcc = selectedOccupants[0];
                      const cleanPhone = firstOcc.phone.replace(/\D/g, "");
                      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                      const isCashReq = activeQr?.upiId === "CASH_PAYMENT" || activeQr?.accountType === "CASH_DESK";
                      const paymentNote = isCashReq
                        ? `💵 *Payment Mode*: Cash Request at ${activeQr?.bankLabel}\nPlease visit reception desk to clear rent.`
                        : `💳 *Pay via UPI ID*: ${activeQr?.upiId} (${activeQr?.bankLabel})\nPlease scan QR code or pay via UPI.`;

                      const msg = encodeURIComponent(
                        `Hello ${firstOcc.name},\n\nFriendly rent payment reminder for ${currentSettings.propertyName || "TenoPilot.com"}:\n🏠 *Room Location*: ${firstOcc.roomNumber} (${firstOcc.bedCode})\n💰 *Rent Amount Due*: ₹${firstOcc.rentAmount.toLocaleString("en-IN")}\n📅 *Due Date*: ${firstOcc.dueDate}\n\n${paymentNote}\n\nThank you,\n${currentSettings.propertyName || "TenoPilot.com"} Management`
                      );
                      // Synchronous window.open on user click event (never blocked by browser)
                      window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");

                      if (selectedOccupants.length > 1) {
                        triggerToast(`🚀 Launched WhatsApp for ${firstOcc.name}! Click 'WhatsApp 💬' next to remaining ${selectedOccupants.length - 1} tenants to send.`);
                      } else {
                        triggerToast(`🚀 Launched WhatsApp Rent Reminder for ${firstOcc.name}!`);
                      }
                    } else {
                      triggerToast("Please select at least one tenant to send reminders.");
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Selected WhatsApp Reminders 🚀</span>
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
      </div>
    </div>
  );
}
