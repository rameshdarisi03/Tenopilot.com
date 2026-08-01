"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
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
  User,
  CreditCard,
  ArrowRightLeft,
  FileText,
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

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState<
    "All" | "Booked" | "Active" | "Notice" | "Past" | "Guests"
  >("Active");

  const [tenantStatusFilter, setTenantStatusFilter] = useState("Active");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [paymentDueFilter, setPaymentDueFilter] = useState("All");
  const [floorFilter, setFloorFilter] = useState("All Floors");
  const [roomFilter, setRoomFilter] = useState("All Rooms");

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>(["occ-1001"]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeActionDropdownId, setActiveActionDropdownId] = useState<string | null>(null);

  // Collect Rent Modal State
  const [collectRentOccupant, setCollectRentOccupant] = useState<Occupant | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>("2026-08-01");
  const [paymentAmount, setPaymentAmount] = useState<number>(14500);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Rent Collection Submission
  const handleCollectRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectRentOccupant) return;

    // Format selected date (e.g. "2026-07-31" -> "31 Jul 2026")
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

    triggerToast(
      `✓ Rent collected successfully! ₹${paymentAmount.toLocaleString("en-IN")} recorded for ${collectRentOccupant.name}`
    );
    setCollectRentOccupant(null);
  };

  // Dynamic Rent Metrics Calculations
  const rentMetrics = useMemo(() => {
    const dueToday = MOCK_OCCUPANTS_200.filter(
      (o) => o.paymentStatus === "Due" && o.daysDiff === 0
    );
    const dueTomorrow = MOCK_OCCUPANTS_200.filter(
      (o) => o.paymentStatus === "Due" && o.daysDiff === 1
    );
    const dueNext2Days = MOCK_OCCUPANTS_200.filter(
      (o) => o.paymentStatus === "Due" && o.daysDiff > 1 && o.daysDiff <= 3
    );
    const overdue = MOCK_OCCUPANTS_200.filter((o) => o.paymentStatus === "Overdue");
    const paid = MOCK_OCCUPANTS_200.filter((o) => o.paymentStatus === "Paid");

    const sumDueToday = dueToday.reduce((acc, curr) => acc + curr.rentAmount, 0);
    const sumDueTomorrow = dueTomorrow.reduce((acc, curr) => acc + curr.rentAmount, 0);
    const sumDueNext2Days = dueNext2Days.reduce((acc, curr) => acc + curr.rentAmount, 0);
    const sumOverdue = overdue.reduce((acc, curr) => acc + curr.rentAmount, 0);
    const sumCollected = paid.reduce((acc, curr) => acc + curr.rentAmount, 0);
    const totalExpected = MOCK_OCCUPANTS_200.reduce((acc, curr) => acc + curr.rentAmount, 0);

    const collectionPct = ((sumCollected / (totalExpected || 1)) * 100).toFixed(1);

    return {
      dueTodayCount: dueToday.length || 12,
      dueTodaySum: sumDueToday || 124000,
      dueTomorrowCount: dueTomorrow.length || 18,
      dueTomorrowSum: sumDueTomorrow || 185000,
      dueNext2DaysCount: dueNext2Days.length || 24,
      dueNext2DaysSum: sumDueNext2Days || 232000,
      overdueCount: overdue.length || 7,
      overdueSum: sumOverdue || 68000,
      collectionPct: collectionPct || "88.5",
      sumCollected: sumCollected || 635000,
      totalExpected: totalExpected || 717000,
    };
  }, []);

  // Filtered dataset
  const filteredOccupants = useMemo(() => {
    return MOCK_OCCUPANTS_200.filter((occ) => {
      const matchesSearch =
        occ.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        occ.phone.includes(searchTerm) ||
        occ.roomNumber.includes(searchTerm) ||
        occ.aadhaarNumber.includes(searchTerm);

      if (!matchesSearch) return false;

      if (activeFilterTab === "Booked" && occ.lifecycleStatus !== "Booked") return false;
      if (activeFilterTab === "Active" && occ.lifecycleStatus !== "Active") return false;
      if (activeFilterTab === "Notice" && occ.lifecycleStatus !== "Notice") return false;
      if (activeFilterTab === "Past" && occ.lifecycleStatus !== "Past") return false;
      if (activeFilterTab === "Guests" && occ.stayType !== "Guest") return false;

      if (tenantStatusFilter !== "All" && occ.lifecycleStatus !== tenantStatusFilter) return false;
      if (paymentStatusFilter !== "All" && occ.paymentStatus !== paymentStatusFilter) return false;
      if (roomFilter !== "All Rooms" && occ.roomNumber !== roomFilter) return false;

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
      All: MOCK_OCCUPANTS_200.length,
      Booked: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Booked").length,
      Active: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Active").length,
      Notice: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Notice").length,
      Past: MOCK_OCCUPANTS_200.filter((o) => o.lifecycleStatus === "Past").length,
      Guests: MOCK_OCCUPANTS_200.filter((o) => o.stayType === "Guest").length,
    };
  }, []);

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
        {/* Top Header */}
        <PropertyHeader
          title="Tenant Operations"
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

            {/* Top Primary CTA Button */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="px-6 py-2.5 rounded-lg bg-[#c2652a] hover:bg-[#c2652a]/90 text-white text-sm font-semibold transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-5 h-5" /> Add New Tenant
              </button>

              {showAddMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg border border-gray-200 shadow-xl py-2 z-50 text-xs font-semibold text-gray-800">
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      triggerToast("Opened Tenant Onboarding Form");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 flex items-center gap-2 text-[#c2652a]"
                  >
                    <UserPlus className="w-4 h-4 text-[#c2652a]" /> + New Tenant (Long-term)
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      triggerToast("Opened Guest Onboarding (Skipped Agreement)");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-purple-50 flex items-center gap-2 text-purple-700"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-700" /> + New Guest (Short-term)
                  </button>
                </div>
              )}
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

          {/* Color-Coded Status Filter Pills */}
          <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-xs overflow-x-auto text-xs font-medium max-w-4xl">
            <button
              onClick={() => {
                setActiveFilterTab("All");
                setTenantStatusFilter("All");
                setCurrentPage(1);
              }}
              className={`flex-1 min-w-[90px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeFilterTab === "All"
                  ? "bg-gray-100 text-gray-800 font-bold border border-gray-300 shadow-xs"
                  : "text-gray-500 hover:text-[#c2652a]"
              }`}
            >
              All <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{counts.All}</span>
            </button>

            <button
              onClick={() => {
                setActiveFilterTab("Booked");
                setTenantStatusFilter("Booked");
                setCurrentPage(1);
              }}
              className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeFilterTab === "Booked"
                  ? "bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs"
                  : "text-gray-500 hover:text-blue-600"
              }`}
            >
              Booked <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{counts.Booked}</span>
            </button>

            <button
              onClick={() => {
                setActiveFilterTab("Active");
                setTenantStatusFilter("Active");
                setCurrentPage(1);
              }}
              className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeFilterTab === "Active"
                  ? "bg-green-50 text-green-700 font-semibold border border-green-200 shadow-xs"
                  : "text-gray-500 hover:text-green-600"
              }`}
            >
              Active <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">{counts.Active}</span>
            </button>

            <button
              onClick={() => {
                setActiveFilterTab("Notice");
                setTenantStatusFilter("Notice");
                setCurrentPage(1);
              }}
              className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeFilterTab === "Notice"
                  ? "bg-orange-50 text-orange-700 font-bold border border-orange-200 shadow-xs"
                  : "text-gray-500 hover:text-orange-600"
              }`}
            >
              Notice <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{counts.Notice}</span>
            </button>

            <button
              onClick={() => {
                setActiveFilterTab("Past");
                setTenantStatusFilter("Past");
                setCurrentPage(1);
              }}
              className={`flex-1 min-w-[90px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeFilterTab === "Past"
                  ? "bg-gray-100 text-gray-800 font-bold border border-gray-300 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Past <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{counts.Past}</span>
            </button>

            <button
              onClick={() => {
                setActiveFilterTab("Guests");
                setCurrentPage(1);
              }}
              className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeFilterTab === "Guests"
                  ? "bg-purple-50 text-purple-700 font-bold border border-purple-200 shadow-xs"
                  : "text-gray-500 hover:text-purple-600"
              }`}
            >
              Guests <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{counts.Guests}</span>
            </button>
          </div>

          {/* Operational Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-red-50 text-red-500 p-2.5 h-10 w-10 flex items-center justify-center rounded-lg shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">
                  Due Today
                </p>
                <p className="text-xl font-bold font-sans text-gray-900">{rentMetrics.dueTodayCount}</p>
                <p className="text-xs text-gray-500">₹{rentMetrics.dueTodaySum.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-orange-50 text-orange-500 p-2.5 h-10 w-10 flex items-center justify-center rounded-lg shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">
                  Due Tomorrow
                </p>
                <p className="text-xl font-bold font-sans text-gray-900">{rentMetrics.dueTomorrowCount}</p>
                <p className="text-xs text-gray-500">₹{rentMetrics.dueTomorrowSum.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-orange-50 text-orange-500 p-2.5 h-10 w-10 flex items-center justify-center rounded-lg shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">
                  Due Next 2 Days
                </p>
                <p className="text-xl font-bold font-sans text-gray-900">{rentMetrics.dueNext2DaysCount}</p>
                <p className="text-xs text-gray-500">₹{rentMetrics.dueNext2DaysSum.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-red-100 text-red-600 p-2.5 h-10 w-10 flex items-center justify-center rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
                  Overdue
                </p>
                <p className="text-xl font-bold font-sans text-gray-900">{rentMetrics.overdueCount}</p>
                <p className="text-xs text-gray-500">₹{rentMetrics.overdueSum.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-green-50 text-green-600 p-2.5 h-10 w-10 flex items-center justify-center rounded-lg shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-green-600 tracking-wider">
                  Collected Month
                </p>
                <p className="text-xl font-bold font-sans text-gray-900">{rentMetrics.collectionPct}%</p>
                <p className="text-xs text-gray-500">
                  ₹{(rentMetrics.sumCollected / 100000).toFixed(2)}L / ₹{(rentMetrics.totalExpected / 100000).toFixed(2)}L
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Data Table with Exact Column Ordering Requested by User */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedOccupants.length > 0 &&
                        paginatedOccupants.every((o) => selectedIds.includes(o.id))
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-[#c2652a] focus:ring-[#c2652a]"
                    />
                  </th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Room & Bed
                  </th>
                  {/* 1. Last Paid Column */}
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Last Paid
                  </th>
                  {/* 2. Payment Due Column */}
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Payment Due
                  </th>
                  {/* 3. Days Remaining Column */}
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Days Remaining
                  </th>
                  {/* 4. Rent Status Column */}
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                    Rent Status
                  </th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOccupants.length > 0 ? (
                  paginatedOccupants.map((occ) => {
                    const isSelected = selectedIds.includes(occ.id);
                    const isDropdownOpen = activeActionDropdownId === occ.id;

                    return (
                      <tr
                        key={occ.id}
                        className={`transition-colors relative ${
                          isSelected ? "bg-[#fef6f2]" : "hover:bg-gray-50"
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

                        {/* Occupant Name & Contact (Clickable Link to Profile) */}
                        <td className="p-4">
                          <Link
                            href={`/p/${propertyId}/tenants/${occ.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <img
                              src={occ.avatar}
                              alt={occ.name}
                              className="w-10 h-10 rounded-full border border-gray-200 object-cover group-hover:scale-105 transition-transform"
                            />
                            <div>
                              <div className="text-sm font-bold text-gray-900 group-hover:text-[#c2652a] transition-colors flex items-center gap-2">
                                {occ.name}
                                {occ.stayType === "Guest" && (
                                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                    🟣 GUEST
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 font-medium">
                                {occ.phone}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Room & Bed */}
                        <td className="p-4">
                          <div className="text-sm font-bold text-gray-800">
                            Room {occ.roomNumber} ({occ.bedCode})
                          </div>
                          <div className="text-[10px] text-gray-500">Sunshine Heights PG</div>
                        </td>

                        {/* 1. Last Paid Date */}
                        <td className="p-4 text-xs text-gray-600 font-medium">
                          {occ.lastPaidDate}
                        </td>

                        {/* 2. Payment Due Date */}
                        <td className="p-4">
                          <div className="text-xs font-semibold text-gray-900">
                            {occ.dueDate}
                          </div>
                          {occ.paymentStatus === "Paid" ? (
                            <span className="text-[10px] text-green-600 font-bold">Paid</span>
                          ) : occ.paymentStatus === "Overdue" ? (
                            <span className="text-[10px] text-red-500 font-bold">Overdue</span>
                          ) : (
                            <span className="text-[10px] text-orange-600 font-bold">Due Soon</span>
                          )}
                        </td>

                        {/* 3. Days Remaining (Displays hyphen '-' if PAID) */}
                        <td className="p-4">
                          {occ.paymentStatus === "Paid" ? (
                            <span className="text-gray-400 font-bold text-sm">—</span>
                          ) : occ.paymentStatus === "Overdue" ? (
                            <span className="inline-block px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">
                              {occ.daysRemainingText}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-bold uppercase">
                              {occ.daysRemainingText}
                            </span>
                          )}
                        </td>

                        {/* 4. Rent Status */}
                        <td className="p-4 text-center">
                          {occ.paymentStatus === "Paid" && (
                            <span className="inline-block px-2.5 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">
                              PAID
                            </span>
                          )}
                          {occ.paymentStatus === "Due" && (
                            <span className="inline-block px-2.5 py-1 bg-orange-100 text-orange-600 rounded text-[10px] font-bold uppercase">
                              PENDING
                            </span>
                          )}
                          {occ.paymentStatus === "Overdue" && (
                            <span className="inline-block px-2.5 py-1 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">
                              OVERDUE
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right relative">
                          <div className="flex items-center justify-end gap-2 text-gray-400">
                            <button
                              onClick={() => triggerToast(`Calling ${occ.phone}`)}
                              className="p-1 rounded hover:bg-orange-50 hover:text-[#c2652a]"
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => triggerToast(`WhatsApp reminder sent to ${occ.phone}`)}
                              className="p-1 rounded hover:bg-orange-50 hover:text-[#c2652a]"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>

                            {/* 3-Dots Action Menu Trigger */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveActionDropdownId(
                                    isDropdownOpen ? null : occ.id
                                  )
                                }
                                className="p-1 rounded hover:bg-orange-50 hover:text-[#c2652a]"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {isDropdownOpen && (
                                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-xl py-2 z-50 text-left text-xs font-semibold text-gray-800">
                                  <Link
                                    href={`/p/${propertyId}/tenants/${occ.id}`}
                                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-orange-50 text-gray-700"
                                  >
                                    <User className="w-3.5 h-3.5 text-gray-500" /> View Profile
                                  </Link>
                                  <button
                                    onClick={() => {
                                      setActiveActionDropdownId(null);
                                      setCollectRentOccupant(occ);
                                      setPaymentAmount(occ.rentAmount);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-orange-50 text-[#c2652a]"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-[#c2652a]" /> Collect Rent
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
                                  <button
                                    onClick={() => {
                                      setActiveActionDropdownId(null);
                                      triggerToast(`Initiated Notice logging for ${occ.name}`);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 hover:bg-orange-50 text-orange-600"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-orange-500" /> Log Notice
                                  </button>
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

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-xs font-semibold text-gray-600">
              <span>
                Showing Page {currentPage} of {totalPages || 1} ({filteredOccupants.length} total)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Card List View (`md:hidden`) */}
          <div className="md:hidden space-y-4">
            {paginatedOccupants.length > 0 ? (
              paginatedOccupants.map((occ) => (
                <div
                  key={occ.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/p/${propertyId}/tenants/${occ.id}`}
                      className="flex items-center gap-3"
                    >
                      <img
                        src={occ.avatar}
                        alt={occ.name}
                        className="w-11 h-11 rounded-full border border-gray-200 object-cover"
                      />
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 hover:text-[#c2652a] transition-colors flex items-center gap-2">
                          {occ.name}
                          {occ.stayType === "Guest" && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              🟣 GUEST
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-500">{occ.phone}</p>
                      </div>
                    </Link>

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
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">
                        Last Paid Date
                      </p>
                      <p className="font-semibold text-gray-800">
                        {occ.lastPaidDate}
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
              ))
            ) : (
              <div className="py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
                No matching occupants found.
              </div>
            )}
          </div>
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
                  TOTAL DUE: ₹{(selectedIds.length * 14500).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => triggerToast(`Rent reminders sent to ${selectedIds.length} tenants`)}
                className="px-4 py-2.5 rounded-lg bg-[#c2652a] hover:bg-[#c2652a]/90 text-white text-xs font-semibold shadow-md flex items-center gap-2 active:scale-95"
              >
                <MessageSquare className="w-4 h-4" /> Send Rent Reminder
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
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cheque">Cheque</option>
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
      </div>
    </div>
  );
}
