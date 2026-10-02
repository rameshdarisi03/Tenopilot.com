import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, orderBy, limit, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId") || "sunshine-pg";

    if (!db) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const itemsMap = new Map<string, any>();

    // 1. Fetch from property-scoped inbox
    try {
      const colRef = collection(db, `properties/${propertyId}/whatsapp_inbox`);
      const snap = await getDocs(colRef);
      snap.forEach((docSnap) => {
        itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.warn(`Notice reading properties/${propertyId}/whatsapp_inbox:`, e);
    }

    // 2. Fetch all known occupants of this property to cross-reference incoming phones
    const propertyOccupantPhones = new Set<string>();
    try {
      const occSnap = await getDocs(collection(db, `properties/${propertyId}/occupants`));
      occSnap.forEach((d) => {
        const oData = d.data();
        const p = (oData.phone || "").replace(/\D/g, "").slice(-10);
        if (p) propertyOccupantPhones.add(p);
      });
    } catch (e) {}

    // 3. Also fetch from global shared inbound pool (fallback, unassigned & multi-property)
    try {
      const globalCol = collection(db, "whatsapp_global_inbox");
      const globalSnap = await getDocs(globalCol);
      globalSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data) return;
        const senderClean = (data.senderPhone || "").replace(/\D/g, "").slice(-10);
        const matchesOccupant = senderClean && propertyOccupantPhones.has(senderClean);

        // Include if explicitly for this property, if unassigned/all, or if sender is occupant of this property
        if (
          data.propertyId === propertyId ||
          data.propertyId === "all" ||
          !data.propertyId ||
          data.isUnassigned === true ||
          matchesOccupant
        ) {
          if (!itemsMap.has(docSnap.id)) {
            itemsMap.set(docSnap.id, { id: docSnap.id, ...data });
          }
        }
      });
    } catch (e) {
      console.warn("Notice reading whatsapp_global_inbox:", e);
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

    if (db) {
      await setDoc(doc(db, `properties/${propertyId}/whatsapp_inbox`, item.id), item, { merge: true });
      await setDoc(doc(db, "whatsapp_global_inbox", item.id), { ...item, propertyId }, { merge: true });
    }

    return NextResponse.json({ success: true, item }, { status: 200 });
  } catch (err: any) {
    console.error("Error saving WhatsApp inbox item:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
