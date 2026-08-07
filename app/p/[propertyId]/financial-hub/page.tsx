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
import { partnerStore, PartnerConfig, ExpenseCategoryConfig } from "@/constants/partnerStore";
import { expenseStore, ExpenseRecord, CategoryWeightage } from "@/constants/expenseStore";
import { recurringBillStore, RecurringBillRecord } from "@/constants/recurringBillStore";
import { CATEGORIZED_ICON_LIBRARY, RenderDynamicCategoryIcon } from "@/constants/businessIconLibrary";

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

  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Electricity");
  const [paidFrom, setPaidFrom] = useState("Business Account");
  const [notes, setNotes] = useState("");

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

  // Custom Category Creator State
  const [catNameInput, setCatNameInput] = useState("");
  const [selectedColor, setSelectedColor] = useState("#964407");
  const [selectedIcon, setSelectedIcon] = useState("Wrench");
  const [selectedIconGroupTab, setSelectedIconGroupTab] = useState("Property & Building");

  // Reactive Partner & Category State
  const [partners, setPartners] = useState<PartnerConfig[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryConfig[]>([]);

  useEffect(() => {
    setPartners(partnerStore.getPartners());
    setCategories(partnerStore.getCategories());

    const unsubPartners = partnerStore.subscribe(() => {
      setPartners(partnerStore.getPartners());
      setCategories(partnerStore.getCategories());
    });

    // Init Cloud Firebase Firestore & SSOT Stores for Property
    expenseStore.initPropertyFirebase(propertyId);
    recurringBillStore.initPropertyFirebase(propertyId);

    const updateExpenseState = () => {
      setExpenseList(expenseStore.getExpenses(propertyId));
      setCategoryWeightages(expenseStore.getCategoryWeightages(propertyId));
      setHighestCat(expenseStore.getHighestCategory(propertyId));
      setTotalSpent(expenseStore.getTotalSpentThisMonth(propertyId));
      setPartnerContributions(expenseStore.getPartnerPersonalContributions(propertyId));
    };

    const updateRecurringBillsState = () => {
      setRecurringBillsList(recurringBillStore.getRecurringBills(propertyId));
    };

    updateExpenseState();
    updateRecurringBillsState();

    const unsubExpenses = expenseStore.subscribe(updateExpenseState);
    const unsubRecurring = recurringBillStore.subscribe(updateRecurringBillsState);

    return () => {
      unsubPartners();
      unsubExpenses();
      unsubRecurring();
    };
  }, [propertyId]);

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

    const created = partnerStore.addCategory(trimmed, "Wrench", selectedColor);
    setCategory(created.name);
    setNewCategoryInput("");
    setIsAddingNewCategory(false);
    triggerToast(`🟢 New category "${created.name}" added to system!`);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      triggerToast("⚠️ Please enter a valid expense amount.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    await expenseStore.addExpense(propertyId, {
      date: todayStr,
      category,
      paidFrom,
      property: "Sunshine Luxury PG",
      amount: numAmount,
      hasReceipt: true,
      notes,
    });

    setAmount("");
    setNotes("");
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

    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Log the expense entry
    await expenseStore.addExpense(propertyId, {
      date: todayStr,
      category: recurringModal.category,
      paidFrom: recurringModal.paidFrom,
      property: "Sunshine Luxury PG",
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

  const handleCreateCategoryFromTab = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = catNameInput.trim();
    if (!trimmed) {
      triggerToast("⚠️ Please enter a category name.");
      return;
    }

    partnerStore.addCategory(trimmed, selectedIcon, selectedColor);
    setCatNameInput("");
    triggerToast(`🟢 Custom Category "${trimmed}" created & saved to SSOT!`);
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
      partnerStore.deleteCategory(catId);
      triggerToast(`🗑️ Category "${catName}" removed.`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#fff8f6] text-[#201a17]">
      {/* 256px Left Sidebar with 8 clean primary menus */}
      <PropertySidebar propertyId={propertyId} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header with In-Page Section Tabs */}
        <PropertyHeader
          title="Financial Hub"
          sectionTabs={["Operations", "Expenses", "Partner Settlement", "Reports"]}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />

        {/* Workspace Body */}
        <div className="p-6 md:p-8 space-y-8 flex-1">
          {/* Prominent Highlightable Section Tabs Bar */}
          <div className="space-y-6">
            {/* Top Title & Controls Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <h1 className="font-serif font-bold text-2xl md:text-3xl text-[#201a17]">
                  Financial Hub
                </h1>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  REAL-TIME LEDGER 🟢
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#d7c2b9] text-xs font-semibold text-[#201a17] shadow-2xs">
                  <Calendar className="w-4 h-4 text-[#964407]" />
                  <span>This Month (Oct 2024)</span>
                </div>

                {activeTab === "Expenses" && (
                  <button
                    type="button"
                    onClick={() => setShowRecordDrawer(true)}
                    className="px-4 py-2 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Record Expense
                  </button>
                )}
              </div>
            </div>

            {/* Prominent, Highlightable Section Navigation Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("Operations")}
                className={`p-4 md:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  activeTab === "Operations"
                    ? "bg-white border-[#964407] ring-2 ring-[#964407]/20 shadow-md scale-[1.01]"
                    : "bg-[#fff8f6] border-[#d7c2b9] hover:bg-white hover:border-gray-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      activeTab === "Operations"
                        ? "bg-[#964407] text-white"
                        : "bg-orange-100 text-[#964407] group-hover:bg-[#964407] group-hover:text-white"
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-serif font-bold text-sm md:text-base ${
                        activeTab === "Operations" ? "text-[#964407]" : "text-[#201a17]"
                      }`}
                    >
                      Operations
                    </h3>
                    <p className="text-[11px] text-[#554339]">Health & Task Tracking</p>
                  </div>
                </div>
                {activeTab === "Operations" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#964407] animate-pulse"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("Expenses")}
                className={`p-4 md:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  activeTab === "Expenses"
                    ? "bg-white border-[#964407] ring-2 ring-[#964407]/20 shadow-md scale-[1.01]"
                    : "bg-[#fff8f6] border-[#d7c2b9] hover:bg-white hover:border-gray-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      activeTab === "Expenses"
                        ? "bg-[#964407] text-white"
                        : "bg-emerald-100 text-emerald-800 group-hover:bg-[#964407] group-hover:text-white"
                    }`}
                  >
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-serif font-bold text-sm md:text-base ${
                        activeTab === "Expenses" ? "text-[#964407]" : "text-[#201a17]"
                      }`}
                    >
                      Expenses
                    </h3>
                    <p className="text-[11px] text-[#554339]">Building Cost Ledger</p>
                  </div>
                </div>
                {activeTab === "Expenses" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#964407] animate-pulse"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("Partner Settlement")}
                className={`p-4 md:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  activeTab === "Partner Settlement"
                    ? "bg-white border-[#964407] ring-2 ring-[#964407]/20 shadow-md scale-[1.01]"
                    : "bg-[#fff8f6] border-[#d7c2b9] hover:bg-white hover:border-gray-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      activeTab === "Partner Settlement"
                        ? "bg-[#964407] text-white"
                        : "bg-purple-100 text-purple-700 group-hover:bg-[#964407] group-hover:text-white"
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-serif font-bold text-sm md:text-base ${
                        activeTab === "Partner Settlement" ? "text-[#964407]" : "text-[#201a17]"
                      }`}
                    >
                      Partner Settlement
                    </h3>
                    <p className="text-[11px] text-[#554339]">Equity & Profit Share</p>
                  </div>
                </div>
                {activeTab === "Partner Settlement" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#964407] animate-pulse"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("Categories")}
                className={`p-4 md:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  activeTab === "Categories"
                    ? "bg-white border-[#964407] ring-2 ring-[#964407]/20 shadow-md scale-[1.01]"
                    : "bg-[#fff8f6] border-[#d7c2b9] hover:bg-white hover:border-gray-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      activeTab === "Categories"
                        ? "bg-[#964407] text-white"
                        : "bg-blue-100 text-blue-700 group-hover:bg-[#964407] group-hover:text-[#964407]"
                    }`}
                  >
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-serif font-bold text-sm md:text-base ${
                        activeTab === "Categories" ? "text-[#964407]" : "text-[#201a17]"
                      }`}
                    >
                      Categories
                    </h3>
                    <p className="text-[11px] text-[#554339]">Custom Icons & Colors</p>
                  </div>
                </div>
                {activeTab === "Categories" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#964407] animate-pulse"></span>
                )}
              </button>
            </div>
          </div>

          {/* TAB 1: OPERATIONS PLACEHOLDER */}
          {activeTab === "Operations" && (
            <div className="bg-white rounded-3xl border border-[#d7c2b9] p-8 text-center space-y-4 animate-in fade-in shadow-xs">
              <div className="w-14 h-14 bg-orange-100 text-[#964407] rounded-2xl flex items-center justify-center mx-auto">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#201a17]">
                Financial Operations Workspace
              </h3>
              <p className="text-xs text-[#554339] max-w-md mx-auto leading-relaxed font-medium">
                Operations sub-page workspace ready. In the next step, tell me how you'd like to structure operational KPI cards and pending tasks.
              </p>
              <div className="pt-2">
                <span className="inline-block px-3 py-1 rounded-full bg-orange-50 text-[#964407] text-[10px] font-extrabold border border-orange-200 uppercase">
                  OPERATIONS SUB-PAGE READY 🟢
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: EXPENSES WORKSPACE (STITCH V2 SPECIFICATION) */}
          {activeTab === "Expenses" && (
            <div className="space-y-8 animate-in fade-in">
              {/* Top Bento Grid: Total Spent & Budget Weightages */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Summary Card */}
                <div className="lg:col-span-8 bg-white border border-[#d7c2b9] p-6 md:p-8 rounded-3xl shadow-xs relative overflow-hidden flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#554339] block">
                      TOTAL SPENT THIS MONTH
                    </span>
                    <div className="flex items-baseline gap-4 mt-2">
                      <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#201a17]">
                        ₹{totalSpent.toLocaleString("en-IN")}
                      </h2>
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-700" /> REAL-TIME FIREBASE SYNCED 🟢
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#f8ede3]">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                        HIGHEST CATEGORY
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Zap className="w-4 h-4 text-[#964407]" />
                        <span className="font-serif font-bold text-base text-[#201a17]">
                          {highestCat.category} (₹{highestCat.amount.toLocaleString("en-IN")})
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                        RECORDED TRANSACTIONS
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Receipt className="w-4 h-4 text-purple-700" />
                        <span className="font-serif font-bold text-base text-[#201a17]">
                          {expenseList.length} Entries Logged
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Weightage & Cost Breakdown Progress Card */}
                <div className="lg:col-span-4 bg-white border border-[#d7c2b9] p-6 md:p-8 rounded-3xl shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-[#f8ede3] pb-3">
                    <div>
                      <h3 className="font-serif font-bold text-base text-[#201a17]">
                        Category Cost Weightage
                      </h3>
                      <p className="text-[10px] text-[#554339] font-medium">% Share of total monthly spend</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#964407] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 uppercase">
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
                            <span className="text-[#554339]">{cw.category}</span>
                            <span className="text-[#964407] font-mono">
                              ₹{cw.amount.toLocaleString("en-IN")} ({cw.percentage}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-[#f8ede3] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                idx === 0
                                  ? "bg-[#964407]"
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

              {/* Recurring Fixed Bills Horizontal Left-to-Right Scrollable Row */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-lg text-[#201a17]">
                      Recurring Bills & Utilities Summary
                    </h3>
                    <span className="text-[10px] font-extrabold text-[#964407] bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
                      ↔️ Scrollable Row
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAddRecurringModal()}
                    className="text-xs font-bold text-[#964407] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Bill Schedule
                  </button>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-3 scrollbar-thin snap-x">
                  {recurringBillsList.map((bill) => (
                    <div
                      key={bill.id}
                      className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs space-y-3 flex flex-col justify-between shrink-0 w-72 sm:w-80 snap-start relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-orange-100 text-[#964407]">
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
                            <h4 className="font-bold text-sm text-[#201a17]">{bill.title}</h4>
                            <p className="text-[10px] text-[#554339] font-medium">{bill.dueDate}</p>
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
                        <span className="font-serif font-bold text-lg text-[#201a17]">
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
                          className="text-[10px] font-extrabold text-white bg-[#964407] hover:bg-[#c2652a] px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          + Log Payment
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add New Recurring Bill Action Dash Card */}
                  <div
                    onClick={() => handleOpenAddRecurringModal()}
                    className="p-5 rounded-2xl border-2 border-dashed border-[#d7c2b9] bg-[#fff8f6] hover:bg-white hover:border-[#964407] transition-all cursor-pointer flex flex-col justify-center items-center text-center space-y-2 shrink-0 w-64 snap-start group min-h-[120px]"
                  >
                    <div className="p-3 rounded-full bg-orange-100 text-[#964407] group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#201a17]">Add Recurring Bill</h4>
                      <p className="text-[10px] text-[#554339]">Setup new monthly schedule</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Expenses Detailed Table Section */}
              <div className="bg-white rounded-3xl border border-[#d7c2b9] p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#f8ede3] pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#201a17]">
                      Operational Expenses Ledger
                    </h3>
                    <p className="text-xs text-[#554339]">
                      Showing {expenseList.filter((item) => selectedCategoryFilter === "ALL" || item.category === selectedCategoryFilter).length} recorded expense transactions (Firebase Synced)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Export CSV Button */}
                    <button
                      type="button"
                      onClick={() => expenseStore.exportLedgerToCSV(propertyId)}
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
                      <span className="text-[#554339] font-bold flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5" /> Filter:
                      </span>
                      <button
                        onClick={() => setSelectedCategoryFilter("ALL")}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          selectedCategoryFilter === "ALL"
                            ? "bg-[#964407] text-white shadow-xs"
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
                              ? "bg-[#964407] text-white shadow-xs"
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
                      <tr className="border-b border-[#f8ede3] text-[10px] uppercase tracking-wider text-[#554339] font-bold bg-[#fff8f6]">
                        <th className="py-3 px-4 font-bold">DATE</th>
                        <th className="py-3 px-4 font-bold">CATEGORY</th>
                        <th className="py-3 px-4 font-bold">PAID BY</th>
                        <th className="py-3 px-4 font-bold">PROPERTY</th>
                        <th className="py-3 px-4 font-bold">AMOUNT</th>
                        <th className="py-3 px-4 font-bold">RECEIPT</th>
                        <th className="py-3 px-4 font-bold text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8ede3]">
                      {expenseList
                        .filter((item) => selectedCategoryFilter === "ALL" || item.category === selectedCategoryFilter)
                        .map((exp) => (
                          <tr key={exp.id} className="hover:bg-[#fff8f6]/60 transition-colors">
                            <td className="py-4 px-4 text-[#554339] font-medium">{exp.date}</td>
                            <td className="py-4 px-4 font-bold text-[#201a17] flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-orange-100 text-[#964407]">
                                <Receipt className="w-3.5 h-3.5" />
                              </span>
                              {exp.category}
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-[#201a17] flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-[#964407] text-white text-[9px] font-bold flex items-center justify-center">
                                  {exp.paidFrom.charAt(0)}
                                </span>
                                {exp.paidFrom}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-[#554339]">{exp.property}</td>
                            <td className="py-4 px-4 font-mono font-bold text-base text-[#201a17]">
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
                        <span className="font-mono font-bold text-base text-[#964407]">
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

              {/* Record Expense Modal Drawer inside Expenses Tab */}
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
                          <Receipt className="w-5 h-5 text-[#964407]" /> Record Operational Expense
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

                    <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
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
                            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white font-mono font-bold text-sm text-gray-900 focus:ring-1 focus:ring-[#964407]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block font-bold text-gray-900">
                              Category *
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                              className="text-[11px] font-bold text-[#964407] hover:underline cursor-pointer"
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
                                className="w-full px-3 py-2 rounded-xl border border-[#964407] bg-[#fff8f6] text-xs font-bold text-gray-900 focus:ring-1 focus:ring-[#964407]"
                              />
                              <button
                                type="button"
                                onClick={handleCreateInlineCategory}
                                className="px-3 py-2 rounded-xl bg-[#964407] text-white font-bold text-xs shrink-0 cursor-pointer hover:bg-[#c2652a] shadow-xs"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <select
                              value={category}
                              onChange={(e) => {
                                if (e.target.value === "ADD_NEW") {
                                  setIsAddingNewCategory(true);
                                } else {
                                  setCategory(e.target.value);
                                }
                              }}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
                            >
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.name}>
                                  {cat.name}
                                </option>
                              ))}
                              <option value="ADD_NEW" className="font-bold text-[#964407]">
                                + Add Custom Category...
                              </option>
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="block font-bold text-gray-900 mb-1">
                            Paid From *
                          </label>
                          <select
                            value={paidFrom}
                            onChange={(e) => setPaidFrom(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
                          >
                            <option value="Business Account">Business Account</option>
                            <option value="Petty Cash">Petty Cash</option>
                            {partners.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name} ({p.ownershipPercentage}%)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-900 mb-1">
                          Receipt Attachment (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center bg-gray-50 cursor-pointer hover:border-[#964407] transition-colors">
                          <Upload className="w-5 h-5 text-[#964407] mx-auto mb-1" />
                          <span className="font-bold text-gray-900 block text-xs">
                            Click to upload receipt
                          </span>
                          <span className="text-[10px] text-gray-500">
                            JPG, PNG, PDF (Max 5MB)
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-900 mb-1">
                          Notes / Description (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add details (vendor name, invoice number, etc)..."
                          className="w-full p-3 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
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
                          className="flex-1 py-3 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs transition-all shadow-md cursor-pointer"
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
                          <CheckCircle2 className="w-5 h-5 text-[#964407]" /> Confirm Recurring Bill Payment
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

                    <div className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-500">Bill Category:</span>
                        <span className="font-bold text-gray-900 text-sm">{recurringModal.category}</span>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-gray-900">
                            Payment Amount (₹) *
                          </label>
                          <span className="text-[10px] font-semibold text-[#964407]">
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
                            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#964407] bg-white font-mono font-bold text-base text-gray-900 focus:ring-1 focus:ring-[#964407]"
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
                            className="w-4 h-4 rounded text-[#964407] focus:ring-[#964407]"
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
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
                        >
                          <option value="Business Account">Business Account</option>
                          <option value="Petty Cash">Petty Cash</option>
                          {partners.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({p.ownershipPercentage}%)
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
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
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
                        className="flex-1 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
              {/* Stat Cards Grid (4 Cards matching screenshot) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stat Card 1 */}
                <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                      Total Rent Collected
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-serif font-bold text-2xl text-[#201a17]">₹8,00,000</p>
                  <p className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> 6.2% vs Sep 2024
                  </p>
                </div>

                {/* Stat Card 2 */}
                <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                      Total Expenses
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-serif font-bold text-2xl text-[#201a17]">
                    ₹{totalSpent.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Firebase Live
                  </p>
                </div>

                {/* Stat Card 3 */}
                <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                      Net Profit
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-serif font-bold text-2xl text-[#201a17]">
                    ₹{(800000 - totalSpent).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> 7.8% vs Sep 2024
                  </p>
                </div>

                {/* Stat Card 4 */}
                <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                      Profit Margin
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-serif font-bold text-2xl text-[#201a17]">
                    {(((800000 - totalSpent) / 800000) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Live Ratio
                  </p>
                </div>
              </div>

              {/* Partner Settlement Overview Table Section */}
              <div className="bg-white rounded-2xl border border-[#d7c2b9] p-6 shadow-xs">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif font-bold text-lg text-[#201a17]">
                    Partner Settlement Overview
                  </h3>
                  <a
                    href="#report"
                    className="text-xs font-bold text-[#964407] hover:underline flex items-center gap-1"
                  >
                    View Full Report →
                  </a>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#f8ede3] text-[10px] uppercase tracking-wider text-[#554339] font-bold">
                        <th className="pb-3 font-bold">Partner</th>
                        <th className="pb-3 font-bold">Ownership %</th>
                        <th className="pb-3 font-bold">Paid Out-Of-Pocket (This Month)</th>
                        <th className="pb-3 font-bold">Profit Share</th>
                        <th className="pb-3 font-bold">Receivable / Payable</th>
                        <th className="pb-3 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8ede3]">
                      {partners.map((p) => {
                        const totalNetProfit = 800000 - totalSpent;
                        const profitShare = Math.round((totalNetProfit * (p.ownershipPercentage || 0)) / 100);
                        const actualPaid = partnerContributions[p.name] || 0;
                        const receivable = profitShare - actualPaid;

                        return (
                          <tr key={p.id}>
                            <td className="py-4 font-bold flex items-center gap-2 text-[#201a17]">
                              <span
                                className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold"
                                style={{ backgroundColor: p.color || "#964407" }}
                              >
                                {p.name.charAt(0)}
                              </span>
                              {p.name}
                            </td>
                            <td className="py-4 text-[#554339] font-bold">{p.ownershipPercentage}%</td>
                            <td className="py-4 text-[#554339] font-mono font-semibold">₹{actualPaid.toLocaleString("en-IN")}</td>
                            <td className="py-4 font-mono font-bold text-[#201a17]">₹{profitShare.toLocaleString("en-IN")}</td>
                            <td className={`py-4 font-mono font-bold ${receivable >= 0 ? "text-[#059669]" : "text-red-600"}`}>
                              {receivable >= 0 ? `+₹${receivable.toLocaleString("en-IN")}` : `-₹${Math.abs(receivable).toLocaleString("en-IN")}`}
                            </td>
                            <td className="py-4 text-right">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                receivable >= 0 ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
                              }`}>
                                {receivable >= 0 ? "Receivable" : "Payable"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Expense Hub Reference Banner */}
              <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-orange-100 text-[#964407]">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#201a17]">
                      Operational Expenses Ledger & Receipts
                    </h4>
                    <p className="text-xs text-[#554339]">
                      View, log, filter, and audit detailed building operational costs in the Central Expenses Hub.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("Expenses")}
                  className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
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
              <div className="bg-white rounded-2xl border border-[#d7c2b9] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#f8ede3]">
                  <h4 className="font-serif font-bold text-sm text-[#201a17] flex items-center gap-2">
                    Partner Ownership & Ratios
                  </h4>
                  <Link
                    href={`/p/${propertyId}/settings`}
                    className="text-[#964407] font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <Settings className="w-3.5 h-3.5" /> Manage in Settings ⚙️
                  </Link>
                </div>

                <div className="space-y-3 text-xs">
                  {partners.map((p) => (
                    <div key={p.id} className="flex justify-between items-center">
                      <span className="flex items-center gap-2 font-bold text-[#201a17]">
                        <span
                          className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold"
                          style={{ backgroundColor: p.color || "#964407" }}
                        >
                          {p.name.charAt(0)}
                        </span>
                        {p.name}
                      </span>
                      <span className="font-mono font-bold text-[#554339]">{p.ownershipPercentage}%</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#f8ede3] pt-3 flex justify-between items-center text-xs font-bold text-[#201a17]">
                  <span>Total Ownership</span>
                  <span className="font-mono">{partners.reduce((a, b) => a + (b.ownershipPercentage || 0), 0)}%</span>
                </div>

                <p className="text-[10px] text-[#554339] italic pt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#554339]" /> Fully editable from Settings page. Settlement updates in real-time.
                </p>
              </div>
            </div>
          </div>
          )}

          {/* TAB 4: CATEGORY MANAGEMENT & CUSTOMIZER WORKSPACE */}
          {activeTab === "Categories" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Color & Icon Category Creator Form */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-[#d7c2b9] p-6 sm:p-8 shadow-xs space-y-6">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#201a17] flex items-center gap-2">
                      <Tag className="w-5 h-5 text-[#964407]" /> Custom Category Creator
                    </h3>
                    <p className="text-xs text-[#554339] mt-1">
                      Add new operational expense categories with custom theme colors and icons
                    </p>
                  </div>

                  <form onSubmit={handleCreateCategoryFromTab} className="space-y-5 text-xs">
                    <div>
                      <label className="block font-bold text-gray-900 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={catNameInput}
                        onChange={(e) => setCatNameInput(e.target.value)}
                        placeholder="e.g. Generator Fuel, Pest Control"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
                      />
                    </div>

                    {/* Color Swatch Picker */}
                    <div>
                      <label className="block font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-[#964407]" /> Select Theme Color *
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.name}
                            type="button"
                            onClick={() => setSelectedColor(swatch.hex)}
                            className={`w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                              selectedColor === swatch.hex
                                ? "ring-2 ring-offset-2 ring-[#964407] scale-110 shadow-sm"
                                : "hover:scale-105 opacity-80 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                            title={swatch.name}
                          >
                            {selectedColor === swatch.hex && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 100+ Categorized Business Icon Library Picker */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-bold text-gray-900">
                          Select Business Icon (100+ Library) *
                        </label>
                        <span className="text-[10px] font-bold text-[#964407] bg-orange-100 px-2 py-0.5 rounded-full">
                          Selected: {selectedIcon}
                        </span>
                      </div>

                      {/* Icon Category Tabs Bar */}
                      <div className="flex overflow-x-auto gap-1.5 pb-2 mb-2.5 scrollbar-thin">
                        {CATEGORIZED_ICON_LIBRARY.map((group) => (
                          <button
                            key={group.category}
                            type="button"
                            onClick={() => setSelectedIconGroupTab(group.category)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                              selectedIconGroupTab === group.category
                                ? "bg-[#964407] text-white shadow-xs"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {group.category}
                          </button>
                        ))}
                      </div>

                      {/* Icons Grid for Active Tab */}
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 bg-gray-50 rounded-2xl border border-gray-200">
                        {CATEGORIZED_ICON_LIBRARY.find(
                          (g) => g.category === selectedIconGroupTab
                        )?.icons.map((iconOpt) => (
                          <button
                            key={iconOpt.name}
                            type="button"
                            onClick={() => setSelectedIcon(iconOpt.name)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              selectedIcon === iconOpt.name
                                ? "bg-white border-[#964407] ring-2 ring-[#964407]/30 text-[#964407] font-bold shadow-xs scale-105"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <RenderDynamicCategoryIcon
                              iconName={iconOpt.name}
                              className="w-4 h-4"
                            />
                            <span className="text-[9px] truncate w-full text-center">
                              {iconOpt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      + Save Category to System
                    </button>
                  </form>
                </div>

                {/* Right Column: Active Categories Directory Grid */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-serif font-bold text-xl text-[#201a17]">
                        Active Categories Directory ({categories.length})
                      </h3>
                      <p className="text-xs text-[#554339]">
                        All operational building categories currently included in your ledger
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {categories.map((cat) => {
                      const catExpenses = expenseList.filter((e) => e.category === cat.name);
                      const catTotal = catExpenses.reduce((a, b) => a + b.amount, 0);

                      return (
                        <div
                          key={cat.id}
                          className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs space-y-3 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="p-2.5 rounded-xl text-white font-bold shadow-xs flex items-center justify-center shrink-0"
                                style={{ backgroundColor: cat.color || "#964407" }}
                              >
                                <RenderDynamicCategoryIcon
                                  iconName={cat.icon}
                                  className="w-5 h-5 text-white"
                                />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-[#201a17]">{cat.name}</h4>
                                <p className="text-[10px] text-[#554339]">
                                  {catExpenses.length} Logged Transactions
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="border-t border-[#f8ede3] pt-2 flex justify-between items-center">
                            <span className="text-[10px] text-[#554339] font-medium">Total Spend</span>
                            <span className="font-mono font-bold text-[#964407] text-base">
                              ₹{catTotal.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                  <Clock className="w-5 h-5 text-[#964407]" />
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
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-mono font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
                  >
                    <option value="Business Account">Business Account</option>
                    <option value="Petty Cash">Petty Cash</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
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
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
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
                  className="flex-1 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
            <div className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] space-y-2">
              <label className="block font-bold text-gray-900">
                + Create New Expense Category
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="Enter category (e.g. Pest Control)"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
                />
                <button
                  type="button"
                  onClick={handleCreateInlineCategory}
                  className="px-4 py-2 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
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
                      <div className="p-2 rounded-xl bg-orange-100 text-[#964407] font-bold">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{cat.name}</h4>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {catExpenses.length} Logged Transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-[#964407]">
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

      {/* Floating Luxury Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#201a17] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#964407]/40 flex items-center gap-3 max-w-md text-xs font-bold">
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
