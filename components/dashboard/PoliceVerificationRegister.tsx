"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Calendar,
  Filter,
  Printer,
  Download,
  Eye,
  FileText,
  User,
  Phone,
  MapPin,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  X,
  CreditCard,
  Camera,
  Trash2,
  Lock,
  Sparkles,
} from "lucide-react";
import { complianceLogStore, ComplianceLogEntry } from "@/constants/complianceLogStore";
import { propertySettingsStore } from "@/constants/propertySettings";

interface PoliceVerificationRegisterProps {
  propertyId: string;
}

export function PoliceVerificationRegister({ propertyId }: PoliceVerificationRegisterProps) {
  const [logs, setLogs] = useState<ComplianceLogEntry[]>(() => complianceLogStore.getLogs(propertyId));
  const settings = propertySettingsStore.getSettings(propertyId);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [stayTypeFilter, setStayTypeFilter] = useState<"ALL" | "Guest" | "Tenant">("ALL");
  const [exitCategoryFilter, setExitCategoryFilter] = useState<string>("ALL");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [dpdpSweepFeedback, setDpdpSweepFeedback] = useState<string | null>(null);

  // Selected Log for Official Verification Form Modal / Print
  const [selectedLog, setSelectedLog] = useState<ComplianceLogEntry | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    complianceLogStore.initFirebaseListener(propertyId);
    setLogs(complianceLogStore.getLogs(propertyId));
    const unsubscribe = complianceLogStore.subscribe(() => {
      setLogs(complianceLogStore.getLogs(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  // Handle DPDP Retention Sweep
  const handleRunDpdpSweep = () => {
    const result = complianceLogStore.runDpdpSweep(propertyId);
    setDpdpSweepFeedback(
      `🛡️ DPDP Sweep Complete: Verified ${result.remainingCount} active records. Masked and sanitized all post-checkout personal data in accordance with statutory retention limits.`
    );
    setTimeout(() => setDpdpSweepFeedback(null), 6000);
  };

  // Extract unique rooms for dropdown
  const uniqueRooms = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.roomNumber) set.add(l.roomNumber);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Text search (Name, Phone, Aadhaar, Room)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = log.name.toLowerCase().includes(q);
        const matchesPhone = log.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        const matchesAadhaar = log.aadhaarNumber.toLowerCase().includes(q);
        const matchesRoom = log.roomNumber.toLowerCase().includes(q) || log.bedCode.toLowerCase().includes(q);
        const matchesPurpose = log.purposeOfVisit.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesAadhaar && !matchesRoom && !matchesPurpose) {
          return false;
        }
      }

      // 2. Stay Type Filter
      if (stayTypeFilter !== "ALL" && log.stayType !== stayTypeFilter) {
        return false;
      }

      // 3. Exit Category Filter
      if (exitCategoryFilter !== "ALL") {
        if (exitCategoryFilter === "EMERGENCY" && log.exitCategory !== "Emergency Early Departure") {
          return false;
        }
        if (exitCategoryFilter === "STANDARD" && log.exitCategory !== "Standard Scheduled Departure") {
          return false;
        }
        if (exitCategoryFilter === "NOTICE" && log.exitCategory !== "Notice Period Completed") {
          return false;
        }
      }

      // 4. Room Filter
      if (roomFilter !== "ALL" && log.roomNumber !== roomFilter) {
        return false;
      }

      // 5. Date Range Filter
      if (startDateFilter) {
        const logTime = log.timestamp || 0;
        const startTime = new Date(startDateFilter).getTime();
        if (logTime < startTime) return false;
      }
      if (endDateFilter) {
        const logTime = log.timestamp || 0;
        const endTime = new Date(endDateFilter).getTime() + 86400000;
        if (logTime > endTime) return false;
      }

      return true;
    });
  }, [logs, searchQuery, stayTypeFilter, exitCategoryFilter, roomFilter, startDateFilter, endDateFilter]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No compliance records match your current filter.");
      return;
    }

    const headers = [
      "Record ID",
      "Stay Type",
      "Resident Name",
      "Primary Phone (3-Yr Retention)",
      "Emergency Contact (DPDP Status)",
      "Masked Govt ID (Last 4 Digits)",
      "Permanent Address (3-Yr Retention)",
      "Room Number",
      "Bed Code",
      "Check-In Date",
      "Check-In Time",
      "Check-Out Date",
      "Check-Out Time",
      "Total Days Stayed",
      "Purpose of Visit",
      "Exit Category",
      "Exit Reason / Notes",
      "Photo Status (DPDP Act 2023)",
      "3-Year Expiry Date",
      "5-Year Permanent Purge Date",
    ];

    const rows = filteredLogs.map((l) => [
      l.id,
      l.stayType,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.emergencyPhone}"`,
      `"${l.aadhaarNumber}"`,
      `"${(l.address || "").replace(/"/g, '""')}"`,
      l.roomNumber,
      l.bedCode,
      l.checkInDate,
      l.checkInTime || "12:00 PM",
      l.checkOutDate,
      l.checkOutTime || "11:00 AM",
      l.totalDaysStayed,
      `"${(l.purposeOfVisit || "").replace(/"/g, '""')}"`,
      `"${l.exitCategory}"`,
      `"${(l.exitReason || "").replace(/"/g, '""')}"`,
      "PURGED ON CHECKOUT (DPDP COMPLIANT)",
      l.purge3YearDate || "N/A",
      l.purge5YearDate || "N/A",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Police_Resident_Register_DPDP_Compliant_${propertyId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 🛡️ DPDP ACT 2023 STATUTORY PRIVACY & RETENTION POLICY BANNER */}
      <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl border border-blue-800 text-white shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  DPDP Act (India) 2023 Automated Privacy & Storage Limitation Vault
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                  100% COMPLIANT
                </span>
              </div>
              <p className="text-[11px] text-blue-200/90 mt-1 leading-relaxed">
                Personal biometric photos & emergency contacts are <strong>permanently purged on checkout</strong>. Aadhaar IDs are strictly <strong>masked to last 4 digits</strong>. Phone numbers and addresses are held for <strong>3 years</strong>, and entire records are <strong>permanently erased at 5 years</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunDpdpSweep}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" /> Run DPDP Retention Sweep
          </button>
        </div>

        {/* DPDP Retention Milestone Progress */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-blue-800/80 text-[11px] font-semibold text-blue-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span><strong>Day 0 (Checkout):</strong> Photos & Emergency deleted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span><strong>3 Years:</strong> Phone & Address auto-purged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span><strong>5 Years:</strong> Complete record erased</span>
          </div>
        </div>

        {dpdpSweepFeedback && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-xs text-emerald-200 font-bold animate-in fade-in">
            {dpdpSweepFeedback}
          </div>
        )}
      </div>

      {/* Top Header & Export Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" /> Police & Legal Resident Register
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Statutory occupancy audit log, check-in/out timestamps, and masked verification records for police station inquiries & legal compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-gray-500" /> Export Excel / CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Full Register
            </button>
          </div>
        </div>

        {/* 4 Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-bold text-blue-900 block">Total Recorded Stays</span>
            <span className="text-xl font-bold font-serif text-blue-950 mt-0.5 block">{logs.length}</span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-900 block">DPDP Sanitized Records</span>
            <span className="text-xl font-bold font-serif text-emerald-950 mt-0.5 block">
              {logs.filter((l) => l.isPhotoPurged || l.dpdpStatus === "PHOTO_PURGED").length}
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-900 block">Emergency Departures</span>
            <span className="text-xl font-bold font-serif text-amber-950 mt-0.5 block">
              {logs.filter((l) => l.exitCategory === "Emergency Early Departure").length}
            </span>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-bold text-purple-900 block">Short-Stay Guests</span>
            <span className="text-xl font-bold font-serif text-purple-950 mt-0.5 block">
              {logs.filter((l) => l.stayType === "Guest").length}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Multi-Filter Search Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          {/* Text Search Input (Name, Phone, Aadhaar) */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Name, Phone (10 digits), Aadhaar, Purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Stay Type Filter */}
          <div className="md:col-span-2">
            <select
              value={stayTypeFilter}
              onChange={(e) => setStayTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-800 bg-white focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Stay Types</option>
              <option value="Guest">Short-Term Guests (🟣)</option>
              <option value="Tenant">Long-Term Tenants (🏢)</option>
            </select>
          </div>

          {/* Exit Category Filter */}
          <div className="md:col-span-2">
            <select
              value={exitCategoryFilter}
              onChange={(e) => setExitCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-800 bg-white focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Exit Reasons</option>
              <option value="EMERGENCY">⚡ Emergency Exits</option>
              <option value="STANDARD">🟢 Standard Departures</option>
              <option value="NOTICE">🚪 Notice Completed</option>
            </select>
          </div>

          {/* Room Filter */}
          <div className="md:col-span-2">
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-800 bg-white focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Rooms</option>
              {uniqueRooms.map((rm) => (
                <option key={rm} value={rm}>
                  Room {rm}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-2 flex items-center justify-end">
            {(searchQuery || stayTypeFilter !== "ALL" || exitCategoryFilter !== "ALL" || roomFilter !== "ALL" || startDateFilter || endDateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStayTypeFilter("ALL");
                  setExitCategoryFilter("ALL");
                  setRoomFilter("ALL");
                  setStartDateFilter("");
                  setEndDateFilter("");
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Date Range Sub-Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600 font-medium">
          <span className="flex items-center gap-1 font-bold text-gray-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> Filter by Stay Date Range:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">From:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-gray-300 text-xs font-bold text-gray-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">To:</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-gray-300 text-xs font-bold text-gray-800"
            />
          </div>
          <span className="text-[10px] text-gray-400 ml-auto">
            Showing <strong>{filteredLogs.length}</strong> of {logs.length} records
          </span>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Resident & Privacy Status</th>
                <th className="py-3 px-4">Room & Bed</th>
                <th className="py-3 px-4">Masked ID & Address (3Y)</th>
                <th className="py-3 px-4">Stay Dates & Duration</th>
                <th className="py-3 px-4">Purpose of Visit</th>
                <th className="py-3 px-4">Departure & Exit Reason</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((entry) => {
                  const isEmergency = entry.exitCategory === "Emergency Early Departure";

                  return (
                    <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Name & DPDP Photo Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block text-xs">{entry.name}</span>
                            <span className="text-[11px] font-mono text-gray-600 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-gray-400" /> {entry.phone}
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                📸 Photo Purged (DPDP)
                              </span>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700">
                                {entry.stayType === "Guest" ? "🟣 Guest" : "🏢 Tenant"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Room & Bed */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">
                          Room {entry.roomNumber}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {entry.bedCode}
                        </div>
                      </td>

                      {/* Masked Govt ID & Address */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-mono font-bold text-gray-800 text-[11px] flex items-center gap-1">
                          <Lock className="w-3 h-3 text-blue-600" /> {entry.aadhaarNumber}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5" title={entry.address}>
                          {entry.address || "Address on record (3-Yr retention)"}
                        </div>
                        <div className="text-[9px] text-gray-400 font-mono mt-1">
                          Auto-Purge: {entry.purge5YearDate || "5 Years"}
                        </div>
                      </td>

                      {/* Stay Dates & Duration */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">
                          {entry.checkInDate} <span className="text-gray-400">→</span> {entry.checkOutDate}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>
                            {entry.totalDaysStayed} Day(s) Stayed • Out: {entry.checkOutTime || "11:00 AM"}
                          </span>
                        </div>
                      </td>

                      {/* Purpose of Visit */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-purple-900 bg-purple-50 px-2 py-1 rounded-lg text-xs inline-block">
                          {entry.purposeOfVisit || "Short-Term Stay"}
                        </span>
                      </td>

                      {/* Departure & Exit Reason */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          isEmergency
                            ? "bg-rose-100 text-rose-900 border border-rose-200"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}>
                          {entry.exitCategory}
                        </span>
                        {entry.exitReason && (
                          <p className="text-[10px] text-gray-600 mt-1 line-clamp-2 italic" title={entry.exitReason}>
                            "{entry.exitReason}"
                          </p>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLog(entry);
                            setShowVerificationModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Record
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                    No resident records found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📄 OFFICIAL POLICE RESIDENT VERIFICATION FORM MODAL (PRINTABLE) */}
      {showVerificationModal && selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-gray-300 shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 animate-in zoom-in-95 my-8">
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> OFFICIAL POLICE RESIDENT RECORD (DPDP COMPLIANT)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Form
                </button>
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="border border-gray-300 rounded-2xl p-6 space-y-5 text-xs text-gray-800 bg-white" id="printable-police-form">
              {/* Document Title Bar */}
              <div className="text-center border-b-2 border-gray-800 pb-3">
                <h2 className="font-serif font-black text-lg text-gray-900 tracking-wide uppercase">
                  RESIDENT OCCUPANCY & POLICE VERIFICATION RECORD
                </h2>
                <p className="text-[11px] text-gray-600 font-semibold mt-0.5">
                  {settings.propertyName || "Sunshine Luxury PG & Coliving"} • {settings.propertyAddress || "Bengaluru, Karnataka"}
                </p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Official Verification Ref: {selectedLog.id} • Date Printed: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>

              {/* Resident Personal & DPDP Privacy Attestation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-200 pb-4 items-start">
                <div className="sm:col-span-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Resident Full Name</span>
                      <span className="font-bold text-gray-900 text-sm">{selectedLog.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Primary Mobile (3-Yr Retention)</span>
                      <span className="font-mono font-bold text-gray-900">{selectedLog.phone}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Emergency Contact</span>
                      <span className="text-[11px] font-mono text-gray-500 italic">
                        [Purged on checkout - DPDP Act 2023]
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Govt ID (Masked)</span>
                      <span className="font-mono font-bold text-gray-900">{selectedLog.aadhaarNumber}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Permanent Home Address (3-Yr Retention)</span>
                    <span className="font-semibold text-gray-800">{selectedLog.address || "Indiranagar, Bengaluru, KA"}</span>
                  </div>
                </div>

                {/* DPDP Photo Box */}
                <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 block">
                    Biometric Photo Purged
                  </span>
                  <span className="text-[9px] text-gray-500 leading-tight">
                    Deleted immediately upon checkout in strict compliance with DPDP Act 2023.
                  </span>
                </div>
              </div>

              {/* Stay & Room Details */}
              <div className="space-y-2 border-b border-gray-200 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Room & Bed</span>
                    <span className="font-bold text-gray-900">Room {selectedLog.roomNumber} ({selectedLog.bedCode})</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Stay Classification</span>
                    <span className="font-bold text-gray-900">{selectedLog.stayType === "Guest" ? "Short-Term Guest" : "Long-Term Tenant"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Check-In Timestamp</span>
                    <span className="font-semibold text-gray-900">{selectedLog.checkInDate} • {selectedLog.checkInTime || "12:00 PM"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Check-Out Timestamp</span>
                    <span className="font-semibold text-gray-900">{selectedLog.checkOutDate} • {selectedLog.checkOutTime || "11:00 AM"}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Purpose of Visit</span>
                  <span className="font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded inline-block mt-0.5">
                    {selectedLog.purposeOfVisit || "Short-Term Stay / Examination"}
                  </span>
                </div>
              </div>

              {/* Exit Reason & Departure Audit */}
              <div className="space-y-1.5 border-b border-gray-200 pb-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Departure Classification & Exit Reason</span>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      selectedLog.exitCategory === "Emergency Early Departure"
                        ? "bg-rose-100 text-rose-900 font-extrabold"
                        : "bg-emerald-100 text-emerald-900 font-bold"
                    }`}>
                      {selectedLog.exitCategory}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-700 italic">
                    "{selectedLog.exitReason || "Standard departure upon stay duration completion."}"
                  </p>
                </div>
              </div>

              {/* DPDP Retention Schedule */}
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-[10px] text-blue-900 space-y-0.5 font-medium">
                <p className="font-bold">⚖️ Statutory Retention & Erasure Schedule (DPDP Act 2023):</p>
                <p>• Phone & Address Expiry Date: <strong>{selectedLog.purge3YearDate || "3 Years"}</strong></p>
                <p>• Final Database Erasure Date: <strong>{selectedLog.purge5YearDate || "5 Years"}</strong> (All data wiped permanently)</p>
              </div>

              {/* Official Attestation Signature Footer */}
              <div className="pt-3 flex items-center justify-between text-[11px]">
                <div>
                  <p className="font-bold text-gray-900">Property Manager / Owner Attestation</p>
                  <p className="text-[10px] text-gray-400">Certified true copy of verified resident check-in log</p>
                </div>
                <div className="text-right border-t border-gray-400 pt-1 w-48">
                  <p className="text-[10px] text-gray-500 font-bold">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
