"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Bell,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  User,
  Users,
  LogOut,
  LayoutDashboard,
  FileText,
  Settings,
  Sparkles,
  MapPin,
  Verified,
  X,
  Key,
  Lock,
  MessageSquare,
  Upload,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { occupantStore } from "@/constants/mockOccupants";
import { calculateOccupantFinancialStatement } from "@/utils/domainSSOT";
import { PWAInstallBanner } from "@/components/pwa/PWAInstallBanner";
import { DigitRollingOdometer } from "@/components/motion/DigitRollingOdometer";
import { propertySettingsStore } from "@/constants/propertySettings";
import { initializeCleanProperty } from "@/lib/accountInitializer";
import { useAuth } from "@/providers/AuthProvider";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { staffStore, UserRole } from "@/lib/staffStore";
import { getMaxAllowedProperties, MULTI_PROPERTY_MONTHLY_PRICE } from "@/lib/subscriptionEngine";
import { compressPaymentScreenshot } from "@/lib/imageCompression";

import { portfolioStore, PortfolioProperty } from "@/constants/portfolioStore";

export default function HomeWorkspacePage() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [properties, setProperties] = useState<PortfolioProperty[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = portfolioStore.getProperties();
        if (cached && cached.length > 0) {
          return cached.filter((p) => p.id !== "sunshine-pg" && p.id !== "main-executive-pg");
        }
        const s = localStorage.getItem("tenopilot_saved_session");
        if (s) {
          const parsed = JSON.parse(s);
          if (parsed?.propertyName) {
            return [
              {
                id: parsed.propertyId || "prop-activated",
                name: parsed.propertyName,
                location: "Bengaluru, Karnataka",
                bedsCount: 80,
                occupancyRate: "0.0%",
                collectionRate: "0%",
                status: "HEALTHY",
                createdAt: new Date().toISOString(),
                ownerEmail: parsed.email || "",
              },
            ];
          }
        }
      } catch {}
    }
    return [];
  });
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>("master_admin");

  // New property form state
  const [newPropName, setNewPropName] = useState("");
  const [newPropLocation, setNewPropLocation] = useState("");
  const [newPropBeds, setNewPropBeds] = useState(30);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-Property Gating State
  const [showMultiPropertyModal, setShowMultiPropertyModal] = useState(false);
  const [multiPropertyScreenshot, setMultiPropertyScreenshot] = useState<string | null>(null);
  const [multiPropertyFileName, setMultiPropertyFileName] = useState<string | null>(null);
  const [isCompressingProof, setIsCompressingProof] = useState(false);
  const [isSubmittingMultiProperty, setIsSubmittingMultiProperty] = useState(false);
  const [multiPropertySuccess, setMultiPropertySuccess] = useState(false);
  const [multiPropertyError, setMultiPropertyError] = useState<string | null>(null);

  const maxAllowedProperties = getMaxAllowedProperties(profile);
  const isMultiPropertyGated = properties.length >= maxAllowedProperties;

  const handleProofFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingProof(true);
    setMultiPropertyError(null);
    try {
      setMultiPropertyFileName(file.name);
      const result = await compressPaymentScreenshot(file);
      setMultiPropertyScreenshot(result.base64);
    } catch (err) {
      setMultiPropertyError("Failed to process screenshot. Please try another image.");
    } finally {
      setIsCompressingProof(false);
    }
  };

  const handleMultiPropertyProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!multiPropertyScreenshot) {
      setMultiPropertyError("Please upload your UPI payment screenshot proof.");
      return;
    }
    setMultiPropertyError(null);
    setIsSubmittingMultiProperty(true);

    try {
      const res = await fetch("/api/subscription/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.uid,
          customerEmail: profile?.email || "",
          customerName: profile?.displayName || "Property Owner",
          customerPhone: profile?.phone || "",
          propertyName: properties[0]?.name || "Main Branch",
          plan: "MULTI_PROPERTY_MONTHLY",
          amount: MULTI_PROPERTY_MONTHLY_PRICE,
          paymentMode: "UPI",
          screenshotData: multiPropertyScreenshot,
          notes: `Multi-Property Expansion Request (Adding Building #${properties.length + 1})`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMultiPropertySuccess(true);
        triggerToast("✓ Payment proof submitted! Founder will approve your building slot shortly.");
      } else {
        setMultiPropertyError(data.message || "Failed to submit request.");
      }
    } catch (err: any) {
      setMultiPropertyError("Failed to submit payment proof. Please try again.");
    } finally {
      setIsSubmittingMultiProperty(false);
    }
  };

  // 3D Parallax Mouse Tracking & Radial Glass Spotlight Handler
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    card.style.setProperty("--mx", `${(x / r.width) * 100}%`);
    card.style.setProperty("--my", `${(y / r.height) * 100}%`);

    const rotateY = ((x / r.width) - 0.5) * 10;
    const rotateX = ((y / r.height) - 0.5) * -10;

    card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015)`;
    card.style.boxShadow = "0 24px 44px -14px rgba(36,27,22,0.4)";
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = "";
    card.style.boxShadow = "";
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to compute 100% LIVE real-time metrics for Sunshine Luxury PG
  const computeLiveSunshineMetrics = (): PortfolioProperty => {
    const structure = propertyStore.getStructure();
    let totalBeds = 0;
    structure.forEach((f) => {
      f.rooms.forEach((r) => {
        totalBeds += r.beds.length;
      });
    });

    const occupants = occupantStore.getOccupants("sunshine-pg");
    const activeOccupants = occupants.filter((o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice");
    const occupiedCount = activeOccupants.length;
    const occRateNum = totalBeds > 0 ? (occupiedCount / totalBeds) * 100 : 0;
    const occRate = occRateNum.toFixed(1) + "%";

    const propSettings = propertySettingsStore.getSettings("sunshine-pg");
    let expectedTotal = 0;
    let paidTotal = 0;
    occupants.forEach((occ) => {
      const stmt = calculateOccupantFinancialStatement(occ, propSettings);
      expectedTotal += stmt.totalGrossDue;
      paidTotal += stmt.totalPaid;
    });

    const collRateNum = expectedTotal > 0 ? Math.min(100, Math.round((paidTotal / expectedTotal) * 100)) : 0;
    const collRate = collRateNum + "%";

    return {
      id: "sunshine-pg",
      name: "Sunshine Luxury PG",
      location: "Koramangala, Bengaluru",
      bedsCount: totalBeds || 120,
      occupancyRate: occRate,
      collectionRate: collRate,
      status: "HEALTHY",
    };
  };

  useEffect(() => {
    let savedSessionData: any = null;
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem("tenopilot_saved_session");
        if (s) savedSessionData = JSON.parse(s);
      } catch {}
    }

    const email = profile?.email?.toLowerCase() || savedSessionData?.email?.toLowerCase() || "";
    const isMasterAccount = email === "isharapandey01@gmail.com";
    const role = staffStore.getActiveRole() || savedSessionData?.role || "master_admin";
    setActiveRole(role);
    const isMasterAdminRole = role === "master_admin";

    // 🔒 STRICT RBAC GUARD 1: Receptionists are NEVER allowed on the multi-building portfolio page!
    if (role === "receptionist") {
      const allStaff = staffStore.getAllGlobalStaff();
      const match = allStaff.find((s) => s.email.toLowerCase() === email);
      const targetProperty = match?.assignedPropertyId || profile?.assignedPropertyId || savedSessionData?.propertyId || "sunshine-pg";
      router.replace(`/p/${targetProperty}/overview`);
      return;
    }

    // Initialize Real-Time Cloud Firestore Sync
    portfolioStore.initFirebaseListener(email);
    propertyStore.initFirebaseListener("sunshine-pg");

    const syncAndRefreshProperties = () => {
      let customProps = portfolioStore.getProperties();

      // Filter out demo Sunshine PG and dummy Main Executive PG for non-master real client accounts
      if (!isMasterAccount) {
        customProps = customProps.filter(
          (p) =>
            p.id !== "sunshine-pg" &&
            p.id !== "main-executive-pg" &&
            p.name !== "Sunshine Heights PG" &&
            p.name !== "Sunshine Luxury PG"
        );
      }

      // If newly registered tenant owner has NO properties yet, route them to 2-step onboarding wizard
      if (!isMasterAccount && customProps.length === 0 && isMasterAdminRole) {
        if (profile?.onboardingCompleted !== true) {
          router.replace("/welcome");
          return;
        }
      }

      // 🔒 STRICT RBAC GUARD 2: Property Admins only see their explicitly assigned buildings
      if (role === "admin") {
        const allStaff = staffStore.getAllGlobalStaff();
        const match = allStaff.find((s) => s.email.toLowerCase() === email);
        const assignedIds =
          match?.assignedPropertyIds ||
          (match?.assignedPropertyId ? [match.assignedPropertyId] : []) ||
          (profile?.assignedPropertyId ? [profile.assignedPropertyId] : []);

        if (assignedIds.length > 0 && !assignedIds.includes("*")) {
          customProps = customProps.filter((p) => assignedIds.includes(p.id));
        }
      }

      // Compute live real-time metrics ONLY for master platform demo account
      if (isMasterAccount) {
        const liveSunshine = computeLiveSunshineMetrics();
        const customWithoutSunshine = customProps.filter((p) => p.id !== "sunshine-pg");
        setProperties([liveSunshine, ...customWithoutSunshine]);
      } else {
        // Real customer account -> show ONLY their actual properties!
        setProperties(customProps);
      }
    };

    // Initial load
    syncAndRefreshProperties();

    // Reactive subscriptions
    const unsubPortfolio = portfolioStore.subscribe(syncAndRefreshProperties);

    const unsubProperty = propertyStore.subscribe(() => {
      if (isMasterAccount) {
        const updatedLive = computeLiveSunshineMetrics();
        setProperties((prev) => [updatedLive, ...prev.filter((p) => p.id !== "sunshine-pg")]);
      }
    });

    const unsubOccupant = occupantStore.subscribe(() => {
      if (isMasterAccount) {
        const updatedLive = computeLiveSunshineMetrics();
        setProperties((prev) => [updatedLive, ...prev.filter((p) => p.id !== "sunshine-pg")]);
      }
    });

    const unsubSettings = propertySettingsStore.subscribe(() => {
      if (isMasterAccount) {
        const updatedLive = computeLiveSunshineMetrics();
        setProperties((prev) => [updatedLive, ...prev.filter((p) => p.id !== "sunshine-pg")]);
      }
    });

    return () => {
      unsubPortfolio();
      unsubProperty();
      unsubOccupant();
      unsubSettings();
    };
  }, [profile, router]);

  // 🔒 Strict Zero-Leak Gate: If receptionist, block rendering of all building cards and redirect immediately
  const localSaved = typeof window !== "undefined" ? localStorage.getItem("tenopilot_saved_session") : null;
  let localRole = "master_admin";
  let localProp = "sunshine-pg";
  if (localSaved) {
    try {
      const p = JSON.parse(localSaved);
      if (p.role) localRole = p.role;
      if (p.assignedPropertyId) localProp = p.assignedPropertyId;
    } catch {}
  }
  const isReceptionist = activeRole === "receptionist" || localRole === "receptionist" || profile?.role === "receptionist";

  if (isReceptionist) {
    return (
      <div className="min-h-screen bg-[#fff8f6] flex items-center justify-center">
        <div className="w-11 h-11 rounded-2xl bg-[#c2652a] text-white font-serif font-bold text-xl flex items-center justify-center animate-pulse shadow-md">
          T
        </div>
      </div>
    );
  }

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim()) return;

    // 🔒 Master Controls Multi-Property Enforcement
    if (isMultiPropertyGated) {
      setShowAddPropertyModal(false);
      setMultiPropertySuccess(false);
      setMultiPropertyError(null);
      setMultiPropertyScreenshot(null);
      setMultiPropertyFileName(null);
      setShowMultiPropertyModal(true);
      triggerToast(`⚠️ Building limit reached (${properties.length}/${maxAllowedProperties}). Upgrade to add more buildings.`);
      return;
    }

    const slugId = newPropName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newBuilding: PortfolioProperty = {
      id: slugId || `prop-${Date.now()}`,
      name: newPropName.trim(),
      location: newPropLocation.trim() || "Hyderabad, Telangana",
      bedsCount: Number(newPropBeds) || 0,
      occupancyRate: "0.0%",
      collectionRate: "0%",
      status: "HEALTHY",
      createdAt: new Date().toISOString(),
      ownerEmail: profile?.email || "isharapandey01@gmail.com",
    };

    await initializeCleanProperty(newBuilding.id, newBuilding.name, profile?.displayName || userDisplayName);
    await portfolioStore.addProperty(newBuilding, profile?.email);

    setShowAddPropertyModal(false);
    setNewPropName("");
    setNewPropLocation("");
    setNewPropBeds(30);

    triggerToast(`✓ Successfully onboarded "${newBuilding.name}"! Synced to cloud 🟢`);
  };

  // Dynamic Time-Aware Greeting
  const currentHour = new Date().getHours();
  let greetingText = "Good morning";
  if (currentHour >= 12 && currentHour < 17) greetingText = "Good afternoon";
  else if (currentHour >= 17 && currentHour < 22) greetingText = "Good evening";
  else if (currentHour >= 22 || currentHour < 5) greetingText = "Good night";

  const userDisplayName =
    profile?.displayName ||
    (typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}")?.name
      : "") ||
    (activeRole === "master_admin" ? "Master Admin" : "Property Admin");

  const userInitials = userDisplayName
    .split(" ")
    .map((n: string) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || (activeRole === "master_admin" ? "MA" : "PA");

  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#201a17] flex flex-col justify-between selection:bg-[#964407] selection:text-white pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#201a17] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#964407]/40 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#fff8f6]/90 backdrop-blur-md border-b border-[#d7c2b9]/40 px-4 sm:px-8 py-3.5 select-none">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-3 group">
            <TenoPilotLogo size="sm" />
          </Link>

          {/* User Profile & Staff Management Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Staff Management Link */}
            <Link
              href="/staff-management"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#d7c2b9] hover:bg-[#f8ede3] hover:border-[#964407] text-[#201a17] font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#964407]" />
              <span className="hidden sm:inline">Staff Management 👥</span>
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#f8ede3] transition-all active:scale-95 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-[#964407] text-white font-bold flex items-center justify-center text-xs sm:text-sm border-2 border-[#964407]/20 shadow-sm">
                  {userInitials}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#201a17]">{userDisplayName}</span>
                  <span className="text-[10px] text-[#554339] uppercase font-bold tracking-wider">
                    {activeRole === "master_admin" ? "Master Admin 👑" : activeRole === "admin" ? "Property Admin 🏢" : "Receptionist 🔑"}
                  </span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#d7c2b9] shadow-xl py-2 z-50 text-xs font-medium text-[#201a17]">
                  <div className="px-4 py-2 border-b border-[#f8ede3]">
                    <p className="font-bold text-sm">{userDisplayName}</p>
                    <p className="text-xs text-[#554339]">{profile?.email || (activeRole === "master_admin" ? "admin@tenopilot.com" : "staff@tenopilot.com")}</p>
                    <span className={`inline-block mt-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                      activeRole === "master_admin"
                        ? "bg-purple-100 text-purple-800 border-purple-200"
                        : activeRole === "admin"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}>
                      {activeRole === "master_admin" ? "MASTER ADMIN 👑" : activeRole === "admin" ? "PROPERTY ADMIN 🏢" : "RECEPTIONIST 🔑"}
                    </span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="w-full text-left flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-[#ba1a1a] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 w-full">
        {/* Welcome Headline */}
        <div className="mb-8 sm:mb-10 text-left">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#201a17]">
            {greetingText},{" "}
            <span className="text-[#964407]">
              {userDisplayName.split(" ")[0]}
            </span>
            .
          </h1>
          <p className="font-serif italic text-2xl sm:text-3xl text-[#554339] mt-1 font-normal opacity-90">
            {activeRole === "master_admin"
              ? "Your organization portfolio is calling."
              : "Your assigned property portfolio is ready."}
          </p>
          <p className="text-xs sm:text-sm text-[#554339] mt-2 font-medium">
            {properties.length} {properties.length === 1 ? "property" : "properties"} active in your{" "}
            {activeRole === "master_admin" ? "organization" : "assigned portfolio"}. Tap a building card below to launch its operational dashboard.
          </p>
        </div>

        {/* 3D Property Cards Grid */}
        {properties.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-3xl border border-dashed border-[#d7c2b9] p-8">
            <Building2 className="w-12 h-12 text-[#964407] mx-auto mb-3 opacity-60" />
            <h3 className="font-serif font-bold text-lg text-[#201a17]">No Properties Yet</h3>
            <p className="text-xs text-[#554339] mt-1 mb-4">Click below to onboard your first PG or Hostel.</p>
            {activeRole === "master_admin" && (
              <button
                onClick={() => setShowAddPropertyModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs shadow-md"
              >
                + Add First Property
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {properties.map((prop, idx) => (
              <div
                key={prop.id}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="relative rounded-3xl p-6 sm:p-7 transition-all duration-300 group overflow-hidden border border-white/10 text-white cursor-pointer select-none"
                style={{
                  background: idx % 2 === 0
                    ? "linear-gradient(135deg, #241b16 0%, #17110e 100%)"
                    : "linear-gradient(135deg, #1f1713 0%, #140e0b 100%)",
                }}
              >
                {/* Radial Glow Spotlight */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl"
                  style={{
                    background: "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(232, 161, 92, 0.15) 0%, transparent 60%)",
                  }}
                />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                      ✓ {prop.status}
                    </span>
                    <span className="text-xs font-bold text-[#b7ab9f]">
                      {prop.bedsCount} BEDS
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif font-bold text-2xl text-white tracking-tight group-hover:text-[#e8a15c] transition-colors line-clamp-1">
                      {prop.name}
                    </h3>
                    <p className="text-xs text-[#b7ab9f] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#e8a15c]" /> {prop.location}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-left">
                    <div>
                      <p className="text-[#9a8e82] text-[10px] font-bold uppercase tracking-widest">
                        Occupancy
                      </p>
                      <p className="font-serif text-xl font-bold text-[#e8a15c]">
                        <DigitRollingOdometer value={parseFloat(prop.occupancyRate)} suffix="%" decimals={1} />
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#9a8e82] text-[10px] font-bold uppercase tracking-widest">
                        Rent Collection
                      </p>
                      <p className="font-serif text-xl font-bold text-[#5fe3a0]">
                        <DigitRollingOdometer value={parseFloat(prop.collectionRate)} suffix="%" decimals={0} />
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/p/${prop.id}/overview`}
                    className="w-full py-3.5 px-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white font-bold text-xs transition-all flex items-center justify-between gap-1.5 active:scale-95 shadow-sm group-hover:translate-x-1"
                  >
                    <span>View Dashboard</span> <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}

            {/* Add New Property Card Trigger (Master Admin Only) */}
            {activeRole === "master_admin" && (
              <button
                onClick={() => {
                  if (isMultiPropertyGated) {
                    setMultiPropertySuccess(false);
                    setMultiPropertyError(null);
                    setMultiPropertyScreenshot(null);
                    setMultiPropertyFileName(null);
                    setShowMultiPropertyModal(true);
                  } else {
                    setShowAddPropertyModal(true);
                  }
                }}
                className="group relative border-2 border-dashed border-[#241b16]/25 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[340px] hover:border-[#c6572a]/60 hover:bg-[#f1e7dd]/40 transition-all text-center active:scale-98 cursor-pointer shadow-xs hover:shadow-xl overflow-hidden"
              >
                {isMultiPropertyGated && (
                  <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold shadow-xs">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>Multi-Property Add-on</span>
                  </div>
                )}

                <div className="w-14 h-14 bg-[#f1e7dd] rounded-full flex items-center justify-center mb-4 text-[#241b16] group-hover:bg-[#c6572a]/15 group-hover:text-[#c6572a] transition-all transform group-hover:rotate-90 duration-300 shadow-xs">
                  {isMultiPropertyGated ? <Lock className="w-6 h-6 text-[#964407]" /> : <Plus className="w-7 h-7" />}
                </div>
                <span className="font-serif font-bold text-xl text-[#241b16] group-hover:text-[#c6572a] transition-colors">
                  Add New Property
                </span>
                <p className="text-xs text-[#8a7f74] mt-1">
                  {isMultiPropertyGated
                    ? `Expand your portfolio (₹${MULTI_PROPERTY_MONTHLY_PRICE}/mo)`
                    : "Expand your PG or Hostel portfolio"}
                </p>
              </button>
            )}
          </div>
        )}
      </main>

      {/* 🏢 ADD NEW PROPERTY MODAL */}
      {showAddPropertyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddPropertyModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-[#d7c2b9] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 text-xs text-[#201a17]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f8ede3] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#f8ede3] text-[#964407]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#201a17]">
                    Onboard New Building
                  </h3>
                  <p className="text-[11px] text-[#554339] font-medium">
                    Expand your PG / Hostel portfolio
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPropertyModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1">
                  Building / Property Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meridian Men's Executive PG"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-medium text-xs bg-[#fff8f6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1">
                  Location / Area *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gachibowli, Hyderabad"
                  value={newPropLocation}
                  onChange={(e) => setNewPropLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-medium text-xs bg-[#fff8f6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1">
                  Initial Bed Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={newPropBeds}
                  onChange={(e) => setNewPropBeds(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-medium text-xs bg-[#fff8f6]"
                />
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-[10px] text-orange-950 font-medium leading-relaxed">
                💡 <strong>Dynamic Routing:</strong> Adding this building creates a dedicated multi-tenant URL (`/p/${newPropName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/overview`) with its own isolated layout and financial ledger.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f8ede3]">
                <button
                  type="button"
                  onClick={() => setShowAddPropertyModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold shadow-md cursor-pointer"
                >
                  Onboard Building
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔒 MULTI-PROPERTY EXPANSION MODAL */}
      {showMultiPropertyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto"
          onClick={() => setShowMultiPropertyModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-[#d7c2b9] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 text-xs text-[#201a17] my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f8ede3] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Portfolio Expansion
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-[#201a17]">
                    Unlock Multi-Property Add-on
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMultiPropertyModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Limit notice */}
            <div className="p-3.5 rounded-2xl bg-[#fff8f6] border border-[#eedad0] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#554339]">Current Portfolio Limit</p>
                <p className="text-xs text-[#8a7f74]">
                  You have onboarded <span className="font-bold text-[#201a17]">{properties.length}</span> of{" "}
                  <span className="font-bold text-[#201a17]">{maxAllowedProperties}</span> allowed buildings.
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-[#964407]">
                  ₹{MULTI_PROPERTY_MONTHLY_PRICE}
                </span>
                <span className="text-[10px] text-[#8a7f74] block">/mo per building</span>
              </div>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-2 text-[11px] text-[#554339]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#201a17]">Centralized Founder Hub:</strong> Instant 1-click switching across all branches with aggregate dashboard metrics.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#201a17]">Segregated Staff Security:</strong> Assign branch managers and wardens strictly to their assigned property without cross-contamination.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#201a17]">Isolated Dual-Ledgers:</strong> Independent rent books, security deposit vaults, and vendor expense tracking.
                </span>
              </div>
            </div>

            {multiPropertySuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-emerald-950">Payment Proof Submitted!</h4>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Our founding team will verify your UPI transaction and unlock your additional building slot within 15–30 minutes. You will be able to onboard your new building immediately.
                </p>
                <button
                  onClick={() => setShowMultiPropertyModal(false)}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleMultiPropertyProofSubmit} className="space-y-4 pt-1">
                {/* UPI Payment Instructions Box */}
                <div className="p-4 rounded-2xl bg-[#f8ede3]/70 border border-[#d7c2b9] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#964407]">
                      Direct Founder UPI Transfer
                    </span>
                    <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-[#d7c2b9]">
                      ₹{MULTI_PROPERTY_MONTHLY_PRICE}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-[#eedad0] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#8a7f74]">Official UPI VPA</p>
                      <p className="font-mono font-bold text-xs text-[#201a17]">rameshdarisi01@ybl</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("rameshdarisi01@ybl");
                        triggerToast("UPI ID copied to clipboard!");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#f8ede3] hover:bg-[#eedad0] text-[#964407] text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Copy VPA
                    </button>
                  </div>
                  <p className="text-[10px] text-[#8a7f74]">
                    Pay using PhonePe, Google Pay, Paytm, or BHIM, then upload your transaction screenshot below.
                  </p>
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1.5">
                    Upload UPI Transaction Screenshot *
                  </label>
                  <label className="border-2 border-dashed border-[#d7c2b9] hover:border-[#964407] bg-[#fff8f6] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofFileUpload}
                      className="hidden"
                      disabled={isCompressingProof || isSubmittingMultiProperty}
                    />
                    {isCompressingProof ? (
                      <div className="flex items-center gap-2 text-xs text-[#964407]">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Optimizing image for fast verification...</span>
                      </div>
                    ) : multiPropertyScreenshot ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="truncate max-w-[240px]">
                          {multiPropertyFileName || "Screenshot Attached"}
                        </span>
                        <span className="text-[10px] text-gray-500 underline ml-1">Change</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <Upload className="w-5 h-5 text-[#964407] mb-1" />
                        <span className="font-bold text-xs text-[#201a17]">
                          Click to upload payment proof
                        </span>
                        <span className="text-[10px] text-[#8a7f74]">
                          JPG, PNG, or screenshot from your UPI app
                        </span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Direct WhatsApp Founder Link */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                      Direct Founder WhatsApp
                    </span>
                    <p className="font-mono font-bold text-sm text-emerald-950 mt-0.5">
                      +91 92066 51295
                    </p>
                  </div>
                  <a
                    href="https://wa.me/919206651295?text=Hi%20Ramesh%2C%20I%20want%20to%20unlock%20a%20Multi-Property%20slot%20for%20my%20PG%20account."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                {multiPropertyError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{multiPropertyError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-[#f8ede3]">
                  <button
                    type="button"
                    onClick={() => setShowMultiPropertyModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!multiPropertyScreenshot || isCompressingProof || isSubmittingMultiProperty}
                    className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] disabled:opacity-50 text-white font-bold shadow-md cursor-pointer flex items-center gap-2"
                  >
                    {isSubmittingMultiProperty ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting Proof...</span>
                      </>
                    ) : (
                      <span>Submit Payment Proof</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-[#d7c2b9]/40 text-center text-xs text-[#554339]">
        © 2026 TenoPilot Inc. Single Source of Truth for Property Management.
      </footer>
    </div>
  );
}
