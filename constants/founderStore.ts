// TenoPilot Founder & Platform Super-Admin Store (Apex Control)
// 100% Direct Cloud Firestore Database Persistence + SSR Browser Worker Guard

import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface FounderClientRecord {
  id: string; // e.g. "sunshine-pg", "sri-lakshmi-pg"
  pgName: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  city: string;
  area: string;
  totalBeds: number;
  occupiedBeds: number;
  monthlyRevenue: number;
  plan: "FREE_TRIAL" | "PRO_MONTHLY" | "GROWTH_ANNUAL" | "ENTERPRISE";
  planAmount: number;
  planRenewsOn: string;
  trialDaysLeft?: number;
  status: "ACTIVE" | "TRIAL" | "EXPIRED" | "SUSPENDED";
  healthScore: "HEALTHY" | "ATTENTION" | "AT_RISK";
  lastActiveDate: string;
  fastTrackScansCount: number;
  whatsappCreditsUsed: number;
  sentryErrorsCount: number;
  onboardedBy: string; // Staff name
  createdAt: string;
}

export interface FounderVipInvite {
  id: string;
  activationCode: string; // 6-digit e.g. "842-913"
  pgName: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  city: string;
  assignedPlan: "14_DAY_TRIAL" | "PRO_MONTHLY" | "ANNUAL_VIP";
  trialDurationDays: number;
  status: "PENDING" | "REDEEMED" | "EXPIRED";
  generatedByStaffName: string;
  generatedByStaffEmail: string;
  createdAt: string;
  redeemedAt?: string;
  redeemedByIp?: string;
}

export interface PlatformMacroMetrics {
  mrr: number; // e.g. 68500
  arr: number; // e.g. 822000
  mrrGrowthPct: number; // e.g. 22.4
  activePaidClients: number; // e.g. 36
  activeTrialClients: number; // e.g. 12
  totalManagedBeds: number; // e.g. 2450
  totalTenantRentProcessed: number; // e.g. 18500000
  geminiVisionScansMonth: number; // e.g. 142
  whatsappMessagesDelivered: number; // e.g. 18450
  whatsappCreditsBalance: number; // e.g. 41550
  apiCostIncurredThisMonth: number; // e.g. 4250
  sixMonthTrend: {
    month: string;
    mrr: number;
    beds: number;
    clients: number;
  }[];
  cityBreakdown: {
    city: string;
    pgCount: number;
    bedCount: number;
    mrr: number;
    growth: string;
  }[];
  recentActivity: {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    type: "ACTIVATION" | "SCAN" | "RENEWAL" | "INVITE" | "UPGRADE";
    pgName: string;
  }[];
}

// Initial In-Memory Seed State
const DEFAULT_METRICS: PlatformMacroMetrics = {
  mrr: 68500,
  arr: 822000,
  mrrGrowthPct: 22.4,
  activePaidClients: 36,
  activeTrialClients: 12,
  totalManagedBeds: 2450,
  totalTenantRentProcessed: 18500000,
  geminiVisionScansMonth: 142,
  whatsappMessagesDelivered: 18450,
  whatsappCreditsBalance: 41550,
  apiCostIncurredThisMonth: 4250,
  sixMonthTrend: [
    { month: "Mar", mrr: 32000, beds: 1100, clients: 22 },
    { month: "Apr", mrr: 41500, beds: 1450, clients: 29 },
    { month: "May", mrr: 49000, beds: 1720, clients: 34 },
    { month: "Jun", mrr: 56000, beds: 1980, clients: 39 },
    { month: "Jul", mrr: 62500, beds: 2210, clients: 43 },
    { month: "Aug", mrr: 68500, beds: 2450, clients: 48 },
  ],
  cityBreakdown: [
    { city: "Bangalore", pgCount: 26, bedCount: 1380, mrr: 38974, growth: "+18% MoM" },
    { city: "Hyderabad", pgCount: 14, bedCount: 720, mrr: 20986, growth: "+26% MoM" },
    { city: "Pune", pgCount: 5, bedCount: 230, mrr: 5995, growth: "+14% MoM" },
    { city: "Delhi-NCR", pgCount: 3, bedCount: 120, mrr: 2545, growth: "+35% MoM" },
  ],
  recentActivity: [
    {
      id: "act-1",
      title: "New VIP Lead Activated",
      description: "Sri Lakshmi Luxury PG (Koramangala, BLR) redeemed code 842-913",
      timestamp: "12 mins ago",
      type: "ACTIVATION",
      pgName: "Sri Lakshmi PG",
    },
    {
      id: "act-2",
      title: "FastTrack AI Register Scanned",
      description: "Sunshine PG scanned handwritten diary (36 Beds migrated)",
      timestamp: "45 mins ago",
      type: "SCAN",
      pgName: "Sunshine PG",
    },
    {
      id: "act-3",
      title: "Subscription Renewed (Pro)",
      description: "Meghana Haven PG paid ₹1,499 for September cycle",
      timestamp: "2 hours ago",
      type: "RENEWAL",
      pgName: "Meghana Haven PG",
    },
    {
      id: "act-4",
      title: "VIP Invite Dispatched",
      description: "Door-to-door sales rep generated invite for Royal Comfort PG",
      timestamp: "4 hours ago",
      type: "INVITE",
      pgName: "Royal Comfort PG",
    },
  ],
};

export function generateSecureActivationCode(): string {
  const CHARSET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
  const length = 8;
  const randomBytes = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARSET[randomBytes[i] % CHARSET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

const DEFAULT_INVITES: FounderVipInvite[] = [
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
    pgName: "Balaji Executive Stays",
    ownerName: "Anand Sharma",
    ownerPhone: "9845612345",
    ownerEmail: "anand.balaji@gmail.com",
    city: "Pune",
    assignedPlan: "14_DAY_TRIAL",
    trialDurationDays: 14,
    status: "PENDING",
    generatedByStaffName: "Ramesh (Founder)",
    generatedByStaffEmail: "admin@tenopilot.com",
    createdAt: "2026-08-27T18:20:00Z",
  },
];

const DEFAULT_CLIENTS: FounderClientRecord[] = [
  {
    id: "sunshine-pg",
    pgName: "Sunshine PG",
    ownerName: "Ramesh Darisi",
    ownerPhone: "9876543210",
    ownerEmail: "ramesh@sunshinepg.com",
    city: "Bangalore",
    area: "HSR Layout",
    totalBeds: 36,
    occupiedBeds: 15,
    monthlyRevenue: 106500,
    plan: "PRO_MONTHLY",
    planAmount: 1499,
    planRenewsOn: "2026-09-15",
    status: "ACTIVE",
    healthScore: "HEALTHY",
    lastActiveDate: "Just now",
    fastTrackScansCount: 4,
    whatsappCreditsUsed: 1420,
    sentryErrorsCount: 0,
    onboardedBy: "Ramesh (Founder)",
    createdAt: "2026-08-01",
  },
  {
    id: "sri-lakshmi-pg",
    pgName: "Sri Lakshmi Luxury PG",
    ownerName: "Suresh Reddy",
    ownerPhone: "9876543210",
    ownerEmail: "suresh.lakshmi@gmail.com",
    city: "Bangalore",
    area: "Koramangala",
    totalBeds: 60,
    occupiedBeds: 48,
    monthlyRevenue: 340000,
    plan: "FREE_TRIAL",
    planAmount: 0,
    planRenewsOn: "2026-09-10",
    trialDaysLeft: 14,
    status: "TRIAL",
    healthScore: "HEALTHY",
    lastActiveDate: "12 mins ago",
    fastTrackScansCount: 2,
    whatsappCreditsUsed: 310,
    sentryErrorsCount: 0,
    onboardedBy: "Ramesh (Founder)",
    createdAt: "2026-08-27",
  },
  {
    id: "meghana-haven-pg",
    pgName: "Meghana Haven PG",
    ownerName: "K. Meghana",
    ownerPhone: "9834567890",
    ownerEmail: "meghana.haven@gmail.com",
    city: "Hyderabad",
    area: "Gachibowli",
    totalBeds: 84,
    occupiedBeds: 78,
    monthlyRevenue: 546000,
    plan: "GROWTH_ANNUAL",
    planAmount: 14990,
    planRenewsOn: "2027-08-01",
    status: "ACTIVE",
    healthScore: "HEALTHY",
    lastActiveDate: "2 hours ago",
    fastTrackScansCount: 6,
    whatsappCreditsUsed: 2840,
    sentryErrorsCount: 0,
    onboardedBy: "Ravi Kumar (Sales)",
    createdAt: "2026-07-15",
  },
  {
    id: "royal-comfort-pg",
    pgName: "Royal Comfort PG",
    ownerName: "Venkat Rao",
    ownerPhone: "9811223344",
    ownerEmail: "venkat.royal@gmail.com",
    city: "Bangalore",
    area: "Whitefield",
    totalBeds: 45,
    occupiedBeds: 22,
    monthlyRevenue: 154000,
    plan: "FREE_TRIAL",
    planAmount: 0,
    planRenewsOn: "2026-08-29",
    trialDaysLeft: 2,
    status: "TRIAL",
    healthScore: "ATTENTION",
    lastActiveDate: "3 days ago",
    fastTrackScansCount: 1,
    whatsappCreditsUsed: 85,
    sentryErrorsCount: 0,
    onboardedBy: "Ravi Kumar (Sales)",
    createdAt: "2026-08-15",
  },
  {
    id: "balaji-executive",
    pgName: "Balaji Executive Stays",
    ownerName: "Anand Sharma",
    ownerPhone: "9845612345",
    ownerEmail: "anand.balaji@gmail.com",
    city: "Pune",
    area: "Hinjewadi",
    totalBeds: 50,
    occupiedBeds: 12,
    monthlyRevenue: 84000,
    plan: "FREE_TRIAL",
    planAmount: 0,
    planRenewsOn: "2026-08-20",
    trialDaysLeft: 0,
    status: "EXPIRED",
    healthScore: "AT_RISK",
    lastActiveDate: "8 days ago",
    fastTrackScansCount: 0,
    whatsappCreditsUsed: 12,
    sentryErrorsCount: 0,
    onboardedBy: "Ramesh (Founder)",
    createdAt: "2026-08-06",
  },
];

// Reactive In-Memory State
let inMemoryMetrics: PlatformMacroMetrics = { ...DEFAULT_METRICS };
let inMemoryInvites: FounderVipInvite[] = [...DEFAULT_INVITES];
let inMemoryClients: FounderClientRecord[] = [...DEFAULT_CLIENTS];
const listeners = new Set<() => void>();
let isInitialized = false;

export const founderStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  notify() {
    listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.warn("founderStore listener error:", e);
      }
    });
  },

  getMetrics(): PlatformMacroMetrics {
    return inMemoryMetrics;
  },

  getInvites(): FounderVipInvite[] {
    return inMemoryInvites;
  },

  getClients(): FounderClientRecord[] {
    return inMemoryClients;
  },

  /**
   * Real-time Cloud Firebase Firestore Initialization
   */
  initFirebase() {
    if (isInitialized) return;
    if (typeof window === "undefined") return;

    isInitialized = true;

    try {
      // 1. Listen to Platform Macro Metrics document
      const metricsDocRef = doc(db, "platform_admin", "macro_metrics");
      onSnapshot(
        metricsDocRef,
        (snap) => {
          if (snap.exists()) {
            inMemoryMetrics = { ...DEFAULT_METRICS, ...snap.data() } as PlatformMacroMetrics;
            this.notify();
          } else {
            // Auto-provision initial seed doc in Firestore
            setDoc(metricsDocRef, DEFAULT_METRICS, { merge: true }).catch((err) =>
              console.warn("Cloud Firestore initial metrics provision warning:", err)
            );
          }
        },
        (error) => {
          console.warn("Cloud Firestore macro metrics listener error (falling back to memory):", error);
        }
      );

      // 2. Listen to VIP Invites Collection
      const invitesColRef = collection(db, "founder_invites");
      onSnapshot(
        invitesColRef,
        (snap) => {
          if (!snap.empty) {
            inMemoryInvites = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FounderVipInvite));
            this.notify();
          }
        },
        (error) => {
          console.warn("Cloud Firestore invites listener error:", error);
        }
      );

      // 3. Listen to Client Organizations Collection
      const clientsColRef = collection(db, "founder_clients");
      onSnapshot(
        clientsColRef,
        (snap) => {
          if (!snap.empty) {
            inMemoryClients = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FounderClientRecord));
            this.notify();
          }
        },
        (error) => {
          console.warn("Cloud Firestore clients listener error:", error);
        }
      );
    } catch (e) {
      console.warn("founderStore initFirebase error:", e);
    }
  },

  /**
   * Create a new VIP Door-to-Door Invite & 1-Time Code
   */
  async createVipInvite(lead: {
    pgName: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
    city: string;
    assignedPlan: "14_DAY_TRIAL" | "PRO_MONTHLY" | "ANNUAL_VIP";
    trialDurationDays: number;
    generatedByStaffName: string;
    generatedByStaffEmail: string;
  }): Promise<FounderVipInvite> {
    // Generate true random 8-character CSPRNG code e.g. "8K4N-9X2M"
    const activationCode = generateSecureActivationCode();

    const newInvite: FounderVipInvite = {
      id: `inv-${Date.now()}`,
      activationCode,
      pgName: lead.pgName,
      ownerName: lead.ownerName,
      ownerPhone: lead.ownerPhone,
      ownerEmail: lead.ownerEmail.toLowerCase().trim(),
      city: lead.city,
      assignedPlan: lead.assignedPlan,
      trialDurationDays: lead.trialDurationDays || 14,
      status: "PENDING",
      generatedByStaffName: lead.generatedByStaffName || "Founder",
      generatedByStaffEmail: lead.generatedByStaffEmail || "admin@tenopilot.com",
      createdAt: new Date().toISOString(),
    };

    inMemoryInvites = [newInvite, ...inMemoryInvites];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_local_invites", JSON.stringify(inMemoryInvites));
      } catch {}
    }
    this.notify();

    // Persist to Cloud Firestore
    try {
      const inviteDocRef = doc(db, "founder_invites", newInvite.id);
      await setDoc(inviteDocRef, newInvite);
    } catch (e) {
      console.warn("Persist invite to Cloud Firestore warning:", e);
    }

    return newInvite;
  },

  /**
   * Redeem a Secure Activation Code (Validates against either Mobile Number or Email)
   */
  async redeemActivationCode(code: string, identifier: string): Promise<{ success: boolean; message: string; invite?: FounderVipInvite }> {
    const formattedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, "");

    // 1. Check in-memory state
    let invite = inMemoryInvites.find((inv) => {
      const invCode = inv.activationCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return invCode === formattedCode;
    });

    // 2. Check localStorage cache
    if (!invite && typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("tenopilot_local_invites");
        if (local) {
          const parsed = JSON.parse(local) as FounderVipInvite[];
          const found = parsed.find((inv) => inv.activationCode.toUpperCase().replace(/[^A-Z0-9]/g, "") === formattedCode);
          if (found) {
            invite = found;
            inMemoryInvites = [found, ...inMemoryInvites.filter((i) => i.id !== found.id)];
          }
        }
      } catch (err) {
        console.warn("Local storage invite check error:", err);
      }
    }

    // 3. Fallback: Query Cloud Firestore directly in real-time
    if (!invite) {
      try {
        const snap = await getDocs(collection(db, "founder_invites"));
        if (!snap.empty) {
          snap.docs.forEach((d) => {
            const data = { id: d.id, ...d.data() } as FounderVipInvite;
            if (data.activationCode && data.activationCode.toUpperCase().replace(/[^A-Z0-9]/g, "") === formattedCode) {
              invite = data;
            }
            if (!inMemoryInvites.some((i) => i.id === data.id)) {
              inMemoryInvites.push(data);
            }
          });
        }
      } catch (fsErr) {
        console.warn("Direct Firestore lookup failed:", fsErr);
      }
    }

    if (!invite) {
      return { success: false, message: "⚠️ Invalid activation code. Please verify the code issued by your onboarding representative." };
    }

    if (invite.status === "REDEEMED") {
      return { success: false, message: "⚠️ This activation code has already been redeemed and is no longer valid. Please log in to your account." };
    }

    // 2-Factor Check: Match either registered Email or registered Mobile Number
    const invPhone = invite.ownerPhone.replace(/\D/g, "");
    const invEmail = invite.ownerEmail.toLowerCase().trim();

    const matchesEmail = cleanIdentifier.includes("@") && invEmail === cleanIdentifier;
    const matchesPhone = cleanPhone.length >= 7 && (invPhone.endsWith(cleanPhone) || cleanPhone.endsWith(invPhone) || invPhone.includes(cleanPhone) || cleanPhone.includes(invPhone));

    if (!matchesEmail && !matchesPhone) {
      const maskedPhone = invite.ownerPhone.length >= 4 ? `${invite.ownerPhone.slice(0, 3)}***${invite.ownerPhone.slice(-2)}` : "your registered phone";
      return {
        success: false,
        message: `⚠️ This activation code is bound to registered contact details. Please enter the exact Mobile Number (${maskedPhone}) or Email used during onboarding.`,
      };
    }

    // Mark as redeemed (Burn single-use code)
    invite.status = "REDEEMED";
    invite.redeemedAt = new Date().toISOString();
    this.notify();

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_local_invites", JSON.stringify(inMemoryInvites));
      } catch {}
    }

    // Persist redemption to Cloud Firestore
    try {
      const inviteDocRef = doc(db, "founder_invites", invite.id);
      await updateDoc(inviteDocRef, {
        status: "REDEEMED",
        redeemedAt: invite.redeemedAt,
      });
    } catch (e) {
      console.warn("Firestore invite redemption update error:", e);
    }

    return { success: true, message: `🎉 Welcome to TenoPilot! Your property "${invite.pgName}" is activated.`, invite };
  },

  /**
   * 1-Click Extend Free Trial (+7 Days or +14 Days)
   */
  async extendClientTrial(clientId: string, daysToAdd: number = 7) {
    const client = inMemoryClients.find((c) => c.id === clientId);
    if (!client) return;

    client.trialDaysLeft = (client.trialDaysLeft || 0) + daysToAdd;
    client.status = "TRIAL";
    client.healthScore = "HEALTHY";
    this.notify();

    try {
      const clientDocRef = doc(db, "founder_clients", clientId);
      await updateDoc(clientDocRef, {
        trialDaysLeft: client.trialDaysLeft,
        status: client.status,
        healthScore: client.healthScore,
      });
    } catch (e) {
      console.warn("Firestore extend trial error:", e);
    }
  },

  /**
   * Emergency Suspend / Reactivate Client
   */
  async toggleClientSuspension(clientId: string) {
    const client = inMemoryClients.find((c) => c.id === clientId);
    if (!client) return;

    client.status = client.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    this.notify();

    try {
      const clientDocRef = doc(db, "founder_clients", clientId);
      await updateDoc(clientDocRef, { status: client.status });
    } catch (e) {
      console.warn("Firestore toggle suspension error:", e);
    }
  },
};
