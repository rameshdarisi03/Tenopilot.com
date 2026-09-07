"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { propertySettingsStore } from "@/constants/propertySettings";
import { Edit3, X, Check, Lock, Phone, User, Mail, Sparkles, AlertCircle } from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
}

export function EditProfileModal({
  isOpen,
  onClose,
  propertyId,
}: EditProfileModalProps) {
  const { profile, updateProfileDetails, user } = useAuth();

  let savedSessionData: any = null;
  if (typeof window !== "undefined") {
    try {
      const s = localStorage.getItem("tenopilot_saved_session");
      if (s) savedSessionData = JSON.parse(s);
    } catch {}
  }

  const userEmail = profile?.email || user?.email || savedSessionData?.email || "owner@tenopilot.com";
  
  // Property-level manager phone for smart quick-fill
  const propertySettings = propertyId ? propertySettingsStore.getSettings(propertyId) : null;
  const propertyManagerPhone = propertySettings?.managerPhone?.trim() || "";

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentName = profile?.displayName || savedSessionData?.name || "";
      const currentPhone = profile?.phone || savedSessionData?.phone || propertyManagerPhone || "";
      setEditName(currentName);
      setEditPhone(currentPhone);
      setPhoneError("");
      setSaveSuccess(false);
    }
  }, [isOpen, profile?.displayName, profile?.phone, propertyManagerPhone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");

    const cleanName = editName.trim();
    if (!cleanName) {
      return;
    }

    const digitsOnly = editPhone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      setPhoneError("Please enter a valid 10-digit mobile number (e.g. 9876543210).");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfileDetails({
        displayName: cleanName,
        phone: editPhone.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-5 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#964407]">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-gray-900 leading-tight">
                Edit Profile Details
              </h3>
              <p className="text-[11px] text-gray-500">
                Personal identity, contact, and billing details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Full Name / Username */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#964407]" />
                Full Name / Username *
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Sync
              </span>
            </div>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Ramesh Darisi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#964407] font-semibold text-gray-900 bg-white"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Updating your name here will instantly update your welcome dashboard greeting and profile cards across the app.
            </p>
          </div>

          {/* Email Address (Locked / Primary Login Identity) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                Email Address
              </label>
              <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Primary Login ID
              </span>
            </div>
            <input
              type="email"
              disabled
              value={userEmail}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 text-sm cursor-not-allowed font-mono select-all"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Linked to your Google / Firebase Auth account. Protected against account lockout.
            </p>
          </div>

          {/* Mobile Number (Active & Editable) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Mobile Number *
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✏️ Editable
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="tel"
                required
                value={editPhone}
                onChange={(e) => {
                  setEditPhone(e.target.value);
                  if (phoneError) setPhoneError("");
                }}
                placeholder="e.g. 9876543210 or +91 98765 43210"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#964407] ${
                  phoneError ? "border-red-400 bg-red-50/20" : "border-gray-200 bg-white"
                }`}
              />
            </div>
            {phoneError ? (
              <p className="text-[11px] text-red-600 mt-1 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {phoneError}
              </p>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1">
                Used for Cashfree subscription checkout, billing receipts, and owner WhatsApp alerts.
              </p>
            )}

            {/* Quick-fill button if property manager phone exists and differs */}
            {propertyManagerPhone && editPhone.trim() !== propertyManagerPhone && (
              <button
                type="button"
                onClick={() => {
                  setEditPhone(propertyManagerPhone);
                  if (phoneError) setPhoneError("");
                }}
                className="mt-2 text-[10px] font-bold text-[#964407] hover:text-[#c2652a] hover:underline flex items-center gap-1 cursor-pointer bg-amber-50/60 px-2 py-1 rounded-lg border border-amber-200/50"
              >
                <Sparkles className="w-3 h-3 text-amber-600" /> Use property manager number ({propertyManagerPhone})
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer text-white ${
                saveSuccess
                  ? "bg-emerald-600"
                  : "bg-[#964407] hover:bg-[#c2652a]"
              }`}
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved!
                </>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
