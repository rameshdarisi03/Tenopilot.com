import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId") || "prop-1788438308277";

    if (!db) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const colRef = collection(db, `properties/${propertyId}/whatsapp_inbox`);
    const q = query(colRef, orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(q);

    const items: any[] = [];
    snap.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });

    return NextResponse.json({ items, propertyId, count: items.length }, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching WhatsApp inbox:", err);
    return NextResponse.json({ error: err.message, items: [] }, { status: 500 });
  }
}
