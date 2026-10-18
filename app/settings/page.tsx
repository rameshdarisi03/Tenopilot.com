"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function SettingsRedirectPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    let targetPropId = profile?.assignedPropertyId;
    if (!targetPropId && typeof window !== "undefined") {
      try {
        const s = localStorage.getItem("tenopilot_saved_session");
        if (s) {
          const parsed = JSON.parse(s);
          if (parsed?.assignedPropertyId) targetPropId = parsed.assignedPropertyId;
        }
      } catch {}
    }

    if (!targetPropId) {
      targetPropId = "prop-1792314481132";
    }

    router.replace(`/p/${targetPropId}/settings`);
  }, [profile, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf9f8]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#c2652a] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-500">Redirecting to Settings...</p>
      </div>
    </div>
  );
}
