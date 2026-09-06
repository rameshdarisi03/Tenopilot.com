import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_PRO_TENANT_LIMIT,
  DEFAULT_TRIAL_TENANT_LIMIT,
  DEFAULT_ALLOWED_PROPERTIES,
  MULTI_PROPERTY_MONTHLY_PRICE,
  TENANT_EXTENSION_MONTHLY_PRICE,
} from "@/lib/subscriptionEngine";

export async function GET() {
  try {
    const configSnap = await getDoc(
      doc(db, "platform_admin", "config", "settings", "capacity")
    );

    if (configSnap.exists()) {
      const data = configSnap.data();
      return NextResponse.json({
        success: true,
        config: {
          proTenantLimit: Number(data.proTenantLimit) || DEFAULT_PRO_TENANT_LIMIT,
          trialTenantLimit: Number(data.trialTenantLimit) || DEFAULT_TRIAL_TENANT_LIMIT,
          defaultAllowedProperties: Number(data.defaultAllowedProperties) || DEFAULT_ALLOWED_PROPERTIES,
          multiPropertyPrice: Number(data.multiPropertyPrice) || MULTI_PROPERTY_MONTHLY_PRICE,
          tenantExtensionPrice: Number(data.tenantExtensionPrice) || TENANT_EXTENSION_MONTHLY_PRICE,
          updatedAt: data.updatedAt || null,
          updatedBy: data.updatedBy || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        proTenantLimit: DEFAULT_PRO_TENANT_LIMIT,
        trialTenantLimit: DEFAULT_TRIAL_TENANT_LIMIT,
        defaultAllowedProperties: DEFAULT_ALLOWED_PROPERTIES,
        multiPropertyPrice: MULTI_PROPERTY_MONTHLY_PRICE,
        tenantExtensionPrice: TENANT_EXTENSION_MONTHLY_PRICE,
        updatedAt: null,
        updatedBy: "System Baseline",
      },
    });
  } catch (err: any) {
    console.warn("GET /api/apex/global-capacity notice:", err);
    return NextResponse.json({
      success: true,
      config: {
        proTenantLimit: DEFAULT_PRO_TENANT_LIMIT,
        trialTenantLimit: DEFAULT_TRIAL_TENANT_LIMIT,
        defaultAllowedProperties: DEFAULT_ALLOWED_PROPERTIES,
        multiPropertyPrice: MULTI_PROPERTY_MONTHLY_PRICE,
        tenantExtensionPrice: TENANT_EXTENSION_MONTHLY_PRICE,
      },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      proTenantLimit = DEFAULT_PRO_TENANT_LIMIT,
      trialTenantLimit = DEFAULT_TRIAL_TENANT_LIMIT,
      defaultAllowedProperties = DEFAULT_ALLOWED_PROPERTIES,
      multiPropertyPrice = MULTI_PROPERTY_MONTHLY_PRICE,
      tenantExtensionPrice = TENANT_EXTENSION_MONTHLY_PRICE,
      updatedBy = "Founder Console",
    } = body;

    const payload = {
      proTenantLimit: Math.max(1, Number(proTenantLimit)),
      trialTenantLimit: Math.max(1, Number(trialTenantLimit)),
      defaultAllowedProperties: Math.max(1, Number(defaultAllowedProperties)),
      multiPropertyPrice: Math.max(0, Number(multiPropertyPrice)),
      tenantExtensionPrice: Math.max(0, Number(tenantExtensionPrice)),
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    await setDoc(
      doc(db, "platform_admin", "config", "settings", "capacity"),
      payload,
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: "Global platform capacity defaults updated successfully!",
      config: payload,
    });
  } catch (err: any) {
    console.error("POST /api/apex/global-capacity error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update global capacity" },
      { status: 500 }
    );
  }
}
