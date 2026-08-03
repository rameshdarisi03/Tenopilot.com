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
} from "lucide-react";
import {
  propertySettingsStore,
  PropertySettingsData,
  DEFAULT_PROPERTY_SETTINGS,
} from "@/constants/propertySettings";

export default function PropertySettingsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  // Navigation & Menu States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"FINANCIAL" | "PROPERTY" | "ADVANCED">("FINANCIAL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [settings, setSettings] = useState<PropertySettingsData>(DEFAULT_PROPERTY_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load local & Cloud Firestore settings
    const loaded = propertySettingsStore.getSettings();
    setSettings(loaded);
    propertySettingsStore.fetchSettingsFromFirestore(propertyId).then((fs) => {
      setSettings(fs);
    });
  }, [propertyId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await propertySettingsStore.updateSettings(settings, propertyId);
    setIsSaving(false);
    triggerToast("🎉 Property Settings & Financial Rules updated successfully!");
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
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "PROPERTY"
                  ? "border-[#c2652a] text-[#c2652a]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Building className="w-4 h-4" /> Property Profile & UPI ID
            </button>
          </div>

          {/* Settings Form */}
          <form onSubmit={handleSaveSettings} className="space-y-6">
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
