import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

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

    const staffMap = new Map<string, any>();

    // 1. Scan global staff_accounts collection
    try {
      const snap = await getDocs(collection(db, "staff_accounts"));
      snap.forEach((d) => {
        const data = d.data();
        const email = (data.email || d.id || "").toLowerCase().trim();
        const createdBy = (data.createdByEmail || "").toLowerCase().trim();
        const dataOrgId = data.orgId || "";
        const assigned = Array.isArray(data.assignedPropertyIds) ? data.assignedPropertyIds : [data.assignedPropertyId].filter(Boolean);

        // Match if created by this client, or matching org, or matches client's properties, or matching client's email domain
        const isClientOwner = clientEmail && email === clientEmail;
        const isCreatedByClient = clientEmail && createdBy === clientEmail;
        const isOrgMatch = orgId && dataOrgId === orgId;
        const isPropMatch = propertyIds.some((pId) => assigned.includes(pId) || assigned.includes("*"));
        const isDomainMatch = clientEmail && clientEmail.includes("@") && email.endsWith(`@${clientEmail.split("@")[1]}`);

        if (isClientOwner || isCreatedByClient || isOrgMatch || isPropMatch || isDomainMatch || !clientEmail) {
          staffMap.set(email || d.id, {
            id: data.id || d.id,
            name: data.name || (email ? email.split("@")[0] : "Staff Member"),
            email: email || data.email || "staff@tenopilot.com",
            phone: data.phone || "",
            role: data.role || (isClientOwner ? "master_admin" : "admin"),
            assignedPropertyId: data.assignedPropertyId || propertyIds[0] || "All Properties",
            assignedPropertyIds: assigned.length > 0 ? assigned : ["*"],
            propertyName: data.propertyName || (assigned.includes("*") ? "All Buildings (Global Admin)" : "Assigned Property"),
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

    // 2. Scan per-property staff subcollections if specific propertyIds provided
    for (const propId of propertyIds) {
      try {
        const propStaffSnap = await getDocs(collection(db, `properties/${propId}/staff`));
        propStaffSnap.forEach((d) => {
          const data = d.data();
          const email = (data.email || d.id || "").toLowerCase().trim();
          if (!staffMap.has(email)) {
            staffMap.set(email, {
              id: data.id || d.id,
              name: data.name || (email ? email.split("@")[0] : "Staff Member"),
              email: email || data.email,
              phone: data.phone || "",
              role: data.role || "receptionist",
              assignedPropertyId: propId,
              assignedPropertyIds: [propId],
              propertyName: data.propertyName || propId,
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
    const roleOrder: Record<string, number> = { master_admin: 1, admin: 2, receptionist: 3 };
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
