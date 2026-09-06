import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      maxPropertiesAllowed,
      maxTenantsLimit,
      tenantExtensionPacks,
      updatedBy = "Founder Console",
    } = body;

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, message: "Missing userId or email" },
        { status: 400 }
      );
    }

    const cleanEmail = (email || "").toLowerCase().trim();
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updatedAt: nowIso,
      lastModifiedBy: updatedBy,
    };

    if (maxPropertiesAllowed !== undefined) {
      updatePayload.maxPropertiesAllowed = Number(maxPropertiesAllowed);
    }
    if (maxTenantsLimit !== undefined) {
      updatePayload.maxTenantsLimit = Number(maxTenantsLimit);
    }
    if (tenantExtensionPacks !== undefined) {
      updatePayload.tenantExtensionPacks = Number(tenantExtensionPacks);
    }

    // 1. Update users collection by userId
    if (userId) {
      await setDoc(doc(db, "users", userId), updatePayload, { merge: true });
    }

    // 2. Also update by email query
    if (cleanEmail) {
      const q = query(collection(db, "users"), where("email", "==", cleanEmail));
      const snap = await getDocs(q);
      for (const uDoc of snap.docs) {
        await setDoc(doc(db, "users", uDoc.id), updatePayload, { merge: true });
      }

      // Also persist to founder_clients for SSOT consistency
      try {
        await setDoc(
          doc(db, "founder_clients", cleanEmail),
          updatePayload,
          { merge: true }
        );
      } catch (fcErr) {
        console.warn("founder_clients capacity sync notice:", fcErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Capacity limits updated successfully!`,
      limits: updatePayload,
    });
  } catch (err: any) {
    console.error("POST /api/apex/update-limits error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update limits" },
      { status: 500 }
    );
  }
}
