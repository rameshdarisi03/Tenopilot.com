"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Smartphone,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { loginOrRegisterWithPhone, sanitizeTitleCase } from "@/lib/authService";

interface PhoneAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessPromptPin?: (sessionData: any) => void;
  initialMode?: "LOGIN" | "SIGNUP";
}

export function PhoneAuthModal({
  isOpen,
  onClose,
  onSuccessPromptPin,
  initialMode = "LOGIN",
}: PhoneAuthModalProps) {
  const router = useRouter();

  // Step state: "ENTER_PHONE" | "ENTER_OTP" | "SUCCESS"
  const [step, setStep] = useState<"ENTER_PHONE" | "ENTER_OTP" | "SUCCESS">("ENTER_PHONE");

  // Phone input
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formattedPhone, setFormattedPhone] = useState("");

  // OTP inputs (6 individual boxes)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [verifiedPayload, setVerifiedPayload] = useState<any>(null);

  // Focus management
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("ENTER_PHONE");
      setPhoneNumber("");
      setOtpDigits(["", "", "", "", "", ""]);
      setError(null);
      setIsLoading(false);
      setTimeout(() => phoneInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  // Format 10 digit Indian number with spacing (XXXXX XXXXX)
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

      setFormattedPhone(data.phone);
      setCooldown(data.cooldownSeconds || 45);
      setStep("ENTER_OTP");
    } catch (err: any) {
      console.error("Send OTP Error:", err);
      setError(err.message || "Failed to deliver WhatsApp message. Please verify number.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle OTP digit typing
  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    // Single digit input
    const next = [...otpDigits];
    next[index] = clean.slice(-1);
    setOtpDigits(next);

    // Auto-advance to next box
    if (index < 5 && clean.length > 0) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are filled
    const allFilled = next.every((d) => d.length === 1);
    if (allFilled) {
      executeVerifyOtp(next.join(""));
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle Paste (e.g. from WhatsApp Copy Code)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split("");
      setOtpDigits(next);
      otpRefs.current[5]?.focus();
      executeVerifyOtp(pasted);
    }
  };

  // Quick 1-click clipboard paste button
  const handleClipboardPasteBtn = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (digits.length === 6) {
        setOtpDigits(digits.split(""));
        executeVerifyOtp(digits);
      } else {
        setError("Clipboard did not contain a 6-digit code. Please paste manually.");
      }
    } catch {
      setError("Please allow clipboard access or type the code manually.");
    }
  };

  // 3. Verify OTP & Authenticate into Firebase
  const executeVerifyOtp = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Verify OTP with Server API
      const verifyRes = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone || phoneNumber,
          otp: codeToVerify,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || "Invalid OTP code.");
      }

      setVerifiedPayload(verifyData);

      // 2. Sign in or Register into Firebase Auth with verified credentials
      const authResult = await loginOrRegisterWithPhone(
        verifyData.phone,
        verifyData.authEmail,
        verifyData.authSecret
      );

      // 3. Update localStorage session cache
      if (typeof window !== "undefined") {
        const sessionPayload = {
          email: authResult.profile.email,
          name: authResult.profile.displayName,
          role: authResult.profile.role,
          assignedPropertyId: authResult.profile.assignedPropertyId || "",
          propertyName: authResult.profile.propertyName || "",
          phone: verifyData.phone,
          securityPin: authResult.profile.securityPin || "",
          hasSetPin: authResult.profile.hasSetPin || false,
        };
        localStorage.setItem("tenopilot_saved_session", JSON.stringify(sessionPayload));
      }

      setStep("SUCCESS");

      // 4. Redirect or trigger MPIN prompt
      setTimeout(() => {
        onClose();
        if (authResult.destination === "PIN_PROMPT" && onSuccessPromptPin) {
          onSuccessPromptPin({
            email: authResult.profile.email,
            name: authResult.profile.displayName,
            role: authResult.profile.role,
            assignedPropertyId: authResult.profile.assignedPropertyId,
            securityPin: authResult.profile.securityPin,
          });
        } else {
          router.push(authResult.destination);
        }
      }, 700);
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError(err.message || "Failed to verify OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Top Header Bar */}
        <div className="relative bg-linear-to-r from-emerald-600 to-teal-700 p-6 text-white text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* WhatsApp Brand Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-emerald-100 uppercase tracking-wider mb-2">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>WhatsApp Fast Track</span>
          </div>

          <h3 className="text-xl font-extrabold tracking-tight">
            {step === "ENTER_PHONE" && "Continue with Phone Number"}
            {step === "ENTER_OTP" && "Enter WhatsApp OTP"}
            {step === "SUCCESS" && "Verified Successfully!"}
          </h3>
          <p className="text-xs text-emerald-100/90 mt-1">
            {step === "ENTER_PHONE" && "Enter your 10-digit mobile number to get a 6-digit WhatsApp code."}
            {step === "ENTER_OTP" && `We sent a 6-digit verification code to +${formattedPhone || phoneNumber}`}
            {step === "SUCCESS" && "Logging you into your TenoPilot workspace..."}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
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
                <div className="flex rounded-xl border border-gray-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-2xs overflow-hidden transition-all">
                  <div className="flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-200 text-xs font-bold text-gray-700">
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
                    className="flex-1 py-3 px-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-hidden tracking-wider"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || phoneNumber.length < 10}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 font-bold text-xs text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending code via WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <span>Send Code via WhatsApp</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-[11px] text-gray-400">
                  By continuing, you agree to receive authentication messages from TenoPilot on WhatsApp.
                </span>
              </div>
            </form>
          )}

          {/* STEP 2: 6-Digit OTP */}
          {step === "ENTER_OTP" && (
            <div className="space-y-5">
              {/* Digit Input Matrix */}
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
                    className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl border-2 border-gray-200 text-center text-xl font-extrabold text-gray-900 focus:border-emerald-600 focus:bg-emerald-50/20 focus:outline-hidden transition-all shadow-2xs"
                  />
                ))}
              </div>

              {/* 1-Tap Paste Button */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleClipboardPasteBtn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste Code from Clipboard</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => executeVerifyOtp(otpDigits.join(""))}
                disabled={isLoading || otpDigits.some((d) => !d)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 font-bold text-xs text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* Resend & Change Number Actions */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStep("ENTER_PHONE")}
                  className="text-gray-500 hover:text-gray-800 font-semibold transition-colors cursor-pointer"
                >
                  Change Number
                </button>

                {cooldown > 0 ? (
                  <span className="text-gray-400 font-medium">
                    Resend code in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={isLoading}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resend via WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === "SUCCESS" && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-gray-900">
                Phone Number Verified!
              </h4>
              <p className="text-xs text-gray-500">
                Redirecting you to your account...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
