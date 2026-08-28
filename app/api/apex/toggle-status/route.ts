import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, newStatus } = body;

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, message: "User ID or Email is required" },
        { status: 400 }
      );
    }

    const statusToSet = newStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";

    // 1. Update user document if userId is present
    if (userId) {
      try {
        await updateDoc(doc(db, "users", userId), {
          status: statusToSet,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn(`User doc status update warning for ${userId}:`, e);
      }
    }

    // 2. Update staff_accounts document
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      try {
        await updateDoc(doc(db, "staff_accounts", cleanEmail), {
          status: statusToSet === "SUSPENDED" ? "Suspended" : "Active",
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn(`Staff doc status update warning for ${cleanEmail}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      newStatus: statusToSet,
      message: `Account status updated to ${statusToSet}`,
    });
  } catch (err: any) {
    console.error("POST /api/apex/toggle-status error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update account status" },
      { status: 500 }
    );
  }
}
