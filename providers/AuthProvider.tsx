"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { sanitizeTitleCase } from "@/lib/authService";
import { Sparkles, UserCheck } from "lucide-react";

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
  const [showNameModal, setShowNameModal] = useState(false);
  const [inputName, setInputName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

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
            if (data.isNewUser || !data.displayName || data.displayName === "Property Owner") {
              setShowNameModal(true);
            }
          } else {
            const newProf: UserProfile = {
              uid: currentUser.uid,
              email: email,
              displayName: isMasterTest ? "Ishara Pandey" : "Property Owner",
              organizationId: orgId,
              role: "master_admin",
              assignedPropertyId: isMasterTest ? "sunshine-pg" : "",
              isNewUser: true,
            };
            await setDoc(userDocRef, newProf, { merge: true });
            setProfile(newProf);
            setShowNameModal(true);
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

  // Strict Access Guard — Protect dashboard routes
  useEffect(() => {
    if (!loading) {
      const isProtectedPage = pathname?.startsWith("/p/") || pathname === "/home";
      if (isProtectedPage && !user) {
        router.push("/login");
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

  const handleNameModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    setIsSavingName(true);
    await updateProfileName(inputName);
    setIsSavingName(false);
    setShowNameModal(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfileName, logout }}>
      {children}

      {/* NEW CUSTOMER NAME ONBOARDING MODAL */}
      {showNameModal && user && (
        <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-amber-200 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f8ede3] text-[#964407] flex items-center justify-center mx-auto border border-[#d7c2b9]">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <h2 className="font-serif font-bold text-2xl text-gray-900">
                Welcome to TenoPilot!
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Please enter your Full Name to personalize your workspace & dashboard.
              </p>
            </div>

            <form onSubmit={handleNameModalSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ishara Pandey"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#964407] font-semibold text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingName}
                className="w-full py-3.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSavingName ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" /> Save & Enter Dashboard
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
