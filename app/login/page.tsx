"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Building2,
  Key,
  RotateCcw,
  Sparkles,
  Smartphone,
  Monitor,
  QrCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import {
  loginWithGoogle,
  loginWithEmailPassword,
  sendPasswordReset,
  getCleanAuthErrorMessage,
  sanitizeTitleCase,
  syncUserSecurityPinToCloud,
} from "@/lib/authService";
import { staffStore, StaffMember } from "@/lib/staffStore";
import { founderStore } from "@/constants/founderStore";
import { portfolioStore } from "@/constants/portfolioStore";
import { PwaBootSplashScreen } from "@/components/auth/PwaBootSplashScreen";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

interface SavedSession {
  email: string;
  name: string;
  role: "master_admin" | "admin" | "receptionist";
  propertyName?: string;
  securityPin?: string;
  assignedPropertyId?: string;
  hasSetPin?: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [showBootSplash, setShowBootSplash] = useState(true);

  // Auth Flow Steps: "CREDENTIALS" | "PIN_PROMPT" | "SET_OR_RESET_PIN"
  const [authStep, setAuthStep] = useState<"CREDENTIALS" | "PIN_PROMPT" | "SET_OR_RESET_PIN">("CREDENTIALS");
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);

  // Form Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 6-Digit PIN Keyboard & Quick Unlock State
  const [pinValue, setPinValue] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lockoutExpiry, setLockoutExpiry] = useState<number | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);

  // Banking 2-Step PIN Setup & Reset State
  const [isResetMode, setIsResetMode] = useState(false); // false = Set New PIN, true = 🔄 Reset PIN
  const [pinCreationStep, setPinCreationStep] = useState<"ENTER" | "CONFIRM">("ENTER");
  const [firstTimePin, setFirstTimePin] = useState(""); // Step 1 entered PIN
  const [confirmPinValue, setConfirmPinValue] = useState(""); // Step 2 entered PIN
  const [pinMismatchError, setPinMismatchError] = useState<string | null>(null);
  const [isPinMatching, setIsPinMatching] = useState(false);

  // Reset PIN with Password Modal State
  const [showPasswordResetPinModal, setShowPasswordResetPinModal] = useState(false);
  const [verifyPasswordForPin, setVerifyPasswordForPin] = useState("");
  const [verifyPasswordError, setVerifyPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Forgot Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [revokedNotice, setRevokedNotice] = useState<string | null>(null);

  const pinInputRef = useRef<HTMLInputElement>(null);
  const confirmPinInputRef = useRef<HTMLInputElement>(null);

  // Clear any existing lockout
  const clearLockout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tenopilot_pin_lockout");
    }
    setLockoutExpiry(null);
    setWrongAttempts(0);
    setLockoutCountdown(0);
  };

  // Check for saved local device session on mount (Fintech Quick Unlock + Cloud Revalidation)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("verified") === "true") {
        setRevokedNotice("✓ Email verified successfully! Please enter your PIN or credentials to access your dashboard.");
      }

      const notice = sessionStorage.getItem("tenopilot_revoked_notice");
      if (notice) {
        setRevokedNotice(notice);
        sessionStorage.removeItem("tenopilot_revoked_notice");
      }

      const saved = localStorage.getItem("tenopilot_saved_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as SavedSession;
          if (!parsed.email || typeof parsed.email !== "string" || !parsed.email.includes("@")) {
            // Corrupt or legacy session schema -> self heal
            localStorage.removeItem("tenopilot_saved_session");
            setSavedSession(null);
            setAuthStep("CREDENTIALS");
          } else {
            setSavedSession(parsed);
            setEmail(parsed.email);
            if (parsed.hasSetPin === false || !parsed.securityPin) {
              setIsResetMode(false);
              setPinCreationStep("ENTER");
              setAuthStep("SET_OR_RESET_PIN");
            } else {
              setAuthStep("PIN_PROMPT");
            }

            // 🔄 Background Cloud Revalidation: Silently verify latest PIN & account status from Cloud Firestore
            (async () => {
              try {
                const cleanEmail = parsed.email.trim().toLowerCase();
                let cloudPin: string | undefined = undefined;
                let cloudHasSetPin: boolean = false;
                let cloudName: string | undefined = undefined;
                let cloudRole: any = undefined;
                let cloudAssignedProp: string | undefined = undefined;

                // 1. Check staff_accounts collection
                const staffSnap = await getDoc(doc(db, "staff_accounts", cleanEmail));
                if (staffSnap.exists()) {
                  const sData = staffSnap.data();
                  if (sData.securityPin) {
                    cloudPin = sData.securityPin;
                    cloudHasSetPin = true;
                  }
                  if (sData.name) cloudName = sData.name;
                  if (sData.role) cloudRole = sData.role;
                  if (sData.assignedPropertyId) cloudAssignedProp = sData.assignedPropertyId;
                }

                // 2. Check users collection if firebase auth user is present
                if (auth.currentUser) {
                  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
                  if (userSnap.exists()) {
                    const uData = userSnap.data();
                    if (uData.securityPin) {
                      cloudPin = uData.securityPin;
                      cloudHasSetPin = true;
                    }
                    if (uData.displayName) cloudName = uData.displayName;
                    if (uData.role) cloudRole = uData.role;
                    if (uData.assignedPropertyId) cloudAssignedProp = uData.assignedPropertyId;
                  }
                }

                if (cloudPin || cloudHasSetPin) {
                  const updatedSession: SavedSession = {
                    ...parsed,
                    securityPin: cloudPin || parsed.securityPin,
                    hasSetPin: true,
                    name: cloudName || parsed.name,
                    role: cloudRole || parsed.role,
                    assignedPropertyId: cloudAssignedProp || parsed.assignedPropertyId,
                  };
                  setSavedSession(updatedSession);
                  localStorage.setItem("tenopilot_saved_session", JSON.stringify(updatedSession));
                  if (updatedSession.securityPin) {
                    setAuthStep("PIN_PROMPT");
                  }
                }
              } catch (syncErr) {
                console.warn("Background session revalidation notice:", syncErr);
              }
            })();
          }
        } catch {
          localStorage.removeItem("tenopilot_saved_session");
          setSavedSession(null);
          setAuthStep("CREDENTIALS");
        }
      }

      const lockout = localStorage.getItem("tenopilot_pin_lockout");
      if (lockout) {
        const expiry = parseInt(lockout, 10);
        if (expiry > Date.now()) {
          setLockoutExpiry(expiry);
          setWrongAttempts(5);
        } else {
          localStorage.removeItem("tenopilot_pin_lockout");
        }
      }
    }
  }, []);

  // Lockout Countdown Timer
  useEffect(() => {
    if (!lockoutExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutExpiry - Date.now()) / 1000));
      setLockoutCountdown(remaining);
      if (remaining <= 0) {
        clearLockout();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutExpiry]);

  // Focus PIN input on PIN_PROMPT or SET_OR_RESET_PIN
  useEffect(() => {
    if (authStep === "PIN_PROMPT") {
      pinInputRef.current?.focus();
    } else if (authStep === "SET_OR_RESET_PIN") {
      if (pinCreationStep === "ENTER") {
        pinInputRef.current?.focus();
      } else {
        confirmPinInputRef.current?.focus();
      }
    }
  }, [authStep, pinCreationStep]);

  // Handle Step 1: Email + Handover Password Authentication
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Sign in with Firebase Auth or staff credentials (supports both Phone Number & Email)
      const loginResult = await loginWithEmailPassword(email, password);
      const cleanEmail = loginResult.email || email.trim().toLowerCase();

      // Successfully authenticated with credentials -> Immediately clear lockout
      clearLockout();

      // Check staff_accounts collection in Firestore
      let staffData: any = null;
      try {
        const staffSnap = await getDoc(doc(db, "staff_accounts", cleanEmail));
        if (staffSnap.exists()) {
          staffData = staffSnap.data();
        }
      } catch (fsErr) {
        console.warn("Firestore staff check fallback:", fsErr);
      }

      // Check users collection in Firestore if currentUser available
      let userData: any = null;
      if (auth.currentUser) {
        try {
          const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userSnap.exists()) {
            userData = userSnap.data();
          }
        } catch {}
      }

      const allStaff = staffStore.getAllGlobalStaff();
      const match = allStaff.find((s) => s.email.toLowerCase() === cleanEmail);

      const hasUserSetPin =
        userData?.hasSetPin === true ||
        staffData?.hasSetPin === true ||
        (match && match.hasSetPin === true);

      const resolvedPin =
        userData?.securityPin ||
        staffData?.securityPin ||
        match?.securityPin;

      const ownerName = userData?.displayName || staffData?.name || match?.name || sanitizeTitleCase(cleanEmail.split("@")[0]) || "Property Owner";
      const resolvedPropName =
        userData?.pgName ||
        userData?.propertyName ||
        userData?.primaryPropertyName ||
        staffData?.propertyName ||
        match?.propertyName ||
        `${ownerName} PG`;

      const resolvedPropId =
        userData?.assignedPropertyId ||
        userData?.propertyId ||
        staffData?.assignedPropertyId ||
        match?.assignedPropertyId ||
        resolvedPropName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

      const session: SavedSession = {
        email: cleanEmail,
        name: ownerName,
        role: userData?.role || staffData?.role || match?.role || (cleanEmail.includes("rec") ? "receptionist" : "master_admin"),
        propertyName: resolvedPropName,
        assignedPropertyId: resolvedPropId,
        securityPin: hasUserSetPin ? resolvedPin : undefined,
        hasSetPin: hasUserSetPin && Boolean(resolvedPin),
      };

      setSavedSession(session);
      localStorage.setItem("tenopilot_saved_session", JSON.stringify(session));
      localStorage.removeItem("tenopilot_portfolio_properties");
      portfolioStore.clear();
      staffStore.setActiveRole(session.role);

      // Route to PIN_PROMPT if PIN is already set, or SET_OR_RESET_PIN if not
      if (hasUserSetPin && resolvedPin) {
        setAuthStep("PIN_PROMPT");
        setPinValue("");
      } else {
        setIsResetMode(false);
        setPinCreationStep("ENTER");
        setFirstTimePin("");
        setConfirmPinValue("");
        setPinMismatchError(null);
        setAuthStep("SET_OR_RESET_PIN");
      }
    } catch (err: any) {
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 1: Sign in with Google (Strict Login Mode)
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await loginWithGoogle(false); // isSignUpMode = false
      if (!result) return;

      // Master verification passed! Immediately clear any lockout freeze
      clearLockout();

      const userEmail = result.user.email?.toLowerCase() || "";
      const allStaff = staffStore.getAllGlobalStaff();
      const match = allStaff.find((s) => s.email.toLowerCase() === userEmail);

      const hasUserSetPin =
        (result.profile.hasSetPin === true && Boolean(result.profile.securityPin)) ||
        (match && match.hasSetPin === true && Boolean(match.securityPin));

      const resolvedPin = result.profile.securityPin || match?.securityPin;
      const gOwnerName = result.profile.displayName || match?.name || "Estate Master Admin";
      const gPropName = match?.propertyName || `${gOwnerName} PG`;
      const gPropId = result.profile.assignedPropertyId || match?.assignedPropertyId || gPropName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

      const session: SavedSession = {
        email: userEmail,
        name: gOwnerName,
        role: result.profile.role || match?.role || "master_admin",
        propertyName: gPropName,
        assignedPropertyId: gPropId,
        securityPin: hasUserSetPin ? resolvedPin : undefined,
        hasSetPin: hasUserSetPin,
      };

      setSavedSession(session);
      localStorage.setItem("tenopilot_saved_session", JSON.stringify(session));
      localStorage.removeItem("tenopilot_portfolio_properties");
      portfolioStore.clear();
      staffStore.setActiveRole(session.role);

      if (hasUserSetPin && resolvedPin) {
        setAuthStep("PIN_PROMPT");
        setPinValue("");
      } else {
        setIsResetMode(false);
        setPinCreationStep("ENTER");
        setFirstTimePin("");
        setConfirmPinValue("");
        setPinMismatchError(null);
        setAuthStep("SET_OR_RESET_PIN");
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Setting / Resetting Personal 6-Digit PIN (Banking Double-Entry Execution)
  const handleSavePersonalPin = async (finalPin: string) => {
    if (finalPin.length !== 6) {
      setPinMismatchError("Please enter a valid 6-digit security PIN.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPinMismatchError(null);

    try {
      const targetEmail = (savedSession?.email || email || "admin@tenopilot.com").trim().toLowerCase();
      const allStaff = staffStore.getAllGlobalStaff();
      const match = allStaff.find((s) => s.email.toLowerCase() === targetEmail.toLowerCase());

      if (match) {
        await staffStore.setSecurityPin(match.id, finalPin);
      } else {
        const newStaff: StaffMember = {
          id: `staff_user_${Date.now()}`,
          name: savedSession?.name || sanitizeTitleCase(targetEmail.split("@")[0]) || "Master Admin",
          email: targetEmail,
          phone: "+91 98000 00000",
          role: savedSession?.role || "master_admin",
          assignedPropertyId: savedSession?.assignedPropertyId || "sunshine-pg",
          assignedPropertyIds: ["*"],
          propertyName: savedSession?.propertyName || "All Properties",
          status: "Active",
          joinedDate: "Today",
          securityPin: finalPin,
          hasSetPin: true,
        };
        staffStore.addGlobalStaff(newStaff);
      }

      // Sync PIN across both Firestore users and staff_accounts collections & generate new epoch
      const newVersion = await syncUserSecurityPinToCloud(targetEmail, finalPin);

      // Clear any lockout
      clearLockout();

      const updated: SavedSession = {
        ...(savedSession || {
          email: targetEmail,
          name: sanitizeTitleCase(targetEmail.split("@")[0]) || "Master Admin",
          role: "master_admin",
          assignedPropertyId: "sunshine-pg",
        }),
        securityPin: finalPin,
        hasSetPin: true,
      };
      setSavedSession(updated);
      localStorage.setItem("tenopilot_saved_session", JSON.stringify(updated));
      localStorage.setItem("tenopilot_session_version", newVersion);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("tenopilot_session_unlocked", "true");
      }

      const role = updated.role || "master_admin";
      staffStore.setActiveRole(role);

      const isMasterTest = targetEmail === "isharapandey01@gmail.com";
      let hasCompletedOnboarding = true;
      if (!isMasterTest && role === "master_admin") {
        try {
          if (auth.currentUser) {
            const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              hasCompletedOnboarding = uData.onboardingCompleted === true;
            }
          }
        } catch {}
      }

      const targetProp = updated.assignedPropertyId || "sunshine-pg";
      const targetPath = !hasCompletedOnboarding
        ? "/welcome"
        : (role === "master_admin" ? "/home" : `/p/${targetProp}/overview`);

      router.push(targetPath);
      if (typeof window !== "undefined") {
        window.location.href = targetPath;
      }
    } catch (err: any) {
      setError("Failed to save PIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify PIN & Smart Redirection (Strict Cloud-First Authority with Local Fallback)
  const verifyAndRedirect = async (inputPin: string) => {
    setIsLoading(true);
    setError(null);

    const targetEmail = (savedSession?.email || email || "admin@gmail.com").trim().toLowerCase();
    
    let isValid = false;
    let cloudFound = false;
    let activeSessionVersion = "";
    let resolvedRole = savedSession?.role || "master_admin";
    let resolvedName = savedSession?.name || "Team Member";
    let resolvedProp = savedSession?.assignedPropertyId || "sunshine-pg";
    let member: StaffMember | undefined = undefined;

    // 1. CLOUD-FIRST AUTHORITY: Query Firestore first as the definitive source of truth
    try {
      // 1A. Check staff_accounts collection
      const staffSnap = await getDoc(doc(db, "staff_accounts", targetEmail));
      if (staffSnap.exists()) {
        cloudFound = true;
        const data = staffSnap.data();
        if (data.sessionVersion) activeSessionVersion = data.sessionVersion;
        if (data.name) resolvedName = data.name;
        if (data.role) resolvedRole = data.role;
        if (data.assignedPropertyId) resolvedProp = data.assignedPropertyId;

        if (data.securityPin) {
          if (data.securityPin === inputPin) {
            isValid = true;
          } else {
            // Cloud has a PIN and input does NOT match cloud PIN -> Strict Reject!
            isValid = false;
          }
        }
      }

      // 1B. Check users collection if not found or if user is logged in via Auth
      if (!cloudFound || (!isValid && auth.currentUser)) {
        const uid = auth.currentUser?.uid;
        if (uid) {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            cloudFound = true;
            const uData = userSnap.data();
            if (uData.sessionVersion) activeSessionVersion = uData.sessionVersion;
            if (uData.displayName) resolvedName = uData.displayName;
            if (uData.role) resolvedRole = uData.role;
            if (uData.assignedPropertyId) resolvedProp = uData.assignedPropertyId;

            if (uData.securityPin) {
              if (uData.securityPin === inputPin) {
                isValid = true;
              } else {
                isValid = false;
              }
            }
          }
        }
      }
    } catch (cloudErr) {
      console.warn("Cloud Firestore PIN verification network fallback:", cloudErr);
    }

    // 2. OFFLINE / LOCAL FALLBACK: Only if Cloud Firestore was completely unreachable/offline or document not created yet
    if (!cloudFound) {
      if (savedSession?.securityPin && savedSession.securityPin === inputPin) {
        isValid = true;
      } else {
        const verification = staffStore.verifySecurityPin(targetEmail, inputPin);
        isValid = verification.valid;
        member = verification.member;
      }
    }

    if (isValid) {
      // Clear lockout state on successful unlock
      clearLockout();

      const updatedSession: SavedSession = {
        ...(savedSession || {}),
        email: targetEmail,
        name: resolvedName,
        role: (resolvedRole as any) || "master_admin",
        assignedPropertyId: resolvedProp,
        securityPin: inputPin,
        hasSetPin: true,
      };

      setSavedSession(updatedSession);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("tenopilot_session_unlocked", "true");
        localStorage.setItem("tenopilot_saved_session", JSON.stringify(updatedSession));
        if (activeSessionVersion) {
          localStorage.setItem("tenopilot_session_version", activeSessionVersion);
        }
      }

      const role = updatedSession.role || "master_admin";
      staffStore.setActiveRole(role);

      const isMasterTest = updatedSession.email === "isharapandey01@gmail.com";
      let hasCompletedOnboarding = true;
      if (!isMasterTest && role === "master_admin") {
        try {
          if (auth.currentUser) {
            const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              hasCompletedOnboarding = uData.onboardingCompleted === true;
            }
          }
        } catch {}
      }

      const targetProperty = updatedSession.assignedPropertyId || "sunshine-pg";
      const targetPath = !hasCompletedOnboarding
        ? "/welcome"
        : (role === "master_admin" ? "/home" : `/p/${targetProperty}/overview`);

      router.push(targetPath);
      if (typeof window !== "undefined") {
        window.location.href = targetPath;
      }
    } else {
      setIsLoading(false);
      const newAttempts = wrongAttempts + 1;
      setWrongAttempts(newAttempts);
      setPinValue("");

      if (newAttempts >= 5) {
        const expiry = Date.now() + 15 * 60 * 1000;
        setLockoutExpiry(expiry);
        if (typeof window !== "undefined") {
          localStorage.setItem("tenopilot_pin_lockout", expiry.toString());
        }
        setError("🔒 Account locked due to 5 incorrect attempts. Please wait 15 minutes or verify with password/Google.");
      } else {
        setError(`Incorrect 6-digit PIN. (${5 - newAttempts} attempts remaining)`);
      }
    }
  };

  // Handle 1-Click Google Verification to Reset PIN (For Google/Gmail Users)
  const handleVerifyWithGoogleForPinReset = async () => {
    setVerifyPasswordError(null);
    setIsVerifyingPassword(true);

    try {
      const result = await loginWithGoogle(false);
      if (!result) return;

      const googleEmail = result.user.email?.toLowerCase() || "";
      const currentTargetEmail = (savedSession?.email || email).toLowerCase().trim();

      // Ensure the same Google account was selected if a session was active
      if (currentTargetEmail && googleEmail && googleEmail !== currentTargetEmail) {
        throw new Error(
          `Google account (${googleEmail}) does not match the active session (${currentTargetEmail}). Please choose ${currentTargetEmail}.`
        );
      }

      // Google identity verified! Clear lockout and open PIN creation in Reset Mode
      clearLockout();
      setShowPasswordResetPinModal(false);
      setVerifyPasswordForPin("");
      setIsResetMode(true);
      setPinCreationStep("ENTER");
      setFirstTimePin("");
      setConfirmPinValue("");
      setPinMismatchError(null);
      setIsPinMatching(false);
      setAuthStep("SET_OR_RESET_PIN");
    } catch (err: any) {
      console.error("Google Re-Auth Error:", err);
      setVerifyPasswordError(getCleanAuthErrorMessage(err));
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Handle Verify Password to Reset PIN (For Password/Staff Users)
  const handleVerifyPasswordForPinReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyPasswordError(null);
    setIsVerifyingPassword(true);

    try {
      const targetEmail = savedSession?.email || email;
      await loginWithEmailPassword(targetEmail, verifyPasswordForPin);

      // Password verified! Clear lockout and open PIN creation in Reset Mode
      clearLockout();
      setShowPasswordResetPinModal(false);
      setVerifyPasswordForPin("");
      setIsResetMode(true);
      setPinCreationStep("ENTER");
      setFirstTimePin("");
      setConfirmPinValue("");
      setPinMismatchError(null);
      setIsPinMatching(false);
      setAuthStep("SET_OR_RESET_PIN");
    } catch (err: any) {
      setVerifyPasswordError("Incorrect account password. If you signed in with Google, please click 'Verify with Google Account' above.");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleSwitchAccount = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tenopilot_session_unlocked");
      localStorage.removeItem("tenopilot_saved_session");
      localStorage.removeItem("tenopilot_global_staff");
      localStorage.removeItem("tenopilot_pin_lockout");
      localStorage.removeItem("tenopilot_active_role");
      localStorage.removeItem("tenopilot_session_version");
    }
    clearLockout();
    setSavedSession(null);
    setAuthStep("CREDENTIALS");
    setPinValue("");
    setEmail("");
    setPassword("");
    setError(null);
    setRevokedNotice(null);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);
    setIsResetting(true);

    try {
      await sendPasswordReset(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(getCleanAuthErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      {/* 🎬 1-Second PWA Boot Splash Screen on Launch */}
      {showBootSplash && (
        <PwaBootSplashScreen onComplete={() => setShowBootSplash(false)} durationMs={1100} />
      )}

      <div className="min-h-screen bg-[#f7f4ee] text-[#201a17] flex relative overflow-hidden font-sans">
        
        {/* MOBILE BACKGROUND */}
        <div className="lg:hidden absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Image
            src="/tenopilot-leather-emblem.jpg"
            alt="TenoPilot Leather Emblem"
            fill
            priority
            className="object-cover object-center opacity-30 scale-105 filter blur-xs"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f7f4ee]/85 via-[#f7f4ee]/90 to-[#f7f4ee]" />
        </div>

        {/* DESKTOP LEFT 40%: Capped Artwork Panel */}
        <div className="hidden lg:block lg:w-[40%] xl:w-[38%] 2xl:max-w-[580px] shrink-0 relative min-h-screen bg-[#f7f4ee] overflow-hidden border-r border-[#e8dfd8]">
          <Image
            src="/tenopilot-leather-emblem.jpg"
            alt="TenoPilot 3D Leather Emblem Artwork"
            fill
            priority
            className="object-cover object-center"
          />
        </div>

        {/* RIGHT 60%: Responsive White Portal */}
        <div className="w-full lg:flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 bg-white min-h-screen overflow-y-auto">
          <div className="w-full max-w-md space-y-5 my-auto">

            {/* Header: App Icon & Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex justify-center mb-0.5">
                <Image
                  src="/tenopilot-app-icon.png"
                  alt="TenoPilot App Icon"
                  width={48}
                  height={48}
                  className="rounded-2xl shadow-sm hover:scale-105 transition-transform"
                  priority
                />
              </div>
              <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#201a17] tracking-tight">
                {authStep === "SET_OR_RESET_PIN"
                  ? isResetMode
                    ? "Reset Security PIN"
                    : "Set Your Security PIN"
                  : authStep === "PIN_PROMPT"
                  ? "Enter Security PIN"
                  : "Welcome to TenoPilot.com"}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {authStep === "SET_OR_RESET_PIN"
                  ? isResetMode
                    ? "Create and confirm your new 6-digit PIN for rapid device unlock"
                    : "Create and confirm your personal 6-digit PIN for rapid device unlock"
                  : authStep === "PIN_PROMPT"
                  ? "Enter your 6-digit access code to unlock workspace"
                  : "Sign in to manage your properties & residents"}
              </p>
            </div>

            {/* Multi-Device Revocation Security Notice */}
            {revokedNotice && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-semibold animate-in fade-in shadow-2xs">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{revokedNotice}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-900 font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: INITIAL CREDENTIALS (Email & Handover Password or Google) */}
            {authStep === "CREDENTIALS" && (
              <div className="space-y-4">
                {/* Sign in with Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 font-bold text-xs text-gray-700 flex items-center justify-center gap-2.5 transition-all shadow-2xs active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </button>

                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-gray-200 w-full" />
                  <span className="bg-white px-3 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                    Or Sign In with Phone / Email
                  </span>
                </div>

                <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Mobile Number or Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="9876543210 or owner@gmail.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#c2652a] focus:outline-hidden bg-white text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="text-[11px] font-bold text-[#c2652a] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#c2652a] focus:outline-hidden bg-white text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50 mt-2"
                  >
                    <span>{isLoading ? "Authenticating..." : "Continue to Workspace"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="text-center text-xs text-gray-500 pt-2">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-bold text-[#c2652a] hover:underline">
                    Sign Up
                  </Link>
                </div>
              </div>
            )}

            {/* STEP 2A: SET OR RESET PERSONAL 6-DIGIT PIN (BANKING 2-STEP DOUBLE-ENTRY) */}
            {authStep === "SET_OR_RESET_PIN" && (
              <div className="space-y-5 bg-orange-50/50 p-6 rounded-3xl border border-orange-200 text-center animate-in fade-in shadow-xs">
                {/* Mode & Step Badges */}
                <div className="flex flex-col items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isResetMode ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-orange-100 text-[#c2652a] border border-orange-200"
                  }`}>
                    {isResetMode ? <RotateCcw className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                    <span>{isResetMode ? "🔄 Reset PIN" : "🔑 Set New PIN"}</span>
                  </span>

                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <span className={`px-2.5 py-0.5 rounded-full transition-colors ${pinCreationStep === "ENTER" ? "bg-[#c2652a] text-white font-bold shadow-2xs" : "bg-gray-200 text-gray-700"}`}>
                      1. Enter PIN
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className={`px-2.5 py-0.5 rounded-full transition-colors ${pinCreationStep === "CONFIRM" ? "bg-[#c2652a] text-white font-bold shadow-2xs" : "bg-gray-200 text-gray-700"}`}>
                      2. Confirm PIN
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="font-serif font-bold text-xl text-gray-900">
                    {pinCreationStep === "ENTER"
                      ? isResetMode
                        ? "Enter New 6-Digit PIN"
                        : `Welcome, ${savedSession?.name || "Team Member"}! 🎉`
                      : "Confirm New 6-Digit PIN"}
                  </h2>
                  <p className="text-xs text-gray-600">
                    {pinCreationStep === "ENTER"
                      ? "Choose a memorable 6-digit PIN for rapid device unlock."
                      : "Re-enter the exact same 6-digit PIN to confirm and activate."}
                  </p>
                </div>

                {pinMismatchError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center justify-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{pinMismatchError}</span>
                  </div>
                )}

                {isPinMatching && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center justify-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>PINs match! Saving securely to cloud...</span>
                  </div>
                )}

                {/* STEP 1: ENTER PIN */}
                {pinCreationStep === "ENTER" && (
                  <div className="space-y-4">
                    <div>
                      <input
                        ref={pinInputRef}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        disabled={isLoading}
                        value={firstTimePin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setFirstTimePin(val);
                          setPinMismatchError(null);
                          if (val.length === 6) {
                            setTimeout(() => {
                              setPinCreationStep("CONFIRM");
                              setConfirmPinValue("");
                              confirmPinInputRef.current?.focus();
                            }, 200);
                          }
                        }}
                        placeholder="••••••"
                        className="w-full max-w-[200px] mx-auto px-4 py-3 rounded-2xl border-2 border-[#c2652a] font-mono text-center font-bold tracking-[0.5em] text-2xl bg-white shadow-xs focus:ring-4 focus:ring-orange-200 focus:outline-hidden"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Auto-advances when all 6 digits are typed
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={firstTimePin.length !== 6 || isLoading}
                      onClick={() => {
                        setPinCreationStep("CONFIRM");
                        setConfirmPinValue("");
                        setTimeout(() => confirmPinInputRef.current?.focus(), 100);
                      }}
                      className="w-full py-3 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                    >
                      <span>Next: Confirm PIN</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* STEP 2: CONFIRM PIN */}
                {pinCreationStep === "CONFIRM" && (
                  <div className="space-y-4">
                    <div>
                      <input
                        ref={confirmPinInputRef}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        disabled={isLoading || isPinMatching}
                        value={confirmPinValue}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setConfirmPinValue(val);
                          setPinMismatchError(null);
                          if (val.length === 6) {
                            if (val === firstTimePin) {
                              setIsPinMatching(true);
                              setTimeout(() => {
                                handleSavePersonalPin(val);
                              }, 350);
                            } else {
                              setIsPinMatching(false);
                              setPinMismatchError("PINs do not match. Please re-enter.");
                              setTimeout(() => {
                                setConfirmPinValue("");
                              }, 1200);
                            }
                          }
                        }}
                        placeholder="••••••"
                        className="w-full max-w-[200px] mx-auto px-4 py-3 rounded-2xl border-2 border-[#c2652a] font-mono text-center font-bold tracking-[0.5em] text-2xl bg-white shadow-xs focus:ring-4 focus:ring-orange-200 focus:outline-hidden"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Auto-submits when confirmed correctly
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPinCreationStep("ENTER");
                          setFirstTimePin("");
                          setConfirmPinValue("");
                          setPinMismatchError(null);
                          setTimeout(() => pinInputRef.current?.focus(), 100);
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer transition-all active:scale-98"
                      >
                        ← Change PIN
                      </button>

                      <button
                        type="button"
                        disabled={confirmPinValue.length !== 6 || isLoading || isPinMatching}
                        onClick={() => {
                          if (confirmPinValue === firstTimePin) {
                            setIsPinMatching(true);
                            handleSavePersonalPin(confirmPinValue);
                          } else {
                            setIsPinMatching(false);
                            setPinMismatchError("PINs do not match. Please re-enter.");
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                      >
                        <span>{isLoading ? "Saving PIN..." : "Confirm & Save"}</span>
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-orange-200/60">
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="text-gray-500 hover:text-gray-900 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>← Back to Sign In with Password</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2B: RETURNING USER - 6-DIGIT QUICK UNLOCK PIN */}
            {authStep === "PIN_PROMPT" && (
              <div className="space-y-5 text-center animate-in fade-in">
                {/* Account Profile Pill */}
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-700">
                  <div className="w-8 h-8 rounded-full bg-[#c2652a] text-white font-bold flex items-center justify-center text-xs">
                    {savedSession?.name?.charAt(0) || "U"}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 leading-tight">
                      {savedSession?.name || "Estate Admin"}
                    </p>
                    <p className="text-[11px] text-gray-500">{savedSession?.email || email}</p>
                  </div>
                </div>

                {/* Direct 6-Digit Keyboard Input with Auto-Submit */}
                <div className="space-y-2 max-w-xs mx-auto">
                  <label className="block text-xs font-bold text-gray-600">
                    Enter 6-Digit Security PIN
                  </label>
                  <input
                    ref={pinInputRef}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    disabled={lockoutExpiry !== null || isLoading}
                    value={pinValue}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPinValue(val);
                      if (val.length === 6) {
                        verifyAndRedirect(val);
                      }
                    }}
                    placeholder="••••••"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-300 focus:border-[#c2652a] font-mono text-center font-bold tracking-[0.5em] text-2xl bg-white shadow-xs focus:ring-4 focus:ring-orange-100 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-gray-400">
                    {lockoutExpiry ? `Locked: ${lockoutCountdown}s remaining` : "Auto-submits on 6th digit"}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs font-bold pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyPasswordError(null);
                      setVerifyPasswordForPin("");
                      setShowPasswordResetPinModal(true);
                    }}
                    className="text-[#c2652a] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Forgot PIN? Reset Security PIN</span>
                  </button>

                  <span className="hidden sm:inline text-gray-300">•</span>

                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="text-gray-500 hover:text-gray-900 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Switch Account / Sign In with Password</span>
                  </button>
                </div>
              </div>
            )}

            {/* PWA 1-Click Install Card - Only on Fresh Credentials Step */}
            {authStep === "CREDENTIALS" && (
              <div className="p-4 rounded-3xl bg-orange-50/50 border border-orange-100 flex items-center gap-4 text-xs">
                <div className="w-14 h-14 bg-white p-2.5 rounded-2xl border border-orange-200 shrink-0 flex items-center justify-center shadow-xs">
                  <QrCode className="w-8 h-8 text-[#c2652a]" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="font-bold text-gray-900 leading-tight">Install TenoPilot App</p>
                  <p className="text-[10px] text-gray-500">Fast 1-click access directly from your mobile or desktop home screen.</p>
                  <div className="flex gap-2 pt-0.5">
                    <Link
                      href="/install"
                      className="px-3 py-1.5 rounded-xl bg-[#c2652a] text-white font-bold text-[10px] hover:bg-[#a65420] transition-colors flex items-center gap-1"
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>Install App →</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 🔐 Identity Verification Modal to Reset PIN */}
      {showPasswordResetPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-900">
                <ShieldCheck className="w-5 h-5 text-[#c2652a]" />
                <h3 className="font-serif font-bold text-base">Reset Security PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordResetPinModal(false);
                  setVerifyPasswordError(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-gray-500 text-[11px] leading-relaxed">
              Verify your identity to reset your 6-digit Security PIN for{" "}
              <strong className="text-gray-800 font-semibold">{savedSession?.email || email}</strong>.
            </p>

            {verifyPasswordError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl font-semibold flex items-center gap-2 text-[11px]">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{verifyPasswordError}</span>
              </div>
            )}

            {/* 1. Google 1-Click Verification Option */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleVerifyWithGoogleForPinReset}
                disabled={isVerifyingPassword}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-xs flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isVerifyingPassword ? "Verifying..." : "Verify with Google Account"}</span>
              </button>

              <div className="flex items-center gap-2 my-2 text-gray-400">
                <hr className="flex-1 border-gray-200" />
                <span className="text-[10px] font-bold uppercase tracking-wider">or with password</span>
                <hr className="flex-1 border-gray-200" />
              </div>

              {/* 2. Password Verification Form (for Staff & Password accounts) */}
              <form onSubmit={handleVerifyPasswordForPinReset} className="space-y-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Account Password</label>
                  <input
                    type="password"
                    value={verifyPasswordForPin}
                    onChange={(e) => setVerifyPasswordForPin(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#c2652a] text-xs bg-white text-gray-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordResetPinModal(false);
                      setVerifyPasswordError(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingPassword || !verifyPasswordForPin}
                    className="px-4 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {isVerifyingPassword ? "Verifying..." : "Verify & Set PIN"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-gray-900">Reset Password</h3>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-medium">
                ✅ Password reset email sent! Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                {resetError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg">
                    {resetError}
                  </div>
                )}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Your Work Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#c2652a] text-xs bg-white text-gray-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs"
                >
                  {isResetting ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
