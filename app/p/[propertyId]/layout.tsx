import { Suspense } from "react";
import { ImpersonationBanner } from "@/components/founder/ImpersonationBanner";
import { SubscriptionGraceBanner } from "@/components/dashboard/SubscriptionGraceBanner";
import { PropertyAiLayoutWrapper } from "@/components/ai/PropertyAiLayoutWrapper";

export default function PropertyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={null}>
        <ImpersonationBanner />
      </Suspense>
      <Suspense fallback={null}>
        <SubscriptionGraceBanner />
      </Suspense>
      <div className="flex-1 flex flex-col">{children}</div>
      <Suspense fallback={null}>
        <PropertyAiLayoutWrapper />
      </Suspense>
    </div>
  );
}
