"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  RotateCcw,
  AlertCircle,
  ClipboardPaste,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { loginOrRegisterWithPhone } from "@/lib/authService";

interface PhoneAuthCardProps {
  onSuccess: (authResult: any) => void;
  onBackToOptions: () => void;
  className?: string;
}

export function PhoneAuthCard({
  onSuccess,
  onBackToOptions,
  className = "",
}: PhoneAuthCardProps) {
  // Step state: "ENTER_PHONE" | "ENTER_OTP"
  const [step, setStep] = useState<"ENTER_PHONE" | "ENTER_OTP">("ENTER_PHONE");

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formattedPhone, setFormattedPhone] = useState("");

  // OTP inputs (6 individual boxes)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [verificationToken, setVerificationToken] = useState<string>("");

  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus phone input on mount
  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Auto-focus first digit when entering OTP step
  useEffect(() => {
    if (step === "ENTER_OTP") {
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Clean 10 digit Indian number
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(raw);
    setError(null);
  };

  // 1. Send OTP via WhatsApp Cloud API
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (phoneNumber.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send WhatsApp code.");
      }

      if (data.verificationToken) {
        setVerificationToken(data.verificationToken);
      }

      setFormattedPhone(data.phone);
      setCooldown(data.cooldownSeconds || 45);
      setStep("ENTER_OTP");
    } catch (err: any) {
      console.error("Send OTP Error:", err);
      setError(err.message || "Failed to deliver WhatsApp message. Please check number.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle OTP digit typing or multi-digit paste via input
  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    // If browser/keyboard pasted multiple digits into the single input field
    if (clean.length > 1) {
      const sixDigits = clean.length === 6 ? clean : (clean.match(/\b\d{6}\b/) ? clean.match(/\b\d{6}\b/)![0] : clean.slice(0, 6));
      if (sixDigits.length === 6) {
        const next = sixDigits.split("");
        setOtpDigits(next);
        otpRefs.current[5]?.focus();
        executeVerifyOtp(sixDigits);
        return;
      }
    }

    const next = [...otpDigits];
    next[index] = clean.slice(-1);
    setOtpDigits(next);

    // Auto-advance
    if (index < 5 && clean.length > 0) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are filled
    const allFilled = next.every((d) => d.length === 1);
    if (allFilled) {
      executeVerifyOtp(next.join(""));
    }
  };

  // Handle Backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle Direct Input Paste (e.g. Long-press Paste in an OTP box)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const raw = e.clipboardData.getData("text") || "";
    // Match isolated 6 digits or extract first 6 digits
    const match = raw.match(/\b\d{6}\b/) || raw.replace(/\D/g, "").slice(0, 6);
    const code = typeof match === "string" ? match : (match ? match[0] : "");

    if (code && code.length === 6) {
      const next = code.split("");
      setOtpDigits(next);
      otpRefs.current[5]?.focus();
      executeVerifyOtp(code);
    } else {
      setError("Please paste a valid 6-digit WhatsApp code.");
    }
  };

  // 1-Click Clipboard Paste button
  const handleClipboardPasteBtn = async () => {
    try {
      setError(null);
      const text = await navigator.clipboard.readText();
      if (!text) {
        setError("Clipboard is empty. Please tap Copy Code in WhatsApp first.");
        return;
      }

      // 1. Try finding exact 6-digit pattern in clipboard message (e.g. "Your code is 123456" or direct "123456")
      const match = text.match(/\b\d{6}\b/);
      let sixDigitCode = match ? match[0] : "";

      // 2. Fallback: strip non-digits and check if at least 6 digits exist
      if (!sixDigitCode) {
        const onlyDigits = text.replace(/\D/g, "");
        if (onlyDigits.length >= 6) {
          sixDigitCode = onlyDigits.slice(0, 6);
        }
      }

      if (sixDigitCode && sixDigitCode.length === 6) {
        const next = sixDigitCode.split("");
        setOtpDigits(next);
        otpRefs.current[5]?.focus();
        executeVerifyOtp(sixDigitCode);
      } else {
        setError("Clipboard does not contain a 6-digit code. Please copy the code from WhatsApp.");
      }
    } catch (clipErr) {
      console.warn("Clipboard access warning:", clipErr);
      setError("Please allow clipboard access or type the code manually.");
    }
  };

  // 3. Verify OTP & Authenticate
  const executeVerifyOtp = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const verifyRes = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone || phoneNumber,
          otp: codeToVerify,
          verificationToken: verificationToken,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || "Invalid OTP code.");
      }

      // Authenticate into Firebase with verified credentials
      const authResult = await loginOrRegisterWithPhone(
        verifyData.phone,
        verifyData.authEmail,
        verifyData.authSecret,
        verifyData.existingProfile?.displayName,
        verifyData.existingProfile?.email
      );

      // Save local session
      if (typeof window !== "undefined") {
        const realEmail =
          authResult.profile.email && !authResult.profile.email.startsWith("phone_")
            ? authResult.profile.email
            : verifyData.existingProfile?.email || "";
        const sessionPayload = {
          email: realEmail,
          name: authResult.profile.displayName || verifyData.existingProfile?.displayName || "",
          role: authResult.profile.role,
          assignedPropertyId: authResult.profile.assignedPropertyId || verifyData.existingProfile?.assignedPropertyId || "",
          propertyName: authResult.profile.propertyName || verifyData.existingProfile?.propertyName || "",
          phone: verifyData.phone,
          securityPin: authResult.profile.securityPin || verifyData.existingProfile?.securityPin || "",
          hasSetPin: authResult.profile.hasSetPin || Boolean(verifyData.existingProfile?.securityPin),
        };
        localStorage.setItem("tenopilot_saved_session", JSON.stringify(sessionPayload));
      }

      onSuccess(authResult);
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError(err.message || "Failed to verify OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-4 animate-in fade-in duration-200 ${className}`}>
      {/* Subtle WhatsApp Pill */}
      <div className="flex items-center justify-between pb-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-800">
          <svg className="w-3.5 h-3.5 fill-emerald-600 shrink-0" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          <span>WhatsApp Verification</span>
        </div>

        <button
          type="button"
          onClick={onBackToOptions}
          className="text-xs text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Other Options</span>
        </button>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Phone Input */}
      {step === "ENTER_PHONE" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Mobile Number
            </label>
            <div className="flex rounded-xl border border-gray-300 focus-within:border-[#c2652a] focus-within:ring-2 focus-within:ring-[#c2652a]/20 shadow-2xs overflow-hidden transition-all bg-white">
              <div className="flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-200 text-xs font-bold text-gray-700 select-none">
                <span className="text-sm">🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                ref={phoneInputRef}
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={handlePhoneChange}
                maxLength={10}
                disabled={isLoading}
                className="flex-1 py-3 px-3.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-hidden tracking-wider bg-transparent"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              We will send your 6-digit one-time code to WhatsApp.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || phoneNumber.length < 10}
            className="w-full py-3 px-4 rounded-xl bg-[#c2652a] hover:bg-[#a65420] active:scale-98 font-bold text-xs text-white shadow-md shadow-[#c2652a]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending code to WhatsApp...</span>
              </>
            ) : (
              <>
                <span>Send Code via WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: 6-Digit OTP */}
      {step === "ENTER_OTP" && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="text-gray-600">
              Code sent to: <strong className="text-gray-900 font-bold">+{formattedPhone || phoneNumber}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("ENTER_PHONE");
                setOtpDigits(["", "", "", "", "", ""]);
                setError(null);
              }}
              className="text-[#c2652a] hover:underline font-bold text-[11px] cursor-pointer"
            >
              Change
            </button>
          </div>

          {/* 6 Digit Input Matrix */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 text-center">
              Enter 6-Digit WhatsApp Code
            </label>
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpRefs.current[idx] = el;
                  }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  disabled={isLoading}
                  className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl border-2 border-gray-200 text-center text-xl font-extrabold text-gray-900 focus:border-[#c2652a] focus:bg-orange-50/20 focus:outline-hidden transition-all shadow-2xs bg-white"
                />
              ))}
            </div>
          </div>

          {/* 1-Tap Paste Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleClipboardPasteBtn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-gray-500" />
              <span>Paste Code from Clipboard</span>
            </button>
          </div>

          {/* Verify Button */}
          <button
            type="button"
            onClick={() => executeVerifyOtp(otpDigits.join(""))}
            disabled={isLoading || otpDigits.some((d) => !d)}
            className="w-full py-3 px-4 rounded-xl bg-[#c2652a] hover:bg-[#a65420] active:scale-98 font-bold text-xs text-white shadow-md shadow-[#c2652a]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying code...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Continue</span>
              </>
            )}
          </button>

          {/* Resend Row */}
          <div className="flex items-center justify-center text-xs pt-1">
            {cooldown > 0 ? (
              <span className="text-gray-400 font-medium text-[11px]">
                Resend WhatsApp code in {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={isLoading}
                className="text-[#c2652a] hover:text-[#964407] font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resend Code via WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
