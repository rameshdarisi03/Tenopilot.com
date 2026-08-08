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
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  propertySettingsStore,
  PropertySettingsData,
  DEFAULT_PROPERTY_SETTINGS,
  PaymentQRProfile,
  DEFAULT_QR_PROFILES,
} from "@/constants/propertySettings";
import {
  partnerStore,
  PartnerConfig,
  ExpenseCategoryConfig,
  PaymentAccountConfig,
} from "@/constants/partnerStore";

export default function PropertySettingsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  // Navigation & Menu States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"FINANCIAL" | "PROPERTY" | "PARTNERS" | "QR_PROFILES">("FINANCIAL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // QR Profiles State
  const [newQrName, setNewQrName] = useState("");
  const [newQrBank, setNewQrBank] = useState("");
  const [newQrUpi, setNewQrUpi] = useState("");
  const [newQrType, setNewQrType] = useState<"UPI_QR" | "BANK_TRANSFER" | "CASH_DESK">("UPI_QR");

  // Form State
  const [settings, setSettings] = useState<PropertySettingsData>(DEFAULT_PROPERTY_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  // Partners, Expense Categories & Payment Accounts State
  const [partners, setPartners] = useState<PartnerConfig[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryConfig[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountConfig[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<PaymentAccountConfig["type"]>("Bank Account");

  const handleAddQrProfile = () => {
    if (!newQrName || !newQrUpi) {
      alert("Please enter a Profile Name and UPI VPA ID.");
      return;
    }
    const newProf: PaymentQRProfile = {
      id: `qr-${Date.now()}`,
      name: newQrName,
      bankLabel: newQrBank || "UPI Bank Account",
      upiId: newQrUpi,
      accountType: newQrType,
    };
    const currentProfiles = settings.qrProfiles && settings.qrProfiles.length > 0 ? settings.qrProfiles : DEFAULT_QR_PROFILES;
    const updated = [...currentProfiles, newProf];
    const newSettings = { ...settings, qrProfiles: updated };
    setSettings(newSettings);
    propertySettingsStore.updateSettings(newSettings, propertyId);
    setNewQrName("");
    setNewQrBank("");
    setNewQrUpi("");
    triggerToast(`Added Payment QR Profile: ${newProf.name}`);
  };

  const handleDeleteQrProfile = (id: string) => {
    if (confirm("Are you sure you want to remove this QR profile?")) {
      const currentProfiles = settings.qrProfiles && settings.qrProfiles.length > 0 ? settings.qrProfiles : DEFAULT_QR_PROFILES;
      const updated = currentProfiles.filter((q) => q.id !== id);
      const newSettings = { ...settings, qrProfiles: updated };
      setSettings(newSettings);
      propertySettingsStore.updateSettings(newSettings, propertyId);
      triggerToast("Payment QR profile removed.");
    }
  };

  useEffect(() => {
    // Load local & Cloud Firestore settings
    const loaded = propertySettingsStore.getSettings();
    setSettings(loaded);
    propertySettingsStore.fetchSettingsFromFirestore(propertyId).then((fs) => {
      setSettings(fs);
    });

    setPartners(partnerStore.getPartners());
    setCategories(partnerStore.getCategories());
    setPaymentAccounts(partnerStore.getPaymentAccounts());

    const unsub = partnerStore.subscribe(() => {
      setPartners(partnerStore.getPartners());
      setCategories(partnerStore.getCategories());
      setPaymentAccounts(partnerStore.getPaymentAccounts());
    });
    return unsub;
  }, [propertyId]);

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
    partnerStore.updatePartners(partners);
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
    partnerStore.addCategory(newCatName);
    setNewCatName("");
    triggerToast(`✓ Added "${newCatName.trim()}" to active expense categories!`);
  };

  const handleDeleteCategoryClick = (id: string, name: string) => {
    if (confirm(`Remove expense category "${name}"?`)) {
      partnerStore.deleteCategory(id);
      triggerToast(`✓ Expense category "${name}" removed.`);
    }
  };

  const handleAddPaymentAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    partnerStore.addPaymentAccount(newAccName, newAccType);
    setNewAccName("");
    triggerToast(`✓ Added payment account "${newAccName.trim()}" (${newAccType})! Reflected across Financial Hub.`);
  };

  const handleDeletePaymentAccountClick = (id: string, name: string) => {
    if (confirm(`Delete payment account "${name}"?`)) {
      partnerStore.deletePaymentAccount(id);
      triggerToast(`✓ Payment account "${name}" removed.`);
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
      setSettings(DEFAULT_PROPERTY_SETTINGS);
      propertySettingsStore.updateSettings(DEFAULT_PROPERTY_SETTINGS, propertyId);
      triggerToast("✓ Property Settings reset to factory defaults.");
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
          searchValue=""
          onSearchChange={() => {}}
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
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-xl text-gray-900">
                  Global Property Configuration
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
              <Users className="w-4 h-4" /> Partner Ownership & Expenses
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
              <QrCode className="w-4 h-4" /> Payment QR Profiles & Accounts
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

                {/* 2. Payment Accounts Configuration Card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">Payment Accounts & Funding Sources</h3>
                        <p className="text-[11px] text-gray-500">Configure business bank accounts, petty cash, or partner personal payment sources</p>
                      </div>
                    </div>
                  </div>

                  {/* Add New Payment Account Form */}
                  <form onSubmit={handleAddPaymentAccountSubmit} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Account Name (e.g. HDFC Main Operating, Axis Petty Cash)"
                      value={newAccName}
                      onChange={(e) => setNewAccName(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-xs font-medium text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                    <select
                      value={newAccType}
                      onChange={(e) => setNewAccType(e.target.value as any)}
                      className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 bg-white"
                    >
                      <option value="Business Account">Business Account</option>
                      <option value="Petty Cash">Petty Cash</option>
                      <option value="Bank Account">Bank Account</option>
                      <option value="Partner Account">Partner Account</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add Account
                    </button>
                  </form>

                  {/* Accounts Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {paymentAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3.5 rounded-xl border border-gray-200 bg-[#fcfcfc] flex items-center justify-between"
                      >
                        <div>
                          <h4 className="font-bold text-xs text-gray-900">{acc.name}</h4>
                          <span className="text-[9px] font-extrabold text-[#964407] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                            {acc.type}
                          </span>
                        </div>
                        {!acc.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeletePaymentAccountClick(acc.id, acc.name)}
                            className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
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
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">Pre-Configured Payment QR Profiles & Bank Accounts</h3>
                        <p className="text-[11px] text-gray-500">Manage business bank accounts, UPI QR IDs, and cash payment requests for rent reminders</p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-50 text-[#c2652a] border border-orange-200">
                      {(settings.qrProfiles || DEFAULT_QR_PROFILES).length} Profiles Configured
                    </span>
                  </div>

                  {/* Add New QR Profile Input Row */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-orange-50/30 space-y-3">
                    <h4 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#c2652a]" /> Add New Payment QR Profile
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        placeholder="Profile Name (e.g. ICICI Tax Acc)"
                        value={newQrName}
                        onChange={(e) => setNewQrName(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                      <input
                        type="text"
                        placeholder="Bank Label (e.g. ICICI Bank Ltd)"
                        value={newQrBank}
                        onChange={(e) => setNewQrBank(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                      <input
                        type="text"
                        placeholder="UPI VPA ID (e.g. saharapg@icici)"
                        value={newQrUpi}
                        onChange={(e) => setNewQrUpi(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold bg-white text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                      <button
                        type="button"
                        onClick={handleAddQrProfile}
                        className="py-2 px-4 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Save Profile
                      </button>
                    </div>
                  </div>

                  {/* Configured Profiles Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {(settings.qrProfiles || DEFAULT_QR_PROFILES).map((qr) => (
                      <div
                        key={qr.id}
                        className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-16 h-16 bg-white p-1 rounded-xl border border-gray-200 shrink-0 flex items-center justify-center shadow-2xs">
                            <QRCodeSVG
                              value={qr.upiId === "CASH_PAYMENT" ? "CASH_PAYMENT" : `upi://pay?pa=${qr.upiId}&pn=Sahara%20PG&cu=INR`}
                              size={56}
                              fgColor="#201a17"
                              bgColor="#ffffff"
                            />
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <span className="font-bold text-xs text-gray-900 block truncate">{qr.name}</span>
                            <span className="text-[11px] text-gray-500 block truncate">🏦 {qr.bankLabel}</span>
                            <span className="text-[10px] font-mono text-[#c2652a] font-bold block truncate">
                              💳 {qr.upiId}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteQrProfile(qr.id)}
                          className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors cursor-pointer shrink-0"
                          title="Remove QR Profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
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
                      `billingCycleDates` Variable *
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
                      `desiredDueDate` Variable *
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
                          type="number"
                          required
                          value={settings.rentalTiers?.sharing1 || 18000}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              rentalTiers: {
                                ...(settings.rentalTiers || { sharing1: 18000, sharing2: 14500, sharing3: 11000, sharing4: 8500 }),
                                sharing1: Number(e.target.value),
                              },
                            })
                          }
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
                          type="number"
                          required
                          value={settings.rentalTiers?.sharing2 || 14500}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              rentalTiers: {
                                ...(settings.rentalTiers || { sharing1: 18000, sharing2: 14500, sharing3: 11000, sharing4: 8500 }),
                                sharing2: Number(e.target.value),
                              },
                            })
                          }
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
                          type="number"
                          required
                          value={settings.rentalTiers?.sharing3 || 11000}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              rentalTiers: {
                                ...(settings.rentalTiers || { sharing1: 18000, sharing2: 14500, sharing3: 11000, sharing4: 8500 }),
                                sharing3: Number(e.target.value),
                              },
                            })
                          }
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
                          type="number"
                          required
                          value={settings.rentalTiers?.sharing4 || 8500}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              rentalTiers: {
                                ...(settings.rentalTiers || { sharing1: 18000, sharing2: 14500, sharing3: 11000, sharing4: 8500 }),
                                sharing4: Number(e.target.value),
                              },
                            })
                          }
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
                      <label className="block text-xs font-bold text-gray-700 mb-1">Property Name *</label>
                      <input
                        type="text"
                        required
                        value={settings.propertyName}
                        onChange={(e) => setSettings({ ...settings, propertyName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Manager Mobile *</label>
                      <input
                        type="text"
                        required
                        value={settings.managerPhone}
                        onChange={(e) => setSettings({ ...settings, managerPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                      />
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
        </div>
      </div>
    </div>
  );
}
