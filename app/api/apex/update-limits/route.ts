import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
      whatsappCreditsLimit,
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
    if (whatsappCreditsLimit !== undefined) {
      updatePayload.whatsappCreditsLimit = Number(whatsappCreditsLimit);
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

    // 3. If whatsappCreditsLimit was provided, also update/topup the primary property's WhatsApp wallet
    if (whatsappCreditsLimit !== undefined) {
      try {
        const propSnap = await getDocs(query(collection(db, "portfolio_properties"), where("ownerEmail", "==", cleanEmail)));
        for (const pDoc of propSnap.docs) {
          const propId = pDoc.id;
          const walletRef = doc(db, `properties/${propId}/whatsapp/wallet`);
          const wSnap = await getDoc(walletRef);
          const currentTxs = wSnap.exists() && Array.isArray(wSnap.data()?.transactions) ? wSnap.data().transactions : [];
          
          const newTx = {
            id: `tx-apex-override-${Date.now()}`,
            type: "STARTER_BONUS",
            amount: Number(whatsappCreditsLimit),
            balanceAfter: Number(whatsappCreditsLimit),
            description: `Apex Command Override: Set to ${whatsappCreditsLimit} WhatsApp Credits (${updatedBy})`,
            timestamp: nowIso,
            status: "DELIVERED",
          };

          await setDoc(
            walletRef,
            {
              credits: Number(whatsappCreditsLimit),
              transactions: [newTx, ...currentTxs].slice(0, 100),
              updatedAt: nowIso,
              updatedBy: updatedBy,
            },
            { merge: true }
          );
        }
      } catch (wErr) {
        console.warn("Notice updating primary property WhatsApp wallet:", wErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Capacity & WhatsApp credit limits updated successfully!`,
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
