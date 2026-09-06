import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PLATFORM_CONFIG, PlatformConfig } from "@/lib/platformConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    return NextResponse.json({
      success: true,
      config: DEFAULT_PLATFORM_CONFIG,
    });
  } catch (err: any) {
    console.error("GET /api/apex/master-controls error:", err);
    return NextResponse.json(
      { success: false, message: err.message, config: DEFAULT_PLATFORM_CONFIG },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      proMonthlyPrice = DEFAULT_PLATFORM_CONFIG.proMonthlyPrice,
      proAnnualPrice = DEFAULT_PLATFORM_CONFIG.proAnnualPrice,
      multiPropertyPrice = DEFAULT_PLATFORM_CONFIG.multiPropertyPrice,
      tenantPackPrice = DEFAULT_PLATFORM_CONFIG.tenantPackPrice,
      trialDays = DEFAULT_PLATFORM_CONFIG.trialDays,
      graceDays = DEFAULT_PLATFORM_CONFIG.graceDays,
      proTenantLimit = DEFAULT_PLATFORM_CONFIG.proTenantLimit,
      trialTenantLimit = DEFAULT_PLATFORM_CONFIG.trialTenantLimit,
      baseAllowedBuildings = DEFAULT_PLATFORM_CONFIG.baseAllowedBuildings,
      founderWhatsapp = DEFAULT_PLATFORM_CONFIG.founderWhatsapp,
      founderUpiVpa = DEFAULT_PLATFORM_CONFIG.founderUpiVpa,
      founderUpiName = DEFAULT_PLATFORM_CONFIG.founderUpiName,
      updatedBy = "Founder Console",
    } = body;

    const payload: PlatformConfig = {
      proMonthlyPrice: Math.max(1, Number(proMonthlyPrice)),
      proAnnualPrice: Math.max(1, Number(proAnnualPrice)),
      multiPropertyPrice: Math.max(0, Number(multiPropertyPrice)),
      tenantPackPrice: Math.max(0, Number(tenantPackPrice)),
      trialDays: Math.max(1, Number(trialDays)),
      graceDays: Math.max(0, Number(graceDays)),
      proTenantLimit: Math.max(1, Number(proTenantLimit)),
      trialTenantLimit: Math.max(1, Number(trialTenantLimit)),
      baseAllowedBuildings: Math.max(1, Number(baseAllowedBuildings)),
      founderWhatsapp: String(founderWhatsapp).replace(/\D/g, "").slice(-10) || DEFAULT_PLATFORM_CONFIG.founderWhatsapp,
      founderUpiVpa: String(founderUpiVpa).trim() || DEFAULT_PLATFORM_CONFIG.founderUpiVpa,
      founderUpiName: String(founderUpiName).trim() || DEFAULT_PLATFORM_CONFIG.founderUpiName,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    // 1. Save to primary master_controls document
    await setDoc(
      doc(db, "platform_admin", "config", "settings", "master_controls"),
      payload,
      { merge: true }
    );

    // 2. Backward compatibility mirror to capacity document
    await setDoc(
      doc(db, "platform_admin", "config", "settings", "capacity"),
      {
        proTenantLimit: payload.proTenantLimit,
        trialTenantLimit: payload.trialTenantLimit,
        defaultAllowedProperties: payload.baseAllowedBuildings,
        multiPropertyPrice: payload.multiPropertyPrice,
        tenantExtensionPrice: payload.tenantPackPrice,
        updatedAt: payload.updatedAt,
        updatedBy: payload.updatedBy,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: "Master platform controls saved & broadcast successfully!",
      config: payload,
    });
  } catch (err: any) {
    console.error("POST /api/apex/master-controls error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update master controls" },
      { status: 500 }
    );
  }
}
