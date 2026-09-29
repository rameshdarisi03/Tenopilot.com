"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Globe,
  RotateCcw,
  User,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Building,
  Bed,
  PhoneCall,
  Clock,
  Layers,
} from "lucide-react";
import { useAiCopilotStore } from "@/lib/aiCopilotStore";
import { useVoiceRecognition, INDIAN_LANGUAGES } from "@/hooks/useVoiceRecognition";
import { occupantStore } from "@/constants/mockOccupants";
import { propertySettingsStore } from "@/constants/propertySettings";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { getPropertyComplaints, subscribeToComplaints } from "@/lib/complaintStore";
import { expenseStore } from "@/constants/expenseStore";
import { isMockOccupantId } from "@/lib/firestoreService";
import { CopilotPropertySnapshot, CopilotApiResponse } from "@/lib/aiCopilotPrompt";
import { tryFastClientQuery } from "@/lib/aiFastQueryEngine";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  actionType?: string;
  actionPayload?: any;
  suggestedChips?: string[];
  timestamp: string;
}

const STARTER_PROMPTS = [
  { icon: "⚡", label: "Unpaid Rent", prompt: "Who has not paid rent this month?" },
  { icon: "👥", label: "Joined Today", prompt: "Who joined today or recently?" },
  { icon: "⚠️", label: "Open Complaints", prompt: "What are the most common complaints?" },
  { icon: "💳", label: "Monthly Expenses", prompt: "How much did we spend on expenses this month?" },
  { icon: "📊", label: "Room Attrition", prompt: "What is our room attrition and turnover rate?" },
  { icon: "🛏️", label: "Vacant Beds", prompt: "Which rooms have vacant beds right now?" },
];

export function PropertyAiCopilotDrawer({ propertyId }: { propertyId: string }) {
  const { isOpen, initialQuery, autoStartMic, closeCopilot } = useAiCopilotStore();

  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice Recognition Hook
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported: speechSupported,
    selectedLanguage,
    changeLanguage,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  // Selected language object
  const activeLang =
    INDIAN_LANGUAGES.find((l) => l.code === selectedLanguage) || INDIAN_LANGUAGES[0];

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isListening]);

  // Handle open with initial query or auto-mic
  useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setInputQuery(initialQuery);
        handleSendQuery(initialQuery);
      } else if (autoStartMic) {
        setTimeout(() => {
          startListening();
        }, 300);
      } else {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      }
    }
  }, [isOpen, initialQuery, autoStartMic]);

  // Sync voice transcript to input bar
  useEffect(() => {
    if (transcript) {
      setInputQuery(transcript);
    }
  }, [transcript]);

  // Auto-send when speech recognition finishes with a non-empty transcript
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 3) {
      const finalSaid = transcript.trim();
      resetTranscript();
      handleSendQuery(finalSaid);
    }
  }, [isListening, transcript]);

  // Real-time synchronization for complaints & expenses
  useEffect(() => {
    if (!propertyId) return;
    expenseStore.initPropertyFirebase(propertyId);
    propertyStore.initFirebaseListener(propertyId);
    const unsubComplaints = subscribeToComplaints(propertyId, () => {});
    return () => {
      unsubComplaints();
    };
  }, [propertyId]);

  // Assemble real-time property snapshot strictly from genuine client SSOT stores
  const assembleLiveSnapshot = (): CopilotPropertySnapshot => {
    const rawOccupants = occupantStore.getOccupants(propertyId) || [];
    // Strictly isolate genuine tenants from legacy mock/demo templates
    const genuineOccupants = rawOccupants.filter((o) => !isMockOccupantId(o.id));
    const occupants = genuineOccupants.length > 0 ? genuineOccupants : rawOccupants;

    const settings = propertySettingsStore.getSettings(propertyId);
    const floors = propertyStore.getStructure(propertyId) || [];
    const complaints = getPropertyComplaints(propertyId) || [];
    const expenses = expenseStore.getExpenses(propertyId) || [];

    // Calculate real physical layout metrics
    let totalBeds = 0;
    let occupiedBeds = 0;
    let totalBedsConfigured = false;
    const vacantRooms: Array<{
      roomNumber: string;
      floorName?: string;
      sharingType: number;
      vacantBedsCount: number;
      vacantBedCodes?: string[];
    }> = [];

    if (floors && floors.length > 0) {
      totalBedsConfigured = true;
      floors.forEach((floor) => {
        (floor.rooms || []).forEach((room) => {
          const beds = room.beds || [];
          totalBeds += beds.length;
          const occBeds = beds.filter((b) => b.status === "Occupied").length;
          occupiedBeds += occBeds;
          const vacBeds = beds.filter((b) => b.status === "Available" || !b.status);
          if (vacBeds.length > 0) {
            vacantRooms.push({
              roomNumber: room.roomNumber,
              floorName: floor.floorName,
              sharingType: room.sharingType || beds.length,
              vacantBedsCount: vacBeds.length,
              vacantBedCodes: vacBeds.map((b) => b.bedCode || b.id).filter(Boolean),
            });
          }
        });
      });
    }

    const activeOccupants = occupants.filter(
      (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
    );

    // If layout is unconfigured, truthfully reflect active occupants rather than guessing numbers
    if (!totalBedsConfigured) {
      totalBeds = activeOccupants.length;
      occupiedBeds = activeOccupants.length;
    }

    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Real financial calculation
    const totalExpectedRent = activeOccupants.reduce((acc, cur) => acc + (cur.rentAmount || 0), 0);
    const defaulters = activeOccupants.filter((o) => {
      const isUnpaid = o.paymentStatus !== "Paid";
      const hasDues = (o.rentAmount || 0) > 0 || (o.arrearsBalance || 0) > 0;
      return isUnpaid && hasDues;
    });
    const totalPendingDues = defaulters.reduce(
      (acc, cur) => acc + (cur.rentAmount || 0) + (cur.arrearsBalance || 0),
      0
    );

    return {
      propertyId,
      propertyName: settings?.propertyName || "My PG Property",
      city: settings?.propertyAddress || "India",
      currentDateAnchor: new Date().toISOString().split("T")[0],
      totalBeds,
      totalBedsConfigured,
      occupiedBeds,
      vacantBeds,
      occupancyRatePercentage: occupancyRate,
      occupants: occupants.map((o) => ({
        id: o.id,
        name: o.name,
        phone: o.phone,
        stayType: o.stayType || "Tenant",
        roomNumber: o.roomNumber,
        bedCode: o.bedCode,
        rentAmount: o.rentAmount || 0,
        paymentStatus: o.paymentStatus || "Due",
        lifecycleStatus: o.lifecycleStatus || "Active",
        joiningDate: o.joiningDate,
        vacatingDate: o.vacatingDate,
        daysRemainingText: o.daysRemainingText,
        depositAmount: (o as any).depositAmount || o.securityDeposit || 0,
        arrearsBalance: o.arrearsBalance || 0,
        kycVerified: Boolean(o.kycVerified),
        aadhaarNumber: o.aadhaarNumber || "",
        hasKycDocs: Boolean(o.kycDocs?.aadhaarFrontUrl || o.kycDocs?.aadhaarPdfUrl),
        emergencyContact:
          typeof o.emergencyContact === "object" && o.emergencyContact
            ? `${(o.emergencyContact as any).name || ""} (${(o.emergencyContact as any).relation || ""}: ${(o.emergencyContact as any).phone || ""})`
            : typeof o.emergencyContact === "string"
            ? o.emergencyContact
            : (o as any).guardianPhone || "",
      })),
      complaints: complaints.map((c) => ({
        id: c.id,
        complaintNumber: c.complaintNumber || c.id,
        tenantName: c.tenantName || "Tenant",
        tenantPhone: c.tenantPhone || "",
        roomNumber: c.roomNumber || "",
        category: c.category || "General",
        title: c.title || "",
        status: c.status || "OPEN",
        createdAt: c.createdAt || new Date().toISOString(),
        description: c.description || "",
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        category: e.category || "General",
        amount: Number(e.amount) || 0,
        date: e.date || e.createdAt || "",
        paidFrom: e.paidFrom || "Business Account",
        notes: e.notes || "",
      })),
      financials: {
        totalExpectedRent,
        totalCollectedRent: Math.max(0, totalExpectedRent - totalPendingDues),
        totalPendingDues,
      },
      vacantRooms,
    };
  };

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    stopListening();
    setInputQuery("");
    resetTranscript();

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const snapshot = assembleLiveSnapshot();

      // ⚡ TIER 1: Ultra-fast sub-50ms instant resolution for common queries
      const fastResult = tryFastClientQuery(textToSend, snapshot, selectedLanguage);
      if (fastResult) {
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          sender: "ai",
          text: fastResult.answer,
          actionType: fastResult.actionType,
          actionPayload: fastResult.actionPayload,
          suggestedChips: fastResult.suggestedChips,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsLoading(false);
        return; // Complete in < 50ms with zero server delay!
      }

      // 🧠 TIER 2: Deep reasoning via optimized Gemini Flash waterfall
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          question: textToSend,
          language: selectedLanguage,
          liveSnapshot: snapshot,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const aiData: CopilotApiResponse = json.data;
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          sender: "ai",
          text: aiData.answer || "Here are the live insights for your property.",
          actionType: aiData.actionType,
          actionPayload: aiData.actionPayload,
          suggestedChips: aiData.suggestedChips,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-err`,
          sender: "ai",
          text: json.message || "I could not retrieve live insights right now. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: "ai",
        text: "Network or server connection error. Please verify your connection.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const constructWhatsAppRentReminder = (tenantName: string, room: string, amount: number, phone: string) => {
    const settings = propertySettingsStore.getSettings(propertyId);
    const propName = settings?.propertyName || "TenoPilot PG";
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);

    const message = `Dear ${tenantName},\n\nThis is a friendly reminder from *${propName}* regarding your pending rent due of *₹${amount.toLocaleString(
      "en-IN"
    )}* for Room ${room}.\n\nKindly clear it at your earliest convenience via UPI or at the reception desk.\n\nThank you!\nManagement, ${propName}`;

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={closeCopilot} />

      {/* Main Slide-Over Drawer */}
      <div className="relative w-full max-w-lg h-full bg-[#fcfaf7] shadow-2xl flex flex-col z-10 border-l border-[#c2652a]/20 animate-in slide-in-from-right duration-300">
        
        {/* 1. Header Bar */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-gray-200/80 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c2652a] via-[#b85b20] to-[#964407] flex items-center justify-center text-white shadow-sm shadow-[#c2652a]/30">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">TenoPilot AI Copilot</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  Live DB
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Ask via Voice or Text in 7 Languages</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 1-Tap Language Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/90 text-[#c2652a] border border-amber-200/90 text-xs font-bold transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{activeLang.nativeLabel}</span>
                <ChevronDown className="w-3 h-3 text-[#c2652a]" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white border border-gray-200 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    Select Voice Language
                  </div>
                  {INDIAN_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        changeLanguage(lang.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-amber-50/80 transition-colors cursor-pointer ${
                        selectedLanguage === lang.code
                          ? "bg-amber-50 text-[#c2652a] font-bold"
                          : "text-gray-700"
                      }`}
                    >
                      <span>{lang.nativeLabel}</span>
                      <span className="text-[10px] text-gray-400 font-normal">({lang.label})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={closeCopilot}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Messages & Content Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          
          {/* Welcome Intro Card */}
          {messages.length === 0 && (
            <div className="p-4 rounded-2xl bg-white border border-[#c2652a]/20 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#c2652a] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Namaste! How can I help today?</h4>
                  <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">
                    I have live access to your tenants, rent dues, vacant beds, and complaints. Ask me anything by speaking or typing.
                  </p>
                </div>
              </div>

              {/* Starter Chips */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Popular Questions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_PROMPTS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendQuery(chip.prompt)}
                      className="px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-amber-50 text-gray-700 hover:text-[#c2652a] border border-gray-200/80 hover:border-amber-300 font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <span>{chip.icon}</span>
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 space-y-2.5 leading-relaxed shadow-xs ${
                  msg.sender === "user"
                    ? "bg-[#c2652a] text-white rounded-br-xs font-medium"
                    : "bg-white border border-gray-200/90 text-gray-800 rounded-bl-xs"
                }`}
              >
                <div className="whitespace-pre-line text-xs font-normal">{msg.text}</div>

                {/* ACTION CARDS RENDERING */}
                {msg.sender === "ai" && msg.actionType && msg.actionPayload && (
                  <div className="pt-1.5 border-t border-gray-100">
                    
                    {/* A. UNPAID TENANTS CARD */}
                    {msg.actionType === "UNPAID_TENANTS" && Array.isArray(msg.actionPayload) && (
                      msg.actionPayload.length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                          <span>✅</span>
                          <span>All active tenants have cleared their rent. Zero dues pending!</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center justify-between">
                            <span>Pending Defaulters ({msg.actionPayload.length})</span>
                            <span>
                              Total: ₹
                              {msg.actionPayload
                                .reduce((a: number, c: any) => a + (Number(c.dueAmount) || 0), 0)
                                .toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                            {msg.actionPayload.map((tenant: any, i: number) => {
                              const rawOccupants = occupantStore.getOccupants(propertyId) || [];
                              const tenantId =
                                tenant.occupantId ||
                                tenant.id ||
                                rawOccupants.find(
                                  (o) => o.name?.toLowerCase().trim() === tenant.name?.toLowerCase().trim()
                                )?.id;

                              return (
                                <div
                                  key={i}
                                  className="p-2.5 rounded-xl bg-white hover:bg-amber-50/40 border border-gray-200/90 hover:border-amber-300 flex items-center justify-between gap-2 shadow-xs transition-colors"
                                >
                                  {/* Clickable Profile Info */}
                                  {tenantId ? (
                                    <Link
                                      href={`/p/${propertyId}/tenants/${tenantId}`}
                                      onClick={() => closeCopilot()}
                                      className="min-w-0 flex-1 group cursor-pointer"
                                      title="Open Tenant Profile"
                                    >
                                      <div className="font-bold text-gray-900 text-xs truncate group-hover:text-[#c2652a] flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        <span className="truncate">{tenant.name}</span>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#c2652a] group-hover:translate-x-0.5 transition-transform shrink-0" />
                                      </div>
                                      <div className="text-[11px] text-gray-500 mt-0.5">
                                        Room {tenant.room} • Due:{" "}
                                        <span className="font-bold text-rose-600">
                                          ₹{Number(tenant.dueAmount || 0).toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                    </Link>
                                  ) : (
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-gray-900 text-xs truncate">
                                        {tenant.name}
                                      </div>
                                      <div className="text-[11px] text-gray-500 mt-0.5">
                                        Room {tenant.room} • Due:{" "}
                                        <span className="font-bold text-rose-600">
                                          ₹{Number(tenant.dueAmount || 0).toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* 1-Tap WhatsApp Reminder */}
                                  {tenant.phone ? (
                                    <a
                                      href={constructWhatsAppRentReminder(
                                        tenant.name,
                                        tenant.room,
                                        tenant.dueAmount,
                                        tenant.phone
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors shrink-0"
                                    >
                                      <span>💬 WhatsApp</span>
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">No phone</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}

                    {/* B. VACANT ROOMS CARD */}
                    {msg.actionType === "VACANT_ROOMS" && Array.isArray(msg.actionPayload) && (
                      msg.actionPayload.length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                          <span>✅</span>
                          <span>Zero vacancies. All configured rooms and beds are 100% occupied!</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                            <span>Vacant Rooms Available ({msg.actionPayload.length})</span>
                            <span className="text-[10px] text-emerald-700 font-semibold">Tap to view map →</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                            {msg.actionPayload.map((r: any, i: number) => (
                              <Link
                                key={i}
                                href={`/p/${propertyId}/property-map`}
                                onClick={() => closeCopilot()}
                                className="p-2.5 rounded-xl bg-white hover:bg-emerald-50/50 border border-gray-200/90 hover:border-emerald-300 text-left transition-all group cursor-pointer shadow-xs active:scale-[0.98]"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-gray-900 text-xs group-hover:text-emerald-800">
                                    Room {r.roomNumber}
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                  {r.vacantBeds} Bed(s) Vacant
                                </div>
                                {r.floor && <div className="text-[9px] text-gray-400">{r.floor}</div>}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )
                    )}

                    {/* C. OPEN COMPLAINTS CARD */}
                    {msg.actionType === "OPEN_COMPLAINTS" && Array.isArray(msg.actionPayload) && (
                      msg.actionPayload.length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                          <span>✅</span>
                          <span>Zero open complaints. All maintenance is up to date!</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200 flex items-center justify-between">
                            <span>Open Complaints ({msg.actionPayload.length})</span>
                            <Link
                              href={`/p/${propertyId}/complaints`}
                              onClick={() => closeCopilot()}
                              className="text-[10px] text-rose-700 underline font-bold"
                            >
                              View All →
                            </Link>
                          </div>
                          <div className="space-y-1.5 max-h-52 overflow-y-auto">
                            {msg.actionPayload.map((c: any, i: number) => (
                              <Link
                                key={i}
                                href={`/p/${propertyId}/complaints`}
                                onClick={() => closeCopilot()}
                                className="p-2.5 rounded-xl bg-white hover:bg-rose-50/40 border border-gray-200/90 hover:border-rose-300 block transition-all group cursor-pointer shadow-xs active:scale-[0.99]"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-gray-900 text-xs truncate group-hover:text-rose-800">
                                    {c.title || c.category}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0">
                                    {c.category}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                                  <span>Room {c.roomNumber}</span>
                                  <span className="text-rose-700 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                    Open ticket →
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )
                    )}

                    {/* D. ATTRITION METRICS CARD */}
                    {msg.actionType === "ATTRITION_METRICS" && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 space-y-2 text-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">Est. Attrition Rate</span>
                          <span className="text-base font-extrabold text-[#c2652a]">
                            {msg.actionPayload.attritionRate || "0.0%"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-amber-200/60">
                          <Link
                            href={`/p/${propertyId}/tenants`}
                            onClick={() => closeCopilot()}
                            className="p-2 rounded-lg bg-white/70 hover:bg-white border border-amber-200/60 transition-colors block group cursor-pointer"
                          >
                            <span className="text-gray-500 text-[10px] block">Past Vacated</span>
                            <span className="font-bold text-gray-900 flex items-center justify-between">
                              <span>{msg.actionPayload.exitsCount || 0}</span>
                              <ChevronRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </Link>
                          <Link
                            href={`/p/${propertyId}/tenants`}
                            onClick={() => closeCopilot()}
                            className="p-2 rounded-lg bg-white/70 hover:bg-white border border-amber-200/60 transition-colors block group cursor-pointer"
                          >
                            <span className="text-gray-500 text-[10px] block">On Notice (Leaving)</span>
                            <span className="font-bold text-amber-700 flex items-center justify-between">
                              <span>{msg.actionPayload.onNoticeCount || 0}</span>
                              <ChevronRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* E. NEW CHECKINS CARD */}
                    {msg.actionType === "NEW_CHECKINS" && Array.isArray(msg.actionPayload) && (
                      msg.actionPayload.length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium flex items-center gap-2">
                          <span>ℹ️</span>
                          <span>No new tenants checked in today.</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                            <span>Recent Check-Ins ({msg.actionPayload.length})</span>
                            <span className="text-[10px] text-emerald-700 font-semibold">Tap to view profile →</span>
                          </div>
                          <div className="space-y-1">
                            {msg.actionPayload.map((chk: any, i: number) => {
                              const rawOccupants = occupantStore.getOccupants(propertyId) || [];
                              const tenantId =
                                chk.occupantId ||
                                chk.id ||
                                rawOccupants.find(
                                  (o) => o.name?.toLowerCase().trim() === chk.name?.toLowerCase().trim()
                                )?.id;

                              return tenantId ? (
                                <Link
                                  key={i}
                                  href={`/p/${propertyId}/tenants/${tenantId}`}
                                  onClick={() => closeCopilot()}
                                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-gray-200/90 hover:border-emerald-300 flex items-center justify-between gap-2 transition-all group cursor-pointer shadow-xs active:scale-[0.99]"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-gray-900 text-xs truncate group-hover:text-emerald-800 flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span className="truncate">{chk.name}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                      Room {chk.room || chk.roomNumber}
                                      {chk.joiningDate ? ` • Joined: ${chk.joiningDate}` : ""}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold shrink-0">
                                    <span className="text-[11px]">Profile</span>
                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                  </div>
                                </Link>
                              ) : (
                                <div
                                  key={i}
                                  className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center"
                                >
                                  <div className="font-bold text-gray-900 text-xs">{chk.name}</div>
                                  <div className="text-gray-500 text-xs">Room {chk.room || chk.roomNumber}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}

                    {/* F. EXPENSE BREAKDOWN CARD */}
                    {msg.actionType === "EXPENSE_BREAKDOWN" && msg.actionPayload && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-2 text-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-blue-950">Monthly Expenses Spent</span>
                          <span className="text-base font-extrabold text-blue-700">
                            ₹{Number(msg.actionPayload.totalSpent || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {Array.isArray(msg.actionPayload.categories) && msg.actionPayload.categories.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-blue-200/60 max-h-36 overflow-y-auto">
                            {msg.actionPayload.categories.map((cat: any, i: number) => (
                              <Link
                                key={i}
                                href={`/p/${propertyId}/financial-hub`}
                                onClick={() => closeCopilot()}
                                className="flex justify-between text-[11px] p-1.5 rounded-md hover:bg-blue-100/60 transition-colors group cursor-pointer"
                              >
                                <span className="text-gray-700 font-medium group-hover:text-blue-900">{cat.category}</span>
                                <span className="font-bold text-gray-900 flex items-center gap-0.5">
                                  <span>₹{Number(cat.amount || 0).toLocaleString("en-IN")}</span>
                                  <ChevronRight className="w-3 h-3 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                        <div className="pt-1 border-t border-blue-200/50 flex justify-end">
                          <Link
                            href={`/p/${propertyId}/financial-hub`}
                            onClick={() => closeCopilot()}
                            className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
                          >
                            <span>Open Financial Hub</span>
                            <span>→</span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* G. PAID TENANTS CARD */}
                    {msg.actionType === "PAID_TENANTS" && Array.isArray(msg.actionPayload) && (
                      msg.actionPayload.length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium flex items-center gap-2">
                          <span>ℹ️</span>
                          <span>No rent payments have been recorded for this month yet.</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-emerald-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                            <span>Cleared Rent ({msg.actionPayload.length})</span>
                            <span>
                              Total: ₹
                              {msg.actionPayload
                                .reduce((a: number, c: any) => a + (Number(c.rentAmount) || 0), 0)
                                .toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                            {msg.actionPayload.map((tenant: any, i: number) => {
                              const rawOccupants = occupantStore.getOccupants(propertyId) || [];
                              const tenantId =
                                tenant.occupantId ||
                                tenant.id ||
                                rawOccupants.find(
                                  (o) => o.name?.toLowerCase().trim() === tenant.name?.toLowerCase().trim()
                                )?.id;

                              return (
                                <div
                                  key={i}
                                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-50/40 border border-gray-200/90 hover:border-emerald-300 flex items-center justify-between gap-2 shadow-xs transition-colors"
                                >
                                  {tenantId ? (
                                    <Link
                                      href={`/p/${propertyId}/tenants/${tenantId}`}
                                      onClick={() => closeCopilot()}
                                      className="min-w-0 flex-1 group cursor-pointer"
                                    >
                                      <div className="font-bold text-gray-900 text-xs truncate group-hover:text-emerald-800 flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span className="truncate">{tenant.name}</span>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                      </div>
                                      <div className="text-[11px] text-gray-500 mt-0.5">
                                        Room {tenant.room} • Rent:{" "}
                                        <span className="font-bold text-emerald-600">
                                          ₹{Number(tenant.rentAmount || 0).toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                    </Link>
                                  ) : (
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-gray-900 text-xs truncate">{tenant.name}</div>
                                      <div className="text-[11px] text-gray-500 mt-0.5">
                                        Room {tenant.room} • ₹{Number(tenant.rentAmount || 0).toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                  )}
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0">
                                    Paid ✅
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}

                    {/* H. NOTICE / VACATING TENANTS CARD */}
                    {msg.actionType === "NOTICE_TENANTS" && Array.isArray(msg.actionPayload) && (
                      msg.actionPayload.length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium flex items-center gap-2">
                          <span>✅</span>
                          <span>No tenants are currently on vacating notice.</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center justify-between">
                            <span>Vacating Notice ({msg.actionPayload.length})</span>
                            <span className="text-[10px] text-amber-800 font-semibold">Tap card to view profile →</span>
                          </div>

                          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                            {msg.actionPayload.map((tenant: any, i: number) => {
                              const rawOccupants = occupantStore.getOccupants(propertyId) || [];
                              const tenantId =
                                tenant.occupantId ||
                                tenant.id ||
                                rawOccupants.find(
                                  (o) => o.name?.toLowerCase().trim() === tenant.name?.toLowerCase().trim()
                                )?.id;

                              return tenantId ? (
                                <Link
                                  key={i}
                                  href={`/p/${propertyId}/tenants/${tenantId}`}
                                  onClick={() => closeCopilot()}
                                  className="p-2.5 rounded-xl bg-white hover:bg-amber-50/60 border border-gray-200/90 hover:border-amber-400 flex items-center justify-between gap-2 shadow-xs transition-all group cursor-pointer active:scale-[0.99]"
                                  title="Open Tenant Profile"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-gray-900 text-xs truncate group-hover:text-[#c2652a] flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                      <span className="truncate">{tenant.name}</span>
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[9px] shrink-0">
                                        Notice
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                      <span>Room {tenant.room}</span>
                                      <span>•</span>
                                      <span>Leaves: <strong className="text-gray-800">{tenant.vacatingDate || "Soon"}</strong></span>
                                      {tenant.depositAmount ? (
                                        <>
                                          <span>•</span>
                                          <span>Deposit: <strong className="text-emerald-700">₹{Number(tenant.depositAmount).toLocaleString("en-IN")}</strong></span>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 text-amber-700 text-xs font-bold shrink-0">
                                    <span className="text-[11px]">Profile</span>
                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                  </div>
                                </Link>
                              ) : (
                                <div
                                  key={i}
                                  className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center"
                                >
                                  <div className="font-bold text-gray-900 text-xs">{tenant.name}</div>
                                  <div className="text-gray-500 text-xs">Room {tenant.room} • {tenant.vacatingDate || "Notice"}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}

                    {/* I. TENANT LOOKUP CARD */}
                    {msg.actionType === "TENANT_LOOKUP" && msg.actionPayload && (
                      <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-xs space-y-2">
                        {(() => {
                          const t = msg.actionPayload;
                          const rawOccupants = occupantStore.getOccupants(propertyId) || [];
                          const tenantId =
                            t.occupantId ||
                            t.id ||
                            rawOccupants.find((o) => o.name?.toLowerCase().trim() === t.name?.toLowerCase().trim())?.id;

                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                                    {t.name ? t.name[0].toUpperCase() : "T"}
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900 text-xs">{t.name}</div>
                                    <div className="text-[10px] text-gray-500">
                                      Room {t.roomNumber} {t.bedCode ? `• Bed ${t.bedCode}` : ""}
                                    </div>
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.paymentStatus === "Paid"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {t.paymentStatus || "Due"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-gray-100 text-[11px]">
                                <div className="p-1.5 rounded-lg bg-gray-50">
                                  <span className="text-[10px] text-gray-400 block">Monthly Rent</span>
                                  <span className="font-bold text-gray-900">₹{Number(t.rentAmount || 0).toLocaleString("en-IN")}</span>
                                </div>
                                <div className="p-1.5 rounded-lg bg-gray-50">
                                  <span className="text-[10px] text-gray-400 block">Pending Due</span>
                                  <span className={`font-bold ${Number(t.dueAmount || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                    ₹{Number(t.dueAmount || 0).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 gap-2">
                                {tenantId && (
                                  <Link
                                    href={`/p/${propertyId}/tenants/${tenantId}`}
                                    onClick={() => closeCopilot()}
                                    className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[11px] flex items-center gap-1 transition-colors"
                                  >
                                    <span>Profile</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Link>
                                )}
                                {t.phone && (
                                  <a
                                    href={`https://wa.me/${t.phone.replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors ml-auto"
                                  >
                                    <span>💬 Chat</span>
                                  </a>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* J. PROPERTY SUMMARY KPI CARD */}
                    {msg.actionType === "PROPERTY_SUMMARY" && msg.actionPayload && (
                      <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50/70 via-white to-orange-50/70 border border-amber-200/80 space-y-2 text-gray-800 shadow-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-amber-100">
                          <span className="font-extrabold text-xs text-amber-950">Property Snapshot</span>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            {msg.actionPayload.occupancyRate || 0}% Occupied
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          <Link
                            href={`/p/${propertyId}/property-map`}
                            onClick={() => closeCopilot()}
                            className="p-2 rounded-lg bg-white border border-amber-200/60 hover:border-amber-400 transition-colors block cursor-pointer"
                          >
                            <span className="text-gray-400 text-[10px] block">Vacant Beds</span>
                            <span className="font-extrabold text-emerald-600 text-sm">
                              {msg.actionPayload.vacantBeds || 0} / {msg.actionPayload.totalBeds || 0}
                            </span>
                          </Link>

                          <Link
                            href={`/p/${propertyId}/tenants`}
                            onClick={() => closeCopilot()}
                            className="p-2 rounded-lg bg-white border border-amber-200/60 hover:border-amber-400 transition-colors block cursor-pointer"
                          >
                            <span className="text-gray-400 text-[10px] block">Pending Dues</span>
                            <span className="font-extrabold text-rose-600 text-sm">
                              ₹{Number(msg.actionPayload.totalPendingDues || 0).toLocaleString("en-IN")}
                            </span>
                          </Link>

                          <Link
                            href={`/p/${propertyId}/financial-hub`}
                            onClick={() => closeCopilot()}
                            className="p-2 rounded-lg bg-white border border-amber-200/60 hover:border-amber-400 transition-colors block cursor-pointer"
                          >
                            <span className="text-gray-400 text-[10px] block">Monthly Expenses</span>
                            <span className="font-extrabold text-blue-600 text-sm">
                              ₹{Number(msg.actionPayload.totalExpenses || 0).toLocaleString("en-IN")}
                            </span>
                          </Link>

                          <Link
                            href={`/p/${propertyId}/complaints`}
                            onClick={() => closeCopilot()}
                            className="p-2 rounded-lg bg-white border border-amber-200/60 hover:border-amber-400 transition-colors block cursor-pointer"
                          >
                            <span className="text-gray-400 text-[10px] block">Open Complaints</span>
                            <span className="font-extrabold text-amber-700 text-sm">
                              {msg.actionPayload.openComplaints || 0}
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* K. KYC PENDING ACTION CARD */}
                    {msg.actionType === "KYC_PENDING" && Array.isArray(msg.actionPayload) && (
                      msg.actionPayload.length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                          <span>✅</span>
                          <span>100% KYC Verified! All active tenants and guests have submitted documents.</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-rose-900 bg-rose-50 p-2 rounded-lg border border-rose-200 flex items-center justify-between">
                            <span>KYC Pending ({msg.actionPayload.length})</span>
                            <span className="text-[10px] text-rose-700 font-semibold">Missing Aadhaar / ID</span>
                          </div>

                          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                            {msg.actionPayload.map((resident: any, i: number) => {
                              const rawOccupants = occupantStore.getOccupants(propertyId) || [];
                              const tenantId =
                                resident.occupantId ||
                                resident.id ||
                                rawOccupants.find(
                                  (o) => o.name?.toLowerCase().trim() === resident.name?.toLowerCase().trim()
                                )?.id;

                              const isGuest = resident.stayType === "Guest";

                              return (
                                <div
                                  key={i}
                                  className="p-2.5 rounded-xl bg-white hover:bg-rose-50/40 border border-gray-200/90 hover:border-rose-300 flex items-center justify-between gap-2 shadow-xs transition-colors"
                                >
                                  {tenantId ? (
                                    <Link
                                      href={`/p/${propertyId}/tenants/${tenantId}`}
                                      onClick={() => closeCopilot()}
                                      className="min-w-0 flex-1 group cursor-pointer"
                                      title="Open Profile to upload/verify KYC"
                                    >
                                      <div className="font-bold text-gray-900 text-xs truncate group-hover:text-rose-700 flex items-center gap-1.5">
                                        <User className={`w-3.5 h-3.5 shrink-0 ${isGuest ? "text-purple-600" : "text-amber-700"}`} />
                                        <span className="truncate">{resident.name}</span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                                            isGuest
                                              ? "bg-purple-100 text-purple-800"
                                              : "bg-blue-100 text-blue-800"
                                          }`}
                                        >
                                          {isGuest ? "Guest" : "Tenant"}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                        <span>Room {resident.room}</span>
                                        <span>•</span>
                                        <span className="font-bold text-rose-600">KYC Pending</span>
                                      </div>
                                    </Link>
                                  ) : (
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-gray-900 text-xs truncate">{resident.name}</div>
                                      <div className="text-[11px] text-gray-500 mt-0.5">Room {resident.room} • {isGuest ? "Guest" : "Tenant"}</div>
                                    </div>
                                  )}

                                  {resident.phone ? (
                                    <a
                                      href={`https://wa.me/${resident.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                        `Hi ${resident.name}, please complete your KYC and submit your Aadhaar card for your stay at ${propertySettingsStore.getSettings(propertyId)?.propertyName || "our property"}.`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors shrink-0"
                                      title="Send WhatsApp KYC reminder"
                                    >
                                      <span>💬 Request KYC</span>
                                    </a>
                                  ) : tenantId ? (
                                    <Link
                                      href={`/p/${propertyId}/tenants/${tenantId}`}
                                      onClick={() => closeCopilot()}
                                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[11px] flex items-center gap-0.5 shrink-0"
                                    >
                                      <span>Profile</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </Link>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}

                    {/* L. GUEST LIST ACTION CARD (Short-term tenants) */}
                    {msg.actionType === "GUEST_LIST" && Array.isArray(msg.actionPayload) && (
                      msg.actionPayload.length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium flex items-center gap-2">
                          <span>ℹ️</span>
                          <span>No short-term guests are currently staying at the property.</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200 flex items-center justify-between">
                            <span>Short-Term Guests ({msg.actionPayload.length})</span>
                            <span className="text-[10px] text-purple-700 font-semibold">Daily / Weekly Stays</span>
                          </div>

                          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                            {msg.actionPayload.map((guest: any, i: number) => {
                              const rawOccupants = occupantStore.getOccupants(propertyId) || [];
                              const tenantId =
                                guest.occupantId ||
                                guest.id ||
                                rawOccupants.find(
                                  (o) => o.name?.toLowerCase().trim() === guest.name?.toLowerCase().trim()
                                )?.id;

                              return tenantId ? (
                                <Link
                                  key={i}
                                  href={`/p/${propertyId}/tenants/${tenantId}`}
                                  onClick={() => closeCopilot()}
                                  className="p-2.5 rounded-xl bg-white hover:bg-purple-50/60 border border-gray-200/90 hover:border-purple-300 flex items-center justify-between gap-2 shadow-xs transition-all group cursor-pointer active:scale-[0.99] block"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-gray-900 text-xs truncate group-hover:text-purple-800 flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                      <span className="truncate">{guest.name}</span>
                                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[9px] shrink-0">
                                        Guest
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                      <span>Room {guest.room}</span>
                                      {guest.vacatingDate && (
                                        <>
                                          <span>•</span>
                                          <span>Checkout: <strong className="text-gray-800">{guest.vacatingDate}</strong></span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 text-purple-700 text-xs font-bold shrink-0">
                                    <span className="text-[11px]">Profile</span>
                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                  </div>
                                </Link>
                              ) : (
                                <div
                                  key={i}
                                  className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center"
                                >
                                  <div className="font-bold text-gray-900 text-xs">{guest.name}</div>
                                  <div className="text-gray-500 text-xs">Room {guest.room} • Guest</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}

                  </div>
                )}

                {/* Suggested follow-up chips */}
                {msg.suggestedChips && msg.suggestedChips.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {msg.suggestedChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuery(chip)}
                        className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-600 hover:text-gray-900 text-[10px] font-medium transition-colors cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {/* AI Thinking Animation */}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500 p-3 bg-white rounded-2xl border border-gray-200 w-fit">
              <Sparkles className="w-4 h-4 text-[#c2652a] animate-spin" />
              <span className="text-xs font-medium">Analyzing live PG ledger...</span>
            </div>
          )}

          {/* Voice Listening Waveform Animation */}
          {isListening && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2 text-[#c2652a]">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold text-xs">
                  Listening in {activeLang.nativeLabel}... Speak now
                </span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 cursor-pointer"
              >
                Stop
              </button>
            </div>
          )}

          {speechError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. Bottom Input Bar */}
        <div className="p-3 bg-white border-t border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="flex items-center gap-2"
          >
            {/* Microphone Button */}
            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              title={isListening ? "Stop Listening" : `Speak in ${activeLang.nativeLabel}`}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isListening
                  ? "bg-rose-600 text-white border-rose-700 animate-pulse shadow-md shadow-rose-500/30"
                  : "bg-amber-50 hover:bg-amber-100 text-[#c2652a] border-amber-300"
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Input Text Box */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={isListening && interimTranscript ? interimTranscript : inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={isListening ? "Listening..." : activeLang.samplePlaceholder}
                disabled={isLoading}
                className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#c2652a] bg-gray-50 focus:bg-white text-xs text-gray-900 transition-all font-medium"
              />
              {inputQuery && (
                <button
                  type="button"
                  onClick={() => setInputQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-[#c2652a] to-[#964407] text-white font-bold disabled:opacity-40 hover:opacity-95 transition-all shadow-sm shadow-[#c2652a]/20 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 px-1">
            <span>Powered by Google Gemini Flash</span>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="hover:text-gray-600 cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Clear Thread</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
