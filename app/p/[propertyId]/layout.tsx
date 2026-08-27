import { Suspense } from "react";
import { ImpersonationBanner } from "@/components/founder/ImpersonationBanner";

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
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
