"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { propertySettingsStore } from "@/constants/propertySettings";
import { Edit3, X, Check, Lock, Phone, User, Mail, Sparkles, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

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

  const rawEmail = profile?.email || user?.email || savedSessionData?.email || "";
  const isSyntheticEmail = !rawEmail || rawEmail.startsWith("phone_") || rawEmail.includes("tenopilot.auth") || !rawEmail.includes("@");
  const existingVerifiedEmail = isSyntheticEmail ? "" : rawEmail;

  const rawPhone = profile?.phone || savedSessionData?.phone || "";
  const existingVerifiedPhone = rawPhone ? rawPhone.replace(/\D/g, "") : "";

  // Property-level manager phone for smart quick-fill
  const propertySettings = propertyId ? propertySettingsStore.getSettings(propertyId) : null;
  const propertyManagerPhone = propertySettings?.managerPhone?.trim() || "";

  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Email verification state
  const [editEmail, setEditEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpToken, setEmailOtpToken] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isCheckingEmailOtp, setIsCheckingEmailOtp] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Phone verification state
  const [editPhone, setEditPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpToken, setPhoneOtpToken] = useState("");
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isCheckingPhoneOtp, setIsCheckingPhoneOtp] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentName = profile?.displayName || savedSessionData?.name || "";
      setEditName(currentName);
      setVerifiedEmail(existingVerifiedEmail);
      setEditEmail(existingVerifiedEmail);
      setVerifiedPhone(existingVerifiedPhone);
      setEditPhone(existingVerifiedPhone || propertyManagerPhone);

      setEmailError("");
      setEmailOtpSent(false);
      setEmailOtpCode("");

      setPhoneError("");
      setPhoneOtpSent(false);
      setPhoneOtpCode("");
      setSaveSuccess(false);
    }
  }, [isOpen, profile?.displayName, existingVerifiedEmail, existingVerifiedPhone, propertyManagerPhone]);

  // Timers for OTP cooldowns
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setInterval(() => setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const t = setInterval(() => setPhoneCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [phoneCooldown]);

  if (!isOpen) return null;

  // 1. Send Email OTP
  const handleSendEmailOtp = async () => {
    setEmailError("");
    const clean = editEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clean || !emailRegex.test(clean)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setIsSendingEmailOtp(true);
    try {
      const res = await fetch("/api/auth/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send verification email.");
      }
      setEmailOtpToken(data.verificationToken);
      setEmailOtpSent(true);
      setEmailCooldown(data.cooldownSeconds || 45);
    } catch (err: any) {
      setEmailError(err.message || "Failed to send verification email.");
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // 2. Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    setEmailError("");
    const cleanOtp = emailOtpCode.trim();
    if (cleanOtp.length !== 6) {
      setEmailError("Please enter 6-digit code.");
      return;
    }
    setIsCheckingEmailOtp(true);
    try {
      const res = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editEmail.trim().toLowerCase(),
          otp: cleanOtp,
          verificationToken: emailOtpToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP code.");
      }
      const verified = editEmail.trim().toLowerCase();
      setVerifiedEmail(verified);
      setEmailOtpSent(false);
      setEmailOtpCode("");
    } catch (err: any) {
      setEmailError(err.message || "Invalid OTP code.");
    } finally {
      setIsCheckingEmailOtp(false);
    }
  };

  // 3. Send WhatsApp Phone OTP
  const handleSendPhoneOtp = async () => {
    setPhoneError("");
    const clean = editPhone.replace(/\D/g, "");
    if (clean.length < 10) {
      setPhoneError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setIsSendingPhoneOtp(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send WhatsApp code.");
      }
      setPhoneOtpToken(data.verificationToken);
      setPhoneOtpSent(true);
      setPhoneCooldown(data.cooldownSeconds || 45);
    } catch (err: any) {
      setPhoneError(err.message || "Failed to send WhatsApp code.");
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  // 4. Verify WhatsApp Phone OTP
  const handleVerifyPhoneOtp = async () => {
    setPhoneError("");
    const cleanOtp = phoneOtpCode.trim();
    if (cleanOtp.length !== 6) {
      setPhoneError("Please enter 6-digit code.");
      return;
    }
    setIsCheckingPhoneOtp(true);
    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: editPhone.replace(/\D/g, ""),
          otp: cleanOtp,
          verificationToken: phoneOtpToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP code.");
      }
      const verified = (data.phone || editPhone.replace(/\D/g, "")).slice(-10);
      setVerifiedPhone(verified);
      setEditPhone(verified);
      setPhoneOtpSent(false);
      setPhoneOtpCode("");
    } catch (err: any) {
      setPhoneError(err.message || "Invalid OTP code.");
    } finally {
      setIsCheckingPhoneOtp(false);
    }
  };

  const cleanCurrentInputPhone = editPhone.replace(/\D/g, "").slice(-10);
  const cleanVerifiedPhone = verifiedPhone.replace(/\D/g, "").slice(-10);
  const isPhoneUnverifiedChange = cleanCurrentInputPhone && cleanCurrentInputPhone !== cleanVerifiedPhone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");

    const cleanName = editName.trim();
    if (!cleanName) {
      return;
    }

    if (isPhoneUnverifiedChange) {
      setPhoneError("Please click 'Verify' to confirm this mobile number via WhatsApp OTP before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfileDetails({
        displayName: cleanName,
        phone: cleanVerifiedPhone || undefined,
        email: verifiedEmail || undefined,
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
      <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-5 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
                Personal identity, contact, and dual login credentials
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
              placeholder="e.g. Rajesh Kumar"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#964407] font-semibold text-gray-900 bg-white"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Updating your name here will instantly update your welcome dashboard greeting and profile cards across the app.
            </p>
          </div>

          {/* Email Address */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-500" />
                Email Address
              </label>
              {verifiedEmail ? (
                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Login ID
                </span>
              ) : (
                <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Not Linked
                </span>
              )}
            </div>

            {verifiedEmail ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <span className="font-mono text-gray-700 font-bold">{verifiedEmail}</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked ID
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex rounded-xl border border-gray-300 focus-within:border-[#c2652a] focus-within:ring-2 focus-within:ring-[#c2652a]/20 overflow-hidden bg-white">
                  <input
                    type="email"
                    placeholder="owner@property.com"
                    value={editEmail}
                    onChange={(e) => {
                      setEditEmail(e.target.value);
                      setEmailError("");
                    }}
                    disabled={emailOtpSent || isSendingEmailOtp}
                    className="flex-1 py-2 px-3 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-hidden bg-transparent"
                  />
                  {editEmail.trim().includes("@") && !emailOtpSent && (
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={isSendingEmailOtp || emailCooldown > 0}
                      className="px-3 bg-amber-50 hover:bg-amber-100 border-l border-amber-200 text-[#964407] font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isSendingEmailOtp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : emailCooldown > 0 ? (
                        `${emailCooldown}s`
                      ) : (
                        "Verify & Link"
                      )}
                    </button>
                  )}
                </div>

                {emailOtpSent && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-900 font-semibold">
                        Enter 6-digit code sent to {editEmail}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailOtpSent(false);
                          setEmailOtpCode("");
                        }}
                        className="text-[#c2652a] font-bold hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        maxLength={6}
                        placeholder="123456"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 py-1.5 px-3 rounded-lg border border-amber-300 bg-white font-mono font-bold text-center tracking-widest text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyEmailOtp}
                        disabled={isCheckingEmailOtp || emailOtpCode.length !== 6}
                        className="px-3 py-1.5 rounded-lg bg-[#c2652a] hover:bg-[#964407] text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        {isCheckingEmailOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                      </button>
                    </div>
                    {emailError && (
                      <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {emailError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1">
              {verifiedEmail
                ? "Linked to your login identity. Protected against lockout."
                : "Link your email via OTP to enable signing in with both WhatsApp and Email/Google."}
            </p>
          </div>

          {/* Mobile Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Mobile Number
              </label>
              {cleanVerifiedPhone ? (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Unverified
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex rounded-xl border border-gray-300 focus-within:border-[#c2652a] focus-within:ring-2 focus-within:ring-[#c2652a]/20 overflow-hidden bg-white">
                <div className="flex items-center gap-1 px-2.5 bg-gray-50 border-r border-gray-200 text-xs font-bold text-gray-600 select-none">
                  <span>🇮🇳 +91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => {
                    setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setPhoneError("");
                  }}
                  placeholder="98765 43210"
                  className="flex-1 py-2 px-3 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-hidden tracking-wider bg-transparent"
                />
                {isPhoneUnverifiedChange && !phoneOtpSent && (
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={isSendingPhoneOtp || phoneCooldown > 0}
                    className="px-3 bg-emerald-50 hover:bg-emerald-100 border-l border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingPhoneOtp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : phoneCooldown > 0 ? (
                      `${phoneCooldown}s`
                    ) : (
                      "Verify"
                    )}
                  </button>
                )}
              </div>

              {phoneOtpSent && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-900 font-semibold">
                      Enter 6-digit WhatsApp code sent to +91 {editPhone}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneOtpSent(false);
                        setPhoneOtpCode("");
                      }}
                      className="text-[#c2652a] font-bold hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      maxLength={6}
                      placeholder="123456"
                      value={phoneOtpCode}
                      onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 py-1.5 px-3 rounded-lg border border-emerald-300 bg-white font-mono font-bold text-center tracking-widest text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPhoneOtp}
                      disabled={isCheckingPhoneOtp || phoneOtpCode.length !== 6}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {isCheckingPhoneOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                    </button>
                  </div>
                  {phoneError && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {phoneError}
                    </p>
                  )}
                </div>
              )}

              {phoneError && !phoneOtpSent && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {phoneError}
                </p>
              )}
            </div>

            <p className="text-[10px] text-gray-500 mt-1">
              Verified numbers receive booking confirmations, rent receipts, and owner alerts via WhatsApp.
            </p>
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
