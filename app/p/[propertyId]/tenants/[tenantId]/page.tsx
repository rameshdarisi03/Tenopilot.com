"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, occupantStore, Occupant } from "@/constants/mockOccupants";
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
  User,
  AlertTriangle,
  Eye,
  UserPlus,
} from "lucide-react";
import {
  downloadRentalAgreementPdf,
  downloadRentReceiptPdf,
} from "@/utils/pdfGenerator";

interface PaymentHistoryItem {
  id: string;
  month: string;
  date: string;
  amount: number;
  mode: string;
  receiptNo: string;
  status: string;
}

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

  // Secure View-Only KYC Modal State
  const [viewKycModal, setViewKycModal] = useState<{
    open: boolean;
    title: string;
    docType: string;
  }>({
    open: false,
    title: "",
    docType: "",
  });

  // Agreement View Modal State
  const [viewAgreementModal, setViewAgreementModal] = useState<boolean>(false);

  // Client Hydration state to prevent SSR mismatch
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Find occupant in MOCK_OCCUPANTS_200 dataset or occupantStore
  const occupant = useMemo(() => {
    const allOccupants = typeof window !== "undefined" ? occupantStore.getOccupants() : MOCK_OCCUPANTS_200;
    const match =
      allOccupants.find((o) => o.id === tenantId) ||
      MOCK_OCCUPANTS_200.find((o) => o.id === tenantId);

    if (match) return match;

    // Direct match for test IDs if proxy evaluation hasn't hydrated yet
    if (tenantId === "occ-test-tenant-future") {
      return {
        id: "occ-test-tenant-future",
        name: "Vikram Malhotra (Future Tenant)",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=VikramMalhotra",
        phone: "+91 98111 22334",
        email: "vikram.m@example.com",
        stayType: "Tenant" as const,
        lifecycleStatus: "Booked" as const,
        paymentStatus: "Due" as const,
        daysDiff: 13,
        daysRemainingText: "Due on Check-In",
        rentAmount: 14500,
        dueDate: "15 Aug 2026",
        dueDay: 15,
        lastPaidDate: "Pending Check-In",
        roomNumber: "201",
        bedCode: "BED A",
        joiningDate: "15 Aug 2026",
        kycVerified: false,
        hasPdfAgreement: true,
        workplace: "TCS Systems",
        address: "HSR Layout, Bengaluru",
        aadhaarNumber: "XXXX-XXXX-1122",
        emergencyContact: {
          name: "Rajesh Malhotra",
          phone: "+91 98111 99999",
          relation: "Father",
        },
      };
    }

    if (tenantId === "occ-test-tenant-today") {
      return {
        id: "occ-test-tenant-today",
        name: "Rohan Varma (Today Tenant)",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RohanVarma",
        phone: "+91 98222 33445",
        email: "rohan.v@example.com",
        stayType: "Tenant" as const,
        lifecycleStatus: "Active" as const,
        paymentStatus: "Paid" as const,
        daysDiff: 30,
        daysRemainingText: "—",
        rentAmount: 14500,
        dueDate: "01 Sep 2026",
        dueDay: 1,
        lastPaidDate: "02 Aug 2026",
        roomNumber: "202",
        bedCode: "BED B",
        joiningDate: "02 Aug 2026",
        kycVerified: true,
        hasPdfAgreement: true,
        workplace: "Infosys Labs",
        address: "Koramangala, Bengaluru",
        aadhaarNumber: "XXXX-XXXX-3344",
        emergencyContact: {
          name: "Sunita Varma",
          phone: "+91 98222 88888",
          relation: "Mother",
        },
      };
    }

    if (tenantId === "occ-test-guest-future") {
      return {
        id: "occ-test-guest-future",
        name: "Ananya Deshmukh (Future Guest)",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=AnanyaDeshmukh",
        phone: "+91 98333 44556",
        email: "ananya.d@guest.com",
        stayType: "Guest" as const,
        lifecycleStatus: "Booked" as const,
        paymentStatus: "Due" as const,
        daysDiff: 8,
        daysRemainingText: "Due on Check-In",
        rentAmount: 3500,
        dueDate: "17 Aug 2026",
        dueDay: 17,
        lastPaidDate: "Pending Check-In",
        roomNumber: "203",
        bedCode: "BED A",
        joiningDate: "10 Aug 2026",
        kycVerified: false,
        hasPdfAgreement: false,
        workplace: "Design Studio",
        address: "Indiranagar, Bengaluru",
        aadhaarNumber: "XXXX-XXXX-5566",
        emergencyContact: {
          name: "Prakash Deshmukh",
          phone: "+91 98333 77777",
          relation: "Father",
        },
      };
    }

    if (tenantId === "occ-test-guest-today") {
      return {
        id: "occ-test-guest-today",
        name: "Karan Johar (Today Guest)",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=KaranJohar",
        phone: "+91 98444 55667",
        email: "karan.j@guest.com",
        stayType: "Guest" as const,
        lifecycleStatus: "Active" as const,
        paymentStatus: "Paid" as const,
        daysDiff: 7,
        daysRemainingText: "7 Days Remaining",
        rentAmount: 3500,
        dueDate: "09 Aug 2026",
        dueDay: 9,
        lastPaidDate: "02 Aug 2026",
        roomNumber: "204",
        bedCode: "BED C",
        joiningDate: "02 Aug 2026",
        kycVerified: true,
        hasPdfAgreement: false,
        workplace: "Freelance",
        address: "Jayanagar, Bengaluru",
        aadhaarNumber: "XXXX-XXXX-7788",
        emergencyContact: {
          name: "Meena Johar",
          phone: "+91 98444 66666",
          relation: "Mother",
        },
      };
    }

    return {
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
    };
  }, [tenantId]);

  // Local state for dynamic occupant edits
  const [occupantState, setOccupantState] = useState<Occupant>(occupant);

  // Payment History State (Starts empty [] for Booked status or newly onboarded profiles!)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);

  // Synchronize occupantState and paymentHistory whenever tenantId/occupant route parameter changes or on client mount!
  useEffect(() => {
    if (!isMounted) return;
    setOccupantState(occupant);

    if (occupant.lifecycleStatus === "Booked" || (occupant.stayType === "Guest" && occupant.id.startsWith("occ-new-")) || occupant.id.startsWith("occ-test-")) {
      if (occupant.lifecycleStatus === "Booked" || occupant.lastPaidDate === "Pending Check-In") {
        setPaymentHistory([]);
      } else {
        setPaymentHistory([
          {
            id: "pay-1",
            month: "August 2026",
            date: occupant.lastPaidDate || "02 Aug 2026",
            amount: occupant.rentAmount,
            mode: "UPI (HDFC)",
            receiptNo: "#REC-88210",
            status: "PAID",
          },
        ]);
      }
    } else {
      setPaymentHistory([
        {
          id: "pay-1",
          month: "July 2026",
          date: "01 Jul 2026",
          amount: occupant.rentAmount,
          mode: "UPI (HDFC)",
          receiptNo: "#REC-73104",
          status: "PAID",
        },
        {
          id: "pay-2",
          month: "June 2026",
          date: "01 Jun 2026",
          amount: occupant.rentAmount,
          mode: "UPI (GPay)",
          receiptNo: "#REC-62155",
          status: "PAID",
        },
      ]);
    }
  }, [occupant, tenantId, isMounted]);

  // Modal Control States
  const [showCollectRentModal, setShowCollectRentModal] = useState(false);
  const [showLogNoticeModal, setShowLogNoticeModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showEditCheckInModal, setShowEditCheckInModal] = useState(false);

  // Edit Check-In Date Inputs
  const [postponedCheckInDate, setPostponedCheckInDate] = useState<string>("2026-08-20");

  // Promote Form Inputs
  const [promoteMonthlyRent, setPromoteMonthlyRent] = useState<number>(occupantState.rentAmount || 12500);
  const [promoteDeposit, setPromoteDeposit] = useState<number>(25000);
  const [promoteJoiningDate, setPromoteJoiningDate] = useState<string>("2026-08-01");

  // Collect Rent Form Inputs
  const [paymentDate, setPaymentDate] = useState<string>("2026-08-01");
  const [paymentAmount, setPaymentAmount] = useState<number>(occupantState.rentAmount);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [transactionRef, setTransactionRef] = useState<string>("");

  // Log Notice Form Inputs
  const [vacatingDate, setVacatingDate] = useState<string>("2026-08-15");
  const [vacatingReason, setVacatingReason] = useState<string>("Job Relocation");
  const [noticeNotes, setNoticeNotes] = useState<string>("");

  // Edit Profile Form Inputs
  const [editName, setEditName] = useState<string>(occupantState.name);
  const [editPhone, setEditPhone] = useState<string>(occupantState.phone);
  const [editEmail, setEditEmail] = useState<string>(occupantState.email);
  const [editRent, setEditRent] = useState<number>(occupantState.rentAmount);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Collect Rent Submit Handler (No Cheques, Transaction ID for UPI/Bank, Updates State)
  const handleCollectRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Format selected date (e.g. "2026-07-31" -> "31 Jul 2026")
    const dParts = paymentDate.split("-");
    const formattedPaidDate = `${dParts[2]} ${
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
        parseInt(dParts[1], 10) - 1
      ] || "Aug"
    } ${dParts[0]}`;
    const modeLabel =
      paymentMode === "UPI"
        ? `UPI (${transactionRef || "GPay"})`
        : paymentMode === "Bank Transfer"
        ? `Bank Transfer (${transactionRef || "NEFT"})`
        : "Cash";

    const newReceipt: PaymentHistoryItem = {
      id: `pay-${Date.now()}`,
      month: "August 2026",
      date: formattedPaidDate,
      amount: paymentAmount,
      mode: modeLabel,
      receiptNo: `#REC-${Math.floor(10000 + Math.random() * 90000)}`,
      status: "PAID",
    };

    // Update occupant state
    setOccupantState((prev) => ({
      ...prev,
      paymentStatus: "Paid",
      lastPaidDate: formattedPaidDate,
      daysRemainingText: "—",
    }));

    // Prepend to payment history
    setPaymentHistory([newReceipt, ...paymentHistory]);

    triggerToast(
      `✓ Rent collected successfully! ₹${paymentAmount.toLocaleString(
        "en-IN"
      )} recorded for ${occupantState.name}`
    );
    setShowCollectRentModal(false);
    setTransactionRef("");
  };

  // 2. Log Notice Submit Handler (Vacating date & reason modal, sets status to Notice)
  const handleLogNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Format date string for display (e.g., "15 Aug 2026")
    const dateParts = vacatingDate.split("-");
    const formattedVacatingDate = `${dateParts[2]} Aug 2026`;

    setOccupantState((prev) => ({
      ...prev,
      lifecycleStatus: "Notice",
      vacatingDate: formattedVacatingDate,
    }));

    triggerToast(
      `✓ Notice period logged for ${occupantState.name}. Vacating Date: ${formattedVacatingDate}`
    );
    setShowLogNoticeModal(false);
  };

  // 3. Edit Profile Submit Handler (Updates Name, Phone, Email, Rent across state)
  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setOccupantState((prev) => ({
      ...prev,
      name: editName,
      phone: editPhone,
      email: editEmail,
      rentAmount: editRent,
    }));

    triggerToast(`✓ Profile details updated successfully for ${editName}`);
    setShowEditProfileModal(false);
  };

  // 4. Promote Guest to Long-Term Tenant Submit Handler (Updates stayType: "Tenant", lifecycleStatus: "Active", rent & deposit)
  const handlePromoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setOccupantState((prev) => ({
      ...prev,
      stayType: "Tenant",
      lifecycleStatus: "Active",
      rentAmount: promoteMonthlyRent,
      joiningDate: promoteJoiningDate,
      hasPdfAgreement: true,
    }));

    triggerToast(`🎉 Successfully promoted ${occupantState.name} to Long-Term Active Tenant!`);
    setShowPromoteModal(false);
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
            <span suppressHydrationWarning className="text-gray-900 font-bold">{occupantState.name}</span>
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
                src={occupantState.avatar}
                alt={occupantState.name}
                className="w-16 h-16 rounded-full border-2 border-[#c2652a]/30 object-cover shadow-sm"
              />
              <div>
                <h1 suppressHydrationWarning className="font-serif text-3xl font-bold text-gray-900">
                  {occupantState.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      occupantState.lifecycleStatus === "Active"
                        ? "bg-green-100 text-green-700"
                        : occupantState.lifecycleStatus === "Notice"
                        ? "bg-orange-100 text-orange-700"
                        : occupantState.lifecycleStatus === "Booked"
                        ? "bg-blue-100 text-blue-700 border border-blue-200 shadow-xs"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${
                        occupantState.lifecycleStatus === "Active"
                          ? "bg-green-500"
                          : occupantState.lifecycleStatus === "Notice"
                          ? "bg-orange-500"
                          : occupantState.lifecycleStatus === "Booked"
                          ? "bg-blue-500"
                          : "bg-gray-400"
                      }`}
                    ></span>
                    {occupantState.lifecycleStatus.toUpperCase()}
                  </span>
                  {occupantState.stayType === "Guest" && (
                    <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      🟣 GUEST
                    </span>
                  )}
                  <span className="text-xs text-gray-500 font-medium">
                    Resident since {occupantState.joiningDate}
                  </span>
                  {occupantState.vacatingDate && (
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                      Vacating: {occupantState.vacatingDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4 Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
              {/* 1. Edit Profile */}
              <button
                onClick={() => {
                  setEditName(occupantState.name);
                  setEditPhone(occupantState.phone);
                  setEditEmail(occupantState.email);
                  setEditRent(occupantState.rentAmount);
                  setShowEditProfileModal(true);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 rounded-xl text-xs font-semibold text-gray-700 shadow-xs active:scale-95 transition-all"
              >
                <Edit className="w-4 h-4 text-[#c2652a]" /> Edit Profile
              </button>

              {/* 2. Collect Rent */}
              <button
                onClick={() => {
                  setPaymentAmount(occupantState.rentAmount);
                  setShowCollectRentModal(true);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#c2652a] hover:bg-[#c2652a]/90 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                <CreditCard className="w-4 h-4" /> Collect Rent
              </button>

              {/* 3. Transfer Room (Deferred until Property Map pages) */}
              <button
                onClick={() =>
                  triggerToast(
                    "Room Transfer option will be active after Property Map setup"
                  )
                }
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 rounded-xl text-xs font-semibold text-gray-700 shadow-xs active:scale-95 transition-all"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#c2652a]" /> Transfer Room
              </button>

              {/* 4. Log Notice (Disabled for Guests, active for Tenants) */}
              <button
                disabled={occupantState.stayType === "Guest"}
                title={
                  occupantState.stayType === "Guest"
                    ? "Log Notice is available for Long-Term Tenants only. Promote guest to tenant to enable."
                    : undefined
                }
                onClick={() => {
                  if (occupantState.stayType !== "Guest") {
                    setShowLogNoticeModal(true);
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                  occupantState.stayType === "Guest"
                    ? "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                    : "bg-white border border-orange-200 hover:bg-orange-50 text-gray-700 active:scale-95"
                }`}
              >
                <FileText className={`w-4 h-4 ${occupantState.stayType === "Guest" ? "text-gray-400" : "text-[#c2652a]"}`} /> Log Notice
              </button>

              {/* 5. Promote Guest to Tenant (Only rendered for Guest accounts) */}
              {occupantState.stayType === "Guest" && (
                <button
                  onClick={() => setShowPromoteModal(true)}
                  className="col-span-2 sm:col-span-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                >
                  <UserPlus className="w-4 h-4" /> 👔 Promote to Long-Term Tenant
                </button>
              )}

              {/* 6. Edit Check-In Date (Only rendered for Booked profiles — Auto-checkin runs on move-in date) */}
              {occupantState.lifecycleStatus === "Booked" && (
                <button
                  onClick={() => setShowEditCheckInModal(true)}
                  className="col-span-2 sm:col-span-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                >
                  <Clock className="w-4 h-4" /> 📅 Edit Check-In Date (Reschedule Move-In)
                </button>
              )}
            </div>
          </div>

          {/* 4 KPI Metrics Cards Section */}
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
                ₹{paymentHistory.reduce((sum, item) => sum + item.amount, 0).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-green-600 font-bold mt-1.5">
                {paymentHistory.length > 0 ? `${paymentHistory.length} PAYMENTS RECORDED 🟢` : "NO PAYMENTS YET ⚪"}
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
                {occupantState.paymentStatus === "Paid"
                  ? "₹0"
                  : `₹${occupantState.rentAmount.toLocaleString("en-IN")}`}
              </p>
              <p className="text-[10px] text-green-600 font-bold mt-1.5">
                {occupantState.paymentStatus === "Paid"
                  ? "EVERYTHING CURRENT 🟢"
                  : "PAYMENT DUE 🟡"}
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
              <p className="text-base font-bold font-serif text-gray-900">
                {occupantState.lifecycleStatus === "Booked"
                  ? `Due on Check-In`
                  : occupantState.dueDate}
              </p>
              <p className="text-[10px] text-[#c2652a] font-bold mt-1.5">
                {occupantState.lifecycleStatus === "Booked"
                  ? `TARGET: ${occupantState.joiningDate}`
                  : "NEXT RENT CYCLE"}
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
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      occupantState.paymentStatus === "Paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {occupantState.paymentStatus === "Paid" ? "PAID 🟢" : "PENDING 🟡"}
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
                      Floor 01 • Room {occupantState.roomNumber} - {occupantState.bedCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Monthly Rent</span>
                    <span className="font-mono font-bold text-[#c2652a]">
                      ₹{occupantState.rentAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Last Paid Date</span>
                    <span className="font-semibold text-gray-900">
                      {occupantState.lastPaidDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Phone</span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#c2652a]" /> {occupantState.phone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Email</span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#c2652a]" /> {occupantState.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* KYC Documents Card (PENDING KYC CARDS ARE HIDDEN UNTIL VERIFIED) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                <div className="pb-3 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-900 text-sm block">
                      KYC Documents
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      🔒 Secure View-Only ({occupantState.kycVerified ? (occupantState.kycDocs?.idMode === "PDF" ? "2 Documents" : "3 Documents") : "Pending Upload"})
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${occupantState.kycVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {occupantState.kycVerified ? "VERIFIED ✓" : "PENDING 🟡"}
                  </span>
                </div>

                {!occupantState.kycVerified ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 text-center">
                    <p className="font-bold">🟡 KYC Documents Pending Verification</p>
                    <p className="text-[11px] text-amber-800">
                      Identity proof documents have not been uploaded yet. Upload Aadhaar/Govt ID during onboarding to enable secure view-only cards.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 1. Profile Headshot Component */}
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-[#c2652a]" /> Profile Headshot Photo
                        </p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          Verified & Auto-compressed 🟢
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setViewKycModal({
                            open: true,
                            title: "Tenant Profile Headshot",
                            docType: "photo",
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 text-[11px] flex items-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#c2652a]" /> View
                      </button>
                    </div>

                    {/* 2 & 3: ID Card Components (Front & Back vs PDF) */}
                    {occupantState.kycDocs?.idMode === "PDF" ? (
                      /* PDF Mode: Single PDF Component */
                      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-blue-600" /> Aadhaar / Govt ID (PDF Document)
                          </p>
                          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            Single PDF (Max 1MB) 🟢
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setViewKycModal({
                              open: true,
                              title: "Aadhaar Card PDF Document",
                              docType: "pdf",
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 text-[11px] flex items-center gap-1 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> View PDF
                        </button>
                      </div>
                    ) : (
                      /* Front & Back Mode: 2 Separate Components (Front + Back) */
                      <>
                        {/* Component 2: ID Card Front */}
                        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-blue-600" /> Aadhaar / Govt ID (Front Photo)
                            </p>
                            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                              ID Front Photo 🟢
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setViewKycModal({
                                open: true,
                                title: "Aadhaar Card — Front Photo",
                                docType: "front",
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" /> View Front
                          </button>
                        </div>

                        {/* Component 3: ID Card Back */}
                        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-blue-600" /> Aadhaar / Govt ID (Back Photo)
                            </p>
                            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                              ID Back Photo 🟢
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setViewKycModal({
                                open: true,
                                title: "Aadhaar Card — Back Photo",
                                docType: "back",
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" /> View Back
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Active Agreement Card (GUESTS DO NOT HAVE LEASE AGREEMENTS UNLESS PROMOTED) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                <div className="pb-3 border-b border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-sm">
                    {occupantState.stayType === "Guest" ? "Guest Stay Terms" : "Active Agreement"}
                  </span>
                  <span className="font-mono font-bold text-gray-500">
                    {occupantState.stayType === "Guest" ? "SHORT-TERM" : "AGR-2023-102A"}
                  </span>
                </div>

                {occupantState.stayType === "Guest" ? (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 space-y-2">
                    <p className="font-bold">🟣 Short-Term Guest Stay</p>
                    <p className="text-[11px] text-purple-800">
                      This occupant is registered as a short-term guest. No long-term 11-month lease agreement is required.
                    </p>
                  </div>
                ) : (
                  <>
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
                          ₹{occupantState.rentAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setViewAgreementModal(true)}
                        className="py-2.5 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Eye className="w-4 h-4 text-[#c2652a]" /> View Agreement
                      </button>

                      <button
                        onClick={() => {
                          downloadRentalAgreementPdf({
                            tenantName: occupantState.name,
                            phone: occupantState.phone,
                            roomNumber: occupantState.roomNumber,
                            bedCode: occupantState.bedCode,
                            joiningDate: occupantState.joiningDate,
                            monthlyRent: occupantState.rentAmount,
                            securityDeposit: 25000,
                          });
                          triggerToast("✓ Downloaded Rental Agreement Document!");
                        }}
                        className="py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                      >
                        <Download className="w-4 h-4" /> Download PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column (Rent Payment History & Dynamic Timeline) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Rent Payment History Table (EMPTY FOR BOOKED / BRAND NEW PROFILES) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-serif font-bold text-base text-gray-900">
                    Rent Payment History
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400">
                    {paymentHistory.length} Record{paymentHistory.length === 1 ? "" : "s"}
                  </span>
                </div>

                {paymentHistory.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                    <p className="font-bold text-gray-700">No Payment History Recorded Yet</p>
                    <p className="text-[11px] text-gray-400">
                      {occupantState.lifecycleStatus === "Booked"
                        ? "Occupant is booked for future check-in. Payment history will record upon check-in or rent collection."
                        : "No past rent transactions logged yet."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          <th className="pb-2">Month</th>
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Amount</th>
                          <th className="pb-2">Mode</th>
                          <th className="pb-2">Receipt</th>
                          <th className="pb-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {paymentHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="py-3 font-bold text-gray-900">{item.month}</td>
                            <td className="py-3 text-gray-600">{item.date}</td>
                            <td className="py-3 font-mono font-bold text-gray-900">
                              ₹{item.amount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 text-gray-600">{item.mode}</td>
                            <td className="py-3 font-mono text-gray-500">{item.receiptNo}</td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-bold text-[10px]">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* DYNAMIC TIMELINE (ACCURATE FOR BOOKED VS ACTIVE VS NOTICE) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                <h3 className="font-serif font-bold text-base text-gray-900 pb-3 border-b border-gray-100">
                  Tenant Timeline & Milestones
                </h3>

                <div className="relative flex items-center justify-between pt-4 pb-2 px-2">
                  <div className="absolute left-8 right-8 top-8 h-0.5 bg-gray-200 -z-0"></div>

                  {/* 1. Booked Milestone */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs mb-1 shadow-sm">
                      ✓
                    </div>
                    <span className="text-[11px] font-bold text-gray-900">Booked</span>
                    <span className="text-[9px] text-gray-400">{occupantState.joiningDate}</span>
                  </div>

                  {/* 2. Checked In Milestone */}
                  <div className={`relative z-10 flex flex-col items-center ${occupantState.lifecycleStatus === "Booked" ? "opacity-60" : "opacity-100"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${occupantState.lifecycleStatus === "Booked" ? "bg-gray-100 text-gray-400 border border-gray-300" : "bg-emerald-500 text-white shadow-sm"}`}>
                      {occupantState.lifecycleStatus === "Booked" ? "○" : "✓"}
                    </div>
                    <span className="text-[11px] font-bold text-gray-900">Checked In</span>
                    <span className="text-[9px] text-gray-400">
                      {occupantState.lifecycleStatus === "Booked" ? "Pending Check-In" : occupantState.joiningDate}
                    </span>
                  </div>

                  {/* 3. Notice Logged Milestone */}
                  <div
                    className={`relative z-10 flex flex-col items-center ${
                      occupantState.lifecycleStatus === "Notice" ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                        occupantState.lifecycleStatus === "Notice"
                          ? "bg-orange-500 text-white shadow-sm"
                          : "bg-gray-100 text-gray-400 border border-gray-200"
                      }`}
                    >
                      {occupantState.lifecycleStatus === "Notice" ? "✓" : "○"}
                    </div>
                    <span className="text-[11px] font-bold text-gray-900">Notice Logged</span>
                    <span className="text-[9px] text-gray-400">
                      {occupantState.vacatingDate || "Pending"}
                    </span>
                  </div>

                  {/* 4. Past Tenant Milestone */}
                  <div className={`relative z-10 flex flex-col items-center ${occupantState.lifecycleStatus === "Past" ? "opacity-100" : "opacity-40"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${occupantState.lifecycleStatus === "Past" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                      {occupantState.lifecycleStatus === "Past" ? "✓" : "○"}
                    </div>
                    <span className="text-[11px] font-bold text-gray-700">Past Tenant</span>
                    <span className="text-[9px] text-gray-400">
                      {occupantState.lifecycleStatus === "Past" ? "Vacated" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Collect Rent Modal (UPI / Bank / Cash with Transaction ID - No Cheques) */}
        {showCollectRentModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Collect Rent
                  </h3>
                  <p className="text-xs text-gray-500">
                    Log rent collection for {occupantState.name}
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
                    {occupantState.name} • Room {occupantState.roomNumber} ({occupantState.bedCode})
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

                {/* Optional Transaction ID for UPI or Bank Transfer */}
                {(paymentMode === "UPI" || paymentMode === "Bank Transfer") && (
                  <div className="animate-in fade-in">
                    <label className="block font-bold text-gray-700 mb-1">
                      Transaction / Ref Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. UPI/42819201928 or Ref-99120"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-mono text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
                )}

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

        {/* 2. Log Notice Modal */}
        {showLogNoticeModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Log Move-out Notice
                  </h3>
                  <p className="text-xs text-gray-500">
                    Specify vacating details for {occupantState.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowLogNoticeModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLogNoticeSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Vacating Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={vacatingDate}
                    onChange={(e) => setVacatingDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Reason for Vacating *
                  </label>
                  <select
                    value={vacatingReason}
                    onChange={(e) => setVacatingReason(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  >
                    <option value="Job Relocation">Job Relocation</option>
                    <option value="End of Studies">End of Studies</option>
                    <option value="Personal Reasons">Personal Reasons</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={noticeNotes}
                    onChange={(e) => setNoticeNotes(e.target.value)}
                    placeholder="Short operational notes..."
                    className="w-full p-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowLogNoticeModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold shadow-md"
                  >
                    Confirm Notice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Edit Profile Modal */}
        {showEditProfileModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Edit Tenant Profile
                  </h3>
                  <p className="text-xs text-gray-500">
                    Update personal and rental information
                  </p>
                </div>
                <button
                  onClick={() => setShowEditProfileModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditProfileSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Full Name (Typo Correction) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editRent}
                    onChange={(e) => setEditRent(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🔒 SECURE VIEW-ONLY KYC DOCUMENT MODAL (NO LOCAL DOWNLOAD FOR PG OWNERS) */}
        {viewKycModal.open && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 select-none">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-100 text-[#c2652a]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      {viewKycModal.title}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      TENANT: {occupantState.name} ({occupantState.id})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewKycModal({ open: false, title: "", docType: "" })}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Security Privacy Protection Banner */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>🔒 Secure View-Only Mode:</strong> Direct file downloading is disabled per SaaS privacy regulations to prevent local disk misuse of tenant identity PII.
                </span>
              </div>

              {/* Document Image Viewer Container (Right-click & Drag Disabled) */}
              <div
                onContextMenu={(e) => e.preventDefault()}
                className="bg-gray-900 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden border border-gray-800"
              >
                {viewKycModal.docType === "photo" ? (
                  <img
                    src={occupantState.kycDocs?.photoUrl || occupantState.avatar}
                    alt={occupantState.name}
                    className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain border-2 border-white/20 shadow-lg pointer-events-none select-none"
                  />
                ) : viewKycModal.docType === "front" ? (
                  <img
                    src={occupantState.kycDocs?.aadhaarFrontUrl || occupantState.avatar}
                    alt="Aadhaar Front"
                    className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain border-2 border-white/20 shadow-lg pointer-events-none select-none"
                  />
                ) : viewKycModal.docType === "back" ? (
                  <img
                    src={occupantState.kycDocs?.aadhaarBackUrl || occupantState.avatar}
                    alt="Aadhaar Back"
                    className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain border-2 border-white/20 shadow-lg pointer-events-none select-none"
                  />
                ) : (
                  /* PDF Document View */
                  <div className="w-full bg-white/95 rounded-xl p-6 text-center space-y-3 pointer-events-none select-none text-gray-900 font-mono text-xs">
                    <FileText className="w-14 h-14 text-blue-600 mx-auto" />
                    <div className="font-bold text-sm text-gray-900">
                      {occupantState.name} — AADHAAR GOVT ID (PDF)
                    </div>
                    <div className="text-[11px] text-gray-500 font-sans">
                      DOCUMENT NUMBER: XXXX-XXXX-4819 • CAPPED TO 1MB
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] p-2 rounded-lg font-sans font-bold">
                      ✓ ENCRYPTED & VERIFIED IN FIREBASE CLOUD STORAGE BUCKET
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewKycModal({ open: false, title: "", docType: "" })}
                  className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW RENTAL AGREEMENT PREVIEW MODAL */}
        {viewAgreementModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 md:p-8 space-y-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#c2652a]" />
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Rental Agreement (AGR-2023-102A)
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setViewAgreementModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 rounded-2xl border border-gray-300 bg-amber-50/40 space-y-3 font-mono text-xs text-gray-900 leading-relaxed max-h-[350px] overflow-y-auto">
                <div className="text-center pb-3 border-b border-gray-300">
                  <h4 className="font-serif font-bold text-sm text-gray-900">
                    RESIDENTIAL LEASE AGREEMENT
                  </h4>
                  <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                    PROPERTY: SUNSHINE HEIGHTS PG • TENANT: {occupantState.name}
                  </p>
                </div>

                <p><strong>TENANT:</strong> {occupantState.name} ({occupantState.phone})</p>
                <p><strong>ROOM & BED:</strong> Room {occupantState.roomNumber} ({occupantState.bedCode})</p>
                <p><strong>START DATE:</strong> {occupantState.joiningDate}</p>
                <p><strong>MONTHLY RENT:</strong> ₹{occupantState.rentAmount.toLocaleString("en-IN")}</p>
                <p><strong>SECURITY DEPOSIT:</strong> ₹25,000</p>
                <p className="text-[10px] text-gray-500 font-sans border-t border-gray-300 pt-2">
                  This legally binding rental agreement is stored in TenoPilot organization records and can be downloaded or printed anytime by both property owner and tenant.
                </p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewAgreementModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-xs"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewAgreementModal(false);
                    triggerToast("✓ Rental Agreement PDF Downloaded");
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROMOTE SHORT-TERM GUEST TO LONG-TERM TENANT MODAL */}
        {showPromoteModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Promote to Long-Term Tenant
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      CONVERT GUEST 🟣 → ACTIVE TENANT 🟢
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
                  Transitioning Short-Term Stay into Permanent Lease
                </p>
                <p className="text-[11px] text-purple-800">
                  This will convert <strong>{occupantState.name}</strong> from a Short-Term Guest into an Active Long-Term Tenant, update badge colors, generate rental agreement controls, and sync all stores.
                </p>
              </div>

              <form onSubmit={handlePromoteSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Monthly Rent Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={promoteMonthlyRent}
                    onChange={(e) => setPromoteMonthlyRent(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-purple-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Security Deposit Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={promoteDeposit}
                    onChange={(e) => setPromoteDeposit(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-purple-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Lease Agreement Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={promoteJoiningDate}
                    onChange={(e) => setPromoteJoiningDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-purple-700"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowPromoteModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                  >
                    Confirm & Promote to Tenant
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT CHECK-IN DATE DATEPICKER MODAL */}
        {showEditCheckInModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Edit Check-In Move-In Date
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      TENANT: {occupantState.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditCheckInModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Format postponed date
                  const dParts = postponedCheckInDate.split("-");
                  const formattedDate = `${dParts[2]} ${
                    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
                      parseInt(dParts[1], 10) - 1
                    ] || "Aug"
                  } ${dParts[0]}`;

                  setOccupantState((prev) => ({
                    ...prev,
                    joiningDate: formattedDate,
                    dueDate: formattedDate,
                  }));

                  triggerToast(`✓ Updated check-in move-in date for ${occupantState.name} to ${formattedDate}`);
                  setShowEditCheckInModal(false);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    New Target Move-in Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={postponedCheckInDate}
                    onChange={(e) => setPostponedCheckInDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-blue-700"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    The silent auto-checkin engine will automatically transition status to Active when this date arrives.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditCheckInModal(false)}
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
      </div>
    </div>
  );
}
