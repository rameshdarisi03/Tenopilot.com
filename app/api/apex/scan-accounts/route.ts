import { NextRequest, NextResponse } from "next/server";
import { getDocs, collection, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ScannedAccountRecord {
  id: string;
  userId?: string;
  email: string;
  displayName: string;
  phone: string;
  role: string;
  classification: "ACTIVE_VIP" | "BETA_LEGACY" | "PENDING_VIP" | "SUSPENDED";
  detectionReason: string;
  propertyIds: string[];
  primaryPropertyName?: string;
  city?: string;
  plan?: string;
  trialDaysLeft?: number;
  totalBeds?: number;
  createdAt: string;
  lastActive?: string;
  hasStorageFootprints?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const scannedAccounts: ScannedAccountRecord[] = [];
    const processedEmails = new Set<string>();

    // 1. Fetch VIP Invites
    const vipInvitesMap = new Map<string, any>();
    try {
      const invitesSnap = await getDocs(collection(db, "founder_invites"));
      invitesSnap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() } as any;
        if (data.ownerEmail) {
          vipInvitesMap.set(data.ownerEmail.toLowerCase().trim(), data);
        }
      });
    } catch (e) {
      console.warn("Scanner invites fetch error:", e);
    }

    // 2. Fetch Founder Clients
    const founderClientsMap = new Map<string, any>();
    try {
      const clientsSnap = await getDocs(collection(db, "founder_clients"));
      clientsSnap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() } as any;
        if (data.ownerEmail) {
          founderClientsMap.set(data.ownerEmail.toLowerCase().trim(), data);
        }
      });
    } catch (e) {
      console.warn("Scanner founder_clients fetch error:", e);
    }

    // 3. Scan Users Collection in Cloud Firestore
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      for (const d of usersSnap.docs) {
        const data = { id: d.id, ...d.data() } as any;
        const email = (data.email || "").toLowerCase().trim();

        // Skip non-user internal doc patterns like "portfolio_..."
        if (d.id.startsWith("portfolio_")) {
          continue;
        }

        if (!email) continue;
        processedEmails.add(email);

        const vipInvite = vipInvitesMap.get(email);
        const founderClient = founderClientsMap.get(email);

        let classification: "ACTIVE_VIP" | "BETA_LEGACY" | "PENDING_VIP" | "SUSPENDED" = "BETA_LEGACY";
        let detectionReason = "Direct Google / Email login created prior to Founder VIP Gatekeeper";

        if (data.status === "SUSPENDED" || founderClient?.status === "SUSPENDED") {
          classification = "SUSPENDED";
          detectionReason = "Account manually suspended by Founder";
        } else if (vipInvite && vipInvite.status === "REDEEMED") {
          classification = "ACTIVE_VIP";
          detectionReason = `Official VIP Onboarded Pass redeemed (${vipInvite.activationCode || "CODE"})`;
        } else if (founderClient) {
          classification = "ACTIVE_VIP";
          detectionReason = "Active Founder Client Record";
        } else if (vipInvite && vipInvite.status === "PENDING") {
          classification = "PENDING_VIP";
          detectionReason = "Issued VIP Pass awaiting first redemption";
        }

        const propIds: string[] = [];
        if (data.assignedPropertyId) propIds.push(data.assignedPropertyId);
        if (data.assignedPropertyIds && Array.isArray(data.assignedPropertyIds)) {
          data.assignedPropertyIds.forEach((p: string) => {
            if (!propIds.includes(p)) propIds.push(p);
          });
        }
        if (founderClient?.id && !propIds.includes(founderClient.id)) {
          propIds.push(founderClient.id);
        }

        scannedAccounts.push({
          id: d.id,
          userId: d.id,
          email: email,
          displayName: data.displayName || founderClient?.ownerName || email.split("@")[0],
          phone: data.phone || vipInvite?.ownerPhone || founderClient?.ownerPhone || "",
          role: data.role || "master_admin",
          classification: classification,
          detectionReason: detectionReason,
          propertyIds: propIds,
          primaryPropertyName: founderClient?.pgName || vipInvite?.pgName || (propIds.length > 0 ? propIds[0] : "New Property"),
          city: founderClient?.city || vipInvite?.city || "Bengaluru",
          plan: founderClient?.plan || vipInvite?.assignedPlan || (classification === "ACTIVE_VIP" ? "PRO_MONTHLY" : "BETA_TRIAL"),
          totalBeds: founderClient?.totalBeds || vipInvite?.approxBeds || 80,
          createdAt: data.createdAt || founderClient?.createdAt || vipInvite?.createdAt || new Date().toISOString(),
          lastActive: data.lastActive || founderClient?.lastActiveDate || "Recently",
          hasStorageFootprints: propIds.length > 0,
        });
      }
    } catch (e) {
      console.warn("Scanner users collection error:", e);
    }

    // 4. Also include any Pending VIP Invites that have not created a user doc yet
    vipInvitesMap.forEach((inv, email) => {
      if (!processedEmails.has(email)) {
        processedEmails.add(email);
        scannedAccounts.push({
          id: inv.id,
          email: email,
          displayName: inv.ownerName || email.split("@")[0],
          phone: inv.ownerPhone || "",
          role: "master_admin",
          classification: "PENDING_VIP",
          detectionReason: `Issued Activation Pass: ${inv.activationCode} (Awaiting Sign-up)`,
          propertyIds: [`prop-${inv.id}`],
          primaryPropertyName: inv.pgName,
          city: inv.city || "Bengaluru",
          plan: inv.assignedPlan || "14_DAY_TRIAL",
          totalBeds: inv.approxBeds || 80,
          createdAt: inv.createdAt || new Date().toISOString(),
          lastActive: "Not signed in yet",
          hasStorageFootprints: false,
        });
      }
    });

    // Sort: Beta/Legacy first (so founder can inspect/purge), then Active VIP, then Pending
    const sortWeights = { BETA_LEGACY: 1, SUSPENDED: 2, ACTIVE_VIP: 3, PENDING_VIP: 4 };
    scannedAccounts.sort((a, b) => (sortWeights[a.classification] || 9) - (sortWeights[b.classification] || 9));

    return NextResponse.json({
      success: true,
      totalCount: scannedAccounts.length,
      betaCount: scannedAccounts.filter((a) => a.classification === "BETA_LEGACY").length,
      activeVipCount: scannedAccounts.filter((a) => a.classification === "ACTIVE_VIP").length,
      pendingCount: scannedAccounts.filter((a) => a.classification === "PENDING_VIP").length,
      suspendedCount: scannedAccounts.filter((a) => a.classification === "SUSPENDED").length,
      accounts: scannedAccounts,
    });
  } catch (err: any) {
    console.error("GET /api/apex/scan-accounts error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to scan Firestore accounts" },
      { status: 500 }
    );
  }
}
