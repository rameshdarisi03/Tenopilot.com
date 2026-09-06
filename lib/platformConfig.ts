"use client";

import { useState, useEffect, useCallback } from "react";

export interface PlatformConfig {
  // Plan Pricing
  proMonthlyPrice: number;
  proAnnualPrice: number;
  multiPropertyPrice: number;
  tenantPackPrice: number;

  // Trial & Grace Engine
  trialDays: number;
  graceDays: number;

  // Capacity Limits
  proTenantLimit: number;
  trialTenantLimit: number;
  baseAllowedBuildings: number;

  // Founder Support & Billing
  founderWhatsapp: string;
  founderUpiVpa: string;
  founderUpiName: string;

  // Audit Metadata
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  // Plan Pricing
  proMonthlyPrice: 999,
  proAnnualPrice: 9990,
  multiPropertyPrice: 899,
  tenantPackPrice: 75,

  // Trial & Grace Engine
  trialDays: 10,
  graceDays: 3,

  // Capacity Limits
  proTenantLimit: 300,
  trialTenantLimit: 50,
  baseAllowedBuildings: 1,

  // Founder Support & Billing
  founderWhatsapp: "9206651295",
  founderUpiVpa: "rameshdarisi01@ybl",
  founderUpiName: "RAMESH DARISI",

  updatedAt: null,
  updatedBy: "System Baseline",
};

const STORAGE_KEY = "tenopilot_master_platform_config";
const EVENT_KEY = "tenopilot_platform_config_updated";

/**
 * Synchronously retrieves the active platform config with 0ms delay.
 * Safe for SSR and client execution.
 */
export function getStoredPlatformConfig(): PlatformConfig {
  if (typeof window === "undefined") {
    return DEFAULT_PLATFORM_CONFIG;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PLATFORM_CONFIG,
      ...parsed,
    };
  } catch (err) {
    console.warn("Error reading stored platform config:", err);
    return DEFAULT_PLATFORM_CONFIG;
  }
}

/**
 * Saves and broadcasts updated platform config to all active tabs and React components.
 */
export function setStoredPlatformConfig(updated: Partial<PlatformConfig>): PlatformConfig {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PLATFORM_CONFIG, ...updated };
  }

  try {
    const current = getStoredPlatformConfig();
    const merged: PlatformConfig = {
      ...current,
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: merged }));
    return merged;
  } catch (err) {
    console.warn("Error saving stored platform config:", err);
    return { ...DEFAULT_PLATFORM_CONFIG, ...updated };
  }
}

/**
 * Reactive React hook to consume and update PlatformConfig across any UI component.
 */
export function usePlatformConfig() {
  const [config, setConfig] = useState<PlatformConfig>(() => getStoredPlatformConfig());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/platform/config", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.config) {
          const merged = setStoredPlatformConfig(data.config);
          setConfig(merged);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch fresh platform config:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Listen for local broadcasts across tabs or components
    const handleConfigEvent = (e: any) => {
      if (e?.detail) {
        setConfig(e.detail);
      } else {
        setConfig(getStoredPlatformConfig());
      }
    };

    window.addEventListener(EVENT_KEY, handleConfigEvent);
    window.addEventListener("storage", handleConfigEvent);

    // 2. Fetch fresh config in background without blocking UI
    refreshConfig();

    return () => {
      window.removeEventListener(EVENT_KEY, handleConfigEvent);
      window.removeEventListener("storage", handleConfigEvent);
    };
  }, [refreshConfig]);

  return {
    config,
    isLoading,
    refreshConfig,
    setStoredPlatformConfig,
  };
}
