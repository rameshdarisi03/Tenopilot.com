"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function PropertyRootPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const rawParam = resolvedParams?.propertyId || "";

    // If the path was /p/settings, redirect cleanly to settings
    if (rawParam === "settings" || rawParam === "" || rawParam === "undefined") {
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
      if (!targetPropId) targetPropId = "prop-1792314481132";
      router.replace(`/p/${targetPropId}/settings`);
      return;
    }

    // Otherwise, redirect to the property's overview dashboard
    router.replace(`/p/${rawParam}/overview`);
  }, [resolvedParams, profile, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf9f8]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#c2652a] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-500">Redirecting to workspace...</p>
      </div>
    </div>
  );
}
