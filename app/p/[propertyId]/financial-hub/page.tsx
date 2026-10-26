"use client";

import Link from "next/link";
import { use, useState, useEffect, useMemo } from "react";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import {
  Plus,
  Calendar,
  ArrowUpRight,
  Upload,
  CheckCircle2,
  X,
  FileText,
  Lock,
  Wallet,
  Building2,
  TrendingUp,
  Receipt,
  Settings,
  Zap,
  Droplet,
  Users,
  Wifi,
  Wrench,
  Utensils,
  Download,
  Eye,
  Trash2,
  Filter,
  Tag,
  Palette,
  Shield,
  Fuel,
  Pencil,
  Clock,
  Edit3,
  Share2,
  MessageSquare,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  partnerStore,
  PartnerConfig,
  ExpenseCategoryConfig,
  PaymentAccountConfig,
  DEFAULT_EXPENSE_CATEGORIES,
} from "@/constants/partnerStore";
import { expenseStore, ExpenseRecord, CategoryWeightage } from "@/constants/expenseStore";
import { recurringBillStore, RecurringBillRecord } from "@/constants/recurringBillStore";
import { CATEGORIZED_ICON_LIBRARY, RenderDynamicCategoryIcon, ReceiptRupeeIcon } from "@/constants/businessIconLibrary";
import { occupantStore } from "@/constants/mockOccupants";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { calculateOccupantFinancialStatement } from "@/utils/domainSSOT";
import { complianceLogStore } from "@/constants/complianceLogStore";
import { staffStore, UserRole } from "@/lib/staffStore";
import { ThemedAccountSelect } from "@/components/dashboard/ThemedAccountSelect";
import { useRouter } from "next/navigation";
import { buildWhatsAppUrl } from "@/utils/security";

const COLOR_SWATCHES = [
  { name: "Terracotta", hex: "#964407" },
  { name: "Emerald", hex: "#059669" },
  { name: "Purple", hex: "#7e22ce" },
  { name: "Blue", hex: "#1d4ed8" },
  { name: "Amber", hex: "#d97706" },
  { name: "Rose", hex: "#be123c" },
  { name: "Teal", hex: "#0f766e" },
  { name: "Indigo", hex: "#4338ca" },
  { name: "Slate", hex: "#475569" },
  { name: "Gold", hex: "#b45309" },
];

export default function FinancialHubPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";
  const [activeTab, setActiveTab] = useState("Expenses");
  const [showRecordDrawer, setShowRecordDrawer] = useState(false);
  const [showToast, setShowToast] = useState(true);

  // Responsive Mobile Menu Drawer State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Property Settings SSOT State
  const [propertySettings, setPropertySettings] = useState(() =>
    propertySettingsStore.getSettings(propertyId)
  );

  const [activeRole, setActiveRole] = useState<UserRole>(() => staffStore.getActiveRole());

  useEffect(() => {
    propertySettingsStore.initFirebaseListener(propertyId);
    setPropertySettings(propertySettingsStore.getSettings(propertyId));
    const unsubscribeSettings = propertySettingsStore.subscribe(() => {
      setPropertySettings(propertySettingsStore.getSettings(propertyId));
    });

    const unsubscribeStaff = staffStore.subscribe(() => {
      setActiveRole(staffStore.getActiveRole());
    });

    return () => {
      unsubscribeSettings();
      unsubscribeStaff();
    };
  }, [propertyId]);

  // Receptionist Access Guard: Keep on Expenses tab
  useEffect(() => {
    if (activeRole === "receptionist" && activeTab !== "Expenses") {
      setActiveTab("Expenses");
    }
  }, [activeRole, activeTab]);

  // Timeline Filter State & Custom Date Range
  const [selectedTimelineFilter, setSelectedTimelineFilter] = useState<
    "THIS_MONTH" | "LAST_MONTH" | "THIS_QUARTER" | "THIS_YEAR" | "ALL_TIME" | "CUSTOM"
  >("THIS_MONTH");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [showCustomDateModal, setShowCustomDateModal] = useState<boolean>(false);

  // Partner Ledger Drilldown State
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partnerLedgerSubFilter, setPartnerLedgerSubFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get("tab");
      const partnerParam = searchParams.get("partnerId");
      if (tabParam === "Partner Settlement" || tabParam === "Settlement") {
        setActiveTab("Partner Settlement");
      }
      if (partnerParam) {
        setSelectedPartnerId(partnerParam);
      }
    }
  }, []);

  // Helper: Resolve active start and end date bounds based on timeline filter
  const resolveActiveDateBounds = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (selectedTimelineFilter) {
      case "THIS_MONTH": {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return {
          startDate: firstDay.toISOString().split("T")[0],
          endDate: lastDay.toISOString().split("T")[0],
          label: `This Month (${firstDay.toLocaleString("en-IN", { month: "short", year: "numeric" })})`,
          isAllTime: false,
        };
      }
      case "LAST_MONTH": {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        return {
          startDate: firstDay.toISOString().split("T")[0],
          endDate: lastDay.toISOString().split("T")[0],
          label: `Last Month (${firstDay.toLocaleString("en-IN", { month: "short", year: "numeric" })})`,
          isAllTime: false,
        };
      }
      case "THIS_QUARTER": {
        const qStartMonth = Math.floor(month / 3) * 3;
        const firstDay = new Date(year, qStartMonth, 1);
        const lastDay = new Date(year, qStartMonth + 3, 0);
        const qNum = Math.floor(month / 3) + 1;
        return {
          startDate: firstDay.toISOString().split("T")[0],
          endDate: lastDay.toISOString().split("T")[0],
          label: `This Quarter (Q${qNum} ${year})`,
          isAllTime: false,
        };
      }
      case "THIS_YEAR": {
        const fyStartYear = month >= 3 ? year : year - 1;
        const firstDay = new Date(fyStartYear, 3, 1);
        const lastDay = new Date(fyStartYear + 1, 2, 31);
        return {
          startDate: firstDay.toISOString().split("T")[0],
          endDate: lastDay.toISOString().split("T")[0],
          label: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
          isAllTime: false,
        };
      }
      case "CUSTOM": {
        return {
          startDate: customStartDate,
          endDate: customEndDate,
          label: `Custom (${customStartDate} to ${customEndDate})`,
          isAllTime: false,
        };
      }
      case "ALL_TIME":
      default:
        return {
          startDate: "2000-01-01",
          endDate: "2099-12-31",
          label: "All Time Records",
          isAllTime: true,
        };
    }
  };

  const activeDateBounds = resolveActiveDateBounds();

  // Dynamic Calendar Timeline Labels based on current real-time date
  const timelineLabels = useMemo(() => {
    const now = new Date();
    const curMonth = now.toLocaleString("en-IN", { month: "short", year: "numeric" });
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.toLocaleString("en-IN", { month: "short", year: "numeric" });
    const qNum = Math.floor(now.getMonth() / 3) + 1;
    const quarter = `Q${qNum} ${now.getFullYear()}`;
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fy = `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
    return { curMonth, lastMonth, quarter, fy };
  }, []);

  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Electricity");
  const [paidFrom, setPaidFrom] = useState(() => {
    const initPartners = partnerStore.getPartners(propertyId);
    const initAccs = partnerStore.getPaymentAccounts(propertyId);
    return initPartners.length === 1 ? (initAccs[0]?.name || initPartners[0]?.name || "") : "";
  });
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<{ url: string; fileName: string; size: string } | null>(null);

  // Handle Receipt Upload File Input
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please attach a smaller image or PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      const sizeKb = (file.size / 1024).toFixed(0) + " KB";
      setReceiptFile({
        url: base64Url,
        fileName: file.name,
        size: sizeKb,
      });
    };
    reader.readAsDataURL(file);
  };

  // Expenses SSOT State
  const [expenseList, setExpenseList] = useState<ExpenseRecord[]>([]);
  const [categoryWeightages, setCategoryWeightages] = useState<CategoryWeightage[]>([]);
  const [highestCat, setHighestCat] = useState<{ category: string; amount: number }>({ category: "None", amount: 0 });
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [partnerContributions, setPartnerContributions] = useState<Record<string, number>>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [activeReceiptModal, setActiveReceiptModal] = useState<ExpenseRecord | null>(null);

  // Recurring Bills State
  const [recurringBillsList, setRecurringBillsList] = useState<RecurringBillRecord[]>([]);
  const [showAddRecurringModal, setShowAddRecurringModal] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [recTitle, setRecTitle] = useState("");
  const [recCategory, setRecCategory] = useState("Electricity");
  const [recAmount, setRecAmount] = useState("");
  const [recDueDate, setRecDueDate] = useState("Monthly • 1st");
  const [recPaidFrom, setRecPaidFrom] = useState("Business Account");
  const [recNotes, setRecNotes] = useState("");

  // Category Management & Sub-Tab State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryConfig | null>(null);
  const [renameCategoryName, setRenameCategoryName] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [expensesSubTab, setExpensesSubTab] = useState<"LEDGER" | "CATEGORIES">("LEDGER");
  const [hoveredPieCategory, setHoveredPieCategory] = useState<string | null>(null);
  const [hoveredRevenueStream, setHoveredRevenueStream] = useState<string | null>(null);
  const [hoveredPaymentChannel, setHoveredPaymentChannel] = useState<string | null>(null);

  const [partners, setPartners] = useState<PartnerConfig[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryConfig[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountConfig[]>([]);
  const router = useRouter();

  // Auto-reset paying account based on partner count (Empty by default for 2+ partners)
  useEffect(() => {
    if (showRecordDrawer) {
      setPaidFrom(partners.length === 1 ? (paymentAccounts[0]?.name || partners[0]?.name || "") : "");
    }
  }, [showRecordDrawer, partners, paymentAccounts]);

  // Exact SSOT Category Metadata Resolver (Colors & Icons strictly mapped from category configuration)
  const resolveCategoryMeta = (catName: string) => {
    const cleanName = (catName || "").trim().toLowerCase();
    
    // Dedicated match for Security Deposit Refund (special soothing Mauve color)
    if (cleanName.includes("deposit") || cleanName.includes("refund")) {
      return {
        displayName: "Security Deposit Refund",
        color: "#a2678a",
        icon: "ShieldCheck",
      };
    }

    // 1. Direct match in active property categories
    let found = categories.find((c) => c.name.trim().toLowerCase() === cleanName);
    
    // 2. Direct match in DEFAULT_EXPENSE_CATEGORIES
    if (!found) {
      found = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.name.trim().toLowerCase() === cleanName);
    }
    
    // 3. Normalized / fuzzy match (strip punctuation, spaces)
    if (!found) {
      const strippedClean = cleanName.replace(/[^a-z0-9]/g, "");
      found = categories.find((c) => {
        const stripped = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return stripped === strippedClean || stripped.includes(strippedClean) || strippedClean.includes(stripped);
      }) || DEFAULT_EXPENSE_CATEGORIES.find((c) => {
        const stripped = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return stripped === strippedClean || stripped.includes(strippedClean) || strippedClean.includes(stripped);
      });
    }

    return {
      displayName: found?.name || catName,
      color: found?.color || "#d97706",
      icon: found?.icon || "Receipt",
    };
  };

  const parseDateToIso = (dateStr?: string, timestamp?: number): string => {
    if (timestamp && !isNaN(timestamp)) {
      try {
        return new Date(timestamp).toISOString().slice(0, 10);
      } catch (_) {}
    }
    if (!dateStr) return "";
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }
    return trimmed;
  };

  // 100% Real-Time Date-Filtered Revenues Calculation Engine
  const computeLiveRevenueData = () => {
    const allOccupants = occupantStore.getOccupants(propertyId);
    const occupants = allOccupants.filter((o) => o.lifecycleStatus !== "Past");
    const { startDate, endDate, isAllTime } = resolveActiveDateBounds();

    let totalGrossRevenue = 0;
    let totalBilledRent = 0;
    let totalUncollectedArrears = 0;
    let rentStream = 0;
    let depositStream = 0;
    let utilityStream = 0;
    let guestStream = 0;

    let upiAmount = 0;
    let bankAmount = 0;
    let cashAmount = 0;
    let occupiedCount = 0;
    const partnerRentCollections: Record<string, number> = {};
    const accountCollections: Record<string, number> = {};
    const partnerInflowItems: Record<string, Array<{
      id: string;
      occupantId: string;
      tenantName: string;
      roomNumber: string;
      bedNumber?: string;
      amount: number;
      date: string;
      method: string;
      paidTo: string;
      receiptNo: string;
      isDeposit: boolean;
    }>> = {};

    const paymentAccountsList = partnerStore.getPaymentAccounts(propertyId);
    const partnersList = partnerStore.getPartners(propertyId);
    const accountToPartner = new Map<string, string>();
    paymentAccountsList.forEach((acc) => {
      if (acc.partnerName && acc.type === "Partner Account") {
        accountToPartner.set(acc.name.toLowerCase().trim(), acc.partnerName);
      }
    });

    occupants.forEach((occ) => {
      const isOccupied = occ.lifecycleStatus === "Active" || occ.lifecycleStatus === "Notice";
      if (isOccupied) {
        occupiedCount++;
      }

      const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
      
      // Calculate billed rent for the cycle/period
      totalBilledRent += stmt.proRataRent + stmt.priorArrears;
      totalUncollectedArrears += stmt.netOutstandingBalance;

      // Filter occupant's payment receipts strictly within the active date range with robust date parsing
      const history = occ.paymentHistory || [];
      const periodPayments = isAllTime
        ? history
        : history.filter((pm) => {
            const rawDate = pm.date || "";
            if (!rawDate) return false;
            let isoDate = "";
            if (rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
              isoDate = rawDate.slice(0, 10);
            } else {
              const parsed = new Date(rawDate);
              if (!isNaN(parsed.getTime())) {
                isoDate = parsed.toISOString().slice(0, 10);
              }
            }
            if (!isoDate) return true;
            return isoDate >= startDate && isoDate <= endDate;
          });

      if (periodPayments.length > 0) {
        periodPayments.forEach((pm) => {
          totalGrossRevenue += pm.amount;

          // Track collection account and partner allocation
          const targetAccount = pm.paidTo || "Main Business Account";
          accountCollections[targetAccount] = (accountCollections[targetAccount] || 0) + pm.amount;

          // Map payment destination back to partner if it is a partner account
          const targetAccountLower = targetAccount.toLowerCase().trim();
          let resolvedPartnerName: string | null = null;

          if (accountToPartner.has(targetAccountLower)) {
            resolvedPartnerName = accountToPartner.get(targetAccountLower)!;
          } else {
            const matched = partnersList.find((p) => {
              const pNameLower = p.name.toLowerCase().trim();
              return (
                targetAccountLower === pNameLower ||
                targetAccountLower.startsWith(pNameLower) ||
                targetAccountLower.includes(`(${pNameLower})`)
              );
            });
            if (matched) {
              resolvedPartnerName = matched.name;
            }
          }

          const partnerKey = resolvedPartnerName || targetAccount;
          partnerRentCollections[partnerKey] = (partnerRentCollections[partnerKey] || 0) + pm.amount;
          if (!partnerInflowItems[partnerKey]) {
            partnerInflowItems[partnerKey] = [];
          }
          partnerInflowItems[partnerKey].push({
            id: `${occ.id}-${pm.receiptNo || pm.date}-${pm.amount}-${Math.random().toString(36).substring(2, 6)}`,
            occupantId: occ.id,
            tenantName: occ.name,
            roomNumber: occ.roomNumber,
            bedNumber: occ.bedCode,
            amount: pm.amount,
            date: pm.date,
            method: pm.mode || "UPI",
            paidTo: targetAccount,
            receiptNo: pm.receiptNo || "REC-N/A",
            isDeposit:
              (pm.month || "").toLowerCase().includes("deposit") ||
              (pm.receiptNo || "").toLowerCase().includes("dep"),
          });

          const isDeposit =
            (pm.month || "").toLowerCase().includes("deposit") ||
            (pm.receiptNo || "").toLowerCase().includes("dep");

          if (isDeposit) {
            depositStream += pm.amount;
          } else {
            rentStream += pm.amount;
            if (occ.stayType === "Guest") {
              guestStream += pm.amount;
            } else {
              utilityStream += Math.round(pm.amount * 0.05);
            }
          }

          const mode = (pm.mode || "").toLowerCase();
          if (mode.includes("upi") || mode.includes("phonepe") || mode.includes("gpay")) {
            upiAmount += pm.amount;
          } else if (mode.includes("bank") || mode.includes("neft") || mode.includes("transfer")) {
            bankAmount += pm.amount;
          } else {
            cashAmount += pm.amount;
          }
        });
      } else {
        // Fallback: If no granular receipts exist in history yet, calculate from active cycle statement
        const isCurrentPeriod =
          selectedTimelineFilter === "THIS_MONTH" ||
          selectedTimelineFilter === "ALL_TIME" ||
          selectedTimelineFilter === "THIS_QUARTER" ||
          selectedTimelineFilter === "THIS_YEAR";

        if (isCurrentPeriod && stmt.totalPaid > 0) {
          totalGrossRevenue += stmt.totalPaid;
          accountCollections["Main Business Account"] = (accountCollections["Main Business Account"] || 0) + stmt.totalPaid;
          rentStream += stmt.totalRentPaid;
          if (stmt.isDepositCleared) {
            depositStream += stmt.securityDepositRequired;
          }
          if (occ.stayType === "Guest") {
            guestStream += stmt.totalRentPaid;
          } else {
            utilityStream += Math.round(stmt.totalRentPaid * 0.05);
          }
          upiAmount += Math.round(stmt.totalPaid * 0.85);
          cashAmount += Math.round(stmt.totalPaid * 0.15);
        }
      }
    });

    // Query check-out and cancellation logs within date range
    const complianceLogs = complianceLogStore.getLogs(propertyId);
    let penaltyDamageStream = 0;
    let maintenanceStream = 0;

    complianceLogs.forEach((log) => {
      const logDate = parseDateToIso(log.checkOutDate, log.timestamp);
      if (isAllTime || (logDate >= startDate && logDate <= endDate)) {
        penaltyDamageStream += log.penaltyPaid || 0;
        maintenanceStream += log.maintenancePaid || 0;
      }
    });

    // Cross-check all occupants with checkoutSettlement to ensure 100% SSOT parity
    allOccupants.forEach((occ) => {
      if (occ.checkoutSettlement) {
        const occSettleDate = parseDateToIso(occ.checkoutSettlement.settledDate || occ.vacatingDate);
        if (isAllTime || (occSettleDate >= startDate && occSettleDate <= endDate)) {
          const hasLog = complianceLogs.some(
            (l) => l.occupantId === occ.id && ((l.penaltyPaid || 0) > 0 || (l.maintenancePaid || 0) > 0)
          );
          if (!hasLog) {
            penaltyDamageStream += occ.checkoutSettlement.repairDeduction || 0;
            maintenanceStream += occ.checkoutSettlement.maintenanceDeduction || 0;
          }
        }
      }
    });

    totalGrossRevenue += penaltyDamageStream + maintenanceStream;

    const totalExpectedRent = rentStream + totalUncollectedArrears;
    const collectionEfficiency =
      totalExpectedRent > 0
        ? Math.min(100, Math.max(0, (rentStream / totalExpectedRent) * 100)).toFixed(1)
        : "0.0";

    const arpb = occupiedCount > 0 ? Math.round(totalGrossRevenue / occupiedCount) : 0;

    const totalChannel = upiAmount + bankAmount + cashAmount;
    const onlineTotal = upiAmount + bankAmount;
    const upiPct = totalChannel > 0 ? Math.round((onlineTotal / totalChannel) * 100) : 0;
    const cashPct = totalChannel > 0 ? 100 - upiPct : 0;

    const totalStreams = rentStream + depositStream + maintenanceStream + penaltyDamageStream;
    const rentPct = totalStreams > 0 ? Math.round((rentStream / totalStreams) * 100) : 0;
    const depositPct = totalStreams > 0 ? Math.round((depositStream / totalStreams) * 100) : 0;
    const maintenancePct = totalStreams > 0 ? Math.round((maintenanceStream / totalStreams) * 100) : 0;
    const penaltyDamagePct = totalStreams > 0 ? Math.max(0, 100 - rentPct - depositPct - maintenancePct) : 0;

    return {
      totalGrossRevenue,
      totalBilledRent,
      totalUncollectedArrears,
      collectionEfficiency,
      arpb,
      rentStream,
      depositStream,
      maintenanceStream,
      penaltyDamageStream,
      rentPct,
      depositPct,
      maintenancePct,
      penaltyDamagePct,
      onlineTotal,
      cashAmount,
      upiPct,
      cashPct,
      occupants,
      partnerRentCollections,
      accountCollections,
      partnerInflowItems,
    };
  };

  const [revenueMetrics, setRevenueMetrics] = useState(computeLiveRevenueData);

  // Sync state whenever timeline filter or custom dates change
  useEffect(() => {
    const { startDate, endDate } = resolveActiveDateBounds();
    setExpenseList(expenseStore.getExpenses(propertyId, startDate, endDate));
    setCategoryWeightages(expenseStore.getCategoryWeightages(propertyId, startDate, endDate));
    setHighestCat(expenseStore.getHighestCategory(propertyId, startDate, endDate));
    setTotalSpent(expenseStore.getTotalSpentThisMonth(propertyId, startDate, endDate));
    setPartnerContributions(expenseStore.getPartnerPersonalContributions(propertyId, startDate, endDate));
    setRevenueMetrics(computeLiveRevenueData());
  }, [selectedTimelineFilter, customStartDate, customEndDate, propertyId]);

  useEffect(() => {
    partnerStore.initFirebaseListener(propertyId);
    setPartners(partnerStore.getPartners(propertyId));
    setCategories(partnerStore.getCategories(propertyId));
    setPaymentAccounts(partnerStore.getPaymentAccounts(propertyId));

    const unsubPartners = partnerStore.subscribe(() => {
      setPartners(partnerStore.getPartners(propertyId));
      setCategories(partnerStore.getCategories(propertyId));
      setPaymentAccounts(partnerStore.getPaymentAccounts(propertyId));
    });

    // Init Cloud Firebase Firestore & SSOT Stores for Property
    expenseStore.initPropertyFirebase(propertyId);
    recurringBillStore.initPropertyFirebase(propertyId);

    const updateExpenseState = () => {
      const { startDate, endDate } = resolveActiveDateBounds();
      setExpenseList(expenseStore.getExpenses(propertyId, startDate, endDate));
      setCategoryWeightages(expenseStore.getCategoryWeightages(propertyId, startDate, endDate));
      setHighestCat(expenseStore.getHighestCategory(propertyId, startDate, endDate));
      setTotalSpent(expenseStore.getTotalSpentThisMonth(propertyId, startDate, endDate));
      setPartnerContributions(expenseStore.getPartnerPersonalContributions(propertyId, startDate, endDate));
    };

    const updateRecurringBillsState = () => {
      setRecurringBillsList(recurringBillStore.getRecurringBills(propertyId));
    };

    const updateRevenuesState = () => {
      setRevenueMetrics(computeLiveRevenueData());
    };

    updateExpenseState();
    updateRecurringBillsState();
    updateRevenuesState();

    const unsubExpenses = expenseStore.subscribe(updateExpenseState);
    const unsubRecurring = recurringBillStore.subscribe(updateRecurringBillsState);
    const unsubOccupants = occupantStore.subscribe(updateRevenuesState);
    const unsubProperty = propertyStore.subscribe(updateRevenuesState);
    const unsubCompliance = complianceLogStore.subscribe(updateRevenuesState);

    return () => {
      unsubPartners();
      unsubExpenses();
      unsubRecurring();
      unsubOccupants();
      unsubProperty();
      unsubCompliance();
    };
  }, [propertyId, selectedTimelineFilter, customStartDate, customEndDate]);

  // Resolve itemized outflows per partner from expenses in active date bounds
  const partnerOutflowItems = (() => {
    const { startDate, endDate } = resolveActiveDateBounds();
    const records = expenseStore.getExpenses(propertyId, startDate, endDate);
    const paymentAccountsList = partnerStore.getPaymentAccounts(propertyId);
    const partnersList = partnerStore.getPartners(propertyId);
    const accountToPartner = new Map<string, string>();
    paymentAccountsList.forEach((acc) => {
      if (acc.partnerName && acc.type === "Partner Account") {
        accountToPartner.set(acc.name.toLowerCase().trim(), acc.partnerName);
      }
    });

    const items: Record<
      string,
      Array<{
        id: string;
        date: string;
        title: string;
        category: string;
        amount: number;
        paidFrom: string;
        paidTo?: string;
        paymentMode?: string;
        receiptUrl?: string;
        notes?: string;
      }>
    > = {};

    records.forEach((e) => {
      const pFrom = (e.paidFrom || "").trim();
      const pFromLower = pFrom.toLowerCase();
      if (
        pFromLower.includes("business account") ||
        pFromLower.includes("main business") ||
        pFromLower.includes("petty cash") ||
        pFromLower.includes("cash desk")
      ) {
        return;
      }

      let matchedName: string | null = null;
      if (accountToPartner.has(pFromLower)) {
        matchedName = accountToPartner.get(pFromLower)!;
      } else {
        const found = partnersList.find((p) => {
          const pNameLower = p.name.toLowerCase().trim();
          return (
            pFromLower === pNameLower ||
            pFromLower.startsWith(pNameLower) ||
            pFromLower.includes(`(${pNameLower})`)
          );
        });
        if (found) matchedName = found.name;
        else matchedName = pFrom;
      }

      if (matchedName) {
        if (!items[matchedName]) items[matchedName] = [];
        items[matchedName].push({
          id: e.id,
          date: e.date,
          title: e.vendorName || e.notes || e.category,
          category: e.category,
          amount: e.amount,
          paidFrom: e.paidFrom,
          paymentMode: e.paymentMethod || "Direct",
          receiptUrl: e.receiptUrl,
          notes: e.notes,
        });
      }
    });

    return items;
  })();

  const sendPartnerWhatsAppSummary = (partner: PartnerConfig) => {
    const rentCollected = revenueMetrics.partnerRentCollections?.[partner.name] || 0;
    const actualPaid = partnerContributions[partner.name] || 0;
    const netCashInHand = rentCollected - actualPaid;
    const totalNetProfit = Math.max(0, revenueMetrics.totalGrossRevenue - totalSpent);
    const profitShare = Math.round((totalNetProfit * (partner.ownershipPercentage || 0)) / 100);
    const netSettlement = profitShare - netCashInHand;
    const { label } = resolveActiveDateBounds();

    const msg = `*TenoPilot Partner Cashflow Statement*\n` +
      `👤 *Partner:* ${partner.name} (${partner.ownershipPercentage}% Equity)\n` +
      `📅 *Period:* ${label}\n` +
      `🏢 *Property:* ${propertySettings.propertyName || "Property"}\n\n` +
      `🟢 *Rent Inflows (Collected):* ₹${rentCollected.toLocaleString("en-IN")}\n` +
      `🔴 *Expenses Paid Out-of-Pocket:* ₹${actualPaid.toLocaleString("en-IN")}\n` +
      `⚖️ *Net Cash in Hand:* ₹${netCashInHand.toLocaleString("en-IN")}\n` +
      `🎯 *Entitled Profit Share:* ₹${profitShare.toLocaleString("en-IN")}\n` +
      `--------------------------------\n` +
      (netSettlement >= 0
        ? `🟢 *Final Balance:* Common Pool owes *₹${netSettlement.toLocaleString("en-IN")}* to ${partner.name}`
        : `🔴 *Final Balance:* ${partner.name} must transfer *₹${Math.abs(netSettlement).toLocaleString("en-IN")}* into Common Pool / Co-partners`) +
      `\n\n_Generated via TenoPilot Financial OS_`;

    const url = buildWhatsAppUrl(partner.phone, msg) || `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const exportPartnerLedgerToCSV = (partner: PartnerConfig) => {
    const inflows = revenueMetrics.partnerInflowItems?.[partner.name] || [];
    const outflows = partnerOutflowItems[partner.name] || [];
    const rentCollected = revenueMetrics.partnerRentCollections?.[partner.name] || 0;
    const actualPaid = partnerContributions[partner.name] || 0;
    const netCashInHand = rentCollected - actualPaid;
    const totalNetProfit = Math.max(0, revenueMetrics.totalGrossRevenue - totalSpent);
    const profitShare = Math.round((totalNetProfit * (partner.ownershipPercentage || 0)) / 100);
    const netSettlement = profitShare - netCashInHand;
    const { label, startDate, endDate } = resolveActiveDateBounds();

    const rows: string[] = [
      `"TENOPILOT PARTNER CASHFLOW STATEMENT"`,
      `"Partner Name:","${partner.name}"`,
      `"Equity Share:","${partner.ownershipPercentage}%"`,
      `"Period:","${label}"`,
      `"Date Range:","${startDate} to ${endDate}"`,
      `"Property:","${propertySettings.propertyName || "Property"}"`,
      ``,
      `"SUMMARY METRICS"`,
      `"Total Inflow (Rent Collected):","INR ${rentCollected}"`,
      `"Total Outflow (Expenses Paid):","INR ${actualPaid}"`,
      `"Net Cash in Partner Hand:","INR ${netCashInHand}"`,
      `"Property Total Net Profit:","INR ${totalNetProfit}"`,
      `"Partner Profit Share Entitlement:","INR ${profitShare}"`,
      `"Net Settlement Balance:","INR ${netSettlement}" (${netSettlement >= 0 ? "Receivable from Pool" : "Payable into Pool"})`,
      ``,
      `"--- SECTION 1: CASH INFLOWS (RENT COLLECTED) ---"`,
      `"Date","Tenant Name","Room","Bed","Amount (INR)","Payment Mode","Receipt No"`,
      ...inflows.map((i) => `"${i.date}","${i.tenantName}","${i.roomNumber}","${i.bedNumber || "N/A"}","${i.amount}","${i.method}","${i.receiptNo}"`),
      ``,
      `"--- SECTION 2: CASH OUTFLOWS (EXPENSES PAID OUT-OF-POCKET) ---"`,
      `"Date","Category","Title / Vendor","Amount (INR)","Payment Mode","Notes"`,
      ...outflows.map((o) => `"${o.date}","${o.category}","${o.title}","${o.amount}","${o.paymentMode || "Direct"}","${(o.notes || "").replace(/"/g, '""')}"`),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TenoPilot-${partner.name.replace(/\s+/g, "_")}-Statement-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toast, Inline Category & Modal States
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showCategoryDirectoryModal, setShowCategoryDirectoryModal] = useState(false);
  const [recurringModal, setRecurringModal] = useState<{
    billId?: string;
    category: string;
    amount: number;
    paidFrom: string;
    notes: string;
    saveNewDefault?: boolean;
  } | null>(null);

  // Trigger Toast Notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleCreateInlineCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      triggerToast("⚠️ Category name cannot be empty.");
      return;
    }

    const created = partnerStore.addCategory(trimmed, "Receipt", "#475569", propertyId);
    if (created) {
      setCategory(created.name);
      setNewCategoryInput("");
      setIsAddingNewCategory(false);
      triggerToast(`🟢 New category "${created.name}" added to system!`);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      triggerToast("⚠️ Please enter a valid expense amount.");
      return;
    }

    if (!paidFrom || paidFrom.trim() === "") {
      triggerToast("⚠️ Please select the paying partner / account before recording expense.");
      return;
    }

    const isoDateStr = expenseDate || new Date().toISOString().split("T")[0];

    await expenseStore.addExpense(propertyId, {
      date: isoDateStr,
      category,
      paidFrom,
      property: propertySettings.propertyName || "Sunshine PG",
      amount: numAmount,
      hasReceipt: !!receiptFile,
      receiptUrl: receiptFile?.url,
      receiptName: receiptFile?.fileName,
      notes,
    });

    setAmount("");
    setNotes("");
    setReceiptFile(null);
    setShowRecordDrawer(false);
    triggerToast(`🟢 Expense of ₹${numAmount.toLocaleString("en-IN")} (${category}) recorded & synced to cloud!`);
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense record?")) {
      await expenseStore.deleteExpense(propertyId, id);
      triggerToast("🗑️ Expense record deleted & synced to cloud.");
    }
  };

  const handleConfirmRecurringBill = async () => {
    if (!recurringModal) return;

    if (isNaN(recurringModal.amount) || recurringModal.amount <= 0) {
      triggerToast("⚠️ Please enter a valid payment amount.");
      return;
    }

    if (!recurringModal.paidFrom || recurringModal.paidFrom.trim() === "") {
      triggerToast("⚠️ Please select the paying partner / account before confirming bill payment.");
      return;
    }

    const todayIso = new Date().toISOString().split("T")[0];

    // Log the expense entry
    await expenseStore.addExpense(propertyId, {
      date: todayIso,
      category: recurringModal.category,
      paidFrom: recurringModal.paidFrom,
      property: propertySettings.propertyName || (propertyId === "sunshine-pg" ? "Sunshine Luxury PG" : "My Property"),
      amount: recurringModal.amount,
      hasReceipt: true,
      notes: recurringModal.notes || `Recurring ${recurringModal.category} bill payment`,
    });

    // If user checked "save as future default", update master recurring bill
    if (recurringModal.saveNewDefault && recurringModal.billId) {
      await recurringBillStore.updateRecurringBill(propertyId, recurringModal.billId, {
        amount: recurringModal.amount,
        status: "Paid",
      });
    }

    const categoryName = recurringModal.category;
    const amountVal = recurringModal.amount;
    setRecurringModal(null);
    triggerToast(`🟢 ${categoryName} payment of ₹${amountVal.toLocaleString("en-IN")} confirmed & recorded!`);
  };

  const handleOpenAddRecurringModal = (bill?: RecurringBillRecord) => {
    if (bill) {
      setEditingBillId(bill.id);
      setRecTitle(bill.title);
      setRecCategory(bill.category);
      setRecAmount(bill.amount.toString());
      setRecDueDate(bill.dueDate);
      setRecPaidFrom(bill.paidFrom);
      setRecNotes(bill.notes || "");
    } else {
      setEditingBillId(null);
      setRecTitle("");
      setRecCategory(categories[0]?.name || "Electricity");
      setRecAmount("");
      setRecDueDate("Monthly • 1st");
      setRecPaidFrom(partners.length === 1 ? (paymentAccounts[0]?.name || partners[0]?.name || "") : "");
      setRecNotes("");
    }
    setShowAddRecurringModal(true);
  };

  const handleSaveRecurringBillSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(recAmount);
    if (!recTitle.trim() || isNaN(numAmount) || numAmount <= 0) {
      triggerToast("⚠️ Please enter a valid bill title and amount.");
      return;
    }

    if (!recPaidFrom || recPaidFrom.trim() === "") {
      triggerToast("⚠️ Please select the paying partner / account for this recurring bill.");
      return;
    }

    if (editingBillId) {
      await recurringBillStore.updateRecurringBill(propertyId, editingBillId, {
        title: recTitle.trim(),
        category: recCategory,
        amount: numAmount,
        dueDate: recDueDate,
        paidFrom: recPaidFrom,
        notes: recNotes,
      });
      triggerToast(`🟢 Recurring bill schedule "${recTitle}" updated!`);
    } else {
      await recurringBillStore.addRecurringBill(propertyId, {
        title: recTitle.trim(),
        category: recCategory,
        amount: numAmount,
        dueDate: recDueDate,
        frequency: "Monthly",
        icon: recCategory.includes("Water") ? "Droplet" : recCategory.includes("Staff") ? "Users" : recCategory.includes("Net") ? "Wifi" : "Zap",
        status: "Pending",
        paidFrom: recPaidFrom,
        notes: recNotes,
      });
      triggerToast(`🟢 New recurring bill schedule "${recTitle}" added!`);
    }

    setShowAddRecurringModal(false);
  };

  const handleCreateNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      triggerToast("⚠️ Please enter a category name.");
      return;
    }

    // Default icon: Receipt (Bill icon), Color: Brand Slate #475569
    partnerStore.addCategory(trimmed, "Receipt", "#475569", propertyId);
    setNewCategoryName("");
    setShowAddCategoryModal(false);
    triggerToast(`🟢 New expense category "${trimmed}" added with Bill icon 🧾`);
  };

  const handleRenameCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const trimmed = renameCategoryName.trim();
    if (!trimmed) {
      triggerToast("⚠️ Category name cannot be empty.");
      return;
    }

    partnerStore.renameCategory(editingCategory.id, trimmed, propertyId);
    triggerToast(`✓ Category renamed to "${trimmed}" successfully!`);
    setEditingCategory(null);
    setRenameCategoryName("");
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
      partnerStore.deleteCategory(catId, propertyId);
      triggerToast(`🗑️ Category "${catName}" removed.`);
    }
  };


  return (
    <div className="flex min-h-screen bg-[#fcf9f8] text-gray-900 font-sans selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* 256px Left Sidebar with 8 clean primary menus */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header with In-Page Section Tabs */}
        <PropertyHeader
          title="Financial Hub"
          showSearch={false}
          propertyId={propertyId}
          sectionTabs={["Operations", "Expenses", "Partner Settlement", "Reports"]}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Workspace Body */}
        <div className="p-6 md:p-8 space-y-8 flex-1">
          {/* Prominent Highlightable Section Tabs Bar */}
          <div className="space-y-6">
            {/* Top Title & Controls Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <h1 className="font-serif font-bold text-2xl md:text-3xl text-gray-900">
                  Financial Hub
                </h1>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  REAL-TIME LEDGER 🟢
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* 📅 Interactive Timeline Filter Selector */}
                <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 shadow-2xs">
                  <Calendar className="w-4 h-4 text-[#c2652a] shrink-0" />
                  <select
                    value={selectedTimelineFilter}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      if (val === "CUSTOM") {
                        setShowCustomDateModal(true);
                      }
                      setSelectedTimelineFilter(val);
                    }}
                    className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer pr-2"
                  >
                    <option value="THIS_MONTH">This Month ({timelineLabels.curMonth})</option>
                    <option value="LAST_MONTH">Last Month ({timelineLabels.lastMonth})</option>
                    <option value="THIS_QUARTER">This Quarter ({timelineLabels.quarter})</option>
                    <option value="THIS_YEAR">Financial Year ({timelineLabels.fy})</option>
                    <option value="ALL_TIME">All Time Records</option>
                    <option value="CUSTOM">
                      📅 {selectedTimelineFilter === "CUSTOM" ? `${customStartDate} → ${customEndDate}` : "Custom Date Range..."}
                    </option>
                  </select>
                  {selectedTimelineFilter === "CUSTOM" && (
                    <button
                      type="button"
                      onClick={() => setShowCustomDateModal(true)}
                      className="text-[10px] text-[#c2652a] underline font-bold ml-1 hover:opacity-80 cursor-pointer shrink-0"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Prominent 3-Section Core Pillar Navigation Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* REVENUES TAB */}
              {activeRole === "receptionist" ? (
                <div className="p-2.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border text-left bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed flex items-center justify-between">
                  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-1.5 sm:gap-3 min-w-0 w-full">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-gray-200 text-gray-400 shrink-0">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif font-bold text-xs sm:text-sm md:text-base text-gray-500 flex items-center justify-center sm:justify-start gap-1">
                        <span className="truncate">Revenues</span>
                        <span className="text-[8px] sm:text-[9px] bg-gray-200 text-gray-600 px-1 py-0.2 rounded-md uppercase font-bold shrink-0">Admin</span>
                      </h3>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("Revenues")}
                  className={`p-2.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    activeTab === "Revenues"
                      ? "bg-white border-[#c2652a] ring-2 ring-[#c2652a]/20 shadow-md scale-[1.01]"
                      : "bg-[#fcf9f8] border-gray-200 hover:bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-1.5 sm:gap-3 min-w-0 w-full sm:w-auto">
                    <div
                      className={`p-2 sm:p-2.5 rounded-xl transition-colors shrink-0 ${
                        activeTab === "Revenues"
                          ? "bg-[#c2652a] text-white"
                          : "bg-emerald-100 text-emerald-800 group-hover:bg-[#c2652a] group-hover:text-white"
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`font-serif font-bold text-xs sm:text-sm md:text-base truncate ${
                          activeTab === "Revenues" ? "text-[#c2652a]" : "text-gray-900"
                        }`}
                      >
                        Revenues
                      </h3>
                    </div>
                  </div>
                  {activeTab === "Revenues" && (
                    <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-[#c2652a] animate-pulse shrink-0"></span>
                  )}
                </button>
              )}

              {/* EXPENSES TAB */}
              <button
                type="button"
                onClick={() => setActiveTab("Expenses")}
                className={`p-2.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  activeTab === "Expenses"
                    ? "bg-white border-[#c2652a] ring-2 ring-[#c2652a]/20 shadow-md scale-[1.01]"
                    : "bg-[#fcf9f8] border-gray-200 hover:bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-1.5 sm:gap-3 min-w-0 w-full sm:w-auto">
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl transition-colors shrink-0 ${
                      activeTab === "Expenses"
                        ? "bg-[#c2652a] text-white"
                        : "bg-emerald-100 text-emerald-800 group-hover:bg-[#c2652a] group-hover:text-white"
                    }`}
                  >
                    <ReceiptRupeeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={`font-serif font-bold text-xs sm:text-sm md:text-base truncate ${
                        activeTab === "Expenses" ? "text-[#c2652a]" : "text-gray-900"
                      }`}
                    >
                      Expenses
                    </h3>
                  </div>
                </div>
                {activeTab === "Expenses" && (
                  <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-[#c2652a] animate-pulse shrink-0"></span>
                )}
              </button>

              {/* PARTNER SETTLEMENT TAB */}
              {activeRole === "receptionist" ? (
                <div className="p-2.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border text-left bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed flex items-center justify-between">
                  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-1.5 sm:gap-3 min-w-0 w-full">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-gray-200 text-gray-400 shrink-0">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif font-bold text-xs sm:text-sm md:text-base text-gray-500 flex items-center justify-center sm:justify-start gap-1">
                        <span className="truncate">Settlement</span>
                        <span className="text-[8px] sm:text-[9px] bg-gray-200 text-gray-600 px-1 py-0.2 rounded-md uppercase font-bold shrink-0">Admin</span>
                      </h3>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("Partner Settlement")}
                  className={`p-2.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    activeTab === "Partner Settlement"
                      ? "bg-white border-[#c2652a] ring-2 ring-[#c2652a]/20 shadow-md scale-[1.01]"
                      : "bg-[#fcf9f8] border-gray-200 hover:bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-1.5 sm:gap-3 min-w-0 w-full sm:w-auto">
                    <div
                      className={`p-2 sm:p-2.5 rounded-xl transition-colors shrink-0 ${
                        activeTab === "Partner Settlement"
                          ? "bg-[#c2652a] text-white"
                          : "bg-purple-100 text-purple-700 group-hover:bg-[#c2652a] group-hover:text-white"
                      }`}
                    >
                      <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`font-serif font-bold text-xs sm:text-sm md:text-base truncate ${
                          activeTab === "Partner Settlement" ? "text-[#c2652a]" : "text-gray-900"
                        }`}
                      >
                        <span className="sm:hidden">Settlement</span>
                        <span className="hidden sm:inline">Partner Settlement</span>
                      </h3>
                    </div>
                  </div>
                  {activeTab === "Partner Settlement" && (
                    <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-[#c2652a] animate-pulse shrink-0"></span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: REVENUES WORKSPACE (REVAMPED INDUSTRY STANDARD) */}
          {activeTab === "Revenues" && (() => {
            // 1. Calculate Pie Slices for Revenue Breakdown
            const CIRCUMFERENCE = 2 * Math.PI * 38; // ~238.761
            let accumulatedRevenueOffset = 0;

            const validStreams = [
              {
                category: "Rent Collection",
                shortName: "Rent",
                amount: revenueMetrics.rentStream,
                color: "#059669",
                icon: "🏠",
                badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
              },
              {
                category: "Security Deposit",
                shortName: "Deposit",
                amount: revenueMetrics.depositStream,
                color: "#c2652a",
                icon: "🔐",
                badgeColor: "bg-orange-50 text-[#c2652a] border-orange-200",
              },
              {
                category: "Maintenance & Utilities",
                shortName: "Maintenance",
                amount: revenueMetrics.maintenanceStream,
                color: "#2563eb",
                icon: "🧹",
                badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
              },
              {
                category: "Penalties & Damages",
                shortName: "Penalties",
                amount: revenueMetrics.penaltyDamageStream,
                color: "#9333ea",
                icon: "⚖️",
                badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
              },
            ].filter((s) => s.amount > 0);

            const totalStreamSum = validStreams.reduce((acc, s) => acc + s.amount, 0) || revenueMetrics.totalGrossRevenue || 1;

            const revenueSlices = validStreams.map((stream) => {
              const fraction = totalStreamSum > 0 ? stream.amount / totalStreamSum : 0;
              const arcLength = fraction * CIRCUMFERENCE;
              const hasMultiple = validStreams.length > 1;
              const gap = hasMultiple ? 1.5 : 0;
              const strokeDash = Math.max(0, arcLength - gap);
              const strokeGap = CIRCUMFERENCE - strokeDash;
              const offset = -accumulatedRevenueOffset;
              accumulatedRevenueOffset += arcLength;
              const percentage = Math.round(fraction * 100);

              return {
                ...stream,
                percentage,
                strokeDash,
                strokeGap,
                offset,
              };
            });

            const activeRevenueSlice = hoveredRevenueStream
              ? revenueSlices.find((s) => s.category.toLowerCase() === hoveredRevenueStream.toLowerCase())
              : null;

            // 1b. Calculate Pie Slices for Payment Channels Analytics (Always keep Cash Desk beside UPI)
            const channelCircumference = 2 * Math.PI * 38; // ~238.761
            let accumulatedChannelOffset = 0;

            const validChannels = [
              {
                channel: "Online Payments",
                shortName: "UPI",
                amount: revenueMetrics.onlineTotal || (revenueMetrics.totalGrossRevenue > 0 ? revenueMetrics.totalGrossRevenue : 0),
                color: "#059669",
                icon: "UPI",
                bgClass: "bg-emerald-50/60 border-emerald-200/60",
                iconBg: "bg-emerald-100 text-emerald-700",
                textClass: "text-emerald-700",
                tagClass: "text-emerald-700",
              },
              {
                channel: "Cash Desk",
                shortName: "Cash",
                amount: revenueMetrics.cashAmount || 0,
                color: "#c2652a",
                icon: "💵",
                bgClass: "bg-orange-50/60 border-orange-200/60",
                iconBg: "bg-orange-100 text-[#c2652a]",
                textClass: "text-[#c2652a]",
                tagClass: "text-orange-700",
              },
            ];

            const totalChannelSum = (validChannels[0].amount + validChannels[1].amount) || revenueMetrics.totalGrossRevenue || 0;
            const nonZeroChannels = validChannels.filter((c) => c.amount > 0);
            const hasMultipleNonZero = nonZeroChannels.length > 1;

            const channelSlices = validChannels.map((ch) => {
              const fraction = totalChannelSum > 0 ? ch.amount / totalChannelSum : (ch.shortName === "UPI" ? 1 : 0);
              const arcLength = fraction * channelCircumference;
              const gap = (hasMultipleNonZero && ch.amount > 0) ? 1.5 : 0;
              const strokeDash = Math.max(0, arcLength - gap);
              const strokeGap = channelCircumference - strokeDash;
              const offset = -accumulatedChannelOffset;
              if (ch.amount > 0) {
                accumulatedChannelOffset += arcLength;
              }
              const percentage = totalChannelSum > 0 ? Math.round(fraction * 100) : (ch.shortName === "UPI" ? 100 : 0);

              return {
                ...ch,
                percentage,
                strokeDash,
                strokeGap,
                offset,
              };
            });

            const activeChannelSlice = hoveredPaymentChannel
              ? channelSlices.find((s) => s.channel.toLowerCase() === hoveredPaymentChannel.toLowerCase())
              : null;

            // 2. Strict Realized Inflow Log: ONLY occupants/receipts who ACTUALLY paid (totalPaid > 0)
            interface PaidRevenueItem {
              id: string;
              date: string;
              occupantName: string;
              roomNumber: string;
              bedCode: string;
              category: string;
              paymentMode: string;
              paidTo: string;
              amount: number;
              receiptNo: string;
              stayType?: string;
            }

            const verifiedPaidItems: PaidRevenueItem[] = [];

            revenueMetrics.occupants.forEach((occ) => {
              const history = occ.paymentHistory || [];
              if (history.length > 0) {
                history.forEach((pm, idx) => {
                  if (pm.amount > 0) {
                    verifiedPaidItems.push({
                      id: `${occ.id}-pay-${idx}-${pm.receiptNo || pm.date}`,
                      date: pm.date || occ.joiningDate || "Active Cycle",
                      occupantName: occ.name,
                      roomNumber: occ.roomNumber,
                      bedCode: occ.bedCode,
                      category: (pm.month || "").toLowerCase().includes("deposit") || (pm.receiptNo || "").toLowerCase().includes("dep")
                        ? "Security Deposit"
                        : occ.stayType === "Guest"
                        ? "Guest Stay Fee"
                        : "Monthly Rent",
                      paymentMode: pm.mode || "UPI",
                      paidTo: pm.paidTo || "Main Business Account",
                      amount: pm.amount,
                      receiptNo: pm.receiptNo || `REC-${idx + 101}`,
                      stayType: occ.stayType,
                    });
                  }
                });
              } else {
                const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
                if (stmt.totalPaid > 0) {
                  verifiedPaidItems.push({
                    id: `${occ.id}-stmt-paid`,
                    date: occ.lastPaidDate || occ.joiningDate || "Active Cycle",
                    occupantName: occ.name,
                    roomNumber: occ.roomNumber,
                    bedCode: occ.bedCode,
                    category: occ.stayType === "Guest" ? "Guest Stay Fee" : "Monthly Rent",
                    paymentMode: "UPI (GPay)",
                    paidTo: "Main Business Account",
                    amount: stmt.totalPaid,
                    receiptNo: "REC-SSOT",
                    stayType: occ.stayType,
                  });
                }
              }
            });

            const complianceLogs = complianceLogStore.getLogs(propertyId);
            const { startDate, endDate, isAllTime } = resolveActiveDateBounds();

            complianceLogs.forEach((log) => {
              const logDate = parseDateToIso(log.checkOutDate, log.timestamp) || "2026-10-26";
              if (isAllTime || (logDate >= startDate && logDate <= endDate)) {
                if (log.penaltyPaid && log.penaltyPaid > 0) {
                  verifiedPaidItems.push({
                    id: `compl-${log.id}-penalty`,
                    date: logDate,
                    occupantName: log.name || "Checkout Tenant",
                    roomNumber: log.roomNumber || "—",
                    bedCode: log.bedCode || "—",
                    category: "Penalty / Damages",
                    paymentMode: "Deduction / Cash",
                    paidTo: "Property Account",
                    amount: log.penaltyPaid,
                    receiptNo: `PEN-${log.id.slice(0, 6)}`,
                  });
                }
                if (log.maintenancePaid && log.maintenancePaid > 0) {
                  verifiedPaidItems.push({
                    id: `compl-${log.id}-maint`,
                    date: logDate,
                    occupantName: log.name || "Resident",
                    roomNumber: log.roomNumber || "—",
                    bedCode: log.bedCode || "—",
                    category: "Maintenance Charge",
                    paymentMode: "Online / Cash",
                    paidTo: "Property Account",
                    amount: log.maintenancePaid,
                    receiptNo: `MNT-${log.id.slice(0, 6)}`,
                  });
                }
              }
            });

            // Also check occupants with checkoutSettlement to ensure items appear in verified list too
            const allOccupantsList = occupantStore.getOccupants(propertyId);
            allOccupantsList.forEach((occ) => {
              if (occ.checkoutSettlement) {
                const occSettleDate = parseDateToIso(occ.checkoutSettlement.settledDate || occ.vacatingDate) || "2026-10-26";
                if (isAllTime || (occSettleDate >= startDate && occSettleDate <= endDate)) {
                  const hasLog = complianceLogs.some(
                    (l) => l.occupantId === occ.id && ((l.penaltyPaid || 0) > 0 || (l.maintenancePaid || 0) > 0)
                  );
                  if (!hasLog) {
                    if (occ.checkoutSettlement.repairDeduction && occ.checkoutSettlement.repairDeduction > 0) {
                      verifiedPaidItems.push({
                        id: `occ-${occ.id}-penalty`,
                        date: occSettleDate,
                        occupantName: occ.name || "Checkout Tenant",
                        roomNumber: occ.roomNumber || "—",
                        bedCode: occ.bedCode || "—",
                        category: "Penalty / Damages",
                        paymentMode: "Deduction / Cash",
                        paidTo: "Property Account",
                        amount: occ.checkoutSettlement.repairDeduction,
                        receiptNo: `PEN-${occ.id.slice(0, 6)}`,
                      });
                    }
                    if (occ.checkoutSettlement.maintenanceDeduction && occ.checkoutSettlement.maintenanceDeduction > 0) {
                      verifiedPaidItems.push({
                        id: `occ-${occ.id}-maint`,
                        date: occSettleDate,
                        occupantName: occ.name || "Resident",
                        roomNumber: occ.roomNumber || "—",
                        bedCode: occ.bedCode || "—",
                        category: "Maintenance Charge",
                        paymentMode: "Online / Cash",
                        paidTo: "Property Account",
                        amount: occ.checkoutSettlement.maintenanceDeduction,
                        receiptNo: `MNT-${occ.id.slice(0, 6)}`,
                      });
                    }
                  }
                }
              }
            });

            // Sort by date descending
            verifiedPaidItems.sort((a, b) => (b.date > a.date ? 1 : -1));

            return (
              <div className="space-y-6 md:space-y-8 animate-in fade-in">
                {/* 1. Top 4 Revenue KPI Metrics Bento Grid (2x2 on Mobile, 4x1 on Desktop) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                  {/* KPI 1: Gross Monthly Revenue */}
                  <div className="bg-white border border-gray-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xs space-y-2 sm:space-y-3 relative overflow-hidden group hover:border-[#c2652a] transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">
                        GROSS REVENUE ({activeDateBounds.label.toUpperCase()})
                      </span>
                      <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <h2 className="font-sans font-bold text-xl sm:text-2xl lg:text-3xl text-gray-900 tracking-tight truncate">
                      ₹{revenueMetrics.totalGrossRevenue.toLocaleString("en-IN")}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <span className="bg-emerald-100 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold truncate">
                        LIVE REAL-TIME SSOT 🟢
                      </span>
                    </div>
                  </div>

                  {/* KPI 2: Rent Collection Efficiency Rate */}
                  <div className="bg-white border border-gray-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xs space-y-2 sm:space-y-3 relative overflow-hidden group hover:border-[#c2652a] transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">
                        COLLECTION EFFICIENCY
                      </span>
                      <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-50 text-blue-700 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <h2 className="font-sans font-bold text-xl sm:text-2xl lg:text-3xl text-gray-900 tracking-tight truncate">
                      {revenueMetrics.collectionEfficiency}%
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                      ₹{(revenueMetrics.rentStream / 100000).toFixed(2)}L of ₹{((revenueMetrics.rentStream + revenueMetrics.totalUncollectedArrears) / 100000).toFixed(2)}L
                    </p>
                  </div>

                  {/* KPI 3: Average Revenue Per Bed (ARPB) */}
                  <div className="bg-white border border-gray-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xs space-y-2 sm:space-y-3 relative overflow-hidden group hover:border-[#c2652a] transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">
                        AVERAGE YIELD (ARPB)
                      </span>
                      <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-orange-50 text-[#c2652a] shrink-0">
                        <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <h2 className="font-sans font-bold text-xl sm:text-2xl lg:text-3xl text-gray-900 tracking-tight truncate">
                      ₹{revenueMetrics.arpb.toLocaleString("en-IN")}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                      Per active occupant
                    </p>
                  </div>

                  {/* KPI 4: Pending Uncollected Rent Arrears */}
                  <div className="bg-white border border-gray-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xs space-y-2 sm:space-y-3 relative overflow-hidden group hover:border-amber-400 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">
                        UNCOLLECTED ARREARS
                      </span>
                      <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 shrink-0">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <h2 className="font-sans font-bold text-xl sm:text-2xl lg:text-3xl text-amber-900 tracking-tight truncate">
                      ₹{revenueMetrics.totalUncollectedArrears.toLocaleString("en-IN")}
                    </h2>
                    <span className="inline-block bg-amber-100 text-amber-900 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full truncate">
                      {revenueMetrics.occupants.filter((o) => calculateOccupantFinancialStatement(o, propertySettings).netOutstandingBalance > 0).length} Unpaid Occupants
                    </span>
                  </div>
                </div>

                {/* 2. Industry Standard Revenue Breakdown Pie Chart & Payment Channels (Side-by-side on Tablet & Desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Left: Revenue Stream Breakdown Donut Chart */}
                  <div className="bg-white border border-gray-200 p-5 sm:p-6 md:p-8 rounded-3xl shadow-xs space-y-6 flex flex-col justify-between">
                    <div className="border-b border-gray-100 pb-3">
                      <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900">
                        Revenue Stream Breakdown
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                        Categorized income distribution across estate services
                      </p>
                    </div>

                    {revenueSlices.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                          <TrendingUp className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-medium">No verified revenue logged yet for this period</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Centered Donut Chart on Top */}
                        <div className="flex justify-center py-2">
                          <div className="relative w-48 h-48 sm:w-52 sm:h-52">
                            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                              <circle
                                cx="50"
                                cy="50"
                                r="38"
                                stroke="#f3f4f6"
                                strokeWidth="12"
                                fill="transparent"
                              />
                              {revenueSlices.map((slice) => {
                                const isHovered = hoveredRevenueStream === slice.category;
                                return (
                                  <circle
                                    key={slice.category}
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    stroke={slice.color}
                                    strokeWidth={isHovered ? 16 : 12}
                                    strokeDasharray={`${slice.strokeDash} ${slice.strokeGap}`}
                                    strokeDashoffset={slice.offset}
                                    fill="transparent"
                                    className="transition-all duration-200 cursor-pointer"
                                    onMouseEnter={() => setHoveredRevenueStream(slice.category)}
                                    onMouseLeave={() => setHoveredRevenueStream(null)}
                                    onClick={() => setHoveredRevenueStream(hoveredRevenueStream === slice.category ? null : slice.category)}
                                  />
                                );
                              })}
                            </svg>

                            {/* Central Metric Display */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
                              {activeRevenueSlice ? (
                                <div className="animate-in fade-in zoom-in-95 duration-150">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block truncate max-w-[120px]">
                                    {activeRevenueSlice.category}
                                  </span>
                                  <span className="font-sans font-black text-lg text-gray-900 block leading-tight tabular-nums">
                                    ₹{activeRevenueSlice.amount.toLocaleString("en-IN")}
                                  </span>
                                  <span
                                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5"
                                    style={{ backgroundColor: `${activeRevenueSlice.color}20`, color: activeRevenueSlice.color }}
                                  >
                                    {activeRevenueSlice.percentage}% of total
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                                    TOTAL INFLOW
                                  </span>
                                  <span className="font-sans font-black text-lg text-gray-900 block leading-tight tabular-nums">
                                    ₹{revenueMetrics.totalGrossRevenue.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Revenue Streams Shown Below the Chart */}
                        <div className="space-y-2 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold px-1 uppercase tracking-wider">
                            <span>Revenue Streams by Category</span>
                            <span>Ratio & Realized Amount</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            {revenueSlices.map((slice) => {
                              const isHovered = hoveredRevenueStream === slice.category;
                              return (
                                <div
                                  key={slice.category}
                                  onClick={() => setHoveredRevenueStream(hoveredRevenueStream === slice.category ? null : slice.category)}
                                  onMouseEnter={() => setHoveredRevenueStream(slice.category)}
                                  onMouseLeave={() => setHoveredRevenueStream(null)}
                                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                    isHovered
                                      ? "bg-white border-gray-300 ring-2 ring-[#c2652a]/20 shadow-xs scale-[1.01]"
                                      : "bg-[#fcfaf9] border-gray-200/70 hover:bg-white hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs text-xs"
                                      style={{ backgroundColor: slice.color }}
                                    >
                                      {slice.icon}
                                    </div>
                                    <h4 className={`text-xs leading-snug ${isHovered ? "font-extrabold text-gray-900" : "font-bold text-gray-800"}`}>
                                      {slice.category}
                                    </h4>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-baseline justify-between gap-1">
                                    <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 tabular-nums">
                                      ₹{slice.amount.toLocaleString("en-IN")}
                                    </span>
                                    <span
                                      className="text-[10px] font-bold shrink-0 px-1.5 py-0.2 rounded-full"
                                      style={{ backgroundColor: `${slice.color}20`, color: slice.color }}
                                    >
                                      {slice.percentage}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Payment Channels Analytics Pie Chart */}
                  <div className="bg-white border border-gray-200 p-5 sm:p-6 md:p-8 rounded-3xl shadow-xs space-y-6 flex flex-col justify-between">
                    <div className="border-b border-gray-100 pb-3">
                      <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900">
                        Payment Channels Analytics
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                        Method distribution of collected payments
                      </p>
                    </div>

                    {channelSlices.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                          <Wallet className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-medium">No channel payments recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Centered Donut SVG */}
                        <div className="flex justify-center py-2">
                          <div className="relative w-48 h-48 sm:w-52 sm:h-52">
                            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                              <circle
                                cx="50"
                                cy="50"
                                r="38"
                                stroke="#f3f4f6"
                                strokeWidth="12"
                                fill="transparent"
                              />
                              {channelSlices
                                .filter((slice) => slice.amount > 0)
                                .map((slice) => {
                                  const isHovered = hoveredPaymentChannel === slice.channel;
                                  return (
                                    <circle
                                      key={slice.channel}
                                      cx="50"
                                      cy="50"
                                      r="38"
                                      stroke={slice.color}
                                      strokeWidth={isHovered ? 16 : 12}
                                      strokeDasharray={`${slice.strokeDash} ${slice.strokeGap}`}
                                      strokeDashoffset={slice.offset}
                                      fill="transparent"
                                      className="transition-all duration-200 cursor-pointer"
                                      onMouseEnter={() => setHoveredPaymentChannel(slice.channel)}
                                      onMouseLeave={() => setHoveredPaymentChannel(null)}
                                      onClick={() => setHoveredPaymentChannel(hoveredPaymentChannel === slice.channel ? null : slice.channel)}
                                    />
                                  );
                                })}
                            </svg>

                            {/* Central Metric Display */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
                              {activeChannelSlice ? (
                                <div className="animate-in fade-in zoom-in-95 duration-150">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block truncate max-w-[120px]">
                                    {activeChannelSlice.channel}
                                  </span>
                                  <span className="font-sans font-black text-lg text-gray-900 block leading-tight tabular-nums">
                                    ₹{activeChannelSlice.amount.toLocaleString("en-IN")}
                                  </span>
                                  <span
                                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5"
                                    style={{ backgroundColor: `${activeChannelSlice.color}20`, color: activeChannelSlice.color }}
                                  >
                                    {activeChannelSlice.percentage}% of total
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                                    PAYMENT MODES
                                  </span>
                                  <span className="font-sans font-black text-lg text-gray-900 block leading-tight tabular-nums">
                                    ₹{totalChannelSum.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Channel Breakdown Cards Below Chart (Side-by-side: Cash Desk beside UPI) */}
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold px-1 uppercase tracking-wider">
                            <span>Active Channels</span>
                            <span>Method Distribution</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            {channelSlices.map((slice) => {
                              const isHovered = hoveredPaymentChannel === slice.channel;
                              return (
                                <div
                                  key={slice.channel}
                                  onClick={() => setHoveredPaymentChannel(hoveredPaymentChannel === slice.channel ? null : slice.channel)}
                                  onMouseEnter={() => setHoveredPaymentChannel(slice.channel)}
                                  onMouseLeave={() => setHoveredPaymentChannel(null)}
                                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                    isHovered
                                      ? "bg-white border-gray-300 ring-2 ring-[#c2652a]/20 shadow-xs scale-[1.01]"
                                      : `${slice.bgClass} hover:bg-white hover:border-gray-300`
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs ${slice.iconBg}`}>
                                      {slice.icon}
                                    </div>
                                    <h4 className="font-bold text-xs text-gray-900 leading-snug">
                                      {slice.channel}
                                    </h4>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-baseline justify-between gap-1">
                                    <span className={`font-mono font-bold text-xs sm:text-sm ${slice.textClass}`}>
                                      ₹{slice.amount.toLocaleString("en-IN")}
                                    </span>
                                    <span className={`text-[10px] font-bold shrink-0 ${slice.tagClass}`}>
                                      {slice.percentage}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 🏦 Collections by Deposited Account / Partner */}
                          {Object.keys(revenueMetrics.accountCollections || {}).length > 0 && (
                            <div className="pt-3 border-t border-gray-100 space-y-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Collections by Deposited Account / Partner
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(revenueMetrics.accountCollections).map(([accName, accAmt]) => (
                                  <span
                                    key={accName}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-800"
                                  >
                                    <span className="text-gray-500 text-[11px]">{accName}:</span>
                                    <span className="font-mono font-bold text-gray-900">₹{accAmt.toLocaleString("en-IN")}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Verified Realized Revenue Log (Excluding Unpaid / ₹0 occupants) */}
                <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 md:p-8 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <div>
                      <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900">
                        Recent Income & Revenue Log
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                        Verified receipts and realized incoming payments for {propertySettings.propertyName || "My Property"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {verifiedPaidItems.length} VERIFIED RECEIPTS
                      </span>
                    </div>
                  </div>

                  {verifiedPaidItems.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-medium">No verified realized revenues recorded yet for this period</p>
                      <p className="text-[11px] text-gray-400">Unpaid dues appear in Uncollected Arrears above</p>
                    </div>
                  ) : (
                    <>
                      {/* 📱 MOBILE VIEW: Sleek Native Card Feed (Shows 4 receipts at a time with invisible scroll) */}
                      <div className="space-y-3 block md:hidden min-h-[420px] max-h-[420px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5 [overflow-anchor:none]">
                        {verifiedPaidItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl bg-[#fcfaf9] border border-gray-200/80 shadow-2xs space-y-2.5 transition-all hover:bg-white hover:border-gray-300"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-gray-900 truncate">
                                  {item.occupantName}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                    Rm {item.roomNumber} ({item.bedCode})
                                  </span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                    item.category.includes("Deposit")
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : "bg-orange-50 text-[#c2652a] border-orange-200"
                                  }`}>
                                    {item.category}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-extrabold text-sm text-emerald-700 block leading-tight">
                                  +₹{item.amount.toLocaleString("en-IN")}
                                </span>
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full mt-1">
                                  ✓ Verified
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-gray-200/60 font-medium">
                              <span className="font-mono text-gray-400">{item.date}</span>
                              <div className="flex items-center gap-1 text-gray-600">
                                <span>{item.paymentMode}</span>
                                <span className="text-gray-400">•</span>
                                <span className="truncate max-w-[130px]">{item.paidTo}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 💻 DESKTOP & TABLET VIEW: Full Spacious Table (Shows 4 receipts at a time with invisible scroll) */}
                      <div className="hidden md:block min-h-[340px] max-h-[340px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [overflow-anchor:none]">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50/50">
                              <th className="py-3 px-4 rounded-l-xl">Date & Time</th>
                              <th className="py-3 px-4">Resident / Source</th>
                              <th className="py-3 px-4">Room Location</th>
                              <th className="py-3 px-4">Income Category</th>
                              <th className="py-3 px-4">Payment Channel</th>
                              <th className="py-3 px-4 text-right">Amount Paid</th>
                              <th className="py-3 px-4 rounded-r-xl text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {verifiedPaidItems.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3.5 px-4 text-gray-500 font-mono">
                                  {item.date}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-gray-900">
                                  {item.occupantName}
                                </td>
                                <td className="py-3.5 px-4 text-gray-600">
                                  Room {item.roomNumber} ({item.bedCode})
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                    item.category.includes("Deposit")
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : "bg-orange-50 text-[#c2652a] border-orange-200"
                                  }`}>
                                    {item.category}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-gray-600">
                                  <div className="font-semibold text-gray-900">{item.paymentMode}</div>
                                  <div className="text-[10px] text-gray-400 font-medium">
                                    To: {item.paidTo}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono text-sm">
                                  +₹{item.amount.toLocaleString("en-IN")}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                                    ✓ Verified
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 2: EXPENSES WORKSPACE (STITCH V2 SPECIFICATION) */}
          {activeTab === "Expenses" && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in">
              {/* Pie Slice Calculations for Industry Standard Donut Chart */}
              {(() => {
                const CIRCUMFERENCE = 2 * Math.PI * 38; // ~238.761
                let accumulatedOffset = 0;

                // Robust rollup: Consolidate any duplicate or slight variations of deposit categories into single Mauve category
                const consolidatedMap = new Map<string, { category: string; amount: number; percentage: number; isDeposit: boolean }>();
                categoryWeightages.forEach((cw) => {
                  const meta = resolveCategoryMeta(cw.category);
                  const key = meta.displayName;
                  const isDeposit = key.toLowerCase().includes("deposit") || cw.category.toLowerCase().includes("deposit");
                  if (consolidatedMap.has(key)) {
                    const existing = consolidatedMap.get(key)!;
                    existing.amount += cw.amount;
                    existing.percentage = totalSpent > 0 ? Number(((existing.amount / totalSpent) * 100).toFixed(1)) : 0;
                  } else {
                    consolidatedMap.set(key, { ...cw, category: key, isDeposit });
                  }
                });
                const validWeightages = Array.from(consolidatedMap.values()).sort((a, b) => b.amount - a.amount);

                const slices = validWeightages.map((cw) => {
                  const fraction = totalSpent > 0 ? cw.amount / totalSpent : 0;
                  const arcLength = fraction * CIRCUMFERENCE;
                  const hasMultiple = validWeightages.length > 1;
                  const gap = hasMultiple ? 1.5 : 0;
                  const strokeDash = Math.max(0, arcLength - gap);
                  const strokeGap = CIRCUMFERENCE - strokeDash;
                  const offset = -accumulatedOffset;
                  accumulatedOffset += arcLength;

                  const meta = resolveCategoryMeta(cw.category);
                  const count = cw.isDeposit
                    ? expenseList.filter((e) => (e.category || "").toLowerCase().includes("deposit") || (e.category || "").toLowerCase().includes("refund")).length
                    : expenseList.filter((e) => e.category.toLowerCase() === cw.category.toLowerCase()).length;

                  return {
                    ...cw,
                    category: meta.displayName,
                    color: meta.color,
                    icon: meta.icon,
                    count,
                    strokeDash,
                    strokeGap,
                    offset,
                  };
                });

                const activeSlice = hoveredPieCategory
                  ? slices.find((s) => s.category.toLowerCase() === hoveredPieCategory.toLowerCase())
                  : null;

                return (
                  <>
                    {/* DESKTOP EXPENSE BREAKDOWN DONUT PIE BENTO CARD */}
                    <div className="hidden md:block bg-white border border-gray-200 p-6 md:p-8 rounded-3xl shadow-xs space-y-6">
                      <div className="border-b border-gray-100 pb-3">
                        <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900">
                          Expense Breakdown by Category
                        </h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                          Proportional ratio of expenses incurred in each category's assigned color
                        </p>
                      </div>

                        {slices.length === 0 ? (
                          <div className="py-12 text-center text-gray-400 space-y-2">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                              <ReceiptRupeeIcon className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-medium">No expenses logged yet for this period</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Centered Donut Chart on Top */}
                            <div className="flex justify-center py-2">
                              <div className="relative w-48 h-48">
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    stroke="#f3f4f6"
                                    strokeWidth="12"
                                    fill="transparent"
                                  />
                                  {slices.map((slice) => {
                                    const isHovered = hoveredPieCategory === slice.category;
                                    return (
                                      <circle
                                        key={slice.category}
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        stroke={slice.color}
                                        strokeWidth={isHovered ? 16 : 12}
                                        strokeDasharray={`${slice.strokeDash} ${slice.strokeGap}`}
                                        strokeDashoffset={slice.offset}
                                        fill="transparent"
                                        className="transition-all duration-200 cursor-pointer"
                                        onMouseEnter={() => setHoveredPieCategory(slice.category)}
                                        onMouseLeave={() => setHoveredPieCategory(null)}
                                        onClick={() => setHoveredPieCategory(hoveredPieCategory === slice.category ? null : slice.category)}
                                      />
                                    );
                                  })}
                                </svg>

                                {/* Central Metric Display */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
                                  {activeSlice ? (
                                    <div className="animate-in fade-in zoom-in-95 duration-150">
                                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block truncate max-w-[110px]">
                                        {activeSlice.category}
                                      </span>
                                      <span className="font-sans font-black text-lg text-gray-900 block leading-tight tabular-nums">
                                        ₹{activeSlice.amount.toLocaleString("en-IN")}
                                      </span>
                                      <span
                                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5"
                                        style={{ backgroundColor: `${activeSlice.color}20`, color: activeSlice.color }}
                                      >
                                        {activeSlice.percentage}% of total
                                      </span>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                                        TOTAL
                                      </span>
                                      <span className="font-sans font-black text-lg text-gray-900 block leading-tight tabular-nums">
                                        ₹{totalSpent.toLocaleString("en-IN")}
                                      </span>
                                      <span className="text-[9px] font-bold text-gray-400 block mt-0.5">
                                        {expenseList.length} Entries
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Current Expenses Shown Below the Chart (Standard Chart Layout) */}
                            <div className="space-y-2 pt-4 border-t border-gray-100">
                              <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold px-1 uppercase tracking-wider">
                                <span>Current Expenses by Category</span>
                                <span>Ratio & Incurred Amount</span>
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                                {slices.map((slice) => {
                                  const isHovered = hoveredPieCategory === slice.category;
                                  return (
                                    <div
                                      key={slice.category}
                                      onMouseEnter={() => setHoveredPieCategory(slice.category)}
                                      onMouseLeave={() => setHoveredPieCategory(null)}
                                      onClick={() => setHoveredPieCategory(hoveredPieCategory === slice.category ? null : slice.category)}
                                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                        isHovered
                                          ? "bg-white border-gray-300 ring-2 ring-[#c2652a]/20 shadow-xs scale-[1.01]"
                                          : "bg-[#fcfaf9] border-gray-200/70 hover:bg-white hover:border-gray-300"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                                          style={{ backgroundColor: slice.color }}
                                        >
                                          <RenderDynamicCategoryIcon iconName={slice.icon} className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                          <h4 className={`text-xs truncate ${isHovered ? "font-extrabold text-gray-900" : "font-bold text-gray-800"}`} title={slice.category}>
                                            {slice.category}
                                          </h4>
                                          <p className="text-[10px] text-gray-500 font-medium">
                                            {slice.count} {slice.count === 1 ? "entry" : "entries"}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="font-sans font-extrabold text-xs text-gray-900 tabular-nums block">
                                          ₹{slice.amount.toLocaleString("en-IN")}
                                        </span>
                                        <span
                                          className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full inline-block mt-0.5 tabular-nums"
                                          style={{ backgroundColor: `${slice.color}15`, color: slice.color }}
                                        >
                                          {slice.percentage}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    {/* MOBILE BENTO HERO CARD WITH INDUSTRY STANDARD DONUT PIE */}
                    <div className="block md:hidden bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          TOTAL SPENT ({activeDateBounds.label.toUpperCase()})
                        </span>
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          SYNCED
                        </span>
                      </div>

                      <div>
                        <h2 className="font-sans font-extrabold text-3xl text-gray-900 tracking-tight">
                          ₹{totalSpent.toLocaleString("en-IN")}
                        </h2>
                      </div>

                      {/* Industry Standard Mobile Donut Pie Diagram */}
                      <div className="pt-3 border-t border-gray-100 space-y-4">
                        <div>
                          <h3 className="font-serif font-bold text-sm text-gray-900">
                            Expenses Breakdown
                          </h3>
                        </div>

                        {slices.length === 0 ? (
                          <div className="py-8 text-center text-gray-400">
                            <p className="text-xs font-medium">No expenses logged yet</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Centered Donut SVG */}
                            <div className="flex justify-center py-1">
                              <div className="relative w-44 h-44">
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    stroke="#f3f4f6"
                                    strokeWidth="12"
                                    fill="transparent"
                                  />
                                  {slices.map((slice) => {
                                    const isHovered = hoveredPieCategory === slice.category;
                                    return (
                                      <circle
                                        key={slice.category}
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        stroke={slice.color}
                                        strokeWidth={isHovered ? 16 : 12}
                                        strokeDasharray={`${slice.strokeDash} ${slice.strokeGap}`}
                                        strokeDashoffset={slice.offset}
                                        fill="transparent"
                                        className="transition-all duration-200 cursor-pointer"
                                        onClick={() => setHoveredPieCategory(hoveredPieCategory === slice.category ? null : slice.category)}
                                      />
                                    );
                                  })}
                                </svg>

                                {/* Center Label */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
                                  {activeSlice ? (
                                    <div className="animate-in fade-in zoom-in-95 duration-150">
                                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block truncate max-w-[95px]">
                                        {activeSlice.category}
                                      </span>
                                      <span className="font-sans font-black text-sm text-gray-900 block leading-tight tabular-nums">
                                        ₹{activeSlice.amount.toLocaleString("en-IN")}
                                      </span>
                                      <span
                                        className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full inline-block mt-0.5"
                                        style={{ backgroundColor: `${activeSlice.color}20`, color: activeSlice.color }}
                                      >
                                        {activeSlice.percentage}%
                                      </span>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                                        TOTAL
                                      </span>
                                      <span className="font-sans font-black text-sm text-gray-900 block leading-tight tabular-nums">
                                        ₹{totalSpent.toLocaleString("en-IN")}
                                      </span>
                                      <span className="text-[9px] font-bold text-gray-400 block mt-0.5">
                                        {expenseList.length} Entries
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Mobile Current Expenses Shown Below the Chart */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                              <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold px-1 uppercase tracking-wider">
                                <span>Current Expenses</span>
                                <span>Ratio & Spend</span>
                              </div>

                              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                {slices.map((slice) => {
                                  const isHovered = hoveredPieCategory === slice.category;
                                  return (
                                    <div
                                      key={slice.category}
                                      onClick={() => setHoveredPieCategory(hoveredPieCategory === slice.category ? null : slice.category)}
                                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                                        isHovered
                                          ? "bg-white border-gray-300 ring-2 ring-[#c2652a]/20 shadow-xs scale-[1.01]"
                                          : "bg-[#fcfaf9] border-gray-200/70 hover:bg-white hover:border-gray-300 active:bg-gray-100"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                                          style={{ backgroundColor: slice.color }}
                                        >
                                          <RenderDynamicCategoryIcon iconName={slice.icon} className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                          <h4 className={`text-xs truncate ${isHovered ? "font-extrabold text-gray-900" : "font-bold text-gray-800"}`}>
                                            {slice.category}
                                          </h4>
                                          <p className="text-[10px] text-gray-500 font-medium">
                                            {slice.count} {slice.count === 1 ? "entry" : "entries"}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-xs font-bold text-gray-900 tabular-nums">
                                          ₹{slice.amount.toLocaleString("en-IN")}
                                        </span>
                                        <span
                                          className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md tabular-nums"
                                          style={{ backgroundColor: `${slice.color}15`, color: slice.color }}
                                        >
                                          {slice.percentage}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Expenses Sub-Tab Segment Switcher */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-gray-200 shadow-xs w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setExpensesSubTab("LEDGER")}
                    className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      expensesSubTab === "LEDGER"
                        ? "bg-[#c2652a] text-white shadow-xs"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <ReceiptRupeeIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Ledger & Recurring Bills</span>
                    <span className="sm:hidden">Ledger & Bills</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpensesSubTab("CATEGORIES")}
                    className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      expensesSubTab === "CATEGORIES"
                        ? "bg-[#c2652a] text-white shadow-xs"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Tag className="w-4 h-4" />
                    <span className="hidden sm:inline">Category Customizer ({categories.length})</span>
                    <span className="sm:hidden">Categories ({categories.length})</span>
                  </button>
                </div>
              </div>

              {/* VIEW 1: EXPENSES LEDGER & RECURRING BILLS */}
              {expensesSubTab === "LEDGER" && (
                <div className="space-y-6 md:space-y-8 animate-in fade-in">
                  {/* DESKTOP RECURRING FIXED BILLS */}
                  <div className="hidden md:block space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif font-bold text-lg text-gray-900">
                        Recurring Bills & Utilities ({recurringBillsList.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleOpenAddRecurringModal()}
                        className="text-xs font-bold text-[#c2652a] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Bill Schedule
                      </button>
                    </div>

                    <div className="flex overflow-x-auto gap-4 pb-3 scrollbar-thin snap-x">
                      {recurringBillsList.map((bill) => (
                        <div
                          key={bill.id}
                          className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3 flex flex-col justify-between shrink-0 w-72 sm:w-80 snap-start relative group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-orange-50 text-[#c2652a]">
                                {bill.icon === "Droplet" ? (
                                  <Droplet className="w-5 h-5" />
                                ) : bill.icon === "Users" ? (
                                  <Users className="w-5 h-5" />
                                ) : bill.icon === "Wifi" ? (
                                  <Wifi className="w-5 h-5" />
                                ) : bill.icon === "Fuel" ? (
                                  <Fuel className="w-5 h-5" />
                                ) : bill.icon === "Shield" ? (
                                  <Shield className="w-5 h-5" />
                                ) : (
                                  <Zap className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-gray-900">{bill.title}</h4>
                                <p className="text-[10px] text-gray-500 font-medium">{bill.dueDate}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenAddRecurringModal(bill)}
                              title="Edit Bill Details"
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="font-sans font-bold text-lg text-gray-900 tracking-tight tabular-nums">
                              ₹{bill.amount.toLocaleString("en-IN")}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRecurringModal({
                                  billId: bill.id,
                                  category: bill.category,
                                  amount: bill.amount,
                                  paidFrom: bill.paidFrom,
                                  notes: bill.notes || "",
                                  saveNewDefault: false,
                                })
                              }
                              className="text-[10px] font-extrabold text-white bg-[#c2652a] hover:bg-[#c2652a]/90 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              + Log Payment
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add New Recurring Bill Action Dash Card */}
                      <div
                        onClick={() => handleOpenAddRecurringModal()}
                        className="p-5 rounded-2xl border-2 border-dashed border-gray-300 bg-[#fcfcfc] hover:bg-white hover:border-[#c2652a] transition-all cursor-pointer flex flex-col justify-center items-center text-center space-y-2 shrink-0 w-64 snap-start group min-h-[120px]"
                      >
                        <div className="p-3 rounded-full bg-orange-50 text-[#c2652a] group-hover:scale-110 transition-transform">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-gray-900">Add Recurring Bill</h4>
                          <p className="text-[10px] text-gray-500">Setup new monthly schedule</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MOBILE RECURRING BILLS COMPACT ROW */}
                  <div className="block md:hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-bold text-base text-gray-900">
                          Recurring Bills ({recurringBillsList.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAddRecurringModal()}
                        className="text-xs font-bold text-[#c2652a] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Bill
                      </button>
                    </div>

                    <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-none snap-x -mx-1 px-1">
                      {recurringBillsList.map((bill) => (
                        <div
                          key={bill.id}
                          className="p-4 rounded-2xl bg-white border border-gray-200/90 shadow-2xs space-y-2.5 flex flex-col justify-between shrink-0 w-64 snap-start"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded-xl bg-orange-50 text-[#c2652a] shrink-0">
                                {bill.icon === "Droplet" ? (
                                  <Droplet className="w-4 h-4" />
                                ) : bill.icon === "Users" ? (
                                  <Users className="w-4 h-4" />
                                ) : bill.icon === "Wifi" ? (
                                  <Wifi className="w-4 h-4" />
                                ) : bill.icon === "Fuel" ? (
                                  <Fuel className="w-4 h-4" />
                                ) : bill.icon === "Shield" ? (
                                  <Shield className="w-4 h-4" />
                                ) : (
                                  <Zap className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-gray-900 truncate">{bill.title}</h4>
                                <p className="text-[10px] text-gray-500 font-medium">{bill.dueDate}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenAddRecurringModal(bill)}
                              title="Edit Bill Details"
                              className="p-1 rounded text-gray-400 hover:text-gray-700 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                            <span className="font-sans font-bold text-sm text-gray-900 tracking-tight tabular-nums">
                              ₹{bill.amount.toLocaleString("en-IN")}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRecurringModal({
                                  billId: bill.id,
                                  category: bill.category,
                                  amount: bill.amount,
                                  paidFrom: bill.paidFrom,
                                  notes: bill.notes || "",
                                  saveNewDefault: false,
                                })
                              }
                              className="text-[10px] font-extrabold text-white bg-[#c2652a] px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
                            >
                              + Pay
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Schedule Dash Card */}
                      <div
                        onClick={() => handleOpenAddRecurringModal()}
                        className="p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-[#fcfcfc] hover:bg-white hover:border-[#c2652a] transition-all cursor-pointer flex flex-col justify-center items-center text-center space-y-1.5 shrink-0 w-44 snap-start"
                      >
                        <div className="p-2 rounded-full bg-orange-50 text-[#c2652a]">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-gray-900">Add Schedule</h4>
                          <p className="text-[9px] text-gray-400">Monthly bill</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DESKTOP RECENT EXPENSES DETAILED TABLE SECTION (REDESIGNED MATCHING MOBILE ELEGANCE) */}
                  <div className="hidden md:block bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-4">
                      <div>
                        <h3 className="font-serif font-bold text-xl text-gray-900">
                          Operational Expenses Ledger
                        </h3>
                        <p className="text-xs text-gray-500">
                          Showing {expenseList.filter((item) => selectedCategoryFilter === "ALL" || item.category === selectedCategoryFilter).length} recorded expense transactions (Firebase Synced)
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Record Expense Button */}
                        <button
                          type="button"
                          onClick={() => setShowRecordDrawer(true)}
                          className="px-3.5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98"
                        >
                          <Plus className="w-3.5 h-3.5" /> Record Expense
                        </button>

                        {/* Export CSV Button */}
                        <button
                          type="button"
                          onClick={() => expenseStore.exportLedgerToCSV(propertyId, activeDateBounds.startDate, activeDateBounds.endDate)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-700" /> Export CSV
                        </button>

                        {/* View All Categories Included Button */}
                        <button
                          type="button"
                          onClick={() => setShowCategoryDirectoryModal(true)}
                          className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          🏷️ Categories ({categories.length})
                        </button>
                      </div>
                    </div>

                    {/* Desktop Smooth-Scroll Horizontal Filter Pills Bar (Matching Mobile UX) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-gray-400 font-bold px-0.5">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-gray-400">
                          <Filter className="w-3.5 h-3.5 text-gray-400" /> Filter by Category:
                        </span>
                        {selectedCategoryFilter !== "ALL" && (
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryFilter("ALL")}
                            className="text-xs text-[#c2652a] font-extrabold hover:underline cursor-pointer"
                          >
                            Reset to ALL
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth">
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryFilter("ALL")}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            selectedCategoryFilter === "ALL"
                              ? "bg-[#c2652a] text-white shadow-2xs"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          ALL ({expenseList.length})
                        </button>
                        {categories.map((c) => {
                          const count = expenseList.filter((item) => item.category.toLowerCase() === c.name.toLowerCase()).length;
                          const isSelected = selectedCategoryFilter === c.name;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setSelectedCategoryFilter(c.name)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-[#c2652a] text-white shadow-2xs"
                                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs"
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: c.color || "#c2652a" }}
                              />
                              <span>{c.name}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                                isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expenses Table (Shows 4 receipts at a time with invisible scroll) */}
                    <div className="overflow-x-auto min-h-[340px] max-h-[340px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [overflow-anchor:none]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold bg-[#fcf9f8]">
                            <th className="py-3 px-4 font-bold">DATE</th>
                            <th className="py-3 px-4 font-bold">CATEGORY</th>
                            <th className="py-3 px-4 font-bold">PAID BY</th>
                            <th className="py-3 px-4 font-bold">PROPERTY</th>
                            <th className="py-3 px-4 font-bold">AMOUNT</th>
                            <th className="py-3 px-4 font-bold">RECEIPT</th>
                            <th className="py-3 px-4 font-bold text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {expenseList
                            .filter((item) => selectedCategoryFilter === "ALL" || item.category === selectedCategoryFilter)
                            .map((exp) => (
                              <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-4 text-gray-500 font-medium">{exp.date}</td>
                                <td className="py-4 px-4 font-bold text-gray-900">
                                  {(() => {
                                    const meta = resolveCategoryMeta(exp.category);

                                    return (
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="p-1.5 rounded-lg text-white font-bold flex items-center justify-center shrink-0 shadow-2xs"
                                          style={{ backgroundColor: meta.color }}
                                        >
                                          <RenderDynamicCategoryIcon iconName={meta.icon} className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="font-bold text-gray-900">{meta.displayName}</span>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="py-4 px-4">
                                  <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-[#c2652a] text-white text-[9px] font-bold flex items-center justify-center">
                                      {exp.paidFrom.charAt(0)}
                                    </span>
                                    {exp.paidFrom}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-gray-500">{exp.property}</td>
                                <td className="py-4 px-4 font-sans font-bold text-sm text-gray-900 tabular-nums">
                                  ₹{exp.amount.toLocaleString("en-IN")}
                                </td>
                                <td className="py-4 px-4">
                                  {exp.hasReceipt ? (
                                    <button
                                      type="button"
                                      onClick={() => setActiveReceiptModal(exp)}
                                      className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-bold text-[10px] flex items-center gap-1 hover:bg-purple-100 transition-colors cursor-pointer"
                                    >
                                      <FileText className="w-3 h-3 text-purple-700" /> View Receipt
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 font-medium">—</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                    title="Delete Expense"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* MOBILE REDESIGNED OPERATIONAL EXPENSES LEDGER (STITCH-DESIGNED CARD FEED + SMOOTH PILL FILTER) */}
                  <div className="block md:hidden bg-white rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4">
                    {/* Mobile Header: Title on single line, followed by clean sleek slim action buttons */}
                    <div className="pb-2.5 border-b border-gray-100 space-y-2">
                      <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 leading-tight">
                        Expenses Ledger
                      </h3>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRecordDrawer(true)}
                          className="w-full h-8 py-1 px-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Record Expense</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => expenseStore.exportLedgerToCSV(propertyId, activeDateBounds.startDate, activeDateBounds.endDate)}
                          className="w-full h-8 py-1 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98 whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Mobile Smooth-Scroll Horizontal Filter Pills Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold px-0.5">
                        <span className="flex items-center gap-1 uppercase tracking-wider text-[9px] text-gray-400">
                          <Filter className="w-3 h-3 text-gray-400" /> Filter by Category:
                        </span>
                        {selectedCategoryFilter !== "ALL" && (
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryFilter("ALL")}
                            className="text-[10px] text-[#c2652a] font-extrabold hover:underline cursor-pointer"
                          >
                            Reset to ALL
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 scroll-smooth">
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryFilter("ALL")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            selectedCategoryFilter === "ALL"
                              ? "bg-[#c2652a] text-white shadow-2xs"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          ALL ({expenseList.length})
                        </button>
                        {categories.map((c) => {
                          const count = expenseList.filter((item) => item.category.toLowerCase() === c.name.toLowerCase()).length;
                          const isSelected = selectedCategoryFilter === c.name;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setSelectedCategoryFilter(c.name)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-[#c2652a] text-white shadow-2xs"
                                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs"
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: c.color || "#c2652a" }}
                              />
                              <span>{c.name}</span>
                              <span className={`text-[10px] font-semibold px-1 rounded-full ${
                                isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile Tactile Expense Cards Feed (Shows 4 receipts at a time with invisible scroll & zero layout jerk) */}
                    <div className="space-y-3 pt-1 min-h-[460px] max-h-[460px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5 [overflow-anchor:none]">
                      {expenseList.filter((item) => selectedCategoryFilter === "ALL" || item.category === selectedCategoryFilter).length === 0 ? (
                        <div className="min-h-[420px] flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl bg-gray-50/70 border border-dashed border-gray-200 space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#c2652a] flex items-center justify-center mx-auto shadow-2xs">
                            <ReceiptRupeeIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900">No Expenses Found</h4>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto mt-0.5">
                              {selectedCategoryFilter === "ALL"
                                ? "No operational expenses logged yet for this period."
                                : `No expenses logged under "${selectedCategoryFilter}".`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowRecordDrawer(true)}
                            className="px-4 py-2 rounded-xl bg-[#c2652a] text-white font-bold text-xs shadow-xs hover:bg-[#a3521e] transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" /> Record New Expense
                          </button>
                        </div>
                      ) : (
                        expenseList
                          .filter((item) => selectedCategoryFilter === "ALL" || item.category === selectedCategoryFilter)
                          .map((exp) => {
                            const meta = resolveCategoryMeta(exp.category);

                            return (
                              <div
                                key={exp.id}
                                className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-2xs space-y-3 transition-all hover:border-gray-300 active:bg-gray-50/50"
                              >
                                {/* Top Row: Category Icon + Title + Date | Amount */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center shrink-0 shadow-2xs"
                                      style={{ backgroundColor: meta.color }}
                                    >
                                      <RenderDynamicCategoryIcon iconName={meta.icon} className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-sm text-gray-900 truncate">{meta.displayName}</h4>
                                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
                                        <span>{exp.date}</span>
                                        {exp.property && (
                                          <>
                                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                                            <span className="truncate max-w-[120px]">{exp.property}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="font-sans font-extrabold text-base text-gray-900 tabular-nums block">
                                      ₹{exp.amount.toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                      Logged
                                    </span>
                                  </div>
                                </div>

                                {/* Bottom Row: Paid By + Action Buttons */}
                                <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-xs">
                                  <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                                    <span className="w-5 h-5 rounded-full bg-[#c2652a]/10 text-[#c2652a] text-[9px] font-extrabold flex items-center justify-center shrink-0">
                                      {exp.paidFrom ? exp.paidFrom.charAt(0) : "P"}
                                    </span>
                                    <span className="font-medium text-[11px] text-gray-700 truncate max-w-[140px]">
                                      {exp.paidFrom || "Business Account"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {exp.hasReceipt && (
                                      <button
                                        type="button"
                                        onClick={() => setActiveReceiptModal(exp)}
                                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                      >
                                        <FileText className="w-3 h-3 text-purple-700" /> Receipt
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteExpense(exp.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                      title="Delete Expense"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {exp.notes && (
                                  <p className="text-[11px] text-gray-600 bg-gray-50/80 rounded-xl p-2.5 border border-gray-100 italic">
                                    "{exp.notes}"
                                  </p>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: CLEAN ACTIVE CATEGORIES DIRECTORY */}
              {expensesSubTab === "CATEGORIES" && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-5">
                      <div>
                        <h3 className="font-serif font-bold text-xl sm:text-2xl text-gray-900 flex items-center gap-2">
                          <span>🏷️ Operational Expense Categories ({categories.length})</span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Standard building categories with in-place rename and 1-tap custom category addition
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryName("");
                          setShowAddCategoryModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add New Category</span>
                      </button>
                    </div>

                    {/* Full-Width Grid of Categories */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categories.map((cat) => {
                        const catExpenses = expenseList.filter((e) => e.category === cat.name);
                        const catTotal = catExpenses.reduce((a, b) => a + b.amount, 0);

                        return (
                          <div
                            key={cat.id}
                            className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 shadow-xs hover:shadow-sm transition-all space-y-3 flex flex-col justify-between group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="p-2.5 rounded-xl text-white font-bold shadow-xs flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: cat.color || "#475569" }}
                                >
                                  <RenderDynamicCategoryIcon
                                    iconName={cat.icon || "Receipt"}
                                    className="w-5 h-5 text-white"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-bold text-sm text-gray-900 truncate" title={cat.name}>
                                      {cat.name}
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCategory(cat);
                                        setRenameCategoryName(cat.name);
                                      }}
                                      className="p-1 rounded text-gray-400 hover:text-[#c2652a] hover:bg-orange-50 cursor-pointer transition-colors"
                                      title="Rename Category"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-gray-400 font-medium">
                                    {catExpenses.length} Logged Transactions
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="border-t border-gray-100 pt-2.5 flex justify-between items-center">
                              <span className="text-[10px] text-gray-500 font-medium">Total Spend</span>
                              <span className="font-sans font-bold text-[#c2652a] text-sm tabular-nums">
                                ₹{catTotal.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt View Lightbox Modal */}
              {activeReceiptModal && (
                <div
                  className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                  onClick={() => setActiveReceiptModal(null)}
                >
                  <div
                    className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-700" />
                        <h3 className="font-serif font-bold text-lg text-gray-900">
                          Expense Receipt Details
                        </h3>
                      </div>
                      <button
                        onClick={() => setActiveReceiptModal(null)}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Category:</span>
                        <span className="font-bold text-gray-900">{activeReceiptModal.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Date:</span>
                        <span className="font-bold text-gray-900">{activeReceiptModal.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Amount:</span>
                        <span className="font-sans font-bold text-base text-[#c2652a] tabular-nums">
                          ₹{activeReceiptModal.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Paid By:</span>
                        <span className="font-bold text-gray-900">{activeReceiptModal.paidFrom}</span>
                      </div>
                      {activeReceiptModal.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-gray-500 font-bold block mb-1">Notes:</span>
                          <p className="text-gray-700 italic">{activeReceiptModal.notes}</p>
                        </div>
                      )}
                      {activeReceiptModal.receiptUrl && (
                        <div className="pt-3 border-t border-gray-200 space-y-2">
                          <span className="text-gray-900 font-bold block">Uploaded Receipt File:</span>
                          {activeReceiptModal.receiptUrl.startsWith("data:image") ? (
                            <img
                              src={activeReceiptModal.receiptUrl}
                              alt="Expense Receipt"
                              className="max-h-56 w-full object-contain rounded-xl border border-gray-200 bg-white"
                            />
                          ) : (
                            <a
                              href={activeReceiptModal.receiptUrl}
                              download={activeReceiptModal.receiptName || "receipt.pdf"}
                              className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs inline-flex items-center gap-2 hover:bg-purple-700 transition-colors"
                            >
                              <FileText className="w-4 h-4" /> Download Receipt File ({activeReceiptModal.receiptName || "PDF"})
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setActiveReceiptModal(null)}
                        className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Record Expense Modal Drawer inside Expenses Tab (Image 02 Structure) */}
              {showRecordDrawer && (
                <div
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                  onClick={() => setShowRecordDrawer(false)}
                >
                  <div
                    className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div>
                        <h3 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2">
                          <ReceiptRupeeIcon className="w-5 h-5 text-[#c2652a]" /> Record Operational Expense
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Log building costs, utility bills, or staff salaries in seconds
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRecordDrawer(false)}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveExpense} className="space-y-5 text-xs">
                      {/* SECTION 1: Amount & Category */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-gray-900 mb-1">
                            Amount *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-gray-500 font-bold">
                              ₹
                            </span>
                            <input
                              type="number"
                              required
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="Enter expense amount"
                              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white font-sans font-bold text-sm text-gray-900 focus:ring-1 focus:ring-[#c2652a] tabular-nums"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block font-bold text-gray-900">
                              Category *
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                              className="text-[11px] font-bold text-[#c2652a] hover:underline cursor-pointer"
                            >
                              {isAddingNewCategory ? "← Back to select" : "+ New Category"}
                            </button>
                          </div>

                          {isAddingNewCategory ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={newCategoryInput}
                                onChange={(e) => setNewCategoryInput(e.target.value)}
                                placeholder="Category name (e.g. Generator Fuel)"
                                className="w-full px-3 py-2 rounded-xl border border-[#c2652a] bg-orange-50/40 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                              />
                              <button
                                type="button"
                                onClick={handleCreateInlineCategory}
                                className="px-3 py-2 rounded-xl bg-[#c2652a] text-white font-bold text-xs shrink-0 cursor-pointer hover:bg-[#c2652a]/90 shadow-xs"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <div
                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 cursor-pointer flex items-center justify-between hover:border-[#c2652a] transition-all"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="p-1 rounded-lg text-white font-bold flex items-center justify-center shrink-0"
                                    style={{
                                      backgroundColor:
                                        categories.find((c) => c.name === category)?.color || "#c2652a",
                                    }}
                                  >
                                    <RenderDynamicCategoryIcon
                                      iconName={
                                        categories.find((c) => c.name === category)?.icon || "Wrench"
                                      }
                                      className="w-3.5 h-3.5 text-white"
                                    />
                                  </div>
                                  <span className="font-bold text-gray-900">{category}</span>
                                </div>
                                <span className="text-gray-400 text-[10px]">▼</span>
                              </div>

                              {isCategoryDropdownOpen && (
                                <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1 animate-in fade-in">
                                  {categories.map((cat) => (
                                    <div
                                      key={cat.id}
                                      onClick={() => {
                                        setCategory(cat.name);
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      className={`p-2 rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-orange-50 transition-colors ${
                                        category === cat.name ? "bg-orange-50 font-bold border border-[#c2652a]/30" : ""
                                      }`}
                                    >
                                      <div
                                        className="p-1.5 rounded-lg text-white font-bold flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: cat.color || "#c2652a" }}
                                      >
                                        <RenderDynamicCategoryIcon iconName={cat.icon} className="w-3.5 h-3.5 text-white" />
                                      </div>
                                      <span className="text-xs text-gray-900 font-bold">{cat.name}</span>
                                    </div>
                                  ))}
                                  <div
                                    onClick={() => {
                                      setIsAddingNewCategory(true);
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className="p-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-orange-100 text-[#c2652a] font-bold border-t border-gray-100 text-xs"
                                  >
                                    <span>+ Add Custom Category...</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECTION 2: Paid From Account & Expense Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-gray-900 mb-1">
                            Paid From Account *
                          </label>
                          <ThemedAccountSelect
                            value={paidFrom}
                            onChange={(val) => setPaidFrom(val)}
                            accounts={paymentAccounts}
                            partners={partners}
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-gray-900 mb-1">
                            Expense Date *
                          </label>
                          <input
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                          />
                        </div>
                      </div>

                      {/* SECTION 3: Receipt Attachment Upload Dropzone (Image 02) */}
                      <div>
                        <label className="block font-bold text-gray-900 mb-1">
                          Receipt Attachment (Optional)
                        </label>
                        {receiptFile ? (
                          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-gray-900 text-xs truncate block">
                                  {receiptFile.fileName}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-medium">
                                  {receiptFile.size} • Attached & Ready
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReceiptFile(null)}
                              className="p-1.5 rounded-lg hover:bg-emerald-100 text-red-600 font-bold text-xs cursor-pointer"
                              title="Remove Receipt"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center bg-gray-50 cursor-pointer hover:border-[#c2652a] hover:bg-orange-50/40 transition-colors block">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handleReceiptUpload}
                              className="hidden"
                            />
                            <Upload className="w-5 h-5 text-[#c2652a] mx-auto mb-1" />
                            <span className="font-bold text-gray-900 block text-xs">
                              Click to upload receipt
                            </span>
                            <span className="text-[10px] text-gray-500">
                              JPG, PNG, WEBP, PDF (Max 5MB)
                            </span>
                          </label>
                        )}
                      </div>

                      {/* SECTION 4: Notes / Description */}
                      <div>
                        <label className="block font-bold text-gray-900 mb-1">
                          Notes / Description (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add details (vendor name, invoice number, etc)..."
                          className="w-full p-3 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        ></textarea>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowRecordDrawer(false)}
                          className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                        >
                          Save Expense
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Recurring Bill Confirmation Modal */}
              {recurringModal && (
                <div
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                  onClick={() => setRecurringModal(null)}
                >
                  <div
                    className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-[#c2652a]" /> Confirm Recurring Bill Payment
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Review and confirm logging this monthly operational bill
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecurringModal(null)}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-orange-50/40 border border-orange-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-500">Bill Category:</span>
                        <span className="font-bold text-gray-900 text-sm">{recurringModal.category}</span>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-gray-900">
                            Payment Amount (₹) *
                          </label>
                          <span className="text-[10px] font-semibold text-[#c2652a]">
                            ✏️ Editable (Price Increase/Discount)
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-gray-500 font-bold">
                            ₹
                          </span>
                          <input
                            type="number"
                            required
                            value={recurringModal.amount || ""}
                            onChange={(e) =>
                              setRecurringModal({
                                ...recurringModal,
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="Enter payment amount"
                            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#c2652a] bg-white font-sans font-bold text-base text-gray-900 focus:ring-1 focus:ring-[#c2652a] tabular-nums"
                          />
                        </div>
                      </div>

                      {recurringModal.billId && (
                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!recurringModal.saveNewDefault}
                            onChange={(e) =>
                              setRecurringModal({
                                ...recurringModal,
                                saveNewDefault: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded text-[#c2652a] focus:ring-[#c2652a]"
                          />
                          <span className="text-[11px] font-semibold text-gray-700">
                            Save ₹{recurringModal.amount.toLocaleString("en-IN")} as new default amount for future months
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-gray-900 mb-1">
                          Paid From Account *
                        </label>
                        <ThemedAccountSelect
                          value={recurringModal.paidFrom}
                          onChange={(val) =>
                            setRecurringModal({ ...recurringModal, paidFrom: val })
                          }
                          accounts={paymentAccounts}
                          partners={partners}
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-900 mb-1">
                          Payment Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={recurringModal.notes}
                          onChange={(e) =>
                            setRecurringModal({ ...recurringModal, notes: e.target.value })
                          }
                          placeholder="Reference / invoice note..."
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setRecurringModal(null)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmRecurringBill}
                        className="flex-1 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        Confirm & Log Payment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PARTNER SETTLEMENT & CASHFLOW HUB */}
          {activeTab === "Partner Settlement" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Main Content Left (Partner Switcher, Stat Cards, Settlement Overview / Partner Detail Ledger) */}
              <div className="lg:col-span-8 space-y-8">
                {/* 1. PARTNER AVATAR & LOGO SWITCHER BAR */}
                <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#c2652a]" />
                        Partner Cashflow & Ledger Switcher
                      </h3>
                      <p className="text-xs text-gray-500">
                        Audit real-time inflows (Paid To) and outflows (Paid From) per partner
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        📅 {resolveActiveDateBounds().label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                    {/* Option 0: All Partners (Overview) */}
                    <button
                      type="button"
                      onClick={() => setSelectedPartnerId(null)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left shrink-0 cursor-pointer ${
                        selectedPartnerId === null
                          ? "bg-[#c2652a]/10 border-[#c2652a] text-[#c2652a] shadow-xs ring-2 ring-[#c2652a]/20"
                          : "bg-gray-50/70 hover:bg-gray-100 border-gray-200 text-gray-700"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c2652a] to-[#964407] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs">All Partners (Overview)</div>
                        <div className="text-[10px] text-gray-500 font-medium">
                          Net: ₹{Math.max(0, revenueMetrics.totalGrossRevenue - totalSpent).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </button>

                    {/* Individual Partners */}
                    {partners.map((p) => {
                      const rentCollected = revenueMetrics.partnerRentCollections?.[p.name] || 0;
                      const actualPaid = partnerContributions[p.name] || 0;
                      const isSelected = selectedPartnerId === p.id;
                      const netCashInHand = rentCollected - actualPaid;
                      const totalNetProfit = Math.max(0, revenueMetrics.totalGrossRevenue - totalSpent);
                      const profitShare = Math.round((totalNetProfit * (p.ownershipPercentage || 0)) / 100);
                      const netSettlement = profitShare - netCashInHand;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPartnerId(p.id)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left shrink-0 cursor-pointer ${
                            isSelected
                              ? "bg-white border-[#c2652a] text-gray-900 shadow-sm ring-2 ring-[#c2652a]/30"
                              : "bg-white hover:bg-gray-50/80 border-gray-200 text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <div className="relative shrink-0">
                            {p.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.avatarUrl}
                                alt={p.name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-xs shadow-xs"
                                style={{ backgroundColor: p.color || "#c2652a" }}
                              >
                                {p.name.charAt(0)}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                netSettlement > 0 ? "bg-emerald-500" : netSettlement < 0 ? "bg-rose-500" : "bg-gray-400"
                              }`}
                              title={netSettlement > 0 ? "Receivable" : netSettlement < 0 ? "Payable" : "Settled"}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-gray-900">{p.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 font-mono font-bold text-gray-600">
                                {p.ownershipPercentage}%
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                              <span className="text-emerald-700 font-bold">In: ₹{rentCollected.toLocaleString("en-IN")}</span>
                              <span>•</span>
                              <span className="text-rose-700 font-bold">Out: ₹{actualPaid.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CONDITIONAL VIEW: ALL PARTNERS OVERVIEW vs INDIVIDUAL PARTNER DRILLDOWN */}
                {selectedPartnerId === null ? (
                  <>
                    {/* Financial Summary Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Stat Card 1 */}
                      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Gross Revenue Collected
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <Wallet className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="font-sans font-bold text-2xl text-gray-900 tracking-tight tabular-nums">
                          ₹{revenueMetrics.totalGrossRevenue.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1.5 flex items-center gap-1">
                          Live Real-Time SSOT
                        </p>
                      </div>

                      {/* Stat Card 2 */}
                      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Total Expenses
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#c2652a] flex items-center justify-center">
                            <ReceiptRupeeIcon className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="font-sans font-bold text-2xl text-gray-900 tracking-tight tabular-nums">
                          ₹{totalSpent.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1.5 flex items-center gap-1">
                          Firebase Live
                        </p>
                      </div>

                      {/* Stat Card 3 */}
                      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Net Profit
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="font-sans font-bold text-2xl text-gray-900 tracking-tight tabular-nums">
                          ₹{Math.max(0, revenueMetrics.totalGrossRevenue - totalSpent).toLocaleString("en-IN")}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1.5 flex items-center gap-1">
                          Calculated Yield
                        </p>
                      </div>

                      {/* Stat Card 4 */}
                      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Profit Margin
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Building2 className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="font-sans font-bold text-2xl text-gray-900 tracking-tight tabular-nums">
                          {revenueMetrics.totalGrossRevenue > 0
                            ? (((revenueMetrics.totalGrossRevenue - totalSpent) / revenueMetrics.totalGrossRevenue) * 100).toFixed(1)
                            : "0.0"}%
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1.5 flex items-center gap-1">
                          Live Ratio
                        </p>
                      </div>
                    </div>

                    {/* Partner Settlement Overview Table Section */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-100 pb-4">
                        <div>
                          <h3 className="font-serif font-bold text-xl text-gray-900">
                            Partner Settlement Overview
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Net profit allocation matrix & partner reimbursement tracking
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto scrollbar-thin pb-2 -mx-2 sm:mx-0">
                        {partners.length === 0 ? (
                          <div className="py-12 text-center text-xs text-gray-500">
                            No partner equity profiles configured yet. Configure partner profit sharing in Property Settings.
                          </div>
                        ) : (
                          <table className="w-full min-w-[860px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold bg-[#fcf9f8]">
                                <th className="py-3 px-3 font-bold">Partner</th>
                                <th className="py-3 px-3 font-bold text-center">Equity %</th>
                                <th className="py-3 px-3 font-bold">Rent Collected</th>
                                <th className="py-3 px-3 font-bold">Paid Out-Of-Pocket</th>
                                <th className="py-3 px-3 font-bold">Net Cash in Hand</th>
                                <th className="py-3 px-3 font-bold">Profit Share</th>
                                <th className="py-3 px-3 font-bold">Net Settlement</th>
                                <th className="py-3 px-3 font-bold text-center">Status</th>
                                <th className="py-3 px-3 font-bold text-right">Audit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {partners.map((p) => {
                                const totalNetProfit = Math.max(0, revenueMetrics.totalGrossRevenue - totalSpent);
                                const profitShare = Math.round((totalNetProfit * (p.ownershipPercentage || 0)) / 100);
                                const rentCollected = revenueMetrics.partnerRentCollections?.[p.name] || 0;
                                const actualPaid = partnerContributions[p.name] || 0;
                                const netCashInHand = rentCollected - actualPaid;
                                const netSettlement = profitShare - netCashInHand;

                                return (
                                  <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                                    <td className="py-4 px-3 font-bold flex items-center gap-2.5 text-gray-900 whitespace-nowrap">
                                      {p.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={p.avatarUrl}
                                          alt={p.name}
                                          className="w-7 h-7 rounded-full object-cover border border-gray-200 shadow-2xs shrink-0"
                                        />
                                      ) : (
                                        <span
                                          className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs"
                                          style={{ backgroundColor: p.color || "#c2652a" }}
                                        >
                                          {p.name.charAt(0)}
                                        </span>
                                      )}
                                      <div>
                                        <div>{p.name}</div>
                                        <div className="text-[10px] text-gray-400 font-normal">{p.accountType || "Partner"}</div>
                                      </div>
                                    </td>
                                    <td className="py-4 px-3 text-gray-500 font-sans font-bold tabular-nums text-center whitespace-nowrap">
                                      {p.ownershipPercentage}%
                                    </td>
                                    <td className="py-4 px-3 text-gray-900 font-sans font-semibold tabular-nums whitespace-nowrap">
                                      ₹{rentCollected.toLocaleString("en-IN")}
                                    </td>
                                    <td className="py-4 px-3 text-gray-700 font-sans font-semibold tabular-nums whitespace-nowrap">
                                      ₹{actualPaid.toLocaleString("en-IN")}
                                    </td>
                                    <td className="py-4 px-3 whitespace-nowrap">
                                      <span className={`font-mono font-bold text-xs ${
                                        netCashInHand > 0
                                          ? "text-amber-800"
                                          : netCashInHand < 0
                                          ? "text-purple-800"
                                          : "text-gray-500"
                                      }`}>
                                        {netCashInHand >= 0 ? `+₹${netCashInHand.toLocaleString("en-IN")}` : `-₹${Math.abs(netCashInHand).toLocaleString("en-IN")}`}
                                      </span>
                                      <span className="block text-[9px] text-gray-400">
                                        {netCashInHand > 0 ? "Holding PG Cash" : netCashInHand < 0 ? "Excess Spent" : "Balanced"}
                                      </span>
                                    </td>
                                    <td className="py-4 px-3 font-sans font-bold text-gray-900 tabular-nums whitespace-nowrap">
                                      ₹{profitShare.toLocaleString("en-IN")}
                                    </td>
                                    <td className={`py-4 px-3 font-sans font-bold tabular-nums whitespace-nowrap ${
                                      netSettlement > 0 ? "text-[#059669]" : netSettlement < 0 ? "text-red-600" : "text-gray-600"
                                    }`}>
                                      {netSettlement > 0
                                        ? `+₹${netSettlement.toLocaleString("en-IN")}`
                                        : netSettlement < 0
                                        ? `-₹${Math.abs(netSettlement).toLocaleString("en-IN")}`
                                        : "₹0"}
                                    </td>
                                    <td className="py-4 px-3 text-center whitespace-nowrap">
                                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        netSettlement > 0
                                          ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                          : netSettlement < 0
                                          ? "bg-red-100 text-red-900 border border-red-200"
                                          : "bg-gray-100 text-gray-700 border border-gray-200"
                                      }`}>
                                        {netSettlement > 0 ? "Receivable 🟢" : netSettlement < 0 ? "Payable 🔴" : "Settled ⚪"}
                                      </span>
                                    </td>
                                    <td className="py-4 px-3 text-right whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPartnerId(p.id)}
                                        className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-[#c2652a] text-[#c2652a] hover:text-white font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                                        title="View full Inflow & Outflow statement for this partner"
                                      >
                                        Ledger <ArrowUpRight className="w-3 h-3" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                        <span className="text-sm shrink-0">💡</span>
                        <span>
                          <strong>Partner Dual-Ledger Equation:</strong> Final Settlement = Profit Share − (Rent Collected into Personal Account − Out-Of-Pocket Expenses). Partners holding excess collected rent pay into the pool; partners with pending profit share or out-of-pocket expenses receive from the pool.
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* 3. INDIVIDUAL PARTNER DRILLDOWN VIEW */
                  (() => {
                    const activePartner = partners.find((p) => p.id === selectedPartnerId) || partners[0];
                    const partnerInflows = revenueMetrics.partnerInflowItems?.[activePartner.name] || [];
                    const partnerOutflows = partnerOutflowItems[activePartner.name] || [];
                    const rentCollected = revenueMetrics.partnerRentCollections?.[activePartner.name] || 0;
                    const actualPaid = partnerContributions[activePartner.name] || 0;
                    const netCashInHand = rentCollected - actualPaid;
                    const totalNetProfit = Math.max(0, revenueMetrics.totalGrossRevenue - totalSpent);
                    const profitShare = Math.round((totalNetProfit * (activePartner.ownershipPercentage || 0)) / 100);
                    const netSettlement = profitShare - netCashInHand;

                    return (
                      <div className="space-y-6">
                        {/* Partner Spotlight Header Card */}
                        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 shadow-xs">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-5">
                            <div className="flex items-center gap-4">
                              {activePartner.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={activePartner.avatarUrl}
                                  alt={activePartner.name}
                                  className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                                />
                              ) : (
                                <div
                                  className="w-14 h-14 rounded-2xl text-white font-bold flex items-center justify-center text-xl shadow-md shrink-0"
                                  style={{ backgroundColor: activePartner.color || "#c2652a" }}
                                >
                                  {activePartner.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-serif font-bold text-2xl text-gray-900">
                                    {activePartner.name}
                                  </h3>
                                  <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#c2652a] font-mono font-bold text-xs">
                                    {activePartner.ownershipPercentage}% Equity Share
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                  <span>{activePartner.accountType || "Partner Personal Account"}</span>
                                  {activePartner.phone && <span>• 📞 {activePartner.phone}</span>}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center flex-wrap gap-2.5">
                              <button
                                type="button"
                                onClick={() => sendPartnerWhatsAppSummary(activePartner)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Share formatted summary to Partner's WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Summary
                              </button>
                              <button
                                type="button"
                                onClick={() => exportPartnerLedgerToCSV(activePartner)}
                                className="px-3.5 py-2 rounded-xl border border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Export detailed dual-ledger to CSV"
                              >
                                <Download className="w-3.5 h-3.5" /> Export CSV
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedPartnerId(null)}
                                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all cursor-pointer"
                              >
                                ✕ All Partners
                              </button>
                            </div>
                          </div>

                          {/* 3 Focused Metric Cards for this Partner */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                            {/* Card 1: Inflow */}
                            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                  Rent Inflow (Paid To)
                                </span>
                                <span className="text-xs">🟢</span>
                              </div>
                              <p className="font-sans font-bold text-2xl text-emerald-950 tabular-nums">
                                ₹{rentCollected.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[11px] text-emerald-800 font-medium mt-1">
                                {partnerInflows.length} payment receipts received
                              </p>
                            </div>

                            {/* Card 2: Outflow */}
                            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                                  Expenses (Paid From)
                                </span>
                                <span className="text-xs">🔴</span>
                              </div>
                              <p className="font-sans font-bold text-2xl text-rose-950 tabular-nums">
                                ₹{actualPaid.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[11px] text-rose-800 font-medium mt-1">
                                {partnerOutflows.length} out-of-pocket bills paid
                              </p>
                            </div>

                            {/* Card 3: Net Cash in Hand */}
                            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                                  Net Cash in Hand
                                </span>
                                <span className="text-xs">⚖️</span>
                              </div>
                              <p className="font-sans font-bold text-2xl text-purple-950 tabular-nums">
                                ₹{netCashInHand.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[11px] text-purple-800 font-medium mt-1">
                                {netCashInHand > 0 ? "Holding PG Operating Cash" : netCashInHand < 0 ? "Excess Out-of-Pocket Spent" : "Cash Position Balanced"}
                              </p>
                            </div>
                          </div>

                          {/* Parity & Settlement Guidance Banner */}
                          <div className={`mt-5 p-4 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                            netSettlement > 0
                              ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                              : netSettlement < 0
                              ? "bg-rose-50/90 border-rose-200 text-rose-950"
                              : "bg-gray-50 border-gray-200 text-gray-900"
                          }`}>
                            <div className="space-y-1">
                              <div className="text-xs font-bold flex items-center gap-2">
                                <span>🎯 Profit Share Entitlement ({activePartner.ownershipPercentage}% of ₹{totalNetProfit.toLocaleString("en-IN")}):</span>
                                <span className="font-mono font-bold text-sm">₹{profitShare.toLocaleString("en-IN")}</span>
                              </div>
                              <p className="text-[11px] opacity-90 leading-relaxed">
                                {netSettlement > 0 ? (
                                  <>
                                    👉 <strong>Pool Settlement:</strong> {activePartner.name} spent out-of-pocket and holds less cash than their entitled profit. The common pool / co-partners must transfer <strong>₹{netSettlement.toLocaleString("en-IN")}</strong> to {activePartner.name}.
                                  </>
                                ) : netSettlement < 0 ? (
                                  <>
                                    👉 <strong>Pool Settlement:</strong> {activePartner.name} collected <strong>₹{rentCollected.toLocaleString("en-IN")}</strong> into their personal account and holds excess cash beyond their profit entitlement. {activePartner.name} must transfer <strong>₹{Math.abs(netSettlement).toLocaleString("en-IN")}</strong> into the common pool or co-partners to balance equity.
                                  </>
                                ) : (
                                  <>
                                    👉 <strong>Equitable Parity:</strong> Cash in hand matches the profit entitlement perfectly. No transfer needed.
                                  </>
                                )}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block">
                                Net Position
                              </span>
                              <span className="font-mono font-bold text-xl tabular-nums">
                                {netSettlement > 0
                                  ? `+₹${netSettlement.toLocaleString("en-IN")}`
                                  : netSettlement < 0
                                  ? `-₹${Math.abs(netSettlement).toLocaleString("en-IN")}`
                                  : "₹0"}
                              </span>
                              <span className="block text-[10px] font-bold mt-0.5">
                                {netSettlement > 0 ? "Receivable 🟢" : netSettlement < 0 ? "Payable 🔴" : "Settled ⚪"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Sub-Filter Tabs */}
                        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                          <button
                            type="button"
                            onClick={() => setPartnerLedgerSubFilter("ALL")}
                            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                              partnerLedgerSubFilter === "ALL"
                                ? "bg-[#c2652a] text-white shadow-xs"
                                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }`}
                          >
                            All Transactions ({partnerInflows.length + partnerOutflows.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPartnerLedgerSubFilter("INFLOW")}
                            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                              partnerLedgerSubFilter === "INFLOW"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200"
                            }`}
                          >
                            🟢 Rent Inflows ({partnerInflows.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPartnerLedgerSubFilter("OUTFLOW")}
                            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                              partnerLedgerSubFilter === "OUTFLOW"
                                ? "bg-rose-700 text-white shadow-xs"
                                : "bg-white text-rose-800 hover:bg-rose-50 border border-rose-200"
                            }`}
                          >
                            🔴 Out-of-Pocket Outflows ({partnerOutflows.length})
                          </button>
                        </div>

                        {/* Dual-Ledger Content */}
                        {partnerLedgerSubFilter === "ALL" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Inflow Column */}
                            <div className="bg-white rounded-3xl border border-emerald-200 p-5 shadow-xs space-y-3">
                              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                <h4 className="font-serif font-bold text-base text-emerald-950 flex items-center gap-2">
                                  <span>🟢 Cash Inflows (Rent Receipts)</span>
                                </h4>
                                <span className="font-mono font-bold text-sm text-emerald-700">
                                  +₹{rentCollected.toLocaleString("en-IN")}
                                </span>
                              </div>

                              {partnerInflows.length === 0 ? (
                                <p className="text-xs text-gray-500 py-6 text-center">
                                  No rent collections logged into {activePartner.name}&apos;s account in this period.
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                                  {partnerInflows.map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-3 rounded-xl border border-gray-100 hover:border-emerald-200 bg-[#fbfdfb] flex justify-between items-center text-xs transition-colors"
                                    >
                                      <div>
                                        <Link
                                          href={`/p/${propertyId}/tenants/${item.occupantId}`}
                                          className="font-bold text-gray-900 hover:text-[#c2652a] hover:underline"
                                        >
                                          {item.tenantName}
                                        </Link>
                                        <div className="text-[10px] text-gray-500">
                                          Room {item.roomNumber} {item.bedNumber ? `• Bed ${item.bedNumber}` : ""} • {item.date}
                                        </div>
                                        <div className="text-[9px] text-gray-400 font-mono">
                                          {item.receiptNo} • {item.method}
                                        </div>
                                      </div>
                                      <span className="font-mono font-bold text-emerald-700 text-sm">
                                        +₹{item.amount.toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Outflow Column */}
                            <div className="bg-white rounded-3xl border border-rose-200 p-5 shadow-xs space-y-3">
                              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                <h4 className="font-serif font-bold text-base text-rose-950 flex items-center gap-2">
                                  <span>🔴 Cash Outflows (Expenses Paid)</span>
                                </h4>
                                <span className="font-mono font-bold text-sm text-rose-700">
                                  -₹{actualPaid.toLocaleString("en-IN")}
                                </span>
                              </div>

                              {partnerOutflows.length === 0 ? (
                                <p className="text-xs text-gray-500 py-6 text-center">
                                  No out-of-pocket expenses logged from {activePartner.name} in this period.
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                                  {partnerOutflows.map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-3 rounded-xl border border-gray-100 hover:border-rose-200 bg-[#fdfbfb] flex justify-between items-center text-xs transition-colors"
                                    >
                                      <div>
                                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                          <RenderDynamicCategoryIcon iconName={item.category} className="w-3.5 h-3.5 text-[#c2652a]" />
                                          {item.title}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                          {item.category} • {item.date}
                                        </div>
                                        {item.notes && (
                                          <div className="text-[9px] text-gray-400 italic">
                                            {item.notes}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <span className="font-mono font-bold text-rose-700 text-sm block">
                                          -₹{item.amount.toLocaleString("en-IN")}
                                        </span>
                                        {item.receiptUrl && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const expRecord = expenseList.find((e) => e.id === item.id);
                                              if (expRecord) setActiveReceiptModal(expRecord);
                                            }}
                                            className="text-[9px] text-[#c2652a] hover:underline font-bold cursor-pointer"
                                          >
                                            View Receipt 📄
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {partnerLedgerSubFilter === "INFLOW" && (
                          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                              <h4 className="font-serif font-bold text-lg text-emerald-950">
                                Rent Inflow Receipts ({activePartner.name})
                              </h4>
                              <span className="font-mono font-bold text-emerald-700 text-base">
                                Total: ₹{rentCollected.toLocaleString("en-IN")}
                              </span>
                            </div>

                            {partnerInflows.length === 0 ? (
                              <p className="text-xs text-gray-500 py-8 text-center">
                                No rent collections found for {activePartner.name} in this date range.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold bg-[#fcf9f8]">
                                      <th className="py-2.5 px-3">Date</th>
                                      <th className="py-2.5 px-3">Resident</th>
                                      <th className="py-2.5 px-3">Room / Bed</th>
                                      <th className="py-2.5 px-3">Mode</th>
                                      <th className="py-2.5 px-3">Receipt No</th>
                                      <th className="py-2.5 px-3 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {partnerInflows.map((item) => (
                                      <tr key={item.id} className="hover:bg-gray-50/70">
                                        <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">{item.date}</td>
                                        <td className="py-3 px-3 font-bold text-gray-900">
                                          <Link
                                            href={`/p/${propertyId}/tenants/${item.occupantId}`}
                                            className="hover:text-[#c2652a] hover:underline"
                                          >
                                            {item.tenantName}
                                          </Link>
                                        </td>
                                        <td className="py-3 px-3 text-gray-600">
                                          Room {item.roomNumber} {item.bedNumber ? `(Bed ${item.bedNumber})` : ""}
                                        </td>
                                        <td className="py-3 px-3 text-gray-600">{item.method}</td>
                                        <td className="py-3 px-3 font-mono text-gray-500 text-[11px]">{item.receiptNo}</td>
                                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                                          +₹{item.amount.toLocaleString("en-IN")}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {partnerLedgerSubFilter === "OUTFLOW" && (
                          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                              <h4 className="font-serif font-bold text-lg text-rose-950">
                                Out-of-Pocket Operational Expenses ({activePartner.name})
                              </h4>
                              <span className="font-mono font-bold text-rose-700 text-base">
                                Total: ₹{actualPaid.toLocaleString("en-IN")}
                              </span>
                            </div>

                            {partnerOutflows.length === 0 ? (
                              <p className="text-xs text-gray-500 py-8 text-center">
                                No expenses paid out-of-pocket by {activePartner.name} in this date range.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold bg-[#fcf9f8]">
                                      <th className="py-2.5 px-3">Date</th>
                                      <th className="py-2.5 px-3">Expense Title / Vendor</th>
                                      <th className="py-2.5 px-3">Category</th>
                                      <th className="py-2.5 px-3">Notes</th>
                                      <th className="py-2.5 px-3 text-center">Receipt</th>
                                      <th className="py-2.5 px-3 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {partnerOutflows.map((item) => (
                                      <tr key={item.id} className="hover:bg-gray-50/70">
                                        <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">{item.date}</td>
                                        <td className="py-3 px-3 font-bold text-gray-900">{item.title}</td>
                                        <td className="py-3 px-3 text-gray-600 flex items-center gap-1.5">
                                          <RenderDynamicCategoryIcon iconName={item.category} className="w-3.5 h-3.5 text-[#c2652a]" />
                                          {item.category}
                                        </td>
                                        <td className="py-3 px-3 text-gray-500 text-[11px] italic">{item.notes || "—"}</td>
                                        <td className="py-3 px-3 text-center">
                                          {item.receiptUrl ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const expRecord = expenseList.find((e) => e.id === item.id);
                                                if (expRecord) setActiveReceiptModal(expRecord);
                                              }}
                                              className="p-1 rounded bg-orange-50 text-[#c2652a] hover:bg-orange-100 font-bold text-[10px] cursor-pointer"
                                            >
                                              View
                                            </button>
                                          ) : (
                                            <span className="text-gray-400 text-[10px]">—</span>
                                          )}
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 text-sm">
                                          -₹{item.amount.toLocaleString("en-IN")}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* Quick Expense Hub Reference Banner */}
                <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-orange-50 text-[#c2652a]">
                      <ReceiptRupeeIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-base text-gray-900">
                        Operational Expenses Ledger & Receipts
                      </h4>
                      <p className="text-xs text-gray-500">
                        View, log, filter, and audit detailed building operational costs in the Central Expenses Hub.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("Expenses")}
                    className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    Open Expenses Hub →
                  </button>
                </div>
              </div>

            {/* Right Slide-Over Record Expense Drawer & Partner Settings Card */}
            <div className="lg:col-span-4 space-y-6">
              {/* Toast Callout Message (Saved Success Feedback) */}
              {showToast && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <p className="font-bold">Expense saved successfully!</p>
                      <p className="text-[10px] text-emerald-700">Reflected across Expenses Hub and Partner Settlement</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowToast(false)}
                    className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Partner Ownership Settings Reference Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h4 className="font-serif font-bold text-sm text-gray-900 flex items-center gap-2">
                    Partner Ownership & Ratios
                  </h4>
                  <Link
                    href={`/p/${propertyId}/settings`}
                    className="text-[#c2652a] font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <Settings className="w-3.5 h-3.5" /> Manage in Settings ⚙️
                  </Link>
                </div>

                <div className="space-y-3 text-xs">
                  {partners.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPartnerId(p.id)}
                        className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#c2652a] text-left cursor-pointer"
                      >
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="w-6 h-6 rounded-full object-cover border border-gray-200 shadow-2xs shrink-0"
                          />
                        ) : (
                          <span
                            className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: p.color || "#c2652a" }}
                          >
                            {p.name.charAt(0)}
                          </span>
                        )}
                        <span>{p.name}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-bold text-gray-500 tabular-nums">{p.ownershipPercentage}%</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPartnerId(p.id)}
                          className="text-[10px] font-bold text-[#c2652a] hover:underline cursor-pointer"
                        >
                          Audit →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs font-bold text-gray-900">
                  <span>Total Ownership</span>
                  <span className="font-sans font-bold tabular-nums">{partners.reduce((a, b) => a + (b.ownershipPercentage || 0), 0)}%</span>
                </div>

                <p className="text-[10px] text-gray-500 italic pt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-gray-500" /> Fully editable from Settings page. Settlement updates in real-time.
                </p>
              </div>
            </div>
          </div>
          )}

        </div>
      </div>

      {/* Add / Edit Recurring Bill Setup Drawer Modal */}
      {showAddRecurringModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddRecurringModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#c2652a]" />
                  {editingBillId ? "Edit Recurring Bill Schedule" : "Add Recurring Bill Schedule"}
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Setup recurring utility bills or staff retainer payments
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRecurringModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecurringBillSetup} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-900 mb-1">
                  Bill Title *
                </label>
                <input
                  type="text"
                  required
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  placeholder="e.g. Elevator Maintenance AMC"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Category *
                  </label>
                  <select
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Default Base Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    placeholder="e.g. 4500"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-sans font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Due Schedule *
                  </label>
                  <select
                    value={recDueDate}
                    onChange={(e) => setRecDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  >
                    <option value="Monthly • 1st">Monthly • 1st</option>
                    <option value="Fixed • 5th">Fixed • 5th</option>
                    <option value="Variable • 15th">Variable • 15th</option>
                    <option value="End of Month">End of Month</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Default Paid From *
                  </label>
                  <ThemedAccountSelect
                    value={recPaidFrom}
                    onChange={(val) => setRecPaidFrom(val)}
                    accounts={paymentAccounts}
                    partners={partners}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-900 mb-1">
                  Notes / Provider Details
                </label>
                <input
                  type="text"
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  placeholder="e.g. Schindler Elevator Service Contract"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRecurringModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {editingBillId ? "Save Changes" : "Create Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Directory & Inspection Modal */}
      {showCategoryDirectoryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowCategoryDirectoryModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2">
                  🏷️ Active Expense Categories ({categories.length})
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Overview of all building expense categories included so far
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryDirectoryModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create Category Input inside Modal */}
            <div className="p-4 rounded-2xl bg-orange-50/40 border border-orange-200 space-y-2">
              <label className="block font-bold text-gray-900">
                + Create New Expense Category
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="Enter category (e.g. Pest Control)"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                />
                <button
                  type="button"
                  onClick={handleCreateInlineCategory}
                  className="px-4 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  Add Category
                </button>
              </div>
            </div>

            {/* Active Categories List with Counts & Totals */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const catExpenses = expenseList.filter((e) => e.category === cat.name);
                const catTotal = catExpenses.reduce((a, b) => a + b.amount, 0);

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-xl text-white font-bold flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color || "#475569" }}
                      >
                        <RenderDynamicCategoryIcon iconName={cat.icon || "Receipt"} className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{cat.name}</h4>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {catExpenses.length} Logged Transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-sans font-bold text-sm text-[#c2652a] tabular-nums">
                        ₹{catTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCategoryDirectoryModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900">
                  Add Expense Category
                </h3>
                <p className="text-xs text-gray-500">
                  Create a new operational category for your ledger
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Generator Fuel, Lift AMC, Pest Control"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold shadow-md cursor-pointer active:scale-95"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME CATEGORY MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900">
                  Rename Category
                </h3>
                <p className="text-xs text-gray-500">
                  Update category name while keeping its original icon & color
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameCategorySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameCategoryName}
                  onChange={(e) => setRenameCategoryName(e.target.value)}
                  placeholder="Enter new category name..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                />
              </div>

              <div className="p-3 rounded-2xl bg-orange-50/60 border border-orange-200 flex items-center gap-3">
                <div
                  className="p-2 rounded-xl text-white font-bold shrink-0"
                  style={{ backgroundColor: editingCategory.color || "#c2652a" }}
                >
                  <RenderDynamicCategoryIcon iconName={editingCategory.icon || "Receipt"} className="w-4 h-4 text-white" />
                </div>
                <div className="text-[11px] text-orange-950 font-medium">
                  All existing expense transactions tagged with <strong className="font-bold">{editingCategory.name}</strong> will update automatically.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold shadow-md cursor-pointer active:scale-95"
                >
                  Update Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DATE RANGE FILTER MODAL */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#c2652a]" /> Custom Timeline Filter
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select exact date range to recalculate revenues, expenses & settlements
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomDateModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick 1-Tap Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quick Presets</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const d7 = new Date();
                    d7.setDate(now.getDate() - 7);
                    setCustomStartDate(d7.toISOString().split("T")[0]);
                    setCustomEndDate(now.toISOString().split("T")[0]);
                  }}
                  className="py-2 px-2.5 rounded-xl border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/50 text-[11px] font-bold text-gray-700 text-center transition-all cursor-pointer"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const d30 = new Date();
                    d30.setDate(now.getDate() - 30);
                    setCustomStartDate(d30.toISOString().split("T")[0]);
                    setCustomEndDate(now.toISOString().split("T")[0]);
                  }}
                  className="py-2 px-2.5 rounded-xl border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/50 text-[11px] font-bold text-gray-700 text-center transition-all cursor-pointer"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const d90 = new Date();
                    d90.setDate(now.getDate() - 90);
                    setCustomStartDate(d90.toISOString().split("T")[0]);
                    setCustomEndDate(now.toISOString().split("T")[0]);
                  }}
                  className="py-2 px-2.5 rounded-xl border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/50 text-[11px] font-bold text-gray-700 text-center transition-all cursor-pointer"
                >
                  Last 90 Days
                </button>
              </div>
            </div>

            {/* Custom Date Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customStartDate > customEndDate) {
                  alert("⚠️ Start Date cannot be after End Date.");
                  return;
                }
                setSelectedTimelineFilter("CUSTOM");
                setShowCustomDateModal(false);
                triggerToast(`📅 Filter applied: ${customStartDate} to ${customEndDate}`);
              }}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Start Date (From) *
                  </label>
                  <input
                    type="date"
                    required
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] font-sans font-semibold text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    End Date (To) *
                  </label>
                  <input
                    type="date"
                    required
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] font-sans font-semibold text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200/60 text-orange-900 text-[11px]">
                <p className="font-bold flex items-center gap-1.5 text-xs">
                  <span>⚡</span> Live Recalculation Notice
                </p>
                <p className="mt-0.5 text-orange-800">
                  Applies strictly to transaction dates recorded in this property's cloud ledger.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCustomDateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  Apply Filter ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Luxury Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#201a17] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#c2652a]/40 flex items-center gap-3 max-w-md text-xs font-bold">
            <span className="shrink-0">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
