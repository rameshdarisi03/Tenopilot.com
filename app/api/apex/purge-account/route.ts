import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, userId, propertyIds = [] } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, message: "⚠️ Email or User ID is required to purge account." },
        { status: 400 }
      );
    }

    const cleanEmail = (email || "").toLowerCase().trim();
    const sanitizedEmail = cleanEmail.replace(/[^a-z0-9]/g, "_");
    let deletedDocsCount = 0;
    let deletedPhotosCount = 0;

    // 1. Delete User Document: users/{userId}
    if (userId) {
      try {
        await deleteDoc(doc(db, "users", userId));
        deletedDocsCount++;
      } catch (e) {
        console.warn(`Failed to delete user doc ${userId}:`, e);
      }
    }

    // 2. Delete Portfolio Document: users/portfolio_{sanitizedEmail}
    if (sanitizedEmail) {
      try {
        await deleteDoc(doc(db, "users", `portfolio_${sanitizedEmail}`));
        deletedDocsCount++;
      } catch (e) {
        console.warn(`Failed to delete portfolio doc portfolio_${sanitizedEmail}:`, e);
      }
    }

    // 3. Delete Staff Account: staff_accounts/{email}
    if (cleanEmail) {
      try {
        await deleteDoc(doc(db, "staff_accounts", cleanEmail));
        deletedDocsCount++;
      } catch (e) {
        console.warn(`Failed to delete staff_accounts doc ${cleanEmail}:`, e);
      }
    }

    // 4. Delete Founder Client Record if present
    try {
      const clientsSnap = await getDocs(collection(db, "founder_clients"));
      for (const d of clientsSnap.docs) {
        const data = d.data() as any;
        if (data.ownerEmail?.toLowerCase().trim() === cleanEmail) {
          await deleteDoc(doc(db, "founder_clients", d.id));
          deletedDocsCount++;
        }
      }
    } catch (e) {
      console.warn("Founder clients check error:", e);
    }

    // 5. Deep Purge Properties and all Sub-Collections & Associated Storage Photos
    const explicitProps = Array.isArray(propertyIds) ? propertyIds : [propertyIds];
    const propertyIdSet = new Set<string>(explicitProps.filter(Boolean));

    // Automatically scan & collect all properties associated with this user
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
        console.warn("Auto-discovery of properties for purge warning:", e);
      }
    }

    const propsToPurge = Array.from(propertyIdSet);

    for (const propId of propsToPurge) {
      if (!propId || propId === "sunshine-pg") continue; // Guard master demo sandbox

      // A. Extract and Delete Storage Photo Assets from Complaints Subcollection
      try {
        const complaintsSnap = await getDocs(collection(db, "properties", propId, "complaints"));
        for (const cDoc of complaintsSnap.docs) {
          const cData = cDoc.data() as any;
          const photoUrls = [cData.photoUrl, ...(cData.photoUrls || [])].filter(Boolean);

          for (const pUrl of photoUrls) {
            try {
              if (storage && typeof pUrl === "string" && pUrl.includes("firebasestorage")) {
                const photoRef = ref(storage, pUrl);
                await deleteObject(photoRef);
                deletedPhotosCount++;
              }
            } catch {}
          }
          await deleteDoc(doc(db, "properties", propId, "complaints", cDoc.id));
          deletedDocsCount++;
        }
      } catch (e) {
        console.warn(`Complaints subcollection purge error on ${propId}:`, e);
      }

      // B. Extract and Delete Storage Photo Assets from Occupants Subcollection (Aadhaar & KYC Photos)
      try {
        const occupantsSnap = await getDocs(collection(db, "properties", propId, "occupants"));
        for (const oDoc of occupantsSnap.docs) {
          const oData = oDoc.data() as any;
          const kycUrls = [oData.photoUrl, oData.aadhaarFrontUrl, oData.aadhaarBackUrl, oData.idProofUrl].filter(Boolean);

          for (const kUrl of kycUrls) {
            try {
              if (storage && typeof kUrl === "string" && kUrl.includes("firebasestorage")) {
                const kycRef = ref(storage, kUrl);
                await deleteObject(kycRef);
                deletedPhotosCount++;
              }
            } catch {}
          }
          await deleteDoc(doc(db, "properties", propId, "occupants", oDoc.id));
          deletedDocsCount++;
        }
      } catch (e) {
        console.warn(`Occupants subcollection purge error on ${propId}:`, e);
      }

      // C. Extract and Cascade Delete Staff Subcollection & Global staff_accounts Docs
      try {
        const staffSnap = await getDocs(collection(db, "properties", propId, "staff"));
        for (const sDoc of staffSnap.docs) {
          const sData = sDoc.data() as any;
          if (sData.email) {
            try {
              await deleteDoc(doc(db, "staff_accounts", sData.email.toLowerCase().trim()));
              deletedDocsCount++;
            } catch {}
          }
          await deleteDoc(doc(db, "properties", propId, "staff", sDoc.id));
          deletedDocsCount++;
        }
      } catch (e) {
        console.warn(`Staff subcollection purge error on ${propId}:`, e);
      }

      // D. Delete Settings & Layout Subcollections
      try {
        await deleteDoc(doc(db, `properties/${propId}/settings/config`));
        deletedDocsCount++;
      } catch {}

      try {
        await deleteDoc(doc(db, `properties/${propId}/layout/floors`));
        deletedDocsCount++;
      } catch {}

      // E. Delete Main Property Document
      try {
        await deleteDoc(doc(db, "properties", propId));
        deletedDocsCount++;
      } catch (e) {
        console.warn(`Property doc deletion error on ${propId}:`, e);
      }
    }

    // 6. Delete VIP Invite from founder_invites if present
    try {
      const invSnap = await getDocs(collection(db, "founder_invites"));
      for (const invDoc of invSnap.docs) {
        const invData = invDoc.data() as any;
        if (invData.ownerEmail?.toLowerCase().trim() === cleanEmail) {
          await deleteDoc(doc(db, "founder_invites", invDoc.id));
          deletedDocsCount++;
        }
      }
    } catch (e) {
      console.warn("Founder invites purge error:", e);
    }

    return NextResponse.json({
      success: true,
      message: `🎉 Deep Purge Complete: Removed ${deletedDocsCount} Firestore documents and ${deletedPhotosCount} Storage photos for ${cleanEmail}. Zero footprints left behind.`,
      purgedCounts: {
        firestoreDocs: deletedDocsCount,
        storagePhotos: deletedPhotosCount,
      },
    });
  } catch (err: any) {
    console.error("POST /api/apex/purge-account error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to purge account data" },
      { status: 500 }
    );
  }
}
