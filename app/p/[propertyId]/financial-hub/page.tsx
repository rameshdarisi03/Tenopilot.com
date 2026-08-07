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
} from "lucide-react";
import { partnerStore, PartnerConfig, ExpenseCategoryConfig } from "@/constants/partnerStore";

export interface ExpenseItem {
  id: string;
  date: string;
  category: string;
  paidFrom: string;
  property: string;
  amount: number;
  hasReceipt: boolean;
  notes?: string;
}

const INITIAL_EXPENSES: ExpenseItem[] = [
  { id: "exp-1", date: "12 Oct 2024", category: "Electricity", paidFrom: "Ramesh", property: "Sunshine Luxury PG", amount: 12400, hasReceipt: true },
  { id: "exp-2", date: "11 Oct 2024", category: "Water Supply", paidFrom: "Business Account", property: "Sunshine Luxury PG", amount: 3200, hasReceipt: true },
  { id: "exp-3", date: "10 Oct 2024", category: "Staff Salary", paidFrom: "Suresh", property: "Sunshine Luxury PG", amount: 18000, hasReceipt: false },
  { id: "exp-4", date: "09 Oct 2024", category: "Internet / Wi-Fi", paidFrom: "Mahesh", property: "Sunshine Luxury PG", amount: 1200, hasReceipt: false },
  { id: "exp-5", date: "08 Oct 2024", category: "Property Maintenance", paidFrom: "Business Account", property: "Sunshine Luxury PG", amount: 6500, hasReceipt: true },
];

export default function FinancialHubPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";
  const [activeTab, setActiveTab] = useState("Expenses");
  const [showRecordDrawer, setShowRecordDrawer] = useState(true);
  const [showToast, setShowToast] = useState(true);

  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Electricity");
  const [paidFrom, setPaidFrom] = useState("Business Account");
  const [notes, setNotes] = useState("");

  // Expenses State
  const [expenseList, setExpenseList] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [activeReceiptModal, setActiveReceiptModal] = useState<ExpenseItem | null>(null);

  // Reactive Partner & Category State
  const [partners, setPartners] = useState<PartnerConfig[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryConfig[]>([]);

  useEffect(() => {
    setPartners(partnerStore.getPartners());
    setCategories(partnerStore.getCategories());

    const unsub = partnerStore.subscribe(() => {
      setPartners(partnerStore.getPartners());
      setCategories(partnerStore.getCategories());
    });
    return unsub;
  }, []);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      date: todayStr,
      category,
      paidFrom,
      property: "Sunshine Luxury PG",
      amount: numAmount,
      hasReceipt: true,
      notes,
    };

    setExpenseList((prev) => [newExpense, ...prev]);
    setAmount("");
    setNotes("");
    setShowRecordDrawer(false);
    setShowToast(true);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm("Are you sure you want to delete this expense record?")) {
      setExpenseList((prev) => prev.filter((e) => e.id !== id));
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
          {/* World-Class Architect Header & Navigation Canvas */}
          <div className="bg-white rounded-3xl border border-[#d7c2b9] p-6 md:p-8 shadow-xs space-y-6 relative overflow-hidden">
            {/* Subtle luxury ambient accent glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#f8ede3] to-transparent rounded-full opacity-60 pointer-events-none -mr-20 -mt-20"></div>

            {/* Top Bar: Title, Description & Action Control Cluster */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full bg-[#f8ede3] text-[#964407] font-extrabold text-[10px] uppercase tracking-wider border border-[#d7c2b9]">
                    FINANCIAL HUB WORKSPACE
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">•</span>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    REAL-TIME LEDGER ACTIVE 🟢
                  </span>
                </div>
                <h1 className="font-serif font-bold text-2xl md:text-3xl text-[#201a17] tracking-tight">
                  {activeTab === "Operations"
                    ? "Financial Operations Workspace"
                    : activeTab === "Expenses"
                    ? "Expense Management & Cost Ledger"
                    : "Partner Settlement & Profit Sharing"}
                </h1>
                <p className="text-xs text-[#554339] font-medium max-w-2xl leading-relaxed">
                  {activeTab === "Operations"
                    ? "Review overall operational financial health, collection performance, and resolve pending financial tasks across your property."
                    : activeTab === "Expenses"
                    ? "Track, filter, and audit building operational costs, vendor bills, recurring utility schedules, and receipt attachments."
                    : "Real-time partner equity distribution, personal account expense contributions, profit shares, and net settlement ledger."}
                </p>
              </div>

              <div className="relative z-10 flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] text-xs font-bold text-[#201a17] shadow-2xs">
                  <Calendar className="w-4 h-4 text-[#964407]" />
                  <span>This Month (Oct 2024)</span>
                </div>

                {activeTab === "Expenses" && (
                  <button
                    type="button"
                    onClick={() => setShowRecordDrawer(true)}
                    className="px-5 py-2.5 rounded-2xl bg-[#964407] hover:bg-[#c2652a] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Record Expense
                  </button>
                )}
              </div>
            </div>

            {/* Segmented Sub-Page Access Tab Switcher Bar */}
            <div className="relative z-10 pt-2 border-t border-[#f8ede3] flex items-center gap-2 sm:gap-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("Operations")}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "Operations"
                    ? "bg-[#964407] text-white shadow-md scale-[1.02]"
                    : "bg-[#fff8f6] text-[#554339] border border-[#d7c2b9] hover:bg-white hover:text-[#201a17]"
                }`}
              >
                <Building2 className="w-4 h-4" /> 1. Operations
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("Expenses")}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "Expenses"
                    ? "bg-[#964407] text-white shadow-md scale-[1.02]"
                    : "bg-[#fff8f6] text-[#554339] border border-[#d7c2b9] hover:bg-white hover:text-[#201a17]"
                }`}
              >
                <Receipt className="w-4 h-4" /> 2. Expenses
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("Partner Settlement")}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "Partner Settlement"
                    ? "bg-[#964407] text-white shadow-md scale-[1.02]"
                    : "bg-[#fff8f6] text-[#554339] border border-[#d7c2b9] hover:bg-white hover:text-[#201a17]"
                }`}
              >
                <Wallet className="w-4 h-4" /> 3. Partner Settlement
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
              {/* Top Bento Grid: Total Spent & Budget Health */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Summary Card */}
                <div className="lg:col-span-8 bg-white border border-[#d7c2b9] p-6 md:p-8 rounded-3xl shadow-xs relative overflow-hidden flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#554339] block">
                      TOTAL SPENT THIS MONTH
                    </span>
                    <div className="flex items-baseline gap-4 mt-2">
                      <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#201a17]">
                        ₹{expenseList.reduce((acc, e) => acc + e.amount, 0).toLocaleString("en-IN")}
                      </h2>
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-700" /> -4.2% VS LAST MONTH
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
                          Electricity (₹{expenseList.filter((e) => e.category === "Electricity").reduce((a, b) => a + b.amount, 0).toLocaleString("en-IN") || "12,400"})
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                        UNPROCESSED RECEIPTS
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Receipt className="w-4 h-4 text-purple-700" />
                        <span className="font-serif font-bold text-base text-[#201a17]">
                          02 Pending Upload
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Budget Health Progress Card */}
                <div className="lg:col-span-4 bg-white border border-[#d7c2b9] p-6 md:p-8 rounded-3xl shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-[#f8ede3] pb-3">
                    <h3 className="font-serif font-bold text-base text-[#201a17]">
                      Budget Health
                    </h3>
                    <span className="text-[10px] font-bold text-[#554339] uppercase">
                      THIS MONTH
                    </span>
                  </div>

                  <div className="space-y-4 text-xs font-bold">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#554339]">Maintenance</span>
                        <span className="text-[#964407]">82% Used</span>
                      </div>
                      <div className="h-2 w-full bg-[#f8ede3] rounded-full overflow-hidden">
                        <div className="h-full bg-[#964407] w-[82%] rounded-full"></div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#554339]">Staff Salaries</span>
                        <span className="text-emerald-700">45% Used</span>
                      </div>
                      <div className="h-2 w-full bg-[#f8ede3] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 w-[45%] rounded-full"></div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#554339]">Utilities</span>
                        <span className="text-red-700">94% Used</span>
                      </div>
                      <div className="h-2 w-full bg-[#f8ede3] rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 w-[94%] rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recurring Fixed Bills Summary Cards Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-lg text-[#201a17]">
                    Recurring Bills & Utilities Summary
                  </h3>
                  <span className="text-xs text-[#554339] font-medium">
                    Auto-scheduled monthly building operational costs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Bill 1 */}
                  <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                        <Wifi className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#201a17]">Internet / Wi-Fi</h4>
                        <p className="text-[10px] text-[#554339] font-medium">Monthly • 1st</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-serif font-bold text-lg text-[#201a17]">₹2,499</span>
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Paid
                      </span>
                    </div>
                  </div>

                  {/* Bill 2 */}
                  <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-orange-100 text-[#964407]">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#201a17]">Electricity Bill</h4>
                        <p className="text-[10px] text-[#554339] font-medium">Variable • 15th</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-serif font-bold text-lg text-[#201a17]">₹84,200</span>
                      <span className="text-[10px] font-extrabold text-orange-950 bg-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        Due in 3 days 🟠
                      </span>
                    </div>
                  </div>

                  {/* Bill 3 */}
                  <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                        <Droplet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#201a17]">Water Supply</h4>
                        <p className="text-[10px] text-[#554339] font-medium">Fixed • 5th</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-serif font-bold text-lg text-[#201a17]">₹12,500</span>
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Paid
                      </span>
                    </div>
                  </div>

                  {/* Bill 4 */}
                  <div className="p-5 rounded-2xl bg-white border border-[#d7c2b9] shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#201a17]">Staff Salary</h4>
                        <p className="text-[10px] text-[#554339] font-medium">Monthly • 1st</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-serif font-bold text-lg text-[#201a17]">₹66,000</span>
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Paid
                      </span>
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
                      Showing {expenseList.filter((item) => selectedCategoryFilter === "ALL" || item.category === selectedCategoryFilter).length} recorded expense transactions
                    </p>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
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
                          <label className="block font-bold text-gray-900 mb-1">
                            Category *
                          </label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
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
                  <p className="font-serif font-bold text-2xl text-[#201a17]">₹3,60,000</p>
                  <p className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> 4.1% vs Sep 2024
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
                  <p className="font-serif font-bold text-2xl text-[#201a17]">₹4,40,000</p>
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
                  <p className="font-serif font-bold text-2xl text-[#201a17]">55.0%</p>
                  <p className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> 2.3% vs Sep 2024
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
                        <th className="pb-3 font-bold">Paid From (This Month)</th>
                        <th className="pb-3 font-bold">Profit Share</th>
                        <th className="pb-3 font-bold">Receivable / Payable</th>
                        <th className="pb-3 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8ede3]">
                      {partners.map((p) => {
                        const totalNetProfit = 440000;
                        const profitShare = Math.round((totalNetProfit * (p.ownershipPercentage || 0)) / 100);
                        const mockPaid = p.name === "Ramesh" ? 80000 : p.name === "Suresh" ? 30000 : 40000;
                        const receivable = profitShare - mockPaid;

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
                            <td className="py-4 text-[#554339]">₹{mockPaid.toLocaleString("en-IN")}</td>
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
        </div>
      </div>
    </div>
  );
}
