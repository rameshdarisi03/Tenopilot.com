"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
          (email.includes("rec") ? "receptionist" : email.includes("admin") && !email.includes("master") ? "admin" : "master_admin");

        const resolvedName =
          staffAccountDoc?.name ||
          staffMatch?.name ||
          savedSessionName ||
          currentUser.displayName ||
          sanitizeTitleCase(email.split("@")[0]) ||
          (resolvedRole === "master_admin" ? "Master Admin" : "Team Member");

        const resolvedProp =
          staffAccountDoc?.assignedPropertyId ||
          staffMatch?.assignedPropertyId ||
          savedAssignedProp ||
          "sunshine-pg";

        const userDocRef = doc(db, "users", currentUser.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            data.displayName = sanitizeTitleCase(data.displayName || resolvedName);
            data.role = data.role || resolvedRole;
            data.assignedPropertyId = data.assignedPropertyId || resolvedProp;
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
              isNewUser: false,
            };
            await setDoc(userDocRef, newProf, { merge: true });
            setProfile(newProf);
            staffStore.setActiveRole(newProf.role);
          }
        } catch (e) {
          console.warn("Auth profile fetch fallback:", e);
          const fallbackProf: UserProfile = {
            uid: currentUser.uid,
            email: email,
            displayName: sanitizeTitleCase(resolvedName),
            organizationId: orgId,
            role: resolvedRole,
            assignedPropertyId: resolvedProp,
          };
          setProfile(fallbackProf);
          staffStore.setActiveRole(resolvedRole);
        }
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
                role: (parsed.role as UserRole) || "admin",
                assignedPropertyId: parsed.assignedPropertyId || "sunshine-pg",
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
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Dual-Tier Access Guard — Protect dashboard routes with Firebase Auth OR PIN Fast-Session
  useEffect(() => {
    if (!loading) {
      const isProtectedPage = pathname?.startsWith("/p/") || pathname === "/home";
      const isAuthPage = pathname === "/login" || pathname === "/signup";

      const hasLocalSession =
        typeof window !== "undefined" && Boolean(localStorage.getItem("tenopilot_saved_session"));
      const isGoogleUser = user?.providerData?.some((p) => p.providerId === "google.com");
      const isEmailUnverified = user && !isGoogleUser && !user.emailVerified;

      if (isProtectedPage) {
        // If neither a Firebase token nor a local unlocked PIN session exists
        if (!user && !hasLocalSession) {
          router.push("/login");
        }
      }

      if (isAuthPage && user && !isEmailUnverified) {
        const dest = profile?.role === "master_admin" ? "/home" : `/p/${profile?.assignedPropertyId || "sunshine-pg"}/overview`;
        router.push(dest);
      }
    }
  }, [user, profile, loading, pathname, router]);

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
      localStorage.removeItem("tenopilot_saved_session");
      localStorage.removeItem("tenopilot_active_role");
    }
    setProfile(null);
    setUser(null);
    await signOut(auth);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfileName, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
