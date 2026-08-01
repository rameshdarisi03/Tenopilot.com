"use client";

import { use, useState, useMemo } from "react";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, Occupant } from "@/constants/mockOccupants";
import {
  Search,
  Plus,
  Filter,
  Phone,
  MessageSquare,
  MoreVertical,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  X,
  UserPlus,
  ShieldCheck,
  Building2,
} from "lucide-react";

export default function TenantsDirectoryPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState<
    "All" | "Booked" | "Active" | "Notice" | "Past" | "Guests"
  >("All");

  const [tenantStatusFilter, setTenantStatusFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [paymentDueFilter, setPaymentDueFilter] = useState("All");
  const [floorFilter, setFloorFilter] = useState("All");
  const [roomFilter, setRoomFilter] = useState("All");

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered dataset
  const filteredOccupants = useMemo(() => {
    return MOCK_OCCUPANTS_200.filter((occ) => {
      // Search filter
      const matchesSearch =
        occ.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        occ.phone.includes(searchTerm) ||
        occ.roomNumber.includes(searchTerm) ||
        occ.aadhaarNumber.includes(searchTerm);

      if (!matchesSearch) return false;

      // Status Segmented Tab Filter
      if (activeFilterTab === "Booked" && occ.lifecycleStatus !== "Booked") return false;
      if (activeFilterTab === "Active" && occ.lifecycleStatus !== "Active") return false;
      if (activeFilterTab === "Notice" && occ.lifecycleStatus !== "Notice") return false;
      if (activeFilterTab === "Past" && occ.lifecycleStatus !== "Past") return false;
      if (activeFilterTab === "Guests" && occ.stayType !== "Guest") return false;

      // Dropdown Filters
      if (tenantStatusFilter !== "All" && occ.lifecycleStatus !== tenantStatusFilter) return false;
      if (paymentStatusFilter !== "All" && occ.paymentStatus !== paymentStatusFilter) return false;
      if (roomFilter !== "All" && occ.roomNumber !== roomFilter) return false;

      return true;
    });
  }, [
    searchTerm,
    activeFilterTab,
    tenantStatusFilter,
    paymentStatusFilter,
    roomFilter,
  ]);

  // Pagination slice
  const totalPages = Math.ceil(filteredOccupants.length / pageSize);
  const paginatedOccupants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOccupants.slice(start, start + pageSize);
  }, [filteredOccupants, currentPage]);

  // Selection handlers
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

  // Counts for Segmented Control
  const counts = useMemo(() => {
    return {
      All: MOCK_OCCUPANTS_200.length,
      Booked: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Booked").length,
      Active: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Active").length,
      Notice: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Notice").length,
      Past: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Past").length,
      Guests: MOCK_OCCUPANTS_200.filter((o) => o.stayType === "Guest").length,
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#fff8f6] text-[#201a17]">
      {/* 256px Left Sidebar */}
      <PropertySidebar propertyId={propertyId} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <PropertyHeader
          title="Tenants & Guests Directory"
          sectionTabs={["Directory", "Onboarding History"]}
          activeTab="Directory"
        />

        {/* Directory Body */}
        <div className="p-6 md:p-8 space-y-6 flex-1 pb-28">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-[#201a17]">
                Tenant Operations
              </h1>
              <p className="text-[#554339] text-xs mt-1">
                Manage tenants across their lifecycle and track rent collection
              </p>
            </div>

            {/* Top CTA Button */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add New Tenant ▼
              </button>

              {showAddMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-[#d7c2b9] shadow-xl py-2 z-50 text-xs font-semibold text-[#201a17]">
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      triggerToast("Opened Tenant Onboarding Modal");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f8ede3] flex items-center gap-2 text-[#964407]"
                  >
                    <UserPlus className="w-4 h-4" /> + New Tenant (Long-term)
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      triggerToast("Opened Guest Onboarding (Skipped Agreement)");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f8ede3] flex items-center gap-2 text-purple-700"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-700" /> + New Guest (Short-term)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Toast Callout */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {/* Status Segmented Control (Stitch UI Tabs) */}
          <div className="flex bg-white rounded-2xl p-1.5 border border-[#d7c2b9] shadow-xs max-w-4xl overflow-x-auto text-xs font-semibold">
            {(["All", "Booked", "Active", "Notice", "Past", "Guests"] as const).map((tab) => {
              const isActive = activeFilterTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveFilterTab(tab);
                    setCurrentPage(1);
                  }}
                  className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    isActive
                      ? "bg-[#964407] text-white shadow-xs font-bold"
                      : "text-[#554339] hover:bg-[#f8ede3] hover:text-[#201a17]"
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      isActive
                        ? "bg-white/20 text-white"
                        : tab === "Guests"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-[#f8ede3] text-[#554339]"
                    }`}
                  >
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Operational Metrics Row (5 Cards matching Stitch UI) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Due Today */}
            <div className="bg-white p-4 rounded-2xl border border-[#d7c2b9] shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-red-600 tracking-wider">
                  Due Today
                </p>
                <p className="text-xl font-bold font-serif text-[#201a17]">12</p>
                <p className="text-[11px] text-[#554339] font-medium">₹1,24,000</p>
              </div>
            </div>

            {/* Due Tomorrow */}
            <div className="bg-white p-4 rounded-2xl border border-[#d7c2b9] shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-amber-600 tracking-wider">
                  Due Tomorrow
                </p>
                <p className="text-xl font-bold font-serif text-[#201a17]">18</p>
                <p className="text-[11px] text-[#554339] font-medium">₹1,85,000</p>
              </div>
            </div>

            {/* Due in Next 2 Days */}
            <div className="bg-white p-4 rounded-2xl border border-[#d7c2b9] shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-amber-600 tracking-wider">
                  Due Next 2 Days
                </p>
                <p className="text-xl font-bold font-serif text-[#201a17]">24</p>
                <p className="text-[11px] text-[#554339] font-medium">₹2,32,000</p>
              </div>
            </div>

            {/* Overdue */}
            <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-red-700 tracking-wider">
                  Overdue
                </p>
                <p className="text-xl font-bold font-serif text-[#ba1a1a]">7</p>
                <p className="text-[11px] text-[#554339] font-medium">₹68,000</p>
              </div>
            </div>

            {/* Collected This Month */}
            <div className="bg-white p-4 rounded-2xl border border-[#d7c2b9] shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">
                  Collected Month
                </p>
                <p className="text-xl font-bold font-serif text-[#059669]">88.5%</p>
                <p className="text-[11px] text-[#554339] font-medium">₹6,35,000 / ₹7.17L</p>
              </div>
            </div>
          </div>

          {/* Filters Dropdown Bar (Stitch UI FiltersBar) */}
          <div className="bg-white rounded-2xl border border-[#d7c2b9] p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, phone, room, Aadhaar..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#d7c2b9] bg-[#fff8f6] text-xs text-[#201a17] focus:outline-none focus:border-[#964407]"
                />
                <Search className="w-4 h-4 text-[#554339] absolute left-3 top-2.5" />
              </div>

              {/* Filter Dropdowns */}
              <div className="relative min-w-[130px]">
                <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] text-[#554339] font-bold z-10">
                  Tenant Status
                </label>
                <select
                  value={tenantStatusFilter}
                  onChange={(e) => setTenantStatusFilter(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-[#d7c2b9] rounded-xl bg-white text-[#201a17] focus:outline-none focus:border-[#964407]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Booked">Booked</option>
                  <option value="Notice">Notice</option>
                  <option value="Past">Past</option>
                </select>
              </div>

              <div className="relative min-w-[130px]">
                <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] text-[#554339] font-bold z-10">
                  Payment Status
                </label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-[#d7c2b9] rounded-xl bg-white text-[#201a17] focus:outline-none focus:border-[#964407]"
                >
                  <option value="All">All</option>
                  <option value="Paid">Paid</option>
                  <option value="Due">Due / Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div className="relative min-w-[120px]">
                <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] text-[#554339] font-bold z-10">
                  Room
                </label>
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-[#d7c2b9] rounded-xl bg-white text-[#201a17] focus:outline-none focus:border-[#964407]"
                >
                  <option value="All">All Rooms</option>
                  <option value="101">Room 101</option>
                  <option value="102">Room 102</option>
                  <option value="201">Room 201</option>
                  <option value="301">Room 301</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setTenantStatusFilter("All");
                  setPaymentStatusFilter("All");
                  setRoomFilter("All");
                  setSearchTerm("");
                }}
                className="text-xs font-bold text-[#964407] hover:underline flex items-center gap-1 ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>
          </div>

          {/* Stitch UI Tenant Table */}
          <div className="bg-white rounded-2xl border border-[#d7c2b9] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#f8ede3]/60 border-b border-[#d7c2b9]">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          paginatedOccupants.length > 0 &&
                          paginatedOccupants.every((o) => selectedIds.includes(o.id))
                        }
                        onChange={handleSelectAll}
                        className="rounded border-[#d7c2b9] text-[#964407] focus:ring-[#964407]"
                      />
                    </th>
                    <th className="p-4 text-[10px] font-bold text-[#554339] uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="p-4 text-[10px] font-bold text-[#554339] uppercase tracking-wider">
                      Room & Bed
                    </th>
                    <th className="p-4 text-[10px] font-bold text-[#554339] uppercase tracking-wider text-center">
                      Rent Status
                    </th>
                    <th className="p-4 text-[10px] font-bold text-[#554339] uppercase tracking-wider">
                      Payment Due
                    </th>
                    <th className="p-4 text-[10px] font-bold text-[#554339] uppercase tracking-wider">
                      Days Remaining
                    </th>
                    <th className="p-4 text-[10px] font-bold text-[#554339] uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f8ede3]">
                  {paginatedOccupants.length > 0 ? (
                    paginatedOccupants.map((occ) => {
                      const isSelected = selectedIds.includes(occ.id);
                      return (
                        <tr
                          key={occ.id}
                          className={`transition-colors ${
                            isSelected ? "bg-[#f8ede3]/50" : "hover:bg-[#fff8f6]"
                          }`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(occ.id)}
                              className="rounded border-[#d7c2b9] text-[#964407] focus:ring-[#964407]"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={occ.avatar}
                                alt={occ.name}
                                className="w-9 h-9 rounded-full border border-[#d7c2b9] object-cover"
                              />
                              <div>
                                <div className="text-xs font-bold text-[#201a17] flex items-center gap-1.5">
                                  {occ.name}
                                  {occ.stayType === "Guest" && (
                                    <span className="badge-guest px-2 py-0.2 rounded-full text-[9px] font-bold">
                                      🟣 GUEST
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#554339]">
                                  {occ.phone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-bold text-[#201a17]">
                              Room {occ.roomNumber} ({occ.bedCode})
                            </div>
                            <div className="text-[10px] text-[#554339]">Sunshine PG</div>
                          </td>
                          <td className="p-4 text-center">
                            {occ.paymentStatus === "Paid" && (
                              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold uppercase">
                                PAID 🟢
                              </span>
                            )}
                            {occ.paymentStatus === "Due" && (
                              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold uppercase">
                                PENDING 🟡
                              </span>
                            )}
                            {occ.paymentStatus === "Overdue" && (
                              <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">
                                OVERDUE 🔴
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-semibold text-[#201a17]">
                              {occ.joiningDate}
                            </div>
                            {occ.paymentStatus === "Overdue" ? (
                              <div className="text-[10px] text-[#ba1a1a] font-bold">
                                5 DAYS OVERDUE
                              </div>
                            ) : (
                              <div className="text-[10px] text-amber-700 font-bold">
                                Due in 2 Days
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {occ.lifecycleStatus === "Active" && (
                              <span className="badge-available px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                ACTIVE
                              </span>
                            )}
                            {occ.lifecycleStatus === "Notice" && (
                              <span className="badge-vacating px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                NOTICE
                              </span>
                            )}
                            {occ.lifecycleStatus === "Booked" && (
                              <span className="badge-booked px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                BOOKED
                              </span>
                            )}
                            {occ.lifecycleStatus === "Past" && (
                              <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                PAST
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 text-[#554339]">
                              <button
                                onClick={() => triggerToast(`Calling ${occ.phone}`)}
                                className="p-1 rounded hover:bg-[#f8ede3] hover:text-[#964407]"
                                title="Call Occupant"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => triggerToast(`WhatsApp reminder sent to ${occ.phone}`)}
                                className="p-1 rounded hover:bg-[#f8ede3] hover:text-[#059669]"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => triggerToast(`Opened Profile for ${occ.name}`)}
                                className="p-1 rounded hover:bg-[#f8ede3]"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[#554339]">
                        No matching occupants found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-[#f8ede3] flex items-center justify-between text-xs font-semibold text-[#554339]">
              <span>
                Showing Page {currentPage} of {totalPages || 1} ({filteredOccupants.length} total)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-[#d7c2b9] hover:bg-[#f8ede3] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-lg border border-[#d7c2b9] hover:bg-[#f8ede3] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Bulk Action Bar (Triggers when checkboxed) */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#201a17] text-white rounded-2xl px-6 py-3.5 shadow-2xl flex items-center gap-6 border border-[#d7c2b9]/40 animate-in slide-in-from-bottom-4">
            <div className="text-xs font-semibold">
              <span className="font-bold text-[#ffb68e]">
                {selectedIds.length} Tenants Selected
              </span>
              <span className="text-white/60 block text-[10px]">
                TOTAL DUE ₹{(selectedIds.length * 14500).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => triggerToast(`Rent reminders sent to ${selectedIds.length} tenants`)}
                className="px-4 py-2 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white text-xs font-bold shadow-md flex items-center gap-2 active:scale-95"
              >
                <MessageSquare className="w-4 h-4" /> Send Rent Reminder
              </button>
              <button
                onClick={() => triggerToast(`Calling ${selectedIds.length} selected tenants`)}
                className="px-3.5 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 text-xs font-bold flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> Call Selected
              </button>
              <button
                onClick={() => triggerToast(`Exported CSV for ${selectedIds.length} tenants`)}
                className="px-3.5 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="p-1 rounded-full hover:bg-white/20 text-white/60 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
