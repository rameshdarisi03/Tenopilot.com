import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { SelfKycInvite } from "@/lib/selfKycStore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const paramPropId = searchParams.get("p") || "";

  if (!token) {
    return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
  }

  try {
    // 1. If explicit propertyId provided, check directly
    if (paramPropId) {
      try {
        const invSnap = await getDoc(doc(db, "properties", paramPropId, "self_kyc_invites", token));
        if (invSnap.exists()) {
          return NextResponse.json({
            success: true,
            invite: invSnap.data() as SelfKycInvite,
            propertyId: paramPropId,
          });
        }
      } catch (e) {
        console.warn("API check with explicit propertyId notice:", e);
      }
    }

    // 2. Scan active properties in properties/{propertyId}/self_kyc_invites/{token}
    try {
      const propsSnap = await getDocs(collection(db, "properties"));
      for (const pDoc of propsSnap.docs) {
        const pId = pDoc.id;
        try {
          const invSnap = await getDoc(doc(db, "properties", pId, "self_kyc_invites", token));
          if (invSnap.exists()) {
            return NextResponse.json({
              success: true,
              invite: invSnap.data() as SelfKycInvite,
              propertyId: pId,
            });
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn("API scan properties collection notice:", e);
    }

    // 3. Check root collection self_kyc_invites/{token}
    try {
      const rootSnap = await getDoc(doc(db, "self_kyc_invites", token));
      if (rootSnap.exists()) {
        const inv = rootSnap.data() as SelfKycInvite;
        return NextResponse.json({
          success: true,
          invite: inv,
          propertyId: inv.propertyId || paramPropId || "",
        });
      }
    } catch (e) {
      console.warn("API check root self_kyc_invites notice:", e);
    }

    // 4. Check lookup pointer self_kyc_invite_lookup/{token}
    try {
      const lookupSnap = await getDoc(doc(db, "self_kyc_invite_lookup", token));
      if (lookupSnap.exists()) {
        const { propertyId } = lookupSnap.data() as { propertyId: string };
        if (propertyId) {
          const invSnap = await getDoc(doc(db, "properties", propertyId, "self_kyc_invites", token));
          if (invSnap.exists()) {
            return NextResponse.json({
              success: true,
              invite: invSnap.data() as SelfKycInvite,
              propertyId,
            });
          }
        }
      }
    } catch (e) {
      console.warn("API check lookup pointer notice:", e);
    }

    // 5. Scan portfolio_properties
    try {
      const propsSnap = await getDocs(collection(db, "portfolio_properties"));
      for (const pDoc of propsSnap.docs) {
        const pId = pDoc.id;
        try {
          const invSnap = await getDoc(doc(db, "properties", pId, "self_kyc_invites", token));
          if (invSnap.exists()) {
            return NextResponse.json({
              success: true,
              invite: invSnap.data() as SelfKycInvite,
              propertyId: pId,
            });
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn("API scan portfolio_properties notice:", e);
    }

    // 6. Scan properties referenced by users
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      for (const uDoc of usersSnap.docs) {
        const u = uDoc.data();
        const pId = u.activePropertyId || u.assignedPropertyId;
        if (pId) {
          try {
            const invSnap = await getDoc(doc(db, "properties", pId, "self_kyc_invites", token));
            if (invSnap.exists()) {
              return NextResponse.json({
                success: true,
                invite: invSnap.data() as SelfKycInvite,
                propertyId: pId,
              });
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("API scan users notice:", e);
    }

    return NextResponse.json({ success: false, message: "Invite not found" }, { status: 404 });
  } catch (err: any) {
    console.error("GET /api/self-kyc/invite error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
