"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 🚀 Unified Authentication Architecture
 * Dedicated signup screens have been removed. All authentication (Login & Signup)
 * converges on the unified progressive authentication gateway at /login.
 */
export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f7f4ee] flex flex-col items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c2652a] mb-3" />
      <p className="text-xs font-semibold text-gray-500 font-sans">
        Redirecting to TenoPilot Secure Authentication...
      </p>
    </div>
  );
}
