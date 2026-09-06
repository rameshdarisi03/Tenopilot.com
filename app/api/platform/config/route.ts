import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PLATFORM_CONFIG, PlatformConfig } from "@/lib/platformConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Try reading master_controls doc
    const masterDoc = await getDoc(
      doc(db, "platform_admin", "config", "settings", "master_controls")
    );

    if (masterDoc.exists()) {
      const data = masterDoc.data();
      const config: PlatformConfig = {
        proMonthlyPrice: Number(data.proMonthlyPrice) || DEFAULT_PLATFORM_CONFIG.proMonthlyPrice,
        proAnnualPrice: Number(data.proAnnualPrice) || DEFAULT_PLATFORM_CONFIG.proAnnualPrice,
        multiPropertyPrice: Number(data.multiPropertyPrice) || DEFAULT_PLATFORM_CONFIG.multiPropertyPrice,
        tenantPackPrice: Number(data.tenantPackPrice) || DEFAULT_PLATFORM_CONFIG.tenantPackPrice,
        trialDays: Number(data.trialDays) || DEFAULT_PLATFORM_CONFIG.trialDays,
        graceDays: Number(data.graceDays) || DEFAULT_PLATFORM_CONFIG.graceDays,
        proTenantLimit: Number(data.proTenantLimit) || DEFAULT_PLATFORM_CONFIG.proTenantLimit,
        trialTenantLimit: Number(data.trialTenantLimit) || DEFAULT_PLATFORM_CONFIG.trialTenantLimit,
        baseAllowedBuildings: Number(data.baseAllowedBuildings) || DEFAULT_PLATFORM_CONFIG.baseAllowedBuildings,
        founderWhatsapp: String(data.founderWhatsapp || DEFAULT_PLATFORM_CONFIG.founderWhatsapp),
        founderUpiVpa: String(data.founderUpiVpa || DEFAULT_PLATFORM_CONFIG.founderUpiVpa),
        founderUpiName: String(data.founderUpiName || DEFAULT_PLATFORM_CONFIG.founderUpiName),
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || null,
      };

      return NextResponse.json({
        success: true,
        config,
      });
    }

    // 2. Fallback check for capacity doc if master_controls not created yet
    const capDoc = await getDoc(
      doc(db, "platform_admin", "config", "settings", "capacity")
    );
    if (capDoc.exists()) {
      const data = capDoc.data();
      const config: PlatformConfig = {
        ...DEFAULT_PLATFORM_CONFIG,
        proTenantLimit: Number(data.proTenantLimit) || DEFAULT_PLATFORM_CONFIG.proTenantLimit,
        trialTenantLimit: Number(data.trialTenantLimit) || DEFAULT_PLATFORM_CONFIG.trialTenantLimit,
        baseAllowedBuildings: Number(data.defaultAllowedProperties) || DEFAULT_PLATFORM_CONFIG.baseAllowedBuildings,
        multiPropertyPrice: Number(data.multiPropertyPrice) || DEFAULT_PLATFORM_CONFIG.multiPropertyPrice,
        tenantPackPrice: Number(data.tenantExtensionPrice) || DEFAULT_PLATFORM_CONFIG.tenantPackPrice,
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || null,
      };

      return NextResponse.json({
        success: true,
        config,
      });
    }

    return NextResponse.json({
      success: true,
      config: DEFAULT_PLATFORM_CONFIG,
    });
  } catch (err: any) {
    console.warn("GET /api/platform/config fallback:", err);
    return NextResponse.json({
      success: true,
      config: DEFAULT_PLATFORM_CONFIG,
    });
  }
}
