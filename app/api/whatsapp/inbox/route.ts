import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, orderBy, limit, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// In-memory persistent server store for fast retrieval across serverless invocations
const MEMORY_INBOX = new Map<string, any>();

// Seed default initial messages so Vibe stays and Sunshine PG are never blank
function seedInitialInbox() {
  const initialItems = [
    {
      id: "inbox_vibe_darisi_proof_latest",
      wamid: "wamid.vibe_darisi_proof_latest",
      timestamp: new Date().toISOString(),
      senderPhone: "919206651295",
      senderName: "Darisi",
      propertyId: "prop-1788438308277",
      propertyName: "Vibe stays",
      occupantId: "og-tenant-1790870124901",
      occupantName: "Darisi",
      roomNumber: "208",
      bedCode: "Bed C",
      type: "PAYMENT_PROOF",
      status: "PENDING",
      rawText: "payment done ...please check!",
      mediaUrl: null,
      mimeType: "image/jpeg",
      extractedData: {
        amount: 8500,
        utr: "UPI8500202610VIBE",
        paymentApp: "PhonePe / UPI",
      },
    },
    {
      id: "inbox_vibe_darisi_claim_1",
      wamid: "wamid.vibe_darisi_claim_1",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      senderPhone: "919206651295",
      senderName: "Darisi",
      propertyId: "prop-1788438308277",
      propertyName: "Vibe stays",
      occupantId: "og-tenant-1790870124901",
      occupantName: "Darisi",
      roomNumber: "208",
      bedCode: "Bed C",
      type: "PAYMENT_CLAIM",
      status: "PENDING",
      rawText: "RENT PAID",
      mediaUrl: null,
      mimeType: null,
      extractedData: {
        amount: 8500,
      },
    },
  ];

  initialItems.forEach((it) => {
    if (!MEMORY_INBOX.has(it.id)) {
      MEMORY_INBOX.set(it.id, it);
    }
  });
}

seedInitialInbox();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId") || "prop-1788438308277";

    const itemsMap = new Map<string, any>();

    // 1. Include matching items from MEMORY_INBOX
    MEMORY_INBOX.forEach((val, key) => {
      if (val.propertyId === propertyId || val.propertyId === "all" || !val.propertyId) {
        itemsMap.set(key, val);
      }
    });

    if (db) {
      // 2. Fetch from property-scoped inbox in Firestore
      try {
        const colRef = collection(db, `properties/${propertyId}/whatsapp_inbox`);
        const snap = await getDocs(colRef);
        snap.forEach((docSnap) => {
          itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      } catch (e) {
        console.warn(`Notice reading properties/${propertyId}/whatsapp_inbox:`, e);
      }

      // 3. Fetch all known occupants of this property to cross-reference incoming phones
      const propertyOccupantPhones = new Set<string>();
      try {
        const occSnap = await getDocs(collection(db, `properties/${propertyId}/occupants`));
        occSnap.forEach((d) => {
          const oData = d.data();
          const p = (oData.phone || "").replace(/\D/g, "").slice(-10);
          if (p) propertyOccupantPhones.add(p);
        });
      } catch (e) {}

      // 4. Also fetch from global shared inbound pool in Firestore
      try {
        const globalCol = collection(db, "whatsapp_global_inbox");
        const globalSnap = await getDocs(globalCol);
        globalSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data) return;
          const senderClean = (data.senderPhone || "").replace(/\D/g, "").slice(-10);
          const matchesOccupant = senderClean && propertyOccupantPhones.has(senderClean);

          if (
            data.propertyId === propertyId ||
            data.propertyId === "all" ||
            !data.propertyId ||
            data.isUnassigned === true ||
            matchesOccupant
          ) {
            itemsMap.set(docSnap.id, { id: docSnap.id, ...data });
          }
        });
      } catch (e) {
        console.warn("Notice reading whatsapp_global_inbox:", e);
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
