// TenoPilot Self-KYC Digital Gate Desk Store
// Handles real-time Firestore persistence, in-memory reactivity, and bed status lifecycle

import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { saveOccupantToFirestore } from "@/lib/firestoreService";

export interface SelfKycSubmission {
  id: string;
  propertyId: string;
  inviteId?: string;
  submissionType: "INVITE" | "WALK_IN_QR";
  stayType: "Tenant" | "Guest";
  roomNumber: string;
  bedCode: string;
  rentAmount: number;
  securityDeposit?: number;
  guestDailyRate?: number;
  guestCheckoutDate?: string;
  joiningDate: string;
  // Personal Details
  name: string;
  phone: string;
  countryCode?: string;
  email?: string;
  emergencyContact: {
    name?: string;
    phone: string;
    relation?: string;
  };
  workplace?: string;
  occupation?: string;
  purposeOfVisit?: string;
  address?: string;
  vehicleNumbers?: string[];
  // Documents
  photoUrl?: string;
  aadhaarNumber?: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  aadhaarPdfUrl?: string;
  agreedToHouseRules: boolean;
  // Status & Audit
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface SelfKycInvite {
  id: string; // Token
  propertyId: string;
  stayType: "Tenant" | "Guest";
  roomNumber: string;
  bedCode: string;
  rentAmount: number;
  securityDeposit?: number;
  guestDailyRate?: number;
  candidateName: string;
  candidatePhone: string;
  candidateEmail?: string;
  status: "ACTIVE" | "COMPLETED" | "REVOKED";
  whatsappStatus: "SENT" | "DELIVERED" | "FAILED" | "PENDING";
  emailStatus?: "SENT" | "FAILED" | "PENDING";
  createdAt: string;
}

// In-Memory cache maps
const SUBMISSIONS_CACHE = new Map<string, SelfKycSubmission[]>();
const INVITES_CACHE = new Map<string, SelfKycInvite[]>();
const SUBMISSION_LISTENERS = new Map<string, Set<(subs: SelfKycSubmission[]) => void>>();
const INVITE_LISTENERS = new Map<string, Set<(invs: SelfKycInvite[]) => void>>();
const ACTIVE_UNSUBS = new Map<string, () => void>();

function getLocalStorageKey(propId: string, type: "subs" | "invs") {
  return `tenopilot_self_kyc_${type}_${propId}`;
}

function loadLocalCache(propId: string) {
  if (typeof window === "undefined") return;
  try {
    const rawSubs = localStorage.getItem(getLocalStorageKey(propId, "subs"));
    if (rawSubs) SUBMISSIONS_CACHE.set(propId, JSON.parse(rawSubs));
    const rawInvs = localStorage.getItem(getLocalStorageKey(propId, "invs"));
    if (rawInvs) INVITES_CACHE.set(propId, JSON.parse(rawInvs));
  } catch (e) {
    console.warn("Error reading local self-kyc cache:", e);
  }
}

function saveLocalCache(propId: string, type: "subs" | "invs") {
  if (typeof window === "undefined") return;
  try {
    if (type === "subs") {
      const data = SUBMISSIONS_CACHE.get(propId) || [];
      localStorage.setItem(getLocalStorageKey(propId, "subs"), JSON.stringify(data));
    } else {
      const data = INVITES_CACHE.get(propId) || [];
      localStorage.setItem(getLocalStorageKey(propId, "invs"), JSON.stringify(data));
    }
  } catch (e) {
    console.warn("Error writing local self-kyc cache:", e);
  }
}

function notifySubscribers(propId: string) {
  const subSet = SUBMISSION_LISTENERS.get(propId);
  if (subSet) {
    const list = SUBMISSIONS_CACHE.get(propId) || [];
    subSet.forEach((cb) => cb([...list]));
  }
  const invSet = INVITE_LISTENERS.get(propId);
  if (invSet) {
    const list = INVITES_CACHE.get(propId) || [];
    invSet.forEach((cb) => cb([...list]));
  }
}

export const selfKycStore = {
  subscribeSubmissions(propertyId: string, callback: (subs: SelfKycSubmission[]) => void) {
    if (!SUBMISSION_LISTENERS.has(propertyId)) {
      SUBMISSION_LISTENERS.set(propertyId, new Set());
    }
    SUBMISSION_LISTENERS.get(propertyId)!.add(callback);

    loadLocalCache(propertyId);
    callback(SUBMISSIONS_CACHE.get(propertyId) || []);

    // Setup Firestore listener
    if (!ACTIVE_UNSUBS.has(`subs_${propertyId}`)) {
      try {
        const colRef = collection(db, "properties", propertyId, "self_kyc_submissions");
        const unsub = onSnapshot(colRef, (snap) => {
          const fetched: SelfKycSubmission[] = snap.docs.map((d) => d.data() as SelfKycSubmission);
          // Sort newest first
          fetched.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          SUBMISSIONS_CACHE.set(propertyId, fetched);
          saveLocalCache(propertyId, "subs");
          notifySubscribers(propertyId);
        }, (err) => {
          console.warn("Firestore submissions listener error:", err);
        });
        ACTIVE_UNSUBS.set(`subs_${propertyId}`, unsub);
      } catch (e) {
        console.warn("Firestore offline, using local self-kyc subs:", e);
      }
    }

    return () => {
      SUBMISSION_LISTENERS.get(propertyId)?.delete(callback);
    };
  },

  subscribeInvites(propertyId: string, callback: (invs: SelfKycInvite[]) => void) {
    if (!INVITE_LISTENERS.has(propertyId)) {
      INVITE_LISTENERS.set(propertyId, new Set());
    }
    INVITE_LISTENERS.get(propertyId)!.add(callback);

    loadLocalCache(propertyId);
    callback(INVITES_CACHE.get(propertyId) || []);

    // Setup Firestore listener
    if (!ACTIVE_UNSUBS.has(`invs_${propertyId}`)) {
      try {
        const colRef = collection(db, "properties", propertyId, "self_kyc_invites");
        const unsub = onSnapshot(colRef, (snap) => {
          const fetched: SelfKycInvite[] = snap.docs.map((d) => d.data() as SelfKycInvite);
          fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          INVITES_CACHE.set(propertyId, fetched);
          saveLocalCache(propertyId, "invs");
          notifySubscribers(propertyId);
        }, (err) => {
          console.warn("Firestore invites listener error:", err);
        });
        ACTIVE_UNSUBS.set(`invs_${propertyId}`, unsub);
      } catch (e) {
        console.warn("Firestore offline, using local self-kyc invs:", e);
      }
    }

    return () => {
      INVITE_LISTENERS.get(propertyId)?.delete(callback);
    };
  },

  getSubmissions(propertyId: string): SelfKycSubmission[] {
    loadLocalCache(propertyId);
    return SUBMISSIONS_CACHE.get(propertyId) || [];
  },

  getInvites(propertyId: string): SelfKycInvite[] {
    loadLocalCache(propertyId);
    return INVITES_CACHE.get(propertyId) || [];
  },

  getInviteByToken(token: string): { invite?: SelfKycInvite; propertyId?: string } {
    for (const [propId, invs] of INVITES_CACHE.entries()) {
      const found = invs.find((i) => i.id === token);
      if (found) return { invite: found, propertyId: propId };
    }
    // Check localStorage as well
    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("tenopilot_self_kyc_invs_")) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list: SelfKycInvite[] = JSON.parse(raw);
              const match = list.find((item) => item.id === token);
              if (match) return { invite: match, propertyId: match.propertyId };
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }
    return {};
  },

  // Asynchronous universal lookup across local cache and Firestore cloud
  async fetchInviteAsync(token: string): Promise<{ invite?: SelfKycInvite; propertyId?: string }> {
    // 1. Check local cache first
    const local = this.getInviteByToken(token);
    if (local?.invite) return local;

    // 2. Query Firestore global lookup
    try {
      const lookupRef = doc(db, "self_kyc_invite_lookup", token);
      const lookupSnap = await getDoc(lookupRef);
      if (lookupSnap.exists()) {
        const { propertyId } = lookupSnap.data() as { propertyId: string };
        if (propertyId) {
          const inviteRef = doc(db, "properties", propertyId, "self_kyc_invites", token);
          const inviteSnap = await getDoc(inviteRef);
          if (inviteSnap.exists()) {
            const inv = inviteSnap.data() as SelfKycInvite;
            // Cache locally
            const list = INVITES_CACHE.get(propertyId) || [];
            INVITES_CACHE.set(propertyId, [inv, ...list.filter((i) => i.id !== inv.id)]);
            saveLocalCache(propertyId, "invs");
            return { invite: inv, propertyId };
          }
        }
      }
    } catch (e) {
      console.warn("Firestore fetchInviteAsync error:", e);
    }

    return {};
  },

  // 1. Create Invite & Put Bed on Hold
  async createInvite(invite: SelfKycInvite): Promise<void> {
    const list = INVITES_CACHE.get(invite.propertyId) || [];
    INVITES_CACHE.set(invite.propertyId, [invite, ...list.filter((i) => i.id !== invite.id)]);
    saveLocalCache(invite.propertyId, "invs");
    notifySubscribers(invite.propertyId);

    // Atomically put bed on HOLD in propertyLayoutStore
    const structure = propertyStore.getStructure(invite.propertyId);
    const updated = structure.map((fl) => ({
      ...fl,
      rooms: fl.rooms.map((rm) => {
        if (rm.roomNumber !== invite.roomNumber) return rm;
        return {
          ...rm,
          beds: rm.beds.map((bd) => {
            if (bd.bedCode !== invite.bedCode) return bd;
            return {
              ...bd,
              status: "Hold" as const,
              holdCandidate: {
                name: invite.candidateName,
                phone: invite.candidatePhone,
                email: invite.candidateEmail,
                inviteId: invite.id,
                heldAt: invite.createdAt,
              },
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updated, invite.propertyId);

    // Push to Firestore
    try {
      const docRef = doc(db, "properties", invite.propertyId, "self_kyc_invites", invite.id);
      await setDoc(docRef, invite);
      // Global pointer for cross-device mobile lookup
      const lookupRef = doc(db, "self_kyc_invite_lookup", invite.id);
      await setDoc(lookupRef, {
        propertyId: invite.propertyId,
        inviteId: invite.id,
        createdAt: invite.createdAt,
      });
    } catch (e) {
      console.warn("Firestore createInvite write failed, cached locally:", e);
    }
  },

  // 2. Revoke Invite & Release Bed back to Available
  async revokeInvite(propertyId: string, inviteId: string): Promise<void> {
    const list = INVITES_CACHE.get(propertyId) || [];
    const target = list.find((i) => i.id === inviteId);
    if (!target) return;

    target.status = "REVOKED";
    INVITES_CACHE.set(propertyId, [...list]);
    saveLocalCache(propertyId, "invs");
    notifySubscribers(propertyId);

    // Release bed in propertyStore
    const structure = propertyStore.getStructure(propertyId);
    const updated = structure.map((fl) => ({
      ...fl,
      rooms: fl.rooms.map((rm) => {
        if (rm.roomNumber !== target.roomNumber) return rm;
        return {
          ...rm,
          beds: rm.beds.map((bd) => {
            if (bd.bedCode !== target.bedCode) return bd;
            return {
              ...bd,
              status: "Available" as const,
              holdCandidate: undefined,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updated, propertyId);

    try {
      const docRef = doc(db, "properties", propertyId, "self_kyc_invites", inviteId);
      await updateDoc(docRef, { status: "REVOKED" });
    } catch (e) {
      console.warn("Firestore revokeInvite failed:", e);
    }
  },

  // 3. Submit KYC (From Tenant Portal)
  async submitKyc(submission: SelfKycSubmission): Promise<void> {
    const list = SUBMISSIONS_CACHE.get(submission.propertyId) || [];
    SUBMISSIONS_CACHE.set(submission.propertyId, [submission, ...list.filter((s) => s.id !== submission.id)]);
    saveLocalCache(submission.propertyId, "subs");
    notifySubscribers(submission.propertyId);

    // If walk-in QR, ensure bed is placed on Hold
    if (submission.submissionType === "WALK_IN_QR") {
      const structure = propertyStore.getStructure(submission.propertyId);
      const updated = structure.map((fl) => ({
        ...fl,
        rooms: fl.rooms.map((rm) => {
          if (rm.roomNumber !== submission.roomNumber) return rm;
          return {
            ...rm,
            beds: rm.beds.map((bd) => {
              if (bd.bedCode !== submission.bedCode) return bd;
              return {
                ...bd,
                status: "Hold" as const,
                holdCandidate: {
                  name: submission.name,
                  phone: submission.phone,
                  email: submission.email,
                  heldAt: submission.submittedAt,
                },
              };
            }),
          };
        }),
      }));
      propertyStore.updateStructure(updated, submission.propertyId);
    }

    try {
      const docRef = doc(db, "properties", submission.propertyId, "self_kyc_submissions", submission.id);
      await setDoc(docRef, submission);
    } catch (e) {
      console.warn("Firestore submitKyc write failed:", e);
    }
  },

  // 4. Approve Submission & Create Active Occupant Profile
  async approveSubmission(submission: SelfKycSubmission, reviewerName = "Staff"): Promise<Occupant> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const joiningParsed = new Date(submission.joiningDate);
    let isFutureJoining = false;
    if (!isNaN(joiningParsed.getTime())) {
      joiningParsed.setHours(0, 0, 0, 0);
      isFutureJoining = joiningParsed > today;
    }

    // Determine lifecycle & payment status
    const lifecycleStatus = isFutureJoining ? ("Booked" as const) : ("Active" as const);
    const paymentStatus = "Due" as const;

    // Create unique occupant ID
    const newOccupantId = `occ-${Date.now()}`;
    const cleanPrimaryPhone = submission.phone.replace(/\D/g, "");
    const cleanCountryCode = submission.countryCode || "+91";

    const newResident: Occupant = {
      id: newOccupantId,
      name: submission.name.trim(),
      avatar: submission.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(submission.name)}`,
      phone: `${cleanCountryCode} ${cleanPrimaryPhone}`,
      countryCode: cleanCountryCode,
      email: submission.email?.trim() || `${cleanPrimaryPhone}@resident.tenopilot.com`,
      stayType: submission.stayType,
      roomNumber: submission.roomNumber,
      bedCode: submission.bedCode,
      joiningDate: submission.joiningDate,
      lastPaidDate: "Unpaid / New Check-In",
      dueDate: submission.joiningDate,
      dueDay: 5,
      daysRemainingText: isFutureJoining ? "Future Check-In" : "DUE TODAY",
      daysDiff: 0,
      rentAmount: submission.rentAmount,
      securityDeposit: submission.securityDeposit ?? (submission.rentAmount * 2),
      paymentStatus,
      lifecycleStatus,
      depositStatus: "PENDING",
      aadhaarNumber: submission.aadhaarNumber || "",
      emergencyContact: {
        name: submission.emergencyContact?.name || "Parent / Guardian",
        phone: submission.emergencyContact?.phone || "",
        relation: submission.emergencyContact?.relation || "Family",
      },
      kycVerified: true,
      hasPdfAgreement: false,
      workplace: submission.workplace || undefined,
      occupation: submission.occupation || undefined,
      purposeOfVisit: submission.purposeOfVisit || undefined,
      address: submission.address || undefined,
      vehicleNumbers: submission.vehicleNumbers && submission.vehicleNumbers.length > 0 ? submission.vehicleNumbers : undefined,
      vehicleNumber: submission.vehicleNumbers?.[0] || undefined,
      kycDocs: {
        idMode: submission.aadhaarPdfUrl ? "PDF" : "IMAGES",
        photoUrl: submission.photoUrl,
        aadhaarFrontUrl: submission.aadhaarFrontUrl,
        aadhaarBackUrl: submission.aadhaarBackUrl,
        aadhaarPdfUrl: submission.aadhaarPdfUrl,
      },
    };

    // Save to occupantStore & Firestore
    const currentOccupants = occupantStore.getOccupants(submission.propertyId) || [];
    occupantStore.updateOccupants([newResident, ...currentOccupants.filter((o) => o.id !== newResident.id)], submission.propertyId);
    saveOccupantToFirestore(submission.propertyId, newResident).catch(console.error);

    // Bed status transition:
    // Future joiners -> "Booked"
    // Today / Past -> "Occupied" (or "Guest")
    const targetBedStatus = isFutureJoining
      ? ("Booked" as const)
      : submission.stayType === "Guest"
      ? ("Guest" as const)
      : ("Occupied" as const);

    const structure = propertyStore.getStructure(submission.propertyId);
    const updatedStructure = structure.map((fl) => ({
      ...fl,
      rooms: fl.rooms.map((rm) => {
        if (rm.roomNumber !== submission.roomNumber) return rm;
        return {
          ...rm,
          beds: rm.beds.map((bd) => {
            if (bd.bedCode !== submission.bedCode) return bd;
            return {
              ...bd,
              status: targetBedStatus,
              occupant: newResident,
              holdCandidate: undefined,
              vacatingDate: undefined,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure, submission.propertyId);

    // Update submission record
    submission.status = "APPROVED";
    submission.reviewedAt = new Date().toISOString();
    submission.reviewedBy = reviewerName;

    const list = SUBMISSIONS_CACHE.get(submission.propertyId) || [];
    SUBMISSIONS_CACHE.set(
      submission.propertyId,
      list.map((s) => (s.id === submission.id ? submission : s))
    );
    saveLocalCache(submission.propertyId, "subs");

    // If invite exists, mark COMPLETED
    if (submission.inviteId) {
      const invs = INVITES_CACHE.get(submission.propertyId) || [];
      const updatedInvs = invs.map((i) => (i.id === submission.inviteId ? { ...i, status: "COMPLETED" as const } : i));
      INVITES_CACHE.set(submission.propertyId, updatedInvs);
      saveLocalCache(submission.propertyId, "invs");

      try {
        const invRef = doc(db, "properties", submission.propertyId, "self_kyc_invites", submission.inviteId);
        await updateDoc(invRef, { status: "COMPLETED" });
      } catch (e) {
        console.warn(e);
      }
    }

    notifySubscribers(submission.propertyId);

    try {
      const subRef = doc(db, "properties", submission.propertyId, "self_kyc_submissions", submission.id);
      await updateDoc(subRef, {
        status: "APPROVED",
        reviewedAt: submission.reviewedAt,
        reviewedBy: reviewerName,
      });
    } catch (e) {
      console.warn(e);
    }

    return newResident;
  },

  // 5. Reject Submission & Release Bed
  async rejectSubmission(propertyId: string, submissionId: string, reason: string): Promise<void> {
    const list = SUBMISSIONS_CACHE.get(propertyId) || [];
    const target = list.find((s) => s.id === submissionId);
    if (!target) return;

    target.status = "REJECTED";
    target.rejectionReason = reason;
    target.reviewedAt = new Date().toISOString();

    SUBMISSIONS_CACHE.set(propertyId, [...list]);
    saveLocalCache(propertyId, "subs");

    // Release bed back to Available
    const structure = propertyStore.getStructure(propertyId);
    const updatedStructure = structure.map((fl) => ({
      ...fl,
      rooms: fl.rooms.map((rm) => {
        if (rm.roomNumber !== target.roomNumber) return rm;
        return {
          ...rm,
          beds: rm.beds.map((bd) => {
            if (bd.bedCode !== target.bedCode) return bd;
            return {
              ...bd,
              status: "Available" as const,
              holdCandidate: undefined,
            };
          }),
        };
      }),
    }));
    propertyStore.updateStructure(updatedStructure, propertyId);

    notifySubscribers(propertyId);

    try {
      const subRef = doc(db, "properties", propertyId, "self_kyc_submissions", submissionId);
      await updateDoc(subRef, {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedAt: target.reviewedAt,
      });
    } catch (e) {
      console.warn(e);
    }
  },
};
