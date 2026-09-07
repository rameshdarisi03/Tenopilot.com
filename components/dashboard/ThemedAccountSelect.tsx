"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { PaymentAccountConfig, PartnerConfig } from "@/constants/partnerStore";
import { Building2, Banknote, User, CreditCard, ChevronDown, Check, Search, X } from "lucide-react";

export interface ThemedAccountSelectProps {
  value: string;
  onChange: (value: string) => void;
  accounts: PaymentAccountConfig[];
  partners: PartnerConfig[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface AccountGroup {
  id: string;
  label: string;
  icon: "business" | "cash" | "partner" | "other";
  items: PaymentAccountConfig[];
}

export function ThemedAccountSelect({
  value,
  onChange,
  accounts = [],
  partners = [],
  placeholder = "Select Account",
  className = "",
  disabled = false,
}: ThemedAccountSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Group accounts logically into SSOT categories
  const groups: AccountGroup[] = useMemo(() => {
    const list = accounts || [];

    // 1. Common Business Pool
    const businessAccs = list.filter(
      (a) => a.type === "Business Account" || a.partnerId === "BUSINESS" || a.name.toLowerCase().includes("business")
    );
    const finalBusinessAccs =
      businessAccs.length > 0
        ? businessAccs
        : [
            {
              id: "acc-business-default",
              name: "Main Business Account",
              type: "Business Account" as const,
              bankLabel: "Primary Operating Pool",
            },
          ];

    // 2. Cash / Reception Drawer
    const cashAccs = list.filter(
      (a) =>
        a.type === "Petty Cash" ||
        a.partnerId === "PETTY_CASH" ||
        a.accountType === "CASH_DESK" ||
        a.name.toLowerCase().includes("cash")
    );
    const finalCashAccs =
      cashAccs.length > 0
        ? cashAccs
        : [
            {
              id: "acc-cash-default",
              name: "Petty Cash / Reception Desk",
              type: "Petty Cash" as const,
              bankLabel: "PG Reception",
            },
          ];

    // 3. Partner Accounts
    const partnerAccMap = new Map<string, PaymentAccountConfig[]>();
    partners.forEach((p) => partnerAccMap.set(p.id, []));

    const otherAccs: PaymentAccountConfig[] = [];

    list.forEach((acc) => {
      if (businessAccs.includes(acc) || cashAccs.includes(acc)) return;

      if (acc.partnerId && partnerAccMap.has(acc.partnerId)) {
        partnerAccMap.get(acc.partnerId)!.push(acc);
        return;
      }

      const matched = partners.find(
        (p) =>
          (acc.partnerName && acc.partnerName.toLowerCase() === p.name.toLowerCase()) ||
          acc.name.toLowerCase().startsWith(p.name.toLowerCase()) ||
          acc.name.toLowerCase().includes(`(${p.name.toLowerCase()})`)
      );

      if (matched) {
        partnerAccMap.get(matched.id)!.push(acc);
      } else {
        otherAccs.push(acc);
      }
    });

    const result: AccountGroup[] = [
      {
        id: "group-business",
        label: "🏢 Common Business Pool",
        icon: "business",
        items: finalBusinessAccs,
      },
      {
        id: "group-cash",
        label: "💵 Cash / Reception Drawer",
        icon: "cash",
        items: finalCashAccs,
      },
    ];

    partners.forEach((p) => {
      const pAccs = partnerAccMap.get(p.id) || [];
      result.push({
        id: `group-partner-${p.id}`,
        label: `👤 ${p.name} (${p.ownershipPercentage}% Partner)`,
        icon: "partner",
        items:
          pAccs.length > 0
            ? pAccs
            : [
                {
                  id: `acc-partner-fallback-${p.id}`,
                  name: `${p.name} (Partner Account)`,
                  type: "Partner Account",
                  partnerId: p.id,
                  partnerName: p.name,
                  bankLabel: `${p.ownershipPercentage}% Partner Account`,
                },
              ],
      });
    });

    if (otherAccs.length > 0) {
      result.push({
        id: "group-other",
        label: "💳 Other Payment Accounts",
        icon: "other",
        items: otherAccs,
      });
    }

    return result;
  }, [accounts, partners]);

  // Find currently selected account across all groups
  const selectedAccount = useMemo(() => {
    if (!value) return null;
    for (const group of groups) {
      const found = group.items.find((item) => item.name.toLowerCase() === value.toLowerCase());
      if (found) return { item: found, group };
    }
    return null;
  }, [value, groups]);

  // Filter groups according to search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;

    return groups
      .map((g) => {
        const matchingItems = g.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.bankLabel && item.bankLabel.toLowerCase().includes(q)) ||
            (item.upiId && item.upiId.toLowerCase().includes(q)) ||
            (item.partnerName && item.partnerName.toLowerCase().includes(q)) ||
            g.label.toLowerCase().includes(q)
        );
        return {
          ...g,
          items: matchingItems,
        };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, searchQuery]);

  const totalItemsCount = useMemo(() => {
    return groups.reduce((acc, g) => acc + g.items.length, 0);
  }, [groups]);

  // Smart viewport positioning
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 260 && rect.top > 260);
    }
    setIsOpen((prev) => !prev);
    setSearchQuery("");
  };

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const renderIcon = (type: "business" | "cash" | "partner" | "other", className = "w-4 h-4") => {
    switch (type) {
      case "business":
        return <Building2 className={`${className} text-amber-700`} />;
      case "cash":
        return <Banknote className={`${className} text-emerald-700`} />;
      case "partner":
        return <User className={`${className} text-[#c2652a]`} />;
      case "other":
      default:
        return <CreditCard className={`${className} text-blue-700`} />;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button - Matches App Input Theme */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full px-3 py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer ${
          disabled
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            : isOpen
            ? "border-[#c2652a] bg-orange-50/20 ring-2 ring-[#c2652a]/20"
            : "border-gray-300 bg-white hover:border-[#c2652a]/60 text-gray-900"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedAccount ? (
            <>
              <div
                className={`p-1 rounded-lg shrink-0 ${
                  selectedAccount.group.icon === "business"
                    ? "bg-amber-100/80"
                    : selectedAccount.group.icon === "cash"
                    ? "bg-emerald-100/80"
                    : selectedAccount.group.icon === "partner"
                    ? "bg-orange-100/80"
                    : "bg-blue-100/80"
                }`}
              >
                {renderIcon(selectedAccount.group.icon, "w-3.5 h-3.5")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-gray-900 truncate leading-tight">
                  {selectedAccount.item.name}
                </div>
                {(selectedAccount.item.bankLabel || selectedAccount.item.upiId) && (
                  <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
                    {selectedAccount.item.bankLabel || ""}
                    {selectedAccount.item.bankLabel && selectedAccount.item.upiId ? " • " : ""}
                    {selectedAccount.item.upiId ? `UPI: ${selectedAccount.item.upiId}` : ""}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs font-medium text-gray-400 truncate">
              {value || placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#c2652a]" : ""
          }`}
        />
      </button>

      {/* Floating Themed Dropdown with Unlimited Scrolling */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 bg-white rounded-2xl border border-orange-200/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {/* Search Header if more than 4 accounts */}
          {totalItemsCount > 4 && (
            <div className="p-2 border-b border-orange-100 bg-orange-50/30">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search accounts, partners, UPI..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white rounded-lg border border-orange-200 focus:outline-none focus:ring-1 focus:ring-[#c2652a] text-gray-900 placeholder-gray-400 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Smooth Unlimited Scrolling List */}
          <div
            className="max-h-60 sm:max-h-72 overflow-y-auto overscroll-contain divide-y divide-gray-50/80 scrollbar-thin scrollbar-thumb-orange-200"
            style={{
              WebkitOverflowScrolling: "touch",
            }}
          >
            {filteredGroups.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 font-medium">
                No matching accounts found
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.id} className="py-1">
                  {/* Sticky Category Header */}
                  <div className="sticky top-0 z-10 px-3 py-1 bg-gray-50/95 backdrop-blur-xs border-y border-gray-100 text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
                    <span>{group.label}</span>
                    <span className="text-[9px] font-medium text-gray-400">
                      {group.items.length} {group.items.length === 1 ? "acc" : "accs"}
                    </span>
                  </div>

                  {/* Account Items */}
                  <div className="px-1 py-0.5 space-y-0.5">
                    {group.items.map((acc) => {
                      const isSelected =
                        value &&
                        (acc.name.toLowerCase() === value.toLowerCase() ||
                          (selectedAccount && selectedAccount.item.id === acc.id));

                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            onChange(acc.name);
                            setIsOpen(false);
                            setSearchQuery("");
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-orange-100/70 text-[#c2652a] font-bold border border-orange-200/80 shadow-xs"
                              : "hover:bg-orange-50/50 text-gray-800 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`p-1.5 rounded-lg shrink-0 ${
                                group.icon === "business"
                                  ? "bg-amber-100/80"
                                  : group.icon === "cash"
                                  ? "bg-emerald-100/80"
                                  : group.icon === "partner"
                                  ? "bg-orange-100/80"
                                  : "bg-blue-100/80"
                              }`}
                            >
                              {renderIcon(group.icon, "w-3.5 h-3.5")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className={`text-xs truncate ${
                                  isSelected ? "font-bold text-[#c2652a]" : "font-semibold text-gray-900"
                                }`}
                              >
                                {acc.name}
                              </div>
                              {(acc.bankLabel || acc.upiId) && (
                                <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
                                  {acc.bankLabel || ""}
                                  {acc.bankLabel && acc.upiId ? " • " : ""}
                                  {acc.upiId ? `UPI: ${acc.upiId}` : ""}
                                </div>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-[#c2652a] shrink-0 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemedAccountSelect;
