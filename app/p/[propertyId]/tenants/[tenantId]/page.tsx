"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { GuestProfileView } from "@/components/dashboard/GuestProfileView";
import { MOCK_OCCUPANTS_200, occupantStore, Occupant, PaymentHistoryItem } from "@/constants/mockOccupants";
import { propertyStore } from "@/constants/propertyLayoutStore";
import {
  calculateRoomTransferProRata,
  calculateGuestRoomTransferAdjustment,
} from "@/utils/financialEngine";
import { calculateProRataRent, calculateOccupantFinancialStatement } from "@/utils/domainSSOT";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  Camera,
  Clock,
  X,
  Lock,
  User,
  AlertTriangle,
  Eye,
  LogOut,
  UserPlus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  downloadRentalAgreementPdf,
  downloadRentReceiptPdf,
} from "@/utils/pdfGenerator";

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

    if (occupant.paymentHistory && Array.isArray(occupant.paymentHistory)) {
      setPaymentHistory(occupant.paymentHistory);
    } else if (occupant.lifecycleStatus === "Booked" || occupant.lastPaidDate === "Unpaid / Due Now" || occupant.lastPaidDate === "Pending Check-In" || occupant.paymentStatus === "Due") {
      setPaymentHistory([]);
    } else {
      setPaymentHistory([
        {
          id: "pay-1",
          month: "August 2026",
          date: occupant.lastPaidDate || "01 Aug 2026",
          amount: occupant.rentAmount,
          mode: "UPI (HDFC)",
          receiptNo: "#REC-73104",
          status: "PAID",
        },
      ]);
    }
  }, [occupant, tenantId, isMounted]);

  // Modal Control States
  const [showCollectRentModal, setShowCollectRentModal] = useState(false);
  const [showLogNoticeModal, setShowLogNoticeModal] = useState(false);
  const [showGuestCheckoutModal, setShowGuestCheckoutModal] = useState(false);
  const [guestCheckoutDate, setGuestCheckoutDate] = useState<string>("2026-08-01");
  const [guestRefundKeyDeposit, setGuestRefundKeyDeposit] = useState<boolean>(true);
  const [guestCheckoutNotes, setGuestCheckoutNotes] = useState<string>("");
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showEditCheckInModal, setShowEditCheckInModal] = useState(false);
  const [showExtendStayModal, setShowExtendStayModal] = useState(false);

  // Guest Extend Stay / Book Next Stay Inputs
  const [extendMode, setExtendMode] = useState<"EXTEND" | "PREBOOK">("EXTEND");
  const [additionalDays, setAdditionalDays] = useState<number>(3);
  const [nextVisitStartDate, setNextVisitStartDate] = useState<string>("2026-08-25");
  const [nextVisitEndDate, setNextVisitEndDate] = useState<string>("2026-08-30");

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
  // Extend Notice & Cancel Notice State
  const [showManageNoticeModal, setShowManageNoticeModal] = useState<boolean>(false);
  const [noticeActionTab, setNoticeActionTab] = useState<"extend" | "cancel">("extend");
  const [showExtendNoticeModal, setShowExtendNoticeModal] = useState<boolean>(false);
  const [extendedNoticeDate, setExtendedNoticeDate] = useState<string>("2026-08-30");

  const [showCancelNoticeModal, setShowCancelNoticeModal] = useState<boolean>(false);
  const [showExtendGuestStayModal, setShowExtendGuestStayModal] = useState<boolean>(false);
  const [extendedGuestCheckoutDate, setExtendedGuestCheckoutDate] = useState<string>("2026-08-12");

  // Future Booking Conflict Resolution Modal State
  const [conflictModalData, setConflictModalData] = useState<{
    open: boolean;
    bookedOccupant?: Occupant;
    actionType: "EXTEND_NOTICE" | "CANCEL_NOTICE" | "EXTEND_GUEST_STAY";
    pendingDate?: string;
  } | null>(null);

  // Edit Profile Form Inputs
  const [editName, setEditName] = useState<string>(occupantState.name);
  const [editPhone, setEditPhone] = useState<string>(occupantState.phone);
  const [editEmail, setEditEmail] = useState<string>(occupantState.email);
  const [editRent, setEditRent] = useState<number>(occupantState.rentAmount);

  // Room Transfer Modal State (Empty default ensures NO target bed is pre-selected!)
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferRoomNumber, setTransferRoomNumber] = useState<string>("");
  const [transferBedCode, setTransferBedCode] = useState<string>("");
  const [expandedTransferFloorIds, setExpandedTransferFloorIds] = useState<string[]>([]);
  const [transferEffectiveDate, setTransferEffectiveDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [newGuestDailyRate, setNewGuestDailyRate] = useState<number>(0);

  // In-Profile Upload KYC Modal State
  const [showUploadKycModal, setShowUploadKycModal] = useState<boolean>(false);
  const [kycInputAadhaar, setKycInputAadhaar] = useState<string>("");
  const [kycInputPhotoUrl, setKycInputPhotoUrl] = useState<string>("");
  const [isKycPhotoSaved, setIsKycPhotoSaved] = useState<boolean>(false);
  const [kycFrontUploaded, setKycFrontUploaded] = useState<boolean>(false);
  const [kycBackUploaded, setKycBackUploaded] = useState<boolean>(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRoomTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isGuest = occupantState.stayType === "Guest";
    const oldRoomNumber = occupantState.roomNumber;
    const oldBedCode = occupantState.bedCode;

    // 1. Query target room's price from propertyStore
    const selectedTargetRoomObj = propertyStore
      .getStructure()
      .flatMap((f) => f.rooms)
      .find((r) => r.roomNumber === transferRoomNumber);

    const targetRent =
      selectedTargetRoomObj?.customRentAmount ||
      (selectedTargetRoomObj?.sharingType === 1
        ? 18000
        : selectedTargetRoomObj?.sharingType === 3
        ? 11000
        : 14500);

    // 2. Perform financial calculation & state mutation based on stayType (Guest vs Tenant)
    const suggestedDaily = Math.round(targetRent / 30) || 750;
    
    // Format pending extended notice date if room transfer was triggered to resolve a notice conflict
    let revisedVacatingDate = occupantState.vacatingDate;
    if (conflictModalData?.pendingDate) {
      const dateParts = conflictModalData.pendingDate.split("-");
      revisedVacatingDate = `${dateParts[2]} Aug 2026`;
    }

    let updatedOccupant: Occupant;

    if (isGuest) {
      const guestCalc = calculateGuestRoomTransferAdjustment(
        occupantState.rentAmount,
        newGuestDailyRate || suggestedDaily,
        transferEffectiveDate,
        occupantState.joiningDate,
        occupantState.vacatingDate
      );

      updatedOccupant = {
        ...occupantState,
        roomNumber: transferRoomNumber,
        bedCode: transferBedCode,
        rentAmount: guestCalc.revisedTotalTariff,
        vacatingDate: revisedVacatingDate,
      };
    } else {
      const tenantCalc = calculateRoomTransferProRata(
        occupantState.rentAmount,
        targetRent,
        transferEffectiveDate,
        occupantState.paymentStatus
      );

      updatedOccupant = {
        ...occupantState,
        roomNumber: transferRoomNumber,
        bedCode: transferBedCode,
        rentAmount: targetRent,
        vacatingDate: revisedVacatingDate,
        arrearsBalance: (occupantState.arrearsBalance || 0) + tenantCalc.adjustmentAmount,
      };
    }

    setOccupantState(updatedOccupant);
    occupantStore.updateOccupant(updatedOccupant);

    // 4. DDS-13 Dynamic Cascading Mutation across Property Store!
    // Vacates OLD bed slot (Available 🟢) and occupies TARGET bed slot (Occupied 🟤 / Guest 🟣)
    const currentStructure = propertyStore.getStructure();
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        let updatedBeds = [...room.beds];

        // Vacate old bed slot
        if (room.roomNumber === oldRoomNumber) {
          updatedBeds = updatedBeds.map((bed) => {
            if (bed.bedCode === oldBedCode) {
              return { ...bed, status: "Available" as const, occupant: undefined };
            }
            return bed;
          });
        }

        // Occupy target bed slot
        if (room.roomNumber === transferRoomNumber) {
          updatedBeds = updatedBeds.map((bed) => {
            if (bed.bedCode === transferBedCode) {
              return {
                ...bed,
                status: isGuest ? ("Guest" as const) : ("Occupied" as const),
                occupant: updatedOccupant,
              };
            }
            return bed;
          });
        }

        return {
          ...room,
          beds: updatedBeds,
        };
      }),
    }));

    propertyStore.updateStructure(updatedStructure);

    // 5. Sync occupantStore
    occupantStore.updateOccupant(updatedOccupant);
    setConflictModalData(null);

    const netDiff = isGuest ? (newGuestDailyRate || suggestedDaily) : (isGuest ? 0 : 0);
    triggerToast(
      `🎉 Room transfer complete! ${occupantState.name} moved from Room ${oldRoomNumber} (${oldBedCode}) to Room ${transferRoomNumber} (${transferBedCode}). Tariff adjustment applied successfully.`
    );
    setShowTransferModal(false);
  };

  const handleCompleteKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Occupant = {
      ...occupantState,
      kycVerified: true,
      aadhaarNumber: kycInputAadhaar || occupantState.aadhaarNumber || "XXXX-XXXX-8811",
      avatar: kycInputPhotoUrl || occupantState.avatar,
    };
    setOccupantState(updated);
    occupantStore.updateOccupant(updated);
    setShowUploadKycModal(false);
    triggerToast(`✓ KYC verification completed successfully for ${occupantState.name}! 🟢`);
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

    const currentBillingMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const newReceipt: PaymentHistoryItem = {
      id: `pay-${Date.now()}`,
      month: currentBillingMonth,
      date: formattedPaidDate,
      amount: paymentAmount,
      mode: modeLabel,
      receiptNo: `#REC-${Math.floor(10000 + Math.random() * 90000)}`,
      status: "PAID",
    };

    const updatedHistory = [newReceipt, ...(occupantState.paymentHistory || paymentHistory)];
    const totalCollected = updatedHistory.reduce((sum, item) => sum + item.amount, 0);

    const isGuest = occupantState.stayType === "Guest";
    const proRataRent = isGuest
      ? occupantState.rentAmount
      : calculateProRataRent(occupantState.rentAmount, occupantState.joiningDate).proRataAmount;
    const reqDeposit = occupantState.securityDeposit !== undefined ? occupantState.securityDeposit : (isGuest ? 1000 : 25000);
    const arrears = occupantState.arrearsBalance || 0;
    const totalGrossDue = proRataRent + reqDeposit + arrears;

    const isFullyCleared = totalCollected >= totalGrossDue;
    const isDepositCleared = totalCollected >= reqDeposit;

    const updated: Occupant = {
      ...occupantState,
      paymentStatus: isFullyCleared ? "Paid" : "Due",
      lastPaidDate: formattedPaidDate,
      daysRemainingText: isFullyCleared ? "—" : "PARTIAL DUE",
      depositStatus: isDepositCleared ? "PAID" : (totalCollected > 0 ? "PARTIAL" : "PENDING"),
      partialPaidThisCycle: totalCollected,
      paymentHistory: updatedHistory,
    };

    setOccupantState(updated);
    occupantStore.updateOccupant(updated);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed occupant payment status in propertyStore!
    const currentStructure = propertyStore.getStructure();
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        if (room.roomNumber !== occupantState.roomNumber) return room;
        return {
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.bedCode !== occupantState.bedCode) return bed;
            return {
              ...bed,
              occupant: updated,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure);

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

    const updated: Occupant = {
      ...occupantState,
      lifecycleStatus: "Notice",
      vacatingDate: formattedVacatingDate,
    };

    setOccupantState(updated);
    occupantStore.updateOccupant(updated);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed status to Vacating in propertyStore!
    const currentStructure = propertyStore.getStructure();
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        if (room.roomNumber !== occupantState.roomNumber) return room;
        return {
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.bedCode !== occupantState.bedCode) return bed;
            return {
              ...bed,
              status: "Vacating" as const,
              occupant: updated,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure);

    triggerToast(
      `✓ Notice period logged for ${occupantState.name}. Vacating Date: ${formattedVacatingDate}`
    );
    setShowLogNoticeModal(false);
  };

  // 2a-1. Extend Notice Submit Handler with Automated Conflict Check
  const handleExtendNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const conflict = propertyStore.checkBedBookingConflict(
      occupantState.roomNumber,
      occupantState.bedCode,
      occupantState.id
    );

    if (conflict.hasConflict) {
      setShowExtendNoticeModal(false);
      setShowManageNoticeModal(false);
      setConflictModalData({
        open: true,
        bookedOccupant: conflict.bookedOccupant,
        actionType: "EXTEND_NOTICE",
        pendingDate: extendedNoticeDate,
      });
      return;
    }

    const dateParts = extendedNoticeDate.split("-");
    const formattedVacatingDate = `${dateParts[2]} Aug 2026`;

    const updated: Occupant = {
      ...occupantState,
      vacatingDate: formattedVacatingDate,
    };
    setOccupantState(updated);
    occupantStore.updateOccupant(updated);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed occupant vacatingDate in propertyStore for real-time Property Map sync!
    const currentStructure = propertyStore.getStructure();
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        if (room.roomNumber !== occupantState.roomNumber) return room;
        return {
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.bedCode !== occupantState.bedCode) return bed;
            return {
              ...bed,
              status: "Vacating" as const,
              occupant: updated,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure);

    setShowExtendNoticeModal(false);
    setShowManageNoticeModal(false);
    triggerToast(`✓ Notice period extended to ${formattedVacatingDate} for ${occupantState.name}`);
  };

  // 2a-2. Cancel Notice & Stay Submit Handler with Automated Conflict Check
  const handleCancelNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const conflict = propertyStore.checkBedBookingConflict(
      occupantState.roomNumber,
      occupantState.bedCode,
      occupantState.id
    );

    if (conflict.hasConflict) {
      setShowCancelNoticeModal(false);
      setShowManageNoticeModal(false);
      setConflictModalData({
        open: true,
        bookedOccupant: conflict.bookedOccupant,
        actionType: "CANCEL_NOTICE",
      });
      return;
    }

    const updated: Occupant = {
      ...occupantState,
      lifecycleStatus: "Active",
      vacatingDate: undefined,
    };
    setOccupantState(updated);
    occupantStore.updateOccupant(updated);

    // Sync bed status in propertyStore back to Occupied 🟤
    const currentStructure = propertyStore.getStructure();
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        if (room.roomNumber !== occupantState.roomNumber) return room;
        return {
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.bedCode !== occupantState.bedCode) return bed;
            return {
              ...bed,
              status: "Occupied" as const,
              occupant: updated,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure);

    setShowCancelNoticeModal(false);
    setShowManageNoticeModal(false);
    triggerToast(`🎉 Notice cancelled! ${occupantState.name} is now an Active Tenant on Bed ${occupantState.roomNumber} (${occupantState.bedCode}) 🟢`);
  };

  // 2a-3. Extend Guest Stay Submit Handler with Automated Conflict Check
  const handleExtendGuestStaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const conflict = propertyStore.checkBedBookingConflict(
      occupantState.roomNumber,
      occupantState.bedCode,
      occupantState.id
    );

    if (conflict.hasConflict) {
      setShowExtendGuestStayModal(false);
      setConflictModalData({
        open: true,
        bookedOccupant: conflict.bookedOccupant,
        actionType: "EXTEND_GUEST_STAY",
        pendingDate: extendedGuestCheckoutDate,
      });
      return;
    }

    const dateParts = extendedGuestCheckoutDate.split("-");
    const formattedCheckoutDate = `${dateParts[2]} Aug 2026`;

    const updated: Occupant = {
      ...occupantState,
      vacatingDate: formattedCheckoutDate,
      dueDate: formattedCheckoutDate,
    };
    setOccupantState(updated);
    occupantStore.updateOccupant(updated);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed occupant checkout date in propertyStore for real-time Property Map sync!
    const currentStructure = propertyStore.getStructure();
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        if (room.roomNumber !== occupantState.roomNumber) return room;
        return {
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.bedCode !== occupantState.bedCode) return bed;
            return {
              ...bed,
              occupant: updated,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure);

    setShowExtendGuestStayModal(false);
    triggerToast(`⏳ Guest stay extended until ${formattedCheckoutDate} for ${occupantState.name}!`);
  };

  // 2b. Guest Checkout & Bed Clearance Submit Handler (DDS-13 Dynamic Cascading Matrix Compliance!)
  const handleGuestCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedGuest: Occupant = {
      ...occupantState,
      lifecycleStatus: "Past",
      vacatingDate: guestCheckoutDate,
    };

    setOccupantState(updatedGuest);
    occupantStore.updateOccupant(updatedGuest);

    // Vacate bed slot in propertyStore singleton (DDS-13 Compliance: Bed returns to Available 🟢)
    const currentStructure = propertyStore.getStructure();
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        if (room.roomNumber !== occupantState.roomNumber) return room;
        return {
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.bedCode !== occupantState.bedCode) return bed;
            return {
              ...bed,
              status: "Available" as const,
              occupant: undefined,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure);

    triggerToast(
      `🏁 Guest Checkout Completed for ${occupantState.name}! Bed ${occupantState.roomNumber} (${occupantState.bedCode}) is now vacant & available 🟢`
    );
    setShowGuestCheckoutModal(false);
  };

  // 3. Edit Profile Submit Handler (Updates Name, Phone, Email, Rent across state)
  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: Occupant = {
      ...occupantState,
      name: editName,
      phone: editPhone,
      email: editEmail,
      rentAmount: editRent,
    };

    setOccupantState(updated);
    occupantStore.updateOccupant(updated);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed occupant details in propertyStore!
    const currentStructure = propertyStore.getStructure();
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        if (room.roomNumber !== occupantState.roomNumber) return room;
        return {
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.bedCode !== occupantState.bedCode) return bed;
            return {
              ...bed,
              occupant: updated,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure);

    triggerToast(`✓ Profile details updated successfully for ${editName}`);
    setShowEditProfileModal(false);
  };

  // 4. Promote Guest to Long-Term Tenant Submit Handler (Updates stayType: "Tenant", lifecycleStatus: "Active", rent & deposit)
  const handlePromoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: Occupant = {
      ...occupantState,
      stayType: "Tenant",
      lifecycleStatus: "Active",
      rentAmount: promoteMonthlyRent,
      joiningDate: promoteJoiningDate,
      hasPdfAgreement: true,
    };

    setOccupantState(updated);
    occupantStore.updateOccupant(updated);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed status from Guest 🟣 to Occupied 🟤 in propertyStore!
    const currentStructure = propertyStore.getStructure();
    const updatedStructure = currentStructure.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        if (room.roomNumber !== occupantState.roomNumber) return room;
        return {
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.bedCode !== occupantState.bedCode) return bed;
            return {
              ...bed,
              status: "Occupied" as const,
              occupant: updated,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure);

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
          {/* Toast Callout */}
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {occupantState.stayType === "Guest" ? (
            <GuestProfileView
              occupantState={occupantState}
              propertyId={propertyId}
              onEditProfile={() => setShowEditProfileModal(true)}
              onCollectPayment={() => setShowCollectRentModal(true)}
              onTransferRoom={() => setShowTransferModal(true)}
              onPromoteToTenant={() => setShowPromoteModal(true)}
              onCheckOutGuest={() => setShowGuestCheckoutModal(true)}
            />
          ) : (
            <>
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
                  <span className="text-xs text-gray-500 font-medium">
                    Resident since {occupantState.joiningDate}
                  </span>
                  {occupantState.vacatingDate && (
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                      Vacating: {occupantState.vacatingDate}
                    </span>
                  )}
                </div>

                {/* Mobile Single-Handed Occupancy Quick Badge (Name + Room Integrated for Mobile) */}
                <div className="md:hidden mt-3 p-2.5 bg-orange-50/90 rounded-xl border border-orange-200/90 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#c2652a]" />
                    <span className="font-bold text-gray-900">
                      Room {occupantState.roomNumber} ({occupantState.bedCode})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#c2652a]">
                    ₹{occupantState.rentAmount.toLocaleString("en-IN")}/mo
                  </span>
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

              {/* 3. Transfer Room (Interactive Bed & Room Shift Modal) */}
              <button
                onClick={() => setShowTransferModal(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 rounded-xl text-xs font-semibold text-gray-700 shadow-xs active:scale-95 transition-all"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#c2652a]" /> Transfer Room
              </button>

              {/* 4. Action Button 4: Log Notice vs Manage Notice (Single Combined Option!) */}
              {occupantState.lifecycleStatus === "Notice" ? (
                <button
                  onClick={() => setShowManageNoticeModal(true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-50 border border-purple-300 hover:bg-purple-100 text-purple-900 font-bold rounded-xl text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-purple-700" /> Manage Notice ⚙️
                </button>
              ) : (
                <button
                  onClick={() => setShowLogNoticeModal(true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 text-gray-700 font-semibold rounded-xl text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#c2652a]" /> Log Notice
                </button>
              )}

              {/* 6. Edit Check-In Date (Only rendered for Booked profiles — Auto-checkin runs on move-in date) */}
              {occupantState.lifecycleStatus === "Booked" && (
                <button
                  onClick={() => setShowEditCheckInModal(true)}
                  className="col-span-2 sm:col-span-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Clock className="w-4 h-4" /> 📅 Edit Check-In Date (Reschedule Move-In)
                </button>
              )}
            </div>
          </div>

          {/* 🟧 NOTICE PERIOD ACTIVE BANNER CALLOUT */}
          {occupantState.lifecycleStatus === "Notice" && (
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/60 rounded-2xl p-5 border border-orange-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-200 text-orange-900 font-bold flex items-center justify-center text-lg shrink-0">
                  🟧
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-orange-950 flex items-center gap-2">
                    Move-Out Notice Active for {occupantState.name}
                  </h3>
                  <p className="text-xs text-orange-800 mt-0.5 font-medium">
                    Scheduled Vacating Date: <strong>{occupantState.vacatingDate || "15 Aug 2026"}</strong> • Bed {occupantState.roomNumber} ({occupantState.bedCode})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setShowManageNoticeModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Calendar className="w-4 h-4 text-purple-200" /> Manage Move-Out Notice ⚙️
                </button>
              </div>
            </div>
          )}

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
                ₹{(occupantState.securityDeposit || 25000).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-gray-500 font-bold mt-1.5 flex items-center gap-1">
                STATUS: <span className="text-purple-700 font-extrabold">{occupantState.depositStatus || "PAID 🟢"}</span>
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
            {/* Left Column (Financial Overview, Details, KYC, Agreement) */}
            <div className="lg:col-span-5 space-y-6">

              {/* 🏠 1. OCCUPANCY & ROOM STAY DETAILS CARD (Priority 1 - Placed above Financial Summary) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                <div className="pb-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#c2652a]" /> Occupancy & Room Details
                  </h3>
                  <span className="text-[10px] font-bold text-[#c2652a] bg-orange-50 px-2.5 py-0.5 rounded-full">
                    PRIMARY OCCUPANT
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
                      ₹{occupantState.rentAmount.toLocaleString("en-IN")} / mo
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

              {/* 💳 2. DEDICATED FINANCIAL SUMMARY & NET DUES CARD */}
              <div className="bg-gradient-to-br from-white to-orange-50/40 rounded-2xl border border-orange-200 p-6 shadow-sm space-y-5 text-xs">
                <div className="flex justify-between items-center pb-3 border-b border-orange-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-orange-100 text-[#c2652a]">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-base text-gray-900">
                        Financial Summary & Net Dues
                      </h3>
                      <p className="text-[10px] text-gray-500 font-semibold">
                        Real-time calculated account statement
                      </p>
                    </div>
                  </div>
                </div>

                {(() => {
                  const tenantStmt = calculateOccupantFinancialStatement(occupantState);
                  return (
                    <>
                      {/* Net Due Hero Banner */}
                      <div className="p-4 rounded-xl bg-white border border-orange-200/80 flex justify-between items-center shadow-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                            Total Net Amount Due
                          </span>
                          <span className="font-mono text-2xl font-extrabold text-gray-900">
                            ₹{tenantStmt.netOutstandingBalance.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                          tenantStmt.isFullyPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : tenantStmt.isPartialPaid
                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {tenantStmt.statusBadgeText}
                        </span>
                      </div>

                      {/* Itemized Financial Ledger Breakdown */}
                      <div className="space-y-2.5 pt-1 text-gray-700">
                        <div className="flex justify-between items-center pb-1.5 border-b border-gray-100">
                          <span className="text-gray-500 font-medium">Rent Due ({tenantStmt.proRataRent < occupantState.rentAmount ? "Pro-Rata" : "Full Month"})</span>
                          <span className="font-mono font-bold text-gray-900">
                            ₹{tenantStmt.proRataRent.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-1.5 border-b border-gray-100">
                          <span className="text-gray-500 font-medium">Security Deposit</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900">
                              ₹{tenantStmt.securityDepositRequired.toLocaleString("en-IN")}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              tenantStmt.isDepositCleared
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {tenantStmt.depositStatusLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pb-1.5 border-b border-gray-100">
                          <span className="text-gray-500 font-medium">Prior Arrears Balance</span>
                          <span className="font-mono font-bold text-gray-900">
                            ₹{tenantStmt.priorArrears.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-medium">Total Payments Received</span>
                          <span className="font-mono font-bold text-emerald-600">
                            -₹{tenantStmt.totalPaid.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Action */}
                      <button
                        onClick={() => {
                          setPaymentAmount(tenantStmt.netOutstandingBalance);
                          setShowCollectRentModal(true);
                        }}
                        className="w-full py-2.5 bg-[#c2652a] hover:bg-[#c2652a]/90 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" /> Collect Payment / Record Receipt (₹{tenantStmt.netOutstandingBalance.toLocaleString("en-IN")})
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* 🪪 Granular Real-Time KYC Verification Card for Tenants */}
              {(() => {
                const isKycVerified = occupantState.kycVerified === true;
                const hasPhoto = Boolean(occupantState.avatar);
                const hasAadhaar = occupantState.aadhaarNumber && occupantState.aadhaarNumber !== "Skipped" && occupantState.aadhaarNumber !== "XXXX-XXXX-8811";

                return (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                    <div className="pb-3 border-b border-gray-100 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-900 text-sm block">
                          Identity & KYC Verification
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          🔒 Real-time Granular Verification Checklist
                        </span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        isKycVerified
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : (hasPhoto || hasAadhaar)
                          ? "bg-orange-100 text-orange-800 border-orange-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {isKycVerified ? "VERIFIED 🟢" : (hasPhoto || hasAadhaar) ? "PARTIAL / PENDING 🟧" : "SKIPPED / PENDING 🔴"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Itemized Checklist */}
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#c2652a]" /> Tenant Profile Photo:
                          </span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${hasPhoto ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                            {hasPhoto ? "COMPLETED ✅" : "PENDING 🔴"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Aadhaar / Govt ID Proof:
                          </span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${hasAadhaar || isKycVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {hasAadhaar || isKycVerified ? "COMPLETED ✅" : "SKIPPED / PENDING 🔴"}
                          </span>
                        </div>
                      </div>

                      {isKycVerified && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-center font-bold text-xs">
                          ✓ All Identity & KYC Documents Verified 🟢
                        </div>
                      )}

                      {!isKycVerified && (
                        <button
                          type="button"
                          onClick={() => setShowUploadKycModal(true)}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" /> + Upload & Complete Remaining KYC Documents
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

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

              {/* DYNAMIC TIMELINE (RENDERED FOR LONG-TERM TENANTS ONLY) */}
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
          </>
        )}
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

                {/* 💰 PREMIUM FINANCIAL RECEIVABLE BREAKDOWN BOX */}
                {(() => {
                  const stmt = calculateOccupantFinancialStatement(occupantState);
                  const isTenant = occupantState.stayType === "Tenant";
                  const proRataInfo = calculateProRataRent(occupantState.rentAmount, occupantState.joiningDate);
                  const targetAutoFill = stmt.netOutstandingBalance;
                  const isSecondInstallment = stmt.totalPaid > 0;

                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 border border-amber-200/80 space-y-2.5 my-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          💰 {isSecondInstallment ? "REMAINING BALANCE BREAKDOWN (PARTIAL INSTALLMENT)" : `RECEIVABLE BREAKDOWN ${isTenant ? "THIS MONTH" : "THIS STAY"}`}
                        </span>
                        {isTenant && !proRataInfo.isFullMonth && !isSecondInstallment && (
                          <span className="text-[10px] bg-orange-200/80 text-orange-950 px-2 py-0.5 rounded-full font-bold">
                            PRO-RATA ({proRataInfo.remainingDays}/{proRataInfo.totalDaysInMonth} DAYS)
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs text-gray-700 font-medium">
                        {isSecondInstallment ? (
                          /* Simplified 2nd/Subsequent Installment Parameters */
                          <>
                            <div className="flex justify-between items-center text-gray-900 font-semibold">
                              <span>Total Tariff (including deposit):</span>
                              <span className="font-mono font-bold">₹{stmt.totalGrossDue.toLocaleString("en-IN")}</span>
                            </div>

                            <div className="flex justify-between items-center text-emerald-800 font-bold border-b border-amber-200/60 pb-1.5">
                              <span>▫️ Previously Collected Payments:</span>
                              <span className="font-mono text-emerald-700">-₹{stmt.totalPaid.toLocaleString("en-IN")}</span>
                            </div>
                          </>
                        ) : (
                          /* 1st Payment Itemized Breakdown */
                          <>
                            {isTenant ? (
                              <>
                                <div className="flex justify-between items-center">
                                  <span>▫️ Rent Due ({proRataInfo.isFullMonth ? "Full Month" : `${proRataInfo.remainingDays} Days Pro-Rata`}):</span>
                                  <span className="font-mono font-bold text-gray-900">₹{proRataInfo.proRataAmount.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>▫️ Security Deposit ({occupantState.depositStatus === "PAID" ? "PAID 🟢" : "PENDING 🔴"}):</span>
                                  <span className="font-mono font-bold text-gray-900">₹{stmt.securityDepositRequired.toLocaleString("en-IN")}</span>
                                </div>
                                {stmt.priorArrears > 0 && (
                                  <div className="flex justify-between items-center text-red-700">
                                    <span>▫️ Prior Unpaid Arrears:</span>
                                    <span className="font-mono font-bold">₹{stmt.priorArrears.toLocaleString("en-IN")}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between items-center">
                                  <span>▫️ Stay Tariff Package:</span>
                                  <span className="font-mono font-bold text-gray-900">₹{occupantState.rentAmount.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>▫️ Security Deposit ({stmt.isDepositCleared ? "PAID 🟢" : "PENDING 🔴"}):</span>
                                  <span className="font-mono font-bold text-gray-900">₹{stmt.securityDepositRequired.toLocaleString("en-IN")}</span>
                                </div>
                              </>
                            )}

                            <div className="flex justify-between items-center pt-1 border-t border-amber-200/60 font-bold text-gray-900">
                              <span>Total Gross Package Due:</span>
                              <span className="font-mono">₹{stmt.totalGrossDue.toLocaleString("en-IN")}</span>
                            </div>
                          </>
                        )}

                        <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between font-extrabold text-gray-900 text-sm">
                          <span className="text-amber-950">🟧 REMAINING BALANCE RECEIVABLE:</span>
                          <span className="font-mono text-[#c2652a] text-base">₹{stmt.netOutstandingBalance.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPaymentAmount(targetAutoFill)}
                        className="w-full py-2 px-3 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer mt-1"
                      >
                        ⚡ Auto-Fill {isSecondInstallment ? "Remaining" : "Suggested"} Amount (₹{targetAutoFill.toLocaleString("en-IN")})
                      </button>
                    </div>
                  );
                })()}

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

        {/* 2b. 🏁 GUEST CHECKOUT & BED CLEARANCE MODAL (Replaces 30-day notice form for short-term guests!) */}
        {showGuestCheckoutModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                    <LogOut className="w-5 h-5 text-red-600" /> Guest Checkout & Bed Clearance
                  </h3>
                  <p className="text-[10px] text-gray-500 font-semibold">
                    Vacate bed & complete short-term stay for {occupantState.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuestCheckoutModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGuestCheckoutSubmit} className="space-y-4">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-1 text-xs">
                  <span className="text-[10px] font-extrabold uppercase text-purple-700 block">Current Guest Allocation</span>
                  <p className="font-bold text-gray-900">
                    Sunshine Heights PG • Room {occupantState.roomNumber} ({occupantState.bedCode})
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Actual Checkout Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={guestCheckoutDate}
                    onChange={(e) => setGuestCheckoutDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-red-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Defaults to expected checkout date. Change if guest vacates early or late.
                  </p>
                </div>

                {/* Security Deposit Refund Handover Box */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">🛡️ Security Deposit Refund</span>
                    <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      ₹{(occupantState.securityDeposit || 1000).toLocaleString("en-IN")} Deposit
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700 text-[11px]">
                    <input
                      type="checkbox"
                      checked={guestRefundKeyDeposit}
                      onChange={(e) => setGuestRefundKeyDeposit(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Room key returned & room inspected (Refund ₹{(occupantState.securityDeposit || 1000).toLocaleString("en-IN")} security deposit to guest)</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Checkout Inspection Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={guestCheckoutNotes}
                    onChange={(e) => setGuestCheckoutNotes(e.target.value)}
                    placeholder="e.g. Room inspected, key returned, no damages found..."
                    className="w-full p-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-red-500"
                  ></textarea>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[10px] text-emerald-900 font-semibold space-y-0.5">
                  <span className="font-extrabold block">⚡ DDS-13 Dynamic Bed Clearance:</span>
                  <span>
                    Submitting will immediately mark Bed {occupantState.roomNumber} ({occupantState.bedCode}) as <strong>Available 🟢</strong> across the Property Map and Overview Dashboard.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowGuestCheckoutModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
                  >
                    Confirm Checkout & Vacate Bed 🏁
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

        {/* HOTEL PMS GUEST EXTEND STAY / BOOK NEXT VISIT MODAL */}
        {showExtendStayModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-100 text-[#c2652a]">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Hotel Stay — Extend / Book Next Visit
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      RECURRING GUEST: {occupantState.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExtendStayModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setExtendMode("EXTEND")}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    extendMode === "EXTEND"
                      ? "bg-white text-[#c2652a] shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Extend Current Stay
                </button>
                <button
                  type="button"
                  onClick={() => setExtendMode("PREBOOK")}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    extendMode === "PREBOOK"
                      ? "bg-white text-[#c2652a] shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Pre-Book Next Visit
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (extendMode === "EXTEND") {
                    const extraRent = additionalDays * (occupantState.rentAmount || 1000);
                    triggerToast(`🎉 Extended stay for ${occupantState.name} by +${additionalDays} days! Added ₹${extraRent.toLocaleString("en-IN")} to charges.`);
                  } else {
                    const d1Parts = nextVisitStartDate.split("-");
                    const d2Parts = nextVisitEndDate.split("-");
                    const formattedStart = `${d1Parts[2]}/${d1Parts[1]}/${d1Parts[0]}`;
                    const formattedEnd = `${d2Parts[2]}/${d2Parts[1]}/${d2Parts[0]}`;
                    triggerToast(`🗓️ Pre-booked returning stay for ${occupantState.name} from ${formattedStart} to ${formattedEnd}!`);
                  }
                  setShowExtendStayModal(false);
                }}
                className="space-y-4 text-xs"
              >
                {extendMode === "EXTEND" ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-950">
                      <p className="font-bold text-xs">Current Stay Overview</p>
                      <p className="text-[11px] mt-0.5">
                        Room {occupantState.roomNumber} ({occupantState.bedCode}) • Daily Rent: ₹{occupantState.rentAmount?.toLocaleString("en-IN") || "1,000"}
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Additional Stay Days *
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          max={90}
                          required
                          value={additionalDays}
                          onChange={(e) => setAdditionalDays(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        />
                        <span className="font-bold text-gray-600 shrink-0">Days</span>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center font-bold">
                      <span className="text-gray-600">Calculated Extension Amount:</span>
                      <span className="text-[#c2652a] text-sm font-mono">
                        ₹{((occupantState.rentAmount || 1000) * additionalDays).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900">
                      <p className="font-bold text-xs">Recurring Guest Pre-Booking</p>
                      <p className="text-[11px] mt-0.5">
                        Reserve bed for returning guest {occupantState.name}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">
                          Arrival Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={nextVisitStartDate}
                          onChange={(e) => setNextVisitStartDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">
                          Departure Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={nextVisitEndDate}
                          onChange={(e) => setNextVisitEndDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a] text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowExtendStayModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold shadow-md"
                  >
                    {extendMode === "EXTEND" ? "Confirm Extension" : "Confirm Pre-Booking"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. Transfer Room Modal (Interactive Bed Shift - Mobile Single-Handed Bottom Sheet) */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in">
            <div className="bg-white rounded-t-3xl md:rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in slide-in-from-bottom-8 md:zoom-in-95 max-h-[90vh] overflow-y-auto">
              {/* Mobile Drag Handle Pill for Single-Handed Thumb Dismiss */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto md:hidden mb-1 shrink-0" />

              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-100 text-[#c2652a]">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Transfer Room & Bed
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      REASSIGN BED FOR: {occupantState.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Allocation Callout */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Current Location</span>
                <p className="font-bold text-gray-900">
                  Floor 01 • Room {occupantState.roomNumber} ({occupantState.bedCode}) • {occupantState.stayType === "Guest" ? `Total Stay Package Tariff: ₹${occupantState.rentAmount.toLocaleString("en-IN")}` : `Monthly Rent: ₹${occupantState.rentAmount.toLocaleString("en-IN")}/mo`}
                </p>
              </div>

              <form onSubmit={handleRoomTransferSubmit} className="space-y-4 text-xs">
                {/* 🌟 EMBEDDED SCROLLABLE VISUAL FLOOR MAP BED PICKER */}
                <div className="space-y-2">
                  <label className="block font-bold text-gray-700 text-xs flex items-center justify-between">
                    <span>Select Target Bed Slot from Visual Floor Map *</span>
                    <span className="text-[10px] text-gray-400">Showing Available 🟢 & Vacating 🟧 beds</span>
                  </label>

                  {/* Selected Target Bed Callout Badge or Placeholder */}
                  {transferRoomNumber && transferBedCode ? (
                    <div className="p-2.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 font-bold text-xs flex items-center justify-between shadow-2xs">
                      <span>✓ Target Destination: Room {transferRoomNumber} ({transferBedCode})</span>
                      <span className="text-[10px] bg-emerald-200 px-2 py-0.5 rounded-full text-emerald-900 font-extrabold">
                        Selected
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-between shadow-2xs animate-pulse">
                      <span>👉 Please select a target bed from the floor map below</span>
                      <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded-full text-amber-800 font-extrabold">
                        Pending Selection
                      </span>
                    </div>
                  )}

                  {/* Scrollable Visual Floor Grid Container with Collapsible Floor Accordions */}
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-2xl p-3 space-y-3 bg-gray-50/70 text-xs">
                    {propertyStore.getStructure().map((floor) => {
                      const roomsWithVacantBeds = floor.rooms.filter((rm) =>
                        rm.beds.some((b) => b.status === "Available" || b.status === "Vacating")
                      );

                      if (roomsWithVacantBeds.length === 0) return null;
                      const isExpanded = expandedTransferFloorIds.includes(floor.id) || expandedTransferFloorIds.length === 0;

                      return (
                        <div key={floor.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                          {/* Collapsible Accordion Header */}
                          <button
                            type="button"
                            onClick={() => {
                              if (expandedTransferFloorIds.includes(floor.id)) {
                                setExpandedTransferFloorIds(expandedTransferFloorIds.filter((f) => f !== floor.id));
                              } else {
                                setExpandedTransferFloorIds([...expandedTransferFloorIds, floor.id]);
                              }
                            }}
                            className="w-full px-3 py-2 bg-gray-100/80 hover:bg-gray-100 flex items-center justify-between text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-800">
                                {floor.floorName}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold">
                                — {floor.floorSubtitle}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold">
                              <span>{roomsWithVacantBeds.length} Vacant Room{roomsWithVacantBeds.length > 1 ? "s" : ""}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </div>
                          </button>

                          {/* Collapsible Floor Body */}
                          {isExpanded && (
                            <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                            {roomsWithVacantBeds.map((room) => {
                              const roomTariff =
                                room.customRentAmount ||
                                (room.sharingType === 1 ? 18000 : room.sharingType === 3 ? 11000 : 14500);

                              return (
                                <div key={room.id} className="p-2.5 rounded-xl border border-gray-200 bg-white space-y-2 text-xs shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-gray-900">Room {room.roomNumber}</span>
                                      {room.specialFeatureTag && (
                                        <span className="text-[8px] block text-emerald-800 font-bold">
                                          {room.specialFeatureTag}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] font-bold text-[#c2652a] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                      ₹{roomTariff.toLocaleString("en-IN")}/mo
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5">
                                    {room.beds.map((bed) => {
                                      const isVacant = bed.status === "Available" || bed.status === "Vacating";
                                      if (!isVacant) return null;

                                      const isTargetSelected =
                                        transferRoomNumber === room.roomNumber && transferBedCode === bed.bedCode;

                                      return (
                                        <button
                                          type="button"
                                          key={bed.id}
                                          onClick={() => {
                                            setTransferRoomNumber(room.roomNumber);
                                            setTransferBedCode(bed.bedCode);
                                            const suggestedDaily = Math.round(roomTariff / 30) || 750;
                                            setNewGuestDailyRate(suggestedDaily);
                                          }}
                                          className={`p-2 rounded-lg border text-center transition-all cursor-pointer font-bold text-[10px] flex items-center justify-between ${
                                            isTargetSelected
                                              ? "bg-[#c2652a] text-white border-[#c2652a] ring-2 ring-[#c2652a]/30 shadow-xs scale-105"
                                              : "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
                                          }`}
                                        >
                                          <span>{bed.bedCode}</span>
                                          <span className="text-[9px]">{isTargetSelected ? "✓" : "🟢"}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Effective Transfer Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferEffectiveDate}
                    onChange={(e) => setTransferEffectiveDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                {/* 🌟 DUAL FINANCIAL CALCULATION ENGINE (Tenant Monthly Cycle vs Guest Stay Duration) */}
                {(() => {
                  const isGuest = occupantState.stayType === "Guest";
                  const selectedTargetRoomObj = propertyStore
                    .getStructure()
                    .flatMap((f) => f.rooms)
                    .find((r) => r.roomNumber === transferRoomNumber);

                  const targetRent =
                    selectedTargetRoomObj?.customRentAmount ||
                    (selectedTargetRoomObj?.sharingType === 1
                      ? 18000
                      : selectedTargetRoomObj?.sharingType === 3
                      ? 11000
                      : 14500);

                  const suggestedDaily = Math.round(targetRent / 30) || 750;

                  const guestCalc = calculateGuestRoomTransferAdjustment(
                    occupantState.rentAmount,
                    newGuestDailyRate || suggestedDaily,
                    transferEffectiveDate,
                    occupantState.joiningDate,
                    occupantState.vacatingDate
                  );

                  const tenantCalc = calculateRoomTransferProRata(
                    occupantState.rentAmount,
                    targetRent,
                    transferEffectiveDate,
                    occupantState.paymentStatus
                  );

                  if (isGuest) {
                    return (
                      <div className="space-y-3">
                        {/* Customizable Daily Tariff Rate Input for Guest */}
                        <div className="p-3.5 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block font-bold text-purple-950 text-xs">
                              🏨 Set Desired Daily Tariff Rate for New Room (₹/day) *
                            </label>
                            <span className="text-[10px] bg-purple-200 text-purple-900 font-extrabold px-2 py-0.5 rounded-full">
                              Customizable Rate
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-2.5 font-bold text-gray-500 text-xs">₹</span>
                              <input
                                type="number"
                                min="100"
                                step="50"
                                value={newGuestDailyRate || suggestedDaily}
                                onChange={(e) => setNewGuestDailyRate(Number(e.target.value))}
                                className="w-full pl-7 pr-3 py-2 rounded-xl bg-white border border-purple-300 font-mono font-bold text-purple-950 text-sm focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <div className="text-[11px] text-purple-900 font-medium">
                              Original Rate: <span className="font-mono font-bold">₹{guestCalc.originalDailyRate}/day</span>
                            </div>
                          </div>
                          {selectedTargetRoomObj?.specialFeatureTag && (
                            <p className="text-[10px] text-purple-700 font-semibold flex items-center gap-1">
                              ✨ Special Features: <strong>{selectedTargetRoomObj.specialFeatureTag}</strong>
                            </p>
                          )}
                        </div>

                        {/* Detailed Guest Upgrade / Downgrade Itemized Breakdown */}
                        <div className={`p-4 rounded-2xl border space-y-3 text-xs ${
                          guestCalc.isUpgrade
                            ? "bg-emerald-50/70 border-emerald-200"
                            : guestCalc.isDowngrade
                            ? "bg-orange-50/70 border-orange-200"
                            : "bg-gray-50 border-gray-200"
                        }`}>
                          <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-xs">🟣 Guest Short-Stay Room Transfer</span>
                              <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full">
                                Stay Upgrade & Adjustment
                              </span>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                              guestCalc.isUpgrade
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : guestCalc.isDowngrade
                                ? "bg-orange-100 text-orange-800 border border-orange-300"
                                : "bg-gray-100 text-gray-700 border border-gray-300"
                            }`}>
                              {guestCalc.isUpgrade ? (
                                <><TrendingUp className="w-3.5 h-3.5 text-emerald-700" /> UPGRADE 📈</>
                              ) : guestCalc.isDowngrade ? (
                                <><TrendingDown className="w-3.5 h-3.5 text-orange-700" /> DOWNGRADE 📉</>
                              ) : (
                                "SAME SHIFT 🔁"
                              )}
                            </span>
                          </div>

                          <div className="space-y-1.5 font-medium text-gray-800 text-xs">
                            <div className="flex justify-between items-center">
                              <span>▫️ Total Stay Duration:</span>
                              <span className="font-bold text-gray-900">{guestCalc.totalStayDays} Days</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>▫️ Days Spent in Original Room (Room {occupantState.roomNumber}):</span>
                              <span className="font-mono text-gray-700">{guestCalc.elapsedDays} Days @ ₹{guestCalc.originalDailyRate}/day = <strong>₹{guestCalc.elapsedTariff.toLocaleString("en-IN")}</strong></span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>▫️ Days Remaining in New Room (Room {transferRoomNumber || "Selected"}):</span>
                              <span className="font-mono text-purple-900">{guestCalc.remainingDays} Days @ ₹{newGuestDailyRate || suggestedDaily}/day = <strong>₹{guestCalc.remainingTariff.toLocaleString("en-IN")}</strong></span>
                            </div>
                            <div className="pt-2 border-t border-gray-200/80 flex justify-between items-center font-bold text-gray-900">
                              <span>Revised Total Stay Tariff:</span>
                              <span className="font-mono">₹{guestCalc.revisedTotalTariff.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500 font-medium">
                              <span>Original Total Stay Tariff:</span>
                              <span className="font-mono">-₹{guestCalc.originalTotalTariff.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="pt-2 border-t border-gray-200 flex justify-between items-center font-extrabold text-sm text-gray-900">
                              <span>NET TARIFF ADJUSTMENT DIFFERENCE:</span>
                              <span className={`font-mono text-base ${guestCalc.isUpgrade ? "text-emerald-700" : guestCalc.isDowngrade ? "text-orange-700" : "text-gray-900"}`}>
                                {guestCalc.isUpgrade ? `+₹${guestCalc.adjustmentAmount.toLocaleString("en-IN")} (UPGRADE)` : guestCalc.isDowngrade ? `-₹${Math.abs(guestCalc.adjustmentAmount).toLocaleString("en-IN")} (DOWNGRADE)` : "₹0"}
                              </span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-white/90 rounded-xl border border-gray-200/80 text-[11px] text-gray-600 font-medium leading-relaxed">
                            {guestCalc.communicationMessage}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 🟢 UNTOUCHED TENANT TRANSFER SUMMARY
                  return (
                    <div className={`p-4 rounded-2xl border space-y-3 text-xs ${
                      tenantCalc.isUpgrade
                        ? "bg-emerald-50/60 border-emerald-200"
                        : tenantCalc.isDowngrade
                        ? "bg-orange-50/60 border-orange-200"
                        : "bg-gray-50 border-gray-200"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-xs">🟢 Tenant Transfer Summary</span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                          tenantCalc.isUpgrade
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : tenantCalc.isDowngrade
                            ? "bg-orange-100 text-orange-800 border border-orange-300"
                            : "bg-gray-100 text-gray-700 border border-gray-300"
                        }`}>
                          {tenantCalc.isUpgrade ? (
                            <><TrendingUp className="w-3.5 h-3.5 text-emerald-700" /> UPGRADE</>
                          ) : tenantCalc.isDowngrade ? (
                            <><TrendingDown className="w-3.5 h-3.5 text-orange-700" /> DOWNGRADE</>
                          ) : (
                            "SAME SHIFT 🔁"
                          )}
                        </span>
                      </div>

                      <div className="space-y-1.5 font-medium text-gray-800 text-xs">
                        <p>• Remaining Days in Cycle: <strong>{tenantCalc.remainingDays} Days</strong></p>
                        <p className="flex items-center gap-1.5">
                          • Rent Adjustment:{" "}
                          <strong className={tenantCalc.isUpgrade ? "text-emerald-700 font-mono text-sm font-extrabold" : tenantCalc.isDowngrade ? "text-orange-700 font-mono text-sm font-extrabold" : "text-gray-900 font-mono text-sm font-bold"}>
                            {tenantCalc.isUpgrade ? `+₹${tenantCalc.adjustmentAmount.toLocaleString("en-IN")}` : tenantCalc.isDowngrade ? `-₹${Math.abs(tenantCalc.adjustmentAmount).toLocaleString("en-IN")}` : "₹0"}
                          </strong>
                        </p>
                      </div>

                      <div className="p-2.5 bg-white/90 rounded-xl border border-gray-200/80 text-[11px] text-gray-600 font-medium leading-relaxed">
                        {occupantState.paymentStatus === "Paid" ? (
                          tenantCalc.isUpgrade ? (
                            <span>💡 Since current month rent is already paid, <strong>+₹{tenantCalc.adjustmentAmount.toLocaleString("en-IN")}</strong> extra rent for {tenantCalc.remainingDays} days will be added to the next 5th month rent bill.</span>
                          ) : tenantCalc.isDowngrade ? (
                            <span>💡 Since current month rent is already paid, <strong>-₹{Math.abs(tenantCalc.adjustmentAmount).toLocaleString("en-IN")}</strong> discount credit for {tenantCalc.remainingDays} days will be deducted from the next 5th month rent bill.</span>
                          ) : (
                            <span>💡 Room shifted within same tariff tier. No change in rent bill.</span>
                          )
                        ) : (
                          <span>💡 Current month's unpaid rent due is revised based on {tenantCalc.remainingDays} days in the new room.</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="w-full sm:w-auto px-5 min-h-[48px] py-3 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 active:scale-98 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!transferRoomNumber || !transferBedCode}
                    className="w-full sm:w-auto px-7 min-h-[48px] py-3 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-md active:scale-98 transition-all"
                  >
                    Confirm Room Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ⚙️ UNIFIED SINGLE MANAGE NOTICE MODAL */}
        {showManageNoticeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-purple-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 rounded-xl text-purple-800">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-lg text-gray-900">
                      Manage Move-Out Notice ⚙️
                    </h2>
                    <p className="text-xs text-gray-500">
                      {occupantState.name} • Room {occupantState.roomNumber} ({occupantState.bedCode})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManageNoticeModal(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Notice Status Pill */}
              <div className="bg-orange-50 p-3.5 rounded-2xl border border-orange-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Scheduled Vacating Date</span>
                  <p className="font-serif text-base font-bold text-gray-900 mt-0.5">
                    {occupantState.vacatingDate || "15 Aug 2026"}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-orange-100 text-orange-800 border border-orange-200">
                  🟧 NOTICE ACTIVE
                </span>
              </div>

              {/* Segmented Tab Options: Extend Notice vs Cancel Notice */}
              <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setNoticeActionTab("extend")}
                  className={`py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    noticeActionTab === "extend"
                      ? "bg-white text-purple-950 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-700" /> Extend Date 📅
                </button>

                <button
                  type="button"
                  onClick={() => setNoticeActionTab("cancel")}
                  className={`py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    noticeActionTab === "cancel"
                      ? "bg-white text-emerald-950 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Cancel Notice 🟢
                </button>
              </div>

              {/* TAB CONTENT 1: EXTEND NOTICE */}
              {noticeActionTab === "extend" && (
                <form onSubmit={handleExtendNoticeSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      New Extended Vacating Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={extendedNoticeDate}
                      onChange={(e) => setExtendedNoticeDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-purple-700"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5">
                      Before extending, the system will verify if Bed {occupantState.roomNumber} ({occupantState.bedCode}) is free or pre-booked.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowManageNoticeModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-md cursor-pointer"
                    >
                      Confirm & Extend Notice Date
                    </button>
                  </div>
                </form>
              )}

              {/* TAB CONTENT 2: CANCEL NOTICE & STAY */}
              {noticeActionTab === "cancel" && (
                <form onSubmit={handleCancelNoticeSubmit} className="space-y-4 text-xs">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 space-y-1">
                    <p className="font-bold text-sm">
                      Cancel Move-Out Notice for {occupantState.name}?
                    </p>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      This will cancel the move-out notice, revert their status back to <strong>Active Tenant</strong>, and keep Bed {occupantState.roomNumber} ({occupantState.bedCode}) assigned as <strong>Occupied 🟤</strong>.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowManageNoticeModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md cursor-pointer"
                    >
                      Confirm & Cancel Notice 🟢
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 📅 1. EXTEND NOTICE MODAL */}
        {showExtendNoticeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-700" /> Extend Move-Out Notice Date 📅
                </h2>
                <button
                  type="button"
                  onClick={() => setShowExtendNoticeModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExtendNoticeSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    New Extended Vacating Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={extendedNoticeDate}
                    onChange={(e) => setExtendedNoticeDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-purple-700"
                  />
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    Before confirming, the system will check if Bed {occupantState.roomNumber} ({occupantState.bedCode}) is free or pre-booked.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowExtendNoticeModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-md"
                  >
                    Confirm & Extend Notice Date
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🟢 2. CANCEL NOTICE MODAL */}
        {showCancelNoticeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" /> Cancel Notice & Stay 🟢
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCancelNoticeModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCancelNoticeSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                  <p className="font-semibold">
                    Are you sure you want to cancel the move-out notice for <strong>{occupantState.name}</strong>?
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Status will revert to <strong>Active Tenant</strong> and Bed {occupantState.roomNumber} ({occupantState.bedCode}) will remain occupied.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCancelNoticeModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md"
                  >
                    Confirm & Cancel Notice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ⏳ 3. EXTEND GUEST STAY MODAL */}
        {showExtendGuestStayModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-700" /> Extend Short-Term Guest Stay ⏳
                </h2>
                <button
                  type="button"
                  onClick={() => setShowExtendGuestStayModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExtendGuestStaySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    New Extended Guest Checkout Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={extendedGuestCheckoutDate}
                    onChange={(e) => setExtendedGuestCheckoutDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-purple-700"
                  />
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    The system will verify that Bed {occupantState.roomNumber} ({occupantState.bedCode}) is free for the extended stay.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowExtendGuestStayModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-md"
                  >
                    Confirm & Extend Guest Stay
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ⚠️ 4. AUTOMATED FUTURE BOOKING CONFLICT RESOLUTION MODAL */}
        {conflictModalData?.open && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-red-300 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 font-bold flex items-center justify-center text-xl shrink-0">
                    ⚠️
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-lg text-red-950">
                      Bed Booking Conflict Detected!
                    </h2>
                    <p className="text-xs text-red-700 font-medium">
                      Bed {occupantState.roomNumber} ({occupantState.bedCode}) has ALREADY been pre-booked!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConflictModalData(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Pre-Booked Incoming Occupant Card */}
              {conflictModalData.bookedOccupant && (
                <div className="bg-red-50/80 p-4 rounded-2xl border border-red-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-red-900 text-[11px] uppercase tracking-wider">
                      Pre-Booked Incoming Occupant
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                      {conflictModalData.bookedOccupant.stayType === "Guest" ? "🟣 BOOKED GUEST" : "🟦 BOOKED TENANT"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-red-100 shadow-2xs">
                    <img
                      src={conflictModalData.bookedOccupant.avatar}
                      alt={conflictModalData.bookedOccupant.name}
                      className="w-12 h-12 rounded-xl bg-gray-100 object-cover border border-gray-200"
                    />
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {conflictModalData.bookedOccupant.name}
                      </h4>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        Expected Check-In: <strong>{conflictModalData.bookedOccupant.joiningDate || conflictModalData.bookedOccupant.dueDate}</strong>
                      </p>
                      <p className="text-gray-400 text-[10px]">
                        Phone: {conflictModalData.bookedOccupant.phone} • {conflictModalData.bookedOccupant.workplace || "Private Visit"}
                      </p>
                    </div>
                  </div>

                  <p className="text-red-900 text-[11px] font-medium leading-relaxed">
                    Because {conflictModalData.bookedOccupant.name} is scheduled to move into Bed {occupantState.roomNumber} ({occupantState.bedCode}), you cannot extend or cancel notice on this bed without resolving the conflict.
                  </p>
                </div>
              )}

              {/* 1-Click Resolution Shortcuts */}
              <div className="space-y-2.5 pt-2">
                <p className="font-bold text-xs text-gray-800">
                  Select a Resolution Action:
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setConflictModalData(null);
                    setShowTransferModal(true);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
                >
                  <ArrowRightLeft className="w-4 h-4" /> Suggest Room Transfer for {occupantState.name} 🟢
                </button>

                {conflictModalData.bookedOccupant && (
                  <button
                    type="button"
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `Hi ${conflictModalData.bookedOccupant?.name}, regarding your booking for Room ${occupantState.roomNumber} (${occupantState.bedCode}) on ${conflictModalData.bookedOccupant?.joiningDate}...`
                      );
                      window.open(`https://wa.me/91${conflictModalData.bookedOccupant?.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                    }}
                    className="w-full py-3 px-4 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-emerald-700" /> Contact Incoming {conflictModalData.bookedOccupant.name} via WhatsApp 💬
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🪪 IN-PROFILE UPLOAD & COMPLETE KYC MODAL */}
        {showUploadKycModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#c2652a]" /> Upload & Complete KYC Documents
                </h2>
                <button
                  type="button"
                  onClick={() => setShowUploadKycModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCompleteKycSubmit} className="space-y-4">
                {/* 1. Profile Photo Upload / Save */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <label className="block font-bold text-gray-800 text-xs">
                    📷 1. Tenant Profile Photo
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl bg-white border border-gray-300 font-bold text-gray-800 text-center hover:bg-gray-100">
                      Choose Photo File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setKycInputPhotoUrl(ev.target?.result as string);
                              setIsKycPhotoSaved(false);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {kycInputPhotoUrl && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-lg font-medium">
                        ✓ Photo Loaded Successfully
                      </div>
                      {!isKycPhotoSaved ? (
                        <button
                          type="button"
                          onClick={() => setIsKycPhotoSaved(true)}
                          className="w-full py-2 px-3 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs cursor-pointer"
                        >
                          💾 Save Profile Photo to Database
                        </button>
                      ) : (
                        <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs flex items-center justify-between">
                          <span>✓ Photo Locked & Saved 🟢</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Aadhaar / Govt ID Input */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <label className="block font-bold text-gray-800 text-xs">
                    🪪 2. Aadhaar / Govt ID Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={kycInputAadhaar}
                    onChange={(e) => setKycInputAadhaar(e.target.value)}
                    placeholder="e.g. 9812-4412-8811 or Govt ID"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono text-xs font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="cursor-pointer py-2 px-2 rounded-xl bg-white border border-gray-300 font-bold text-gray-700 text-center hover:bg-gray-100 text-[10px]">
                      {kycFrontUploaded ? "✓ Front Uploaded" : "+ Upload Front ID"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={() => setKycFrontUploaded(true)}
                      />
                    </label>

                    <label className="cursor-pointer py-2 px-2 rounded-xl bg-white border border-gray-300 font-bold text-gray-700 text-center hover:bg-gray-100 text-[10px]">
                      {kycBackUploaded ? "✓ Back Uploaded" : "+ Upload Back ID"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={() => setKycBackUploaded(true)}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowUploadKycModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold shadow-md cursor-pointer"
                  >
                    🚀 Complete & Save KYC
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
