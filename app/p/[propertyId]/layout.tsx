"use client";

import React, { use, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { staffStore } from "@/lib/staffStore";
import { portfolioStore } from "@/constants/portfolioStore";
import { ShieldAlert, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PropertyDocData {
  ownerUid?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  organizationId?: string;
  id?: string;
  propertyName?: string;
  name?: string;
}

export default function PropertyRouteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "";
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  // 1. PUBLIC ROUTES EXEMPTION
  // Public tools like Care Desk and Guest Self-KYC must open instantly without login
  const currentPath =
    pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "");

  const isPublicRoute =
    currentPath.includes("/public-complaint") ||
    currentPath.includes("/self-kyc-checkin") ||
    currentPath.includes("/self-onboard");

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(() => (isPublicRoute ? true : null));
  const [checkingAuth, setCheckingAuth] = useState(() => (isPublicRoute ? false : true));
  const [deniedReason, setDeniedReason] = useState<string | null>(null);

  useEffect(() => {
    // If it's a public tool, grant access immediately and purge any stale post-login redirects
    if (isPublicRoute) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("tenopilot_post_login_redirect");
      }
      setIsAuthorized(true);
      setCheckingAuth(false);
      return;
    }

    if (authLoading) return;

    // 2. UNAUTHENTICATED GUARD
    if (!user && !profile) {
      // User is not logged in -> redirect to login
      if (typeof window !== "undefined") {
        const fullPath = window.location.pathname + window.location.search;
        sessionStorage.setItem("tenopilot_post_login_redirect", fullPath);
        router.replace(`/login?redirect=${encodeURIComponent(fullPath)}`);
      }
      setIsAuthorized(false);
      setCheckingAuth(false);
      return;
    }

    // 3. AUTHORIZATION VALIDATION FOR THIS PROPERTY
    const verifyAuthorization = async () => {
      setCheckingAuth(true);

      const userEmail = (user?.email || profile?.email || "").toLowerCase().trim();
      const userPhoneClean = (profile?.phone || "").replace(/\D/g, "").slice(-10);

      // A. Super Admin / Founder Bypass
      const isPlatformFounder =
        userEmail === "rameshdarisi03@gmail.com" ||
        userEmail.endsWith("@tenopilot.founder") ||
        propertyId === "sunshine-pg";

      if (isPlatformFounder) {
        setIsAuthorized(true);
        setCheckingAuth(false);
        return;
      }

      // C. Direct Profile Property Assignment
      const assignedIds = profile?.assignedPropertyIds || (profile?.assignedPropertyId ? [profile.assignedPropertyId] : []);
      if (assignedIds.includes(propertyId) || assignedIds.includes("*")) {
        setIsAuthorized(true);
        setCheckingAuth(false);
        return;
      }

      // D. User Portfolio Store Match
      const portfolioProps = portfolioStore.getProperties();
      if (portfolioProps.some((p) => p.id === propertyId)) {
        setIsAuthorized(true);
        setCheckingAuth(false);
        return;
      }

      // E. Cloud Property Document Owner Verification & Cross-Auth Linking
      try {
        if (db && propertyId) {
          const propSnap = await getDoc(doc(db, "properties", propertyId));
          if (propSnap.exists()) {
            const pData = propSnap.data() as PropertyDocData;
            const pOwnerEmail = (pData.ownerEmail || "").toLowerCase().trim();
            const pOwnerPhone = (pData.ownerPhone || "").replace(/\D/g, "").slice(-10);

            // 1. Direct UID match
            if (pData.ownerUid && user?.uid && pData.ownerUid === user.uid) {
              if (userEmail && !pOwnerEmail) setDoc(propSnap.ref, { ownerEmail: userEmail }, { merge: true }).catch(() => {});
              setIsAuthorized(true);
              setCheckingAuth(false);
              return;
            }

            // 2. Direct Email match
            if (pOwnerEmail && userEmail && pOwnerEmail === userEmail) {
              if (userPhoneClean && !pOwnerPhone) setDoc(propSnap.ref, { ownerPhone: userPhoneClean }, { merge: true }).catch(() => {});
              setIsAuthorized(true);
              setCheckingAuth(false);
              return;
            }

            // 3. Direct Phone match
            if (pOwnerPhone && userPhoneClean && pOwnerPhone === userPhoneClean) {
              if (userEmail && !pOwnerEmail) setDoc(propSnap.ref, { ownerEmail: userEmail }, { merge: true }).catch(() => {});
              setIsAuthorized(true);
              setCheckingAuth(false);
              return;
            }

            // 4. Cross-Auth Matching via linked user docs:
            // Check if current userEmail is linked to a user doc whose phone matches pOwnerPhone
            if (userEmail && pOwnerPhone) {
              try {
                const uSnap = await getDocs(query(collection(db, "users"), where("email", "==", userEmail)));
                for (const uDoc of uSnap.docs) {
                  const uD = uDoc.data();
                  const uCleanPhone = (uD.phone || "").replace(/\D/g, "").slice(-10);
                  if (uCleanPhone === pOwnerPhone || uDoc.id === pData.ownerUid) {
                    setDoc(propSnap.ref, { ownerEmail: userEmail }, { merge: true }).catch(() => {});
                    if (user?.uid) {
                      setDoc(doc(db, "users", user.uid), { assignedPropertyId: propertyId, onboardingCompleted: true }, { merge: true }).catch(() => {});
                    }
                    setIsAuthorized(true);
                    setCheckingAuth(false);
                    return;
                  }
                }
              } catch {}
            }

            // Check if current userPhoneClean is linked to a user doc whose email matches pOwnerEmail
            if (userPhoneClean && pOwnerEmail) {
              try {
                const uSnap2 = await getDocs(query(collection(db, "users"), where("phone", "==", userPhoneClean)));
                for (const uDoc of uSnap2.docs) {
                  const uD = uDoc.data();
                  const uCleanEmail = (uD.email || "").toLowerCase().trim();
                  if (uCleanEmail === pOwnerEmail || uDoc.id === pData.ownerUid) {
                    setDoc(propSnap.ref, { ownerPhone: userPhoneClean }, { merge: true }).catch(() => {});
                    if (user?.uid) {
                      setDoc(doc(db, "users", user.uid), { assignedPropertyId: propertyId, onboardingCompleted: true }, { merge: true }).catch(() => {});
                    }
                    setIsAuthorized(true);
                    setCheckingAuth(false);
                    return;
                  }
                }
              } catch {}
            }

            if (pData.organizationId && profile?.organizationId && pData.organizationId === profile.organizationId) {
              setIsAuthorized(true);
              setCheckingAuth(false);
              return;
            }
          }

          // F. Staff Accounts Match
          const staffMembers = staffStore.getAllGlobalStaff();
          const isStaffAssigned = staffMembers.some((s) => {
            const sEmail = (s.email || "").toLowerCase().trim();
            const sPhone = (s.phone || "").replace(/\D/g, "").slice(-10);
            const matchesUser = sEmail === userEmail || (userPhoneClean && sPhone === userPhoneClean);
            const matchesProp = s.assignedPropertyId === propertyId || (Array.isArray(s.assignedPropertyIds) && s.assignedPropertyIds.includes(propertyId));
            return matchesUser && matchesProp;
          });

          if (isStaffAssigned) {
            setIsAuthorized(true);
            setCheckingAuth(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Property authorization verification notice:", err);
      }

      // 4. ACCESS RESTRICTED - USER DOES NOT OWN OR WORK AT THIS PROPERTY
      setIsAuthorized(false);
      setDeniedReason("You do not have administrative permissions to view or manage this property.");
      setCheckingAuth(false);

      // Auto-redirect to their own workspace or onboarding
      setTimeout(() => {
        if (profile?.onboardingCompleted === true || profile?.assignedPropertyId) {
          router.replace(profile?.assignedPropertyId ? `/p/${profile.assignedPropertyId}/overview` : "/home");
        } else {
          router.replace("/welcome");
        }
      }, 2500);
    };

    verifyAuthorization();
  }, [propertyId, pathname, user, profile, authLoading, isPublicRoute, router]);

  // For public resident routes, render directly without any blocking layout
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Loading state while checking property access rights
  if (checkingAuth || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff8f6]">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white border border-[#d7c2b9] shadow-sm max-w-sm text-center">
          <Loader2 className="w-8 h-8 text-[#964407] animate-spin" />
          <h3 className="font-serif font-bold text-base text-gray-900">
            Verifying Property Security Credentials
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ensuring your account is authorized to access building operations...
          </p>
        </div>
      </div>
    );
  }

  // Access Denied Barrier - Prevents any data leak to non-owners or tenants
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff8f6] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 p-8 shadow-xl text-center space-y-4 animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-serif font-bold text-xl text-gray-900">
              Access Restricted
            </h2>
            <p className="text-xs text-rose-700 font-semibold">
              Unauthorized Property Workspace
            </p>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            {deniedReason ||
              "Your account is not registered as the owner or authorized staff of this property. You cannot view or modify these property records."}
          </p>

          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-[11px] text-gray-500 font-mono">
            Property ID: {propertyId}
          </div>

          <div className="pt-2">
            <Link
              href={profile?.onboardingCompleted ? "/home" : "/welcome"}
              className="w-full py-3 px-4 rounded-xl bg-[#964407] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#7a3705] transition-colors"
            >
              <span>Return to My Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
