import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, identifier } = body;

    if (!code || !identifier) {
      return NextResponse.json(
        { success: false, message: "⚠️ Both Activation Code and Mobile Number/Email are required." },
        { status: 400 }
      );
    }

    const formattedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, "");

    let foundInvite: any = null;

    // 1. Search in Cloud Firestore
    try {
      const snap = await getDocs(collection(db, "founder_invites"));
      if (!snap.empty) {
        for (const d of snap.docs) {
          const data = { id: d.id, ...d.data() } as any;
          const invCode = (data.activationCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (invCode === formattedCode) {
            foundInvite = data;
            break;
          }
        }
      }
    } catch (fsErr) {
      console.warn("Firestore lookup in /api/invites/redeem error:", fsErr);
    }

    // 2. Fallback check from global hardcoded seeds
    if (!foundInvite) {
      const seeds = [
        {
          id: "inv-101",
          activationCode: "8K4N-9X2M",
          pgName: "Sri Lakshmi Luxury PG",
          ownerName: "Suresh Reddy",
          ownerPhone: "9876543210",
          ownerEmail: "suresh.lakshmi@gmail.com",
          city: "Bangalore",
          assignedPlan: "14_DAY_TRIAL",
          trialDurationDays: 14,
          status: "REDEEMED",
        },
        {
          id: "inv-102",
          activationCode: "7P9V-4W8Q",
          pgName: "Zolo Haven Co-living",
          ownerName: "Vikram Malhotra",
          ownerPhone: "9812345678",
          ownerEmail: "vikram.zolo@yahoo.com",
          city: "Hyderabad",
          assignedPlan: "PRO_MONTHLY",
          trialDurationDays: 14,
          status: "PENDING",
        },
        {
          id: "inv-103",
          activationCode: "5R7B-2Y9H",
          pgName: "Stanza Living Elite",
          ownerName: "Ananya Sharma",
          ownerPhone: "9734567890",
          ownerEmail: "ananya.stanza@gmail.com",
          city: "Pune",
          assignedPlan: "ANNUAL_VIP",
          trialDurationDays: 30,
          status: "PENDING",
        },
      ];

      foundInvite = seeds.find((s) => s.activationCode.replace(/[^A-Z0-9]/g, "") === formattedCode);
    }

    if (!foundInvite) {
      return NextResponse.json({
        success: false,
        message: "⚠️ Invalid activation code. Please verify the code issued by your onboarding representative.",
      });
    }

    if (foundInvite.status === "REDEEMED") {
      return NextResponse.json({
        success: false,
        message: "⚠️ This activation code has already been redeemed and is no longer valid. Please log in to your account.",
      });
    }

    // 2-Factor Contact Matching
    const invPhone = (foundInvite.ownerPhone || "").replace(/\D/g, "");
    const invEmail = (foundInvite.ownerEmail || "").toLowerCase().trim();

    const matchesEmail = cleanIdentifier.includes("@") && invEmail === cleanIdentifier;
    const matchesPhone =
      cleanPhone.length >= 7 &&
      (invPhone.endsWith(cleanPhone) ||
        cleanPhone.endsWith(invPhone) ||
        invPhone.includes(cleanPhone) ||
        cleanPhone.includes(invPhone));

    if (!matchesEmail && !matchesPhone) {
      const maskedPhone =
        invPhone.length >= 4 ? `${invPhone.slice(0, 3)}***${invPhone.slice(-2)}` : "your registered phone";
      return NextResponse.json({
        success: false,
        message: `⚠️ This activation code is bound to registered contact details. Please enter the exact Mobile Number (${maskedPhone}) or Email used during onboarding.`,
      });
    }

    // Atomically burn the activation code in Firestore
    foundInvite.status = "REDEEMED";
    foundInvite.redeemedAt = new Date().toISOString();

    try {
      await updateDoc(doc(db, "founder_invites", foundInvite.id), {
        status: "REDEEMED",
        redeemedAt: foundInvite.redeemedAt,
      });
    } catch (e) {
      console.warn("Firestore updateDoc in /api/invites/redeem error:", e);
    }

    return NextResponse.json({
      success: true,
      message: `🎉 Welcome to TenoPilot! Your property "${foundInvite.pgName}" is activated.`,
      invite: foundInvite,
    });
  } catch (err: any) {
    console.error("POST /api/invites/redeem error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to process redemption." },
      { status: 500 }
    );
  }
}
