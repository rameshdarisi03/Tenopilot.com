"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlatformConfig,
  DEFAULT_PLATFORM_CONFIG,
  getStoredPlatformConfig,
  setStoredPlatformConfig,
  EVENT_KEY,
} from "./platformConfig";

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
