"use client";

import { use, useState, useMemo } from "react";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, Occupant } from "@/constants/mockOccupants";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  LogOut,
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
    "All" | "Tenants" | "Guests" | "Booked" | "Notice" | "Past"
  >("All");
  const [sortField, setSortField] = useState<"name" | "roomNumber" | "rentAmount">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // New Occupant Menu Dropdown
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered & Sorted dataset
  const filteredOccupants = useMemo(() => {
    return MOCK_OCCUPANTS_200.filter((occ) => {
      // Search term filter
      const matchesSearch =
        occ.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        occ.phone.includes(searchTerm) ||
        occ.roomNumber.includes(searchTerm) ||
        occ.aadhaarNumber.includes(searchTerm);

      if (!matchesSearch) return false;

      // Tab filter
      if (activeFilterTab === "Tenants") return occ.stayType === "Tenant";
      if (activeFilterTab === "Guests") return occ.stayType === "Guest";
      if (activeFilterTab === "Booked") return occ.lifecycleStatus === "Booked";
      if (activeFilterTab === "Notice") return occ.lifecycleStatus === "Notice";
      if (activeFilterTab === "Past") return occ.lifecycleStatus === "Past";

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") comparison = a.name.localeCompare(b.name);
      if (sortField === "roomNumber") comparison = a.roomNumber.localeCompare(b.roomNumber);
      if (sortField === "rentAmount") comparison = a.rentAmount - b.rentAmount;
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [searchTerm, activeFilterTab, sortField, sortOrder]);

  // Pagination slice
  const totalPages = Math.ceil(filteredOccupants.length / pageSize);
  const paginatedOccupants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOccupants.slice(start, start + pageSize);
  }, [filteredOccupants, currentPage]);

  // Counts for filter tabs
  const counts = useMemo(() => {
    return {
      All: MOCK_OCCUPANTS_200.length,
      Tenants: MOCK_OCCUPANTS_200.filter((o) => o.stayType === "Tenant").length,
      Guests: MOCK_OCCUPANTS_200.filter((o) => o.stayType === "Guest").length,
      Booked: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Booked").length,
      Notice: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Notice").length,
      Past: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Past").length,
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#fff8f6] text-[#201a17]">
      {/* 256px Left Sidebar with 8 clean primary menus */}
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
        <div className="p-6 md:p-8 space-y-6 flex-1">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-2xl md:text-3xl text-[#201a17]">
                  Occupants Directory
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f8ede3] text-[#964407] font-bold text-xs">
                  {filteredOccupants.length} Records
                </span>
              </div>
              <p className="text-xs text-[#554339] mt-1">
                Manage long-term tenants, short-term guests, and stay assignments across Sunshine PG
              </p>
            </div>

            {/* Upfront Creation Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Occupant ▼
              </button>

              {showAddMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-[#d7c2b9] shadow-xl py-2 z-50 text-xs font-semibold text-[#201a17]">
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      triggerToast("Opened Tenant Onboarding Form");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f8ede3] flex items-center gap-2 text-[#964407]"
                  >
                    <UserPlus className="w-4 h-4 text-[#964407]" /> + New Tenant (Long-term)
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

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {/* Filter Bar & Search Controls */}
          <div className="bg-white rounded-2xl border border-[#d7c2b9] p-4 shadow-xs space-y-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by occupant name, mobile number, room number (e.g. 101), or Aadhaar..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d7c2b9] bg-[#fff8f6] text-xs text-[#201a17] focus:outline-none focus:border-[#964407] focus:ring-1 focus:ring-[#964407]"
              />
              <Search className="w-4 h-4 text-[#554339] absolute left-3.5 top-3" />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f8ede3] pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {(["All", "Tenants", "Guests", "Booked", "Notice", "Past"] as const).map(
                  (tab) => {
                    const isActive = activeFilterTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveFilterTab(tab);
                          setCurrentPage(1);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isActive
                            ? "bg-[#964407] text-white shadow-xs"
                            : "bg-[#f8ede3]/70 hover:bg-[#f8ede3] text-[#554339]"
                        }`}
                      >
                        {tab} ({counts[tab]})
                      </button>
                    );
                  }
                )}
              </div>

              {/* Sorting Control */}
              <div className="flex items-center gap-2 text-xs font-semibold text-[#554339]">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#964407]" />
                <span>Sort by:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  className="bg-[#fff8f6] border border-[#d7c2b9] rounded-lg px-2.5 py-1 text-xs text-[#201a17] focus:outline-none"
                >
                  <option value="name">Name</option>
                  <option value="roomNumber">Room Number</option>
                  <option value="rentAmount">Rent Amount</option>
                </select>
              </div>
            </div>
          </div>

          {/* Occupants Directory Table */}
          <div className="bg-white rounded-2xl border border-[#d7c2b9] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f8ede3]/60 border-b border-[#d7c2b9] text-[10px] uppercase tracking-wider text-[#554339] font-bold">
                    <th className="py-3.5 px-4">Occupant Name</th>
                    <th className="py-3.5 px-4">Stay Type</th>
                    <th className="py-3.5 px-4">Assigned Bed</th>
                    <th className="py-3.5 px-4">Joining / Check-in</th>
                    <th className="py-3.5 px-4">Monthly Rent</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Lifecycle Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f8ede3]">
                  {paginatedOccupants.length > 0 ? (
                    paginatedOccupants.map((occ) => (
                      <tr key={occ.id} className="hover:bg-[#fff8f6] transition-colors">
                        {/* Occupant Name & Contact */}
                        <td className="py-3.5 px-4 font-semibold">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#964407]/10 border border-[#964407]/20 flex items-center justify-center font-bold text-xs text-[#964407] overflow-hidden shrink-0">
                              <img
                                src={occ.avatar}
                                alt={occ.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-bold text-[#201a17]">{occ.name}</p>
                              <p className="text-[10px] text-[#554339]">{occ.phone}</p>
                            </div>
                          </div>
                        </td>

                        {/* Stay Type Badge (Tenant vs Purple Guest Badge) */}
                        <td className="py-3.5 px-4">
                          {occ.stayType === "Guest" ? (
                            <span className="badge-guest px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              🟣 GUEST
                            </span>
                          ) : (
                            <span className="bg-[#f8ede3] text-[#725949] border border-[#d7c2b9] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              TENANT
                            </span>
                          )}
                        </td>

                        {/* Room & Bed */}
                        <td className="py-3.5 px-4 font-mono text-[#201a17]">
                          <span className="font-bold">Room {occ.roomNumber}</span> • {occ.bedCode}
                        </td>

                        {/* Joining Date */}
                        <td className="py-3.5 px-4 text-[#554339]">
                          {occ.joiningDate}
                          {occ.vacatingDate && (
                            <span className="block text-[10px] font-bold text-amber-700">
                              Vacating: {occ.vacatingDate}
                            </span>
                          )}
                        </td>

                        {/* Monthly Rent */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#201a17]">
                          ₹{occ.rentAmount.toLocaleString("en-IN")}
                        </td>

                        {/* Payment Status */}
                        <td className="py-3.5 px-4">
                          {occ.paymentStatus === "Paid" && (
                            <span className="text-[#059669] font-bold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                            </span>
                          )}
                          {occ.paymentStatus === "Due" && (
                            <span className="text-amber-700 font-bold flex items-center gap-1 text-[11px]">
                              <Clock className="w-3.5 h-3.5" /> Due
                            </span>
                          )}
                          {occ.paymentStatus === "Overdue" && (
                            <span className="text-[#ba1a1a] font-bold flex items-center gap-1 text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5" /> Overdue
                            </span>
                          )}
                        </td>

                        {/* Lifecycle Status */}
                        <td className="py-3.5 px-4">
                          {occ.lifecycleStatus === "Active" && (
                            <span className="badge-available px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              ACTIVE 🟢
                            </span>
                          )}
                          {occ.lifecycleStatus === "Booked" && (
                            <span className="badge-booked px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              BOOKED 🟡
                            </span>
                          )}
                          {occ.lifecycleStatus === "Notice" && (
                            <span className="badge-vacating px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              NOTICE 🟧
                            </span>
                          )}
                          {occ.lifecycleStatus === "Past" && (
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              PAST ⚪
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => triggerToast(`Viewing details for ${occ.name}`)}
                            className="p-1.5 rounded-lg hover:bg-[#f8ede3] text-[#964407] font-bold text-xs"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-[#554339]">
                        No matching occupants found for "{searchTerm}".
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
      </div>
    </div>
  );
}
