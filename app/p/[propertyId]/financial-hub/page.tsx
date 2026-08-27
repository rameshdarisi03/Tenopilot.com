"use client";

import Link from "next/link";
import { use, useState, useEffect } from "react";
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
} from "lucide-react";
import {
  partnerStore,
  PartnerConfig,
  ExpenseCategoryConfig,
  PaymentAccountConfig,
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
import { RoleSwitcherBadge } from "@/components/auth/RoleSwitcherBadge";

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

  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Electricity");
  const [paidFrom, setPaidFrom] = useState("Business Account");
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

  // Reactive Partner, Category & Payment Account State
  const [partners, setPartners] = useState<PartnerConfig[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryConfig[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountConfig[]>([]);

  // 100% Real-Time Date-Filtered Revenues Calculation Engine
  const computeLiveRevenueData = () => {
    const occupants = occupantStore.getOccupants(propertyId).filter((o) => o.lifecycleStatus !== "Past");
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

    occupants.forEach((occ) => {
      const isOccupied = occ.lifecycleStatus === "Active" || occ.lifecycleStatus === "Notice";
      if (isOccupied) {
        occupiedCount++;
      }

      const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
      
      // Calculate billed rent for the cycle/period
      totalBilledRent += stmt.proRataRent + stmt.priorArrears;
      totalUncollectedArrears += stmt.netOutstandingBalance;

      // Filter occupant's payment receipts strictly within the active date range
      const history = occ.paymentHistory || [];
      const periodPayments = isAllTime
        ? history
        : history.filter((pm) => {
            const pDate = pm.date || "";
            return pDate >= startDate && pDate <= endDate;
          });

      if (periodPayments.length > 0) {
        periodPayments.forEach((pm) => {
          totalGrossRevenue += pm.amount;

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
      } else if (isAllTime) {
        // Fallback for default state if no explicit history items exist
        totalGrossRevenue += stmt.totalPaid;
        rentStream += stmt.totalRentPaid;
        if (stmt.isDepositCleared) {
          depositStream += stmt.securityDepositRequired;
        }
      }
    });

    // Query check-out and cancellation logs within date range
    const complianceLogs = complianceLogStore.getLogs(propertyId);
    let penaltyDamageStream = 0;
    let maintenanceStream = 0;

    complianceLogs.forEach((log) => {
      const logDate = log.checkOutDate
        ? log.checkOutDate
        : log.timestamp
        ? new Date(log.timestamp).toISOString().slice(0, 10)
        : "";
      if (isAllTime || (logDate >= startDate && logDate <= endDate)) {
        penaltyDamageStream += log.penaltyPaid || 0;
        maintenanceStream += log.maintenancePaid || 0;
      }
    });

    totalGrossRevenue += penaltyDamageStream + maintenanceStream;

    const collectionEfficiency =
      totalBilledRent > 0
        ? Math.min(100, (totalGrossRevenue / totalBilledRent) * 100).toFixed(1)
        : "100.0";

    const arpb = occupiedCount > 0 ? Math.round(totalGrossRevenue / occupiedCount) : 0;

    const totalChannel = upiAmount + bankAmount + cashAmount || 1;
    const onlineTotal = upiAmount + bankAmount;
    const upiPct = Math.round((onlineTotal / totalChannel) * 100) || 85;
    const cashPct = 100 - upiPct;

    const totalStreams = rentStream + depositStream + maintenanceStream + penaltyDamageStream || 1;
    const rentPct = Math.round((rentStream / totalStreams) * 100);
    const depositPct = Math.round((depositStream / totalStreams) * 100);
    const maintenancePct = Math.round((maintenanceStream / totalStreams) * 100);
    const penaltyDamagePct = Math.max(0, 100 - rentPct - depositPct - maintenancePct);

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
      setRecPaidFrom("Business Account");
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
          actionElement={<RoleSwitcherBadge />}
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
                    <option value="THIS_MONTH">This Month (Aug 2026)</option>
                    <option value="LAST_MONTH">Last Month (Jul 2026)</option>
                    <option value="THIS_QUARTER">This Quarter (Q3 2026)</option>
                    <option value="THIS_YEAR">Financial Year (FY 2026-27)</option>
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

                {activeTab === "Expenses" && (
                  <button
                    type="button"
                    onClick={() => setShowRecordDrawer(true)}
                    className="px-4 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Record Expense
                  </button>
                )}
              </div>
            </div>

            {/* Prominent 3-Section Core Pillar Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              {/* REVENUES TAB */}
              {activeRole === "receptionist" ? (
                <div className="p-4 md:p-5 rounded-2xl border text-left bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-200 text-gray-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm md:text-base text-gray-500 flex items-center gap-1.5">
                        <span>Revenues</span>
                        <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md uppercase font-bold">Admin Only</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">Income Streams & Yield</p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("Revenues")}
                  className={`p-4 md:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    activeTab === "Revenues"
                      ? "bg-white border-[#c2652a] ring-2 ring-[#c2652a]/20 shadow-md scale-[1.01]"
                      : "bg-[#fcf9f8] border-gray-200 hover:bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl transition-colors ${
                        activeTab === "Revenues"
                          ? "bg-[#c2652a] text-white"
                          : "bg-emerald-100 text-emerald-800 group-hover:bg-[#c2652a] group-hover:text-white"
                      }`}
                    >
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3
                        className={`font-serif font-bold text-sm md:text-base ${
                          activeTab === "Revenues" ? "text-[#c2652a]" : "text-gray-900"
                        }`}
                      >
                        Revenues
                      </h3>
                      <p className="text-[11px] text-gray-500">Income Streams & Yield</p>
                    </div>
                  </div>
                  {activeTab === "Revenues" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c2652a] animate-pulse"></span>
                  )}
                </button>
              )}

              {/* EXPENSES TAB */}
              <button
                type="button"
                onClick={() => setActiveTab("Expenses")}
                className={`p-4 md:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  activeTab === "Expenses"
                    ? "bg-white border-[#c2652a] ring-2 ring-[#c2652a]/20 shadow-md scale-[1.01]"
                    : "bg-[#fcf9f8] border-gray-200 hover:bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      activeTab === "Expenses"
                        ? "bg-[#c2652a] text-white"
                        : "bg-emerald-100 text-emerald-800 group-hover:bg-[#c2652a] group-hover:text-white"
                    }`}
                  >
                    <ReceiptRupeeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-serif font-bold text-sm md:text-base ${
                        activeTab === "Expenses" ? "text-[#c2652a]" : "text-gray-900"
                      }`}
                    >
                      Expenses Hub
                    </h3>
                    <p className="text-[11px] text-gray-500">Ledger, Recurring & Categories</p>
                  </div>
                </div>
                {activeTab === "Expenses" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c2652a] animate-pulse"></span>
                )}
              </button>

              {/* PARTNER SETTLEMENT TAB */}
              {activeRole === "receptionist" ? (
                <div className="p-4 md:p-5 rounded-2xl border text-left bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-200 text-gray-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm md:text-base text-gray-500 flex items-center gap-1.5">
                        <span>Partner Settlement</span>
                        <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md uppercase font-bold">Admin Only</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">Equity & Profit Share</p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("Partner Settlement")}
                  className={`p-4 md:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    activeTab === "Partner Settlement"
                      ? "bg-white border-[#c2652a] ring-2 ring-[#c2652a]/20 shadow-md scale-[1.01]"
                      : "bg-[#fcf9f8] border-gray-200 hover:bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl transition-colors ${
                        activeTab === "Partner Settlement"
                          ? "bg-[#c2652a] text-white"
                          : "bg-purple-100 text-purple-700 group-hover:bg-[#c2652a] group-hover:text-white"
                      }`}
                    >
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3
                        className={`font-serif font-bold text-sm md:text-base ${
                          activeTab === "Partner Settlement" ? "text-[#c2652a]" : "text-gray-900"
                        }`}
                      >
                        Partner Settlement
                      </h3>
                      <p className="text-[11px] text-gray-500">Equity & Profit Share</p>
                    </div>
                  </div>
                  {activeTab === "Partner Settlement" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c2652a] animate-pulse"></span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: REVENUES WORKSPACE */}
          {activeTab === "Revenues" && (
            <div className="space-y-8 animate-in fade-in">
              {/* 1. Top 4 Revenue KPI Metrics Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* KPI 1: Gross Monthly Revenue */}
                <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-xs space-y-3 relative overflow-hidden group hover:border-[#c2652a] transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      GROSS REVENUE ({activeDateBounds.label.toUpperCase()})
                    </span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <h2 className="font-sans font-bold text-3xl text-gray-900 tracking-tight">
                    ₹{revenueMetrics.totalGrossRevenue.toLocaleString("en-IN")}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <span className="bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                      LIVE REAL-TIME SSOT 🟢
                    </span>
                  </div>
                </div>

                {/* KPI 2: Rent Collection Efficiency Rate */}
                <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-xs space-y-3 relative overflow-hidden group hover:border-[#c2652a] transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      COLLECTION EFFICIENCY
                    </span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <h2 className="font-sans font-bold text-3xl text-gray-900 tracking-tight">
                    {revenueMetrics.collectionEfficiency}%
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    ₹{(revenueMetrics.totalGrossRevenue / 100000).toFixed(2)}L collected of ₹{(revenueMetrics.totalBilledRent / 100000).toFixed(2)}L total due
                  </p>
                </div>

                {/* KPI 3: Average Revenue Per Bed (ARPB) */}
                <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-xs space-y-3 relative overflow-hidden group hover:border-[#c2652a] transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      AVERAGE YIELD PER BED (ARPB)
                    </span>
                    <div className="p-2 rounded-xl bg-orange-50 text-[#c2652a]">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <h2 className="font-sans font-bold text-3xl text-gray-900 tracking-tight">
                    ₹{revenueMetrics.arpb.toLocaleString("en-IN")}
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Monthly yield per active physical occupant
                  </p>
                </div>

                {/* KPI 4: Pending Uncollected Rent Arrears */}
                <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-xs space-y-3 relative overflow-hidden group hover:border-amber-400 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      UNCOLLECTED ARREARS
                    </span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <h2 className="font-sans font-bold text-3xl text-amber-900 tracking-tight">
                    ₹{revenueMetrics.totalUncollectedArrears.toLocaleString("en-IN")}
                  </h2>
                  <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {revenueMetrics.occupants.filter((o) => calculateOccupantFinancialStatement(o, propertySettings).netOutstandingBalance > 0).length} Unpaid Occupants
                  </span>
                </div>
              </div>

              {/* 2. Multi-Stream Income Breakdown & Payment Channels */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Multi-Stream Income Sources Breakdown */}
                <div className="lg:col-span-7 bg-white border border-gray-200 p-6 md:p-8 rounded-3xl shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-gray-900">
                        Revenue Stream Breakdown
                      </h3>
                      <p className="text-xs text-gray-500">Categorized income distribution across estate services</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      REAL-TIME STREAM
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Stream 1: Room Rent */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-800 flex items-center gap-2">
                          🏠 Monthly Room Rent Collection
                        </span>
                        <span className="text-[#c2652a] font-mono tabular-nums">
                          ₹{revenueMetrics.rentStream.toLocaleString("en-IN")} ({revenueMetrics.rentPct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#c2652a] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, revenueMetrics.rentPct)}%` }}></div>
                      </div>
                    </div>

                    {/* Stream 2: Security Deposits */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-800 flex items-center gap-2">
                          🔐 Security Deposit Collateral Intake
                        </span>
                        <span className="text-emerald-700 font-mono tabular-nums">
                          ₹{revenueMetrics.depositStream.toLocaleString("en-IN")} ({revenueMetrics.depositPct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, revenueMetrics.depositPct)}%` }}></div>
                      </div>
                    </div>

                    {/* Stream 3: Maintenance Charges */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-800 flex items-center gap-2">
                          🧹 Maintenance & Utility Charges
                        </span>
                        <span className="text-blue-700 font-mono tabular-nums">
                          ₹{revenueMetrics.maintenanceStream.toLocaleString("en-IN")} ({revenueMetrics.maintenancePct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, revenueMetrics.maintenancePct)}%` }}></div>
                      </div>
                    </div>

                    {/* Stream 4: Cancellations, Penalties & Damages */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-800 flex items-center gap-2">
                          ⚖️ Cancellations, Penalties & Damages
                        </span>
                        <span className="text-purple-700 font-mono tabular-nums">
                          ₹{revenueMetrics.penaltyDamageStream.toLocaleString("en-IN")} ({revenueMetrics.penaltyDamagePct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, revenueMetrics.penaltyDamagePct)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Channels Distribution */}
                <div className="lg:col-span-5 bg-white border border-gray-200 p-6 md:p-8 rounded-3xl shadow-xs space-y-6">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Payment Channels Analytics
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">Method distribution of collected payments</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#c2652a] font-bold flex items-center justify-center text-xs">
                          UPI
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-gray-900">Online payments (UPI)</h4>
                          <span className="text-[10px] text-gray-500 font-medium">Instant VPA Collection</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-[#c2652a] block">₹{revenueMetrics.onlineTotal.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] font-bold text-orange-700">{revenueMetrics.upiPct}% of Total</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                          💵
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-gray-900">Cash Desk</h4>
                          <span className="text-[10px] text-gray-500 font-medium font-medium">Front Desk Reception</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-emerald-700 block">₹{revenueMetrics.cashAmount.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] font-bold text-emerald-700">{revenueMetrics.cashPct}% of Total</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Live Recent Revenue Transaction Log */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Recent Income & Revenue Log
                    </h3>
                    <p className="text-xs text-gray-500">Verified receipts and incoming payments for {propertySettings.propertyName || (propertyId === "sunshine-pg" ? "Sunshine Heights PG" : "My Property")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> LIVE REVENUE STREAM
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50/50">
                        <th className="py-3 px-4 rounded-l-xl">Date & Time</th>
                        <th className="py-3 px-4">Resident / Source</th>
                        <th className="py-3 px-4">Room Location</th>
                        <th className="py-3 px-4">Income Category</th>
                        <th className="py-3 px-4">Payment Channel</th>
                        <th className="py-3 px-4 text-right">Amount Billed</th>
                        <th className="py-3 px-4 rounded-r-xl text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {revenueMetrics.occupants.slice(0, 8).map((occ) => {
                        const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
                        const lastPayment = occ.paymentHistory && occ.paymentHistory.length > 0
                          ? occ.paymentHistory[occ.paymentHistory.length - 1]
                          : null;

                        return (
                          <tr key={occ.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 text-gray-500 font-mono">
                              {lastPayment?.date || occ.joiningDate || "Active Cycle"}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-gray-900">{occ.name}</td>
                            <td className="py-3.5 px-4 text-gray-600">
                              Room {occ.roomNumber} ({occ.bedCode})
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="bg-orange-50 text-[#c2652a] text-[10px] font-bold px-2.5 py-1 rounded-full border border-orange-200">
                                {occ.stayType === "Guest" ? "Guest Stay Fee" : "Monthly Rent"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-gray-600 font-mono">
                              {lastPayment?.mode || "PhonePe UPI"}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono text-sm">
                              ₹{stmt.totalPaid.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                stmt.isFullyPaid
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-amber-100 text-amber-900"
                              }`}>
                                {stmt.isFullyPaid ? "✓ Verified" : `Due ₹${stmt.netOutstandingBalance}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPENSES WORKSPACE (STITCH V2 SPECIFICATION) */}
          {activeTab === "Expenses" && (
            <div className="space-y-8 animate-in fade-in">
              {/* Top Bento Grid: Total Spent & Budget Weightages */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Summary Card */}
                <div className="lg:col-span-8 bg-white border border-gray-200 p-6 md:p-8 rounded-3xl shadow-xs relative overflow-hidden flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                      TOTAL SPENT ({activeDateBounds.label.toUpperCase()})
                    </span>
                    <div className="flex items-baseline gap-4 mt-2">
                      <h2 className="font-sans font-bold text-3xl md:text-4xl text-gray-900 tracking-tight">
                        ₹{totalSpent.toLocaleString("en-IN")}
                      </h2>
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-700" /> REAL-TIME FIREBASE SYNCED 🟢
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        HIGHEST CATEGORY
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Zap className="w-4 h-4 text-[#c2652a]" />
                        <span className="font-sans font-bold text-base text-gray-900">
                          {highestCat.category} (₹{highestCat.amount.toLocaleString("en-IN")})
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        RECORDED TRANSACTIONS
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <ReceiptRupeeIcon className="w-4 h-4 text-purple-700" />
                        <span className="font-sans font-bold text-base text-gray-900">
                          {expenseList.length} Entries Logged
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Weightage & Cost Breakdown Progress Card */}
                <div className="lg:col-span-4 bg-white border border-gray-200 p-6 md:p-8 rounded-3xl shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-serif font-bold text-base text-gray-900">
                        Category Cost Weightage
                      </h3>
                      <p className="text-[10px] text-gray-500 font-medium">% Share of total monthly spend</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#c2652a] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 uppercase">
                      DYNAMIC
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs font-bold max-h-56 overflow-y-auto pr-1">
                    {categoryWeightages.length === 0 ? (
                      <p className="text-xs text-gray-400 font-medium">No expenses logged yet</p>
                    ) : (
                      categoryWeightages.map((cw, idx) => (
                        <div key={cw.category} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">{cw.category}</span>
                            <span className="text-[#c2652a] font-sans font-bold tabular-nums">
                              ₹{cw.amount.toLocaleString("en-IN")} ({cw.percentage}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                idx === 0
                                  ? "bg-[#c2652a]"
                                  : idx === 1
                                  ? "bg-emerald-600"
                                  : idx === 2
                                  ? "bg-purple-600"
                                  : "bg-blue-600"
                              }`}
                              style={{ width: `${Math.min(cw.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Expenses Sub-Tab Segment Switcher */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-gray-200 shadow-xs max-w-md">
                <button
                  type="button"
                  onClick={() => setExpensesSubTab("LEDGER")}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    expensesSubTab === "LEDGER"
                      ? "bg-[#c2652a] text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <ReceiptRupeeIcon className="w-4 h-4" /> Ledger & Recurring Bills
                </button>
                <button
                  type="button"
                  onClick={() => setExpensesSubTab("CATEGORIES")}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    expensesSubTab === "CATEGORIES"
                      ? "bg-[#c2652a] text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Tag className="w-4 h-4" /> Category Customizer ({categories.length})
                </button>
              </div>

              {/* VIEW 1: EXPENSES LEDGER & RECURRING BILLS */}
              {expensesSubTab === "LEDGER" && (
                <div className="space-y-8 animate-in fade-in">
                  {/* Recurring Fixed Bills Horizontal Left-to-Right Scrollable Row */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Recurring Bills & Utilities Summary
                    </h3>
                    <span className="text-[10px] font-extrabold text-[#c2652a] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                      ↔️ Scrollable Row
                    </span>
                  </div>
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

              {/* Recent Expenses Detailed Table Section */}
              <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-gray-900">
                      Operational Expenses Ledger
                    </h3>
                    <p className="text-xs text-gray-500">
                      Showing {expenseList.filter((item) => selectedCategoryFilter === "ALL" || item.category === selectedCategoryFilter).length} recorded expense transactions (Firebase Synced)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Export CSV Button */}
                    <button
                      type="button"
                      onClick={() => expenseStore.exportLedgerToCSV(propertyId, activeDateBounds.startDate, activeDateBounds.endDate)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-700" /> Export CSV
                    </button>

                    {/* View All Categories Included Button */}
                    <button
                      type="button"
                      onClick={() => setShowCategoryDirectoryModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      🏷️ Categories ({categories.length})
                    </button>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-gray-500 font-bold flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5" /> Filter:
                      </span>
                      <button
                        onClick={() => setSelectedCategoryFilter("ALL")}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          selectedCategoryFilter === "ALL"
                            ? "bg-[#c2652a] text-white shadow-xs"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        ALL
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCategoryFilter(c.name)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            selectedCategoryFilter === c.name
                              ? "bg-[#c2652a] text-white shadow-xs"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expenses Table */}
                <div className="overflow-x-auto">
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
                                const catObj = categories.find(
                                  (c) => c.name.toLowerCase() === exp.category.toLowerCase()
                                );
                                const catColor = catObj?.color || "#475569";
                                const catIcon = catObj?.icon || "Receipt";

                                return (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="p-1.5 rounded-lg text-white font-bold flex items-center justify-center shrink-0 shadow-2xs"
                                      style={{ backgroundColor: catColor }}
                                    >
                                      <RenderDynamicCategoryIcon iconName={catIcon} className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="font-bold text-gray-900">{exp.category}</span>
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
                          <select
                            value={paidFrom}
                            onChange={(e) => setPaidFrom(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                          >
                            {paymentAccounts.map((acc) => (
                              <option key={acc.id} value={acc.name}>
                                {acc.name} ({acc.type})
                              </option>
                            ))}
                          </select>
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
                        <select
                          value={recurringModal.paidFrom}
                          onChange={(e) =>
                            setRecurringModal({ ...recurringModal, paidFrom: e.target.value })
                          }
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        >
                          {paymentAccounts.map((acc) => (
                            <option key={acc.id} value={acc.name}>
                              {acc.name} ({acc.type})
                            </option>
                          ))}
                        </select>
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

          {/* TAB 3: PARTNER SETTLEMENT (OUR ACTIVE FULL VIEW) */}
          {activeTab === "Partner Settlement" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Main Content Left (Stat Cards, Settlement Overview, Recent Expenses) */}
              <div className="lg:col-span-8 space-y-8">
              {/* Financial Summary Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stat Card 1 */}
                <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Total Rent Collected
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
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold bg-[#fcf9f8]">
                          <th className="py-3 px-4 font-bold">Partner</th>
                          <th className="py-3 px-4 font-bold">Ownership %</th>
                          <th className="py-3 px-4 font-bold">Paid Out-Of-Pocket ({activeDateBounds.label})</th>
                          <th className="py-3 px-4 font-bold">Profit Share</th>
                          <th className="py-3 px-4 font-bold">Receivable / Payable</th>
                          <th className="py-3 px-4 font-bold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {partners.map((p) => {
                          const totalNetProfit = Math.max(0, revenueMetrics.totalGrossRevenue - totalSpent);
                          const profitShare = Math.round((totalNetProfit * (p.ownershipPercentage || 0)) / 100);
                          const actualPaid = partnerContributions[p.name] || 0;
                          const receivable = profitShare - actualPaid;

                          return (
                            <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                              <td className="py-4 px-4 font-bold flex items-center gap-2.5 text-gray-900 whitespace-nowrap">
                                <span
                                  className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs"
                                  style={{ backgroundColor: p.color || "#c2652a" }}
                                >
                                  {p.name.charAt(0)}
                                </span>
                                <span>{p.name}</span>
                              </td>
                              <td className="py-4 px-4 text-gray-500 font-sans font-bold tabular-nums whitespace-nowrap">{p.ownershipPercentage}%</td>
                              <td className="py-4 px-4 text-gray-700 font-sans font-semibold tabular-nums whitespace-nowrap">₹{actualPaid.toLocaleString("en-IN")}</td>
                              <td className="py-4 px-4 font-sans font-bold text-gray-900 tabular-nums whitespace-nowrap">₹{profitShare.toLocaleString("en-IN")}</td>
                              <td className={`py-4 px-4 font-sans font-bold tabular-nums whitespace-nowrap ${receivable >= 0 ? "text-[#059669]" : "text-red-600"}`}>
                                {receivable >= 0 ? `+₹${receivable.toLocaleString("en-IN")}` : `-₹${Math.abs(receivable).toLocaleString("en-IN")}`}
                              </td>
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
                                  receivable >= 0 ? "bg-emerald-100 text-emerald-900 border border-emerald-200" : "bg-red-100 text-red-900 border border-red-200"
                                }`}>
                                  {receivable >= 0 ? "Receivable" : "Payable"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

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
                    <div key={p.id} className="flex justify-between items-center">
                      <span className="flex items-center gap-2 font-bold text-gray-900">
                        <span
                          className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold"
                          style={{ backgroundColor: p.color || "#c2652a" }}
                        >
                          {p.name.charAt(0)}
                        </span>
                        {p.name}
                      </span>
                      <span className="font-sans font-bold text-gray-500 tabular-nums">{p.ownershipPercentage}%</span>
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
                  <select
                    value={recPaidFrom}
                    onChange={(e) => setRecPaidFrom(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  >
                    {paymentAccounts.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
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
