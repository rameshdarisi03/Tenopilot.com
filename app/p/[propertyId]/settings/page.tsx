"use client";

import React, { useState, useEffect, use } from "react";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import {
  Settings,
  Calendar,
  CreditCard,
  Building,
  ShieldCheck,
  Check,
  Save,
  RotateCcw,
  Sliders,
  DollarSign,
  Phone,
  QrCode,
  Users,
  Plus,
  Trash2,
  Info,
  X,
  MessageSquare,
  Zap,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  propertySettingsStore,
  PropertySettingsData,
  DEFAULT_PROPERTY_SETTINGS,
  CLEAN_ZERO_PROPERTY_SETTINGS,
  PaymentQRProfile,
  DEFAULT_QR_PROFILES,
} from "@/constants/propertySettings";
import {
  partnerStore,
  PartnerConfig,
  ExpenseCategoryConfig,
  PaymentAccountConfig,
} from "@/constants/partnerStore";
import { WhatsAppWalletModal } from "@/components/dashboard/WhatsAppWalletModal";
import { whatsappCreditStore, WhatsAppCreditTransaction } from "@/constants/whatsappCreditStore";
import { useAuth } from "@/providers/AuthProvider";
import { PoliceVerificationRegister } from "@/components/dashboard/PoliceVerificationRegister";

export default function PropertySettingsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";
  const { profile } = useAuth();

  // Navigation & Menu States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"FINANCIAL" | "PROPERTY" | "PARTNERS" | "QR_PROFILES" | "WHATSAPP" | "POLICE_REGISTER">("FINANCIAL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // WhatsApp Wallet State in Settings
  const [showWhatsAppWalletModal, setShowWhatsAppWalletModal] = useState(false);
  const [whatsappCredits, setWhatsappCredits] = useState<number>(() => whatsappCreditStore.getCredits(propertyId));
  const [whatsappTransactions, setWhatsappTransactions] = useState<WhatsAppCreditTransaction[]>(() =>
    whatsappCreditStore.getTransactions(propertyId)
  );

  // Unified Payment Accounts State
  const [newQrPartnerId, setNewQrPartnerId] = useState<string>("BUSINESS");
  const [newQrBank, setNewQrBank] = useState("");
  const [newQrUpi, setNewQrUpi] = useState("");

  // Custom Delete Confirmation Modal State
  const [deleteQrTarget, setDeleteQrTarget] = useState<PaymentQRProfile | null>(null);

  // Form State
  const [settings, setSettings] = useState<PropertySettingsData>(DEFAULT_PROPERTY_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  // Partners & Expense Categories State
  const [partners, setPartners] = useState<PartnerConfig[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryConfig[]>([]);
  const [newCatName, setNewCatName] = useState("");

  const handleAddQrProfile = async () => {
    const isCashDesk = newQrPartnerId === "PETTY_CASH";

    if (!newQrBank.trim() && !isCashDesk) {
      alert("Please enter a Bank / Account Label (e.g. HDFC Bank, ICICI Bank).");
      return;
    }

    let resolvedPartnerName = "Main Business Pool";
    let autoProfileName = "";

    if (newQrPartnerId === "BUSINESS") {
      resolvedPartnerName = "Main Business Pool";
      autoProfileName = newQrBank.trim() ? `Main Business — ${newQrBank.trim()}` : "Main Business Account";
    } else if (newQrPartnerId === "PETTY_CASH") {
      resolvedPartnerName = "Petty Cash Desk";
      autoProfileName = newQrBank.trim() ? `Petty Cash — ${newQrBank.trim()}` : "Petty Cash Desk";
    } else {
      const matchedPartner = partners.find((p) => p.id === newQrPartnerId);
      if (matchedPartner) {
        resolvedPartnerName = matchedPartner.name;
        autoProfileName = newQrBank.trim() ? `${matchedPartner.name} — ${newQrBank.trim()}` : `${matchedPartner.name} Account`;
      } else {
        autoProfileName = newQrBank.trim() || "Account";
      }
    }

    const currentProfiles = settings.qrProfiles && settings.qrProfiles.length > 0 ? settings.qrProfiles : DEFAULT_QR_PROFILES;
    const isFirstAccount = currentProfiles.length === 0;

    const resolvedAccountType: "UPI_QR" | "BANK_TRANSFER" | "CASH_DESK" = isCashDesk
      ? "CASH_DESK"
      : newQrUpi.trim()
      ? "UPI_QR"
      : "BANK_TRANSFER";

    const newProf: PaymentQRProfile = {
      id: `qr-${Date.now()}`,
      name: autoProfileName,
      bankLabel: newQrBank.trim() || (isCashDesk ? "Reception Cash Drawer" : "Bank Account"),
      upiId: isCashDesk ? "CASH" : newQrUpi.trim(),
      accountType: resolvedAccountType,
      partnerId: newQrPartnerId,
      partnerName: resolvedPartnerName,
      isDefault: isFirstAccount,
    };

    const updated = [...currentProfiles, newProf];
    const newSettings = { ...settings, qrProfiles: updated };
    setSettings(newSettings);
    await propertySettingsStore.updateSettings(newSettings, propertyId);
    setNewQrBank("");
    setNewQrUpi("");
    triggerToast(`✓ Added Payment Account: ${newProf.name}`);
  };

  const handleSetDefaultProfile = async (id: string) => {
    const currentProfiles = settings.qrProfiles && settings.qrProfiles.length > 0 ? settings.qrProfiles : DEFAULT_QR_PROFILES;
    const updated = currentProfiles.map((q) => ({
      ...q,
      isDefault: q.id === id,
    }));
    const newSettings = { ...settings, qrProfiles: updated };
    setSettings(newSettings);
    await propertySettingsStore.updateSettings(newSettings, propertyId);
    triggerToast("✓ Updated default payment profile for rent reminders.");
  };

  const handleConfirmDeleteQrProfile = async () => {
    if (!deleteQrTarget) return;
    const currentProfiles = settings.qrProfiles && settings.qrProfiles.length > 0 ? settings.qrProfiles : DEFAULT_QR_PROFILES;
    const updated = currentProfiles.filter((q) => q.id !== deleteQrTarget.id);
    const newSettings = { ...settings, qrProfiles: updated };
    setSettings(newSettings);
    await propertySettingsStore.updateSettings(newSettings, propertyId);
    triggerToast(`✓ Removed Payment Account: ${deleteQrTarget.name}`);
    setDeleteQrTarget(null);
  };

  useEffect(() => {
    // Load local & Cloud Firestore settings with active onSnapshot WebSocket listener
    propertySettingsStore.initFirebaseListener(propertyId);
    const loaded = propertySettingsStore.getSettings(propertyId);
    if (!loaded.managerPhone && profile?.phone) {
      loaded.managerPhone = profile.phone;
    }
    setSettings(loaded);
    propertySettingsStore.fetchSettingsFromFirestore(propertyId).then((fs) => {
      if (fs) {
        if (!fs.managerPhone && profile?.phone) {
          fs.managerPhone = profile.phone;
        }
        setSettings(fs);
      }
    });

    const unsubSettings = propertySettingsStore.subscribe(() => {
      const fresh = propertySettingsStore.getSettings(propertyId);
      if (!fresh.managerPhone && profile?.phone) {
        fresh.managerPhone = profile.phone;
      }
      setSettings(fresh);
    });

    const ownerDisplayName = profile?.displayName;
    partnerStore.initFirebaseListener(propertyId);
    partnerStore.fetchPartnersFromFirestore(propertyId, ownerDisplayName).then(() => {
      setPartners(partnerStore.getPartners(propertyId, ownerDisplayName));
      setCategories(partnerStore.getCategories(propertyId));
    });

    setPartners(partnerStore.getPartners(propertyId, ownerDisplayName));
    setCategories(partnerStore.getCategories(propertyId));

    const unsubPartners = partnerStore.subscribe(() => {
      setPartners(partnerStore.getPartners(propertyId, ownerDisplayName));
      setCategories(partnerStore.getCategories(propertyId));
    });

    whatsappCreditStore.initFirebaseListener(propertyId);
    whatsappCreditStore.fetchWalletFromFirestore(propertyId);
    setWhatsappCredits(whatsappCreditStore.getCredits(propertyId));
    setWhatsappTransactions(whatsappCreditStore.getTransactions(propertyId));

    const unsubWallet = whatsappCreditStore.subscribe(() => {
      setWhatsappCredits(whatsappCreditStore.getCredits(propertyId));
      setWhatsappTransactions(whatsappCreditStore.getTransactions(propertyId));
    });

    return () => {
      unsubSettings();
      unsubPartners();
      unsubWallet();
    };
  }, [propertyId, profile?.displayName]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdatePartnerShare = (id: string, share: number) => {
    const updated = partners.map((p) => (p.id === id ? { ...p, ownershipPercentage: share } : p));
    setPartners(updated);
  };

  const handleUpdatePartnerName = (id: string, name: string) => {
    const updated = partners.map((p) => (p.id === id ? { ...p, name } : p));
    setPartners(updated);
  };

  const handleSavePartnerSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const totalShare = partners.reduce((acc, p) => acc + (p.ownershipPercentage || 0), 0);
    if (totalShare !== 100) {
      alert(`⚠️ Total Partner Ownership percentage must equal exactly 100%! Current sum is ${totalShare}%. Please adjust.`);
      return;
    }
    partnerStore.updatePartners(partners, propertyId);
    triggerToast("🎉 Partner ownership ratios saved! Financial Hub settlements updated in real-time.");
  };

  const handleAddPartner = () => {
    const colors = ["#964407", "#059669", "#7e22ce", "#2563eb", "#d97706"];
    const nextColor = colors[partners.length % colors.length];
    const newPartner: PartnerConfig = {
      id: `p-${Date.now()}`,
      name: `Partner ${partners.length + 1}`,
      ownershipPercentage: 0,
      color: nextColor,
      accountType: "Personal Account",
    };
    const updated = [...partners, newPartner];
    setPartners(updated);
  };

  const handleDeletePartner = (id: string) => {
    if (partners.length <= 1) {
      alert("At least 1 partner must be maintained.");
      return;
    }
    const updated = partners.filter((p) => p.id !== id);
    setPartners(updated);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    partnerStore.addCategory(newCatName, undefined, undefined, propertyId);
    setNewCatName("");
    triggerToast(`✓ Added "${newCatName.trim()}" to active expense categories!`);
  };

  const handleDeleteCategoryClick = (id: string, name: string) => {
    if (confirm(`Remove expense category "${name}"?`)) {
      partnerStore.deleteCategory(id, propertyId);
      triggerToast(`✓ Expense category "${name}" removed.`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await propertySettingsStore.updateSettings(settings, propertyId);
    setIsSaving(false);
    triggerToast("🎉 Settings saved! Revised monthly rental tariffs will take effect starting from the next 5th billing cycle (existing current month rent stays locked).");
  };

  const handleResetDefaults = () => {
    if (confirm("Reset property settings back to factory defaults?")) {
      const defaultData = propertyId === "sunshine-pg" ? DEFAULT_PROPERTY_SETTINGS : CLEAN_ZERO_PROPERTY_SETTINGS;
      setSettings(defaultData);
      propertySettingsStore.updateSettings(defaultData, propertyId);
      triggerToast("✓ Property Settings reset to clean defaults.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#fcf9f8] text-gray-900 font-sans selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* Left Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">
        {/* Top Header */}
        <PropertyHeader
          title="Property & Financial Settings"
          showSearch={false}
          propertyId={propertyId}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-3 bg-gray-900 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </div>
        )}

        <div className="p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Header Action Banner */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-orange-100 text-[#c2652a] rounded-2xl shrink-0">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-xl text-gray-900">
                  Settings
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Customize billing cycles, 5th rent due dates, pro-rata proration, and PG preferences.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs flex items-center gap-2 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4 text-gray-500" /> Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md flex items-center gap-2 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {/* Navigation Category Tabs */}
          <div className="flex border-b border-gray-200 gap-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("FINANCIAL")}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "FINANCIAL"
                  ? "border-[#c2652a] text-[#c2652a]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <CreditCard className="w-4 h-4" /> Billing & Due Date Rules
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PROPERTY")}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "PROPERTY"
                  ? "border-[#c2652a] text-[#c2652a]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Building className="w-4 h-4" /> Property Profile & UPI ID
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PARTNERS")}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "PARTNERS"
                  ? "border-[#c2652a] text-[#c2652a]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Users className="w-4 h-4" /> Partner Ownership & Equity
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("QR_PROFILES")}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "QR_PROFILES"
                  ? "border-[#c2652a] text-[#c2652a]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <CreditCard className="w-4 h-4" /> Payment Profiles & Accounts
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("WHATSAPP")}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "WHATSAPP"
                  ? "border-emerald-600 text-emerald-700 font-extrabold"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp Cloud & Credits
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                {whatsappCredits}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("POLICE_REGISTER")}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "POLICE_REGISTER"
                  ? "border-blue-600 text-blue-700 font-extrabold"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Police & Legal Register 📜
            </button>
          </div>

          {/* Settings Form */}
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {activeTab === "PARTNERS" && (
              <div className="space-y-6 animate-in fade-in">
                {/* 1. Partner Ownership & Settlement Ratios */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">Partner Ownership & Profit Sharing Ratios</h3>
                        <p className="text-[11px] text-gray-500">Configure partner equity percentages to calculate profit distribution on Financial Hub</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full font-mono ${
                        partners.reduce((a, b) => a + (b.ownershipPercentage || 0), 0) === 100
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-red-100 text-red-900"
                      }`}>
                        Total Ownership: {partners.reduce((a, b) => a + (b.ownershipPercentage || 0), 0)}%
                        {partners.reduce((a, b) => a + (b.ownershipPercentage || 0), 0) === 100 ? " 🟢" : " 🔴"}
                      </span>

                      <button
                        type="button"
                        onClick={handleAddPartner}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs flex items-center gap-1 border border-purple-200 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Partner
                      </button>
                    </div>
                  </div>

                  {/* Partner Ownership Table */}
                  <div className="space-y-3">
                    {partners.map((partner) => (
                      <div
                        key={partner.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 bg-[#fcfcfc]"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span
                            className="w-7 h-7 rounded-full text-white font-bold flex items-center justify-center text-xs shrink-0"
                            style={{ backgroundColor: partner.color || "#964407" }}
                          >
                            {partner.name.charAt(0)}
                          </span>
                          <input
                            type="text"
                            value={partner.name}
                            onChange={(e) => handleUpdatePartnerName(partner.id, e.target.value)}
                            className="font-bold text-xs text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-1 focus:ring-[#c2652a] max-w-[200px]"
                            placeholder="Partner Name"
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] font-bold text-gray-500">Ownership Share:</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={partner.ownershipPercentage}
                              onChange={(e) => handleUpdatePartnerShare(partner.id, Number(e.target.value))}
                              className="w-20 px-3 py-1.5 rounded-lg border border-gray-300 font-mono font-bold text-xs text-right text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                            />
                            <span className="font-mono font-bold text-gray-700">%</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeletePartner(partner.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                            title="Remove Partner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSavePartnerSettings}
                      className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" /> Save Partner Ownership Ratios
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "QR_PROFILES" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-orange-100 text-[#c2652a]">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">Pre-Configured Payment Profiles & Bank Accounts</h3>
                        <p className="text-[11px] text-gray-500">Unified accounts tagged to business pool or partners. Used across rent collections and expenses.</p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-50 text-[#c2652a] border border-orange-200">
                      {(settings.qrProfiles || DEFAULT_QR_PROFILES).length} Accounts Configured
                    </span>
                  </div>

                  {/* Info notice explaining direct UPI ID reminders */}
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Unified Revenue & Expense Accounts: </span>
                      <span>Bank accounts and UPI IDs configured here are automatically available for both tenant rent collections (&quot;Paid To&quot;) and logging property expenses (&quot;Paid From&quot;). Tagging each account under a partner ensures financial settlements accurately track partner cashflows across multiple accounts.</span>
                    </div>
                  </div>

                  {/* Add New Unified Payment Account Input Card */}
                  <div className="p-4 rounded-2xl border border-orange-200/80 bg-orange-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-[#c2652a]" /> Add New Payment Account
                      </h4>
                      <span className="text-[10px] text-gray-500 font-medium">Saves directly to Firebase Firestore 🔥</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Tag Under Partner / Entity *
                        </label>
                        <select
                          value={newQrPartnerId}
                          onChange={(e) => setNewQrPartnerId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        >
                          <option value="BUSINESS">🏢 Main Business (Common Pool)</option>
                          <option value="PETTY_CASH">💵 Petty Cash Desk (Reception Drawer)</option>
                          {partners.length > 0 && (
                            <optgroup label="👤 Tag Under Partner">
                              {partners.map((p) => (
                                <option key={p.id} value={p.id}>
                                  👤 {p.name} ({p.ownershipPercentage}%)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Bank / Account Label *
                        </label>
                        <input
                          type="text"
                          placeholder={newQrPartnerId === "PETTY_CASH" ? "Reception Cash Drawer" : "e.g. HDFC Bank, ICICI Bank"}
                          value={newQrBank}
                          onChange={(e) => setNewQrBank(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          UPI ID {newQrPartnerId === "PETTY_CASH" ? "(N/A for Cash)" : "(Optional for Bank Transfer)"}
                        </label>
                        <input
                          type="text"
                          disabled={newQrPartnerId === "PETTY_CASH"}
                          placeholder={newQrPartnerId === "PETTY_CASH" ? "N/A — Cash Counter" : "e.g. name@okhdfcbank"}
                          value={newQrPartnerId === "PETTY_CASH" ? "" : newQrUpi}
                          onChange={(e) => setNewQrUpi(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold bg-white text-gray-900 focus:ring-1 focus:ring-[#c2652a] ${
                            newQrPartnerId === "PETTY_CASH" ? "opacity-50 cursor-not-allowed bg-gray-100" : ""
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddQrProfile}
                        className="py-2.5 px-5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Save Account Profile
                      </button>
                    </div>
                  </div>

                  {/* Configured Profiles Grid or Empty State */}
                  {(settings.qrProfiles || DEFAULT_QR_PROFILES).length === 0 ? (
                    <div className="p-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#c2652a] flex items-center justify-center mx-auto">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-sm text-gray-900">No Payment Profiles Configured Yet</h4>
                      <p className="text-xs text-gray-500 max-w-md mx-auto">
                        Add your business bank account or partner accounts above to enable unified rent collections, QR reminders, and expense logging.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {(settings.qrProfiles || DEFAULT_QR_PROFILES).map((qr) => (
                        <div
                          key={qr.id}
                          className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200/80 text-[#c2652a] shrink-0 flex items-center justify-center font-bold shadow-2xs">
                              <CreditCard className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {qr.partnerId === "BUSINESS" || (!qr.partnerId && qr.name.toLowerCase().includes("business")) ? (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                    🏢 Main Business
                                  </span>
                                ) : qr.partnerId === "PETTY_CASH" || qr.accountType === "CASH_DESK" || (!qr.partnerId && qr.name.toLowerCase().includes("cash")) ? (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    💵 Petty Cash Desk
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                                    👤 {qr.partnerName || "Partner Account"}
                                  </span>
                                )}

                                {qr.isDefault ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✓ Default UPI
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSetDefaultProfile(qr.id)}
                                    className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-[#c2652a] border border-gray-200 transition-colors cursor-pointer"
                                    title="Set as default UPI account for tenant rent reminders"
                                  >
                                    Set Default UPI
                                  </button>
                                )}
                              </div>

                              <span className="font-bold text-xs text-gray-900 block truncate">{qr.name}</span>
                              <span className="text-[11px] text-gray-500 block truncate">🏦 {qr.bankLabel}</span>
                              {qr.accountType === "CASH_DESK" ? (
                                <span className="text-[10px] text-emerald-700 font-bold block truncate">
                                  💵 Cash Counter (Reception Desk)
                                </span>
                              ) : qr.upiId && qr.upiId !== "CASH_PAYMENT" && qr.upiId !== "CASH" ? (
                                <span className="text-[10px] font-mono text-[#c2652a] font-bold block truncate">
                                  💳 {qr.upiId}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-600 font-semibold block truncate">
                                  🏦 Direct Bank Transfer / NEFT / IMPS
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDeleteQrTarget(qr)}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors cursor-pointer shrink-0"
                            title="Remove Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === "FINANCIAL" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                {/* Billing Cycle Range */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-orange-50 text-[#c2652a]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">Billing Cycle Range</h3>
                      <p className="text-[11px] text-gray-500">Defines start and end dates of rent billing cycle</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Select Billing Cycle Mode *
                    </label>
                    <select
                      value={settings.billingCycleDates}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          billingCycleDates: e.target.value as any,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    >
                      <option value="1st to End of Month">1st to End of Month (Standard Calendar Month)</option>
                      <option value="Anniversary Date">Anniversary Date (Joining Date to Joining Date)</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Indian PG standard preference: 1st of month to month-end.
                    </p>
                  </div>
                </div>

                {/* Desired Rent Due Date */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">Monthly Rent Due Date</h3>
                      <p className="text-[11px] text-gray-500">Target day of the month when rent is due</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Target Due Day of Month *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={28}
                        required
                        value={settings.desiredDueDate}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            desiredDueDate: Number(e.target.value),
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                      <span className="font-bold text-xs text-gray-600 shrink-0">th of Month</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Set to 5 for 5th of every month (PG owner preference).
                    </p>
                  </div>
                </div>

                {/* Grace Period Days */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">Overdue Grace Period</h3>
                      <p className="text-[11px] text-gray-500">Days after due date before marking OVERDUE 🔴</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Grace Period (Days) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      required
                      value={settings.gracePeriodDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gracePeriodDays: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Set to 5 days. If due date is 5th and grace period is 5 days, rent marks overdue after 10th.
                    </p>
                  </div>
                </div>

                {/* Global Monthly Rental Tiers */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">Room Sharing Monthly Rental Tiers</h3>
                      <p className="text-[11px] text-gray-500">Default monthly rent tariffs per bed sharing type (Auto-fills in onboarding & room transfers)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                      <label className="block text-[11px] font-bold text-gray-700">1-Sharing (Single Private)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="20000"
                          value={settings.rentalTiers?.sharing1 ? settings.rentalTiers.sharing1 : ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                            setSettings({
                              ...settings,
                              rentalTiers: {
                                ...(settings.rentalTiers || { sharing1: 20000, sharing2: 12000, sharing3: 8500, sharing4: 6000 }),
                                sharing1: val === "" ? 0 : Number(val),
                              },
                            });
                          }}
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 font-mono font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 font-bold block">/ month per bed</span>
                    </div>

                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                      <label className="block text-[11px] font-bold text-gray-700">2-Sharing (Double)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="12000"
                          value={settings.rentalTiers?.sharing2 ? settings.rentalTiers.sharing2 : ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                            setSettings({
                              ...settings,
                              rentalTiers: {
                                ...(settings.rentalTiers || { sharing1: 20000, sharing2: 12000, sharing3: 8500, sharing4: 6000 }),
                                sharing2: val === "" ? 0 : Number(val),
                              },
                            });
                          }}
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 font-mono font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 font-bold block">/ month per bed</span>
                    </div>

                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                      <label className="block text-[11px] font-bold text-gray-700">3-Sharing (Triple)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="8500"
                          value={settings.rentalTiers?.sharing3 ? settings.rentalTiers.sharing3 : ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                            setSettings({
                              ...settings,
                              rentalTiers: {
                                ...(settings.rentalTiers || { sharing1: 20000, sharing2: 12000, sharing3: 8500, sharing4: 6000 }),
                                sharing3: val === "" ? 0 : Number(val),
                              },
                            });
                          }}
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 font-mono font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 font-bold block">/ month per bed</span>
                    </div>

                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                      <label className="block text-[11px] font-bold text-gray-700">4-Sharing (Four)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="6000"
                          value={settings.rentalTiers?.sharing4 ? settings.rentalTiers.sharing4 : ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                            setSettings({
                              ...settings,
                              rentalTiers: {
                                ...(settings.rentalTiers || { sharing1: 20000, sharing2: 12000, sharing3: 8500, sharing4: 6000 }),
                                sharing4: val === "" ? 0 : Number(val),
                              },
                            });
                          }}
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 font-mono font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 font-bold block">/ month per bed</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "PROPERTY" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-orange-50 text-[#c2652a]">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">Property Details</h3>
                      <p className="text-[11px] text-gray-500">Display name and manager contact</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Property Display Name (Single Source of Truth) *</label>
                      <input
                        type="text"
                        required
                        value={settings.propertyName}
                        onChange={(e) => setSettings({ ...settings, propertyName: e.target.value })}
                        placeholder="e.g. Sunshine Heights PG"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">
                        Single Source of Truth: Renaming here instantly syncs across the Home Welcome Dashboard, Property Sidebar, and WhatsApp Reminders.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Property Location / Address *</label>
                      <input
                        type="text"
                        required
                        value={settings.propertyAddress || "Hitech City, Hyderabad"}
                        onChange={(e) => setSettings({ ...settings, propertyAddress: e.target.value })}
                        placeholder="e.g. Hitech City, Hyderabad"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">
                        Syncs location badge on Home Welcome Screen building cards.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-gray-700">Manager Mobile *</label>
                        {profile?.phone && settings.managerPhone !== profile.phone && (
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, managerPhone: profile.phone! })}
                            className="text-[10px] font-bold text-[#964407] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            ⚡ Use Owner Phone ({profile.phone})
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={settings.managerPhone}
                        onChange={(e) => setSettings({ ...settings, managerPhone: e.target.value })}
                        placeholder="e.g. 9876543210 or +91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">
                        Printed on tenant receipts and shared with occupants as the on-site manager contact.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">UPI Rent Collection VPA</h3>
                      <p className="text-[11px] text-gray-500">UPI ID printed on rent receipts</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Owner UPI VPA ID *</label>
                    <input
                      type="text"
                      required
                      value={settings.upiPaymentId}
                      onChange={(e) => setSettings({ ...settings, upiPaymentId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      e.g., tenopilot.sunshine@okicici (Google Pay / PhonePe / Paytm)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* CUSTOM DELETE CONFIRMATION MODAL */}
          {deleteQrTarget && (
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
              onClick={() => setDeleteQrTarget(null)}
            >
              <div
                className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto font-bold">
                  <Trash2 className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">Remove Payment Account?</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Are you sure you want to delete <strong>"{deleteQrTarget.name}"</strong>? This profile will be permanently removed from Firebase Firestore.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteQrTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteQrProfile}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md transition-all cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* TAB: WHATSAPP CLOUD GATEWAY & CREDIT WALLET */}
          {activeTab === "WHATSAPP" && (
            <div className="space-y-6 animate-in fade-in text-xs">
              {/* 1. Wallet Balance & Recharge Card */}
              <div className="bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 z-10">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                      Official Meta WhatsApp Cloud Gateway
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-100">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live & Connected
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xl tracking-tight">WhatsApp Credit Wallet</h3>
                  <p className="text-xs text-emerald-100/90 max-w-md">
                    Send 1-click automated rent reminders, payment receipts, and tenant KYC check-in links directly to residents' WhatsApp.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center sm:text-right shrink-0 z-10 w-full sm:w-auto">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                    Available Balance
                  </span>
                  <div className="flex items-baseline justify-center sm:justify-end gap-1.5 my-1">
                    <span className="text-3xl font-black font-mono tabular-nums text-white">
                      {whatsappCredits}
                    </span>
                    <span className="text-xs text-emerald-200 font-bold">Credits</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppWalletModal(true)}
                    className="mt-2 w-full px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current text-emerald-700" />
                    <span>Recharge Credits</span>
                  </button>
                </div>
              </div>

              {/* 2. Message Templates Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <MessageSquare className="w-4 h-4" />
                    <span>Rent Payment Reminders</span>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 font-mono text-[11px] text-gray-700 leading-relaxed">
                    👋 <strong>Hello Rahul</strong>,<br /><br />
                    Friendly rent reminder for <strong>{settings.propertyName || "TenoPilot PG"}</strong>:<br />
                    🏠 Room 204 (Bed A)<br />
                    💰 Amount: ₹8,500<br />
                    📅 Due: 5th of this month<br /><br />
                    💳 Pay via UPI ID: {settings.upiPaymentId || "manager@upi"}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-dispatched on 1-tap bulk reminder
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-purple-700 font-bold">
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Confirmation</span>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 font-mono text-[11px] text-gray-700 leading-relaxed">
                    ✅ <strong>Payment Received</strong><br /><br />
                    We have received your rent payment of <strong>₹8,500</strong> for {settings.propertyName || "TenoPilot PG"}.<br /><br />
                    🧾 Receipt: REC-948271<br />
                    🏠 Room: 204<br /><br />
                    Thank you for being a valued resident!
                  </div>
                  <span className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Sent when recording tenant payment
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Digital KYC & Check-In</span>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 font-mono text-[11px] text-gray-700 leading-relaxed">
                    🏢 <strong>Welcome to {settings.propertyName || "TenoPilot PG"}!</strong><br /><br />
                    Please complete your digital KYC and sign the digital tenant agreement:<br /><br />
                    🔗 tenopilot.com/self-onboard/...<br /><br />
                    Upload Aadhaar & complete check-in.
                  </div>
                  <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Sent on tenant booking / invitation
                  </span>
                </div>
              </div>

              {/* 3. Transaction & Delivery Logs Table */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Recent WhatsApp Dispatch Logs</h3>
                    <p className="text-[11px] text-gray-500">Live delivery records and credit usage audit trail</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppWalletModal(true)}
                    className="px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-50 font-bold text-xs text-gray-700 cursor-pointer"
                  >
                    View All Logs
                  </button>
                </div>

                {whatsappTransactions.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-600">No message transactions recorded yet</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Automated WhatsApp reminders and receipts will appear here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {whatsappTransactions.slice(0, 10).map((tx) => {
                      const isCreditAdd = tx.amount > 0;
                      return (
                        <div
                          key={tx.id}
                          className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isCreditAdd ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {isCreditAdd ? <Plus className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 block">{tx.description}</span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {new Date(tx.timestamp).toLocaleString("en-IN")} • Status:{" "}
                                <span className="text-emerald-600 font-bold uppercase">{tx.status}</span>
                              </span>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <span className={`font-bold block ${isCreditAdd ? "text-emerald-700" : "text-gray-900"}`}>
                              {isCreditAdd ? `+${tx.amount}` : `${tx.amount}`} Credits
                            </span>
                            <span className="text-[10px] text-gray-400">Bal: {tx.balanceAfter}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: POLICE & LEGAL RESIDENT REGISTER */}
          {activeTab === "POLICE_REGISTER" && (
            <PoliceVerificationRegister propertyId={propertyId} />
          )}

          {/* 💬 WhatsApp Cloud Gateway & Credit Wallet Modal */}
          <WhatsAppWalletModal
            propertyId={propertyId}
            isOpen={showWhatsAppWalletModal}
            onClose={() => setShowWhatsAppWalletModal(false)}
            onRechargeSuccess={(newCredits) => {
              setWhatsappCredits(newCredits);
              triggerToast(`🎉 Recharged! Available WhatsApp Credits: ${newCredits}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
