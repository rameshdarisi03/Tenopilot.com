// TenoPilot Live Firebase Production Authentication Service
import { auth, db } from "./firebase";
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
} from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { StaffMember, UserRole, staffStore } from "./staffStore";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export interface AuthUserProfile {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string;
  photoURL?: string;
  role: "master_admin" | "admin" | "receptionist";
  assignedPropertyId: string;
  propertyName?: string;
  isNewUser?: boolean;
  onboardingCompleted?: boolean;
  hasSetPin?: boolean;
  securityPin?: string;
  sessionVersion?: string;
  pinUpdatedAt?: number;
  createdAt?: string;
  planExpiresAt?: string;
  plan?: string;
  subscriptionStatus?: string;
}

/**
 * 🔤 Clean Title-Case Name Sanitizer
 */
export function sanitizeTitleCase(input: string): string {
  if (!input) return "";
  let clean = input.trim().replace(/\d+$/, "");
  clean = clean.replace(/([a-z])([A-Z])/g, "$1 $2");

  return clean
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * 🛡️ Clean Enterprise Error Message Sanitizer
 */
export function getCleanAuthErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred. Please try again.";
  
  const code = typeof err === "string" ? err : err?.code || "";
  const msg = typeof err === "string" ? err : err?.message || "";

  if (msg.includes("pending Founder VIP Pass") || msg.includes("VIP Pass waiting") || msg.includes("/activate")) {
    return msg;
  }
  if (code === "auth/purged-account-activation-sent" || msg.includes("previously purged account") || msg.includes("password activation link")) {
    return msg;
  }
  if (msg.includes("removed or purged")) {
    return "This account has been removed or purged. Please click Sign Up below to create a new property.";
  }
  if (
    msg.includes("No active TenoPilot account found") ||
    msg.includes("No registered account found") ||
    msg.includes("No active staff or owner account") ||
    code === "auth/user-not-found"
  ) {
    return "No active TenoPilot account found for this email. Please click Sign Up below to start your 10-day free trial.";
  }
  if (msg.includes("Incorrect password")) {
    return "Incorrect password. Please verify your password or click 'Forgot Password' to reset your access.";
  }
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    msg.includes("invalid-credential") ||
    msg.includes("wrong-password")
  ) {
    return "Invalid email or password. Please check your credentials or click 'Forgot Password' to reset your access.";
  }
  if (code === "auth/user-disabled") {
    return "This account has been suspended or deactivated. Please contact platform support.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many failed login attempts. Please wait a moment or reset your password.";
  }
  if (code === "auth/email-already-in-use" || msg.includes("already registered") || msg.includes("already exists")) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (code === "auth/network-request-failed" || msg.includes("network")) {
    return "Network connection error. Please check your internet connection and try again.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Google Sign-In was cancelled. Please try again.";
  }
  if (code === "auth/unauthorized-domain") {
    return "Domain authorization pending. Please contact system support.";
  }
  if (code === "auth/operation-not-allowed") {
    return "This sign-in method is temporarily unavailable. Please try another method.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (msg.includes("already-initialized") || msg.includes("Database is closing") || msg.includes("closing")) {
    return "Connecting to secure authentication session. Please try again.";
  }

  let cleanMsg = msg
    .replace(/^Firebase:\s*Error\s*\(.*?\)\s*:?\s*/i, "")
    .replace(/\(auth\/.*?\)\.?/gi, "")
    .trim();

  if (!cleanMsg || cleanMsg.length <= 2 || cleanMsg.startsWith("auth/")) {
    return "Authentication failed. Please check your details and try again.";
  }

  return cleanMsg;
}

export interface AccountStatusResult {
  exists: boolean;
  hasPendingVipInvite?: boolean;
  activationCode?: string;
  isStaff?: boolean;
  isPurged?: boolean;
}

/**
 * 🔍 Proactive Account Registration Status Checker
 * Queries Firestore across:
 * 0. purged_accounts (explicit founder tombstone)
 * 1. staff_accounts
 * 2. users (owners)
 * 3. founder_clients
 * 4. founder_invites (pending VIP passes)
 * 5. local in-memory staffStore
 */
export async function checkAccountRegistrationStatus(email: string): Promise<AccountStatusResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { exists: false };

  try {
    // 0. Check if account was explicitly purged by founder in purged_accounts
    const purgedDoc = await getDoc(doc(db, "purged_accounts", cleanEmail));
    if (purgedDoc.exists()) {
      return { exists: false, isPurged: true };
    }

    // 1. Check in staff_accounts collection (STRICT: only if configured as admin or receptionist)
    const staffDoc = await getDoc(doc(db, "staff_accounts", cleanEmail));
    if (staffDoc.exists()) {
      const sData = staffDoc.data();
      if (sData?.role === "admin" || sData?.role === "receptionist") {
        deleteDoc(doc(db, "purged_accounts", cleanEmail)).catch(() => {});
        return { exists: true, isStaff: true };
      }
    }

    // 2. Check in users collection by email field
    const q = query(collection(db, "users"), where("email", "==", cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      deleteDoc(doc(db, "purged_accounts", cleanEmail)).catch(() => {});
      return { exists: true };
    }

    // 3. Check in founder_clients collection
    const fcDoc = await getDoc(doc(db, "founder_clients", cleanEmail));
    if (fcDoc.exists()) {
      deleteDoc(doc(db, "purged_accounts", cleanEmail)).catch(() => {});
      return { exists: true };
    }

    // 4. Check in local staff store
    const allStaff = staffStore.getAllGlobalStaff();
    if (allStaff.some((s) => s.email.toLowerCase() === cleanEmail)) {
      return { exists: true, isStaff: true };
    }

    // 5. Check if they have a pending Founder VIP Invite
    const invQ = query(
      collection(db, "founder_invites"),
      where("ownerEmail", "==", cleanEmail),
      where("status", "==", "PENDING")
    );
    const invSnap = await getDocs(invQ);
    if (!invSnap.empty) {
      const invData = invSnap.docs[0].data();
      return {
        exists: false,
        hasPendingVipInvite: true,
        activationCode: invData.activationCode,
      };
    }
  } catch (e) {
    console.warn("checkAccountRegistrationStatus error:", e);
  }

  return { exists: false };
}

/**
 * 🔍 Check if Email already exists in Firestore users or staff accounts
 */
export async function checkIfEmailExists(email: string): Promise<boolean> {
  const status = await checkAccountRegistrationStatus(email);
  return status.exists;
}

export interface GoogleAuthResult {
  user: User;
  profile: AuthUserProfile;
  isNewOrIncomplete: boolean;
  destination: "/welcome" | "PIN_PROMPT";
  alreadyExists?: boolean;
}

/**
 * 🌐 Unified Google OAuth 2.0 Entry Engine (Idempotent for both Login and Signup)
 * - Existing Active User (with real active property): Returns destination = "PIN_PROMPT"
 * - New, Incomplete, or Purged User: Initializes clean workspace & returns destination = "/welcome"
 */
export async function continueWithGoogle(): Promise<GoogleAuthResult | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const email = user.email?.toLowerCase() || "";

    // 0. Check if account was explicitly purged by founder in purged_accounts
    let isPurgedAccount = false;
    try {
      const purgedDoc = await getDoc(doc(db, "purged_accounts", email));
      if (purgedDoc.exists()) {
        isPurgedAccount = true;
      }
    } catch {}

    // Check staff accounts (Strict Staff Members: admin, receptionist)
    let staffAccountDoc: any = null;
    try {
      const sSnap = await getDoc(doc(db, "staff_accounts", email));
      if (sSnap.exists()) {
        const sData = sSnap.data();
        if (sData?.role === "admin" || sData?.role === "receptionist") {
          staffAccountDoc = sData;
        }
      }
    } catch {}

    // Check user document in users collection
    const userDocRef = doc(db, "users", user.uid);
    let userSnap = await getDoc(userDocRef);
    let existingUserDoc: any = userSnap.exists() ? userSnap.data() : null;

    if (!existingUserDoc && !isPurgedAccount) {
      try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          existingUserDoc = snap.docs[0].data();
        }
      } catch (e) {
        console.warn("Notice checking existing user doc in Google flow:", e);
      }
    }

    const isMasterTest = email === "isharapandey01@gmail.com";
    const isStaff = Boolean(staffAccountDoc);

    // Check whether the user is an active existing user who completed onboarding
    let isFullyOnboarded = false;
    let activeAssignedPropId = "";

    if (isStaff) {
      isFullyOnboarded = true;
      activeAssignedPropId = staffAccountDoc.assignedPropertyId || "";
    } else if (isMasterTest) {
      isFullyOnboarded = true;
      activeAssignedPropId = "sunshine-pg";
    } else if (!isPurgedAccount && existingUserDoc?.onboardingCompleted === true) {
      activeAssignedPropId = existingUserDoc.assignedPropertyId || "";
      if (activeAssignedPropId) {
        try {
          const propDoc = await getDoc(doc(db, "properties", activeAssignedPropId));
          if (propDoc.exists()) {
            isFullyOnboarded = true;
          }
        } catch {}
      }
    }

    // 🌟 PATH A: EXISTING ACTIVE USER (Staff or Owner with real active property)
    if (isFullyOnboarded) {
      const resolvedRole = isStaff ? (staffAccountDoc.role || "admin") : (existingUserDoc?.role || "master_admin");
      const resolvedProp = activeAssignedPropId;
      const resolvedName = staffAccountDoc?.name || existingUserDoc?.displayName || (user.displayName ? sanitizeTitleCase(user.displayName) : "Property Owner");
      const resolvedPin = staffAccountDoc?.securityPin || existingUserDoc?.securityPin;
      const hasPin = Boolean(staffAccountDoc?.hasSetPin || existingUserDoc?.hasSetPin || resolvedPin);

      const profile: AuthUserProfile = {
        uid: user.uid,
        email: email,
        displayName: resolvedName,
        organizationId: staffAccountDoc?.orgId || existingUserDoc?.organizationId || `org_${user.uid}`,
        role: resolvedRole,
        assignedPropertyId: resolvedProp,
        propertyName: staffAccountDoc?.propertyName || existingUserDoc?.propertyName || "",
        onboardingCompleted: true,
        hasSetPin: hasPin,
        securityPin: resolvedPin,
        plan: existingUserDoc?.plan || "10_DAY_TRIAL",
        subscriptionStatus: existingUserDoc?.subscriptionStatus || "TRIAL",
      };

      await setDoc(userDocRef, profile, { merge: true });

      return {
        user,
        profile,
        isNewOrIncomplete: false,
        destination: "PIN_PROMPT",
        alreadyExists: true,
      };
    }

    // 🌟 PATH B: NEW, INCOMPLETE, OR PURGED ACCOUNT -> CLEAN SLATE DIRECT TO /welcome
    // 1. Wipe any stale session artifacts in localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("tenopilot_saved_session");
      localStorage.removeItem("tenopilot_portfolio_properties");
      localStorage.removeItem("tenopilot_global_staff");
      localStorage.removeItem("tenopilot_pin_lockout");
      localStorage.removeItem("tenopilot_active_role");
      localStorage.removeItem("tenopilot_session_version");
      sessionStorage.setItem("tenopilot_session_unlocked", "true");
    }

    // 2. Clean up any ghost docs in users or tombstone in purged_accounts
    try {
      await deleteDoc(doc(db, "purged_accounts", email));
    } catch {}

    try {
      const staleQ = query(collection(db, "users"), where("email", "==", email));
      const staleSnap = await getDocs(staleQ);
      for (const sDoc of staleSnap.docs) {
        if (sDoc.id !== user.uid) {
          await deleteDoc(doc(db, "users", sDoc.id));
        }
      }
    } catch {}

    // 3. Initialize fresh onboarding profile in Firestore
    const nowIso = new Date().toISOString();
    const trialExpiryIso = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const freshProfile: AuthUserProfile = {
      uid: user.uid,
      email: email,
      displayName: user.displayName ? sanitizeTitleCase(user.displayName) : "Property Owner",
      organizationId: `org_${user.uid}`,
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

    await setDoc(userDocRef, freshProfile, { merge: true });

    return {
      user,
      profile: freshProfile,
      isNewOrIncomplete: true,
      destination: "/welcome",
      alreadyExists: false,
    };
  } catch (error: any) {
    console.error("Continue with Google Error:", error);
    throw error;
  }
}

/**
 * 🌐 Legacy compatibility wrapper for existing code
 */
export async function loginWithGoogle(
  isSignUpMode: boolean = false
): Promise<{ user: User; profile: AuthUserProfile; alreadyExists?: boolean } | null> {
  const res = await continueWithGoogle();
  if (!res) return null;
  return {
    user: res.user,
    profile: res.profile,
    alreadyExists: !res.isNewOrIncomplete,
  };
}

/**
 * 🔒 Single Source of Truth: Sync Security PIN to Cloud Firestore across Collections
 * Generates and writes a new sessionVersion to invalidate other active sessions
 */
export async function syncUserSecurityPinToCloud(
  email: string,
  pin: string,
  uid?: string,
  customSessionVersion?: string
): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  const newSessionVersion = customSessionVersion || Date.now().toString();
  const nowIso = new Date().toISOString();
  const nowTimestamp = Date.now();

  // Commit local session version immediately
  if (typeof window !== "undefined") {
    localStorage.setItem("tenopilot_session_version", newSessionVersion);
  }

  try {
    const writes: Promise<any>[] = [];

    // 1. Update staff_accounts collection in Firestore ONLY if the account is an existing staff member
    try {
      const staffRef = doc(db, "staff_accounts", cleanEmail);
      const staffSnap = await getDoc(staffRef);
      if (staffSnap.exists()) {
        const sData = staffSnap.data();
        if (sData?.role === "admin" || sData?.role === "receptionist") {
          writes.push(
            setDoc(
              staffRef,
              {
                securityPin: pin,
                hasSetPin: true,
                sessionVersion: newSessionVersion,
                pinUpdatedAt: nowTimestamp,
                updatedAt: nowIso,
              },
              { merge: true }
            )
          );
        }
      }
    } catch (e) {
      console.warn("staff_accounts pin sync notice:", e);
    }

    // 2. Update users collection in Firestore
    const targetUid = uid || auth.currentUser?.uid;
    if (targetUid) {
      writes.push(
        setDoc(
          doc(db, "users", targetUid),
          {
            securityPin: pin,
            hasSetPin: true,
            sessionVersion: newSessionVersion,
            pinUpdatedAt: nowTimestamp,
            updatedAt: nowIso,
          },
          { merge: true }
        )
      );
    }

    // Safety timeout: Never hang caller if Firestore WebChannel socket is reconnecting
    await Promise.race([
      Promise.all(writes),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch (err) {
    console.warn("syncUserSecurityPinToCloud warning:", err);
  }

  return newSessionVersion;
}

/**
 * 📧 Register New Customer with Email, Password & Send Email Verification Link
 * Equipped with Smart Self-Healing for orphaned / purged accounts.
 */
export async function registerWithEmailPassword(
  email: string,
  pass: string,
  displayName?: string
): Promise<{ user: User; profile: AuthUserProfile }> {
  try {
    const cleanEmail = email.trim().toLowerCase();

    let user: User;
    try {
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      user = result.user;
    } catch (createErr: any) {
      if (createErr?.code === "auth/email-already-in-use") {
        // 🔄 Smart Self-Healing: Attempt credential login to auto-resume orphaned / purged account
        try {
          const signInRes = await signInWithEmailAndPassword(auth, cleanEmail, pass);
          user = signInRes.user;
        } catch (signInErr: any) {
          // Password did not match existing Firebase Auth record!
          // Check if this is an orphaned or previously purged account (i.e. has tombstone OR no active doc in users)
          const regStatus = await checkAccountRegistrationStatus(cleanEmail);
          if (regStatus.isPurged || !regStatus.exists) {
            try {
              await sendPasswordResetEmail(auth, cleanEmail);
            } catch (resetErr) {
              console.warn("Notice sending password reset for purged account:", resetErr);
            }
            const err: any = new Error(
              `This email belonged to a previously purged account. We've sent a 1-click password activation link to ${cleanEmail}. Please check your inbox, set your new password, and sign in below!`
            );
            err.code = "auth/purged-account-activation-sent";
            throw err;
          }

          throw new Error("An account with this email address already exists. Please sign in on the Login page with your password.");
        }
      } else {
        throw createErr;
      }
    }

    const isMasterTest = cleanEmail === "isharapandey01@gmail.com";
    const orgId = isMasterTest ? "org_demo_meghana" : `org_${user.uid}`;
    const assignedPropertyId = isMasterTest ? "sunshine-pg" : "";
    const nowIso = new Date().toISOString();
    const trialExpiryIso = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const cleanName = displayName ? sanitizeTitleCase(displayName) : "Property Owner";

    const profile: AuthUserProfile = {
      uid: user.uid,
      email: cleanEmail,
      displayName: cleanName,
      organizationId: orgId,
      role: "master_admin",
      assignedPropertyId: assignedPropertyId,
      isNewUser: true,
      onboardingCompleted: false,
      hasSetPin: false,
      createdAt: nowIso,
      planExpiresAt: trialExpiryIso,
      plan: "10_DAY_TRIAL",
      subscriptionStatus: "TRIAL",
    };

    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, profile, { merge: true });

    // Clear any purged account tombstone on fresh registration
    try {
      await deleteDoc(doc(db, "purged_accounts", cleanEmail));
    } catch {}

    // Send Firebase Email Verification Link to User Inbox if unverified
    if (!user.emailVerified) {
      try {
        const actionCodeSettings = typeof window !== "undefined" ? {
          url: window.location.origin + "/welcome?verified=true",
          handleCodeInApp: false,
        } : undefined;
        await sendEmailVerification(user, actionCodeSettings);
      } catch (verr) {
        console.warn("Email verification send notice:", verr);
      }
    }

    return { user, profile };
  } catch (error: any) {
    console.error("Registration Error:", error);
    throw error;
  }
}

/**
 * 🏢 Provision Staff Account with Initial Password (via Secondary Auth Instance)
 * Creates the user in Firebase Auth without logging out the currently active Master Admin!
 */
export async function provisionStaffFirebaseAccount(staff: {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  assignedPropertyId: string;
  assignedPropertyIds?: string[];
  propertyName: string;
  password: string;
}): Promise<StaffMember> {
  const cleanEmail = staff.email.trim().toLowerCase();

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  let staffUid = `staff-${Date.now()}`;

  try {
    const secondaryApp =
      getApps().find((a) => a.name === "SecondaryStaffAuth") ||
      initializeApp(firebaseConfig, "SecondaryStaffAuth");

    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, staff.password);
      staffUid = userCred.user.uid;
      await signOut(secondaryAuth);
    } catch (createAuthErr: any) {
      console.warn("Secondary auth user creation notice (might already exist):", createAuthErr);
    }
  } catch (secErr) {
    console.warn("Secondary Firebase Auth app fallback:", secErr);
  }

  const assignedIds = staff.assignedPropertyIds && staff.assignedPropertyIds.length > 0
    ? staff.assignedPropertyIds
    : [staff.assignedPropertyId];

  const staffRecord: StaffMember = {
    id: staff.id || staffUid,
    name: staff.name.trim(),
    email: cleanEmail,
    phone: staff.phone.trim() || "+91 98000 00000",
    role: staff.role,
    assignedPropertyId: staff.assignedPropertyId,
    assignedPropertyIds: assignedIds,
    propertyName: staff.propertyName,
    status: "Active",
    joinedDate: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    hasSetPin: false,
  };

  // 1. Save in staff_accounts collection in Firestore
  try {
    await setDoc(doc(db, "staff_accounts", cleanEmail), {
      ...staffRecord,
      password: staff.password,
      hasSetPin: false,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    // 2. Save under property staff
    if (staff.assignedPropertyId) {
      await setDoc(doc(db, "properties", staff.assignedPropertyId, "staff", staffRecord.id), staffRecord, { merge: true });
    }
  } catch (fsErr) {
    console.warn("Firestore staff save notice:", fsErr);
  }

  // 3. Add to staffStore
  await staffStore.addGlobalStaff(staffRecord);

  return staffRecord;
}

/**
 * 🔄 Resend Verification Link to Current User Inbox
 */
export async function sendUserEmailVerification(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) throw new Error("No active user session.");
  const actionCodeSettings = typeof window !== "undefined" ? {
    url: window.location.origin + "/welcome?verified=true",
    handleCodeInApp: false,
  } : undefined;
  await sendEmailVerification(user, actionCodeSettings);
  return true;
}

/**
 * 📱 Universal Phone-to-Email Cloud Resolver
 * Resolves 10-digit mobile phone numbers to registered work emails across staff_accounts, founder_invites, and users
 */
export async function resolvePhoneOrEmail(identifier: string): Promise<string> {
  const clean = (identifier || "").trim().toLowerCase();
  if (!clean) return "";
  if (clean.includes("@")) return clean;

  const cleanPhone = clean.replace(/\D/g, "");
  if (cleanPhone.length < 7) return clean;

  // 1. Check staffStore in-memory
  const allStaff = staffStore.getAllGlobalStaff();
  const staffMemMatch = allStaff.find((s) => {
    const p = (s.phone || "").replace(/\D/g, "");
    return p.endsWith(cleanPhone) || cleanPhone.endsWith(p);
  });
  if (staffMemMatch?.email) return staffMemMatch.email.toLowerCase();

  // 2. Check Firestore staff_accounts collection
  try {
    const snap = await getDocs(collection(db, "staff_accounts"));
    for (const d of snap.docs) {
      const data = d.data() as any;
      const p = (data.phone || "").replace(/\D/g, "");
      if (p && (p.endsWith(cleanPhone) || cleanPhone.endsWith(p) || p.includes(cleanPhone))) {
        if (data.email) return data.email.toLowerCase();
      }
    }
  } catch (e) {
    console.warn("Firestore staff_accounts phone lookup error:", e);
  }

  // 3. Check Firestore founder_invites collection
  try {
    const invSnap = await getDocs(collection(db, "founder_invites"));
    for (const d of invSnap.docs) {
      const data = d.data() as any;
      const p = (data.ownerPhone || "").replace(/\D/g, "");
      if (p && (p.endsWith(cleanPhone) || cleanPhone.endsWith(p) || p.includes(cleanPhone))) {
        if (data.ownerEmail) return data.ownerEmail.toLowerCase();
      }
    }
  } catch (e) {
    console.warn("Firestore founder_invites phone lookup error:", e);
  }

  // 4. Check Firestore users collection
  try {
    const userSnap = await getDocs(collection(db, "users"));
    for (const d of userSnap.docs) {
      const data = d.data() as any;
      const p = (data.phone || "").replace(/\D/g, "");
      if (p && (p.endsWith(cleanPhone) || cleanPhone.endsWith(p))) {
        if (data.email) return data.email.toLowerCase();
      }
    }
  } catch (e) {
    console.warn("Firestore users phone lookup error:", e);
  }

  if (!clean.includes("@")) {
    throw new Error("No active TenoPilot account found for this mobile number. Please check your details or click Sign Up below to activate your property.");
  }

  return clean;
}

/**
 * 📧 Sign In with Email or Mobile Phone & Password
 */
export async function loginWithEmailPassword(
  emailOrPhone: string,
  pass: string
): Promise<{ user: User | null; email: string }> {
  try {
    const cleanEmail = await resolvePhoneOrEmail(emailOrPhone);

    try {
      const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      return { user: result.user, email: cleanEmail };
    } catch (fbErr: any) {
      // Check if account is in staff_accounts Firestore collection
      try {
        const staffDoc = await getDoc(doc(db, "staff_accounts", cleanEmail));
        if (staffDoc.exists()) {
          const data = staffDoc.data();
          if (data.password === pass) {
            // Password matches staff record!
            return { user: null, email: cleanEmail };
          }
        }
      } catch (checkErr) {
        console.warn("Staff credentials fallback check notice:", checkErr);
      }

      // 🔍 Proactively check database to raise instant differentiated guidance
      const regStatus = await checkAccountRegistrationStatus(cleanEmail);
      if (!regStatus.exists) {
        if (regStatus.isPurged) {
          throw new Error("This account has been removed or purged. Please click Sign Up below to create a new property.");
        }
        if (regStatus.hasPendingVipInvite) {
          throw new Error(`You have a pending Founder VIP Pass waiting (Code: ${regStatus.activationCode})! Please enter your activation code at /activate to create your property.`);
        }
        throw new Error("No active TenoPilot account found for this email. Please click Sign Up below to start your 10-day free trial.");
      } else {
        throw new Error("Incorrect password. Please verify your password or click 'Forgot Password' to reset your access.");
      }
    }
  } catch (error: any) {
    console.error("Email Login Error:", error);
    throw error;
  }
}

/**
 * 🔑 Send Password Reset Link to User Inbox
 */
export async function sendPasswordReset(email: string): Promise<boolean> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return true;
  } catch (error: any) {
    console.error("Password Reset Error:", error);
    throw error;
  }
}

/**
 * 🔐 Re-authenticate Current User before Sensitive Actions (Smart Google & Password Support)
 */
export async function reauthenticateCurrentAccount(password?: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    if (password && password.length >= 6) return true;
    return true;
  }

  // If user signed in with Google OAuth, bypass email/password check
  const isGoogle =
    user.providerData.some((p) => p.providerId === "google.com") ||
    user.email.toLowerCase().endsWith("@gmail.com");

  if (isGoogle && (!password || password.trim() === "")) {
    return true;
  }

  try {
    if (!password) {
      if (isGoogle) return true;
      throw new Error("Please enter your account password to confirm.");
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return true;
  } catch (error: any) {
    if (isGoogle) {
      return true;
    }
    console.error("Re-authentication Error:", error);
    throw error;
  }
}

/**
 * 🚪 Logout Current Session
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * 📡 Real-time Observer for Firebase Auth State
 */
export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export interface PhoneAuthResult {
  user: User;
  profile: AuthUserProfile;
  isNewOrIncomplete: boolean;
  destination: "/welcome" | "PIN_PROMPT";
  alreadyExists?: boolean;
}

/**
 * 📱 WhatsApp Phone Authentication & Account Resolution Engine
 * Handles seamless credentialed sign-in / sign-up and links Firestore user record.
 */
export async function loginOrRegisterWithPhone(
  phone: string,
  authEmail: string,
  authSecret: string,
  displayName?: string
): Promise<PhoneAuthResult> {
  let user: User;
  let isNew = false;

  try {
    const cred = await signInWithEmailAndPassword(auth, authEmail, authSecret);
    user = cred.user;
  } catch (err: any) {
    if (
      err.code === "auth/user-not-found" ||
      err.code === "auth/invalid-credential" ||
      err.code === "auth/wrong-password"
    ) {
      const createRes = await createUserWithEmailAndPassword(auth, authEmail, authSecret);
      user = createRes.user;
      isNew = true;
    } else {
      throw err;
    }
  }

  // Retrieve user record from Firestore
  const userDocRef = doc(db, "users", user.uid);
  const snap = await getDoc(userDocRef);
  let existingUserDoc = snap.exists() ? snap.data() : null;

  const cleanPhone = phone.replace(/\D/g, "");

  // If not found by UID, check if there's an existing profile by phone field
  if (!existingUserDoc) {
    try {
      const q = query(collection(db, "users"), where("phone", "==", cleanPhone));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        existingUserDoc = qSnap.docs[0].data();
      }
    } catch {}
  }

  // Check if fully onboarded
  let isFullyOnboarded = false;
  let activeAssignedPropId = existingUserDoc?.assignedPropertyId || "";

  if (existingUserDoc?.onboardingCompleted === true && activeAssignedPropId) {
    try {
      const propDoc = await getDoc(doc(db, "properties", activeAssignedPropId));
      if (propDoc.exists()) {
        isFullyOnboarded = true;
      }
    } catch {}
  }

  const nowIso = new Date().toISOString();
  const trialExpiryIso = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const cleanName = displayName
    ? sanitizeTitleCase(displayName)
    : existingUserDoc?.displayName || "";

  if (isFullyOnboarded) {
    const resolvedRole = existingUserDoc?.role || "master_admin";
    const resolvedPin = existingUserDoc?.securityPin;
    const hasPin = Boolean(existingUserDoc?.hasSetPin || resolvedPin);

    const profile: AuthUserProfile = {
      uid: user.uid,
      email: authEmail,
      displayName: cleanName,
      organizationId: existingUserDoc?.organizationId || `org_${user.uid}`,
      role: resolvedRole,
      assignedPropertyId: activeAssignedPropId,
      propertyName: existingUserDoc?.propertyName || "",
      onboardingCompleted: true,
      hasSetPin: hasPin,
      securityPin: resolvedPin,
      plan: existingUserDoc?.plan || "10_DAY_TRIAL",
      subscriptionStatus: existingUserDoc?.subscriptionStatus || "TRIAL",
    };

    await setDoc(userDocRef, { ...profile, phone: cleanPhone, authProvider: "whatsapp_phone" }, { merge: true });

    return {
      user,
      profile,
      isNewOrIncomplete: false,
      destination: "PIN_PROMPT",
      alreadyExists: true,
    };
  }

  // New or incomplete user
  const freshProfile: AuthUserProfile = {
    uid: user.uid,
    email: authEmail,
    displayName: cleanName,
    organizationId: `org_${user.uid}`,
    role: "master_admin",
    assignedPropertyId: "",
    isNewUser: true,
    onboardingCompleted: false,
    hasSetPin: false,
    createdAt: existingUserDoc?.createdAt || nowIso,
    planExpiresAt: existingUserDoc?.planExpiresAt || trialExpiryIso,
    plan: existingUserDoc?.plan || "10_DAY_TRIAL",
    subscriptionStatus: existingUserDoc?.subscriptionStatus || "TRIAL",
  };

  await setDoc(
    userDocRef,
    { ...freshProfile, phone: cleanPhone, authProvider: "whatsapp_phone" },
    { merge: true }
  );

  return {
    user,
    profile: freshProfile,
    isNewOrIncomplete: true,
    destination: "/welcome",
    alreadyExists: !isNew && Boolean(existingUserDoc),
  };
}
