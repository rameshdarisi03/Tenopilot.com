"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Building2,
  ChevronsUpDown,
  Check,
  Plus,
  Compass,
  Lock,
  Layers,
  MapPin,
  Search,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { staffStore, UserRole } from "@/lib/staffStore";
import { portfolioStore, PortfolioProperty } from "@/constants/portfolioStore";
import { doc, getDoc, onSnapshot, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PropertySwitcherProps {
  currentPropertyId: string;
  onOpenAddProperty?: () => void;
  onCloseMobile?: () => void;
  className?: string;
}

export function PropertySwitcher({
  currentPropertyId,
  onOpenAddProperty,
  onCloseMobile,
  className = "",
}: PropertySwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, user } = useAuth();

  const [activeRole, setActiveRole] = useState<UserRole>(() => staffStore.getActiveRole());
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [properties, setProperties] = useState<PortfolioProperty[]>(() => portfolioStore.getProperties());
  const [staffAssignedIds, setStaffAssignedIds] = useState<string[]>(() => {
    return Array.isArray(profile?.assignedPropertyIds) && profile.assignedPropertyIds.length > 0
      ? profile.assignedPropertyIds
      : [profile?.assignedPropertyId || currentPropertyId].filter(Boolean);
  });
  const [extraResolvedProps, setExtraResolvedProps] = useState<Map<string, PortfolioProperty>>(new Map());

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Sync Active Role
  useEffect(() => {
    const unsub = staffStore.subscribe(() => {
      setActiveRole(staffStore.getActiveRole());
    });
    return unsub;
  }, []);

  // 2. Initialize and Sync Organization Portfolio Properties
  useEffect(() => {
    const targetEmail = profile?.ownerEmail || profile?.email || user?.email;
    if (targetEmail) {
      portfolioStore.initFirebaseListener(targetEmail);
    }

    const unsub = portfolioStore.subscribe(() => {
      setProperties([...portfolioStore.getProperties()]);
    });

    setProperties([...portfolioStore.getProperties()]);
    return unsub;
  }, [profile?.ownerEmail, profile?.email, user?.email]);

  // 3. Real-Time RBAC & Staff Account Listener (Instant reactive updates on Master Admin changes)
  useEffect(() => {
    const cleanEmail = (profile?.email || user?.email || "").toLowerCase().trim();
    if (!cleanEmail) return;

    try {
      const staffRef = doc(db, "staff_accounts", cleanEmail);
      const unsub = onSnapshot(
        staffRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const liveRole: UserRole = (data.role as UserRole) || activeRole;
            const liveAssigned: string[] = Array.isArray(data.assignedPropertyIds) && data.assignedPropertyIds.length > 0
              ? data.assignedPropertyIds
              : [data.assignedPropertyId || currentPropertyId].filter(Boolean);

            setStaffAssignedIds(liveAssigned);
            if (liveRole !== activeRole) {
              staffStore.setActiveRole(liveRole);
              setActiveRole(liveRole);
            }
          }
        },
        (err) => console.warn("PropertySwitcher staff onSnapshot notice:", err)
      );

      return () => unsub();
    } catch (e) {
      console.warn("Notice subscribing to staff_accounts in PropertySwitcher:", e);
    }
  }, [profile?.email, user?.email, activeRole, currentPropertyId]);

  // 4. Resolve missing assigned properties directly from Firestore if not in portfolioStore
  useEffect(() => {
    const idsToResolve = staffAssignedIds.filter(
      (id) => id !== "*" && !properties.some((p) => p.id === id) && !extraResolvedProps.has(id)
    );

    if (idsToResolve.length === 0) return;

    (async () => {
      const newMap = new Map(extraResolvedProps);
      for (const id of idsToResolve) {
        try {
          const propDoc = await getDoc(doc(db, "properties", id));
          if (propDoc.exists()) {
            const d = propDoc.data();
            newMap.set(id, {
              id: id,
              name: d.name || d.propertyName || d.title || id,
              location: d.city || d.address || "Bengaluru",
              bedsCount: d.totalBeds || 40,
              occupancyRate: "100%",
              collectionRate: "100%",
              status: "HEALTHY",
            });
          } else {
            const pPropDoc = await getDoc(doc(db, "portfolio_properties", id));
            if (pPropDoc.exists()) {
              const d = pPropDoc.data();
              newMap.set(id, {
                id: id,
                name: d.name || d.propertyName || d.title || id,
                location: d.city || d.address || "Bengaluru",
                bedsCount: d.totalBeds || 40,
                occupancyRate: "100%",
                collectionRate: "100%",
                status: "HEALTHY",
              });
            }
          }
        } catch (e) {
          console.warn("Notice resolving property doc:", id, e);
        }
      }
      setExtraResolvedProps(newMap);
    })();
  }, [staffAssignedIds, properties, extraResolvedProps]);

  // 5. Close Dropdown on Outside Click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 6. Compute Accessible Properties based on RBAC Rules
  const allKnownProperties: PortfolioProperty[] = [...properties];
  extraResolvedProps.forEach((prop, id) => {
    if (!allKnownProperties.some((p) => p.id === id)) {
      allKnownProperties.push(prop);
    }
  });

  let accessibleProperties: PortfolioProperty[] = [];

  if (activeRole === "master_admin") {
    accessibleProperties = allKnownProperties;
  } else if (activeRole === "admin") {
    // Property Admin: restricted to explicitly assigned buildings
    if (staffAssignedIds.includes("*")) {
      accessibleProperties = allKnownProperties;
    } else {
      accessibleProperties = allKnownProperties.filter((p) => staffAssignedIds.includes(p.id));
    }
  } else {
    // Receptionist: strictly locked to primary assigned building
    const singleId = profile?.assignedPropertyId || currentPropertyId;
    accessibleProperties = allKnownProperties.filter((p) => p.id === singleId);
  }

  // Fallback: If accessible list is empty, synthesize currently active building
  if (accessibleProperties.length === 0 && currentPropertyId) {
    const fallbackName = profile?.propertyName || (currentPropertyId.includes("nomad") ? "Nomad Coliving" : "Ramesh Residencies");
    accessibleProperties = [
      {
        id: currentPropertyId,
        name: fallbackName,
        location: "Bengaluru",
        bedsCount: 40,
        occupancyRate: "100%",
        collectionRate: "100%",
        status: "HEALTHY",
      },
    ];
  }

  // 7. Dynamic RBAC Guard: If staff member's active property was revoked by Master Admin, auto-navigate
  useEffect(() => {
    if (activeRole !== "master_admin" && accessibleProperties.length > 0 && currentPropertyId) {
      const isAllowed = accessibleProperties.some((p) => p.id === currentPropertyId);
      if (!isAllowed) {
        const nextAllowed = accessibleProperties[0];
        console.warn(`[RBAC] Access to ${currentPropertyId} revoked. Auto-redirecting to ${nextAllowed.id}`);
        router.push(`/p/${nextAllowed.id}/overview`);
      }
    }
  }, [accessibleProperties, currentPropertyId, activeRole, router]);

  // Find currently active property details
  const activeProperty =
    accessibleProperties.find((p) => p.id === currentPropertyId) ||
    allKnownProperties.find((p) => p.id === currentPropertyId) ||
    accessibleProperties[0] ||
    null;

  const activeName = activeProperty?.name || (currentPropertyId.includes("nomad") ? "Nomad Coliving" : "Ramesh Residencies");
  const canSwitch = accessibleProperties.length > 1;

  // Filter properties in dropdown search
  const filteredProperties = accessibleProperties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectProperty = (targetPropId: string) => {
    if (targetPropId === currentPropertyId) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    if (onCloseMobile) onCloseMobile();

    // Preserve the current subpath when switching properties
    // e.g. /p/prop-1/tenants -> /p/prop-2/tenants
    if (pathname && pathname.startsWith(`/p/${currentPropertyId}`)) {
      const subpath = pathname.replace(`/p/${currentPropertyId}`, "");
      // Guard against receptionist or restricted views
      if (activeRole === "receptionist" && (subpath.includes("staff") || subpath.includes("settings") || subpath.includes("reports"))) {
        router.push(`/p/${targetPropId}/overview`);
      } else {
        router.push(`/p/${targetPropId}${subpath || "/overview"}`);
      }
    } else {
      router.push(`/p/${targetPropId}/overview`);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (canSwitch) setIsOpen(!isOpen);
        }}
        disabled={!canSwitch}
        className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left group ${
          canSwitch
            ? "bg-white hover:bg-amber-50/50 border-[#d7c2b9] hover:border-[#c2652a]/60 shadow-xs cursor-pointer active:scale-[0.99]"
            : "bg-white/80 border-[#d7c2b9]/60 cursor-default"
        }`}
        title={canSwitch ? `Switch property (${accessibleProperties.length} available)` : `Assigned building: ${activeName}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-[#964407] flex items-center justify-center shrink-0 border border-amber-300/60 font-bold">
            <Building2 className="w-4 h-4 text-[#964407]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`font-extrabold text-[#201a17] block group-hover:text-[#964407] transition-colors leading-snug line-clamp-2 break-words ${
                  activeName.length > 22 ? "text-[11px]" : "text-xs"
                }`}
                title={activeName}
              >
                {activeName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#554339] truncate mt-0.5">
              {activeRole === "receptionist" ? (
                <span className="flex items-center gap-0.5 text-purple-700 font-semibold">
                  <Lock className="w-2.5 h-2.5" />
                  Front Desk
                </span>
              ) : activeRole === "admin" ? (
                <span className="text-blue-700 font-medium">
                  Assigned ({accessibleProperties.length} {accessibleProperties.length === 1 ? "Prop" : "Props"})
                </span>
              ) : (
                <span className="text-amber-800 font-medium">
                  {accessibleProperties.length} {accessibleProperties.length === 1 ? "Building" : "Buildings"} Portfolio
                </span>
              )}
            </div>
          </div>
        </div>

        {canSwitch ? (
          <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-[#964407] transition-colors shrink-0" />
        ) : (
          <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Switcher Dropdown Popover */}
      {isOpen && canSwitch && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-[#d7c2b9] shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 min-w-[240px]">
          {/* Header */}
          <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[#d7c2b9]/40">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#964407]">
              Switch Building
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
              {accessibleProperties.length} Available
            </span>
          </div>

          {/* Quick Search if more than 3 properties */}
          {accessibleProperties.length > 3 && (
            <div className="px-1 pt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter buildings..."
                  className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-[#964407]"
                />
              </div>
            </div>
          )}

          {/* Properties List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
            {filteredProperties.map((prop, idx) => {
              const isSelected = prop.id === currentPropertyId;
              return (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => handleSelectProperty(prop.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#201a17] text-white shadow-xs"
                      : "hover:bg-[#f8ede3] text-[#201a17]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 mr-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                        isSelected
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                          : "bg-amber-100/60 text-[#964407] border border-amber-200"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-xs truncate ${isSelected ? "text-white" : "text-[#201a17]"}`}>
                        {prop.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] opacity-75 truncate">
                        {prop.location && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            {prop.location}
                          </span>
                        )}
                        {prop.bedsCount && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            • <Layers className="w-2.5 h-2.5" /> {prop.bedsCount} Beds
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}

            {filteredProperties.length === 0 && (
              <div className="py-4 text-center text-xs text-gray-500">
                No matching properties found
              </div>
            )}
          </div>

          {/* Master Admin Actions (Add Property & Portfolio View) */}
          {activeRole === "master_admin" && (
            <div className="pt-1.5 border-t border-[#d7c2b9]/40 space-y-1">
              {onOpenAddProperty && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onCloseMobile) onCloseMobile();
                    onOpenAddProperty();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-[#964407] hover:bg-[#f8ede3] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#c2652a]" />
                  <span>Add New Building</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (onCloseMobile) onCloseMobile();
                  router.push("/home");
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Compass className="w-4 h-4 text-gray-500" />
                <span>Portfolio Overview (/home)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
