"use client";

import { Search, Bell, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PropertyHeader({
  title = "Tenants & Guests Directory",
  sectionTabs = [],
  activeTab = "",
  searchValue = "",
  onSearchChange,
  onTabChange,
  onMobileMenuToggle,
}: {
  title?: string;
  sectionTabs?: string[];
  activeTab?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onTabChange?: (tab: string) => void;
  onMobileMenuToggle?: () => void;
}) {
  const [currentTab, setCurrentTab] = useState(activeTab);

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 md:px-6 h-16 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu Button & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700 active:scale-95 shrink-0"
          aria-label="Toggle Mobile Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Full-width Search Bar Input (Synchronized with Directory Filter) */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search by name, phone, room, Aadhaar..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs md:text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-[#c2652a] focus:border-[#c2652a] transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Right: Notification Bell & User Avatar */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#c2652a] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
            8
          </span>
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#c2652a] to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            RD
          </div>
        </div>
      </div>
    </header>
  );
}
