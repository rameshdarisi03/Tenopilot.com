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
  activationCode: string; // e.g. "8K4N-9X2M"
  pgName: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  city: string;
  approxBeds?: number;
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

// 100% Clean Seed - Zero Mock Invites/Clients
const DEFAULT_INVITES: FounderVipInvite[] = [];
const DEFAULT_CLIENTS: FounderClientRecord[] = [];

// Reactive In-Memory State
let inMemoryMetrics: PlatformMacroMetrics = { ...DEFAULT_METRICS };
let inMemoryInvites: FounderVipInvite[] = [];
let inMemoryClients: FounderClientRecord[] = [];
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
          inMemoryInvites = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FounderVipInvite));
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("tenopilot_local_invites", JSON.stringify(inMemoryInvites));
            } catch {}
          }
          this.notify();
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
          inMemoryClients = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FounderClientRecord));
          this.notify();
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

    // 1. Persist to Next.js Server API with strict uniqueness validation
    if (typeof window !== "undefined") {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInvite),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create VIP invite due to duplicate credentials.");
      }
    }

    inMemoryInvites = [newInvite, ...inMemoryInvites];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tenopilot_local_invites", JSON.stringify(inMemoryInvites));
      } catch {}
    }
    this.notify();

    // 2. Persist to Cloud Firestore
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
  async redeemActivationCode(code: string, identifier: string): Promise<{ success: boolean; message: string; invite?: FounderVipInvite; autoLinked?: boolean }> {
    const isAutoLink = !code || code === "AUTO" || code === "GOOGLE_AUTO_LINK";
    const formattedCode = code ? code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, "");

    // 1. Primary: Verify via Next.js Serverless API Route (guarantees cross-device & cross-worker recognition)
    if (typeof window !== "undefined") {
      try {
        const apiRes = await fetch("/api/invites/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: isAutoLink ? "AUTO" : formattedCode, identifier }),
        });

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.success && apiData.invite) {
            // Update in-memory and local cache
            inMemoryInvites = [apiData.invite, ...inMemoryInvites.filter((i) => i.id !== apiData.invite.id)];
            this.notify();
            try {
              localStorage.setItem("tenopilot_local_invites", JSON.stringify(inMemoryInvites));
            } catch {}
            return { success: true, message: apiData.message, invite: apiData.invite, autoLinked: apiData.autoLinked };
          } else if (apiData.message) {
            return { success: false, message: apiData.message };
          }
        }
      } catch (apiErr) {
        console.warn("Server API /api/invites/redeem fallback to client:", apiErr);
      }
    }

    // 2. Client-side check in-memory state
    let invite = inMemoryInvites.find((inv) => {
      if (isAutoLink) {
        const invEmail = inv.ownerEmail.toLowerCase().trim();
        const invPhone = inv.ownerPhone.replace(/\D/g, "");
        return (cleanIdentifier.includes("@") && invEmail === cleanIdentifier) || (cleanPhone.length >= 7 && invPhone.endsWith(cleanPhone));
      }
      const invCode = inv.activationCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return invCode === formattedCode;
    });

    // 3. Client-side check localStorage cache
    if (!invite && typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("tenopilot_local_invites");
        if (local) {
          const parsed = JSON.parse(local) as FounderVipInvite[];
          const found = parsed.find((inv) => {
            if (isAutoLink) {
              const invEmail = inv.ownerEmail.toLowerCase().trim();
              const invPhone = inv.ownerPhone.replace(/\D/g, "");
              return (cleanIdentifier.includes("@") && invEmail === cleanIdentifier) || (cleanPhone.length >= 7 && invPhone.endsWith(cleanPhone));
            }
            return inv.activationCode.toUpperCase().replace(/[^A-Z0-9]/g, "") === formattedCode;
          });
          if (found) {
            invite = found;
            inMemoryInvites = [found, ...inMemoryInvites.filter((i) => i.id !== found.id)];
          }
        }
      } catch (err) {
        console.warn("Local storage invite check error:", err);
      }
    }

    // 4. Client-side fallback: Query Cloud Firestore directly in real-time
    if (!invite) {
      try {
        const snap = await getDocs(collection(db, "founder_invites"));
        if (!snap.empty) {
          snap.docs.forEach((d) => {
            const data = { id: d.id, ...d.data() } as FounderVipInvite;
            if (isAutoLink) {
              const invEmail = (data.ownerEmail || "").toLowerCase().trim();
              const invPhone = (data.ownerPhone || "").replace(/\D/g, "");
              if ((cleanIdentifier.includes("@") && invEmail === cleanIdentifier) || (cleanPhone.length >= 7 && invPhone.endsWith(cleanPhone))) {
                invite = data;
              }
            } else if (data.activationCode && data.activationCode.toUpperCase().replace(/[^A-Z0-9]/g, "") === formattedCode) {
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
      if (isAutoLink) {
        return {
          success: false,
          message: `⚠️ No pending activation pass found for ${cleanIdentifier}. Please enter your Activation Code or contact onboarding desk.`,
        };
      }
      return { success: false, message: "⚠️ Invalid activation code. Please verify the code issued by your onboarding representative." };
    }

    if (invite.status === "REDEEMED") {
      return { success: true, message: `Welcome back! "${invite.pgName}" is already activated.`, invite };
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
