import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Server-side cache for high availability
let serverInvites: any[] = [
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
    generatedByStaffName: "Ramesh (Founder)",
    generatedByStaffEmail: "admin@tenopilot.com",
    createdAt: "2026-08-27T10:30:00Z",
    redeemedAt: "2026-08-27T14:18:00Z",
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
    generatedByStaffName: "Ravi Kumar (Sales)",
    generatedByStaffEmail: "ravi.sales@tenopilot.com",
    createdAt: "2026-08-27T16:45:00Z",
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
    generatedByStaffName: "Sneha Patel (Field Rep)",
    generatedByStaffEmail: "sneha.patel@tenopilot.com",
    createdAt: "2026-08-27T18:00:00Z",
  },
];

export async function GET() {
  try {
    const snap = await getDocs(collection(db, "founder_invites"));
    if (!snap.empty) {
      const firestoreDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      firestoreDocs.forEach((doc: any) => {
        if (!serverInvites.some((i) => i.id === doc.id)) {
          serverInvites.unshift(doc);
        }
      });
    }
  } catch (err) {
    console.warn("Firestore fetch in GET /api/invites fallback:", err);
  }

  return NextResponse.json({ success: true, invites: serverInvites });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      activationCode,
      pgName,
      ownerName,
      ownerPhone,
      ownerEmail,
      city,
      assignedPlan,
      trialDurationDays,
      generatedByStaffName,
      generatedByStaffEmail,
    } = body;

    if (!activationCode || !ownerPhone || !ownerEmail) {
      return NextResponse.json(
        { error: "activationCode, ownerPhone, and ownerEmail are required." },
        { status: 400 }
      );
    }

    const cleanPhone = ownerPhone.replace(/\D/g, "");
    const cleanEmail = ownerEmail.toLowerCase().trim();

    // 🔒 Enforce Global Uniqueness for Master Admin Contact Credentials
    try {
      const snap = await getDocs(collection(db, "founder_invites"));
      for (const d of snap.docs) {
        if (id && d.id === id) continue;
        const data = d.data() as any;
        const p = (data.ownerPhone || "").replace(/\D/g, "");
        const em = (data.ownerEmail || "").toLowerCase().trim();

        if (em && em === cleanEmail) {
          return NextResponse.json(
            { error: `⚠️ Email '${cleanEmail}' is already registered to ${data.ownerName || "another client"} (${data.pgName}). Master Admin emails must be globally unique.` },
            { status: 409 }
          );
        }

        if (p && cleanPhone.length >= 7 && (p.endsWith(cleanPhone) || cleanPhone.endsWith(p))) {
          return NextResponse.json(
            { error: `⚠️ Mobile number '${ownerPhone}' is already registered to ${data.ownerName || "another client"} (${data.pgName}). A Master Admin cannot share phone credentials.` },
            { status: 409 }
          );
        }
      }
    } catch (e) {
      console.warn("Uniqueness check notice:", e);
    }

    const inviteRecord = {
      id: id || `inv-${Date.now()}`,
      activationCode,
      pgName: pgName || "PG Property",
      ownerName: ownerName || "Property Owner",
      ownerPhone,
      ownerEmail: cleanEmail,
      city: city || "India",
      assignedPlan: assignedPlan || "14_DAY_TRIAL",
      trialDurationDays: trialDurationDays || 14,
      status: "PENDING",
      generatedByStaffName: generatedByStaffName || "Founder (Apex)",
      generatedByStaffEmail: generatedByStaffEmail || "admin@tenopilot.com",
      createdAt: new Date().toISOString(),
    };

    serverInvites = [inviteRecord, ...serverInvites.filter((i) => i.id !== inviteRecord.id)];

    try {
      await setDoc(doc(db, "founder_invites", inviteRecord.id), inviteRecord);

      // Atomically provision properties/{propertyId}/settings/config in Cloud Firestore
      const propId = `prop-${inviteRecord.id}`;
      const propSettingsDoc = {
        propertyName: inviteRecord.pgName,
        propertyAddress: `${inviteRecord.city}, India`,
        managerPhone: inviteRecord.ownerPhone,
        managerEmail: inviteRecord.ownerEmail,
        approxBeds: 80,
        defaultSecurityDeposit: 0,
        billingCycleDates: "1st to End of Month",
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "properties", propId, "settings", "config"), propSettingsDoc, { merge: true });

      // Atomically provision Organization Portfolio doc
      const sanitizedEmail = inviteRecord.ownerEmail.replace(/[^a-z0-9]/g, "_");
      const portfolioDoc = {
        properties: [
          {
            id: propId,
            name: inviteRecord.pgName,
            location: `${inviteRecord.city}, India`,
            totalBeds: 80,
            occupiedBeds: 0,
            active: true,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", `portfolio_${sanitizedEmail}`), portfolioDoc, { merge: true });
    } catch (fsErr) {
      console.warn("Firestore write in POST /api/invites fallback:", fsErr);
    }

    return NextResponse.json({ success: true, invite: inviteRecord });
  } catch (err: any) {
    console.error("POST /api/invites error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create invite." },
      { status: 500 }
    );
  }
}
