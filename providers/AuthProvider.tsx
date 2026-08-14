"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { sanitizeTitleCase } from "@/lib/authService";

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

        const userDocRef = doc(db, "users", currentUser.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            data.organizationId = data.organizationId || orgId;
            if (!isMasterTest && data.assignedPropertyId === "sunshine-pg") {
              data.assignedPropertyId = "";
            }
            if (data.displayName) {
              data.displayName = sanitizeTitleCase(data.displayName);
            }
            setProfile(data);
          } else {
            const rawName = currentUser.displayName || (isMasterTest ? "Ishara Pandey" : "Property Owner");
            const newProf: UserProfile = {
              uid: currentUser.uid,
              email: email,
              displayName: sanitizeTitleCase(rawName),
              organizationId: orgId,
              role: "master_admin",
              assignedPropertyId: isMasterTest ? "sunshine-pg" : "",
              isNewUser: false,
            };
            await setDoc(userDocRef, newProf, { merge: true });
            setProfile(newProf);
          }
        } catch (e) {
          console.warn("Auth profile fetch fallback:", e);
          const fallbackProf: UserProfile = {
            uid: currentUser.uid,
            email: email,
            displayName: isMasterTest ? "Ishara Pandey" : (currentUser.displayName || "Property Owner"),
            organizationId: orgId,
            role: "master_admin",
            assignedPropertyId: isMasterTest ? "sunshine-pg" : "",
          };
          setProfile(fallbackProf);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Strict Access Guard — Protect dashboard routes & enforce Email Verification Gatekeeper
  useEffect(() => {
    if (!loading) {
      const isProtectedPage = pathname?.startsWith("/p/") || pathname === "/home";
      const isAuthPage = pathname === "/login" || pathname === "/signup";

      const isGoogleUser = user?.providerData?.some((p) => p.providerId === "google.com");
      const isEmailUnverified = user && !isGoogleUser && !user.emailVerified;

      if (isProtectedPage) {
        if (!user) {
          router.push("/login");
        } else if (isEmailUnverified) {
          router.push("/signup?verify=true");
        }
      } else if (isAuthPage && user && !isEmailUnverified) {
        router.push("/home");
      }
    }
  }, [user, loading, pathname, router]);

  // Update Profile Name function with Real-time propagation & Title-Case Sanitization
  const updateProfileName = async (newName: string) => {
    if (!user || !newName.trim()) return;
    const cleanName = sanitizeTitleCase(newName);

    const updatedProfile: UserProfile = {
      ...(profile || {
        uid: user.uid,
        email: user.email || "",
        organizationId: `org_${user.uid}`,
        role: "master_admin",
        assignedPropertyId: "",
      }),
      displayName: cleanName,
      isNewUser: false,
    };

    setProfile(updatedProfile);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { displayName: cleanName, isNewUser: false }, { merge: true });
    } catch (e) {
      console.warn("Firestore profile name update fallback:", e);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfileName, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
