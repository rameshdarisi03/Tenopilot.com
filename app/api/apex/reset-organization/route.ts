import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, getDocs, collection, deleteDoc, setDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, userId, propertyIds = [] } = body;

    if (!action || !["RESET_TENANTS", "RESET_PROPERTY_CONFIG"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "⚠️ Valid action ('RESET_TENANTS' or 'RESET_PROPERTY_CONFIG') is required." },
        { status: 400 }
      );
    }

    if (!email && !userId && (!propertyIds || propertyIds.length === 0)) {
      return NextResponse.json(
        { success: false, message: "⚠️ Organization email, user ID, or property IDs are required." },
        { status: 400 }
      );
    }

    const cleanEmail = (email || "").toLowerCase().trim();

    // 1. Resolve all property IDs associated with this customer / account
    const propertyIdSet = new Set<string>((Array.isArray(propertyIds) ? propertyIds : [propertyIds]).filter(Boolean));

    if (cleanEmail || userId) {
      try {
        const propsSnap = await getDocs(collection(db, "properties"));
        for (const pDoc of propsSnap.docs) {
          const pData = pDoc.data() as any;
          if (
            (cleanEmail && pData.ownerEmail?.toLowerCase().trim() === cleanEmail) ||
            (cleanEmail && pData.email?.toLowerCase().trim() === cleanEmail) ||
            (userId && pData.ownerUid === userId)
          ) {
            propertyIdSet.add(pDoc.id);
          }
        }
      } catch (e) {
        console.warn("Property auto-discovery error:", e);
      }
    }

    const targetProps = Array.from(propertyIdSet);
    let deletedTenantsCount = 0;
    let deletedPhotosCount = 0;
    let resetLayoutsCount = 0;

    // Guard against accidentally wiping master demo sandbox if it happens to be in list
    const validTargetProps = targetProps.filter((pid) => pid && pid !== "sunshine-pg");

    if (validTargetProps.length === 0) {
      return NextResponse.json({
        success: false,
        message: "⚠️ No valid properties found to reset for this organization.",
      });
    }

    // =========================================================================
    // ACTION 1: RESET TENANTS
    // =========================================================================
    if (action === "RESET_TENANTS") {
      for (const propId of validTargetProps) {
        // A. Delete all occupant records and their storage photos/documents
        try {
          const occupantsSnap = await getDocs(collection(db, "properties", propId, "occupants"));
          for (const oDoc of occupantsSnap.docs) {
            const oData = oDoc.data() as any;
            const kycUrls = [
              oData.photoUrl,
              oData.avatar,
              oData.aadhaarFrontUrl,
              oData.aadhaarBackUrl,
              oData.idProofUrl,
            ].filter(Boolean);

            for (const kUrl of kycUrls) {
              try {
                if (storage && typeof kUrl === "string" && kUrl.includes("firebasestorage")) {
                  const kycRef = ref(storage, kUrl);
                  await deleteObject(kycRef);
                  deletedPhotosCount++;
                }
              } catch (storageErr) {
                // Ignore storage missing errors
              }
            }

            await deleteDoc(doc(db, "properties", propId, "occupants", oDoc.id));
            deletedTenantsCount++;
          }
        } catch (e) {
          console.warn(`Error purging occupants for property ${propId}:`, e);
        }

        // B. Reset bed occupancy in layout structure: set all beds to Available/Vacant
        try {
          const layoutDocRef = doc(db, `properties/${propId}/layout/structure`);
          const layoutSnap = await getDoc(layoutDocRef);

          if (layoutSnap.exists()) {
            const layoutData = layoutSnap.data();
            const floors = layoutData?.floors || [];

            if (Array.isArray(floors) && floors.length > 0) {
              const updatedFloors = floors.map((floor: any) => ({
                ...floor,
                rooms: (floor.rooms || []).map((room: any) => ({
                  ...room,
                  beds: (room.beds || []).map((bed: any) => ({
                    ...bed,
                    status: "Available",
                    isOccupied: false,
                    occupant: undefined,
                    occupantId: undefined,
                    occupantName: undefined,
                    vacatingDate: undefined,
                    guestCheckoutDate: undefined,
                  })),
                })),
              }));

              await setDoc(
                layoutDocRef,
                {
                  floors: updatedFloors,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
              resetLayoutsCount++;
            }
          }
        } catch (e) {
          console.warn(`Error resetting bed occupancy for property ${propId}:`, e);
        }
      }

      return NextResponse.json({
        success: true,
        action: "RESET_TENANTS",
        deletedTenantsCount,
        deletedPhotosCount,
        propertiesAffected: validTargetProps.length,
        message: `Successfully wiped ${deletedTenantsCount} tenant(s) and associated KYC storage files across ${validTargetProps.length} property(ies). All beds are reset to Vacant.`,
      });
    }

    // =========================================================================
    // ACTION 2: RESET PROPERTY CONFIG
    // =========================================================================
    if (action === "RESET_PROPERTY_CONFIG") {
      for (const propId of validTargetProps) {
        // A. Delete layout structure doc or reset to empty
        try {
          await deleteDoc(doc(db, `properties/${propId}/layout/structure`));
          await deleteDoc(doc(db, `properties/${propId}/layout/floors`));
          resetLayoutsCount++;
        } catch (e) {
          console.warn(`Error deleting layout structure for ${propId}:`, e);
        }

        // B. Delete config / settings doc
        try {
          await deleteDoc(doc(db, `properties/${propId}/settings/config`));
        } catch (e) {
          console.warn(`Error deleting config for ${propId}:`, e);
        }
      }

      return NextResponse.json({
        success: true,
        action: "RESET_PROPERTY_CONFIG",
        resetLayoutsCount,
        propertiesAffected: validTargetProps.length,
        message: `Successfully wiped layout structure and configurations for ${validTargetProps.length} property(ies). Properties are now reset to a blank canvas.`,
      });
    }

    return NextResponse.json({ success: false, message: "Unhandled action" }, { status: 400 });
  } catch (error: any) {
    console.error("Reset organization error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
