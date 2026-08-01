"use client";

import { useState } from "react";
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
} from "lucide-react";

export default function FinancialHubPage({
  params,
}: {
  params: { propertyId: string };
}) {
  const propertyId = params.propertyId || "sunshine-pg";
  const [activeTab, setActiveTab] = useState("Expenses");
  const [showRecordDrawer, setShowRecordDrawer] = useState(true);
  const [showToast, setShowToast] = useState(true);

  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Electricity");
  const [paidFrom, setPaidFrom] = useState("Business Account");
  const [notes, setNotes] = useState("");

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => {
      setShowToast(true);
    }, 100);
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
          {/* Module Title & Actions Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif font-bold text-2xl md:text-3xl text-[#201a17]">
                Partner Settlement
              </h2>
              <p className="text-xs text-[#554339] mt-1">
                Real-time profit sharing and partner settlement overview
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#d7c2b9] text-xs font-semibold text-[#201a17] shadow-xs">
                <Calendar className="w-4 h-4 text-[#964407]" />
                <span>This Month (Oct 2024)</span>
              </div>

              <button
                onClick={() => setShowRecordDrawer(true)}
                className="px-4 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Record Expense
              </button>
            </div>
          </div>

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
                      <tr>
                        <td className="py-4 font-bold flex items-center gap-2 text-[#201a17]">
                          <span className="w-6 h-6 rounded-full bg-[#964407] text-white flex items-center justify-center text-[10px] font-bold">
                            R
                          </span>
                          Ramesh
                        </td>
                        <td className="py-4 text-[#554339]">40%</td>
                        <td className="py-4 text-[#554339]">₹80,000</td>
                        <td className="py-4 font-mono font-bold text-[#201a17]">₹1,76,000</td>
                        <td className="py-4 font-mono font-bold text-[#059669]">+₹96,000</td>
                        <td className="py-4 text-right">
                          <span className="badge-available px-2.5 py-1 rounded-full text-[10px] font-bold">
                            Receivable
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 font-bold flex items-center gap-2 text-[#201a17]">
                          <span className="w-6 h-6 rounded-full bg-[#059669] text-white flex items-center justify-center text-[10px] font-bold">
                            S
                          </span>
                          Suresh
                        </td>
                        <td className="py-4 text-[#554339]">40%</td>
                        <td className="py-4 text-[#554339]">₹30,000</td>
                        <td className="py-4 font-mono font-bold text-[#201a17]">₹1,76,000</td>
                        <td className="py-4 font-mono font-bold text-[#059669]">+₹1,46,000</td>
                        <td className="py-4 text-right">
                          <span className="badge-available px-2.5 py-1 rounded-full text-[10px] font-bold">
                            Receivable
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 font-bold flex items-center gap-2 text-[#201a17]">
                          <span className="w-6 h-6 rounded-full bg-purple-700 text-white flex items-center justify-center text-[10px] font-bold">
                            M
                          </span>
                          Mahesh
                        </td>
                        <td className="py-4 text-[#554339]">20%</td>
                        <td className="py-4 text-[#554339]">₹40,000</td>
                        <td className="py-4 font-mono font-bold text-[#201a17]">₹88,000</td>
                        <td className="py-4 font-mono font-bold text-[#059669]">+₹48,000</td>
                        <td className="py-4 text-right">
                          <span className="badge-available px-2.5 py-1 rounded-full text-[10px] font-bold">
                            Receivable
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Expenses Table Section */}
              <div className="bg-white rounded-2xl border border-[#d7c2b9] p-6 shadow-xs">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif font-bold text-lg text-[#201a17]">
                    Recent Expenses
                  </h3>
                  <a
                    href="#all-expenses"
                    className="text-xs font-bold text-[#964407] hover:underline flex items-center gap-1"
                  >
                    View All Expenses →
                  </a>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#f8ede3] text-[10px] uppercase tracking-wider text-[#554339] font-bold">
                        <th className="pb-3 font-bold">Date</th>
                        <th className="pb-3 font-bold">Category</th>
                        <th className="pb-3 font-bold">Paid From</th>
                        <th className="pb-3 font-bold">Property</th>
                        <th className="pb-3 font-bold">Amount</th>
                        <th className="pb-3 font-bold text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8ede3]">
                      <tr>
                        <td className="py-3.5 text-[#554339]">12 Oct 2024</td>
                        <td className="py-3.5 font-semibold text-[#201a17]">⚡ Electricity</td>
                        <td className="py-3.5 text-[#554339] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-[#964407] text-white flex items-center justify-center text-[9px] font-bold">
                            R
                          </span>
                          Ramesh
                        </td>
                        <td className="py-3.5 text-[#554339]">Marigold District</td>
                        <td className="py-3.5 font-mono font-bold text-[#201a17]">₹12,400</td>
                        <td className="py-3.5 text-right">
                          <FileText className="w-4 h-4 text-[#964407] inline cursor-pointer" />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 text-[#554339]">11 Oct 2024</td>
                        <td className="py-3.5 font-semibold text-[#201a17]">💧 Water</td>
                        <td className="py-3.5 text-[#554339] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center text-[9px] font-bold">
                            💼
                          </span>
                          Business Account
                        </td>
                        <td className="py-3.5 text-[#554339]">Sunshine Heights</td>
                        <td className="py-3.5 font-mono font-bold text-[#201a17]">₹3,200</td>
                        <td className="py-3.5 text-right">
                          <FileText className="w-4 h-4 text-[#964407] inline cursor-pointer" />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 text-[#554339]">10 Oct 2024</td>
                        <td className="py-3.5 font-semibold text-[#201a17]">👤 Staff Salary</td>
                        <td className="py-3.5 text-[#554339] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-[#059669] text-white flex items-center justify-center text-[9px] font-bold">
                            S
                          </span>
                          Suresh
                        </td>
                        <td className="py-3.5 text-[#554339]">Sunshine Heights</td>
                        <td className="py-3.5 font-mono font-bold text-[#201a17]">₹18,000</td>
                        <td className="py-3.5 text-right">
                          <FileText className="w-4 h-4 text-[#964407] inline cursor-pointer" />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 text-[#554339]">09 Oct 2024</td>
                        <td className="py-3.5 font-semibold text-[#201a17]">📶 Internet</td>
                        <td className="py-3.5 text-[#554339] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center text-[9px] font-bold">
                            M
                          </span>
                          Mahesh
                        </td>
                        <td className="py-3.5 text-[#554339]">Sunshine Heights</td>
                        <td className="py-3.5 font-mono font-bold text-[#201a17]">₹1,200</td>
                        <td className="py-3.5 text-right text-[#554339]">—</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 text-[#554339]">08 Oct 2024</td>
                        <td className="py-3.5 font-semibold text-[#201a17]">🔧 Maintenance</td>
                        <td className="py-3.5 text-[#554339] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center text-[9px] font-bold">
                            💼
                          </span>
                          Business Account
                        </td>
                        <td className="py-3.5 text-[#554339]">Marigold District</td>
                        <td className="py-3.5 font-mono font-bold text-[#201a17]">₹6,500</td>
                        <td className="py-3.5 text-right">
                          <FileText className="w-4 h-4 text-[#964407] inline cursor-pointer" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Slide-Over Record Expense Drawer & Partner Settings Card */}
            <div className="lg:col-span-4 space-y-6">
              {/* Record Expense Side Form Card */}
              {showRecordDrawer && (
                <div className="bg-white rounded-2xl border border-[#d7c2b9] p-6 shadow-md relative animate-in fade-in">
                  <div className="flex items-center justify-between pb-4 border-b border-[#f8ede3] mb-4">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#201a17]">
                        Record Expense
                      </h3>
                      <p className="text-xs text-[#554339]">
                        Log a new expense in a few seconds.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowRecordDrawer(false)}
                      className="p-1 rounded-full hover:bg-[#f8ede3] text-[#554339]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-[#201a17] mb-1">
                        Amount *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-[#554339] font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#d7c2b9] bg-[#fff8f6] text-xs text-[#201a17] focus:outline-none focus:border-[#964407]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[#201a17] mb-1">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#d7c2b9] bg-[#fff8f6] text-xs text-[#201a17] focus:outline-none focus:border-[#964407]"
                      >
                        <option value="Electricity">Electricity</option>
                        <option value="Water">Water</option>
                        <option value="Staff Salary">Staff Salary</option>
                        <option value="Internet">Internet</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Generator Diesel">Generator Diesel</option>
                      </select>
                      <button
                        type="button"
                        className="text-[#964407] font-bold text-[10px] mt-1 block hover:underline"
                      >
                        + Add New Category
                      </button>
                    </div>

                    <div>
                      <label className="block font-bold text-[#201a17] mb-1">
                        Paid From *
                      </label>
                      <select
                        value={paidFrom}
                        onChange={(e) => setPaidFrom(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#d7c2b9] bg-[#fff8f6] text-xs text-[#201a17] focus:outline-none focus:border-[#964407]"
                      >
                        <option value="Business Account">Business Account</option>
                        <option value="Petty Cash">Petty Cash</option>
                        <option value="Ramesh (Partner)">Ramesh (Partner)</option>
                        <option value="Suresh (Partner)">Suresh (Partner)</option>
                        <option value="Mahesh (Partner)">Mahesh (Partner)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#201a17] mb-1">
                        Receipt (Optional)
                      </label>
                      <div className="border-2 border-dashed border-[#d7c2b9] rounded-xl p-4 text-center bg-[#fff8f6] cursor-pointer hover:border-[#964407] transition-colors">
                        <Upload className="w-5 h-5 text-[#964407] mx-auto mb-1" />
                        <span className="font-bold text-[#201a17] block">
                          Upload Receipt
                        </span>
                        <span className="text-[10px] text-[#554339]">
                          JPG, PNG, PDF (Max 5MB)
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[#201a17] mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add a short note (if any)..."
                        className="w-full p-2.5 rounded-lg border border-[#d7c2b9] bg-[#fff8f6] text-xs text-[#201a17] focus:outline-none focus:border-[#964407]"
                      ></textarea>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRecordDrawer(false)}
                        className="flex-1 py-2.5 rounded-lg border border-[#d7c2b9] text-[#554339] font-bold text-xs hover:bg-[#f8ede3]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-lg bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs transition-all shadow-sm"
                      >
                        Save Expense
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Toast Callout Message (Saved Success Feedback) */}
              {showToast && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <p className="font-bold">Expense saved successfully!</p>
                      <p className="text-[10px] text-emerald-700">₹12,400 - Electricity</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowToast(false)}
                    className="text-emerald-700 hover:text-emerald-900 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Partner Ownership Settings Card */}
              <div className="bg-white rounded-2xl border border-[#d7c2b9] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#f8ede3]">
                  <h4 className="font-serif font-bold text-sm text-[#201a17] flex items-center gap-2">
                    Partner Ownership (Settings)
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <Lock className="w-3.5 h-3.5 text-[#554339]" />
                    <button className="text-[#964407] font-bold hover:underline">Edit</button>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 font-bold text-[#201a17]">
                      <span className="w-5 h-5 rounded-full bg-[#964407] text-white flex items-center justify-center text-[9px] font-bold">
                        R
                      </span>
                      Ramesh
                    </span>
                    <span className="font-mono font-bold text-[#554339]">40%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 font-bold text-[#201a17]">
                      <span className="w-5 h-5 rounded-full bg-[#059669] text-white flex items-center justify-center text-[9px] font-bold">
                        S
                      </span>
                      Suresh
                    </span>
                    <span className="font-mono font-bold text-[#554339]">40%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 font-bold text-[#201a17]">
                      <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center text-[9px] font-bold">
                        M
                      </span>
                      Mahesh
                    </span>
                    <span className="font-mono font-bold text-[#554339]">20%</span>
                  </div>
                </div>

                <div className="border-t border-[#f8ede3] pt-3 flex justify-between items-center text-xs font-bold text-[#201a17]">
                  <span>Total Ownership</span>
                  <span className="font-mono">100%</span>
                </div>

                <p className="text-[10px] text-[#554339] italic pt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#554339]" /> Changes are protected. Admin password required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
