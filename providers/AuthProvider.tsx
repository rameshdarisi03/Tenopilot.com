"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { sanitizeTitleCase } from "@/lib/authService";
import { staffStore, StaffMember, UserRole } from "@/lib/staffStore";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string;
  phone?: string;
  role: "master_admin" | "admin" | "receptionist";
  assignedPropertyId: string;
  isNewUser?: boolean;
  onboardingCompleted?: boolean;
  hasSetPin?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateProfileName: (newName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  updateProfileName: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const email = currentUser.email?.toLowerCase() || "";
        const isMasterTest = email === "isharapandey01@gmail.com";
        const orgId = isMasterTest ? "org_demo_meghana" : `org_${currentUser.uid}`;

        // Check local saved session first for freshest name & role
        let savedSessionName = "";
        let savedSessionRole: UserRole | undefined;
        let savedAssignedProp = "";

        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("tenopilot_saved_session");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.email?.toLowerCase() === email) {
                savedSessionName = parsed.name || "";
                savedSessionRole = parsed.role;
                savedAssignedProp = parsed.assignedPropertyId || "";
              }
            } catch {}
          }
        }

        // Check staff registry
        const allStaff = staffStore.getAllGlobalStaff();
        const staffMatch = allStaff.find((s) => s.email.toLowerCase() === email);

        // Check Firestore staff_accounts collection
        let staffAccountDoc: any = null;
        try {
          const staffSnap = await getDoc(doc(db, "staff_accounts", email));
          if (staffSnap.exists()) {
            staffAccountDoc = staffSnap.data();
          }
        } catch {}

        const resolvedRole: UserRole =
          staffAccountDoc?.role ||
          staffMatch?.role ||
          savedSessionRole ||
          (email.includes("receptionist") ? "receptionist" : "master_admin");

        const resolvedName =
          staffAccountDoc?.name ||
          staffMatch?.name ||
          savedSessionName ||
          currentUser.displayName ||
          sanitizeTitleCase(email.split("@")[0]) ||
          "Property Owner";

        const resolvedProp =
          staffAccountDoc?.assignedPropertyId ||
          staffMatch?.assignedPropertyId ||
          savedAssignedProp ||
          (isMasterTest ? "sunshine-pg" : "");

        const userDocRef = doc(db, "users", currentUser.uid);
        
        // Real-Time Profile Snapshot Listener (Synchronizes instantly upon onboarding completion)
        const unsubscribeProfile = onSnapshot(
          userDocRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              data.displayName = sanitizeTitleCase(data.displayName || resolvedName);
              const isExplicitStaff = Boolean(staffAccountDoc?.role || staffMatch?.role);
              const finalRole = isExplicitStaff
                ? (staffAccountDoc?.role || staffMatch?.role || "receptionist")
                : (data.role === "admin" ? "master_admin" : data.role || "master_admin");
              data.role = finalRole;
              data.assignedPropertyId =
                (isExplicitStaff && (staffAccountDoc?.assignedPropertyId || staffMatch?.assignedPropertyId)) ||
                data.assignedPropertyId ||
                resolvedProp;
              setProfile(data);
              staffStore.setActiveRole(data.role);
            } else {
              const newProf: UserProfile = {
                uid: currentUser.uid,
                email: email,
                displayName: sanitizeTitleCase(resolvedName),
                organizationId: orgId,
                role: resolvedRole,
                assignedPropertyId: resolvedProp,
                isNewUser: !isMasterTest,
                onboardingCompleted: isMasterTest,
              };
              setDoc(userDocRef, newProf, { merge: true }).catch(() => {});
              setProfile(newProf);
              staffStore.setActiveRole(newProf.role);
            }
            setLoading(false);
          },
          (err) => {
            console.warn("User profile onSnapshot warning:", err);
            setLoading(false);
          }
        );

        return () => {
          unsubscribeProfile();
        };
      } else {
        // Hydrate from verified local PIN session if present
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("tenopilot_saved_session");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const fallbackProf: UserProfile = {
                uid: `local_${parsed.email || "user"}`,
                email: parsed.email || "staff@tenopilot.com",
                displayName: sanitizeTitleCase(parsed.name || parsed.email?.split("@")[0] || "Team Member"),
                organizationId: "org_estate_01",
                role: (parsed.role as UserRole) || "master_admin",
                assignedPropertyId: parsed.assignedPropertyId || "sunshine-pg",
                onboardingCompleted: true,
              };
              setProfile(fallbackProf);
              staffStore.setActiveRole(fallbackProf.role);
            } catch {
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Dual-Tier Access Guard — Protect dashboard routes with Firebase Auth OR PIN Fast-Session + Session PIN Lock
  useEffect(() => {
    const isPublicComplaintPage = pathname?.includes("/public-complaint");
    const isSelfOnboardPage = pathname?.startsWith("/self-onboard");
    const isPublicMarketing =
      pathname === "/" ||
      pathname === "/pricing" ||
      pathname === "/features" ||
      pathname === "/how-it-works" ||
      pathname === "/verticals" ||
      pathname === "/install";

    // Strictly exempt all public pages so QR scans open instantly with ZERO login or PIN prompts!
    const isProtectedPage =
      !isPublicComplaintPage &&
      !isSelfOnboardPage &&
      !isPublicMarketing &&
      pathname !== "/welcome" &&
      (pathname?.startsWith("/p/") || pathname === "/home" || pathname === "/staff-management");

    const isAuthPage = pathname === "/login" || pathname === "/signup";
    const isWelcomePage = pathname === "/welcome";

    let localSavedPropertyId = "";
    let localSavedPropertyName = "";
    if (typeof window !== "undefined") {
      try {
        const parsed = JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}");
        localSavedPropertyId = parsed.assignedPropertyId || "";
        localSavedPropertyName = parsed.propertyName || "";
      } catch {}
    }

    const hasLocalSession =
      typeof window !== "undefined" && Boolean(localStorage.getItem("tenopilot_saved_session"));
    const isSessionUnlocked =
      typeof window !== "undefined" && sessionStorage.getItem("tenopilot_session_unlocked") === "true";
    const isGoogleUser = user?.providerData?.some((p) => p.providerId === "google.com");
    const isEmailUnverified = user && !isGoogleUser && !user.emailVerified;

    const hasCompletedSetup =
      profile?.onboardingCompleted === true ||
      Boolean(profile?.assignedPropertyId) ||
      Boolean(localSavedPropertyId) ||
      Boolean(localSavedPropertyName) ||
      user?.email?.toLowerCase() === "isharapandey01@gmail.com";

    if (isProtectedPage) {
      // 🔒 If session is locked on app re-open OR user is not authenticated -> route immediately to /login PIN lock
      if ((!user && !hasLocalSession) || !isSessionUnlocked) {
        router.replace("/login");
      } else if (!hasCompletedSetup && !loading) {
        router.replace("/welcome");
      }
    }

    if (isWelcomePage && !loading) {
      if (!user && !hasLocalSession) {
        router.replace("/login");
      } else if (hasCompletedSetup) {
        router.replace("/home");
      }
    }

    if (isAuthPage && !loading && (user || hasLocalSession) && !isEmailUnverified && isSessionUnlocked) {
      if (!hasCompletedSetup) {
        router.replace("/welcome");
      } else {
        let resolvedRole = profile?.role;
        let resolvedProp = profile?.assignedPropertyId || localSavedPropertyId;
        if (!resolvedRole && hasLocalSession) {
          try {
            const parsed = JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}");
            resolvedRole = parsed.role;
            resolvedProp = parsed.assignedPropertyId;
          } catch {}
        }
        const dest = resolvedRole === "master_admin" ? "/home" : `/p/${resolvedProp || "sunshine-pg"}/overview`;
        router.replace(dest);
      }
    }
  }, [user, profile, loading, pathname, router]);

  // 🔄 Real-Time Cross-Device Session Invalidation Listener (Instant Eviction across collections)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let targetEmail = "";
    if (user?.email) {
      targetEmail = user.email.toLowerCase().trim();
    } else {
      try {
        const saved = localStorage.getItem("tenopilot_saved_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.email) targetEmail = parsed.email.toLowerCase().trim();
        }
      } catch {}
    }

    if (!targetEmail && !user?.uid) return;

    const evictCurrentSession = (reason: string) => {
      console.warn("🔒 Cross-Device Eviction Triggered:", reason);
      sessionStorage.removeItem("tenopilot_session_unlocked");
      localStorage.removeItem("tenopilot_saved_session");
      localStorage.removeItem("tenopilot_global_staff");
      localStorage.removeItem("tenopilot_pin_lockout");
      localStorage.removeItem("tenopilot_active_role");
      localStorage.removeItem("tenopilot_session_version");
      sessionStorage.setItem(
        "tenopilot_revoked_notice",
        "🔒 Security Notice: Your PIN or credentials were changed on another device. Please sign in with your new PIN/password."
      );
      setProfile(null);
      setUser(null);
      signOut(auth).catch(() => {});
      router.replace("/login");
    };

    const unsubs: Array<() => void> = [];

    // Helper to evaluate cloud data against local device state
    const evaluateCloudSecurityState = (cloudData: any, source: string) => {
      if (!cloudData) return;

      const remoteVersion = cloudData.sessionVersion;
      const remotePin = cloudData.securityPin;
      const localVersion = localStorage.getItem("tenopilot_session_version");

      let localPin: string | undefined = undefined;
      try {
        const saved = localStorage.getItem("tenopilot_saved_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          localPin = parsed.securityPin;
        }
      } catch {}

      // 1. Version Mismatch Check
      if (remoteVersion && localVersion && remoteVersion !== localVersion) {
        evictCurrentSession(`${source} remote version (${remoteVersion}) differs from local (${localVersion})`);
        return;
      }

      // 2. PIN Drift Check (If PIN changed in cloud and differs from local device's cached PIN)
      if (remotePin && localPin && remotePin !== localPin) {
        evictCurrentSession(`${source} remote securityPin changed in Cloud Firestore`);
        return;
      }

      // 3. Initialize local version if aligned
      if (remoteVersion && !localVersion) {
        localStorage.setItem("tenopilot_session_version", remoteVersion);
      }
    };

    // 1. Listen to staff_accounts collection
    if (targetEmail) {
      try {
        const staffAccountRef = doc(db, "staff_accounts", targetEmail);
        const unsubStaff = onSnapshot(
          staffAccountRef,
          (snap) => {
            if (snap.exists()) {
              evaluateCloudSecurityState(snap.data(), "staff_accounts");
            }
          },
          (err) => console.warn("Staff account snapshot listener notice:", err)
        );
        unsubs.push(unsubStaff);
      } catch (err) {
        console.warn("staff_accounts snapshot registration warning:", err);
      }
    }

    // 2. Listen to users collection
    const currentUid = user?.uid || auth.currentUser?.uid;
    if (currentUid) {
      try {
        const userRef = doc(db, "users", currentUid);
        const unsubUser = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              evaluateCloudSecurityState(snap.data(), "users");
            }
          },
          (err) => console.warn("Users snapshot listener notice:", err)
        );
        unsubs.push(unsubUser);
      } catch (err) {
        console.warn("users snapshot registration warning:", err);
      }
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [user?.email, user?.uid, pathname, router]);

  // Update Profile Name Function
  const updateProfileName = async (newName: string) => {
    const cleanName = sanitizeTitleCase(newName);
    if (!cleanName) return;

    if (profile) {
      const updated = { ...profile, displayName: cleanName };
      setProfile(updated);

      // Also sync to local saved session
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("tenopilot_saved_session");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            parsed.name = cleanName;
            localStorage.setItem("tenopilot_saved_session", JSON.stringify(parsed));
          } catch {}
        }
      }

      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await setDoc(userDocRef, { displayName: cleanName }, { merge: true });
        } catch (e) {
          console.warn("Update profile name Firestore error:", e);
        }
      }
    }
  };

  // Sign Out / Logout Function
  const logout = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tenopilot_session_unlocked");
      localStorage.removeItem("tenopilot_saved_session");
      localStorage.removeItem("tenopilot_global_staff");
      localStorage.removeItem("tenopilot_active_role");
      localStorage.removeItem("tenopilot_pin_lockout");
      localStorage.removeItem("tenopilot_session_version");
    }
    setProfile(null);
    setUser(null);
    await signOut(auth);
    router.replace("/login");
  };

  // 🛡️ Zero-Flash Guard: Never render private dashboard pixels before session PIN unlock
  const isPublicComplaint = pathname?.includes("/public-complaint");
  const isSelfOnboard = pathname?.startsWith("/self-onboard");
  const isPublicMarketing =
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/features" ||
    pathname === "/how-it-works" ||
    pathname === "/verticals" ||
    pathname === "/install";

  const isProtected =
    !isPublicComplaint &&
    !isSelfOnboard &&
    !isPublicMarketing &&
    (pathname?.startsWith("/p/") || pathname === "/home" || pathname === "/staff-management");

  const isUnlocked =
    typeof window !== "undefined" ? sessionStorage.getItem("tenopilot_session_unlocked") === "true" : true;

  if (isProtected && !isUnlocked) {
    return (
      <div className="min-h-screen bg-[#fff8f6] flex items-center justify-center">
        <div className="w-11 h-11 rounded-2xl bg-[#c2652a] text-white font-serif font-bold text-xl flex items-center justify-center animate-pulse shadow-md">
          T
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfileName, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
