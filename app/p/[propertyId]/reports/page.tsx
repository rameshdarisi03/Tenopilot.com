"use client";

import Link from "next/link";
import { use, useState, useEffect, useMemo } from "react";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  ShieldCheck,
  Building2,
  Wallet,
  Clock,
  Zap,
  DollarSign,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Layers,
  PieChart,
  ChevronRight,
  X,
  CreditCard,
  AlertTriangle,
  UserMinus,
  Users,
} from "lucide-react";
import Papa from "papaparse";

import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { expenseStore, ExpenseRecord } from "@/constants/expenseStore";
import { complianceLogStore } from "@/constants/complianceLogStore";
import { subscribeOccupantsFromFirestore } from "@/lib/firestoreService";
import {
  createStyledWorkbook,
  setupWorksheetView,
  renderHeroBanner,
  renderMetadataCards,
  renderKpiCardsRow,
  renderStyledTable,
  renderTotalRow,
  autoFitColumnWidths,
  downloadWorkbookInBrowser,
} from "@/lib/excelReportGenerator";
import { calculateOccupantFinancialStatement } from "@/utils/domainSSOT";
import { ReceiptRupeeIcon } from "@/constants/businessIconLibrary";

export default function ReportsAnalyticsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  const [activeTab, setActiveTab] = useState<"FINANCIAL_REPORTS" | "BUSINESS_ANALYTICS">("FINANCIAL_REPORTS");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Timeline Filter State
  const [selectedTimelineFilter, setSelectedTimelineFilter] = useState<
    "THIS_MONTH" | "LAST_MONTH" | "THIS_QUARTER" | "THIS_YEAR" | "ALL_TIME" | "CUSTOM"
  >("THIS_MONTH");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [showCustomDateModal, setShowCustomDateModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper: Resolve active date bounds
  const resolveActiveDateBounds = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (selectedTimelineFilter) {
      case "THIS_MONTH": {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return {
          startDate: firstDay.toISOString().split("T")[0],
          endDate: lastDay.toISOString().split("T")[0],
          label: `This Month (${firstDay.toLocaleString("en-IN", { month: "short", year: "numeric" })})`,
          isAllTime: false,
        };
      }
      case "LAST_MONTH": {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        return {
          startDate: firstDay.toISOString().split("T")[0],
          endDate: lastDay.toISOString().split("T")[0],
          label: `Last Month (${firstDay.toLocaleString("en-IN", { month: "short", year: "numeric" })})`,
          isAllTime: false,
        };
      }
      case "THIS_QUARTER": {
        const qStartMonth = Math.floor(month / 3) * 3;
        const firstDay = new Date(year, qStartMonth, 1);
        const lastDay = new Date(year, qStartMonth + 3, 0);
        const qNum = Math.floor(month / 3) + 1;
        return {
          startDate: firstDay.toISOString().split("T")[0],
          endDate: lastDay.toISOString().split("T")[0],
          label: `This Quarter (Q${qNum} ${year})`,
          isAllTime: false,
        };
      }
      case "THIS_YEAR": {
        const fyStartYear = month >= 3 ? year : year - 1;
        const firstDay = new Date(fyStartYear, 3, 1);
        const lastDay = new Date(fyStartYear + 1, 2, 31);
        return {
          startDate: firstDay.toISOString().split("T")[0],
          endDate: lastDay.toISOString().split("T")[0],
          label: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
          isAllTime: false,
        };
      }
      case "CUSTOM": {
        return {
          startDate: customStartDate,
          endDate: customEndDate,
          label: `Custom (${customStartDate} to ${customEndDate})`,
          isAllTime: false,
        };
      }
      case "ALL_TIME":
      default:
        return {
          startDate: "2000-01-01",
          endDate: "2099-12-31",
          label: "All Time Records",
          isAllTime: true,
        };
    }
  };

  const activeDateBounds = resolveActiveDateBounds();

  // Dynamic Calendar Timeline Labels based on current real-time date
  const timelineLabels = useMemo(() => {
    const now = new Date();
    const curMonth = now.toLocaleString("en-IN", { month: "short", year: "numeric" });
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.toLocaleString("en-IN", { month: "short", year: "numeric" });
    const qNum = Math.floor(now.getMonth() / 3) + 1;
    const quarter = `Q${qNum} ${now.getFullYear()}`;
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fy = `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
    return { curMonth, lastMonth, quarter, fy };
  }, []);

  // Reactive State Stores
  const [propertySettings, setPropertySettings] = useState(() => propertySettingsStore.getSettings(propertyId));
  const [occupants, setOccupants] = useState<Occupant[]>(() => occupantStore.getOccupants(propertyId));
  const [structure, setStructure] = useState<FloorConfig[]>(() => propertyStore.getStructure(propertyId));
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  useEffect(() => {
    propertySettingsStore.initFirebaseListener(propertyId);
    propertyStore.initFirebaseListener(propertyId);
    expenseStore.initPropertyFirebase(propertyId);

    const updateAll = () => {
      setPropertySettings(propertySettingsStore.getSettings(propertyId));
      setOccupants(occupantStore.getOccupants(propertyId));
      setStructure(propertyStore.getStructure(propertyId));
      const { startDate, endDate } = resolveActiveDateBounds();
      setExpenses(expenseStore.getExpenses(propertyId, startDate, endDate));
    };

    updateAll();

    const unsubSettings = propertySettingsStore.subscribe(updateAll);
    const unsubOcc = occupantStore.subscribe(updateAll);
    const unsubProp = propertyStore.subscribe(updateAll);
    const unsubExp = expenseStore.subscribe(updateAll);
    const unsubComp = complianceLogStore.subscribe(updateAll);

    // Direct Real-time Cloud Firestore subscription for occupants
    const unsubFirestoreOccupants = subscribeOccupantsFromFirestore(propertyId, (fsOccupants) => {
      if (fsOccupants) {
        occupantStore.setOccupantsFromFirestore(fsOccupants, propertyId);
        setOccupants(occupantStore.getOccupants(propertyId));
      }
    });

    return () => {
      unsubSettings();
      unsubOcc();
      unsubProp();
      unsubExp();
      unsubComp();
      unsubFirestoreOccupants();
    };
  }, [propertyId, selectedTimelineFilter, customStartDate, customEndDate]);

  // -------------------------------------------------------------
  // TAB 2: BUSINESS & YIELD ANALYTICS ENGINE
  // -------------------------------------------------------------
  const businessAnalytics = useMemo(() => {
    // 1. Total Bed Layout & Capacity
    let totalBeds = 0;
    const roomTypeStats: Record<number, { sharingName: string; totalBeds: number; occupantRents: number[]; occupiedBeds: number }> = {};

    structure.forEach((fl) => {
      fl.rooms.forEach((rm) => {
        const bedCount = rm.beds.length || 1;
        if (!roomTypeStats[bedCount]) {
          const sharingName =
            bedCount === 1
              ? "Single Private Room"
              : bedCount === 2
              ? "2-Sharing Room"
              : bedCount === 3
              ? "3-Sharing Room"
              : bedCount === 4
              ? "4-Sharing Room"
              : `${bedCount}-Sharing Room`;
          roomTypeStats[bedCount] = { sharingName, totalBeds: 0, occupantRents: [], occupiedBeds: 0 };
        }

        rm.beds.forEach(() => {
          totalBeds++;
          roomTypeStats[bedCount].totalBeds++;
        });
      });
    });

    const activeOccupants = occupants.filter((o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice");
    const activeOccupantCount = activeOccupants.length;

    // Populate occupants and revenue per sharing type
    activeOccupants.forEach((occ) => {
      const rNum = occ.roomNumber || "";
      let roomBeds = 3; // default
      structure.forEach((fl) => {
        const found = fl.rooms.find((r) => r.roomNumber === rNum);
        if (found) roomBeds = found.beds.length;
      });

      if (!roomTypeStats[roomBeds]) {
        roomTypeStats[roomBeds] = {
          sharingName: `${roomBeds}-Sharing Room`,
          totalBeds: roomBeds,
          occupantRents: [],
          occupiedBeds: 0,
        };
      }

      roomTypeStats[roomBeds].occupiedBeds++;
      roomTypeStats[roomBeds].occupantRents.push(occ.rentAmount || 0);
    });

    const sharingMatrix = Object.entries(roomTypeStats).map(([beds, data]) => {
      const bCount = parseInt(beds, 10);
      const occPct = data.totalBeds > 0 ? ((data.occupiedBeds / data.totalBeds) * 100).toFixed(1) : "0.0";
      const totalRentInSharing = data.occupantRents.reduce((sum, r) => sum + r, 0);
      const avgRentPerBed = data.occupiedBeds > 0 ? Math.round(totalRentInSharing / data.occupiedBeds) : 7500;
      const capacityYield = data.totalBeds * avgRentPerBed;
      const vacancyLoss = Math.max(0, capacityYield - totalRentInSharing);

      return {
        bedCount: bCount,
        sharingName: data.sharingName,
        totalBeds: data.totalBeds,
        occupiedBeds: data.occupiedBeds,
        occPct,
        avgRentPerBed,
        realizedYield: totalRentInSharing,
        capacityYield,
        vacancyLoss,
      };
    });

    // 2. Financial Metrics for Active Timeline (UPI vs Cash only)
    let totalRevenueIntake = 0;
    let rentOnlyIntake = 0;
    let upiTotal = 0;
    let cashTotal = 0;

    activeOccupants.forEach((occ) => {
      const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
      const history = occ.paymentHistory || [];
      const { startDate, endDate, isAllTime } = resolveActiveDateBounds();

      const periodPayments = isAllTime
        ? history
        : history.filter((pm) => {
            if (pm.status === "VOIDED") return false;
            const rawDate = pm.date || "";
            if (!rawDate) return false;
            let isoDate = "";
            if (rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
              isoDate = rawDate.slice(0, 10);
            } else {
              const parsed = new Date(rawDate);
              if (!isNaN(parsed.getTime())) {
                isoDate = parsed.toISOString().slice(0, 10);
              }
            }
            if (!isoDate) return true;
            return isoDate >= startDate && isoDate <= endDate;
          });

      if (periodPayments.length > 0) {
        periodPayments.forEach((pm) => {
          if (pm.status === "VOIDED") return;
          totalRevenueIntake += pm.amount;
          const isDeposit =
            (pm.month || "").toLowerCase().includes("deposit") ||
            (pm.receiptNo || "").toLowerCase().includes("dep");
          if (!isDeposit) {
            rentOnlyIntake += pm.amount;
          }
          const mode = (pm.mode || "").toLowerCase();
          if (mode.includes("cash")) {
            cashTotal += pm.amount;
          } else {
            upiTotal += pm.amount;
          }
        });
      } else if (stmt.totalRentPaid > 0 && (selectedTimelineFilter === "THIS_MONTH" || isAllTime)) {
        // Migration fallback when statement shows paid rent without granular payment history
        totalRevenueIntake += stmt.totalRentPaid;
        rentOnlyIntake += stmt.totalRentPaid;
        upiTotal += stmt.totalRentPaid;
      }
    });

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalRentOfOccupants = activeOccupants.reduce((sum, o) => sum + (o.rentAmount || 0), 0);
    const avgRentPerBed = activeOccupantCount > 0 ? Math.round(totalRentOfOccupants / activeOccupantCount) : 0;
    const cpb = activeOccupantCount > 0 ? Math.round(totalExpenses / activeOccupantCount) : 0;
    const netOperatingProfit = Math.max(0, totalRevenueIntake - totalExpenses);
    const operatingMargin = totalRevenueIntake > 0 ? ((netOperatingProfit / totalRevenueIntake) * 100).toFixed(1) : "0.0";

    const totalChannel = upiTotal + cashTotal;
    const upiPct = totalChannel > 0 ? Math.round((upiTotal / totalChannel) * 100) : 0;
    const cashPct = totalChannel > 0 ? 100 - upiPct : 0;

    // 3. Genuine Trailing 6-Month Collections & Occupancy Trend
    const now = new Date();
    const monthsData: { month: string; yearMonth: string; startDate: string; endDate: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      const monthStr = d.toLocaleString("en-IN", { month: "short" });
      const mPad = String(m + 1).padStart(2, "0");
      monthsData.push({
        month: monthStr,
        yearMonth: `${y}-${mPad}`,
        startDate: `${y}-${mPad}-01`,
        endDate: `${y}-${mPad}-${String(lastDay).padStart(2, "0")}`,
      });
    }

    const sixMonthTrend = monthsData.map((mObj) => {
      let monthRev = 0;
      let monthOccupants = 0;

      occupants.forEach((occ) => {
        const history = occ.paymentHistory || [];
        history.forEach((pm) => {
          if (pm.status === "VOIDED") return;
          const rawDate = pm.date || "";
          let isoDate = "";
          if (rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
            isoDate = rawDate.slice(0, 10);
          } else {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) {
              isoDate = parsed.toISOString().slice(0, 10);
            }
          }
          if (isoDate && isoDate >= mObj.startDate && isoDate <= mObj.endDate) {
            monthRev += pm.amount;
          }
        });

        const joinStr = occ.joiningDate || occ.lastPaidDate || "";
        const vacateStr = occ.vacatingDate || occ.guestCheckoutDate || "";
        const joinIso = joinStr && joinStr.match(/^\d{4}-\d{2}-\d{2}/) ? joinStr.slice(0, 10) : "";
        const vacateIso = vacateStr && vacateStr.match(/^\d{4}-\d{2}-\d{2}/) ? vacateStr.slice(0, 10) : "";

        const joinedBeforeOrDuring = !joinIso || joinIso <= mObj.endDate;
        const notVacatedBefore = !vacateIso || vacateIso >= mObj.startDate;

        if (joinedBeforeOrDuring && notVacatedBefore) {
          if (occ.lifecycleStatus === "Active" || occ.lifecycleStatus === "Notice") {
            monthOccupants++;
          }
        }
      });

      if (mObj.yearMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`) {
        if (monthRev === 0 && totalRevenueIntake > 0) {
          monthRev = totalRevenueIntake;
        }
        if (monthOccupants === 0 && activeOccupantCount > 0) {
          monthOccupants = activeOccupantCount;
        }
      }

      const occPctVal = totalBeds > 0 ? Math.min(100, Math.round((monthOccupants / totalBeds) * 100)) : 0;

      return {
        month: mObj.month,
        revenue: monthRev,
        occupancyPct: occPctVal,
      };
    });

    return {
      totalBeds,
      occupiedBeds: activeOccupantCount,
      sharingMatrix,
      totalRevenueIntake,
      rentOnlyIntake,
      totalExpenses,
      cpb,
      arpb: avgRentPerBed,
      netOperatingProfit,
      operatingMargin,
      upiTotal,
      cashTotal,
      upiPct,
      cashPct,
      sixMonthTrend,
    };
  }, [structure, occupants, propertySettings, expenses, selectedTimelineFilter, customStartDate, customEndDate]);

  // -------------------------------------------------------------
  // DEFAULTERS & OVERDUE AGING AUDIT ENGINE
  // -------------------------------------------------------------
  const defaultersList = useMemo(() => {
    const list: {
      occupant: Occupant;
      statement: ReturnType<typeof calculateOccupantFinancialStatement>;
      daysOverdue: number;
      agingCategory: "1-5 Days" | "6-15 Days" | "16-30 Days" | "30+ Days Critical";
    }[] = [];

    const activeAndNotice = occupants.filter(
      (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
    );

    activeAndNotice.forEach((occ) => {
      const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
      if (stmt.netOutstandingBalance > 0) {
        const days = Math.max(1, occ.daysDiff < 0 ? Math.abs(occ.daysDiff) : 1);
        let agingCategory: "1-5 Days" | "6-15 Days" | "16-30 Days" | "30+ Days Critical" = "1-5 Days";
        if (days > 30) {
          agingCategory = "30+ Days Critical";
        } else if (days > 15) {
          agingCategory = "16-30 Days";
        } else if (days > 5) {
          agingCategory = "6-15 Days";
        }

        list.push({
          occupant: occ,
          statement: stmt,
          daysOverdue: days,
          agingCategory,
        });
      }
    });

    return list.sort((a, b) => b.statement.netOutstandingBalance - a.statement.netOutstandingBalance);
  }, [occupants, propertySettings]);

  // -------------------------------------------------------------
  // VACATING & NOTICE PERIOD SCHEDULE ENGINE
  // -------------------------------------------------------------
  const vacatingNoticeList = useMemo(() => {
    return occupants
      .filter((o) => o.lifecycleStatus === "Notice" || !!o.vacatingDate)
      .map((occ) => {
        const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
        const secDep = stmt.securityDepositRequired || 0;
        const rentDue = stmt.netOutstandingBalance || 0;
        const estimatedRefund = Math.max(0, secDep - rentDue);

        return {
          occupant: occ,
          statement: stmt,
          vacatingDate: occ.vacatingDate || "Notice Active",
          depositHeld: secDep,
          outstandingDue: rentDue,
          estimatedRefund,
        };
      });
  }, [occupants, propertySettings]);

  // -------------------------------------------------------------
  // 1-CLICK EXPORT HANDLERS (CSV & COLORFUL EXCEL)
  // -------------------------------------------------------------
  const handleExportRentRollCSV = () => {
    const rows: any[] = [];
    const { startDate, endDate, isAllTime } = resolveActiveDateBounds();

    occupants.forEach((occ) => {
      const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
      const history = occ.paymentHistory || [];

      if (history.length > 0) {
        history.forEach((pm) => {
          if (pm.status === "VOIDED") return;
          const rawDate = pm.date || "";
          let inRange = isAllTime;
          if (!isAllTime && rawDate) {
            const parsed = new Date(rawDate);
            const iso = !isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : rawDate;
            inRange = iso >= startDate && iso <= endDate;
          }

          if (inRange) {
            rows.push({
              "Receipt Number": pm.receiptNo || `REC-${occ.roomNumber}-${occ.bedCode}`,
              "Tenant Name": occ.name,
              "Room Number": occ.roomNumber,
              "Bed Code": occ.bedCode,
              "Phone Number": occ.phone,
              "Billing Cycle / Month": pm.month || "Current Cycle",
              "Payment Date": pm.date || "N/A",
              "Amount Paid (INR)": pm.amount,
              "Payment Stream": (pm.month || "").toLowerCase().includes("deposit") ? "Security Deposit" : "Room Rent",
              "Payment Mode": pm.mode || "UPI",
              "Collected By": pm.collectedBy?.name || propertySettings.propertyName || "Desk Admin",
              "Status": pm.status || "PAID",
            });
          }
        });
      } else if (stmt.totalPaid > 0) {
        rows.push({
          "Receipt Number": `REC-${occ.roomNumber || "0"}-${occ.bedCode || "1"}`,
          "Tenant Name": occ.name,
          "Room Number": occ.roomNumber,
          "Bed Code": occ.bedCode,
          "Phone Number": occ.phone,
          "Billing Cycle / Month": "Active Cycle",
          "Payment Date": occ.joiningDate || "Active",
          "Amount Paid (INR)": stmt.totalPaid,
          "Payment Stream": "Room Rent",
          "Payment Mode": "Direct Transfer",
          "Collected By": propertySettings.propertyName || "Desk Admin",
          "Status": "PAID",
        });
      }
    });

    if (rows.length === 0) {
      triggerToast("⚠️ No rent records found in selected date range.");
      return;
    }

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rent_Payment_Report_${propertyId}_${activeDateBounds.startDate}_to_${activeDateBounds.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("✓ Rent Payment Report downloaded successfully!");
  };

  const handleExportDepositRegisterCSV = () => {
    const rows = occupants.map((occ) => {
      const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
      return {
        "Tenant ID": occ.id,
        "Tenant Name": occ.name,
        "Room Location": `Room ${occ.roomNumber} (${occ.bedCode})`,
        "Check-In Date": occ.joiningDate || "N/A",
        "Security Deposit Required (INR)": stmt.securityDepositRequired,
        "Deposit Paid": stmt.isDepositCleared ? "YES" : "NO",
        "Deposit Status": stmt.isDepositCleared ? "PAID" : "PENDING",
        "Contact Phone": occ.phone,
        "Emergency Phone": occ.emergencyContact?.phone || "N/A",
      };
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Security_Deposit_Report_${propertyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("✓ Security Deposit Report downloaded successfully!");
  };

  const handleExportDefaultersCSV = () => {
    if (defaultersList.length === 0) {
      triggerToast("🎉 Zero defaulters! All active residents are fully paid.");
      return;
    }

    const rows = defaultersList.map((d) => ({
      "Tenant Name": d.occupant.name,
      "Room Number": d.occupant.roomNumber,
      "Bed Code": d.occupant.bedCode,
      "Phone Number": d.occupant.phone,
      "Monthly Rent (INR)": d.occupant.rentAmount,
      "Outstanding Dues (INR)": d.statement.netOutstandingBalance,
      "Days Overdue": d.daysOverdue,
      "Aging Category": d.agingCategory,
      "Target Due Date": d.occupant.dueDate || `Day ${d.occupant.dueDay}`,
      "Emergency Contact": d.occupant.emergencyContact?.name || "N/A",
      "Emergency Phone": d.occupant.emergencyContact?.phone || "N/A",
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rent_Defaulters_Aging_Report_${propertyId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("✓ Rent Defaulters & Aging Report downloaded!");
  };

  const handleExportVacatingNoticeCSV = () => {
    if (vacatingNoticeList.length === 0) {
      triggerToast("ℹ️ No residents currently on notice or scheduled to vacate.");
      return;
    }

    const rows = vacatingNoticeList.map((v) => ({
      "Tenant Name": v.occupant.name,
      "Room Number": v.occupant.roomNumber,
      "Bed Code": v.occupant.bedCode,
      "Phone Number": v.occupant.phone,
      "Vacating / Move-Out Date": v.vacatingDate,
      "Monthly Rent (INR)": v.occupant.rentAmount,
      "Security Deposit Held (INR)": v.depositHeld,
      "Pending Rent Dues (INR)": v.outstandingDue,
      "Estimated Refund Payable (INR)": v.estimatedRefund,
      "Emergency Phone": v.occupant.emergencyContact?.phone || "N/A",
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Vacating_Notice_Schedule_${propertyId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("✓ Vacating & Notice Schedule downloaded!");
  };

  const handleExportFullExcelWorkbook = async () => {
    try {
      triggerToast("⏳ Generating executive colorful CA pack workbook...");
      const wb = createStyledWorkbook(`TenoPilot OS • ${propertySettings.propertyName || "Sunshine PG"}`);

      // ==========================================
      // SHEET 1: EXECUTIVE SUMMARY & PERFORMANCE
      // ==========================================
      const wsSummary = wb.addWorksheet("Executive Summary");
      renderHeroBanner(
        wsSummary,
        `${propertySettings.propertyName || "Sunshine PG"} — FINANCIAL & OPERATIONS AUDIT`,
        `Report Window: ${activeDateBounds.label} • Generated: ${new Date().toLocaleString("en-IN")}`,
        "H",
        "FFC2652A"
      );

      renderMetadataCards(
        wsSummary,
        [
          { label: "Property", value: propertySettings.propertyName || "Sunshine PG" },
          { label: "Timeline", value: activeDateBounds.label },
          { label: "Total Beds", value: `${businessAnalytics.totalBeds}` },
          {
            label: "Occupancy Rate",
            value: `${
              businessAnalytics.totalBeds > 0
                ? ((businessAnalytics.occupiedBeds / businessAnalytics.totalBeds) * 100).toFixed(1)
                : "0.0"
            }%`,
          },
        ],
        4
      );

      const totalDefaultersDues = defaultersList.reduce((acc, d) => acc + d.statement.netOutstandingBalance, 0);

      renderKpiCardsRow(wsSummary, 6, [
        {
          label: "Total Collections",
          value: `₹${businessAnalytics.totalRevenueIntake.toLocaleString("en-IN")}`,
          subtext: `${activeDateBounds.label}`,
          fillColorHex: "FFD1FAE5",
          textColorHex: "FF065F46",
        },
        {
          label: "Total Expenses",
          value: `₹${businessAnalytics.totalExpenses.toLocaleString("en-IN")}`,
          subtext: "Operational Bills",
          fillColorHex: "FFFEE2E2",
          textColorHex: "FF991B1B",
        },
        {
          label: "Net Operating Profit",
          value: `₹${businessAnalytics.netOperatingProfit.toLocaleString("en-IN")}`,
          subtext: `${businessAnalytics.operatingMargin}% Net Margin`,
          fillColorHex: "FFE0E7FF",
          textColorHex: "FF3730A3",
        },
        {
          label: "Outstanding Rent Dues",
          value: `₹${totalDefaultersDues.toLocaleString("en-IN")}`,
          subtext: `${defaultersList.length} Defaulters`,
          fillColorHex: "FFFFEDD5",
          textColorHex: "FF9A3412",
        },
      ]);

      const sharingColumns = [
        { header: "Room Sharing Type", key: "sharingName", width: 22 },
        { header: "Total Beds", key: "totalBeds", width: 14, align: "center" as const },
        { header: "Occupied Beds", key: "occupiedBeds", width: 14, align: "center" as const },
        { header: "Occupancy %", key: "occPct", width: 14, align: "center" as const },
        { header: "Average Rent", key: "avgRentPerBed", width: 16, align: "right" as const, isCurrency: true },
        { header: "Realized Monthly Yield", key: "realizedYield", width: 22, align: "right" as const, isCurrency: true },
        { header: "Full Capacity Potential", key: "capacityYield", width: 22, align: "right" as const, isCurrency: true },
        { header: "Vacancy Loss", key: "vacancyLoss", width: 18, align: "right" as const, isCurrency: true },
      ];

      const startSharingDataRow = 12;
      const lastSharingRow = renderStyledTable(
        wsSummary,
        11,
        sharingColumns,
        businessAnalytics.sharingMatrix,
        "FF1E293B"
      );

      if (businessAnalytics.sharingMatrix.length > 0) {
        renderTotalRow(wsSummary, lastSharingRow + 1, startSharingDataRow, lastSharingRow, sharingColumns);
      }
      autoFitColumnWidths(wsSummary);
      setupWorksheetView(wsSummary, 11);

      // ==========================================
      // SHEET 2: RENT ROLL & COLLECTIONS
      // ==========================================
      const wsRent = wb.addWorksheet("Rent Roll");
      renderHeroBanner(
        wsRent,
        `${propertySettings.propertyName || "Sunshine PG"} — RENT ROLL & COLLECTIONS LEDGER`,
        `Report Window: ${activeDateBounds.label}`,
        "J",
        "FF065F46"
      );

      const rentRollCols = [
        { header: "Receipt #", key: "receiptNo", width: 18 },
        { header: "Date", key: "date", width: 14, align: "center" as const },
        { header: "Resident Name", key: "name", width: 24 },
        { header: "Room", key: "room", width: 10, align: "center" as const },
        { header: "Bed", key: "bed", width: 10, align: "center" as const },
        { header: "Phone", key: "phone", width: 16, align: "center" as const },
        { header: "Cycle", key: "cycle", width: 16 },
        { header: "Mode", key: "mode", width: 14, align: "center" as const },
        { header: "Amount Paid (INR)", key: "amount", width: 18, align: "right" as const, isCurrency: true },
        { header: "Status", key: "status", width: 14, align: "center" as const },
      ];

      const rentRowsData: any[] = [];
      occupants.forEach((occ) => {
        const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
        const history = occ.paymentHistory || [];
        if (history.length > 0) {
          history.forEach((pm) => {
            if (pm.status === "VOIDED") return;
            rentRowsData.push({
              receiptNo: pm.receiptNo || `REC-${occ.roomNumber}-${occ.bedCode}`,
              date: pm.date || occ.joiningDate || "N/A",
              name: occ.name,
              room: occ.roomNumber,
              bed: occ.bedCode,
              phone: occ.phone,
              cycle: pm.month || "Current Cycle",
              mode: pm.mode || "UPI",
              amount: pm.amount,
              status: pm.status || "PAID",
            });
          });
        } else if (stmt.totalPaid > 0) {
          rentRowsData.push({
            receiptNo: `REC-${occ.roomNumber || "0"}-${occ.bedCode || "1"}`,
            date: occ.joiningDate || "Active",
            name: occ.name,
            room: occ.roomNumber,
            bed: occ.bedCode,
            phone: occ.phone,
            cycle: "Active Cycle",
            mode: "Direct Transfer",
            amount: stmt.totalPaid,
            status: "PAID",
          });
        }
      });

      const lastRentRow = renderStyledTable(wsRent, 5, rentRollCols, rentRowsData, "FF065F46");
      if (rentRowsData.length > 0) {
        renderTotalRow(wsRent, lastRentRow + 1, 6, lastRentRow, rentRollCols);
      }
      autoFitColumnWidths(wsRent);
      setupWorksheetView(wsRent, 5);

      // ==========================================
      // SHEET 3: DEFAULTERS & OVERDUE AGING
      // ==========================================
      const wsDefaulters = wb.addWorksheet("Rent Defaulters");
      renderHeroBanner(
        wsDefaulters,
        `${propertySettings.propertyName || "Sunshine PG"} — RENT OVERDUE & DEFAULTERS AGING`,
        `Immediate Attention Required • Generated: ${new Date().toLocaleString("en-IN")}`,
        "I",
        "FF991B1B"
      );

      const defaulterCols = [
        { header: "Resident Name", key: "name", width: 24 },
        { header: "Room", key: "room", width: 10, align: "center" as const },
        { header: "Bed", key: "bed", width: 10, align: "center" as const },
        { header: "Phone Number", key: "phone", width: 16, align: "center" as const },
        { header: "Monthly Rent", key: "rentAmount", width: 16, align: "right" as const, isCurrency: true },
        { header: "Overdue Amount", key: "outstanding", width: 18, align: "right" as const, isCurrency: true },
        { header: "Days Overdue", key: "daysOverdue", width: 14, align: "center" as const },
        { header: "Aging Category", key: "agingCategory", width: 20, align: "center" as const },
        { header: "Emergency Phone", key: "emergencyPhone", width: 16, align: "center" as const },
      ];

      const defaulterRowsData = defaultersList.map((d) => ({
        name: d.occupant.name,
        room: d.occupant.roomNumber,
        bed: d.occupant.bedCode,
        phone: d.occupant.phone,
        rentAmount: d.occupant.rentAmount,
        outstanding: d.statement.netOutstandingBalance,
        daysOverdue: `${d.daysOverdue} Days`,
        agingCategory: d.agingCategory,
        emergencyPhone: d.occupant.emergencyContact?.phone || "N/A",
      }));

      const lastDefRow = renderStyledTable(wsDefaulters, 5, defaulterCols, defaulterRowsData, "FF991B1B");
      if (defaulterRowsData.length > 0) {
        renderTotalRow(wsDefaulters, lastDefRow + 1, 6, lastDefRow, defaulterCols);
      }
      autoFitColumnWidths(wsDefaulters);
      setupWorksheetView(wsDefaulters, 5);

      // ==========================================
      // SHEET 4: VACATING & NOTICE SCHEDULE
      // ==========================================
      const wsNotice = wb.addWorksheet("Vacating Schedule");
      renderHeroBanner(
        wsNotice,
        `${propertySettings.propertyName || "Sunshine PG"} — VACATING & NOTICE PERIOD SCHEDULE`,
        `Upcoming Move-Outs & Security Deposit Refund Estimations`,
        "I",
        "FFC2652A"
      );

      const noticeCols = [
        { header: "Resident Name", key: "name", width: 24 },
        { header: "Room", key: "room", width: 10, align: "center" as const },
        { header: "Bed", key: "bed", width: 10, align: "center" as const },
        { header: "Phone Number", key: "phone", width: 16, align: "center" as const },
        { header: "Vacating Date", key: "vacatingDate", width: 16, align: "center" as const },
        { header: "Monthly Rent", key: "rentAmount", width: 16, align: "right" as const, isCurrency: true },
        { header: "Deposit Held", key: "depositHeld", width: 16, align: "right" as const, isCurrency: true },
        { header: "Pending Rent Due", key: "outstandingDue", width: 16, align: "right" as const, isCurrency: true },
        { header: "Est. Net Refund", key: "estimatedRefund", width: 18, align: "right" as const, isCurrency: true },
      ];

      const noticeRowsData = vacatingNoticeList.map((v) => ({
        name: v.occupant.name,
        room: v.occupant.roomNumber,
        bed: v.occupant.bedCode,
        phone: v.occupant.phone,
        vacatingDate: v.vacatingDate,
        rentAmount: v.occupant.rentAmount,
        depositHeld: v.depositHeld,
        outstandingDue: v.outstandingDue,
        estimatedRefund: v.estimatedRefund,
      }));

      const lastNoticeRow = renderStyledTable(wsNotice, 5, noticeCols, noticeRowsData, "FFC2652A");
      if (noticeRowsData.length > 0) {
        renderTotalRow(wsNotice, lastNoticeRow + 1, 6, lastNoticeRow, noticeCols);
      }
      autoFitColumnWidths(wsNotice);
      setupWorksheetView(wsNotice, 5);

      // ==========================================
      // SHEET 5: SECURITY DEPOSITS CUSTODY
      // ==========================================
      const wsDeposits = wb.addWorksheet("Security Deposits");
      renderHeroBanner(
        wsDeposits,
        `${propertySettings.propertyName || "Sunshine PG"} — RESIDENT SECURITY DEPOSIT ESCROW REGISTER`,
        `Statutory Custody Ledger`,
        "H",
        "FF312E81"
      );

      const depositCols = [
        { header: "Resident Name", key: "name", width: 24 },
        { header: "Room & Bed", key: "roomBed", width: 14, align: "center" as const },
        { header: "Contact Phone", key: "phone", width: 16, align: "center" as const },
        { header: "Check-In Date", key: "joiningDate", width: 14, align: "center" as const },
        { header: "Deposit Required", key: "req", width: 18, align: "right" as const, isCurrency: true },
        { header: "Deposit Paid", key: "paid", width: 18, align: "right" as const, isCurrency: true },
        { header: "Remaining Due", key: "rem", width: 16, align: "right" as const, isCurrency: true },
        { header: "Status", key: "status", width: 14, align: "center" as const },
      ];

      const depositRowsData = occupants
        .filter((o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice")
        .map((occ) => {
          const stmt = calculateOccupantFinancialStatement(occ, propertySettings);
          const req = stmt.securityDepositRequired || 0;
          const paid = stmt.totalDepositPaid || (stmt.isDepositCleared ? req : 0);
          const rem = stmt.remainingDepositDue !== undefined ? stmt.remainingDepositDue : Math.max(0, req - paid);
          return {
            name: occ.name,
            roomBed: `${occ.roomNumber} (${occ.bedCode})`,
            phone: occ.phone,
            joiningDate: occ.joiningDate || "Active",
            req,
            paid,
            rem,
            status: stmt.isDepositCleared ? "PAID" : "PENDING",
          };
        });

      const lastDepRow = renderStyledTable(wsDeposits, 5, depositCols, depositRowsData, "FF312E81");
      if (depositRowsData.length > 0) {
        renderTotalRow(wsDeposits, lastDepRow + 1, 6, lastDepRow, depositCols);
      }
      autoFitColumnWidths(wsDeposits);
      setupWorksheetView(wsDeposits, 5);

      // ==========================================
      // SHEET 6: OPERATIONAL EXPENSES
      // ==========================================
      const wsExp = wb.addWorksheet("PG Expenses");
      renderHeroBanner(
        wsExp,
        `${propertySettings.propertyName || "Sunshine PG"} — OPERATIONAL EXPENSES & BILLS`,
        `Window: ${activeDateBounds.label}`,
        "F",
        "FF1E293B"
      );

      const expCols = [
        { header: "Date", key: "date", width: 14, align: "center" as const },
        { header: "Category", key: "category", width: 22 },
        { header: "Paid From Account", key: "paidFrom", width: 22 },
        { header: "Expense Amount", key: "amount", width: 18, align: "right" as const, isCurrency: true },
        { header: "Notes & Reference", key: "notes", width: 30 },
      ];

      const expRowsData = expenses.map((e) => ({
        date: e.date,
        category: e.category,
        paidFrom: e.paidFrom,
        amount: e.amount,
        notes: e.notes || "",
      }));

      const lastExpRow = renderStyledTable(wsExp, 5, expCols, expRowsData, "FF1E293B");
      if (expRowsData.length > 0) {
        renderTotalRow(wsExp, lastExpRow + 1, 6, lastExpRow, expCols);
      }
      autoFitColumnWidths(wsExp);
      setupWorksheetView(wsExp, 5);

      // Trigger Client-Side Download
      await downloadWorkbookInBrowser(
        wb,
        `TenoPilot_CA_Audit_Pack_${propertyId}_${activeDateBounds.startDate}_to_${activeDateBounds.endDate}.xlsx`
      );
      triggerToast("✅ Full Colorful CA & Accounts Pack downloaded successfully!");
    } catch (err: any) {
      console.error("Excel generation error:", err);
      triggerToast(`⚠️ Failed to generate Excel: ${err.message || "Unknown error"}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-gray-900 font-sans selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* 256px Left Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <PropertyHeader
          title="Reports & Analytics"
          showSearch={false}
          propertyId={propertyId}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Workspace Body */}
        <div className="p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8 flex-1 max-w-[1280px] mx-auto w-full pb-28">
          {/* Top Title & Timeline Selector Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif font-bold text-2xl sm:text-3xl text-gray-900 tracking-tight">
                  Reports & Business Insights
                </h1>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  CA & TAX READY 🟢
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
                {propertySettings.propertyName || "Sunshine PG"} • Download financial reports and track room earnings
              </p>
            </div>

            {/* Controls Row (Full width on mobile) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
              {/* Timeline Filter Selector */}
              <div className="relative flex items-center justify-between sm:justify-start gap-2 px-3 py-2 sm:py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 shadow-2xs w-full sm:w-auto">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-[#c2652a] shrink-0" />
                  <select
                    value={selectedTimelineFilter}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      if (val === "CUSTOM") {
                        setShowCustomDateModal(true);
                      }
                      setSelectedTimelineFilter(val);
                    }}
                    className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer pr-2 truncate"
                  >
                    <option value="THIS_MONTH">This Month ({timelineLabels.curMonth})</option>
                    <option value="LAST_MONTH">Last Month ({timelineLabels.lastMonth})</option>
                    <option value="THIS_QUARTER">This Quarter ({timelineLabels.quarter})</option>
                    <option value="THIS_YEAR">Financial Year ({timelineLabels.fy})</option>
                    <option value="ALL_TIME">All Time Records</option>
                    <option value="CUSTOM">
                      📅 {selectedTimelineFilter === "CUSTOM" ? `${customStartDate} → ${customEndDate}` : "Custom Date Range..."}
                    </option>
                  </select>
                </div>
                {selectedTimelineFilter === "CUSTOM" && (
                  <button
                    type="button"
                    onClick={() => setShowCustomDateModal(true)}
                    className="text-[10px] text-[#c2652a] underline font-bold ml-1 hover:opacity-80 cursor-pointer shrink-0"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Instant CA Pack Export Button */}
              <button
                type="button"
                onClick={handleExportFullExcelWorkbook}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer min-h-[42px]"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Export CA Pack (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("FINANCIAL_REPORTS")}
              className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                activeTab === "FINANCIAL_REPORTS"
                  ? "bg-white border-[#c2652a] ring-2 ring-[#c2652a]/20 shadow-md scale-[1.01]"
                  : "bg-gray-50/70 border-gray-200 hover:bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-colors shrink-0 ${
                    activeTab === "FINANCIAL_REPORTS"
                      ? "bg-[#c2652a] text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-700 group-hover:bg-[#c2652a] group-hover:text-white"
                  }`}
                >
                  <FileText className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3
                    className={`font-serif font-bold text-sm sm:text-base truncate ${
                      activeTab === "FINANCIAL_REPORTS" ? "text-[#c2652a]" : "text-gray-900"
                    }`}
                  >
                    Downloads & Reports
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">
                    Export ready-made Excel & CSV files for accounts and audit
                  </p>
                </div>
              </div>
              {activeTab === "FINANCIAL_REPORTS" && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#c2652a] animate-pulse shrink-0 ml-2"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("BUSINESS_ANALYTICS")}
              className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                activeTab === "BUSINESS_ANALYTICS"
                  ? "bg-white border-[#c2652a] ring-2 ring-[#c2652a]/20 shadow-md scale-[1.01]"
                  : "bg-gray-50/70 border-gray-200 hover:bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-colors shrink-0 ${
                    activeTab === "BUSINESS_ANALYTICS"
                      ? "bg-[#c2652a] text-white shadow-xs"
                      : "bg-purple-50 text-purple-700 group-hover:bg-[#c2652a] group-hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3
                    className={`font-serif font-bold text-sm sm:text-base truncate ${
                      activeTab === "BUSINESS_ANALYTICS" ? "text-[#c2652a]" : "text-gray-900"
                    }`}
                  >
                    Business Insights
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">
                    Monthly collections, room earnings, and cost per bed
                  </p>
                </div>
              </div>
              {activeTab === "BUSINESS_ANALYTICS" && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#c2652a] animate-pulse shrink-0 ml-2"></span>
              )}
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: FINANCIAL & ESCROW REPORTS                         */}
          {/* ========================================================= */}
          {activeTab === "FINANCIAL_REPORTS" && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in">
              {/* Security Deposits Moved Banner */}
              <div className="bg-gradient-to-r from-emerald-50/80 via-white to-orange-50/60 border border-emerald-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-600 text-white shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 sm:w-6 h-5 sm:h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif font-bold text-base sm:text-lg text-gray-900">
                        Looking for Live Security Deposit Custody?
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        Upgraded to Financial Hub 🟢
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
                      Security deposits collected, move-out refunds, resident escrow balances, and the complete audit register are now tracked directly in the <strong>Deposits</strong> tab within Financial Hub.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/p/${propertyId}/financial-hub?tab=deposits`}
                  className="px-4 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
                >
                  <span>Open Deposits Hub</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {/* 2. 1-Click Master Audit Export Center */}
              <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs space-y-4 sm:space-y-6">
                <div className="border-b border-gray-100 pb-3 sm:pb-4">
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900">
                    Download Reports (Excel & CSV)
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Download ready-made files for your accounts or Chartered Accountant (CA)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Export Box 1: Rent Payment Report */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-3 sm:space-y-4 hover:border-[#c2652a]/60 hover:bg-orange-50/20 transition-all group">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <FileSpreadsheet className="w-4 sm:w-5 h-4 sm:h-5" />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900">Rent Payment Report (.csv)</h4>
                      <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                        Itemized rent payments, receipts, payment modes, and resident details for {activeDateBounds.label}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportRentRollCSV}
                      className="w-full py-2.5 px-4 rounded-xl bg-white border border-gray-300 group-hover:border-[#c2652a] group-hover:bg-[#c2652a] group-hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs min-h-[42px] active:scale-95"
                    >
                      <Download className="w-4 h-4" /> Download Rent Report
                    </button>
                  </div>

                  {/* Export Box 2: Defaulters & Overdue Aging Report */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-rose-50/40 border border-rose-200 flex flex-col justify-between space-y-3 sm:space-y-4 hover:border-rose-400 hover:bg-rose-50/70 transition-all group">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <AlertTriangle className="w-4 sm:w-5 h-4 sm:h-5" />
                        </div>
                        {defaultersList.length > 0 ? (
                          <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                            {defaultersList.length} Defaulters
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                            ✓ Zero Dues
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900">Defaulters & Aging Dues (.csv)</h4>
                      <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                        Unpaid residents grouped into 1-5d, 6-15d, and 16-30d+ critical overdue buckets with emergency contacts.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportDefaultersCSV}
                      className="w-full py-2.5 px-4 rounded-xl bg-white border border-rose-300 group-hover:border-rose-600 group-hover:bg-rose-600 group-hover:text-white font-bold text-xs text-rose-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs min-h-[42px] active:scale-95"
                    >
                      <Download className="w-4 h-4" /> Download Defaulters List
                    </button>
                  </div>

                  {/* Export Box 3: Vacating & Move-Out Schedule */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-orange-50/40 border border-orange-200 flex flex-col justify-between space-y-3 sm:space-y-4 hover:border-orange-400 hover:bg-orange-50/70 transition-all group">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-orange-100 text-[#c2652a] flex items-center justify-center font-bold">
                          <UserMinus className="w-4 sm:w-5 h-4 sm:h-5" />
                        </div>
                        {vacatingNoticeList.length > 0 ? (
                          <span className="text-[10px] font-extrabold text-orange-800 bg-orange-100 border border-orange-300 px-2.5 py-0.5 rounded-full">
                            {vacatingNoticeList.length} On Notice
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-gray-600 bg-gray-100 border border-gray-300 px-2.5 py-0.5 rounded-full">
                            0 On Notice
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900">Vacating & Notice Schedule (.csv)</h4>
                      <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                        Upcoming move-outs, freeing beds, deposit held, unpaid dues, and estimated refunds.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportVacatingNoticeCSV}
                      className="w-full py-2.5 px-4 rounded-xl bg-white border border-orange-300 group-hover:border-[#c2652a] group-hover:bg-[#c2652a] group-hover:text-white font-bold text-xs text-orange-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs min-h-[42px] active:scale-95"
                    >
                      <Download className="w-4 h-4" /> Download Notice Schedule
                    </button>
                  </div>

                  {/* Export Box 4: Expense & Bill Report */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-3 sm:space-y-4 hover:border-[#c2652a]/60 hover:bg-orange-50/20 transition-all group">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-orange-100 text-[#c2652a] flex items-center justify-center font-bold">
                        <ReceiptRupeeIcon className="w-4 sm:w-5 h-4 sm:h-5" />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900">Expense & Bill Report (.csv)</h4>
                      <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                        All PG operational expenses, bills, and vendor payments with category and account breakdown.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => expenseStore.exportLedgerToCSV(propertyId, activeDateBounds.startDate, activeDateBounds.endDate)}
                      className="w-full py-2.5 px-4 rounded-xl bg-white border border-gray-300 group-hover:border-[#c2652a] group-hover:bg-[#c2652a] group-hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs min-h-[42px] active:scale-95"
                    >
                      <Download className="w-4 h-4" /> Download Expense Report
                    </button>
                  </div>

                  {/* Export Box 5: Security Deposit Custody Report */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-3 sm:space-y-4 hover:border-[#c2652a]/60 hover:bg-orange-50/20 transition-all group">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-4 sm:w-5 h-4 sm:h-5" />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900">Security Deposit Custody (.csv)</h4>
                      <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                        Resident security deposit status list with joining dates, amounts held, and remaining dues.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportDepositRegisterCSV}
                      className="w-full py-2.5 px-4 rounded-xl bg-white border border-gray-300 group-hover:border-[#c2652a] group-hover:bg-[#c2652a] group-hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs min-h-[42px] active:scale-95"
                    >
                      <Download className="w-4 h-4" /> Download Deposit Report
                    </button>
                  </div>

                  {/* Export Box 6: Master Colorful CA Pack (ExcelJS) */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-gray-900 to-[#1e293b] text-white border border-gray-800 flex flex-col justify-between space-y-3 sm:space-y-4 shadow-md group">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-[#c2652a] text-white flex items-center justify-center font-bold shadow-xs">
                          <FileSpreadsheet className="w-4 sm:w-5 h-4 sm:h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                          6 TABS • COLORED
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-white">Full CA Accounts Pack (.xlsx)</h4>
                      <p className="text-[11px] sm:text-xs text-gray-300 leading-relaxed">
                        Presentation-ready workbook with executive KPI banners, rent roll, defaulters, expenses, and deposit escrow.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportFullExcelWorkbook}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[42px] active:scale-95"
                    >
                      <Download className="w-4 h-4" /> Download Colorful Excel (.xlsx)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: BUSINESS & YIELD ANALYTICS                         */}
          {/* ========================================================= */}
          {activeTab === "BUSINESS_ANALYTICS" && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in">
              {/* 1. Core Yield & Cost KPI Bento Grid (2x2 on Mobile, 4 on Desktop) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* KPI 1: ARPB */}
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-gray-200 shadow-xs space-y-2 sm:space-y-3 hover:border-[#c2652a] transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      AVERAGE RENT / BED
                    </span>
                    <div className="p-1.5 sm:p-2 rounded-xl bg-orange-50 text-[#c2652a] shrink-0">
                      <Zap className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-sans font-bold text-lg sm:text-2xl md:text-3xl text-gray-900 tracking-tight truncate">
                      ₹{businessAnalytics.arpb.toLocaleString("en-IN")}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5 line-clamp-2">
                      Average rent earned per occupied bed
                    </p>
                  </div>
                </div>

                {/* KPI 2: CPB */}
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-gray-200 shadow-xs space-y-2 sm:space-y-3 hover:border-amber-400 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      MONTHLY EXPENSE / BED
                    </span>
                    <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50 text-amber-700 shrink-0">
                      <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-sans font-bold text-lg sm:text-2xl md:text-3xl text-amber-900 tracking-tight truncate">
                      ₹{businessAnalytics.cpb.toLocaleString("en-IN")}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-amber-700 font-medium mt-0.5 line-clamp-2">
                      PG running cost per resident this month
                    </p>
                  </div>
                </div>

                {/* KPI 3: Net Profit Margin */}
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-gray-200 shadow-xs space-y-2 sm:space-y-3 hover:border-emerald-400 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      NET PROFIT MARGIN
                    </span>
                    <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                      <TrendingUp className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-sans font-bold text-lg sm:text-2xl md:text-3xl text-emerald-700 tracking-tight truncate">
                      {businessAnalytics.operatingMargin}%
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-emerald-700 font-medium mt-0.5 line-clamp-2">
                      Profit left after paying all PG bills
                    </p>
                  </div>
                </div>

                {/* KPI 4: Bed Occupancy */}
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-gray-200 shadow-xs space-y-2 sm:space-y-3 hover:border-blue-400 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      BED OCCUPANCY
                    </span>
                    <div className="p-1.5 sm:p-2 rounded-xl bg-blue-50 text-blue-700 shrink-0">
                      <Building2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-sans font-bold text-lg sm:text-2xl md:text-3xl text-blue-900 tracking-tight truncate">
                      {businessAnalytics.totalBeds > 0
                        ? ((businessAnalytics.occupiedBeds / businessAnalytics.totalBeds) * 100).toFixed(1)
                        : "0.0"}%
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-blue-700 font-medium mt-0.5 line-clamp-2">
                      {businessAnalytics.occupiedBeds} of {businessAnalytics.totalBeds} beds occupied
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. 6-Month Collections & Occupancy Trend Chart */}
              <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3 sm:pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900">
                      6-Month Collections & Occupancy Trend
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Track how your monthly collections and filled beds are growing over time
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                    businessAnalytics.totalRevenueIntake > 0
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-gray-600 bg-gray-50 border-gray-200"
                  }`}>
                    {businessAnalytics.totalRevenueIntake > 0 ? "📈 Active Trend" : "📊 Baseline Initialized"}
                  </span>
                </div>

                {/* Visual CSS/SVG Interactive Bar Chart */}
                <div className="space-y-3">
                  <div className="grid grid-cols-6 gap-1.5 sm:gap-4 items-end h-52 sm:h-64 pt-6 sm:pt-8 pb-2 border-b border-gray-100">
                    {businessAnalytics.sixMonthTrend.map((item, idx) => {
                      const maxRev = Math.max(...businessAnalytics.sixMonthTrend.map((t) => t.revenue));
                      const heightPct = maxRev > 0 ? Math.max(12, Math.round((item.revenue / maxRev) * 100)) : 6;

                      return (
                        <div key={item.month} className="flex flex-col items-center gap-1.5 sm:gap-2 h-full justify-end group">
                          {/* Tooltip on hover/touch */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[9px] sm:text-[10px] font-bold py-1 px-1.5 sm:px-2 rounded-lg shadow-lg mb-1 whitespace-nowrap pointer-events-none">
                            ₹{(item.revenue / 1000).toFixed(0)}K
                          </div>

                          {/* Bar Graphic */}
                          <div
                            className="w-full max-w-[36px] sm:max-w-[48px] rounded-xl sm:rounded-2xl transition-all duration-500 relative flex items-end justify-center shadow-xs overflow-hidden"
                            style={{
                              height: `${heightPct}%`,
                              backgroundColor: maxRev > 0 && idx === businessAnalytics.sixMonthTrend.length - 1 ? "#c2652a" : "#e2e8f0",
                            }}
                          >
                            <div
                              className="w-full bg-emerald-500/80 rounded-t-lg transition-all"
                              style={{ height: `${item.occupancyPct}%` }}
                            ></div>
                          </div>

                          {/* Month Label */}
                          <span className="text-[10px] sm:text-xs font-bold text-gray-700">{item.month}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-center gap-4 sm:gap-6 pt-2 text-[11px] sm:text-xs font-bold flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-[#c2652a] shrink-0"></span>
                      <span className="text-gray-700">Rent Collected (₹)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0"></span>
                      <span className="text-gray-700">Bed Occupancy (%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Room Sharing Performance Matrix */}
              <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4 border-b border-gray-100 pb-3 sm:pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900">
                      Room Sharing Performance
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      See which room type (Single, 2-Sharing, 3-Sharing) makes the most money
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold sm:hidden">
                    👉 Swipe horizontally to view all
                  </span>
                </div>

                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="min-w-[640px] w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50/50">
                        <th className="py-3 px-4 rounded-l-xl">Room Sharing Type</th>
                        <th className="py-3 px-4 text-center">Total Beds</th>
                        <th className="py-3 px-4 text-center">Occupied Beds</th>
                        <th className="py-3 px-4 text-center">Occupancy %</th>
                        <th className="py-3 px-4 text-right">Average Rent</th>
                        <th className="py-3 px-4 text-right">Total Monthly Earnings</th>
                        <th className="py-3 px-4 text-right rounded-r-xl">Lost Earnings (Empty Beds)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {businessAnalytics.sharingMatrix.map((item) => (
                        <tr key={item.bedCount} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-4 px-4 font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
                            <Layers className="w-4 h-4 text-[#c2652a] shrink-0" />
                            <span>{item.sharingName}</span>
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-gray-700 whitespace-nowrap">
                            {item.totalBeds} Beds
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-[#c2652a] whitespace-nowrap">
                            {item.occupiedBeds}
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[11px] border border-emerald-200">
                              {item.occPct}%
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                            ₹{item.avgRentPerBed.toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            ₹{item.realizedYield.toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                            ₹{item.vacancyLoss.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Payment Mode Breakdown (UPI & Cash Only) */}
              <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 sm:pb-4">
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900">
                    Payment Mode Breakdown
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    How residents paid their rent (Online UPI vs Cash Payments)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-orange-900">Online UPI (PhonePe / GPay / Paytm)</span>
                      <p className="font-sans font-bold text-xl sm:text-2xl text-[#c2652a] mt-1">
                        ₹{businessAnalytics.upiTotal.toLocaleString("en-IN")}
                      </p>
                      <span className="text-xs font-bold text-orange-700">{businessAnalytics.upiPct}% of Total Collections</span>
                    </div>
                    <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 text-[#c2652a] flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs shrink-0">
                      UPI
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-900">Cash Desk (Front Desk Cash)</span>
                      <p className="font-sans font-bold text-xl sm:text-2xl text-emerald-700 mt-1">
                        ₹{businessAnalytics.cashTotal.toLocaleString("en-IN")}
                      </p>
                      <span className="text-xs font-bold text-emerald-700">{businessAnalytics.cashPct}% of Total Collections</span>
                    </div>
                    <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg sm:text-xl shadow-2xs shrink-0">
                      💵
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CUSTOM DATE RANGE FILTER MODAL */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-5 sm:p-8 space-y-5 sm:space-y-6 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#c2652a]" /> Custom Report Timeline
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select exact date range to compile reports and room earnings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomDateModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quick Presets</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const d7 = new Date();
                    d7.setDate(now.getDate() - 7);
                    setCustomStartDate(d7.toISOString().split("T")[0]);
                    setCustomEndDate(now.toISOString().split("T")[0]);
                  }}
                  className="py-2 px-2 rounded-xl border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/50 text-[11px] font-bold text-gray-700 text-center transition-all cursor-pointer min-h-[38px]"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const d30 = new Date();
                    d30.setDate(now.getDate() - 30);
                    setCustomStartDate(d30.toISOString().split("T")[0]);
                    setCustomEndDate(now.toISOString().split("T")[0]);
                  }}
                  className="py-2 px-2 rounded-xl border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/50 text-[11px] font-bold text-gray-700 text-center transition-all cursor-pointer min-h-[38px]"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const d90 = new Date();
                    d90.setDate(now.getDate() - 90);
                    setCustomStartDate(d90.toISOString().split("T")[0]);
                    setCustomEndDate(now.toISOString().split("T")[0]);
                  }}
                  className="py-2 px-2 rounded-xl border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/50 text-[11px] font-bold text-gray-700 text-center transition-all cursor-pointer min-h-[38px]"
                >
                  Last 90 Days
                </button>
              </div>
            </div>

            {/* Custom Date Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customStartDate > customEndDate) {
                  alert("⚠️ Start Date cannot be after End Date.");
                  return;
                }
                setSelectedTimelineFilter("CUSTOM");
                setShowCustomDateModal(false);
                triggerToast(`📅 Report window applied: ${customStartDate} to ${customEndDate}`);
              }}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Start Date (From) *
                  </label>
                  <input
                    type="date"
                    required
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] font-sans font-semibold text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    End Date (To) *
                  </label>
                  <input
                    type="date"
                    required
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] font-sans font-semibold text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 sm:gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCustomDateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer min-h-[42px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 sm:px-6 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold shadow-md cursor-pointer active:scale-95 transition-all min-h-[42px]"
                >
                  Apply Window ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Luxury Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#201a17] text-white px-4 sm:px-5 py-3.5 rounded-2xl shadow-2xl border border-[#c2652a]/40 flex items-center gap-3 max-w-md text-xs font-bold">
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
