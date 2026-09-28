"use client";

import { useParams } from "next/navigation";
import { PropertyAiCopilotDrawer } from "./PropertyAiCopilotDrawer";
import { Sparkles } from "lucide-react";
import { useAiCopilotStore } from "@/lib/aiCopilotStore";

export function PropertyAiLayoutWrapper() {
  const params = useParams();
  const propertyId = (params?.propertyId as string) || "";
  const { openCopilot } = useAiCopilotStore();

  if (!propertyId) return null;

  return (
    <>
      <PropertyAiCopilotDrawer propertyId={propertyId} />

      {/* 📱 Mobile Quick Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => openCopilot("", false)}
        title="Ask TenoPilot AI Copilot"
        className="sm:hidden fixed bottom-20 right-4 z-40 p-3 rounded-full bg-gradient-to-r from-[#c2652a] via-[#b85b20] to-[#964407] text-white shadow-xl shadow-[#c2652a]/40 border-2 border-amber-200/60 active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
        aria-label="Open AI Copilot"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
      </button>
    </>
  );
}
