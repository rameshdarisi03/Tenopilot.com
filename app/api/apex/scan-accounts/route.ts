import { NextRequest, NextResponse } from "next/server";
import { getDocs, collection, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { evaluateSubscription, SubscriptionStatus } from "@/lib/subscriptionEngine";

export interface ScannedAccountRecord {
  id: string;
  userId?: string;
  email: string;
  displayName: string;
  phone: string;
  role: string;
  organizationId?: string;
  classification: string;
  subscriptionStatus: SubscriptionStatus;
  trialDaysLeft: number;
  graceDaysRemaining?: number;
  planExpiresAt?: string;
  detectionReason: string;
  propertyIds: string[];
  primaryPropertyName?: string;
  city?: string;
  plan?: string;
  totalBeds?: number;
  createdAt: string;
  lastActive?: string;
  hasStorageFootprints?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const scannedAccounts: ScannedAccountRecord[] = [];
    const processedEmails = new Set<string>();

    // 1. Fetch Portfolio Properties to map properties by ownerEmail / organizationId
    const ownerPropertiesMap = new Map<string, { names: string[]; totalBeds: number; city: string; ids: string[] }>();
    try {
      const propSnap = await getDocs(collection(db, "portfolio_properties"));
      propSnap.docs.forEach((d) => {
        const data = d.data() as any;
        const ownerEmail = (data.ownerEmail || "").toLowerCase().trim();
        const orgId = data.organizationId || "";
        const name = String(data.name || data.propertyName || d.id);
        const beds = Number(data.totalBeds) || Number(data.approxBeds) || 40;
        const city = String(data.city || data.location || "Bengaluru");

        const keysToMap = [ownerEmail, orgId].filter(Boolean);
        keysToMap.forEach((key) => {
          const current: { names: string[]; totalBeds: number; city: string; ids: string[] } =
            ownerPropertiesMap.get(key) || { names: [], totalBeds: 0, city: city, ids: [] };
          if (!current.names.includes(name)) current.names.push(name);
          if (!current.ids.includes(d.id)) current.ids.push(d.id);
          current.totalBeds += beds;
          ownerPropertiesMap.set(key, current);
        });
      });
    } catch (e) {
      console.warn("Scanner portfolio_properties fetch warning:", e);
    }

    // 2. Fetch VIP Invites
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

    // 3. Fetch Founder Clients
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

    // 4. Fetch Staff Accounts to exclude non-owner staff
    const staffAccountsSet = new Set<string>();
    try {
      const staffSnap = await getDocs(collection(db, "staff_accounts"));
      staffSnap.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.email) {
          staffAccountsSet.add(data.email.toLowerCase().trim());
        }
      });
    } catch (e) {
      console.warn("Scanner staff_accounts fetch error:", e);
    }

    // 5. Scan Users Collection in Cloud Firestore
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      for (const d of usersSnap.docs) {
        const data = { id: d.id, ...d.data() } as any;
        const email = (data.email || "").toLowerCase().trim();

        // Skip non-user internal doc patterns
        if (d.id.startsWith("portfolio_") || !email) {
          continue;
        }

        const vipInvite = vipInvitesMap.get(email);
        const founderClient = founderClientsMap.get(email);
        const orgId = data.organizationId || "";
        const mappedProps = ownerPropertiesMap.get(email) || (orgId ? ownerPropertiesMap.get(orgId) : null);

        // Exclude internal staff accounts
        const isStaff = staffAccountsSet.has(email) || data.role === "admin" || data.role === "receptionist";
        const isMasterAdmin = data.role === "master_admin" || Boolean(vipInvite) || Boolean(founderClient) || Boolean(mappedProps);

        if (isStaff && !isMasterAdmin) {
          continue;
        }

        processedEmails.add(email);

        const propIds: string[] = [];
        if (data.assignedPropertyId) propIds.push(data.assignedPropertyId);
        if (data.assignedPropertyIds && Array.isArray(data.assignedPropertyIds)) {
          data.assignedPropertyIds.forEach((p: string) => {
            if (!propIds.includes(p)) propIds.push(p);
          });
        }
        if (mappedProps) {
          mappedProps.ids.forEach((id) => {
            if (!propIds.includes(id)) propIds.push(id);
          });
        }
        if (founderClient?.id && !propIds.includes(founderClient.id)) {
          propIds.push(founderClient.id);
        }

        // Compute Live Subscription Lifecycle via SSOT Engine
        const subEvaluation = evaluateSubscription({
          ...data,
          status: data.status || founderClient?.status,
          plan: data.plan || founderClient?.plan,
          planExpiresAt: data.planExpiresAt || founderClient?.planExpiresAt,
          createdAt: data.createdAt || data.updatedAt || founderClient?.createdAt || vipInvite?.createdAt,
        });

        const primaryPropName =
          mappedProps?.names[0] ||
          founderClient?.pgName ||
          vipInvite?.pgName ||
          (propIds.length > 0 ? propIds[0] : "New Property");

        const city = mappedProps?.city || founderClient?.city || vipInvite?.city || "Bengaluru";
        const totalBeds = mappedProps?.totalBeds || founderClient?.totalBeds || vipInvite?.approxBeds || 40;

        scannedAccounts.push({
          id: d.id,
          userId: d.id,
          email: email,
          displayName: data.displayName || founderClient?.ownerName || vipInvite?.ownerName || email.split("@")[0],
          phone: data.phone || vipInvite?.ownerPhone || founderClient?.ownerPhone || "",
          role: data.role || "master_admin",
          organizationId: orgId,
          classification: subEvaluation.status,
          subscriptionStatus: subEvaluation.status,
          trialDaysLeft: subEvaluation.daysRemaining,
          graceDaysRemaining: subEvaluation.graceDaysRemaining,
          planExpiresAt: data.planExpiresAt || founderClient?.planExpiresAt,
          detectionReason: subEvaluation.badgeLabel,
          propertyIds: propIds,
          primaryPropertyName: primaryPropName,
          city: city,
          plan: subEvaluation.plan,
          totalBeds: totalBeds,
          createdAt: data.createdAt || data.updatedAt || founderClient?.createdAt || vipInvite?.createdAt || new Date().toISOString(),
          lastActive: data.lastActive || founderClient?.lastActiveDate || "Recently",
          hasStorageFootprints: propIds.length > 0,
        });
      }
    } catch (e) {
      console.warn("Scanner users collection error:", e);
    }

    // 6. Include any Pending VIP Invites not yet signed up
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
          subscriptionStatus: "TRIAL",
          trialDaysLeft: 10,
          detectionReason: `Issued Activation Pass: ${inv.activationCode} (Awaiting Sign-up)`,
          propertyIds: [`prop-${inv.id}`],
          primaryPropertyName: inv.pgName,
          city: inv.city || "Bengaluru",
          plan: inv.assignedPlan || "10_DAY_TRIAL",
          totalBeds: inv.approxBeds || 40,
          createdAt: inv.createdAt || new Date().toISOString(),
          lastActive: "Not signed in yet",
          hasStorageFootprints: false,
        });
      }
    });

    // Sort: Grace Period & Pre-Expiry first (urgent attention), then Pro, Trial, Expired, Suspended
    const sortWeights: Record<string, number> = {
      GRACE_PERIOD: 1,
      PRO_PRE_EXPIRY: 2,
      ACTIVE_PRO: 3,
      TRIAL: 4,
      EXPIRED: 5,
      SUSPENDED: 6,
    };
    scannedAccounts.sort((a, b) => (sortWeights[a.subscriptionStatus] || 9) - (sortWeights[b.subscriptionStatus] || 9));

    return NextResponse.json({
      success: true,
      totalCount: scannedAccounts.length,
      trialCount: scannedAccounts.filter((a) => a.subscriptionStatus === "TRIAL").length,
      proCount: scannedAccounts.filter((a) => a.subscriptionStatus === "ACTIVE_PRO" || a.subscriptionStatus === "PRO_PRE_EXPIRY").length,
      graceCount: scannedAccounts.filter((a) => a.subscriptionStatus === "GRACE_PERIOD").length,
      preExpiryCount: scannedAccounts.filter((a) => a.subscriptionStatus === "PRO_PRE_EXPIRY").length,
      expiredCount: scannedAccounts.filter((a) => a.subscriptionStatus === "EXPIRED").length,
      suspendedCount: scannedAccounts.filter((a) => a.subscriptionStatus === "SUSPENDED").length,
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
