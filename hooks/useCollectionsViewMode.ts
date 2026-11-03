"use client";

import { useState, useEffect, useCallback } from "react";

export type CollectionsViewMode = "RENT" | "GROSS";

const STORAGE_KEY = "tenopilot_collections_view_mode";
const EVENT_KEY = "tenopilot:collections-view-mode";

/**
 * Returns the currently active collections view mode from localStorage (default: "RENT")
 */
export function getStoredCollectionsViewMode(): CollectionsViewMode {
  if (typeof window === "undefined") return "RENT";
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "GROSS" || val === "RENT") return val;
  } catch {
    // Ignore storage errors
  }
  return "RENT";
}

/**
 * Updates the collections view mode in localStorage and broadcasts to all listening components & browser tabs
 */
export function setStoredCollectionsViewMode(mode: CollectionsViewMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: mode }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Reactive React hook to consume and update the Collections View Mode
 * across Overview, Property Map, Tenants & Guests, and Financial Hub simultaneously.
 */
export function useCollectionsViewMode() {
  const [mode, setModeState] = useState<CollectionsViewMode>("RENT");

  useEffect(() => {
    // Read initial client-side value
    setModeState(getStoredCollectionsViewMode());

    // Listen for local broadcasts across tabs or components
    const handleModeEvent = (e: any) => {
      if (e?.detail && (e.detail === "RENT" || e.detail === "GROSS")) {
        setModeState(e.detail);
      } else {
        setModeState(getStoredCollectionsViewMode());
      }
    };

    window.addEventListener(EVENT_KEY, handleModeEvent);
    window.addEventListener("storage", handleModeEvent);

    return () => {
      window.removeEventListener(EVENT_KEY, handleModeEvent);
      window.removeEventListener("storage", handleModeEvent);
    };
  }, []);

  const setMode = useCallback((newMode: CollectionsViewMode) => {
    setModeState(newMode);
    setStoredCollectionsViewMode(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "RENT" ? "GROSS" : "RENT";
      setStoredCollectionsViewMode(next);
      return next;
    });
  }, []);

  return { mode, setMode, toggleMode };
}
