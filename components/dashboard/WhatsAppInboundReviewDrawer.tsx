"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Smartphone,
  Eye,
  ArrowRight,
  Sparkles,
  Clock,
  Send,
  HelpCircle,
  FileCheck,
  Building2,
  Trash2,
  RefreshCw,
  ZoomIn,
  Download,
} from "lucide-react";
import { WhatsAppInboundItem, whatsappInboxStore } from "@/constants/whatsappInboxStore";
import { Occupant } from "@/constants/mockOccupants";

interface WhatsAppInboundReviewDrawerProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  occupants?: Occupant[];
  onOpenCollectRentModal: (occupant: Occupant, prefillData?: { utr?: string; amount?: number; screenshotUrl?: string; inboxItemId?: string }) => void;
}

export function WhatsAppInboundReviewDrawer({
  propertyId,
  isOpen,
  onClose,
  occupants = [],
  onOpenCollectRentModal,
}: WhatsAppInboundReviewDrawerProps) {
  const [filterType, setFilterType] = useState<"ALL" | "PROOFS" | "CLAIMS" | "SUPPORT">("ALL");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [items, setItems] = useState<WhatsAppInboundItem[]>(() => whatsappInboxStore.getItems(propertyId));

  const refreshInbox = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/whatsapp/inbox?propertyId=${encodeURIComponent(propertyId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          data.items.forEach((it: any) => {
            whatsappInboxStore.addItem(it);
          });
          setItems(whatsappInboxStore.getItems(propertyId));
        }
      }
    } catch (e) {
      console.warn("Manual inbox refresh notice:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    whatsappInboxStore.initFirebaseListener(propertyId);
    setItems(whatsappInboxStore.getItems(propertyId));

    const unsub = whatsappInboxStore.subscribe(() => {
      setItems(whatsappInboxStore.getItems(propertyId));
    });

    if (isOpen) {
      refreshInbox();
    }

    return () => {
      unsub();
    };
  }, [propertyId, isOpen]);

  const pendingItems = useMemo(() => {
    return items.filter((it) => it.status === "PENDING");
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filterType === "PROOFS") {
      return pendingItems.filter((it) => it.type === "PAYMENT_PROOF");
    }
    if (filterType === "CLAIMS") {
      return pendingItems.filter((it) => it.type === "PAYMENT_CLAIM");
    }
    if (filterType === "SUPPORT") {
      return pendingItems.filter((it) => it.type === "SUPPORT_QUERY" || it.type === "TEXT_MESSAGE");
    }
    return pendingItems;
  }, [pendingItems, filterType]);

  const handleVerifyAndCollect = (item: WhatsAppInboundItem) => {
    // 1. Match occupant by ID, 10-digit phone, or name
    const cleanItemPhone = (item.senderPhone || "").replace(/\D/g, "").slice(-10);
    const matchedOccupant =
      occupants.find((occ) => occ.id === item.occupantId) ||
      (cleanItemPhone.length === 10 && occupants.find((occ) => (occ.phone || "").replace(/\D/g, "").slice(-10) === cleanItemPhone)) ||
      occupants.find((occ) => occ.name.toLowerCase().includes((item.occupantName || item.senderName || "").toLowerCase())) ||
      occupants[0];

    if (matchedOccupant) {
      onOpenCollectRentModal(matchedOccupant, {
        utr: item.extractedData?.utr || "",
        amount: matchedOccupant.rentAmount || 8500,
        screenshotUrl: item.mediaUrl || undefined,
        inboxItemId: item.id,
      });
      onClose();
    } else {
      alert(`⚠️ Could not find resident profile matching ${item.senderName} (${item.senderPhone}). Please open their profile manually.`);
    }
  };

  const handleDismiss = async (itemId: string) => {
    await whatsappInboxStore.dismissItem(propertyId, itemId);
    setItems(whatsappInboxStore.getItems(propertyId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:justify-end animate-in fade-in duration-200">
      {/* Drawer Container */}
      <div
        className="w-full sm:max-w-md md:max-w-lg bg-[#fcf9f8] rounded-t-3xl sm:rounded-l-3xl sm:rounded-tr-none shadow-2xl flex flex-col max-h-[92vh] sm:max-h-screen sm:h-full border-t sm:border-t-0 sm:border-l border-[#eedad0] animate-in slide-in-from-bottom sm:slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull-Bar */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#eedad0] bg-white rounded-t-3xl sm:rounded-tl-3xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 relative">
              <MessageSquare className="w-5 h-5" />
              {pendingItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-mono text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                  {pendingItems.length}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 leading-tight">
                WhatsApp Inbound Feed
              </h3>
              <p className="text-[11px] text-gray-500">
                Genuine tenant payment proofs & live chat replies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={refreshInbox}
              disabled={isRefreshing}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
              title="Sync & check for new incoming WhatsApp messages"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#c2652a]" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="p-3 bg-[#f8ede3]/50 border-b border-[#eedad0] flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[36px] transition-all cursor-pointer ${
              filterType === "ALL"
                ? "bg-[#c2652a] text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            All ({pendingItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("PROOFS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[36px] transition-all flex items-center gap-1 cursor-pointer ${
              filterType === "PROOFS"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200"
            }`}
          >
            📷 Payment Proofs ({pendingItems.filter((i) => i.type === "PAYMENT_PROOF").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("CLAIMS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[36px] transition-all flex items-center gap-1 cursor-pointer ${
              filterType === "CLAIMS"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-amber-800 hover:bg-amber-50 border border-amber-200"
            }`}
          >
            💬 Chat Replies ({pendingItems.filter((i) => i.type === "PAYMENT_CLAIM").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("SUPPORT")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[36px] transition-all flex items-center gap-1 cursor-pointer ${
              filterType === "SUPPORT"
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-white text-purple-800 hover:bg-purple-50 border border-purple-200"
            }`}
          >
            🛠️ Queries ({pendingItems.filter((i) => i.type === "SUPPORT_QUERY" || i.type === "TEXT_MESSAGE").length})
          </button>
        </div>

        {/* Scrollable Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-gray-100">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner text-2xl">
                ✨
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-gray-900">All Caught Up!</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  No pending WhatsApp payment proofs. Incoming tenant replies and screenshots will appear here automatically in real time.
                </p>
              </div>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#eedad0] p-4 space-y-3 shadow-xs hover:border-[#c2652a]/40 transition-all pt-4"
              >
                {/* Item Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.type === "PAYMENT_PROOF"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : item.type === "PAYMENT_CLAIM"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-purple-100 text-purple-800 border border-purple-300"
                      }`}
                    >
                      {item.type === "PAYMENT_PROOF" ? "📷" : item.type === "PAYMENT_CLAIM" ? "💰" : "💬"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-gray-900">
                          {item.occupantName || item.senderName}
                        </h4>
                        {item.roomNumber && (
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[10px] font-bold">
                            Room {item.roomNumber} ({item.bedCode || "Bed"})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono">
                        +{item.senderPhone}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Multi-Property Resident Warning Badge */}
                {(item as any).isMultiProperty && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>⚠️ Resident active in multiple properties</span>
                  </div>
                )}

                {/* Exact Raw WhatsApp Chat Bubble */}
                {item.rawText && (
                  <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs text-gray-800 leading-relaxed font-sans flex items-start gap-2">
                    <div className="p-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                      <MessageSquare className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                        WhatsApp Message
                      </span>
                      <p className="text-gray-900 font-medium">“{item.rawText}”</p>
                    </div>
                  </div>
                )}

                {/* Genuine Attached Screenshot Proof (High-Res Preview) */}
                {item.type === "PAYMENT_PROOF" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                        <span>📷 Original Payment Screenshot</span>
                      </span>
                      <span className="text-[10px] text-gray-400">100% Genuine User Upload</span>
                    </div>

                    <div
                      onClick={() => setExpandedImage(item.mediaUrl || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80")}
                      className="relative rounded-2xl overflow-hidden border border-emerald-200 cursor-pointer group bg-gray-900/5 max-h-52 flex items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.mediaUrl || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"}
                        alt="Payment Proof"
                        className="w-full object-cover max-h-52 group-hover:scale-102 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2">
                        <ZoomIn className="w-5 h-5" />
                        <span>Click to Inspect Full-Size Screenshot</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Action Row */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleVerifyAndCollect(item)}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all min-h-[48px] cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Collect Rent</span>
                  </button>

                  <a
                    href={`https://wa.me/${item.senderPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center min-h-[48px] min-w-[48px] cursor-pointer transition-colors"
                    title="Open WhatsApp Chat"
                  >
                    <Send className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDismiss(item.id)}
                    className="p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-gray-400 text-xs font-bold flex items-center justify-center min-h-[48px] min-w-[48px] cursor-pointer transition-colors"
                    title="Dismiss"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fullscreen High-Resolution Lightbox Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setExpandedImage(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[92vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Genuine Tenant Payment Proof</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={expandedImage}
                  download="tenant_payment_proof.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Save Image</span>
                </a>
                <button
                  type="button"
                  onClick={() => setExpandedImage(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main High-Res Image Container */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expandedImage}
              alt="Expanded Payment Proof"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
