import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!userId && !email) {
      return NextResponse.json({ hasPending: false, request: null });
    }

    const cleanEmail = (email || "").toLowerCase().trim();
    let pendingRequest: any = null;

    // 1. Check User Document directly (100% permitted and instant)
    if (userId) {
      try {
        const uSnap = await getDoc(doc(db, "users", userId));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          if (uData.pendingPaymentRequest && uData.pendingRequestData) {
            pendingRequest = uData.pendingRequestData;
          }
        }
      } catch (e) {
        console.warn("User doc lookup notice:", e);
      }
    }

    if (!pendingRequest && cleanEmail) {
      try {
        const qUser = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(qUser);
        for (const d of snap.docs) {
          const uData = d.data();
          if (uData.pendingPaymentRequest && uData.pendingRequestData) {
            pendingRequest = uData.pendingRequestData;
            break;
          }
        }
      } catch (e) {
        console.warn("User email lookup notice:", e);
      }
    }

    // 2. Check platform_admin/requests/submissions
    if (!pendingRequest) {
      try {
        const reqCol = collection(db, "platform_admin", "requests", "submissions");
        if (userId) {
          const q = query(reqCol, where("userId", "==", userId), where("status", "==", "PENDING"));
          const snap = await getDocs(q);
          if (!snap.empty) {
            pendingRequest = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        }
        if (!pendingRequest && cleanEmail) {
          const q = query(reqCol, where("customerEmail", "==", cleanEmail), where("status", "==", "PENDING"));
          const snap = await getDocs(q);
          if (!snap.empty) {
            pendingRequest = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        }
      } catch (e) {
        console.warn("platform_admin pending lookup notice:", e);
      }
    }

    // 3. Fallback: Check subscription_requests (if rules allow)
    if (!pendingRequest) {
      try {
        if (userId) {
          const q = query(collection(db, "subscription_requests"), where("userId", "==", userId), where("status", "==", "PENDING"));
          const snap = await getDocs(q);
          if (!snap.empty) {
            pendingRequest = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        }
        if (!pendingRequest && cleanEmail) {
          const q = query(collection(db, "subscription_requests"), where("customerEmail", "==", cleanEmail), where("status", "==", "PENDING"));
          const snap = await getDocs(q);
          if (!snap.empty) {
            pendingRequest = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        }
      } catch (e) {
        console.warn("subscription_requests lookup notice:", e);
      }
    }

    return NextResponse.json({
      hasPending: !!pendingRequest,
      request: pendingRequest,
    });
  } catch (err: any) {
    console.error("GET /api/subscription/pending error:", err);
    return NextResponse.json({ hasPending: false, request: null }, { status: 500 });
  }
}
