import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, getDocs, collection, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "⚠️ Mobile Number or Email is required." },
        { status: 400 }
      );
    }

    const isAutoLink = !code || code === "AUTO" || code === "GOOGLE_AUTO_LINK";
    const formattedCode = code ? code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, "");

    let foundInvite: any = null;
    const allInvites: any[] = [];

    // 1. Query Cloud Firestore
    try {
      const snap = await getDocs(collection(db, "founder_invites"));
      if (!snap.empty) {
        for (const d of snap.docs) {
          const data = { id: d.id, ...d.data() } as any;
          allInvites.push(data);
        }
      }
    } catch (fsErr) {
      console.warn("Firestore lookup in /api/invites/redeem error:", fsErr);
    }

    // 2. Default hardcoded seeds fallback
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

    seeds.forEach((s) => {
      if (!allInvites.some((i) => i.id === s.id)) {
        allInvites.push(s);
      }
    });

    if (isAutoLink) {
      // 🪄 Auto-Link Mode: Find invite by email address or mobile number
      foundInvite = allInvites.find((inv) => {
        const invEmail = (inv.ownerEmail || "").toLowerCase().trim();
        const invPhone = (inv.ownerPhone || "").replace(/\D/g, "");
        const emailMatch = cleanIdentifier.includes("@") && invEmail === cleanIdentifier;
        const phoneMatch = cleanPhone.length >= 7 && (invPhone.endsWith(cleanPhone) || cleanPhone.endsWith(invPhone));
        return emailMatch || phoneMatch;
      });

      if (!foundInvite) {
        return NextResponse.json({
          success: false,
          autoLinked: false,
          message: `⚠️ No pending activation pass found for ${cleanIdentifier}. Please enter your Activation Code.`,
        });
      }
    } else {
      // 🔑 Code-based Mode: Find invite by activation code
      foundInvite = allInvites.find((inv) => {
        const invCode = (inv.activationCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        return invCode === formattedCode;
      });

      if (!foundInvite) {
        return NextResponse.json({
          success: false,
          message: "⚠️ Invalid activation code. Please verify the code issued by your onboarding representative.",
        });
      }

      // 2-Factor Contact Matching for manual code entry
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
    }

    // Check if code was already redeemed
    if (foundInvite.status === "REDEEMED") {
      return NextResponse.json({
        success: true,
        alreadyRedeemed: true,
        message: `Welcome back! "${foundInvite.pgName}" is already activated.`,
        invite: foundInvite,
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

      // Atomically guarantee properties/{propertyId}/settings/config exists
      const propId = `prop-${foundInvite.id}`;
      const propSettingsDoc = {
        propertyName: foundInvite.pgName,
        propertyAddress: `${foundInvite.city || "Bengaluru"}, India`,
        managerPhone: foundInvite.ownerPhone || "",
        managerEmail: foundInvite.ownerEmail || "",
        approxBeds: foundInvite.approxBeds || 80,
        defaultSecurityDeposit: 0,
        billingCycleDates: "1st to End of Month",
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "properties", propId, "settings", "config"), propSettingsDoc, { merge: true });

      // Atomically update Organization Portfolio document
      const sanitizedEmail = (foundInvite.ownerEmail || cleanIdentifier).replace(/[^a-z0-9]/g, "_");
      const portfolioDoc = {
        properties: [
          {
            id: propId,
            name: foundInvite.pgName,
            location: `${foundInvite.city || "Bengaluru"}, India`,
            totalBeds: foundInvite.approxBeds || 80,
            occupiedBeds: 0,
            active: true,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", `portfolio_${sanitizedEmail}`), portfolioDoc, { merge: true });
    } catch (e) {
      console.warn("Firestore updateDoc in /api/invites/redeem error:", e);
    }

    return NextResponse.json({
      success: true,
      autoLinked: isAutoLink,
      message: `🎉 Welcome to TenoPilot! Your property "${foundInvite.pgName}" has been activated.`,
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
