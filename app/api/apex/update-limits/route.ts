import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      propertyIds,
      maxPropertiesAllowed,
      maxTenantsLimit,
      tenantExtensionPacks,
      whatsappCreditsLimit,
      deltaWhatsAppCredits,
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

    // 3. 🛡️ Resolve ALL property IDs owned by this client across all schema locations
    const targetPropertyIds = new Set<string>();

    if (Array.isArray(propertyIds)) {
      propertyIds.filter(Boolean).forEach((id: string) => targetPropertyIds.add(id));
    }

    const sanitizedEmail = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_");

    // A. Check users/portfolio_{sanitizedEmail}
    if (sanitizedEmail) {
      try {
        const pSnap = await getDoc(doc(db, "users", `portfolio_${sanitizedEmail}`));
        if (pSnap.exists() && Array.isArray(pSnap.data()?.properties)) {
          pSnap.data().properties.forEach((p: any) => {
            if (p?.id) targetPropertyIds.add(p.id);
          });
        }
      } catch (e) {
        console.warn("Notice checking portfolio doc in update-limits:", e);
      }
    }

    // B. Check users/{userId}
    if (userId) {
      try {
        const uSnap = await getDoc(doc(db, "users", userId));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          if (uData?.assignedPropertyId) targetPropertyIds.add(uData.assignedPropertyId);
          if (Array.isArray(uData?.assignedPropertyIds)) {
            uData.assignedPropertyIds.forEach((id: string) => targetPropertyIds.add(id));
          }
        }
      } catch (e) {}

      try {
        const pSnapUid = await getDoc(doc(db, "users", `portfolio_${userId}`));
        if (pSnapUid.exists() && Array.isArray(pSnapUid.data()?.properties)) {
          pSnapUid.data().properties.forEach((p: any) => {
            if (p?.id) targetPropertyIds.add(p.id);
          });
        }
      } catch (e) {}
    }

    // C. Check founder_clients/{cleanEmail}
    if (cleanEmail) {
      try {
        const fcSnap = await getDoc(doc(db, "founder_clients", cleanEmail));
        if (fcSnap.exists()) {
          const fcData = fcSnap.data();
          if (fcData?.propertyId) targetPropertyIds.add(fcData.propertyId);
          if (Array.isArray(fcData?.propertyIds)) {
            fcData.propertyIds.forEach((id: string) => targetPropertyIds.add(id));
          }
        }
      } catch (e) {}

      // D. Check portfolio_properties collection
      try {
        const propSnap = await getDocs(query(collection(db, "portfolio_properties"), where("ownerEmail", "==", cleanEmail)));
        propSnap.docs.forEach((d) => targetPropertyIds.add(d.id));
      } catch (e) {}
    }

    // 4. Update WhatsApp Wallet with additive delta / new limit
    if (whatsappCreditsLimit !== undefined) {
      for (const propId of Array.from(targetPropertyIds)) {
        try {
          const walletRef = doc(db, `properties/${propId}/whatsapp/wallet`);
          const wSnap = await getDoc(walletRef);
          const currentCredits = wSnap.exists() && typeof wSnap.data()?.credits === "number" ? wSnap.data().credits : 0;
          const currentTxs = wSnap.exists() && Array.isArray(wSnap.data()?.transactions) ? wSnap.data().transactions : [];

          // Compute new balance: If deltaWhatsAppCredits was explicitly passed, add it on top of existing credits
          let newBalance = Number(whatsappCreditsLimit);
          let amountDelta = newBalance - currentCredits;

          if (typeof deltaWhatsAppCredits === "number" && deltaWhatsAppCredits !== 0) {
            amountDelta = deltaWhatsAppCredits;
            newBalance = Math.max(0, currentCredits + deltaWhatsAppCredits);
          }

          const newTx = {
            id: `tx-apex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: "PURCHASE" as const,
            amount: amountDelta,
            balanceAfter: newBalance,
            description: amountDelta >= 0
              ? `Apex Command Grant: +${amountDelta} WhatsApp Credits (${updatedBy})`
              : `Apex Command Adjustment: ${amountDelta} WhatsApp Credits (${updatedBy})`,
            timestamp: nowIso,
            status: "DELIVERED" as const,
          };

          await setDoc(
            walletRef,
            {
              credits: newBalance,
              transactions: [newTx, ...currentTxs].slice(0, 100),
              updatedAt: nowIso,
              updatedBy: updatedBy,
            },
            { merge: true }
          );

          // Keep user limit in sync with actual final wallet balance
          updatePayload.whatsappCreditsLimit = newBalance;
          if (userId) {
            await setDoc(doc(db, "users", userId), { whatsappCreditsLimit: newBalance }, { merge: true });
          }
        } catch (wErr) {
          console.warn(`Notice updating property ${propId} WhatsApp wallet:`, wErr);
        }
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
