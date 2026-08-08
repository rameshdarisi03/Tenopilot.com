"use client";

import React, { useRef, useEffect, useState } from "react";

export interface TabOption<T extends string> {
  id: T;
  label: string;
  count?: number;
  badgeColor?: string;
  activeTextColor?: string;
}

interface GlidingTabsProps<T extends string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

/**
 * GlidingTabs - World-class spring-physics sliding active tab indicator
 * Measures DOM position dynamically and glides a backdrop pill underneath active tab
 */
export function GlidingTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className = "",
}: GlidingTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    const tabElements = container.querySelectorAll<HTMLButtonElement>("[data-tab-item]");
    
    if (tabElements[activeIndex]) {
      const activeEl = tabElements[activeIndex];
      setPillStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
      setIsReady(true);
    }
  }, [activeTab, tabs]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center p-1.5 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs ${className}`}
    >
      {/* Spring-Physics Gliding Backdrop Pill */}
      {isReady && (
        <div
          className="absolute top-1.5 bottom-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-md shadow-slate-200/60 dark:shadow-black/50 border border-slate-200/80 dark:border-slate-700/80 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            transform: `translateX(${pillStyle.left}px)`,
            width: `${pillStyle.width}px`,
          }}
        />
      )}

      {/* Tab Buttons */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            data-tab-item
            onClick={() => onChange(tab.id)}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isActive
                ? tab.activeTextColor || "text-slate-900 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors ${
                  tab.badgeColor || "bg-slate-200/80 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
