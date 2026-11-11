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
  MessageSquare,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  continueWithGoogle,
  loginWithGoogle,
  loginWithEmailPassword,
  sendPasswordReset,
  getCleanAuthErrorMessage,
  sanitizeTitleCase,
  syncUserSecurityPinToCloud,
  checkAccountRegistrationStatus,
  isGenuineIndianMobile,
} from "@/lib/authService";
import { getStoredPlatformConfig } from "@/lib/platformConfig";
import { staffStore, StaffMember } from "@/lib/staffStore";
import { founderStore } from "@/constants/founderStore";
import { portfolioStore } from "@/constants/portfolioStore";
import { PwaBootSplashScreen } from "@/components/auth/PwaBootSplashScreen";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

function getCleanRedirectUrl(fallback: string, userAssignedProp?: string, isFounder?: boolean): string {
  if (typeof window === "undefined") return fallback;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get("redirect");
    const sessionRedirect = sessionStorage.getItem("tenopilot_post_login_redirect");
    const candidate = redirectParam || sessionRedirect;
    if (
      candidate &&
      candidate.startsWith("/") &&
      !candidate.startsWith("//") &&
      !candidate.startsWith("/login") &&
      !candidate.startsWith("/signup")
    ) {
      sessionStorage.removeItem("tenopilot_post_login_redirect");

      // 🔒 MULTI-TENANT ISOLATION BARRIER:
      // If candidate targets a specific property /p/[propertyId]/...,
      // strictly verify that the user is authorized for that building.
      if (candidate.startsWith("/p/")) {
        const parts = candidate.split("/");
        const candidateProp = parts[2];
        const isPublicDesk = candidate.includes("/public-complaint") || candidate.includes("/self-kyc-checkin");
        if (
          !isPublicDesk &&
          candidateProp &&
          candidateProp !== userAssignedProp &&
          candidateProp !== "sunshine-pg" &&
          !isFounder
        ) {
          // Never redirect into another owner's property!
          return fallback;
        }
      }

      return candidate;
    }
  } catch {}
  return fallback;
}
import { PhoneAuthCard } from "@/components/auth/PhoneAuthCard";
import { EmailAuthCard } from "@/components/auth/EmailAuthCard";

interface SavedSession {
  email: string;
  name: string;
  role: "master_admin" | "admin" | "receptionist";
  propertyName?: string;
  securityPin?: string;
  assignedPropertyId?: string;
  hasSetPin?: boolean;
  phone?: string;
  plan?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  planExpiresAt?: string | null;
  trialEndsAtMs?: number | string | null;
  masterAdminUid?: string;
  ownerEmail?: string;
  primaryUid?: string;
  uid?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [showBootSplash, setShowBootSplash] = useState(true);

  // Auth Flow Steps: "CREDENTIALS" | "PHONE" | "EMAIL" | "PIN_PROMPT" | "SET_OR_RESET_PIN"
  const [authStep, setAuthStep] = useState<"CREDENTIALS" | "PHONE" | "EMAIL" | "PIN_PROMPT" | "SET_OR_RESET_PIN">("CREDENTIALS");
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

  // Multi-Channel PIN Reset State with Strict Live Cloud Verification
  interface VerifiedResetAccount {
    exists: boolean;
    uid?: string;
    role?: string;
    displayName?: string;
    phone?: string;
    email?: string;
    hasPhone: boolean;
    hasEmail: boolean;
    isStaff: boolean;
    assignedPropertyId?: string;
    staffId?: string;
  }

  const [resetOtpChannel, setResetOtpChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [resetOtpStep, setResetOtpStep] = useState<"VERIFY_ACCOUNT" | "SELECT_CHANNEL" | "ENTER_OTP">("VERIFY_ACCOUNT");
  const [verifiedResetAccount, setVerifiedResetAccount] = useState<VerifiedResetAccount | null>(null);
  const [resetIdentifierInput, setResetIdentifierInput] = useState("");
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const [accountVerificationError, setAccountVerificationError] = useState<string | null>(null);
  const [resetOtpDigits, setResetOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resetOtpToken, setResetOtpToken] = useState("");
  const [resetOtpCooldown, setResetOtpCooldown] = useState(0);
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const [resetOtpError, setResetOtpError] = useState<string | null>(null);
  const [resetOtpSuccess, setResetOtpSuccess] = useState<string | null>(null);
  const [showLegacyPasswordFallback, setShowLegacyPasswordFallback] = useState(false);
  const resetOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer for PIN reset OTP resend
  useEffect(() => {
    if (resetOtpCooldown <= 0) return;
    const interval = setInterval(() => {
      setResetOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetOtpCooldown]);

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
    setError(null);
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
          const hasIdentifier = Boolean(parsed.email || parsed.phone || parsed.name || parsed.securityPin);
          if (!hasIdentifier) {
            localStorage.removeItem("tenopilot_saved_session");
            setSavedSession(null);
            setAuthStep("CREDENTIALS");
          } else {
            setSavedSession(parsed);
            if (parsed.email) setEmail(parsed.email);
            if (parsed.hasSetPin === false || !parsed.securityPin) {
              setIsResetMode(false);
              setPinCreationStep("ENTER");
              setAuthStep("SET_OR_RESET_PIN");
            } else {
              // 🚀 OPTION A: INSTANT 6-DIGIT MPIN QUICK UNLOCK ON REOPEN
              setAuthStep("PIN_PROMPT");
            }

            // 🔄 Background Cloud Revalidation: Silently verify latest PIN & account status from Cloud Firestore
            (async () => {
              try {
                const cleanEmail = (parsed.email || "").trim().toLowerCase();
                const isMasterDemo = cleanEmail === "isharapandey01@gmail.com";

                // 🛑 ONLY evict if explicitly found in purged_accounts (never wipe on network blips or phone sessions!)
                if (!isMasterDemo && cleanEmail && !cleanEmail.includes("auth.tenopilot")) {
                  try {
                    const purgedDoc = await getDoc(doc(db, "purged_accounts", cleanEmail));
                    if (purgedDoc.exists()) {
                      console.warn(`[Login] Account explicitly purged: ${cleanEmail}`);
                      localStorage.removeItem("tenopilot_saved_session");
                      localStorage.removeItem("tenopilot_portfolio_properties");
                      portfolioStore.clear();
                      setSavedSession(null);
                      setAuthStep("CREDENTIALS");
                      try { await signOut(auth); } catch {}
                      return;
                    }
                  } catch {}
                }

                let cloudPin: string | undefined = undefined;
                let cloudPinUpdatedAt: number = 0;
                let cloudHasSetPin: boolean = false;
                let cloudName: string | undefined = undefined;
                let cloudRole: any = undefined;
                let cloudAssignedProp: string | undefined = undefined;
                let cloudPropName: string | undefined = undefined;

                const updateCandidateCloud = (d: any) => {
                  if (d.displayName && !cloudName) cloudName = d.displayName;
                  if (d.role && !cloudRole) cloudRole = d.role;
                  if (d.assignedPropertyId && !cloudAssignedProp) cloudAssignedProp = d.assignedPropertyId;
                  if ((d.propertyName || d.pgName) && !cloudPropName) cloudPropName = d.propertyName || d.pgName;
                  if (d.securityPin) {
                    const pinTime = d.pinUpdatedAt || 0;
                    if (!cloudPin || pinTime >= cloudPinUpdatedAt) {
                      cloudPin = d.securityPin;
                      cloudPinUpdatedAt = pinTime;
                      cloudHasSetPin = true;
                    }
                  }
                };

                // 1. Check users collection if firebase auth user is present
                if (auth.currentUser) {
                  try {
                    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
                    if (userSnap.exists()) {
                      const uData = userSnap.data();
                      updateCandidateCloud(uData);
                      if (uData.displayName) cloudName = uData.displayName;
                      if (uData.role) cloudRole = uData.role;
                      if (uData.assignedPropertyId) cloudAssignedProp = uData.assignedPropertyId;
                      if (uData.propertyName || uData.pgName) cloudPropName = uData.propertyName || uData.pgName;
                    }
                  } catch {}
                }

                // 2. Check staff_accounts collection
                if (!cloudPin && cleanEmail) {
                  try {
                    const staffSnap = await getDoc(doc(db, "staff_accounts", cleanEmail));
                    if (staffSnap.exists()) {
                      const sData = staffSnap.data();
                      updateCandidateCloud(sData);
                      if (sData.name) cloudName = sData.name;
                      if (sData.role) cloudRole = sData.role;
                      if (sData.assignedPropertyId) cloudAssignedProp = sData.assignedPropertyId;
                      if (sData.propertyName) cloudPropName = sData.propertyName;
                    }
                  } catch {}
                }

                // 3. Fallback check in users collection by email
                if (!cloudPin && cleanEmail) {
                  try {
                    const uQ = query(collection(db, "users"), where("email", "==", cleanEmail));
                    const uSnap = await getDocs(uQ);
                    if (!uSnap.empty) {
                      const uData = uSnap.docs[0].data();
                      updateCandidateCloud(uData);
                      if (uData.displayName) cloudName = uData.displayName;
                      if (uData.role) cloudRole = uData.role;
                      if (uData.assignedPropertyId) cloudAssignedProp = uData.assignedPropertyId;
                      if (uData.propertyName || uData.pgName) cloudPropName = uData.propertyName || uData.pgName;
                    }
                  } catch {}
                }

                // 4. Fallback check in users collection by phone
                if (!cloudPin && parsed.phone) {
                  const pure10 = parsed.phone.replace(/\D/g, "").slice(-10);
                  if (pure10) {
                    try {
                      const pQ = query(collection(db, "users"), where("phone", "==", pure10));
                      const pSnap = await getDocs(pQ);
                      if (!pSnap.empty) {
                        const uData = pSnap.docs[0].data();
                        updateCandidateCloud(uData);
                        if (uData.displayName) cloudName = uData.displayName;
                        if (uData.role) cloudRole = uData.role;
                        if (uData.assignedPropertyId) cloudAssignedProp = uData.assignedPropertyId;
                        if (uData.propertyName || uData.pgName) cloudPropName = uData.propertyName || uData.pgName;
                      }
                    } catch {}
                  }
                }

                if (cloudPin || cloudHasSetPin || cloudPropName || cloudName) {
                  const updatedSession: SavedSession = {
                    ...parsed,
                    securityPin: cloudPin || parsed.securityPin,
                    hasSetPin: true,
                    name: cloudName || parsed.name,
                    role: cloudRole || parsed.role,
                    assignedPropertyId: cloudAssignedProp || parsed.assignedPropertyId,
                    propertyName: cloudPropName || parsed.propertyName,
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
          setAuthStep("CREDENTIALS");
        }
      } else {
        // 🛡️ AUTHENTICATED PERSISTENCE FALLBACK:
        // If user is already authenticated in Firebase Auth (IndexedDB), reconstruct session and prompt MPIN immediately!
        const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            try {
              const uSnap = await getDoc(doc(db, "users", currentUser.uid));
              if (uSnap.exists()) {
                const uData = uSnap.data();
                const cleanPhone = (uData.phone || "").replace(/\D/g, "").slice(-10);
                const recovered: SavedSession = {
                  email: uData.email || currentUser.email || (cleanPhone ? `phone_${cleanPhone}@auth.tenopilot.com` : ""),
                  name: uData.displayName || currentUser.displayName || uData.propertyName || "Property Owner",
                  role: uData.role || "master_admin",
                  propertyName: uData.propertyName || uData.pgName || "",
                  assignedPropertyId: uData.assignedPropertyId || "",
                  phone: uData.phone || "",
                  securityPin: uData.securityPin,
                  hasSetPin: Boolean(uData.hasSetPin && uData.securityPin),
                };
                setSavedSession(recovered);
                localStorage.setItem("tenopilot_saved_session", JSON.stringify(recovered));
                if (recovered.hasSetPin && recovered.securityPin) {
                  setAuthStep("PIN_PROMPT");
                }
              }
            } catch (authRecovErr) {
              console.warn("Auth state session reconstruction notice:", authRecovErr);
            }
          }
        });
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
      if (!userData) {
        try {
          const uQ = query(collection(db, "users"), where("email", "==", cleanEmail));
          const uSnap = await getDocs(uQ);
          if (!uSnap.empty) {
            userData = uSnap.docs[0].data();
          }
        } catch {}
      }

      const isMasterTest = cleanEmail === "isharapandey01@gmail.com";
      const allStaff = staffStore.getAllGlobalStaff();
      const match = allStaff.find((s) => s.email.toLowerCase() === cleanEmail);

      // 🛡️ RE-SYNC / SELF-HEAL PURGED OR ORPHANED ACCOUNTS:
      // If user successfully authenticated with Firebase Auth credentials but has no Firestore document, auto-heal!
      if (!userData && !staffData && !match && !isMasterTest) {
        const targetUid = auth.currentUser?.uid || `user-${Date.now()}`;
        const nowIso = new Date().toISOString();
        const trialExpiryIso = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Clear any stale tombstone in purged_accounts
        try {
          await deleteDoc(doc(db, "purged_accounts", cleanEmail));
        } catch {}

        // 2. Provision clean initial profile
        const freshProfile: any = {
          uid: targetUid,
          email: cleanEmail,
          displayName: auth.currentUser?.displayName ? sanitizeTitleCase(auth.currentUser.displayName) : "Property Owner",
          organizationId: `org_${targetUid}`,
          role: "master_admin",
          assignedPropertyId: "",
          isNewUser: true,
          onboardingCompleted: false,
          hasSetPin: false,
          createdAt: nowIso,
          planExpiresAt: trialExpiryIso,
          plan: "10_DAY_TRIAL",
          subscriptionStatus: "TRIAL",
        };

        await setDoc(doc(db, "users", targetUid), freshProfile, { merge: true });
        userData = freshProfile;

        // 3. Clear stale local cached state
        localStorage.removeItem("tenopilot_saved_session");
        localStorage.removeItem("tenopilot_portfolio_properties");
        portfolioStore.clear();

        // 4. Unlock session and redirect straight to onboarding wizard
        if (typeof window !== "undefined") {
          sessionStorage.setItem("tenopilot_session_unlocked", "true");
        }
        router.push("/welcome");
        return;
      }

      const hasUserSetPin =
        userData?.hasSetPin === true ||
        staffData?.hasSetPin === true ||
        (match && match.hasSetPin === true);

      const resolvedPin =
        userData?.securityPin ||
        staffData?.securityPin ||
        match?.securityPin;

      const isOwnerOnboarded =
        userData?.onboardingCompleted === true ||
        staffData?.role === "admin" ||
        staffData?.role === "receptionist" ||
        match?.role === "admin" ||
        match?.role === "receptionist" ||
        cleanEmail === "isharapandey01@gmail.com";

      const resolvedName =
        userData?.displayName ||
        userData?.name ||
        staffData?.name ||
        match?.name ||
        (auth.currentUser?.displayName ? sanitizeTitleCase(auth.currentUser.displayName) : "Property Owner");

      const resolvedPropName = isOwnerOnboarded
        ? (userData?.pgName || userData?.propertyName || userData?.primaryPropertyName || staffData?.propertyName || match?.propertyName || "")
        : "";

      const resolvedPropId = isOwnerOnboarded
        ? (userData?.assignedPropertyId || userData?.propertyId || staffData?.assignedPropertyId || match?.assignedPropertyId || "")
        : "";

      const session: SavedSession = {
        email: cleanEmail,
        name: resolvedName,
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

  // Handle Step 1: Sign in with Google (Unified Continue with Google)
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await continueWithGoogle();
      if (!result) return;

      // Master verification passed! Immediately clear any lockout freeze
      clearLockout();

      // If new, incomplete, or re-signing up after account purge -> route directly to Onboarding!
      if (result.isNewOrIncomplete) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("tenopilot_saved_session");
          localStorage.removeItem("tenopilot_portfolio_properties");
          localStorage.removeItem("tenopilot_pin_lockout");
          portfolioStore.clear();
          sessionStorage.setItem("tenopilot_session_unlocked", "true");
        }
        router.push("/welcome");
        return;
      }

      const userEmail = result.user.email?.toLowerCase() || "";
      const allStaff = staffStore.getAllGlobalStaff();
      const match = allStaff.find((s) => s.email.toLowerCase() === userEmail);

      const hasUserSetPin =
        (result.profile.hasSetPin === true && Boolean(result.profile.securityPin)) ||
        (match && match.hasSetPin === true && Boolean(match.securityPin));

      const isOwnerOnboarded =
        result.profile.onboardingCompleted === true ||
        result.profile.role === "admin" ||
        result.profile.role === "receptionist" ||
        match?.role === "admin" ||
        match?.role === "receptionist";

      const gOwnerName = result.profile.displayName || match?.name || "Property Owner";
      const gPropName = isOwnerOnboarded ? (match?.propertyName || result.profile.propertyName || "") : "";
      const gPropId = isOwnerOnboarded ? (result.profile.assignedPropertyId || match?.assignedPropertyId || "") : "";

      const gResolvedPin = result.profile.securityPin || match?.securityPin;

      const session: SavedSession = {
        email: userEmail,
        name: gOwnerName,
        role: result.profile.role || match?.role || "master_admin",
        propertyName: gPropName,
        assignedPropertyId: gPropId,
        securityPin: hasUserSetPin ? gResolvedPin : undefined,
        hasSetPin: hasUserSetPin,
      };

      setSavedSession(session);
      localStorage.setItem("tenopilot_saved_session", JSON.stringify(session));
      localStorage.removeItem("tenopilot_portfolio_properties");
      portfolioStore.clear();
      staffStore.setActiveRole(session.role);

      if (hasUserSetPin && gResolvedPin) {
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

  // Handle Setting / Resetting Personal 6-Digit MPIN (Banking Double-Entry Execution)
  const handleSavePersonalPin = async (finalPin: string) => {
    if (finalPin.length !== 6) {
      setPinMismatchError("Please enter a valid 6-digit MPIN.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPinMismatchError(null);

    try {
      const targetEmail = (savedSession?.email || email || "admin@tenopilot.com").trim().toLowerCase();
      const allStaff = staffStore.getAllGlobalStaff();
      const match = allStaff.find(
        (s) =>
          s.email.toLowerCase() === targetEmail.toLowerCase() ||
          (s.phone && savedSession?.phone && s.phone.replace(/\D/g, "").slice(-10) === savedSession.phone.replace(/\D/g, "").slice(-10))
      );
      const unifiedSessionVersion = Date.now().toString();

      // Resolve Phone Number across active session, staff record, or phone login email
      const targetPhone =
        savedSession?.phone ||
        match?.phone ||
        (targetEmail.startsWith("phone_") ? targetEmail.replace(/\D/g, "").slice(-10) : "");

      // 1. LOCAL-FIRST PRE-COMMIT: Update in-memory & localStorage immediately!
      // This guarantees that any real-time snapshot listener sees the exact matching PIN & version.
      const cleanAssignedProp = savedSession?.assignedPropertyId || match?.assignedPropertyId || "";

      if (match) {
        staffStore.setSecurityPinInMemory(match.id, finalPin, unifiedSessionVersion);
      } else {
        const newStaff: StaffMember = {
          id: `staff_user_${Date.now()}`,
          name: savedSession?.name || sanitizeTitleCase(targetEmail.split("@")[0]) || "Master Admin",
          email: targetEmail,
          phone: (targetPhone && isGenuineIndianMobile(targetPhone)) ? targetPhone : (savedSession?.phone || ""),
          role: savedSession?.role || "master_admin",
          assignedPropertyId: cleanAssignedProp,
          assignedPropertyIds: ["*"],
          propertyName: savedSession?.propertyName || "All Properties",
          status: "Active",
          joinedDate: "Today",
          securityPin: finalPin,
          hasSetPin: true,
        };
        staffStore.addGlobalStaff(newStaff);
      }

      // Clear any lockout
      clearLockout();

      const updated: SavedSession = {
        ...(savedSession || {
          email: targetEmail,
          name: sanitizeTitleCase(targetEmail.split("@")[0]) || "Master Admin",
          role: "master_admin",
          assignedPropertyId: cleanAssignedProp,
        }),
        assignedPropertyId: cleanAssignedProp,
        securityPin: finalPin,
        hasSetPin: true,
        phone: targetPhone || savedSession?.phone,
      };
      setSavedSession(updated);
      localStorage.setItem("tenopilot_saved_session", JSON.stringify(updated));
      localStorage.setItem("tenopilot_session_version", unifiedSessionVersion);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("tenopilot_session_unlocked", "true");
      }

      const role = updated.role || "master_admin";
      staffStore.setActiveRole(role);

      // 2. TIMEOUT-GUARDED CLOUD SYNC: Run cloud sync with bi-directional phone & email sync
      const cloudSyncAction = async () => {
        try {
          if (match && match.assignedPropertyId) {
            setDoc(
              doc(db, "properties", match.assignedPropertyId, "staff", match.id),
              {
                securityPin: finalPin,
                hasSetPin: true,
                sessionVersion: unifiedSessionVersion,
                pinUpdatedAt: Date.now(),
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            ).catch(() => {});
          }
          await syncUserSecurityPinToCloud(
            targetEmail,
            finalPin,
            auth.currentUser?.uid,
            unifiedSessionVersion,
            targetPhone
          );
        } catch (syncErr) {
          console.warn("Cloud PIN sync non-blocking warning:", syncErr);
        }
      };

      await Promise.race([
        cloudSyncAction(),
        new Promise((res) => setTimeout(res, 2500)),
      ]);

      // 3. Determine Onboarding & Destination with 1.5s timeout
      let hasCompletedOnboarding = true;
      if (role === "master_admin") {
        try {
          if (auth.currentUser) {
            const checkOnboardingPromise = (async () => {
              const userSnap = await getDoc(doc(db, "users", auth.currentUser!.uid));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                return uData.onboardingCompleted === true;
              }
              return true;
            })();

            hasCompletedOnboarding = await Promise.race([
              checkOnboardingPromise,
              new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1500)),
            ]);
          }
        } catch {
          hasCompletedOnboarding = true;
        }
      }

      const targetProp = updated.assignedPropertyId;
      const defaultPath = !hasCompletedOnboarding
        ? "/welcome"
        : (role === "master_admin" ? "/home" : (targetProp ? `/p/${targetProp}/overview` : "/home"));

      const isFounder = (targetEmail || "").toLowerCase() === "rameshdarisi03@gmail.com";
      const targetPath = hasCompletedOnboarding ? getCleanRedirectUrl(defaultPath, targetProp, isFounder) : defaultPath;

      router.push(targetPath);
      if (typeof window !== "undefined") {
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            window.location.href = targetPath;
          }
        }, 300);
      }
    } catch (err: any) {
      console.error("Save PIN error:", err);
      setError("Failed to save PIN. Please try again.");
      setIsPinMatching(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify PIN & Smart Redirection (Strict Cloud-First Authority with Local Fallback)
  const verifyAndRedirect = async (inputPin: string) => {
    setIsLoading(true);
    setError(null);

    const targetEmail = (savedSession?.email || email || "admin@gmail.com").trim().toLowerCase();
    const isMasterTestUser = targetEmail === "isharapandey01@gmail.com";
    
    let isValid = false;
    let cloudFound = false;
    let activeSessionVersion = "";
    let resolvedRole = savedSession?.role || "master_admin";
    let resolvedName = savedSession?.name || "Team Member";
    let resolvedProp = (savedSession?.assignedPropertyId && (isMasterTestUser || savedSession.assignedPropertyId !== "sunshine-pg"))
      ? savedSession.assignedPropertyId
      : (isMasterTestUser ? "sunshine-pg" : "");
    let member: StaffMember | undefined = undefined;
    let cloudPlan: string | undefined = undefined;
    let cloudSubscriptionPlan: string | undefined = undefined;
    let cloudSubscriptionStatus: string | undefined = undefined;
    let cloudPlanExpiresAt: string | null | undefined = undefined;
    let cloudTrialEndsAtMs: number | string | null | undefined = undefined;
    let cloudMasterAdminUid: string | undefined = undefined;
    let cloudOwnerEmail: string | undefined = undefined;

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
        if (data.assignedPropertyId && (isMasterTestUser || data.assignedPropertyId !== "sunshine-pg")) {
          resolvedProp = data.assignedPropertyId;
        }
        if (data.plan) cloudPlan = data.plan;
        if (data.subscriptionPlan) cloudSubscriptionPlan = data.subscriptionPlan;
        if (data.subscriptionStatus) cloudSubscriptionStatus = data.subscriptionStatus;
        if (data.planExpiresAt !== undefined) cloudPlanExpiresAt = data.planExpiresAt;
        if (data.trialEndsAtMs !== undefined) cloudTrialEndsAtMs = data.trialEndsAtMs;
        if (data.masterAdminUid) cloudMasterAdminUid = data.masterAdminUid;
        if (data.ownerEmail) cloudOwnerEmail = data.ownerEmail;

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
            if (uData.assignedPropertyId && (isMasterTestUser || uData.assignedPropertyId !== "sunshine-pg")) {
              resolvedProp = uData.assignedPropertyId;
            }
            if (uData.plan) cloudPlan = uData.plan;
            if (uData.subscriptionPlan) cloudSubscriptionPlan = uData.subscriptionPlan;
            if (uData.subscriptionStatus) cloudSubscriptionStatus = uData.subscriptionStatus;
            if (uData.planExpiresAt !== undefined) cloudPlanExpiresAt = uData.planExpiresAt;
            if (uData.trialEndsAtMs !== undefined) cloudTrialEndsAtMs = uData.trialEndsAtMs;
            if (uData.masterAdminUid) cloudMasterAdminUid = uData.masterAdminUid;
            if (uData.ownerEmail) cloudOwnerEmail = uData.ownerEmail;

            if (uData.securityPin) {
              if (uData.securityPin === inputPin) {
                isValid = true;
              } else {
                // If direct PIN on this document doesn't match, check linked cluster documents before rejecting!
                isValid = false;
              }
            }
          }
        }
        if (!cloudFound) {
          try {
            const uQ = query(collection(db, "users"), where("email", "==", targetEmail));
            const uSnap = await getDocs(uQ);
            if (!uSnap.empty) {
              cloudFound = true;
              const uData = uSnap.docs[0].data();
              if (uData.sessionVersion) activeSessionVersion = uData.sessionVersion;
              if (uData.displayName) resolvedName = uData.displayName;
              if (uData.role) resolvedRole = uData.role;
              if (uData.assignedPropertyId && (isMasterTestUser || uData.assignedPropertyId !== "sunshine-pg")) {
                resolvedProp = uData.assignedPropertyId;
              }

              if (uData.securityPin) {
                if (uData.securityPin === inputPin) {
                  isValid = true;
                } else {
                  isValid = false;
                }
              }
            }
          } catch {}
        }
      }

      // Check local staff store fallback if any
      if (!cloudFound) {
        const staffMatch = staffStore.getAllGlobalStaff().find((s) => s.email.toLowerCase() === targetEmail);
        if (staffMatch) {
          cloudFound = true;
          const verification = staffStore.verifySecurityPin(targetEmail, inputPin);
          isValid = verification.valid;
          member = verification.member;
          if (member?.name) resolvedName = member.name;
          if (member?.role) resolvedRole = member.role;
          if (member?.assignedPropertyId && (isMasterTestUser || member.assignedPropertyId !== "sunshine-pg")) {
            resolvedProp = member.assignedPropertyId;
          }
        }
      }

      // Check owner portfolio fallback if resolvedProp is still unset
      if (!resolvedProp && !isMasterTestUser) {
        try {
          const sanitizedKey = targetEmail.replace(/[^a-z0-9]/g, "_");
          const portSnap = await getDoc(doc(db, "users", `portfolio_${sanitizedKey}`));
          if (portSnap.exists()) {
            const pList = portSnap.data()?.properties;
            if (Array.isArray(pList) && pList.length > 0 && pList[0]?.id && pList[0]?.id !== "sunshine-pg") {
              resolvedProp = pList[0].id;
            }
          }
        } catch {}
      }
    } catch (cloudErr) {
      console.warn("Cloud Firestore PIN verification network fallback:", cloudErr);
    }

    // 1C. CROSS-AUTH PIN RECONCILIATION & SELF-HEALING:
    // If inputPin didn't match the primary doc, check if ANY linked account (phone, email, or property owner) has inputPin!
    if (!isValid) {
      try {
        const cleanPhone = (savedSession?.phone || "").replace(/\D/g, "").slice(-10);
        let clusterPins: { pin: string; source: string; ref?: any }[] = [];

        // Check by linked phone
        if (cleanPhone) {
          const phSnap = await getDocs(query(collection(db, "users"), where("phone", "==", cleanPhone)));
          phSnap.docs.forEach((d) => {
            const data = d.data();
            if (data.securityPin) clusterPins.push({ pin: data.securityPin, source: `users_phone_${d.id}`, ref: d.ref });
          });
        }

        // Check by property owner record
        if (clusterPins.length === 0 || !clusterPins.some((c) => c.pin === inputPin)) {
          if (targetEmail && !targetEmail.endsWith(".auth")) {
            const pSnap = await getDocs(query(collection(db, "properties"), where("ownerEmail", "==", targetEmail)));
            for (const pd of pSnap.docs) {
              const pData = pd.data();
              const pOwnerPhone = (pData.ownerPhone || "").replace(/\D/g, "").slice(-10);
              if (pOwnerPhone) {
                const uSnap = await getDocs(query(collection(db, "users"), where("phone", "==", pOwnerPhone)));
                uSnap.docs.forEach((ud) => {
                  const data = ud.data();
                  if (data.securityPin) clusterPins.push({ pin: data.securityPin, source: `prop_linked_phone_${ud.id}`, ref: ud.ref });
                });
              }
            }
          }
        }

        const matchedCluster = clusterPins.find((c) => c.pin === inputPin);
        if (matchedCluster) {
          isValid = true;
          cloudFound = true;
          // 🌟 Auto-heal all linked documents with the verified PIN immediately!
          syncUserSecurityPinToCloud(targetEmail, inputPin, auth.currentUser?.uid, activeSessionVersion, cleanPhone).catch(() => {});
        }
      } catch (clusterErr) {
        console.warn("Cross-auth PIN cluster reconciliation notice:", clusterErr);
      }
    }

    // 2. STRICT CLOUD AUTHORITY with Local Trusted Device Fallback
    if (!cloudFound) {
      if (savedSession?.securityPin && savedSession.securityPin === inputPin) {
        isValid = true;
      } else {
        const isMasterTest = targetEmail === "isharapandey01@gmail.com";
        if (isMasterTest && inputPin === "1234") {
          isValid = true;
        } else {
          isValid = false;
        }
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
        plan: cloudPlan || savedSession?.plan,
        subscriptionPlan: cloudSubscriptionPlan || savedSession?.subscriptionPlan,
        subscriptionStatus: cloudSubscriptionStatus || savedSession?.subscriptionStatus,
        planExpiresAt: cloudPlanExpiresAt !== undefined ? cloudPlanExpiresAt : savedSession?.planExpiresAt,
        trialEndsAtMs: cloudTrialEndsAtMs !== undefined ? cloudTrialEndsAtMs : savedSession?.trialEndsAtMs,
        masterAdminUid: cloudMasterAdminUid || savedSession?.masterAdminUid,
        ownerEmail: cloudOwnerEmail || savedSession?.ownerEmail,
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

      let hasCompletedOnboarding = true;
      if (role === "master_admin") {
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

      // Self-heal: If property is assigned or user owns a property, onboarding IS completed!
      if (!hasCompletedOnboarding && (resolvedProp || updatedSession.assignedPropertyId || updatedSession.propertyName)) {
        hasCompletedOnboarding = true;
        if (auth.currentUser) {
          setDoc(doc(db, "users", auth.currentUser.uid), {
            onboardingCompleted: true,
            assignedPropertyId: resolvedProp || updatedSession.assignedPropertyId || "",
            propertyName: updatedSession.propertyName || "",
          }, { merge: true }).catch(() => {});
        }
      }

      const targetProperty = updatedSession.assignedPropertyId;
      const defaultPath = !hasCompletedOnboarding
        ? "/welcome"
        : (role === "master_admin" ? "/home" : (targetProperty ? `/p/${targetProperty}/overview` : "/home"));

      const isFounder = (targetEmail || "").toLowerCase() === "rameshdarisi03@gmail.com";
      const targetPath = hasCompletedOnboarding ? getCleanRedirectUrl(defaultPath, targetProperty, isFounder) : defaultPath;

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
        setError(`Incorrect 6-digit MPIN. (${5 - newAttempts} attempts remaining)`);
      }
    }
  };

  // Handle 1-Click Google Verification to Reset MPIN (For Google/Gmail Users)
  const handleVerifyWithGoogleForPinReset = async () => {
    setVerifyPasswordError(null);
    setIsVerifyingPassword(true);

    try {
      const result = await continueWithGoogle();
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

  // Masking helpers for security presentation
  const maskPhone = (num?: string) => {
    if (!num) return "";
    const clean = num.replace(/\D/g, "");
    if (clean.length < 10) return num;
    const last4 = clean.slice(-10).slice(-4);
    return `+91 ••••• ••${last4}`;
  };

  const maskEmail = (em?: string) => {
    if (!em || !em.includes("@")) return "";
    const [name, domain] = em.split("@");
    if (name.length <= 2) return `${name[0]}•••@${domain}`;
    return `${name.slice(0, 2)}••••••${name.slice(-1)}@${domain}`;
  };

  const isValidRealEmail = (em: string): boolean => {
    if (!em || typeof em !== "string") return false;
    const clean = em.trim().toLowerCase();
    if (!clean.includes("@") || !clean.includes(".")) return false;
    if (
      clean.startsWith("phone_") ||
      clean.endsWith(".auth") ||
      clean.includes("auth.tenopilot") ||
      clean.includes("phone.tenopilot.auth") ||
      clean === "admin@tenopilot.com"
    ) {
      return false;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  };

  // 🔍 STRICT CLOUD LOOKUP: Verify credentials directly against Firestore before offering or sending OTP
  const lookupVerifiedAccountInCloud = async (
    rawIdentifier?: string,
    optionalUid?: string
  ): Promise<VerifiedResetAccount | null> => {
    const clean = (rawIdentifier || "").trim();

    // 1. If an explicit identifier is provided (from the input form), verify THAT SPECIFIC IDENTIFIER ONLY!
    // Never fall back to ambient auth.currentUser or savedSession when the user typed an input!
    if (clean) {
      const digits = clean.replace(/\D/g, "");
      const pure10 = digits.length >= 10 ? digits.slice(-10) : "";
      const isPhoneCandidate = Boolean(pure10 && isGenuineIndianMobile(pure10));
      const isEmailCandidate = Boolean(clean.includes("@") && isValidRealEmail(clean));

      if (!isPhoneCandidate && !isEmailCandidate) {
        return null;
      }

      let matchedAccount: any = null;
      let matchedIsStaff = false;
      let matchedRole = "master_admin";
      let matchedDisplayName = "Property Owner";
      let matchedPropId = "";
      let matchedStaffId = "";
      let foundPhone = isPhoneCandidate ? pure10 : "";
      let foundEmail = isEmailCandidate ? clean.toLowerCase() : "";

      // A. If Phone: Check staff_accounts, users, and properties
      if (isPhoneCandidate) {
        // Staff check
        try {
          const sSnap = await getDoc(doc(db, "staff_accounts", `phone_${pure10}`));
          if (sSnap.exists() && (sSnap.data().role === "admin" || sSnap.data().role === "receptionist")) {
            matchedAccount = sSnap.data();
            matchedIsStaff = true;
          } else {
            const sQ = query(collection(db, "staff_accounts"), where("purePhone", "==", pure10));
            const sSnap2 = await getDocs(sQ);
            if (!sSnap2.empty && (sSnap2.docs[0].data().role === "admin" || sSnap2.docs[0].data().role === "receptionist")) {
              matchedAccount = sSnap2.docs[0].data();
              matchedIsStaff = true;
            }
          }
        } catch {}

        // Users check
        if (!matchedAccount) {
          try {
            const uQ = query(collection(db, "users"), where("phone", "==", pure10));
            const uSnap = await getDocs(uQ);
            if (!uSnap.empty) {
              matchedAccount = uSnap.docs[0].data();
              matchedAccount.id = uSnap.docs[0].id;
              matchedIsStaff = false;
            }
          } catch {}
        }

        // Properties check (find owner)
        if (!matchedAccount) {
          try {
            const pQ = query(collection(db, "properties"), where("ownerPhone", "==", pure10));
            const pSnap = await getDocs(pQ);
            if (!pSnap.empty) {
              const pData = pSnap.docs[0].data();
              matchedAccount = {
                id: pData.ownerUid || `prop_owner_${pure10}`,
                displayName: pData.ownerName || "Property Owner",
                role: "master_admin",
                assignedPropertyId: pSnap.docs[0].id,
                email: pData.ownerEmail,
                phone: pure10,
              };
            }
          } catch {}
        }
      }

      // B. If Email: Check staff_accounts, users, and properties
      if (isEmailCandidate && !matchedAccount) {
        const cleanEmail = clean.toLowerCase();
        // Staff check
        try {
          const sSnap = await getDoc(doc(db, "staff_accounts", cleanEmail));
          if (sSnap.exists() && (sSnap.data().role === "admin" || sSnap.data().role === "receptionist")) {
            matchedAccount = sSnap.data();
            matchedIsStaff = true;
          }
        } catch {}

        // Users check
        if (!matchedAccount) {
          try {
            const uQ = query(collection(db, "users"), where("email", "==", cleanEmail));
            const uSnap = await getDocs(uQ);
            if (!uSnap.empty) {
              matchedAccount = uSnap.docs[0].data();
              matchedAccount.id = uSnap.docs[0].id;
              matchedIsStaff = false;
            }
          } catch {}
        }

        // Properties check (find owner)
        if (!matchedAccount) {
          try {
            const pQ = query(collection(db, "properties"), where("ownerEmail", "==", cleanEmail));
            const pSnap = await getDocs(pQ);
            if (!pSnap.empty) {
              const pData = pSnap.docs[0].data();
              matchedAccount = {
                id: pData.ownerUid || `prop_owner_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
                displayName: pData.ownerName || "Property Owner",
                role: "master_admin",
                assignedPropertyId: pSnap.docs[0].id,
                email: cleanEmail,
                phone: pData.ownerPhone,
              };
            }
          } catch {}
        }
      }

      // If no account exists matching this identifier, return null! (Strict blocking against typos & random numbers)
      if (!matchedAccount) {
        return null;
      }

      // Account matched! Now discover linked phone and email across the cluster
      matchedRole = matchedAccount.role || (matchedIsStaff ? "admin" : "master_admin");
      matchedDisplayName = matchedAccount.displayName || matchedAccount.name || (matchedIsStaff ? "Staff Member" : "Property Owner");
      matchedPropId = matchedAccount.assignedPropertyId || "";
      matchedStaffId = matchedAccount.staffId || matchedAccount.id || "";

      let finalPhone = (matchedAccount.phone || matchedAccount.purePhone || foundPhone || "").replace(/\D/g, "").slice(-10);
      let finalEmail = (matchedAccount.email || foundEmail || "").toLowerCase().trim();
      if (!isValidRealEmail(finalEmail)) finalEmail = "";

      // Cluster Probe: Check properties collection to bridge phone <-> email
      if (!finalPhone && finalEmail) {
        try {
          const pSnap = await getDocs(query(collection(db, "properties"), where("ownerEmail", "==", finalEmail)));
          if (!pSnap.empty) {
            const pOwnerPhone = (pSnap.docs[0].data().ownerPhone || "").replace(/\D/g, "").slice(-10);
            if (pOwnerPhone && isGenuineIndianMobile(pOwnerPhone)) finalPhone = pOwnerPhone;
          }
        } catch {}
      }
      if (!finalEmail && finalPhone) {
        try {
          const pSnap = await getDocs(query(collection(db, "properties"), where("ownerPhone", "==", finalPhone)));
          if (!pSnap.empty) {
            const pOwnerEmail = (pSnap.docs[0].data().ownerEmail || "").toLowerCase().trim();
            if (pOwnerEmail && isValidRealEmail(pOwnerEmail)) finalEmail = pOwnerEmail;
          }
        } catch {}
      }
      if (!finalPhone && matchedAccount.id) {
        try {
          const uSnap = await getDoc(doc(db, "users", matchedAccount.id));
          if (uSnap.exists()) {
            const uP = (uSnap.data().phone || "").replace(/\D/g, "").slice(-10);
            if (uP && isGenuineIndianMobile(uP)) finalPhone = uP;
          }
        } catch {}
      }

      return {
        exists: true,
        uid: matchedAccount.id || matchedAccount.uid || `user_${Date.now()}`,
        role: matchedRole,
        displayName: matchedDisplayName,
        phone: finalPhone || undefined,
        email: finalEmail || undefined,
        hasPhone: Boolean(finalPhone && isGenuineIndianMobile(finalPhone)),
        hasEmail: Boolean(finalEmail && isValidRealEmail(finalEmail)),
        isStaff: matchedIsStaff,
        assignedPropertyId: matchedPropId,
        staffId: matchedStaffId || undefined,
      };
    }

    // 2. Only if NO rawIdentifier was provided (initial auto-open modal), check optionalUid
    if (optionalUid) {
      try {
        const uDoc = await getDoc(doc(db, "users", optionalUid));
        if (uDoc.exists()) {
          const uData = uDoc.data();
          let finalPhone = (uData.phone || "").replace(/\D/g, "").slice(-10);
          let finalEmail = (uData.email || "").toLowerCase().trim();
          if (!isValidRealEmail(finalEmail)) finalEmail = "";

          // Cluster probe if phone or email is missing
          if (!finalPhone && finalEmail) {
            try {
              const pSnap = await getDocs(query(collection(db, "properties"), where("ownerEmail", "==", finalEmail)));
              if (!pSnap.empty) {
                const pOwnerPhone = (pSnap.docs[0].data().ownerPhone || "").replace(/\D/g, "").slice(-10);
                if (pOwnerPhone && isGenuineIndianMobile(pOwnerPhone)) finalPhone = pOwnerPhone;
              }
            } catch {}
          }
          if (!finalEmail && finalPhone) {
            try {
              const pSnap = await getDocs(query(collection(db, "properties"), where("ownerPhone", "==", finalPhone)));
              if (!pSnap.empty) {
                const pOwnerEmail = (pSnap.docs[0].data().ownerEmail || "").toLowerCase().trim();
                if (pOwnerEmail && isValidRealEmail(pOwnerEmail)) finalEmail = pOwnerEmail;
              }
            } catch {}
          }

          if (finalPhone || finalEmail) {
            return {
              exists: true,
              uid: uDoc.id,
              role: uData.role || "master_admin",
              displayName: uData.displayName || uData.name || "Property Owner",
              phone: finalPhone || undefined,
              email: finalEmail || undefined,
              hasPhone: Boolean(finalPhone && isGenuineIndianMobile(finalPhone)),
              hasEmail: Boolean(finalEmail && isValidRealEmail(finalEmail)),
              isStaff: false,
              assignedPropertyId: uData.assignedPropertyId,
            };
          }
        }
      } catch (e) {
        console.warn("Direct uid user lookup notice:", e);
      }
    }

    return null;
  };

  // Open Multi-Channel Reset PIN Modal & Trigger Credential Verification
  const handleOpenPinResetModal = async () => {
    setVerifyPasswordError(null);
    setVerifyPasswordForPin("");
    setResetOtpError(null);
    setResetOtpSuccess(null);
    setResetOtpToken("");
    setResetOtpDigits(["", "", "", "", "", ""]);
    setAccountVerificationError(null);
    setShowLegacyPasswordFallback(false);

    // Resolve candidate identifier from all active session sources
    let candidateId = "";

    // 1. Saved session phone
    if (savedSession?.phone) {
      const rawP = savedSession.phone.replace(/\D/g, "");
      if (rawP.length >= 10 && isGenuineIndianMobile(rawP.slice(-10))) {
        candidateId = rawP.slice(-10);
      }
    }

    // 2. Saved session email (phone_... encoding)
    if (!candidateId && savedSession?.email && savedSession.email.includes("phone_")) {
      const rawE = savedSession.email.replace(/\D/g, "");
      if (rawE.length >= 10 && isGenuineIndianMobile(rawE.slice(-10))) {
        candidateId = rawE.slice(-10);
      }
    }

    // 3. Saved session email (real email)
    if (!candidateId && savedSession?.email && isValidRealEmail(savedSession.email)) {
      candidateId = savedSession.email.trim().toLowerCase();
    }

    // 4. Form email state
    if (!candidateId && email) {
      const rawFormDigits = email.replace(/\D/g, "");
      if (rawFormDigits.length >= 10 && isGenuineIndianMobile(rawFormDigits.slice(-10))) {
        candidateId = rawFormDigits.slice(-10);
      } else if (isValidRealEmail(email)) {
        candidateId = email.trim().toLowerCase();
      }
    }

    // 5. Firebase current user
    if (!candidateId && auth.currentUser) {
      if (auth.currentUser.phoneNumber) {
        candidateId = auth.currentUser.phoneNumber.replace(/\D/g, "").slice(-10);
      } else if (auth.currentUser.email && isValidRealEmail(auth.currentUser.email)) {
        candidateId = auth.currentUser.email.trim().toLowerCase();
      }
    }

    const candidateUid = savedSession?.primaryUid || (savedSession as any)?.uid || auth.currentUser?.uid;

    setResetIdentifierInput(candidateId);
    setResetOtpStep("VERIFY_ACCOUNT");
    setShowPasswordResetPinModal(true);

    if (candidateId || candidateUid) {
      setIsVerifyingAccount(true);
      try {
        const verified = await lookupVerifiedAccountInCloud(candidateId, candidateUid);
        if (verified && verified.exists) {
          setVerifiedResetAccount(verified);
          if (verified.hasPhone && !verified.hasEmail) {
            setResetOtpChannel("whatsapp");
          } else if (verified.hasEmail && !verified.hasPhone) {
            setResetOtpChannel("email");
          } else {
            setResetOtpChannel("whatsapp");
          }
          setResetOtpStep("SELECT_CHANNEL");
        } else {
          setVerifiedResetAccount(null);
          setResetOtpStep("VERIFY_ACCOUNT");
        }
      } catch {
        setVerifiedResetAccount(null);
        setResetOtpStep("VERIFY_ACCOUNT");
      } finally {
        setIsVerifyingAccount(false);
      }
    } else {
      setVerifiedResetAccount(null);
      setResetOtpStep("VERIFY_ACCOUNT");
    }
  };

  const handleVerifyAccountInput = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = resetIdentifierInput.trim();
    if (!clean) {
      setAccountVerificationError("Please enter your registered 10-digit mobile number or work email.");
      return;
    }

    setIsVerifyingAccount(true);
    setAccountVerificationError(null);
    setResetOtpError(null);

    try {
      const verified = await lookupVerifiedAccountInCloud(clean);
      if (verified && verified.exists) {
        setVerifiedResetAccount(verified);
        if (verified.hasPhone && !verified.hasEmail) {
          setResetOtpChannel("whatsapp");
        } else if (verified.hasEmail && !verified.hasPhone) {
          setResetOtpChannel("email");
        } else {
          setResetOtpChannel("whatsapp");
        }
        setResetOtpStep("SELECT_CHANNEL");
      } else {
        setVerifiedResetAccount(null);
        setAccountVerificationError(
          `No registered TenoPilot account found for "${clean}". Please check your details and try again.`
        );
      }
    } catch {
      setAccountVerificationError("Error checking account in cloud database. Please try again.");
    } finally {
      setIsVerifyingAccount(false);
    }
  };

  // Dispatch OTP strictly to verified credentials from Firestore
  const handleSendResetOtp = async (channelOverride?: "whatsapp" | "email") => {
    if (!verifiedResetAccount || !verifiedResetAccount.exists) {
      setResetOtpError("Please verify your account before requesting an OTP code.");
      return;
    }

    const channel = channelOverride || resetOtpChannel;
    setResetOtpChannel(channel);
    setResetOtpError(null);
    setResetOtpSuccess(null);
    setIsSendingResetOtp(true);

    try {
      if (channel === "whatsapp") {
        const destPhone = verifiedResetAccount.phone;
        if (!destPhone || !isGenuineIndianMobile(destPhone)) {
          throw new Error("No verified mobile phone number is linked to this account in the database.");
        }
        const res = await fetch("/api/auth/phone/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: destPhone }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to dispatch WhatsApp OTP.");
        }
        setResetOtpToken(data.verificationToken || "");
        setResetOtpStep("ENTER_OTP");
        setResetOtpCooldown(30);
        setResetOtpSuccess(`WhatsApp verification code sent to ${maskPhone(destPhone)}`);
        setTimeout(() => resetOtpInputRefs.current[0]?.focus(), 150);
      } else {
        const destEmail = verifiedResetAccount.email;
        if (!destEmail || !isValidRealEmail(destEmail)) {
          throw new Error("No verified email address is linked to this account in the database.");
        }
        const res = await fetch("/api/auth/email/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: destEmail }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to dispatch Email OTP.");
        }
        setResetOtpToken(data.verificationToken || "");
        setResetOtpStep("ENTER_OTP");
        setResetOtpCooldown(30);
        setResetOtpSuccess(`Email verification code sent to ${maskEmail(destEmail)}`);
        setTimeout(() => resetOtpInputRefs.current[0]?.focus(), 150);
      }
    } catch (err: any) {
      setResetOtpError(err.message || "Failed to dispatch OTP verification code.");
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  // Verify OTP Code
  const handleVerifyResetOtp = async (codeOverride?: string) => {
    if (!verifiedResetAccount) return;
    const code = (codeOverride || resetOtpDigits.join("")).trim();
    if (code.length !== 6) {
      setResetOtpError("Please enter all 6 digits of your OTP code.");
      return;
    }

    setResetOtpError(null);
    setIsVerifyingResetOtp(true);

    try {
      if (resetOtpChannel === "whatsapp") {
        const destPhone = verifiedResetAccount.phone!;
        const res = await fetch("/api/auth/phone/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: destPhone,
            otp: code,
            verificationToken: resetOtpToken,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Invalid or expired WhatsApp OTP code.");
        }
      } else {
        const destEmail = verifiedResetAccount.email!;
        const res = await fetch("/api/auth/email/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: destEmail,
            otp: code,
            verificationToken: resetOtpToken,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Invalid or expired Email OTP code.");
        }
      }

      // 🌟 Verification Succeeded!
      clearLockout();
      setShowPasswordResetPinModal(false);
      setResetOtpDigits(["", "", "", "", "", ""]);
      setResetOtpToken("");
      setVerifyPasswordForPin("");

      // Bind verified account to active session state
      if (verifiedResetAccount) {
        const updatedSession: SavedSession = {
          email: verifiedResetAccount.email || (verifiedResetAccount.phone ? `phone_${verifiedResetAccount.phone}@auth.tenopilot.com` : "user@tenopilot.com"),
          name: verifiedResetAccount.displayName || "User",
          role: (verifiedResetAccount.role as any) || "master_admin",
          phone: verifiedResetAccount.phone,
          assignedPropertyId: verifiedResetAccount.assignedPropertyId,
        };
        setSavedSession(updatedSession);
        try {
          localStorage.setItem("tenopilot_saved_session", JSON.stringify(updatedSession));
        } catch {}
      }

      setIsResetMode(true);
      setPinCreationStep("ENTER");
      setFirstTimePin("");
      setConfirmPinValue("");
      setPinMismatchError(null);
      setAuthStep("SET_OR_RESET_PIN");
    } catch (err: any) {
      setResetOtpError(err.message || "Verification failed. Please check the code and try again.");
    } finally {
      setIsVerifyingResetOtp(false);
    }
  };

  // Handle OTP digit changes
  const handleResetOtpDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...resetOtpDigits];
    newDigits[index] = clean;
    setResetOtpDigits(newDigits);
    setResetOtpError(null);

    if (clean && index < 5) {
      resetOtpInputRefs.current[index + 1]?.focus();
    }

    if (clean && index === 5 && newDigits.every((d) => d.length === 1)) {
      setTimeout(() => {
        handleVerifyResetOtp(newDigits.join(""));
      }, 150);
    }
  };

  const handleResetOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !resetOtpDigits[index] && index > 0) {
      resetOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResetOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setResetOtpDigits(newDigits);
    if (pasted.length === 6) {
      setTimeout(() => {
        handleVerifyResetOtp(pasted);
      }, 150);
    } else {
      const nextIdx = Math.min(pasted.length, 5);
      resetOtpInputRefs.current[nextIdx]?.focus();
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
                    ? "Reset 6-Digit MPIN"
                    : "Set Your 6-Digit MPIN"
                  : authStep === "PIN_PROMPT"
                  ? "Enter 6-Digit MPIN"
                  : authStep === "PHONE"
                  ? "Continue with Phone"
                  : authStep === "EMAIL"
                  ? "Continue with Email"
                  : "Welcome to TenoPilot.com"}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {authStep === "SET_OR_RESET_PIN"
                  ? isResetMode
                    ? "Create and confirm your new 6-digit MPIN for rapid device unlock"
                    : "Create and confirm your personal 6-digit MPIN for rapid device unlock"
                  : authStep === "PIN_PROMPT"
                  ? "Enter your 6-digit MPIN to unlock workspace"
                  : authStep === "PHONE"
                  ? "Verify your mobile number via WhatsApp OTP to sign in"
                  : authStep === "EMAIL"
                  ? "Sign in or create account with your work/personal email"
                  : "Select your preferred sign-in method to continue"}
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
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-900 font-semibold animate-in fade-in shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="leading-snug">{error}</span>
                </div>
                {(error.includes("Sign Up") || error.includes("purged") || error.includes("removed")) && (
                  <Link
                    href="/signup"
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-[#c2652a] hover:bg-[#964407] text-white font-black text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Sign Up Free</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {error.includes("/activate") && (
                  <Link
                    href="/activate"
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Activate VIP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}

            {/* STEP 1: INITIAL CREDENTIALS (Google, Phone Number, or Email ID) */}
            {authStep === "CREDENTIALS" && (
              <div className="space-y-3.5">
                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 font-bold text-xs text-gray-700 flex items-center justify-center gap-2.5 transition-all shadow-2xs active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>{isLoading ? "Continuing with Google..." : "Continue with Google"}</span>
                </button>

                {/* Continue with Phone Number */}
                <button
                  type="button"
                  onClick={() => setAuthStep("PHONE")}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-bold text-xs text-gray-700 flex items-center justify-center gap-2.5 transition-all shadow-2xs active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-[#25D366] shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>Continue with Phone Number</span>
                </button>

                {/* Continue with Email ID (Right underneath Continue with Phone Number) */}
                <button
                  type="button"
                  onClick={() => setAuthStep("EMAIL")}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-bold text-xs text-gray-700 flex items-center justify-center gap-2.5 transition-all shadow-2xs active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-4 h-4 text-[#c2652a] shrink-0" />
                  <span>Continue with Email ID</span>
                </button>

                {/* Bank-Grade Security Assurance Badge */}
                <div className="pt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-Bit Encrypted Multi-Tenant Cloud Operating System</span>
                </div>
              </div>
            )}

            {/* STEP: EMAIL PROGRESSIVE AUTHENTICATION */}
            {authStep === "EMAIL" && (
              <EmailAuthCard
                onBackToOptions={() => setAuthStep("CREDENTIALS")}
                onSuccess={(authResult) => {
                  const cleanEmail = authResult.email;
                  const role = (authResult.role as any) || "master_admin";
                  const session: SavedSession = {
                    email: cleanEmail,
                    name: authResult.displayName || "Property Owner",
                    role: role,
                    assignedPropertyId: authResult.assignedPropertyId || "",
                    securityPin: authResult.hasSetPin ? authResult.securityPin : undefined,
                    hasSetPin: authResult.hasSetPin && Boolean(authResult.securityPin),
                  };

                  setSavedSession(session);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("tenopilot_saved_session", JSON.stringify(session));
                    localStorage.removeItem("tenopilot_portfolio_properties");
                    sessionStorage.setItem("tenopilot_session_unlocked", "true");
                  }
                  portfolioStore.clear();
                  staffStore.setActiveRole(session.role);

                  if (authResult.destination === "PIN_PROMPT") {
                    setAuthStep("PIN_PROMPT");
                    setPinValue("");
                  } else {
                    const isFounder = (cleanEmail || "").toLowerCase() === "rameshdarisi03@gmail.com";
                    const isCompleted = !authResult.isNewUser && Boolean(authResult.assignedPropertyId);
                    const dest = isCompleted
                      ? getCleanRedirectUrl(authResult.destination, authResult.assignedPropertyId, isFounder)
                      : "/welcome";
                    router.push(dest);
                  }
                }}
              />
            )}

            {/* STEP: PHONE AUTHENTICATION VIA WHATSAPP OTP (INLINE PAGE VIEW) */}
            {authStep === "PHONE" && (
              <PhoneAuthCard
                onBackToOptions={() => setAuthStep("CREDENTIALS")}
                onSuccess={(authResult) => {
                  if (authResult.destination === "PIN_PROMPT") {
                    setSavedSession({
                      email: authResult.profile.email,
                      name: authResult.profile.displayName,
                      role: authResult.profile.role,
                      assignedPropertyId: authResult.profile.assignedPropertyId,
                      securityPin: authResult.profile.securityPin,
                    });
                    setAuthStep("PIN_PROMPT");
                    setPinValue("");
                  } else {
                    const isFounder = (authResult.profile?.email || "").toLowerCase() === "rameshdarisi03@gmail.com";
                    const dest = authResult.profile?.onboardingCompleted
                      ? getCleanRedirectUrl(authResult.destination, authResult.profile?.assignedPropertyId, isFounder)
                      : "/welcome";
                    router.push(dest);
                  }
                }}
              />
            )}

            {/* STEP 2A: SET OR RESET PERSONAL 6-DIGIT MPIN (BANKING 2-STEP DOUBLE-ENTRY) */}
            {authStep === "SET_OR_RESET_PIN" && (
              <div className="space-y-5 bg-orange-50/50 p-6 rounded-3xl border border-orange-200 text-center animate-in fade-in shadow-xs">
                {/* Mode & Step Badges */}
                <div className="flex flex-col items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isResetMode ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-orange-100 text-[#c2652a] border border-orange-200"
                  }`}>
                    {isResetMode ? <RotateCcw className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                    <span>{isResetMode ? "🔄 Reset MPIN" : "🔑 Set New MPIN"}</span>
                  </span>

                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <span className={`px-2.5 py-0.5 rounded-full transition-colors ${pinCreationStep === "ENTER" ? "bg-[#c2652a] text-white font-bold shadow-2xs" : "bg-gray-200 text-gray-700"}`}>
                      1. Enter MPIN
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className={`px-2.5 py-0.5 rounded-full transition-colors ${pinCreationStep === "CONFIRM" ? "bg-[#c2652a] text-white font-bold shadow-2xs" : "bg-gray-200 text-gray-700"}`}>
                      2. Confirm MPIN
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="font-serif font-bold text-xl text-gray-900">
                    {pinCreationStep === "ENTER"
                      ? isResetMode
                        ? "Enter New 6-Digit MPIN"
                        : `Welcome, ${savedSession?.name || "Team Member"}! 🎉`
                      : "Confirm New 6-Digit MPIN"}
                  </h2>
                  <p className="text-xs text-gray-600">
                    {pinCreationStep === "ENTER"
                      ? "Choose a memorable 6-digit MPIN for rapid device unlock."
                      : "Re-enter the exact same 6-digit MPIN to confirm and activate."}
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
                    <span>MPINs match! Saving securely to cloud...</span>
                  </div>
                )}

                {/* STEP 1: ENTER MPIN */}
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
                      <span>Next: Confirm MPIN</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* STEP 2: CONFIRM MPIN */}
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
                              setPinMismatchError("MPINs do not match. Please re-enter.");
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
                        ← Change MPIN
                      </button>

                      <button
                        type="button"
                        disabled={confirmPinValue.length !== 6 || isLoading}
                        onClick={() => {
                          if (confirmPinValue === firstTimePin) {
                            setIsPinMatching(true);
                            handleSavePersonalPin(confirmPinValue);
                          } else {
                            setIsPinMatching(false);
                            setPinMismatchError("MPINs do not match. Please re-enter.");
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                      >
                        <span>{isLoading ? "Saving MPIN..." : "Confirm & Save"}</span>
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
                {/* Account & Property Profile Pill */}
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-orange-50/60 border border-orange-200/80 text-xs text-gray-700 shadow-xs max-w-xs mx-auto">
                  <div className="w-10 h-10 rounded-2xl bg-[#c2652a] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {(savedSession?.propertyName || savedSession?.name || "T")?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-bold text-gray-900 leading-tight truncate">
                      {savedSession?.propertyName || savedSession?.name || "Friendly Space"}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {savedSession?.name ? `${savedSession.name} • ` : ""}
                      {savedSession?.role === "admin"
                        ? "🏢 Property Admin"
                        : savedSession?.role === "receptionist"
                        ? "🔑 Staff Desk"
                        : "👑 Master Admin"}
                    </p>
                  </div>
                </div>

                {/* Direct 6-Digit Keyboard Input with Native Smartphone Number Pad */}
                <div className="space-y-3 max-w-xs mx-auto">
                  <label className="block text-xs font-bold text-gray-600">
                    Enter 6-Digit Security MPIN
                  </label>
                  <input
                    ref={pinInputRef}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    autoFocus
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
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-300 focus:border-[#c2652a] font-mono text-center font-bold tracking-[0.5em] text-3xl bg-white shadow-sm focus:ring-4 focus:ring-orange-100 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-gray-500 font-medium">
                    {lockoutExpiry ? `Locked: ${lockoutCountdown}s remaining` : "Fast 1.5s unlock • Auto-submits on 6th digit"}
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
                    <span>Forgot MPIN? Reset 6-Digit MPIN</span>
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

      {/* 🔐 Multi-Channel Identity Verification Modal to Reset PIN */}
      {showPasswordResetPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-900">
                <ShieldCheck className="w-5 h-5 text-[#c2652a]" />
                <h3 className="font-serif font-bold text-base">Reset 6-Digit MPIN</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordResetPinModal(false);
                  setResetOtpStep("SELECT_CHANNEL");
                  setResetOtpError(null);
                  setResetOtpSuccess(null);
                  setAccountVerificationError(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error or Success Alerts */}
            {accountVerificationError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl font-semibold flex items-center gap-2 text-[11px] animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{accountVerificationError}</span>
              </div>
            )}
            {resetOtpError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl font-semibold flex items-center gap-2 text-[11px] animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{resetOtpError}</span>
              </div>
            )}
            {resetOtpSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-semibold flex items-center gap-2 text-[11px] animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{resetOtpSuccess}</span>
              </div>
            )}
            {verifyPasswordError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl font-semibold flex items-center gap-2 text-[11px] animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{verifyPasswordError}</span>
              </div>
            )}

            {/* 1. LOADING STATE */}
            {isVerifyingAccount ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#c2652a] animate-spin mx-auto" />
                <p className="text-gray-600 text-xs font-semibold">Verifying registered account in cloud database...</p>
              </div>
            ) : resetOtpStep === "ENTER_OTP" && verifiedResetAccount ? (
              /* 2. STEP 2: ENTER OTP CODE */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-xs">Enter 6-Digit Verification Code</p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      {resetOtpChannel === "whatsapp"
                        ? `Sent to WhatsApp: ${maskPhone(verifiedResetAccount.phone)}`
                        : `Sent to Email: ${maskEmail(verifiedResetAccount.email)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResetOtpStep("SELECT_CHANNEL");
                      setResetOtpDigits(["", "", "", "", "", ""]);
                      setResetOtpError(null);
                    }}
                    className="text-[10px] text-gray-500 hover:text-gray-900 font-bold underline cursor-pointer"
                  >
                    Change Method
                  </button>
                </div>

                {/* 6 Digit Individual Cells */}
                <div className="flex items-center justify-center gap-2 py-2" onPaste={handleResetOtpPaste}>
                  {resetOtpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        resetOtpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleResetOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleResetOtpKeyDown(index, e)}
                      className="w-10 h-12 text-center text-lg font-mono font-bold rounded-xl border-2 border-gray-200 focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20 bg-gray-50/50 text-gray-900 outline-none transition-all"
                    />
                  ))}
                </div>

                {/* Resend OTP Timer & Actions */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  {resetOtpCooldown > 0 ? (
                    <span className="text-gray-400 font-medium">Resend code in {resetOtpCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendResetOtp(resetOtpChannel)}
                      disabled={isSendingResetOtp}
                      className="text-[#c2652a] font-bold hover:underline cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend OTP Code</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleVerifyResetOtp()}
                    disabled={isVerifyingResetOtp || resetOtpDigits.some((d) => !d)}
                    className="px-4 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isVerifyingResetOtp ? "Verifying..." : "Verify & Reset"}
                  </button>
                </div>
              </div>
            ) : resetOtpStep === "SELECT_CHANNEL" && verifiedResetAccount ? (
              /* 3. STEP 1: SELECT VERIFIED CHANNEL */
              <div className="space-y-4 animate-in fade-in">
                {/* Verified Account Badge */}
                <div className="p-2.5 rounded-2xl bg-orange-50/80 border border-orange-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#c2652a]" />
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{verifiedResetAccount.displayName}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{verifiedResetAccount.role === "master_admin" ? "Property Owner" : verifiedResetAccount.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifiedResetAccount(null);
                      setResetOtpStep("VERIFY_ACCOUNT");
                      setAccountVerificationError(null);
                    }}
                    className="text-[10px] text-[#c2652a] hover:underline font-bold cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Choose how you want to receive your 1-time verification code:
                </p>

                {/* Primary OTP Channels from Verified Account Record ONLY */}
                <div className="space-y-2.5">
                  {/* WhatsApp Channel */}
                  {verifiedResetAccount.hasPhone && verifiedResetAccount.phone && (
                    <button
                      type="button"
                      onClick={() => handleSendResetOtp("whatsapp")}
                      disabled={isSendingResetOtp}
                      className="w-full p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>WhatsApp OTP</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-900 font-bold">Fast</span>
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">{maskPhone(verifiedResetAccount.phone)}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Email Channel */}
                  {verifiedResetAccount.hasEmail && verifiedResetAccount.email && (
                    <button
                      type="button"
                      onClick={() => handleSendResetOtp("email")}
                      disabled={isSendingResetOtp}
                      className="w-full p-3 rounded-2xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-left transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>Email OTP</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200/80 text-blue-900 font-bold">Instant</span>
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">{maskEmail(verifiedResetAccount.email)}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-blue-700 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {!verifiedResetAccount.hasPhone && !verifiedResetAccount.hasEmail && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      No verified phone or email found on this account document. Please use your password below.
                    </div>
                  )}
                </div>

                {/* Secondary Option: Password & Google Accordion */}
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowLegacyPasswordFallback(!showLegacyPasswordFallback)}
                    className="w-full text-center text-[11px] font-bold text-gray-500 hover:text-gray-900 cursor-pointer py-1"
                  >
                    {showLegacyPasswordFallback ? "▲ Hide Other Methods" : "▼ Or Verify with Password / Google"}
                  </button>

                  {showLegacyPasswordFallback && (
                    <div className="space-y-3 pt-3 animate-in fade-in">
                      <button
                        type="button"
                        onClick={handleVerifyWithGoogleForPinReset}
                        disabled={isVerifyingPassword}
                        className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-xs flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{isVerifyingPassword ? "Verifying..." : "Verify with Google Account"}</span>
                      </button>

                      <form onSubmit={handleVerifyPasswordForPinReset} className="space-y-2.5">
                        <input
                          type="password"
                          value={verifyPasswordForPin}
                          onChange={(e) => setVerifyPasswordForPin(e.target.value)}
                          placeholder="Enter account password"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#c2652a] text-xs bg-white text-gray-900"
                        />
                        <button
                          type="submit"
                          disabled={isVerifyingPassword || !verifyPasswordForPin}
                          className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer disabled:opacity-50 text-xs"
                        >
                          {isVerifyingPassword ? "Verifying..." : "Verify Password & Reset MPIN"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* 4. STEP 0: VERIFY REGISTERED CREDENTIALS (DEFAULT GUARANTEED FALLBACK) */
              <div className="space-y-4 animate-in fade-in">
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Enter your registered mobile phone number or work email address. We will verify your account before dispatching a secure 1-time verification code.
                </p>

                <form onSubmit={handleVerifyAccountInput} className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Registered Phone or Email</label>
                    <input
                      type="text"
                      value={resetIdentifierInput}
                      onChange={(e) => setResetIdentifierInput(e.target.value)}
                      placeholder="e.g. 9876543210 or name@property.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#c2652a] text-xs bg-white text-gray-900 font-mono"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingAccount || !resetIdentifierInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold cursor-pointer disabled:opacity-50 text-xs shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Verify Account & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Secondary Option: Password & Google Accordion */}
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowLegacyPasswordFallback(!showLegacyPasswordFallback)}
                    className="w-full text-center text-[11px] font-bold text-gray-500 hover:text-gray-900 cursor-pointer py-1"
                  >
                    {showLegacyPasswordFallback ? "▲ Hide Other Methods" : "▼ Or Verify with Password / Google"}
                  </button>

                  {showLegacyPasswordFallback && (
                    <div className="space-y-3 pt-3 animate-in fade-in">
                      <button
                        type="button"
                        onClick={handleVerifyWithGoogleForPinReset}
                        disabled={isVerifyingPassword}
                        className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-xs flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{isVerifyingPassword ? "Verifying..." : "Verify with Google Account"}</span>
                      </button>

                      <form onSubmit={handleVerifyPasswordForPinReset} className="space-y-2.5">
                        <input
                          type="password"
                          value={verifyPasswordForPin}
                          onChange={(e) => setVerifyPasswordForPin(e.target.value)}
                          placeholder="Enter account password"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#c2652a] text-xs bg-white text-gray-900"
                        />
                        <button
                          type="submit"
                          disabled={isVerifyingPassword || !verifyPasswordForPin}
                          className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer disabled:opacity-50 text-xs"
                        >
                          {isVerifyingPassword ? "Verifying..." : "Verify Password & Reset MPIN"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
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
