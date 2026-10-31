"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global helper to trigger progress bar programmatically (e.g. for router.push)
 */
export function startRouteProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tenopilot-nav-start"));
  }
}

export function stopRouteProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tenopilot-nav-stop"));
  }
}

function ProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setVisible(true);
    setActive(true);
    setProgress(15);

    // Smooth incremental crawl
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 85;
        }
        // Step progressively slower as it approaches 85%
        const increment = Math.max(1, (85 - prev) * 0.15);
        return prev + increment;
      });
    }, 150);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    // Fade out smoothly once 100% is displayed
    resetTimerRef.current = setTimeout(() => {
      setVisible(false);
      resetTimerRef.current = setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 300);
    }, 200);
  };

  // When pathname or searchParams change, the navigation has completed
  useEffect(() => {
    if (active) {
      completeProgress();
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept clicks on links globally
    const handleDocumentClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore anchor jumps, protocols, downloads, or external links
      if (
        href.startsWith("#") ||
        href.startsWith("tel:") ||
        href.startsWith("mailto:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      // Ignore modifier clicks (open in new tab/window)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      try {
        const url = new URL(anchor.href, window.location.href);
        // Only internal links
        if (url.origin !== window.location.origin) return;

        // If exact same route and params, don't trigger
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }

        // Tap detected! Show immediate progress bar
        startProgress();
      } catch {
        // Fallback for relative or malformed URLs
      }
    };

    const handleCustomStart = () => startProgress();
    const handleCustomStop = () => completeProgress();

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("tenopilot-nav-start", handleCustomStart);
    window.addEventListener("tenopilot-nav-stop", handleCustomStop);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("tenopilot-nav-start", handleCustomStart);
      window.removeEventListener("tenopilot-nav-stop", handleCustomStop);
      if (timerRef.current) clearInterval(timerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-1 bg-gradient-to-r from-[#964407] via-[#c2652a] to-[#e07d3c] shadow-xs"
        style={{
          width: `${progress}%`,
          transition: progress === 100 ? "width 150ms ease-out" : "width 200ms ease-in-out",
          boxShadow: "0 0 10px rgba(194, 101, 42, 0.7), 0 0 5px rgba(150, 68, 7, 0.5)",
        }}
      />
    </div>
  );
}

export function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarContent />
    </Suspense>
  );
}
