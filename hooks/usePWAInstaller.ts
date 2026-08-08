"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installedStatusMessage, setInstalledStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check if running in standalone display mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // 2. Listen to beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    // 3. Listen to appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setInstalledStatusMessage("🎉 TenoPilot.com app is now installed on your device!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (isInstalled) {
      alert("ℹ️ TenoPilot.com app is already installed on your device!");
      return;
    }

    if (!deferredPrompt) {
      // If browser hasn't fired beforeinstallprompt yet or iOS Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert(
          "📲 To install on iOS Safari:\n\n1. Tap the Share button at the bottom of Safari\n2. Select 'Add to Home Screen'\n\nThe orange 'T' TenoPilot icon will be added to your iPhone!"
        );
      } else {
        alert(
          "📲 Tap Install or Add to Home Screen in your mobile browser to place TenoPilot.com on your home screen!"
        );
      }
      return;
    }

    // Direct 1-Click Install Trigger!
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error("Failed to trigger PWA install prompt", err);
    }
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall,
    installedStatusMessage,
  };
}
