import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// In-memory persistent server store for fast retrieval across serverless invocations
const MEMORY_INBOX = new Map<string, any>();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId") || "prop-1788438308277";

    const itemsMap = new Map<string, any>();

    // 1. Include active items from MEMORY_INBOX
    MEMORY_INBOX.forEach((val, key) => {
      if (val.status !== "DISMISSED" && val.status !== "RESOLVED") {
        itemsMap.set(key, val);
      }
    });

    if (db) {
      // 2. Fetch from global shared inbound pool in Firestore
      try {
        const globalCol = collection(db, "whatsapp_global_inbox");
        const globalSnap = await getDocs(globalCol);
        globalSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.status !== "DISMISSED" && data.status !== "RESOLVED") {
            itemsMap.set(docSnap.id, { id: docSnap.id, ...data });
          }
        });
      } catch (e) {
        console.warn("Notice reading whatsapp_global_inbox:", e);
      }

      // 3. Fetch from property-scoped inbox in Firestore
      try {
        const colRef = collection(db, `properties/${propertyId}/whatsapp_inbox`);
        const snap = await getDocs(colRef);
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.status !== "DISMISSED" && data.status !== "RESOLVED") {
            itemsMap.set(docSnap.id, { id: docSnap.id, ...data });
          }
        });
      } catch (e) {
        console.warn(`Notice reading properties/${propertyId}/whatsapp_inbox:`, e);
      }

      // 4. Fetch all known properties in portfolio to pull any pending items
      const knownProperties = ["prop-1788438308277", "sunshine-pg"];
      for (const pId of knownProperties) {
        if (pId !== propertyId) {
          try {
            const otherColRef = collection(db, `properties/${pId}/whatsapp_inbox`);
            const otherSnap = await getDocs(otherColRef);
            otherSnap.forEach((docSnap) => {
              const data = docSnap.data();
              if (data && data.status === "PENDING") {
                itemsMap.set(docSnap.id, { id: docSnap.id, ...data });
              }
            });
          } catch (e) {}
        }
      }
    }

    const items = Array.from(itemsMap.values());
    items.sort((a, b) => {
      const tA = new Date(a.timestamp || 0).getTime();
      const tB = new Date(b.timestamp || 0).getTime();
      return tB - tA;
    });

    return NextResponse.json({ items, propertyId, count: items.length }, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching WhatsApp inbox:", err);
    return NextResponse.json({ error: err.message, items: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, item } = body;

    if (!propertyId || !item || !item.id) {
      return NextResponse.json({ error: "Missing propertyId or item payload" }, { status: 400 });
    }

    // Save in memory
    MEMORY_INBOX.set(item.id, { ...item, propertyId });

    // Try saving to Firestore if available
    if (db) {
      try {
        await setDoc(doc(db, `properties/${propertyId}/whatsapp_inbox`, item.id), item, { merge: true });
        await setDoc(doc(db, "whatsapp_global_inbox", item.id), { ...item, propertyId }, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore write notice in POST /api/whatsapp/inbox:", fsErr);
      }
    }

    return NextResponse.json({ success: true, item }, { status: 200 });
  } catch (err: any) {
    console.error("Error saving WhatsApp inbox item:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const itemId = searchParams.get("id");
    const propertyId = searchParams.get("propertyId") || "prop-1788438308277";

    if (!itemId) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    // Remove from in-memory store
    MEMORY_INBOX.delete(itemId);

    // Remove/mark dismissed in Firestore
    if (db) {
      try {
        await deleteDoc(doc(db, `properties/${propertyId}/whatsapp_inbox`, itemId));
        await deleteDoc(doc(db, "whatsapp_global_inbox", itemId));
      } catch (fsErr) {
        console.warn("Firestore delete notice in DELETE /api/whatsapp/inbox:", fsErr);
      }
    }

    return NextResponse.json({ success: true, id: itemId }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting WhatsApp inbox item:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
