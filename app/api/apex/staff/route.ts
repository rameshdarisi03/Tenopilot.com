import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "rediffmail.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "gmx.com",
  "mail.com",
]);

function isValidStaffDoc(id: string, email: string): boolean {
  const lowerId = (id || "").toLowerCase().trim();
  const lowerEmail = (email || "").toLowerCase().trim();

  if (lowerId.startsWith("staff-master_admin-") || lowerId.startsWith("portfolio_") || lowerId.startsWith("mock_")) {
    return false;
  }
  if (!lowerEmail.includes("@") || !lowerEmail.includes(".")) {
    return false;
  }
  if (lowerEmail.startsWith("staff-master_admin-")) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const clientEmail = (searchParams.get("email") || "").toLowerCase().trim();
    const propertyIdsParam = searchParams.get("propertyIds") || "";
    const orgId = searchParams.get("orgId") || "";

    const propertyIds = propertyIdsParam ? propertyIdsParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

    if (!db) {
      return NextResponse.json({ staff: [] }, { status: 200 });
    }

    // Pre-fetch Property Names map for friendly display
    const propertyNameMap = new Map<string, string>();
    try {
      const propSnap = await getDocs(collection(db, "portfolio_properties"));
      propSnap.docs.forEach((d) => {
        const data = d.data();
        const name = data.name || data.propertyName || data.title;
        if (name) propertyNameMap.set(d.id, name);
      });
    } catch (e) {
      console.warn("Notice loading portfolio_properties for staff:", e);
    }

    try {
      const portfoliosSnap = await getDocs(collection(db, "portfolios"));
      portfoliosSnap.docs.forEach((d) => {
        const data = d.data();
        const name = data.name || data.portfolioName || data.title;
        if (name) propertyNameMap.set(d.id, name);
      });
    } catch (e) {
      console.warn("Notice loading portfolios for staff:", e);
    }

    const resolvePropertyName = (propId: string, assigned: string[]): string => {
      if (assigned.includes("*") || propId === "*") return "All Buildings (Global Admin)";
      if (propertyNameMap.has(propId)) return propertyNameMap.get(propId)!;
      if (propId === "sunshine-pg") return "Sunshine Luxury Living";
      if (propId === "vibe-stays") return "Vibe Stays PG";
      return propId || "All Properties";
    };

    const clientDomain = clientEmail.includes("@") ? clientEmail.split("@")[1].toLowerCase() : "";
    const isCorporateDomain = Boolean(clientDomain && !PUBLIC_EMAIL_DOMAINS.has(clientDomain));

    const staffMap = new Map<string, any>();

    // 1. Scan global staff_accounts collection
    try {
      const snap = await getDocs(collection(db, "staff_accounts"));
      snap.forEach((d) => {
        const data = d.data();
        const email = (data.email || d.id || "").toLowerCase().trim();
        const createdBy = (data.createdByEmail || data.ownerEmail || "").toLowerCase().trim();
        const dataOrgId = data.orgId || data.organizationId || "";
        const assigned = Array.isArray(data.assignedPropertyIds)
          ? data.assignedPropertyIds
          : [data.assignedPropertyId].filter(Boolean);

        if (!isValidStaffDoc(d.id, email)) {
          return;
        }

        const isClientOwner = clientEmail && email === clientEmail;
        const isCreatedByClient = clientEmail && createdBy === clientEmail;
        const isOrgMatch = orgId && dataOrgId && dataOrgId === orgId;
        const isPropMatch = propertyIds.length > 0 && propertyIds.some((pId) => assigned.includes(pId));
        const isDomainMatch = isCorporateDomain && email.endsWith(`@${clientDomain}`);

        // Only include if explicitly associated with this client
        if (isClientOwner || isCreatedByClient || isOrgMatch || isPropMatch || isDomainMatch) {
          const primaryPropId = data.assignedPropertyId || assigned[0] || propertyIds[0] || "*";
          const friendlyPropName = data.propertyName || resolvePropertyName(primaryPropId, assigned);

          staffMap.set(email, {
            id: data.id || d.id,
            name: data.name || data.displayName || (email ? email.split("@")[0] : "Staff Member"),
            email: email || data.email,
            phone: data.phone || "",
            role: isClientOwner ? "master_admin" : data.role || "admin",
            assignedPropertyId: primaryPropId,
            assignedPropertyIds: assigned.length > 0 ? assigned : ["*"],
            propertyName: friendlyPropName,
            status: data.status || "Active",
            joinedDate: data.joinedDate || data.createdAt || "Recent",
            securityPin: data.securityPin || null,
            hasSetPin: Boolean(data.hasSetPin || data.securityPin),
          });
        }
      });
    } catch (e) {
      console.warn("Notice scanning staff_accounts collection:", e);
    }

    // 2. Scan per-property staff subcollections for client's specific propertyIds
    for (const propId of propertyIds) {
      try {
        const propStaffSnap = await getDocs(collection(db, `properties/${propId}/staff`));
        propStaffSnap.forEach((d) => {
          const data = d.data();
          const email = (data.email || d.id || "").toLowerCase().trim();

          if (!isValidStaffDoc(d.id, email)) {
            return;
          }

          if (!staffMap.has(email)) {
            const friendlyPropName = data.propertyName || resolvePropertyName(propId, [propId]);
            staffMap.set(email, {
              id: data.id || d.id,
              name: data.name || data.displayName || (email ? email.split("@")[0] : "Staff Member"),
              email: email || data.email,
              phone: data.phone || "",
              role: data.role || "receptionist",
              assignedPropertyId: propId,
              assignedPropertyIds: [propId],
              propertyName: friendlyPropName,
              status: data.status || "Active",
              joinedDate: data.joinedDate || "Recent",
              securityPin: data.securityPin || null,
              hasSetPin: Boolean(data.hasSetPin || data.securityPin),
            });
          }
        });
      } catch (e) {
        // Continue
      }
    }

    const staffList = Array.from(staffMap.values());

    // Sort: master_admin first, then admin, then receptionist
    const roleOrder: Record<string, number> = { master_admin: 1, owner: 1, admin: 2, property_admin: 2, receptionist: 3 };
    staffList.sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99));

    return NextResponse.json({ success: true, staff: staffList, count: staffList.length }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/apex/staff error:", err);
    return NextResponse.json({ success: false, error: err.message, staff: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, staffId, newPin, status } = body;

    if (!email && !staffId) {
      return NextResponse.json({ success: false, message: "Email or staffId required" }, { status: 400 });
    }

    const cleanEmail = (email || "").toLowerCase().trim();
    const nowIso = new Date().toISOString();

    if (action === "RESET_PIN") {
      const pinToSet = newPin || "123456";
      const updateData = {
        securityPin: pinToSet,
        hasSetPin: false, // forces re-verification on login
        pinResetAt: nowIso,
        pinResetBy: "Apex Master Admin",
      };

      try {
        await setDoc(doc(db, "staff_accounts", cleanEmail), updateData, { merge: true });
      } catch (e) {}

      try {
        await setDoc(doc(db, "users", cleanEmail), updateData, { merge: true });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Security PIN reset for ${cleanEmail}! Temporary PIN: ${pinToSet}`,
        tempPin: pinToSet,
      });
    }

    if (action === "TOGGLE_STATUS") {
      const newStatus = status || "Active";
      try {
        await setDoc(doc(db, "staff_accounts", cleanEmail), { status: newStatus, updatedAt: nowIso }, { merge: true });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Status updated to ${newStatus} for ${cleanEmail}!`,
        status: newStatus,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/apex/staff error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
