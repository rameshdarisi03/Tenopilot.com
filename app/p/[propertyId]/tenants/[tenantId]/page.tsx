"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, Occupant } from "@/constants/mockOccupants";
import {
  ChevronLeft,
  Edit,
  CreditCard,
  ArrowRightLeft,
  FileText,
  Wallet,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  Building2,
  Download,
  CheckCircle2,
  Clock,
  X,
  Lock,
} from "lucide-react";

export default function IndividualTenantProfilePage({
  params,
}: {
  params: Promise<{ propertyId: string; tenantId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";
  const tenantId = resolvedParams?.tenantId || "occ-1001";

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Find occupant in mock dataset or fallback
  const occupant = useMemo(() => {
    return (
      MOCK_OCCUPANTS_200.find((o) => o.id === tenantId) || {
        id: tenantId,
        name: "Amara Okafor",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=AmaraOkafor",
        phone: "+91 98765 43210",
        email: "amara.o@techrec.co",
        stayType: "Tenant" as const,
        roomNumber: "102",
        bedCode: "Bed A",
        joiningDate: "12 Oct 2023",
        lastPaidDate: "01 Jul 2026",
        dueDate: "01 Aug 2026",
        dueDay: 1,
        daysRemainingText: "IN 20 DAYS",
        daysDiff: 20,
        rentAmount: 24500,
        paymentStatus: "Paid" as const,
        lifecycleStatus: "Active" as const,
        aadhaarNumber: "XXXX-XXXX-4819",
        emergencyContact: {
          name: "Suresh Okafor",
          phone: "+91 98765 11223",
          relation: "Father",
        },
      }
    );
  }, [tenantId]);

  // Collect Rent Modal State
  const [showCollectRentModal, setShowCollectRentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(occupant.rentAmount);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCollectRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    occupant.paymentStatus = "Paid";
    occupant.lastPaidDate = "01 Aug 2026";
    occupant.daysRemainingText = "—";

    triggerToast(
      `✓ Rent collected successfully! ₹${paymentAmount.toLocaleString(
        "en-IN"
      )} recorded for ${occupant.name}`
    );
    setShowCollectRentModal(false);
  };

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
          title="Tenant Profile"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Profile Content Body */}
        <div className="p-4 md:p-8 space-y-6 flex-1 pb-24">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <Link
              href={`/p/${propertyId}/tenants`}
              className="hover:text-[#c2652a] flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Tenants
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-bold">{occupant.name}</span>
          </div>

          {/* Toast Callout */}
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {/* Profile Hero Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-4">
              <img
                src={occupant.avatar}
                alt={occupant.name}
                className="w-16 h-16 rounded-full border-2 border-[#c2652a]/30 object-cover shadow-sm"
              />
              <div>
                <h1 className="font-serif text-3xl font-bold text-gray-900">
                  {occupant.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                    {occupant.lifecycleStatus}
                  </span>
                  {occupant.stayType === "Guest" && (
                    <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      🟣 GUEST
                    </span>
                  )}
                  <span className="text-xs text-gray-500 font-medium">
                    Resident since {occupant.joiningDate}
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Quick Action Buttons (Matching Stitch Reference) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
              <button
                onClick={() => triggerToast(`Edit profile mode for ${occupant.name}`)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 rounded-xl text-xs font-semibold text-gray-700 shadow-xs active:scale-95 transition-all"
              >
                <Edit className="w-4 h-4 text-[#c2652a]" /> Edit Profile
              </button>
              <button
                onClick={() => {
                  setPaymentAmount(occupant.rentAmount);
                  setShowCollectRentModal(true);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#c2652a] hover:bg-[#c2652a]/90 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                <CreditCard className="w-4 h-4" /> Collect Rent
              </button>
              <button
                onClick={() => triggerToast(`Initiated Room Transfer for ${occupant.name}`)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 rounded-xl text-xs font-semibold text-gray-700 shadow-xs active:scale-95 transition-all"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#c2652a]" /> Transfer Room
              </button>
              <button
                onClick={() => triggerToast(`Notice logged for ${occupant.name}`)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 rounded-xl text-xs font-semibold text-gray-700 shadow-xs active:scale-95 transition-all"
              >
                <FileText className="w-4 h-4 text-[#c2652a]" /> Log Notice
              </button>
            </div>
          </div>

          {/* 4 KPI Metrics Cards Section (Stitch 100% Match) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Rent Paid */}
            <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <div className="p-2 bg-green-50 w-fit rounded-lg mb-2 text-green-600">
                <Wallet className="w-5 h-5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                Total Rent Paid
              </p>
              <p className="text-2xl font-bold font-serif text-gray-900">
                ₹2,56,500
              </p>
              <p className="text-[10px] text-green-600 font-bold mt-1.5">
                ↑ 2.5% THIS MONTH
              </p>
            </div>

            {/* Outstanding Balance */}
            <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <div className="p-2 bg-blue-50 w-fit rounded-lg mb-2 text-blue-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                Outstanding Balance
              </p>
              <p className="text-2xl font-bold font-serif text-gray-900">
                {occupant.paymentStatus === "Paid" ? "₹0" : `₹${occupant.rentAmount.toLocaleString("en-IN")}`}
              </p>
              <p className="text-[10px] text-green-600 font-bold mt-1.5">
                {occupant.paymentStatus === "Paid" ? "EVERYTHING CURRENT 🟢" : "PAYMENT DUE 🟡"}
              </p>
            </div>

            {/* Security Deposit */}
            <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <div className="p-2 bg-purple-50 w-fit rounded-lg mb-2 text-purple-600">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                Security Deposit
              </p>
              <p className="text-2xl font-bold font-serif text-gray-900">
                ₹25,000
              </p>
              <p className="text-[10px] text-gray-400 font-bold mt-1.5">
                LOCKED / ACTIVE
              </p>
            </div>

            {/* Next Due Date */}
            <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <div className="p-2 bg-orange-50 w-fit rounded-lg mb-2 text-[#c2652a]">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                Next Due Date
              </p>
              <p className="text-xl font-bold font-serif text-gray-900">
                {occupant.dueDate}
              </p>
              <p className="text-[10px] text-red-600 font-bold mt-1.5">
                IN 20 DAYS
              </p>
            </div>
          </div>

          {/* Details & History Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (Details, KYC, Agreement) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Room & Contact Details Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                <div className="pb-3 border-b border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-sm">
                    Occupancy Details
                  </span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                    PAID 🟢
                  </span>
                </div>

                <div className="space-y-3 text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Property</span>
                    <span className="font-bold text-gray-900">Sunshine Heights PG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Room & Bed</span>
                    <span className="font-bold text-gray-900">
                      Floor 01 • Room {occupant.roomNumber} - {occupant.bedCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Monthly Rent</span>
                    <span className="font-mono font-bold text-[#c2652a]">
                      ₹{occupant.rentAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Phone</span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#c2652a]" /> {occupant.phone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Email</span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#c2652a]" /> {occupant.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* KYC Documents Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                <div className="pb-3 border-b border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-sm">
                    KYC Documents
                  </span>
                  <button className="text-[#c2652a] font-bold hover:underline">
                    MANAGE
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">Aadhaar Card</p>
                      <p className="text-[10px] text-emerald-600 font-medium">
                        Verified Oct 12, 2023 🟢
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">Company ID</p>
                      <p className="text-[10px] text-emerald-600 font-medium">
                        Verified Oct 14, 2023 🟢
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Active Agreement Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                <div className="pb-3 border-b border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-sm">
                    Active Agreement
                  </span>
                  <span className="font-mono font-bold text-gray-500">
                    AGR-2023-102A
                  </span>
                </div>

                <div className="space-y-2.5 text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Agreement Period</span>
                    <span className="font-bold text-gray-900">
                      12 Oct '23 - 11 Oct '25
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Notice Period</span>
                    <span className="font-bold text-gray-900">30 Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monthly Rent</span>
                    <span className="font-mono font-bold text-[#c2652a]">
                      ₹{occupant.rentAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => triggerToast("Downloading Agreement PDF")}
                  className="w-full py-2.5 rounded-xl border border-[#c2652a] text-[#c2652a] hover:bg-orange-50 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" /> Download Agreement PDF
                </button>
              </div>
            </div>

            {/* Right Column (Rent Payment History & Timeline) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Rent Payment History Table */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-serif font-bold text-base text-gray-900">
                    Rent Payment History
                  </h3>
                  <button className="text-[#c2652a] font-bold text-xs hover:underline">
                    View All Transactions →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                        <th className="pb-3">Month</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Amount (₹)</th>
                        <th className="pb-3">Mode</th>
                        <th className="pb-3">Receipt</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3.5 font-bold text-gray-900">July 2024</td>
                        <td className="py-3.5 text-gray-500">01 Jul 2024</td>
                        <td className="py-3.5 font-mono font-bold text-gray-900">₹24,500</td>
                        <td className="py-3.5 text-gray-700 font-medium">UPI (HDFC)</td>
                        <td className="py-3.5 font-mono text-[#c2652a]">#REC-73104</td>
                        <td className="py-3.5 text-right">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            PAID
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 font-bold text-gray-900">June 2024</td>
                        <td className="py-3.5 text-gray-500">01 Jun 2024</td>
                        <td className="py-3.5 font-mono font-bold text-gray-900">₹24,500</td>
                        <td className="py-3.5 text-gray-700 font-medium">UPI (GPay)</td>
                        <td className="py-3.5 font-mono text-[#c2652a]">#REC-62155</td>
                        <td className="py-3.5 text-right">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            PAID
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 font-bold text-gray-900">May 2024</td>
                        <td className="py-3.5 text-gray-500">01 May 2024</td>
                        <td className="py-3.5 font-mono font-bold text-gray-900">₹24,500</td>
                        <td className="py-3.5 text-gray-700 font-medium">UPI (PhonePe)</td>
                        <td className="py-3.5 font-mono text-[#c2652a]">#REC-59210</td>
                        <td className="py-3.5 text-right">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            PAID
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 font-bold text-gray-900">April 2024</td>
                        <td className="py-3.5 text-gray-500">01 Apr 2024</td>
                        <td className="py-3.5 font-mono font-bold text-gray-900">₹24,500</td>
                        <td className="py-3.5 text-gray-700 font-medium">Cash</td>
                        <td className="py-3.5 font-mono text-[#c2652a]">#REC-48123</td>
                        <td className="py-3.5 text-right">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            PAID
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tenant Lifecycle Timeline Section */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <h3 className="font-serif font-bold text-base text-gray-900">
                  Tenant Timeline
                </h3>

                <div className="flex items-center justify-between text-center pt-4 px-2 relative">
                  <div className="absolute top-8 left-10 right-10 h-0.5 bg-gray-200 -z-0"></div>

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs mb-1">
                      ✓
                    </div>
                    <span className="text-[11px] font-bold text-gray-900">Booked</span>
                    <span className="text-[9px] text-gray-400">05 Oct 2023</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs mb-1 shadow-sm">
                      ✓
                    </div>
                    <span className="text-[11px] font-bold text-gray-900">Checked In</span>
                    <span className="text-[9px] text-gray-400">12 Oct 2023</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center opacity-40">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs mb-1 border border-gray-200">
                      ○
                    </div>
                    <span className="text-[11px] font-bold text-gray-700">Notice Logged</span>
                    <span className="text-[9px] text-gray-400">Pending</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center opacity-40">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs mb-1 border border-gray-200">
                      ○
                    </div>
                    <span className="text-[11px] font-bold text-gray-700">Past Tenant</span>
                    <span className="text-[9px] text-gray-400">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collect Rent Interactive Modal */}
        {showCollectRentModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Collect Rent
                  </h3>
                  <p className="text-xs text-gray-500">
                    Log rent collection for {occupant.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowCollectRentModal(false)}
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
                    {occupant.name} • Room {occupant.roomNumber} ({occupant.bedCode})
                  </div>
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
                    onClick={() => setShowCollectRentModal(false)}
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
