"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { GuestProfileView } from "@/components/dashboard/GuestProfileView";
import { MOCK_OCCUPANTS_200, occupantStore, Occupant, PaymentHistoryItem } from "@/constants/mockOccupants";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { subscribeOccupantsFromFirestore, saveOccupantToFirestore } from "@/lib/firestoreService";
import { UnifiedPhotoUploadSlot } from "@/components/dashboard/UnifiedPhotoUploadSlot";
import { CheckOutSettlementModal } from "@/components/dashboard/CheckOutSettlementModal";
import {
  calculateRoomTransferProRata,
  calculateGuestRoomTransferAdjustment,
} from "@/utils/financialEngine";
import {
  calculateProRataRent,
  calculateOccupantFinancialStatement,
  formatIsoToDisplayDate,
  getRoomTariff,
} from "@/utils/domainSSOT";
import { parseOccupantDate } from "@/utils/autoCheckInEngine";
import { propertySettingsStore } from "@/constants/propertySettings";
import { complianceLogStore } from "@/constants/complianceLogStore";
import { sanitizeOccupantForCompliance } from "@/utils/dpdpRetentionEngine";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Edit,
  CreditCard,
  ArrowRightLeft,
  FileText,
  Wallet,
  Sparkles,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  Building2,
  Download,
  CheckCircle2,
  Check,
  Briefcase,
  MapPin,
  Camera,
  Clock,
  Trash2,
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

  // Find occupant in occupantStore
  const occupant = useMemo(() => {
    const allOccupants = typeof window !== "undefined" ? occupantStore.getOccupants(propertyId) : [];
    const match = allOccupants.find((o) => o.id === tenantId);
    return match || null;
  }, [tenantId, propertyId]);

  // Local state for dynamic occupant edits
  const [occupantState, setOccupantState] = useState<Occupant | null>(occupant);

  // Synchronize occupantState and paymentHistory whenever tenantId/propertyId changes
  useEffect(() => {
    setIsMounted(true);
    const existing = occupantStore.getOccupants(propertyId).find((o) => o.id === tenantId);
    if (existing) {
      setOccupantState(existing);
      setEditName(existing.name);
      setEditPhone(existing.phone);
      setEditEmail(existing.email || "");
      setEditRent(existing.rentAmount);
      setEditOccupation(existing.occupation || "");
      setEditWorkplace(existing.workplace || "");
      setEditPurposeOfVisit(existing.purposeOfVisit || "");
      if (existing.paymentHistory && Array.isArray(existing.paymentHistory)) {
        setPaymentHistory(existing.paymentHistory);
      }
    }

    const unsubscribeLocal = occupantStore.subscribe(() => {
      const updated = occupantStore.getOccupants(propertyId).find((o) => o.id === tenantId);
      if (updated) {
        setOccupantState(updated);
        setEditName(updated.name);
        setEditPhone(updated.phone);
        setEditEmail(updated.email || "");
        setEditRent(updated.rentAmount);
        setEditOccupation(updated.occupation || "");
        setEditWorkplace(updated.workplace || "");
        setEditPurposeOfVisit(updated.purposeOfVisit || "");
        if (updated.paymentHistory && Array.isArray(updated.paymentHistory)) {
          setPaymentHistory(updated.paymentHistory);
        }
      }
    });

    const unsubscribeFirestore = subscribeOccupantsFromFirestore(propertyId, (fsOccupants) => {
      if (fsOccupants && fsOccupants.length > 0) {
        occupantStore.setOccupantsFromFirestore(fsOccupants, propertyId);
        const updated = fsOccupants.find((o) => o.id === tenantId);
        if (updated) {
          setOccupantState(updated);
          setEditName(updated.name);
          setEditPhone(updated.phone);
          setEditEmail(updated.email || "");
          setEditRent(updated.rentAmount);
          setEditOccupation(updated.occupation || "");
          setEditWorkplace(updated.workplace || "");
          setEditPurposeOfVisit(updated.purposeOfVisit || "");
          if (updated.paymentHistory && Array.isArray(updated.paymentHistory)) {
            setPaymentHistory(updated.paymentHistory);
          }
        }
      }
    });

    return () => {
      unsubscribeLocal();
      unsubscribeFirestore();
    };
  }, [tenantId, propertyId]);

  // Payment History State (Starts empty [] for Booked status or newly onboarded profiles!)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);

  // Real-time Property Settings
  const propertySettings = propertySettingsStore.getSettings(propertyId);
  const displayPropertyName = propertySettings?.propertyName || (propertyId === "sunshine-pg" ? "Sunshine Heights PG" : "My Property");

  // Modal Control States
  const [showCollectRentModal, setShowCollectRentModal] = useState(false);
  const [showLogNoticeModal, setShowLogNoticeModal] = useState(false);

  // Unified Guest Stay Management Modal State (Extend Date / Checkout)
  const [showGuestStayManagementModal, setShowGuestStayManagementModal] = useState<boolean>(false);
  const [guestStayModalTab, setGuestStayModalTab] = useState<"EXTEND" | "CHECKOUT">("EXTEND");

  // Tab 1: Extend Stay Inputs
  const [extendedStayDate, setExtendedStayDate] = useState<string>("");
  const [customDailyRate, setCustomDailyRate] = useState<number>(0);
  const [extendPaymentOption, setExtendPaymentOption] = useState<"COLLECT_NOW" | "ADD_TO_DUE">("COLLECT_NOW");
  const [extendPaymentMode, setExtendPaymentMode] = useState<string>("UPI");

  const [guestCheckoutDate, setGuestCheckoutDate] = useState<string>("2026-08-01");
  const [checkoutTime, setCheckoutTime] = useState<string>("11:00");
  const [guestRefundKeyDeposit, setGuestRefundKeyDeposit] = useState<boolean>(true);
  const [guestCheckoutNotes, setGuestCheckoutNotes] = useState<string>("");
  const [earlyDeparturePolicy, setEarlyDeparturePolicy] = useState<"PRO_RATA_REFUND" | "RETAIN_PACKAGE">("PRO_RATA_REFUND");
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showDeleteGuestModal, setShowDeleteGuestModal] = useState(false);
  const [showGuestCheckoutConfirmModal, setShowGuestCheckoutConfirmModal] = useState(false);
  const [showRescheduleCancelModal, setShowRescheduleCancelModal] = useState<boolean>(false);
  const [rescheduleModalTab, setRescheduleModalTab] = useState<"RESCHEDULE" | "CANCEL">("RESCHEDULE");
  const [postponedCheckInDate, setPostponedCheckInDate] = useState<string>("2026-08-20");
  const [cancellationRetentionFee, setCancellationRetentionFee] = useState<number>(0);
  const [cancellationReason, setCancellationReason] = useState<string>("Tenant No-Show (Did not appear on joining date)");
  const [cancellationNotes, setCancellationNotes] = useState<string>("");

  // Collect Rent Form Inputs
  const [paymentDate, setPaymentDate] = useState<string>("2026-08-01");
  const [paymentAmount, setPaymentAmount] = useState<number>(occupantState?.rentAmount || 0);
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
  const [showCheckOutModal, setShowCheckOutModal] = useState<boolean>(false);

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
  const [editName, setEditName] = useState<string>(occupantState?.name || "");
  const [editPhone, setEditPhone] = useState<string>(occupantState?.phone || "");
  const [editEmail, setEditEmail] = useState<string>(occupantState?.email || "");
  const [editRent, setEditRent] = useState<number>(occupantState?.rentAmount || 0);
  const [editDeposit, setEditDeposit] = useState<number>(occupantState?.securityDeposit !== undefined ? occupantState.securityDeposit : (occupantState?.rentAmount ? occupantState.rentAmount * 2 : 0));
  const [editOccupation, setEditOccupation] = useState<string>(occupantState?.occupation || "");
  const [editWorkplace, setEditWorkplace] = useState<string>(occupantState?.workplace || "");
  const [editPurposeOfVisit, setEditPurposeOfVisit] = useState<string>(occupantState?.purposeOfVisit || "");

  // Room Transfer Modal State (Empty default ensures NO target bed is pre-selected!)
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferRoomNumber, setTransferRoomNumber] = useState<string>("");
  const [transferBedCode, setTransferBedCode] = useState<string>("");
  const [expandedTransferFloorIds, setExpandedTransferFloorIds] = useState<string[]>([]);
  const [transferEffectiveDate, setTransferEffectiveDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [newGuestDailyRate, setNewGuestDailyRate] = useState<number>(0);
  const [showTariffAccordion, setShowTariffAccordion] = useState(false);
  const [showFinancialAccordion, setShowFinancialAccordion] = useState(false);

  // In-Profile Upload KYC Modal State
  const [showUploadKycModal, setShowUploadKycModal] = useState<boolean>(false);
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
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
    if (!occupantState) return;

    const isGuest = occupantState.stayType === "Guest";
    const oldRoomNumber = occupantState.roomNumber;
    const oldBedCode = occupantState.bedCode;

    // 1. Query target room's price from propertyStore
    const selectedTargetRoomObj = propertyStore
      .getStructure(propertyId)
      .flatMap((f) => f.rooms)
      .find((r) => r.roomNumber === transferRoomNumber);

    const targetRent = selectedTargetRoomObj
      ? getRoomTariff(selectedTargetRoomObj, propertyId)
      : 12000;

    // 2. Perform financial calculation & state mutation based on stayType (Guest vs Tenant)
    const suggestedDaily = Math.round(targetRent / 30) || 750;
    
    // Format pending extended notice date if room transfer was triggered to resolve a notice conflict
    let revisedVacatingDate = occupantState.vacatingDate;
    if (conflictModalData?.pendingDate) {
      revisedVacatingDate = formatIsoToDisplayDate(conflictModalData.pendingDate);
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
    occupantStore.updateOccupant(updatedOccupant, propertyId);

    // 4. DDS-13 Dynamic Cascading Mutation across Property Store!
    // Vacates OLD bed slot (Available 🟢) and occupies TARGET bed slot (Occupied 🟤 / Guest 🟣)
    const currentStructure = propertyStore.getStructure(propertyId);
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

    propertyStore.updateStructure(updatedStructure, propertyId);

    // 5. Sync occupantStore
    occupantStore.updateOccupant(updatedOccupant, propertyId);
    setConflictModalData(null);

    const netDiff = isGuest ? (newGuestDailyRate || suggestedDaily) : (isGuest ? 0 : 0);
    triggerToast(
      `🎉 Room transfer complete! ${occupantState.name} moved from Room ${oldRoomNumber} (${oldBedCode}) to Room ${transferRoomNumber} (${transferBedCode}). Tariff adjustment applied successfully.`
    );
    setShowTransferModal(false);
  };

  const handleCompleteKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupantState) return;
    const updated: Occupant = {
      ...occupantState,
      kycVerified: true,
      aadhaarNumber: kycInputAadhaar || occupantState.aadhaarNumber || "XXXX-XXXX-8811",
      avatar: kycInputPhotoUrl || occupantState.avatar,
    };
    setOccupantState(updated);
    occupantStore.updateOccupant(updated, propertyId);
    setShowUploadKycModal(false);
    triggerToast(`✓ KYC verification completed successfully for ${occupantState.name}! 🟢`);
  };

  // 1. Collect Rent Submit Handler (No Cheques, Transaction ID for UPI/Bank, Updates State)
  const handleCollectRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupantState) return;

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
    const updatedDraft: Occupant = {
      ...occupantState,
      paymentHistory: updatedHistory,
    };
    const stmt = calculateOccupantFinancialStatement(updatedDraft, propertySettings);

    const updated: Occupant = {
      ...occupantState,
      paymentStatus: stmt.isFullyPaid ? "Paid" : "Due",
      lastPaidDate: formattedPaidDate,
      daysRemainingText: stmt.isFullyPaid ? "—" : "PARTIAL DUE",
      depositStatus: stmt.depositStatusLabel,
      partialPaidThisCycle: stmt.totalPaid,
      paymentHistory: updatedHistory,
    };

    setOccupantState(updated);
    occupantStore.updateOccupant(updated, propertyId);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed occupant payment status in propertyStore!
    const currentStructure = propertyStore.getStructure(propertyId);
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
    propertyStore.updateStructure(updatedStructure, propertyId);

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
    if (!occupantState) return;

    // Format date string for display (e.g., "15 Aug 2026")
    const formattedVacatingDate = formatIsoToDisplayDate(vacatingDate);

    const updated: Occupant = {
      ...occupantState,
      lifecycleStatus: "Notice",
      vacatingDate: formattedVacatingDate,
    };

    setOccupantState(updated);
    occupantStore.updateOccupant(updated, propertyId);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed status to Vacating in propertyStore!
    const currentStructure = propertyStore.getStructure(propertyId);
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
    propertyStore.updateStructure(updatedStructure, propertyId);

    triggerToast(
      `✓ Notice period logged for ${occupantState.name}. Vacating Date: ${formattedVacatingDate}`
    );
    setShowLogNoticeModal(false);
  };

  // 2a-1. Extend Notice Submit Handler with Automated Conflict Check
  const handleExtendNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupantState) return;
    const conflict = propertyStore.checkBedBookingConflict(
      occupantState.roomNumber,
      occupantState.bedCode,
      occupantState.id,
      extendedNoticeDate,
      occupantState.vacatingDate
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

    const formattedVacatingDate = formatIsoToDisplayDate(extendedNoticeDate);

    const updated: Occupant = {
      ...occupantState,
      vacatingDate: formattedVacatingDate,
    };
    setOccupantState(updated);
    occupantStore.updateOccupant(updated, propertyId);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed occupant vacatingDate in propertyStore for real-time Property Map sync!
    const currentStructure = propertyStore.getStructure(propertyId);
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
    propertyStore.updateStructure(updatedStructure, propertyId);

    setShowExtendNoticeModal(false);
    setShowManageNoticeModal(false);
    triggerToast(`✓ Notice period extended to ${formattedVacatingDate} for ${occupantState.name}`);
  };

  // 2a-2. Cancel Notice & Stay Submit Handler with Automated Conflict Check
  const handleCancelNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupantState) return;
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
    occupantStore.updateOccupant(updated, propertyId);

    // Sync bed status in propertyStore back to Occupied 🟤
    const currentStructure = propertyStore.getStructure(propertyId);
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
    propertyStore.updateStructure(updatedStructure, propertyId);

    setShowCancelNoticeModal(false);
    setShowManageNoticeModal(false);
    triggerToast(`🎉 Notice cancelled! ${occupantState.name} is now an Active Tenant on Bed ${occupantState.roomNumber} (${occupantState.bedCode}) 🟢`);
  };

  // 2a-3. Extend Guest Stay Submit Handler with Automated Conflict Check
  const handleExtendGuestStaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupantState) return;
    const conflict = propertyStore.checkBedBookingConflict(
      occupantState.roomNumber,
      occupantState.bedCode,
      occupantState.id,
      extendedGuestCheckoutDate,
      occupantState.vacatingDate || occupantState.dueDate
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

    const formattedCheckoutDate = formatIsoToDisplayDate(extendedGuestCheckoutDate);

    const updated: Occupant = {
      ...occupantState,
      vacatingDate: formattedCheckoutDate,
      dueDate: formattedCheckoutDate,
    };
    setOccupantState(updated);
    occupantStore.updateOccupant(updated, propertyId);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed occupant checkout date in propertyStore for real-time Property Map sync!
    const currentStructure = propertyStore.getStructure(propertyId);
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
    propertyStore.updateStructure(updatedStructure, propertyId);

    setShowExtendGuestStayModal(false);
    triggerToast(`⏳ Guest stay extended until ${formattedCheckoutDate} for ${occupantState.name}!`);
  };

  // Quick Preset Helper for Guest Stay Extension
  const applyExtensionPresetDays = (days: number) => {
    const currentCheckout = occupantState?.vacatingDate || occupantState?.dueDate || occupantState?.joiningDate || new Date().toISOString().split("T")[0];
    const baseDate = new Date(currentCheckout);
    baseDate.setDate(baseDate.getDate() + days);
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, "0");
    const d = String(baseDate.getDate()).padStart(2, "0");
    setExtendedStayDate(`${y}-${m}-${d}`);
  };

  // Real-time Bed Conflict Scanner for Guest Extension
  const conflictingOccupantForGuest = useMemo(() => {
    if (!occupantState || !extendedStayDate) return null;
    const currentCheckout = occupantState.vacatingDate || occupantState.dueDate || occupantState.joiningDate;
    if (extendedStayDate <= currentCheckout) return null;

    const allOccupants = occupantStore.getOccupants(propertyId);
    return (
      allOccupants.find((occ) => {
        if (occ.id === occupantState.id) return false;
        if (occ.lifecycleStatus === "Past") return false;
        if (
          occ.roomNumber?.toUpperCase().trim() !== occupantState.roomNumber?.toUpperCase().trim() ||
          occ.bedCode?.toUpperCase().trim() !== occupantState.bedCode?.toUpperCase().trim()
        ) {
          return false;
        }
        const occJoin = occ.joiningDate;
        const occVacate = occ.vacatingDate || occ.dueDate || "9999-12-31";
        return occJoin <= extendedStayDate && occVacate >= currentCheckout;
      }) || null
    );
  }, [occupantState, extendedStayDate, propertyId]);

  // Initialize Guest Stay Management Inputs
  useEffect(() => {
    if (showGuestStayManagementModal && occupantState) {
      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");

      // Auto-populate with today's live date & current live time (100% Free, Zero Cost)
      setGuestCheckoutDate(todayIso);
      setCheckoutTime(`${currentHours}:${currentMinutes}`);

      const scheduledCheckout = occupantState.vacatingDate || occupantState.dueDate || occupantState.joiningDate || todayIso;
      const baseDate = new Date(scheduledCheckout);
      baseDate.setDate(baseDate.getDate() + 3);
      const y = baseDate.getFullYear();
      const m = String(baseDate.getMonth() + 1).padStart(2, "0");
      const d = String(baseDate.getDate()).padStart(2, "0");
      setExtendedStayDate(`${y}-${m}-${d}`);

      const stayDurationDays = Math.max(1, Math.round((new Date(scheduledCheckout).getTime() - new Date(occupantState.joiningDate).getTime()) / (1000 * 60 * 60 * 24)));
      const calculatedDaily = Math.round((occupantState.rentAmount || 1000) / stayDurationDays) || 500;
      setCustomDailyRate(calculatedDaily);
      setPenaltyAmount(0);
      setEarlyDeparturePolicy("PRO_RATA_REFUND");
    }
  }, [showGuestStayManagementModal, occupantState]);

  // Early Departure Real-Time Calculation Helper
  const earlyDepartureAnalysis = useMemo(() => {
    if (!occupantState || !guestCheckoutDate) return null;
    const scheduledCheckout = occupantState.vacatingDate || occupantState.dueDate || occupantState.joiningDate;
    if (!scheduledCheckout) return null;

    const parsedJoining = parseOccupantDate(occupantState.joiningDate) || new Date();
    const parsedScheduled = parseOccupantDate(scheduledCheckout) || new Date();
    const parsedActual = parseOccupantDate(guestCheckoutDate) || new Date();

    const checkInMidnight = new Date(parsedJoining.getFullYear(), parsedJoining.getMonth(), parsedJoining.getDate()).getTime();
    const scheduledMidnight = new Date(parsedScheduled.getFullYear(), parsedScheduled.getMonth(), parsedScheduled.getDate()).getTime();
    const actualMidnight = new Date(parsedActual.getFullYear(), parsedActual.getMonth(), parsedActual.getDate()).getTime();

    const totalOriginalDays = Math.max(1, Math.round((scheduledMidnight - checkInMidnight) / (1000 * 60 * 60 * 24)));
    const actualDaysElapsed = Math.max(1, Math.round((actualMidnight - checkInMidnight) / (1000 * 60 * 60 * 24)));

    const isEarly = actualMidnight < scheduledMidnight && actualDaysElapsed < totalOriginalDays;
    const unusedDays = Math.max(0, totalOriginalDays - actualDaysElapsed);

    const totalOriginalRent = occupantState.rentAmount || 1000;
    const effectiveDailyRate = Math.round(totalOriginalRent / totalOriginalDays) || 500;
    const recalculatedProRataTariff = actualDaysElapsed * effectiveDailyRate;
    const unusedTariffAmount = Math.max(0, totalOriginalRent - recalculatedProRataTariff);

    return {
      isEarly,
      totalOriginalDays,
      actualDaysElapsed,
      unusedDays,
      totalOriginalRent,
      effectiveDailyRate,
      recalculatedProRataTariff,
      unusedTariffAmount,
      scheduledCheckout,
    };
  }, [occupantState, guestCheckoutDate]);

  // 2a. Guest Stay Extension Submit Handler (With Conflict Guard & Payment Reflection)
  const handleGuestStayExtensionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupantState || !extendedStayDate) return;

    if (conflictingOccupantForGuest) {
      alert(
        `Cannot extend stay: Bed ${occupantState.bedCode} is already booked by ${conflictingOccupantForGuest.name} starting ${conflictingOccupantForGuest.joiningDate}. Please use Transfer Room to move this guest.`
      );
      return;
    }

    const currentCheckout = occupantState.vacatingDate || occupantState.dueDate || occupantState.joiningDate;
    const diffMs = new Date(extendedStayDate).getTime() - new Date(currentCheckout).getTime();
    const extraDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    const rateToUse = customDailyRate > 0 ? customDailyRate : 500;
    const addedTariff = extraDays * rateToUse;

    const newPaymentHistory = [...(occupantState.paymentHistory || [])];
    if (extendPaymentOption === "COLLECT_NOW") {
      newPaymentHistory.push({
        id: `pay_ext_${Date.now()}`,
        month: `Stay Extension (+${extraDays} Days)`,
        date: new Date().toISOString().split("T")[0],
        amount: addedTariff,
        mode: extendPaymentMode,
        receiptNo: `REC-EXT-${Date.now().toString().slice(-4)}`,
        status: "PAID",
      });
    }

    const updatedGuest: Occupant = {
      ...occupantState,
      vacatingDate: extendedStayDate,
      dueDate: extendedStayDate,
      rentAmount: (occupantState.rentAmount || 0) + addedTariff,
      paymentHistory: newPaymentHistory,
    };

    setOccupantState(updatedGuest);
    occupantStore.updateOccupant(updatedGuest, propertyId);

    // Sync bed vacatingDate in propertyStore
    const currentStructure = propertyStore.getStructure(propertyId);
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
              vacatingDate: extendedStayDate,
              occupant: updatedGuest,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure, propertyId);

    triggerToast(
      `🎉 Stay extended for ${occupantState.name} until ${extendedStayDate} (+${extraDays} days)! ${
        extendPaymentOption === "COLLECT_NOW"
          ? `Collected ₹${addedTariff.toLocaleString("en-IN")} via ${extendPaymentMode} 🟢`
          : `Added ₹${addedTariff.toLocaleString("en-IN")} to pending dues 🟧`
      }`
    );
    setShowGuestStayManagementModal(false);
  };

  // 2b. Guest Checkout & Bed Clearance Submit Handler (Simple PG Owner Cash Settlement)
  const handleGuestCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupantState) return;

    const stmt = calculateOccupantFinancialStatement(occupantState, propertySettings);
    const analysis = earlyDepartureAnalysis;

    let baseRoomRent = occupantState.rentAmount || 1000;
    if (analysis && analysis.isEarly) {
      if (earlyDeparturePolicy === "PRO_RATA_REFUND") {
        baseRoomRent = analysis.recalculatedProRataTariff;
      } else {
        baseRoomRent = analysis.totalOriginalRent;
      }
    }

    const addedPenalty = Math.max(0, Number(penaltyAmount) || 0);
    const finalRoomRent = baseRoomRent + addedPenalty;
    const depositHeld = occupantState.securityDeposit || 1000;
    const depositPenalty = guestRefundKeyDeposit ? 0 : depositHeld;
    const totalOwnerKeeps = finalRoomRent + depositPenalty;
    const netCashToReturn = stmt.totalPaid - totalOwnerKeeps;

    const newPaymentHistory = [...(occupantState.paymentHistory || [])];

    // If money was returned to the guest, log an official return receipt in ledger
    if (netCashToReturn > 0) {
      newPaymentHistory.push({
        id: `pay_early_refund_${Date.now()}`,
        month: `Checkout Settlement (${analysis?.isEarly ? `${analysis.actualDaysElapsed}d stay` : "Regular checkout"})`,
        date: guestCheckoutDate,
        amount: -netCashToReturn,
        mode: "Cash",
        receiptNo: `RET-${Date.now().toString().slice(-4)}`,
        status: "PAID",
      });
    }

    const updatedGuest: Occupant = {
      ...occupantState,
      lifecycleStatus: "Past",
      vacatingDate: guestCheckoutDate,
      rentAmount: finalRoomRent,
      paymentHistory: newPaymentHistory,
      paymentStatus: stmt.totalPaid >= totalOwnerKeeps ? "Paid" : "Due",
    };

    setOccupantState(updatedGuest);
    occupantStore.updateOccupant(updatedGuest, propertyId);

    // 🔒 Write DPDP Act 2023 Sanitized Immutable Record to Master Police Register
    const exitCategory = analysis?.isEarly ? "Emergency Early Departure" : "Standard Scheduled Departure";
    const exitReasonText = guestCheckoutNotes.trim() || (analysis?.isEarly ? `Early departure on emergency (${analysis.unusedDays} days unused). Key returned & settled.` : "Completed scheduled stay package. Key returned & settled.");

    const sanitizedComplianceEntry = sanitizeOccupantForCompliance({
      propertyId,
      occupantId: occupantState.id,
      name: occupantState.name,
      phone: occupantState.phone,
      address: occupantState.address || "Bengaluru, Karnataka",
      aadhaarNumber: occupantState.aadhaarNumber,
      stayType: "Guest",
      roomNumber: occupantState.roomNumber,
      bedCode: occupantState.bedCode,
      checkInDate: formatIsoToDisplayDate(occupantState.joiningDate) || occupantState.joiningDate,
      checkInTime: "12:00 PM",
      checkOutDate: formatIsoToDisplayDate(guestCheckoutDate) || guestCheckoutDate,
      checkOutTime: checkoutTime || "11:00 AM",
      totalDaysStayed: analysis?.actualDaysElapsed || 1,
      purposeOfVisit: occupantState.purposeOfVisit || occupantState.workplace || "Short-Term Stay",
      exitCategory,
      exitReason: exitReasonText,
      totalPaid: stmt.totalPaid,
      depositRefunded: guestRefundKeyDeposit ? depositHeld : 0,
      penaltyPaid: addedPenalty,
      kycVerified: Boolean(occupantState.kycVerified),
    });

    complianceLogStore.addLog(propertyId, sanitizedComplianceEntry);

    // Vacate bed slot in propertyStore singleton (Bed returns to Available 🟢)
    const currentStructure = propertyStore.getStructure(propertyId);
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
              vacatingDate: undefined,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure, propertyId);

    const summaryMsg =
      netCashToReturn > 0
        ? `🏁 Checkout Done for ${occupantState.name}! Hand over ₹${netCashToReturn.toLocaleString(
            "en-IN"
          )} to guest (You keep ₹${totalOwnerKeeps.toLocaleString("en-IN")} earned rent). Bed ${occupantState.roomNumber} (${
            occupantState.bedCode
          }) is now Available 🟢`
        : `🏁 Checkout Completed for ${occupantState.name}! Bed ${occupantState.roomNumber} (${occupantState.bedCode}) is now vacant & Available 🟢`;

    triggerToast(summaryMsg);
    setShowGuestStayManagementModal(false);
  };

  // 3. Open & Populate Edit Profile Modal Helper
  const handleOpenEditProfileModal = () => {
    if (!occupantState) return;
    setEditName(occupantState.name);
    setEditPhone(occupantState.phone);
    setEditEmail(occupantState.email);
    setEditRent(occupantState.rentAmount);
    setEditDeposit(occupantState.securityDeposit !== undefined ? occupantState.securityDeposit : (occupantState.rentAmount * 2));
    setEditOccupation(occupantState.occupation || "");
    setEditWorkplace(occupantState.workplace || "");
    setEditPurposeOfVisit(occupantState.purposeOfVisit || "");
    setShowEditProfileModal(true);
  };

  // Edit Profile Submit Handler (Updates Name, Phone, Email, Rent, Deposit, Occupation, Workplace, Purpose across state)
  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupantState) return;

    const updated: Occupant = {
      ...occupantState,
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      rentAmount: editRent,
      securityDeposit: editDeposit,
      occupation: editOccupation.trim() || undefined,
      workplace: editWorkplace.trim() || undefined,
      purposeOfVisit: editPurposeOfVisit.trim() || undefined,
    };

    setOccupantState(updated);
    occupantStore.updateOccupant(updated, propertyId);

    // DDS-13 Dynamic Cascading Matrix Compliance: Update bed occupant details in propertyStore!
    const currentStructure = propertyStore.getStructure(propertyId);
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
    propertyStore.updateStructure(updatedStructure, propertyId);

    triggerToast(`✓ Profile details updated successfully for ${editName}`);
    setShowEditProfileModal(false);
  };

  // 4. Wipe Out / Delete Guest Profile Handler (Opens Confirmation Modal for Past Guests)
  const handleDeleteGuest = () => {
    if (!occupantState) return;
    if (occupantState.lifecycleStatus !== "Past") {
      alert(`Active guest ${occupantState.name} is currently staying in Bed ${occupantState.roomNumber} (${occupantState.bedCode}). Please complete the Checkout process first before deleting.`);
      return;
    }
    setShowDeleteGuestModal(true);
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

          {!occupantState ? (
            <div className="bg-white rounded-3xl border border-[#d7c2b9] p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-orange-50 text-[#c2652a] flex items-center justify-center mx-auto text-2xl font-bold">
                🔍
              </div>
              <h3 className="font-serif font-bold text-xl text-gray-900">
                Resident Record Not Found
              </h3>
              <p className="text-xs text-gray-500">
                The resident record for ID &quot;{tenantId}&quot; could not be located in this property.
              </p>
              <Link
                href={`/p/${propertyId}/tenants`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#c2652a] hover:bg-[#a35220] text-white font-bold text-xs shadow-sm transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Tenants Directory
              </Link>
            </div>
          ) : occupantState.stayType === "Guest" ? (
            <GuestProfileView
              occupantState={occupantState}
              propertyId={propertyId}
              onEditProfile={handleOpenEditProfileModal}
              onCollectPayment={() => setShowCollectRentModal(true)}
              onTransferRoom={() => setShowTransferModal(true)}
              onDeleteGuest={handleDeleteGuest}
              onCheckOutGuest={() => {
                setGuestStayModalTab("EXTEND");
                setShowGuestStayManagementModal(true);
              }}
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
              <div
                onClick={() => setShowAvatarModal(true)}
                className="relative w-16 h-16 rounded-2xl border-2 border-gray-200 hover:border-[#c2652a] overflow-hidden shadow-xs cursor-pointer group shrink-0 bg-gray-100 flex items-center justify-center transition-all"
                title="Click to view or change profile photo"
              >
                {occupantState.avatar && occupantState.avatar.length > 0 && !occupantState.avatar.includes("dicebear") ? (
                  <img
                    src={occupantState.avatar}
                    alt={occupantState.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
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

                {/* 💼 Profession & Workplace Quick Badges (High-Priority Demographic Display) */}
                {(occupantState.occupation || occupantState.workplace) && (
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    {occupantState.occupation && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/70 shadow-2xs">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{occupantState.occupation}</span>
                      </span>
                    )}
                    {occupantState.workplace && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200/80 shadow-2xs">
                        <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>{occupantState.workplace}</span>
                      </span>
                    )}
                  </div>
                )}

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

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
              {/* 1. Edit Profile */}
              <button
                onClick={handleOpenEditProfileModal}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 rounded-xl text-xs font-semibold text-gray-700 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Edit className="w-4 h-4 text-[#c2652a]" /> Edit Profile
              </button>

              {/* 2. Collect Rent / Advance (Disabled for Past Tenants) */}
              <button
                disabled={occupantState.lifecycleStatus === "Past"}
                onClick={() => {
                  const currentStmt = calculateOccupantFinancialStatement(occupantState, propertySettings);
                  setPaymentAmount(currentStmt.netOutstandingBalance > 0 ? currentStmt.netOutstandingBalance : occupantState.rentAmount);
                  setShowCollectRentModal(true);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#c2652a] hover:bg-[#c2652a]/90 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <CreditCard className="w-4 h-4" /> {occupantState.lifecycleStatus === "Booked" ? "Collect Advance" : "Collect Rent"}
              </button>

              {/* 3. Transfer Room (Disabled for Past Tenants) */}
              <button
                disabled={occupantState.lifecycleStatus === "Past"}
                onClick={() => setShowTransferModal(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 rounded-xl text-xs font-semibold text-gray-700 shadow-xs active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#c2652a]" /> Transfer Room
              </button>

              {/* 4. Log Notice vs Manage Notice (Disabled for Booked & Past Tenants) */}
              {occupantState.lifecycleStatus === "Notice" ? (
                <button
                  onClick={() => setShowManageNoticeModal(true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-50 border border-purple-300 hover:bg-purple-100 text-purple-900 font-bold rounded-xl text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-purple-700" /> Manage Notice ⚙️
                </button>
              ) : (
                <button
                  disabled={occupantState.lifecycleStatus === "Past" || occupantState.lifecycleStatus === "Booked"}
                  title={occupantState.lifecycleStatus === "Booked" ? "Move-out notice cannot be logged for Booked tenants before move-in" : undefined}
                  onClick={() => setShowLogNoticeModal(true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-orange-200 hover:bg-orange-50 text-gray-700 font-semibold rounded-xl text-xs shadow-xs active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#c2652a]" /> Log Notice
                </button>
              )}

              {/* Row 2: Balanced Side-by-Side Clean Layout */}
              {occupantState.lifecycleStatus === "Booked" ? (
                <>
                  {/* 5. Reschedule / Cancel Check-in */}
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleModalTab("RESCHEDULE");
                      setShowRescheduleCancelModal(true);
                    }}
                    className="col-span-2 sm:col-span-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Clock className="w-4 h-4" /> 📅 Reschedule / Cancel Check-in
                  </button>

                  {/* 6. Formal Check-Out & Settlement (Disabled for Booked) */}
                  <button
                    type="button"
                    disabled
                    title="Resident has not checked in yet. To cancel before move-in, please use 'Reschedule / Cancel Check-in'."
                    className="col-span-2 sm:col-span-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 border border-gray-200 text-gray-400 rounded-xl text-xs font-bold shadow-none cursor-not-allowed opacity-75"
                  >
                    🔑 Formal Check-Out & Settlement
                  </button>
                </>
              ) : occupantState.lifecycleStatus !== "Past" ? (
                <button
                  type="button"
                  onClick={() => setShowCheckOutModal(true)}
                  className="col-span-2 sm:col-span-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  🔑 Formal Check-Out & Deposit Settlement
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      confirm(
                        `Are you sure you want to permanently delete past tenant ${occupantState.name}? This will wipe out all KYC, receipts, and stay history from Cloud Firestore.`
                      )
                    ) {
                      await occupantStore.deleteOccupant(occupantState.id, propertyId);
                      alert(`🗑️ Permanently erased ${occupantState.name} from Cloud Firestore.`);
                      window.location.href = `/p/${propertyId}/tenants`;
                    }
                  }}
                  className="col-span-2 sm:col-span-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-200" /> 🗑️ Delete Past Tenant Record
                </button>
              )}
            </div>
          </div>

          {/* 🟧 NOTICE PERIOD ACTIVE BANNER CALLOUT (Duplicate Manage Notice button removed) */}
          {occupantState.lifecycleStatus === "Notice" && (
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/60 rounded-2xl p-5 border border-orange-200 shadow-xs flex items-center justify-between gap-4 animate-in fade-in">
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
            </div>
          )}

          {/* 4 KPI Metrics Cards Section */}
          {(() => {
            const topStmt = calculateOccupantFinancialStatement(occupantState, propertySettings);
            return (
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
                    ₹{topStmt.totalRentPaid.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-green-600 font-bold mt-1.5">
                    {paymentHistory.length > 0 ? `${paymentHistory.length} PAYMENTS RECORDED 🟢` : "NO PAYMENTS YET ⚪"}
                  </p>
                </div>

                {/* Outstanding Balance (Connected to SSOT Statement Engine) */}
                <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs">
                  <div className="p-2 bg-blue-50 w-fit rounded-lg mb-2 text-blue-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                    Outstanding Balance
                  </p>
                  <p className="text-2xl font-bold font-serif text-gray-900">
                    ₹{topStmt.netOutstandingBalance.toLocaleString("en-IN")}
                  </p>
                  <p className={`text-[10px] font-bold mt-1.5 ${
                    topStmt.isFullyPaid ? "text-green-600" : topStmt.isPartialPaid ? "text-amber-600" : "text-red-600"
                  }`}>
                    {topStmt.statusBadgeText}
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
                ₹{(occupantState.securityDeposit !== undefined ? occupantState.securityDeposit : (occupantState.rentAmount * 2)).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-gray-500 font-bold mt-1.5 flex items-center gap-1">
                STATUS:{" "}
                <span className="text-purple-700 font-extrabold">
                  {occupantState.lifecycleStatus === "Past" || occupantState.depositStatus === "REFUNDED"
                    ? occupantState.arrearsBalance && occupantState.arrearsBalance > 0
                      ? "PARTIAL REFUND 🟡"
                      : "FULL REFUND 🟢"
                    : occupantState.depositStatus || "PAID 🟢"}
                </span>
              </p>
            </div>

            {/* Next Due Date */}
            {(() => {
              const now = new Date();
              const dueDay = occupantState.dueDay || 5;
              const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
              const nextMonthStr = `${String(dueDay).padStart(2, "0")} ${nextMonth.toLocaleString("default", { month: "short", year: "numeric" })}`;

              let displayDueDate = occupantState.dueDate;
              let dueSubtext = "NEXT RENT CYCLE";
              let subtextColor = "text-emerald-700";

              if (occupantState.lifecycleStatus === "Booked") {
                displayDueDate = "Due on Check-In";
                dueSubtext = `TARGET: ${occupantState.joiningDate}`;
                subtextColor = "text-[#c2652a]";
              } else if (occupantState.lifecycleStatus === "Past") {
                displayDueDate = "Vacated";
                dueSubtext = "CHECKED OUT ⚪";
                subtextColor = "text-gray-400";
              } else {
                // Active or Notice
                if (topStmt.remainingRentDue === 0) {
                  // Current month's rent is already paid
                  displayDueDate = nextMonthStr;
                  if (topStmt.priorArrears > 0) {
                    dueSubtext = `ARREARS DUE: ₹${topStmt.priorArrears.toLocaleString("en-IN")} 🔴`;
                    subtextColor = "text-red-600";
                  } else {
                    dueSubtext = "NEXT RENT CYCLE 🟢";
                    subtextColor = "text-emerald-700";
                  }
                } else {
                  // Current month rent is due/overdue
                  displayDueDate = occupantState.dueDate;
                  dueSubtext = `RENT DUE (₹${topStmt.remainingRentDue.toLocaleString("en-IN")}) 🔴`;
                  subtextColor = "text-red-600";
                }
              }

              return (
                <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs">
                  <div className="p-2 bg-orange-50 w-fit rounded-lg mb-2 text-[#c2652a]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                    Next Due Date
                  </p>
                  <p className="text-base font-bold font-serif text-gray-900">
                    {displayDueDate}
                  </p>
                  <p className={`text-[10px] font-bold mt-1.5 ${subtextColor}`}>
                    {dueSubtext}
                  </p>
                </div>
              );
            })()}
            </div>
          );
        })()}

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
                    <span className="font-bold text-gray-900">{displayPropertyName}</span>
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
                    <span className="text-gray-500 font-medium">Security Deposit</span>
                    <span className="font-mono font-bold text-gray-900">
                      ₹{(occupantState.securityDeposit !== undefined ? occupantState.securityDeposit : (occupantState.rentAmount * 2)).toLocaleString("en-IN")}
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
                  {occupantState.occupation && (
                    <div className="flex justify-between pt-1 border-t border-gray-100">
                      <span className="text-gray-500 font-medium">Profession / Role</span>
                      <span className="font-bold text-blue-900 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600" /> {occupantState.occupation}
                      </span>
                    </div>
                  )}
                  {occupantState.workplace && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Place of Work / College</span>
                      <span className="font-bold text-amber-950 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-700" /> {occupantState.workplace}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Past Tenant Deposit Settlement Audit Card (If Vacated) */}
              {occupantState.lifecycleStatus === "Past" && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-purple-200/60 pb-1.5 font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-700" /> Check-Out Deposit Settlement Audit
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      occupantState.arrearsBalance && occupantState.arrearsBalance > 0
                        ? "bg-amber-200 text-amber-950 border border-amber-300"
                        : "bg-emerald-200 text-emerald-950 border border-emerald-300"
                    }`}>
                      {occupantState.arrearsBalance && occupantState.arrearsBalance > 0
                        ? "PARTIAL REFUND 🟡"
                        : "FULL REFUND 🟢"}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-purple-900">
                    <div className="flex justify-between">
                      <span>Initial Deposit Intake:</span>
                      <span className="font-bold">₹{(occupantState.securityDeposit !== undefined ? occupantState.securityDeposit : (occupantState.rentAmount * 2)).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-bold border-t border-purple-200/60 pt-1">
                      <span>Net Amount Refunded:</span>
                      <span>₹{(occupantState.securityDeposit !== undefined ? occupantState.securityDeposit : (occupantState.rentAmount * 2)).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="text-[10px] opacity-80 pt-1 font-sans">
                      Checked Out: {occupantState.vacatingDate || "09 Aug 2026"} • Status: Settled & Closed
                    </div>
                  </div>
                </div>
              )}

              {/* 🪪 Government ID & KYC Verification Card for Tenants */}
              {(() => {
                const hasAadhaar = Boolean(
                  occupantState.kycDocs?.aadhaarFrontUrl ||
                  occupantState.kycDocs?.aadhaarPdfUrl ||
                  (occupantState.aadhaarNumber &&
                    occupantState.aadhaarNumber.trim().length === 12 &&
                    !occupantState.aadhaarNumber.startsWith("XXXX") &&
                    occupantState.aadhaarNumber !== "Skipped" &&
                    occupantState.aadhaarNumber !== "XXXX-XXXX-8811")
                );
                const isKycVerified = occupantState.kycVerified === true || hasAadhaar;

                return (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
                    <div className="pb-3 border-b border-gray-100 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-900 text-sm block">
                          Government ID & KYC Verification
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          🔒 Official Identity Verification
                        </span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        isKycVerified
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {isKycVerified ? "VERIFIED 🟢" : "PENDING 🟡"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-gray-900 font-bold flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Aadhaar / Govt ID Proof
                            </span>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {hasAadhaar ? (occupantState.aadhaarNumber || "Document Attached") : "Pending Upload / Not Uploaded"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${hasAadhaar ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                              {hasAadhaar ? "COMPLETED ✅" : "PENDING 🔴"}
                            </span>
                            {hasAadhaar && (
                              <div className="flex gap-1">
                                {occupantState.kycDocs?.aadhaarFrontUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewKycModal({
                                        open: true,
                                        title: "Aadhaar Card — Front Photo",
                                        docType: "front",
                                      })
                                    }
                                    className="px-2 py-1 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3 text-blue-600" /> Front ID
                                  </button>
                                )}
                                {occupantState.kycDocs?.aadhaarBackUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewKycModal({
                                        open: true,
                                        title: "Aadhaar Card — Back Photo",
                                        docType: "back",
                                      })
                                    }
                                    className="px-2 py-1 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3 text-blue-600" /> Back ID
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isKycVerified ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-center font-bold text-xs">
                          ✓ Government ID Verified 🟢
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowUploadKycModal(true)}
                          className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
                        >
                          <ShieldCheck className="w-4 h-4" /> + Upload & Verify KYC Document
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

      {occupantState && (
        <>
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
                    value={paymentAmount ? paymentAmount : ""}
                    placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPaymentAmount(val === "" ? 0 : parseInt(val, 10));
                    }}
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
                  const stmt = calculateOccupantFinancialStatement(occupantState, propertySettings);
                  const isTenant = occupantState.stayType === "Tenant";
                  const proRataInfo = calculateProRataRent(occupantState.rentAmount, occupantState.joiningDate);
                  const targetAutoFill = stmt.netOutstandingBalance;
                  const isSecondInstallment = stmt.totalPaid > 0;

                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 border border-amber-200/80 space-y-2.5 my-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          💰 {isTenant ? "RECEIVABLE ACCOUNT BREAKDOWN" : "GUEST STAY TARIFF BREAKDOWN"}
                        </span>
                        {isTenant && !proRataInfo.isFullMonth && (
                          <span className="text-[10px] bg-orange-200/80 text-orange-950 px-2 py-0.5 rounded-full font-bold">
                            PRO-RATA ({proRataInfo.remainingDays}/{proRataInfo.totalDaysInMonth} DAYS)
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs text-gray-700 font-medium">
                        {isTenant ? (
                          <>
                            {/* Current Month Rent */}
                            <div className="flex justify-between items-center">
                              <span>▫️ Rent ({proRataInfo.isFullMonth ? "Full Month" : `${proRataInfo.remainingDays}d Pro-Rata`}):</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-gray-900">₹{stmt.proRataRent.toLocaleString("en-IN")}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${stmt.remainingRentDue === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                                  {stmt.remainingRentDue === 0 ? "PAID 🟢" : `₹${stmt.remainingRentDue.toLocaleString("en-IN")} DUE`}
                                </span>
                              </div>
                            </div>

                            {/* Security Deposit */}
                            <div className="flex justify-between items-center">
                              <span>▫️ Security Deposit:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-gray-900">₹{stmt.securityDepositRequired.toLocaleString("en-IN")}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${stmt.isDepositCleared ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                  {stmt.depositStatusLabel}
                                </span>
                              </div>
                            </div>

                            {/* Prior Arrears */}
                            {stmt.priorArrears > 0 && (
                              <div className="flex justify-between items-center text-red-700">
                                <span>▫️ Prior Unpaid Arrears:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-red-600">₹{stmt.priorArrears.toLocaleString("en-IN")}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                                    DUE 🔴
                                  </span>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Simple Plain Summary for Short-Term Guest Installments */}
                            <div className="flex justify-between items-center">
                              <span>▫️ Total Stay Package (Tariff + Deposit):</span>
                              <span className="font-mono font-bold text-gray-900">
                                ₹{(stmt.proRataRent + stmt.securityDepositRequired).toLocaleString("en-IN")}
                              </span>
                            </div>

                            {stmt.totalPaid > 0 && (
                              <div className="flex justify-between items-center text-emerald-800">
                                <span>▫️ Previously Paid / Collected:</span>
                                <span className="font-mono font-bold text-emerald-700">
                                  -₹{stmt.totalPaid.toLocaleString("en-IN")} 🟢
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between font-extrabold text-gray-900 text-sm">
                          <span className="text-amber-950">🟧 REMAINING BALANCE DUE NOW:</span>
                          <span className="font-mono text-[#c2652a] text-base">₹{stmt.netOutstandingBalance.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPaymentAmount(targetAutoFill > 0 ? targetAutoFill : occupantState.rentAmount)}
                        className="w-full py-2 px-3 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer mt-1"
                      >
                        ⚡ Auto-Fill Balance Due (₹{(targetAutoFill > 0 ? targetAutoFill : occupantState.rentAmount).toLocaleString("en-IN")})
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

        {/* 🏨 UNIFIED GUEST STAY MANAGEMENT MODAL (EXTEND DATE / CHECKOUT) */}
        {showGuestStayManagementModal && occupantState && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 text-xs max-h-[90vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-800">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                      Guest Stay Management
                    </h3>
                    <p className="text-[11px] text-gray-500 font-semibold">
                      {occupantState.name} • Room {occupantState.roomNumber} ({occupantState.bedCode})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuestStayManagementModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Side-by-Side Dual Tabs */}
              <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setGuestStayModalTab("EXTEND")}
                  className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    guestStayModalTab === "EXTEND"
                      ? "bg-white text-purple-900 shadow-sm border border-purple-100"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Clock className="w-4 h-4 text-purple-700" />
                  <span>⏳ Extend Stay Date</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                    const currentHours = String(now.getHours()).padStart(2, "0");
                    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
                    setGuestCheckoutDate(todayIso);
                    setCheckoutTime(`${currentHours}:${currentMinutes}`);
                    setGuestStayModalTab("CHECKOUT");
                  }}
                  className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    guestStayModalTab === "CHECKOUT"
                      ? "bg-white text-red-700 shadow-sm border border-red-100"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>🏁 Check-Out & Settle</span>
                </button>
              </div>

              {/* TAB 1: EXTEND STAY DATE */}
              {guestStayModalTab === "EXTEND" && (
                <form onSubmit={handleGuestStayExtensionSubmit} className="space-y-4 pt-1">
                  {/* Current Stay Context */}
                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-950 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-purple-700 block">Current Check-Out</span>
                      <p className="font-bold text-gray-900">
                        {formatIsoToDisplayDate(occupantState.vacatingDate || occupantState.dueDate || occupantState.joiningDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold uppercase text-purple-700 block">Stay Tariff Rate</span>
                      <p className="font-bold text-gray-900 font-mono">
                        ₹{customDailyRate > 0 ? customDailyRate.toLocaleString("en-IN") : "500"}/day
                      </p>
                    </div>
                  </div>

                  {/* New Extended Checkout Date Input & Quick Presets */}
                  <div className="space-y-2">
                    <label className="block font-bold text-gray-700">
                      New Extended Check-Out Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={occupantState.vacatingDate || occupantState.dueDate || occupantState.joiningDate}
                      value={extendedStayDate}
                      onChange={(e) => setExtendedStayDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-2 focus:ring-purple-500"
                    />

                    {/* Quick 1-Click Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-gray-400 mr-1">Quick Presets:</span>
                      {[
                        { label: "+1 Day", days: 1 },
                        { label: "+3 Days", days: 3 },
                        { label: "+7 Days (+1 Wk)", days: 7 },
                        { label: "+15 Days", days: 15 },
                        { label: "+30 Days (+1 Mo)", days: 30 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyExtensionPresetDays(preset.days)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-100 hover:text-purple-800 text-[11px] font-bold text-gray-700 transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 🔍 CONFLICT DETECTION ALERT OR SUCCESS CONFIRMATION */}
                  {conflictingOccupantForGuest ? (
                    <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-3 animate-in fade-in">
                      <div className="flex items-start gap-2.5 text-rose-950">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-xs text-rose-950">
                            ⚠️ Bed Allocation Conflict Detected!
                          </p>
                          <p className="text-[11px] text-rose-800 mt-1 leading-relaxed">
                            Resident <strong>{conflictingOccupantForGuest.name}</strong> ({conflictingOccupantForGuest.stayType || "Tenant"}) is already scheduled to occupy <strong>Bed {occupantState.bedCode}</strong> starting on <strong>{formatIsoToDisplayDate(conflictingOccupantForGuest.joiningDate)}</strong>.
                          </p>
                          <p className="text-[11px] text-rose-700 mt-1">
                            You cannot extend this guest's stay in their current bed past {formatIsoToDisplayDate(conflictingOccupantForGuest.joiningDate)}.
                          </p>
                        </div>
                      </div>

                      {/* 1-Click Transfer Room Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowGuestStayManagementModal(false);
                          setShowTransferModal(true);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-purple-200" />
                        <span>🔀 Transfer Guest to Another Available Room / Bed</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Bed Available Success Banner */}
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-900 text-xs font-bold">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Bed {occupantState.roomNumber} ({occupantState.bedCode}) is completely free until {formatIsoToDisplayDate(extendedStayDate)}.</span>
                      </div>

                      {/* Financial Extension Breakdown */}
                      {(() => {
                        const currentCheckout = occupantState.vacatingDate || occupantState.dueDate || occupantState.joiningDate;
                        const diffMs = new Date(extendedStayDate).getTime() - new Date(currentCheckout).getTime();
                        const extraDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
                        const rateToUse = customDailyRate > 0 ? customDailyRate : 500;
                        const addedTariff = extraDays * rateToUse;

                        return (
                          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center font-bold text-xs">
                              <span className="text-gray-600">Extension Duration:</span>
                              <span className="text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full text-[11px] font-extrabold">
                                +{extraDays} Additional Days
                              </span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-xs">
                              <span className="text-gray-600">Additional Tariff Amount:</span>
                              <span className="text-gray-900 font-mono text-sm font-extrabold">
                                ₹{addedTariff.toLocaleString("en-IN")}
                              </span>
                            </div>

                            {/* Payment Options */}
                            <div className="pt-2 border-t border-gray-200 space-y-2">
                              <span className="text-[10px] font-bold uppercase text-gray-500 block">Payment Collection</span>
                              
                              <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-gray-800">
                                <input
                                  type="radio"
                                  name="extendPaymentOption"
                                  checked={extendPaymentOption === "COLLECT_NOW"}
                                  onChange={() => setExtendPaymentOption("COLLECT_NOW")}
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                                <span>Collect Payment Now (Generate Official Receipt)</span>
                              </label>

                              {extendPaymentOption === "COLLECT_NOW" && (
                                <div className="ml-6 flex items-center gap-2 pt-1">
                                  <span className="text-[11px] text-gray-500 font-bold">Payment Mode:</span>
                                  {["UPI", "Cash", "Bank Transfer"].map((mode) => (
                                    <button
                                      key={mode}
                                      type="button"
                                      onClick={() => setExtendPaymentMode(mode)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                        extendPaymentMode === mode
                                          ? "bg-purple-100 text-purple-900 border-purple-300 font-extrabold"
                                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                      }`}
                                    >
                                      {mode}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-gray-800">
                                <input
                                  type="radio"
                                  name="extendPaymentOption"
                                  checked={extendPaymentOption === "ADD_TO_DUE"}
                                  onChange={() => setExtendPaymentOption("ADD_TO_DUE")}
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                                <span>Add to Outstanding Dues (Collect at Checkout)</span>
                              </label>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowGuestStayManagementModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={Boolean(conflictingOccupantForGuest)}
                      className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Confirm & Extend Stay ⏳</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: GUEST CHECKOUT (SIMPLE PLAIN-ENGLISH PG OWNER VIEW) */}
              {guestStayModalTab === "CHECKOUT" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setShowGuestCheckoutConfirmModal(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                      e.preventDefault();
                    }
                  }}
                  className="space-y-4 pt-1"
                >
                  
                  {/* Actual Checkout Date & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Actual Checkout Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={guestCheckoutDate}
                        onChange={(e) => setGuestCheckoutDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Scheduled: {formatIsoToDisplayDate(occupantState.vacatingDate || occupantState.dueDate || occupantState.joiningDate)}
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                        <span>Checkout Time (Standard: 11:00 AM)</span>
                        <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold">1 Hr Grace</span>
                      </label>
                      <input
                        type="time"
                        value={checkoutTime}
                        onChange={(e) => setCheckoutTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">
                        {(() => {
                          const hour = parseInt(checkoutTime.split(":")[0], 10);
                          if (isNaN(hour)) return "Standard hours: 11:00 AM cutoff";
                          if (hour >= 12 && hour < 16) {
                            return "⏰ Late Checkout (12:00 PM - 04:00 PM) • Half-day fee recommended";
                          } else if (hour >= 16) {
                            return "⚠️ Extreme Late Checkout (After 04:00 PM) • Full day stay applies";
                          }
                          return "✅ Standard Checkout (Before 12:00 PM cutoff)";
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* ⚡ EARLY CHECKOUT SELECTOR IN SIMPLE EVERYDAY LANGUAGE */}
                  {earlyDepartureAnalysis && earlyDepartureAnalysis.isEarly && (
                    <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-3 animate-in fade-in text-xs">
                      <div className="flex items-start gap-2.5">
                        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-950 text-xs">
                            ⚡ Early Checkout ({earlyDepartureAnalysis.unusedDays} Days Early)
                          </p>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Guest used <strong>{earlyDepartureAnalysis.actualDaysElapsed} of {earlyDepartureAnalysis.totalOriginalDays} booked days</strong>.
                          </p>
                        </div>
                      </div>

                      {/* Plain Language Settlement Options */}
                      <div className="pt-2 border-t border-amber-200/80 space-y-2.5 font-semibold text-gray-800">
                        <span className="text-[10px] uppercase font-extrabold text-amber-900 block">How do you want to bill this stay?</span>

                        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                          <input
                            type="radio"
                            name="earlyDeparturePolicy"
                            checked={earlyDeparturePolicy === "PRO_RATA_REFUND"}
                            onChange={() => setEarlyDeparturePolicy("PRO_RATA_REFUND")}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>
                            <strong>Charge only for {earlyDepartureAnalysis.actualDaysElapsed} day(s) stayed (₹{earlyDepartureAnalysis.recalculatedProRataTariff.toLocaleString("en-IN")})</strong> — Cancel remaining {earlyDepartureAnalysis.unusedDays} days 🟢
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                          <input
                            type="radio"
                            name="earlyDeparturePolicy"
                            checked={earlyDeparturePolicy === "RETAIN_PACKAGE"}
                            onChange={() => setEarlyDeparturePolicy("RETAIN_PACKAGE")}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>
                            <strong>Charge full {earlyDepartureAnalysis.totalOriginalDays}-day booking (₹{earlyDepartureAnalysis.totalOriginalRent.toLocaleString("en-IN")})</strong> — No cancellation discount ⚪
                          </span>
                        </label>

                        {/* Add Penalty Amount Input Box with Late Fee Quick Fill */}
                        <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1.5 mt-1">
                          <label className="block text-[11px] font-bold text-gray-800">
                            Add Penalty Amount (Optional):
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-amber-500">
                              <span className="text-gray-400 font-mono font-bold">₹</span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={penaltyAmount === 0 ? "" : penaltyAmount}
                                onChange={(e) => setPenaltyAmount(Math.max(0, Number(e.target.value) || 0))}
                                className="w-28 font-bold text-gray-900 border-0 p-0 focus:ring-0 text-xs"
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">
                              (Added to final bill. If left empty, penalty is ₹0).
                            </span>
                          </div>

                          {/* Quick Late Fee Buttons */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-gray-500 font-bold">Quick Late Fee:</span>
                            <button
                              type="button"
                              onClick={() => setPenaltyAmount(250)}
                              className="text-[10px] px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold cursor-pointer"
                            >
                              +₹250 (2-Hr Late)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPenaltyAmount(500)}
                              className="text-[10px] px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold cursor-pointer"
                            >
                              +₹500 (Half-Day)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPenaltyAmount(0)}
                              className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold cursor-pointer"
                            >
                              Clear (₹0)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Deposit & Key Handover Box */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950">🔑 Room Key & Deposit Status</span>
                      <span className="text-[10px] font-extrabold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
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
                      <span>Key returned & room inspected without damages (Return deposit in final cash math)</span>
                    </label>
                  </div>

                  {/* 💰 CRYSTAL-CLEAR CASH SETTLEMENT SUMMARY BOX (NO CONFUSION, NO DOUBLE COUNTING!) */}
                  {(() => {
                    const stmt = calculateOccupantFinancialStatement(occupantState, propertySettings);
                    const analysis = earlyDepartureAnalysis;

                    let baseRoomRent = stmt.proRataRent;
                    if (analysis && analysis.isEarly) {
                      if (earlyDeparturePolicy === "PRO_RATA_REFUND") {
                        baseRoomRent = analysis.recalculatedProRataTariff;
                      } else {
                        baseRoomRent = analysis.totalOriginalRent;
                      }
                    }

                    const addedPenalty = Math.max(0, Number(penaltyAmount) || 0);
                    const roomRentToCharge = baseRoomRent + addedPenalty;
                    const depositHeld = occupantState.securityDeposit || 1000;
                    const depositDeduction = guestRefundKeyDeposit ? 0 : depositHeld;
                    const totalOwnerKeeps = roomRentToCharge + depositDeduction;
                    const netCashDifference = stmt.totalPaid - totalOwnerKeeps;

                    return (
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 text-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200 font-bold">
                          <span className="text-gray-700">💰 Final Cash Settlement:</span>
                          <span className="text-gray-500 text-[11px]">Exact Math</span>
                        </div>

                        {/* Breakdown lines */}
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Money Guest Paid at Check-in:</span>
                            <span className="font-bold text-gray-900 font-mono">₹{stmt.totalPaid.toLocaleString("en-IN")}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                              Room Rent for Stay ({analysis?.isEarly ? `${analysis.actualDaysElapsed} Day(s)` : "Stay Period"}):
                            </span>
                            <span className="font-bold text-gray-900 font-mono">-₹{baseRoomRent.toLocaleString("en-IN")} (You Keep 🟢)</span>
                          </div>

                          {addedPenalty > 0 && (
                            <div className="flex justify-between items-center text-amber-900 font-bold">
                              <span>Added Penalty / Fee:</span>
                              <span className="font-mono">-₹{addedPenalty.toLocaleString("en-IN")} (You Keep)</span>
                            </div>
                          )}

                          {!guestRefundKeyDeposit && (
                            <div className="flex justify-between items-center text-rose-700 font-bold">
                              <span>Deposit Held (Damage / Lost Key Penalty):</span>
                              <span className="font-mono">-₹{depositHeld.toLocaleString("en-IN")} (You Keep)</span>
                            </div>
                          )}
                        </div>

                        {/* Highlighted Net Action Box with Exact Composition Breakdown */}
                        {netCashDifference > 0 ? (
                          (() => {
                            const depositRefundAmount = guestRefundKeyDeposit ? depositHeld : 0;
                            const unusedRentRefundAmount = Math.max(0, netCashDifference - depositRefundAmount);

                            return (
                              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 text-emerald-950 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-extrabold text-xs">👉 CASH TO RETURN TO GUEST:</span>
                                  <span className="font-mono text-base font-extrabold text-emerald-800">
                                    ₹{netCashDifference.toLocaleString("en-IN")} 💵
                                  </span>
                                </div>

                                {/* Exact Cash Breakup */}
                                <div className="pt-2 border-t border-emerald-200/80 space-y-1 text-[11px] text-emerald-900 font-semibold">
                                  <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider block">
                                    Cash Return Breakup:
                                  </span>
                                  {depositRefundAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span>🛡️ Security Deposit Refund:</span>
                                      <span className="font-mono font-bold">₹{depositRefundAmount.toLocaleString("en-IN")}</span>
                                    </div>
                                  )}
                                  {unusedRentRefundAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span>🏨 Unused Stay Rent Refund ({analysis?.unusedDays || 0} days):</span>
                                      <span className="font-mono font-bold">+₹{unusedRentRefundAmount.toLocaleString("en-IN")}</span>
                                    </div>
                                  )}
                                  {depositRefundAmount > 0 && unusedRentRefundAmount === 0 && (
                                    <div className="flex justify-between items-center text-[10px] text-emerald-700 font-medium">
                                      <span>(Room rent of ₹{baseRoomRent.toLocaleString("en-IN")}{addedPenalty > 0 ? ` + ₹${addedPenalty.toLocaleString("en-IN")} penalty` : ""} was consumed for stay)</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        ) : netCashDifference < 0 ? (
                          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-300 text-rose-950 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-xs">👉 CASH TO COLLECT FROM GUEST:</span>
                              <span className="font-mono text-base font-extrabold text-rose-800">
                                ₹{Math.abs(netCashDifference).toLocaleString("en-IN")} 🔴
                              </span>
                            </div>
                            <div className="pt-2 border-t border-rose-200/80 space-y-1 text-[11px] text-rose-900 font-semibold">
                              <span className="text-[10px] font-extrabold uppercase text-rose-800 tracking-wider block">
                                Pending Amount Breakup:
                              </span>
                              <div className="flex justify-between items-center">
                                <span>🏨 Room Rent for Stay:</span>
                                <span className="font-mono font-bold">₹{baseRoomRent.toLocaleString("en-IN")}</span>
                              </div>
                              {addedPenalty > 0 && (
                                <div className="flex justify-between items-center">
                                  <span>⚠️ Added Penalty:</span>
                                  <span className="font-mono font-bold">+₹{addedPenalty.toLocaleString("en-IN")}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-rose-700">
                                <span>💳 Less Money Paid at Check-in:</span>
                                <span className="font-mono font-bold">-₹{stmt.totalPaid.toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 text-emerald-950 flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-xs block">👉 ALL BALANCED — ₹0 TO RETURN OR COLLECT</span>
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                Total paid (₹{stmt.totalPaid.toLocaleString("en-IN")}) equals stay charges. No pending cash.
                              </span>
                            </div>
                            <span className="font-mono text-sm font-extrabold text-emerald-800 shrink-0">₹0 🟢</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Checkout Inspection Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={guestCheckoutNotes}
                      onChange={(e) => setGuestCheckoutNotes(e.target.value)}
                      placeholder="e.g. Early checkout due to emergency, room inspected, key returned, no damages..."
                      className="w-full p-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-red-500"
                    ></textarea>
                  </div>

                  <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-[10px] text-emerald-900 font-semibold space-y-0.5">
                    <span className="font-extrabold block">⚡ Instant Bed Release:</span>
                    <span>
                      Submitting will immediately mark Bed {occupantState.roomNumber} ({occupantState.bedCode}) as <strong>Available 🟢</strong> across the Property Map.
                    </span>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowGuestStayManagementModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Confirm Checkout & Vacate Bed 🏁</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}

        {/* 🏁 GUEST CHECKOUT FINAL CONFIRMATION POPUP MODAL */}
        {showGuestCheckoutConfirmModal && occupantState && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-red-100 text-red-700">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Confirm Guest Checkout?
                    </h3>
                    <p className="text-[11px] text-gray-500 font-semibold">
                      {occupantState.name} • Room {occupantState.roomNumber} ({occupantState.bedCode})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuestCheckoutConfirmModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary details */}
              {(() => {
                const stmt = calculateOccupantFinancialStatement(occupantState, propertySettings);
                const analysis = earlyDepartureAnalysis;

                let baseRoomRent = stmt.proRataRent;
                if (analysis && analysis.isEarly) {
                  if (earlyDeparturePolicy === "PRO_RATA_REFUND") {
                    baseRoomRent = analysis.recalculatedProRataTariff;
                  } else {
                    baseRoomRent = analysis.totalOriginalRent;
                  }
                }

                const addedPenalty = Math.max(0, Number(penaltyAmount) || 0);
                const roomRentToCharge = baseRoomRent + addedPenalty;
                const depositHeld = occupantState.securityDeposit || 1000;
                const depositPenalty = guestRefundKeyDeposit ? 0 : depositHeld;
                const totalOwnerKeeps = roomRentToCharge + depositPenalty;
                const netCashDifference = stmt.totalPaid - totalOwnerKeeps;

                return (
                  <div className="space-y-3">
                    <p className="text-gray-700 text-xs">
                      Are you sure you want to finalize checkout for <strong>{occupantState.name}</strong> on <strong>{formatIsoToDisplayDate(guestCheckoutDate)}</strong>?
                    </p>

                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Final Stay Rent & Fees:</span>
                        <span className="font-bold font-mono text-gray-900">₹{roomRentToCharge.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Money Paid at Check-in:</span>
                        <span className="font-bold font-mono text-gray-900">₹{stmt.totalPaid.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-center font-bold">
                        <span className="text-gray-800">Final Cash Action:</span>
                        <span className={`font-mono ${netCashDifference > 0 ? "text-emerald-700 font-extrabold" : netCashDifference < 0 ? "text-rose-700 font-extrabold" : "text-gray-800"}`}>
                          {netCashDifference > 0
                            ? `Return ₹${netCashDifference.toLocaleString("en-IN")} 💵`
                            : netCashDifference < 0
                            ? `Collect ₹${Math.abs(netCashDifference).toLocaleString("en-IN")} 🔴`
                            : "All Balanced (₹0) 🟢"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
                      <span className="text-base shrink-0">🟢</span>
                      <span>
                        Bed <strong>{occupantState.roomNumber} ({occupantState.bedCode})</strong> will be immediately marked <strong>Available</strong> for new bookings.
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGuestCheckoutConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Go Back / Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    setShowGuestCheckoutConfirmModal(false);
                    handleGuestCheckoutSubmit(e);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Yes, Check Out 🏁</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🗑️ PERMANENT DELETE PAST GUEST CONFIRMATION MODAL */}
        {showDeleteGuestModal && occupantState && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Delete Guest Record
                    </h3>
                    <p className="text-[11px] text-gray-500 font-semibold">
                      {occupantState.name} • Room {occupantState.roomNumber} ({occupantState.bedCode})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteGuestModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-gray-700 text-xs leading-relaxed">
                  Are you sure you want to permanently delete past guest <strong>{occupantState.name}</strong>?
                </p>
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1 text-[11px]">
                  <span className="font-bold flex items-center gap-1 text-rose-700">
                    ⚠️ Permanent Deletion:
                  </span>
                  <p className="text-rose-800 leading-snug">
                    This will permanently wipe out all stay history, payment receipts, and guest records from Cloud Firestore.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteGuestModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowDeleteGuestModal(false);
                    await occupantStore.deleteOccupant(occupantState.id, propertyId);
                    triggerToast(`🗑️ Permanently erased guest record for ${occupantState.name}`);
                    window.location.href = `/p/${propertyId}/tenants`;
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-200" />
                  <span>Delete Guest 🗑️</span>
                </button>
              </div>
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

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Security Deposit (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editDeposit}
                    onChange={(e) => setEditDeposit(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                {occupantState?.stayType === "Guest" ? (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Purpose of Visit (e.g. Exam, Job Interview, Hospital Visit)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPSC Exam / Infosys Training"
                      value={editPurposeOfVisit}
                      onChange={(e) => setEditPurposeOfVisit(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Profession / Role
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineer, UPSC Aspirant"
                        value={editOccupation}
                        onChange={(e) => setEditOccupation(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Place of Work / College / Office
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Microsoft Hyderabad / IIT Hyderabad"
                        value={editWorkplace}
                        onChange={(e) => setEditWorkplace(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                    </div>
                  </>
                )}

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

        {/* 📷 INTERACTIVE AVATAR / PROFILE PHOTO MODAL */}
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in zoom-in-95 text-center">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#c2652a]" /> Profile Photo
                </span>
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Large Photo Display */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-40 h-40 rounded-3xl border-2 border-gray-200 bg-gray-50 overflow-hidden shadow-inner flex items-center justify-center">
                  {occupantState.avatar && occupantState.avatar.length > 0 && !occupantState.avatar.includes("dicebear") ? (
                    <img
                      src={occupantState.avatar}
                      alt={occupantState.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <User className="w-16 h-16 text-gray-300 mx-auto mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold block">No Photo Uploaded</span>
                    </div>
                  )}
                </div>
                <h3 className="font-serif font-bold text-gray-900 text-base mt-3">{occupantState.name}</h3>
                <p className="text-[11px] text-gray-500 font-mono">{occupantState.phone}</p>
              </div>

              {/* Upload / Change & Remove Controls */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <UnifiedPhotoUploadSlot
                  label={occupantState.avatar ? "Change Profile Photo" : "Upload Profile Photo"}
                  aspectRatio="headshot"
                  value={occupantState.avatar}
                  onChange={(base64) => {
                    const updated: Occupant = {
                      ...occupantState,
                      avatar: base64,
                      kycDocs: {
                        ...(occupantState.kycDocs || { idMode: "IMAGES" }),
                        photoUrl: base64 || undefined,
                      },
                    };
                    setOccupantState(updated);
                    occupantStore.updateOccupant(updated, propertyId);
                    saveOccupantToFirestore(propertyId, updated);
                    triggerToast("✓ Profile photo updated!");
                    setShowAvatarModal(false);
                  }}
                  onRemove={() => {
                    const updated: Occupant = {
                      ...occupantState,
                      avatar: "",
                      kycDocs: {
                        ...(occupantState.kycDocs || { idMode: "IMAGES" }),
                        photoUrl: undefined,
                      },
                    };
                    setOccupantState(updated);
                    occupantStore.updateOccupant(updated, propertyId);
                    saveOccupantToFirestore(propertyId, updated);
                    triggerToast("Profile photo removed.");
                    setShowAvatarModal(false);
                  }}
                />
              </div>
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
                  occupantState.kycDocs?.photoUrl || (!occupantState.avatar?.includes("dicebear") && !occupantState.avatar?.includes("api.dicebear.com")) ? (
                    <img
                      src={occupantState.kycDocs?.photoUrl || occupantState.avatar}
                      alt={occupantState.name}
                      className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain border-2 border-white/20 shadow-lg pointer-events-none select-none"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 text-gray-300">
                      <Camera className="w-12 h-12 text-gray-500 mx-auto" />
                      <p className="font-bold text-sm text-white">No Profile Photo Uploaded</p>
                      <p className="text-xs text-gray-400">This resident has not uploaded a photo yet.</p>
                    </div>
                  )
                ) : viewKycModal.docType === "front" ? (
                  occupantState.kycDocs?.aadhaarFrontUrl ? (
                    <img
                      src={occupantState.kycDocs.aadhaarFrontUrl}
                      alt="Aadhaar Front"
                      className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain border-2 border-white/20 shadow-lg pointer-events-none select-none"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 text-gray-300">
                      <ShieldCheck className="w-12 h-12 text-gray-500 mx-auto" />
                      <p className="font-bold text-sm text-white">No Front ID Uploaded</p>
                      <p className="text-xs text-gray-400">Front ID image is pending upload.</p>
                    </div>
                  )
                ) : viewKycModal.docType === "back" ? (
                  occupantState.kycDocs?.aadhaarBackUrl ? (
                    <img
                      src={occupantState.kycDocs.aadhaarBackUrl}
                      alt="Aadhaar Back"
                      className="max-h-[300px] w-auto max-w-full rounded-2xl object-contain border-2 border-white/20 shadow-lg pointer-events-none select-none"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 text-gray-300">
                      <ShieldCheck className="w-12 h-12 text-gray-500 mx-auto" />
                      <p className="font-bold text-sm text-white">No Back ID Uploaded</p>
                      <p className="text-xs text-gray-400">Back ID image is pending upload.</p>
                    </div>
                  )
                ) : (
                  /* PDF Document View */
                  <div className="w-full bg-white/95 rounded-xl p-6 text-center space-y-3 pointer-events-none select-none text-gray-900 font-mono text-xs">
                    <FileText className="w-14 h-14 text-blue-600 mx-auto" />
                    <div className="font-bold text-sm text-gray-900">
                      {occupantState.name} — AADHAAR GOVT ID (PDF)
                    </div>
                    <div className="text-[11px] text-gray-500 font-sans">
                      DOCUMENT NUMBER: {occupantState.aadhaarNumber || "PENDING"} • CAPPED TO 1MB
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
                    PROPERTY: {displayPropertyName.toUpperCase()} • TENANT: {occupantState.name}
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



        {/* 📅 RESCHEDULE / CANCEL CHECK-IN & NO-SHOW SETTLEMENT MODAL */}
        {showRescheduleCancelModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${rescheduleModalTab === "RESCHEDULE" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
                    {rescheduleModalTab === "RESCHEDULE" ? <Clock className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      {rescheduleModalTab === "RESCHEDULE" ? "Reschedule Check-In Date" : "Cancel Booking & Settle Advance"}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      TENANT: {occupantState.name} • Room {occupantState.roomNumber} ({occupantState.bedCode})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRescheduleCancelModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-gray-100 p-1 rounded-2xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRescheduleModalTab("RESCHEDULE")}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    rescheduleModalTab === "RESCHEDULE"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> 📅 Reschedule Date
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleModalTab("CANCEL")}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    rescheduleModalTab === "CANCEL"
                      ? "bg-white text-rose-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" /> ❌ Cancel Booking / No-Show
                </button>
              </div>

              {rescheduleModalTab === "RESCHEDULE" ? (
                /* TAB 1: RESCHEDULE DATE FORM */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const dParts = postponedCheckInDate.split("-");
                    const formattedDate = `${dParts[2]} ${
                      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
                        parseInt(dParts[1], 10) - 1
                      ] || "Aug"
                    } ${dParts[0]}`;

                    const updated: Occupant = {
                      ...occupantState,
                      joiningDate: formattedDate,
                      dueDate: formattedDate,
                    };

                    setOccupantState(updated);
                    occupantStore.updateOccupant(updated, propertyId);
                    saveOccupantToFirestore(propertyId, updated);

                    triggerToast(`✓ Updated check-in move-in date for ${occupantState.name} to ${formattedDate}`);
                    setShowRescheduleCancelModal(false);
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900 focus:ring-1 focus:ring-blue-700 bg-white"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      The booking remains active and the bed stays reserved until this new date arrives.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowRescheduleCancelModal(false)}
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
              ) : (
                /* TAB 2: CANCEL BOOKING & ADVANCE RETENTION SETTLEMENT */
                (() => {
                  const statement = calculateOccupantFinancialStatement(occupantState, propertySettings);
                  const totalAdvanceCollected = Number(statement.totalPaid) || (occupantState.depositStatus === "PAID" ? Number(occupantState.securityDeposit) || 0 : 0);
                  const netRefund = Math.max(0, totalAdvanceCollected - cancellationRetentionFee);

                  return (
                    <div className="space-y-4 text-xs">
                      {/* Financial Settlement Card */}
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                        <div className="flex justify-between items-center font-semibold text-gray-700 pb-2 border-b border-gray-200">
                          <span>💰 Advance Collected:</span>
                          <span className="font-bold text-gray-900 text-sm font-mono">
                            ₹{totalAdvanceCollected.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div>
                          <label className="block font-bold text-gray-700 mb-1">
                            ✂️ Cancellation / Retention Fee (₹):
                          </label>
                          <input
                            type="number"
                            value={cancellationRetentionFee ? cancellationRetentionFee : ""}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setCancellationRetentionFee(val === "" ? 0 : parseInt(val, 10));
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold font-mono text-gray-900 focus:ring-1 focus:ring-rose-600 bg-white"
                          />
                          <p className="text-[10px] text-gray-500 mt-1">
                            Owner Retention: Enter amount retained for holding the room or ₹0 for full refund.
                          </p>
                        </div>

                        <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl flex justify-between items-center text-emerald-950 font-bold">
                          <span>🟢 Net Refund to Tenant:</span>
                          <span className="text-base font-mono font-extrabold text-emerald-900">
                            ₹{netRefund.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Cancellation Reason Selector */}
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">
                          Cancellation / No-Show Reason *
                        </label>
                        <select
                          value={cancellationReason}
                          onChange={(e) => setCancellationReason(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-1 focus:ring-rose-600 bg-white"
                        >
                          <option value="Tenant No-Show (Did not appear on joining date)">
                            Tenant No-Show (Did not appear on joining date)
                          </option>
                          <option value="Tenant cancelled move-in (Job / Personal plans changed)">
                            Tenant cancelled move-in (Job / Personal plans changed)
                          </option>
                          <option value="Found alternative accommodation">
                            Found alternative accommodation
                          </option>
                          <option value="Other Custom Reason">
                            Other Custom Reason
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">
                          Optional Notes / Comments
                        </label>
                        <input
                          type="text"
                          value={cancellationNotes}
                          onChange={(e) => setCancellationNotes(e.target.value)}
                          placeholder="e.g. Informed via WhatsApp, refunded token via GPay"
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-gray-800 bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setShowRescheduleCancelModal(false)}
                          className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          Keep Booking
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // 1. Release bed in propertyStore (Bed returns to Available 🟢)
                            const currentStructure = propertyStore.getStructure(propertyId);
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
                                      vacatingDate: undefined,
                                    };
                                  }),
                                };
                              }),
                            }));
                            propertyStore.updateStructure(updatedStructure, propertyId);

                            // 2. Mark tenant as Past (Cancelled Booking)
                            const todayStr = new Date().toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            });

                            const updated: Occupant = {
                              ...occupantState,
                              lifecycleStatus: "Past",
                              paymentStatus: "Due",
                              vacatingDate: todayStr,
                            };

                            setOccupantState(updated);
                            occupantStore.updateOccupant(updated, propertyId);
                            saveOccupantToFirestore(propertyId, updated);

                            // 3. Log into Compliance Log Store
                            const sanitizedComplianceEntry = sanitizeOccupantForCompliance({
                              propertyId,
                              occupantId: occupantState.id,
                              name: occupantState.name,
                              phone: occupantState.phone,
                              stayType: "Tenant",
                              roomNumber: occupantState.roomNumber,
                              bedCode: occupantState.bedCode,
                              checkInDate: occupantState.joiningDate,
                              checkOutDate: todayStr,
                              totalDaysStayed: 0,
                              purposeOfVisit: "Standard Long-Term Stay",
                              exitCategory: "Other",
                              exitReason: cancellationReason,
                              totalPaid: totalAdvanceCollected,
                              depositRefunded: netRefund,
                              penaltyPaid: cancellationRetentionFee,
                              kycVerified: Boolean(occupantState.kycVerified),
                            });
                            complianceLogStore.addLog(propertyId, sanitizedComplianceEntry);

                            triggerToast(`✓ Booking cancelled. Bed ${occupantState.roomNumber} (${occupantState.bedCode}) is now Available 🟢`);
                            setShowRescheduleCancelModal(false);
                          }}
                          className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md cursor-pointer active:scale-95 transition-all"
                        >
                          Confirm Cancellation & Release Bed 🟢
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
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
                    {propertyStore.getStructure(propertyId).map((floor) => {
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
                              const roomTariff = getRoomTariff(room, propertyId);

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
                    .getStructure(propertyId)
                    .flatMap((f) => f.rooms)
                    .find((r) => r.roomNumber === transferRoomNumber);

                  const targetRent = selectedTargetRoomObj
                    ? getRoomTariff(selectedTargetRoomObj, propertyId)
                    : 12000;

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
                        {/* 🔽 ACCORDION 1: CUSTOM TARIFF RATE ADJUSTMENT (COLLAPSED BY DEFAULT) */}
                        <div className="border border-purple-200 rounded-2xl bg-purple-50/50 overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => setShowTariffAccordion(!showTariffAccordion)}
                            className="w-full px-4 py-3 bg-purple-100/60 hover:bg-purple-100 flex items-center justify-between font-bold text-purple-950 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-600" />
                              <span>Custom Tariff Rate Adjustment (Optional)</span>
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-purple-800 font-extrabold">
                              <span>{showTariffAccordion ? "Hide Settings" : "Configure Rate 🔽"}</span>
                              {showTariffAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>

                          {showTariffAccordion && (
                            <div className="p-4 bg-white border-t border-purple-100 space-y-2">
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
                          )}
                        </div>

                        {/* 📊 ACCORDION 2: FINANCIAL BREAKDOWN & NET DIFFERENCE (COLLAPSED BY DEFAULT) */}
                        <div className="border border-emerald-200 rounded-2xl bg-emerald-50/50 overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => setShowFinancialAccordion(!showFinancialAccordion)}
                            className="w-full px-4 py-3 bg-emerald-100/60 hover:bg-emerald-100 flex items-center justify-between font-bold text-emerald-950 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Wallet className="w-4 h-4 text-emerald-600" />
                              <span>Financial Breakdown & Net Tariff (Optional)</span>
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-extrabold">
                              <span>{showFinancialAccordion ? "Hide Breakdown" : "View Breakdown 📊"}</span>
                              {showFinancialAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>

                          {showFinancialAccordion && (
                            <div className="p-4 bg-white border-t border-emerald-100 space-y-3">
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
                          )}
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
                {/* 1. Profile Photo Live Capture / Upload */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <label className="block font-bold text-gray-800 text-xs">
                    📷 1. Tenant Headshot Profile Photo
                  </label>
                  <UnifiedPhotoUploadSlot
                    label="Tenant Profile Photo"
                    aspectRatio="headshot"
                    value={kycInputPhotoUrl}
                    onChange={(base64) => {
                      setKycInputPhotoUrl(base64);
                      setIsKycPhotoSaved(true);
                    }}
                    onRemove={() => {
                      setKycInputPhotoUrl("");
                      setIsKycPhotoSaved(false);
                    }}
                  />
                </div>

                {/* 2. Govt ID Photos */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <label className="block font-bold text-gray-800 text-xs">
                    🪪 2. Govt ID / Aadhaar Card Photos
                  </label>

                  {/* ID Front & Back Photo Slots (Stacked Vertically) */}
                  <div className="space-y-3">
                    <div className="space-y-1 text-left">
                      <label className="block font-bold text-gray-900 text-xs">
                        💳 ID Card Front Photo *
                      </label>
                      <UnifiedPhotoUploadSlot
                        label="ID Card Front Photo"
                        aspectRatio="idcard"
                        value={occupantState.kycDocs?.aadhaarFrontUrl}
                        onChange={(base64) => {
                          setKycFrontUploaded(true);
                          setOccupantState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  kycDocs: { ...prev.kycDocs, aadhaarFrontUrl: base64 },
                                }
                              : null
                          );
                        }}
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="block font-bold text-gray-900 text-xs">
                        💳 ID Card Back Photo *
                      </label>
                      <UnifiedPhotoUploadSlot
                        label="ID Card Back Photo"
                        aspectRatio="idcard"
                        value={occupantState.kycDocs?.aadhaarBackUrl}
                        onChange={(base64) => {
                          setKycBackUploaded(true);
                          setOccupantState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  kycDocs: { ...prev.kycDocs, aadhaarBackUrl: base64 },
                                }
                              : null
                          );
                        }}
                      />
                    </div>
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

        {/* 🔑 Formal Check-Out & Settlement Modal */}
        {showCheckOutModal && (
          <CheckOutSettlementModal
            occupant={occupantState}
            roomNumber={occupantState.roomNumber}
            bedCode={occupantState.bedCode}
            propertyId={propertyId}
            isOpen={showCheckOutModal}
            onClose={() => setShowCheckOutModal(false)}
            onSuccess={() => {
              setOccupantState((prev) =>
                prev
                  ? {
                      ...prev,
                      lifecycleStatus: "Past",
                      depositStatus: "REFUNDED",
                    }
                  : null
              );
              triggerToast(`🎉 Completed formal check-out & deposit settlement for ${occupantState.name}!`);
            }}
          />
        )}
      </>
    )}
      </div>
    </div>
  );
}
