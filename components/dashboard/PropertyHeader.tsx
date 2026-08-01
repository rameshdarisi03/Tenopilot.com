"use client";

import { Search, Bell, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PropertyHeader({
  title = "Financial Hub",
  sectionTabs = ["Operations", "Expenses", "Partner Settlement", "Reports"],
  activeTab = "Expenses",
  onTabChange,
}: {
  title?: string;
  sectionTabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const [currentTab, setCurrentTab] = useState(activeTab);

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#fff8f6]/95 backdrop-blur-md border-b border-[#d7c2b9]/60 px-6 h-16 flex items-center justify-between gap-4">
      {/* Module Title */}
      <div className="flex items-center gap-6">
        <h1 className="font-serif font-bold text-xl md:text-2xl text-[#201a17] shrink-0">
          {title}
        </h1>

        {/* Full-width Search Bar Pill */}
        <div className="hidden md:flex items-center relative w-72 lg:w-96">
          <input
            type="text"
            placeholder="Search transactions, expenses, occupants..."
            className="w-full pl-9 pr-4 py-2 rounded-full border border-[#d7c2b9] bg-[#f8ede3]/50 text-xs text-[#201a17] placeholder-[#554339]/60 focus:outline-none focus:border-[#964407] focus:ring-1 focus:ring-[#964407] transition-all"
          />
          <Search className="w-4 h-4 text-[#554339] absolute left-3" />
        </div>
      </div>

      {/* In-Page Section Tabs & Actions */}
      <div className="flex items-center gap-6">
        {/* Section Tabs */}
        {sectionTabs.length > 0 && (
          <nav className="hidden sm:flex items-center gap-6 text-xs font-bold text-[#554339]">
            {sectionTabs.map((tab) => {
              const isActive = currentTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`pb-1 transition-colors relative ${
                    isActive
                      ? "text-[#964407]"
                      : "hover:text-[#201a17] text-[#554339]"
                  }`}
                >
                  {tab}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#964407] rounded-full"></span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Notification Bell & Profile Avatar */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            className="relative p-2 rounded-full hover:bg-[#f8ede3] text-[#554339] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#964407] text-white text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </button>

          <Link href="/home" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-[#964407] text-white font-bold flex items-center justify-center text-xs border-2 border-[#964407]/20 shadow-xs group-hover:bg-[#c2652a] transition-colors">
              AS
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
