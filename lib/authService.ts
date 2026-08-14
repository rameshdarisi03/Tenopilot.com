// TenoPilot Live Firebase Production Authentication Service
import { auth, db } from "./firebase";
import {
  GoogleAuthProvider,
  OAuthProvider,
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
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

export interface AuthUserProfile {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string;
  photoURL?: string;
  role: "master_admin" | "admin" | "receptionist";
  assignedPropertyId: string;
  isNewUser?: boolean;
}

/**
 * 🔤 Clean Title-Case Name Sanitizer
 * Converts messy user input (e.g. "RaMesH DariSI" or "rameshdarisi01") -> Clean Title-Cased Name ("Ramesh Darisi")
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
 * Replaces raw internal error codes (e.g. Firebase: Error) with clean, human-friendly messages.
 */
export function getCleanAuthErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred. Please try again.";
  
  const code = typeof err === "string" ? err : err?.code || "";
  const msg = typeof err === "string" ? err : err?.message || "";

  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    msg.includes("invalid-credential") ||
    msg.includes("user-not-found")
  ) {
    return "Invalid email or password. Please verify your credentials and try again.";
  }
  if (code === "auth/user-disabled") {
    return "This account has been suspended. Please contact platform support.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many failed login attempts. Please wait a moment or reset your password.";
  }
  if (code === "auth/email-already-in-use") {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (code === "auth/network-request-failed") {
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

  let cleanMsg = msg
    .replace(/^Firebase:\s*Error\s*\(.*?\)\s*:?\s*/i, "")
    .replace(/\(auth\/.*?\)\.?/gi, "")
    .trim();

  if (!cleanMsg || cleanMsg.startsWith("auth/")) {
    return "Authentication failed. Please check your details and try again.";
  }

  return cleanMsg;
}

/**
 * 🌐 Sign In or Onboard with Google OAuth 2.0
 */
export async function loginWithGoogle(): Promise<{ user: User; profile: AuthUserProfile } | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const email = user.email?.toLowerCase() || "";

    // Check if user document already exists in Cloud Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);

    let profile: AuthUserProfile;

    if (userSnap.exists()) {
      profile = userSnap.data() as AuthUserProfile;
    } else {
      // 🌟 NEW USER ONBOARDING
      const isMasterTest = email === "isharapandey01@gmail.com";
      const orgId = isMasterTest ? "org_demo_meghana" : `org_${user.uid}`;
      const assignedPropertyId = isMasterTest ? "sunshine-pg" : "";

      profile = {
        uid: user.uid,
        email: email,
        displayName: user.displayName || "Property Owner",
        organizationId: orgId,
        photoURL: user.photoURL || undefined,
        role: "master_admin",
        assignedPropertyId: assignedPropertyId,
        isNewUser: true,
      };

      await setDoc(userDocRef, profile, { merge: true });
    }

    return { user, profile };
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

/**
 * 🍎 Sign In or Onboard with Apple OAuth 2.0
 */
export async function loginWithApple(): Promise<{ user: User; profile: AuthUserProfile } | null> {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    const user = result.user;
    const email = user.email?.toLowerCase() || "";

    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);

    let profile: AuthUserProfile;

    if (userSnap.exists()) {
      profile = userSnap.data() as AuthUserProfile;
    } else {
      const isMasterTest = email === "isharapandey01@gmail.com";
      const orgId = isMasterTest ? "org_demo_meghana" : `org_${user.uid}`;
      const assignedPropertyId = isMasterTest ? "sunshine-pg" : "";

      profile = {
        uid: user.uid,
        email: email,
        displayName: user.displayName || "Property Owner",
        organizationId: orgId,
        photoURL: user.photoURL || undefined,
        role: "master_admin",
        assignedPropertyId: assignedPropertyId,
        isNewUser: true,
      };

      await setDoc(userDocRef, profile, { merge: true });
    }

    return { user, profile };
  } catch (error: any) {
    console.error("Apple Sign-In Error:", error);
    throw error;
  }
}

/**
 * 📧 Register New Customer with Email, Password & Send Email Verification Link
 */
export async function registerWithEmailPassword(
  email: string,
  pass: string,
  displayName?: string
): Promise<{ user: User; profile: AuthUserProfile }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const user = result.user;

    const isMasterTest = cleanEmail === "isharapandey01@gmail.com";
    const orgId = isMasterTest ? "org_demo_meghana" : `org_${user.uid}`;
    const assignedPropertyId = isMasterTest ? "sunshine-pg" : "";

    const cleanName = displayName ? sanitizeTitleCase(displayName) : "Property Owner";

    const profile: AuthUserProfile = {
      uid: user.uid,
      email: cleanEmail,
      displayName: cleanName,
      organizationId: orgId,
      role: "master_admin",
      assignedPropertyId: assignedPropertyId,
      isNewUser: true,
    };

    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, profile, { merge: true });

    // Send Firebase Email Verification Link to User Inbox
    try {
      await sendEmailVerification(user);
    } catch (verr) {
      console.warn("Email verification send notice:", verr);
    }

    return { user, profile };
  } catch (error: any) {
    console.error("Registration Error:", error);
    throw error;
  }
}

/**
 * 🔄 Resend Verification Link to Current User Inbox
 */
export async function sendUserEmailVerification(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) throw new Error("No active user session.");
  await sendEmailVerification(user);
  return true;
}

/**
 * 📧 Sign In with Email & Password
 */
export async function loginWithEmailPassword(
  email: string,
  pass: string
): Promise<User | null> {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return result.user;
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
 * 🔐 Re-authenticate Current User with Password before Sensitive Actions (e.g. Account Deletion)
 */
export async function reauthenticateCurrentAccount(password: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No active user session found.");
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return true;
  } catch (error: any) {
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
