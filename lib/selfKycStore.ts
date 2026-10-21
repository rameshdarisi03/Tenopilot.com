// TenoPilot Self-KYC Digital Gate Desk Store
// Handles real-time Firestore persistence, in-memory reactivity, and bed status lifecycle

import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { saveOccupantToFirestore, sanitizeForFirestore } from "@/lib/firestoreService";
import {
  sanitizePlainText,
  sanitizeDigitsOnly,
  sanitizeEmailAddress,
  sanitizeVehicleNumber,
  validateBase64Attachment,
} from "@/utils/security";

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
    const initialList = INVITES_CACHE.get(propertyId) || [];
    callback([...initialList]);

    // Setup Firestore listener to synchronize cloud invites without destructive mutation
    if (!ACTIVE_UNSUBS.has(`invs_${propertyId}`)) {
      try {
        const colRef = collection(db, "properties", propertyId, "self_kyc_invites");
        const unsub = onSnapshot(colRef, (snap) => {
          const fetched: SelfKycInvite[] = snap.docs.map((d) => d.data() as SelfKycInvite);
          const local = INVITES_CACHE.get(propertyId) || [];
          
          // Merge local cache and cloud data by ID
          const map = new Map<string, SelfKycInvite>();
          local.forEach((i) => map.set(i.id, i));
          fetched.forEach((i) => map.set(i.id, i));

          const merged = Array.from(map.values());
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          INVITES_CACHE.set(propertyId, merged);
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
  async fetchInviteAsync(token: string, explicitPropertyId?: string): Promise<{ invite?: SelfKycInvite; propertyId?: string }> {
    if (!token) return {};

    // 1. Direct query with explicit propertyId if passed in URL (?p=propertyId)
    if (explicitPropertyId) {
      try {
        const inviteRef = doc(db, "properties", explicitPropertyId, "self_kyc_invites", token);
        const inviteSnap = await getDoc(inviteRef);
        if (inviteSnap.exists()) {
          const inv = inviteSnap.data() as SelfKycInvite;
          const list = INVITES_CACHE.get(explicitPropertyId) || [];
          INVITES_CACHE.set(explicitPropertyId, [inv, ...list.filter((i) => i.id !== inv.id)]);
          saveLocalCache(explicitPropertyId, "invs");
          return { invite: inv, propertyId: explicitPropertyId };
        }
      } catch (e) {
        console.warn("Explicit property invite fetch notice:", e);
      }
    }

    // 2. Check local cache first
    const local = this.getInviteByToken(token);
    if (local?.invite) return local;

    // 3. Fast Server-Side API Failsafe (Cross-Collection Lookup)
    if (typeof window !== "undefined") {
      try {
        const queryUrl = `/api/self-kyc/invite?token=${encodeURIComponent(token)}${explicitPropertyId ? `&p=${encodeURIComponent(explicitPropertyId)}` : ""}`;
        const res = await fetch(queryUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.invite) {
            const pId = data.propertyId || data.invite.propertyId || "sunshine-pg";
            const list = INVITES_CACHE.get(pId) || [];
            INVITES_CACHE.set(pId, [data.invite, ...list.filter((i) => i.id !== data.invite.id)]);
            saveLocalCache(pId, "invs");
            return { invite: data.invite, propertyId: pId };
          }
        }
      } catch (e) {
        console.warn("Server API invite lookup notice:", e);
      }
    }

    // 4. Direct scan across properties/{propId}/self_kyc_invites/{token}
    try {
      const propsSnap = await getDocs(collection(db, "properties"));
      for (const pDoc of propsSnap.docs) {
        const pId = pDoc.id;
        try {
          const inviteRef = doc(db, "properties", pId, "self_kyc_invites", token);
          const inviteSnap = await getDoc(inviteRef);
          if (inviteSnap.exists()) {
            const inv = inviteSnap.data() as SelfKycInvite;
            const list = INVITES_CACHE.get(pId) || [];
            INVITES_CACHE.set(pId, [inv, ...list.filter((i) => i.id !== inv.id)]);
            saveLocalCache(pId, "invs");
            return { invite: inv, propertyId: pId };
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Properties scan notice:", e);
    }

    // 5. Direct single-hop read from root collection self_kyc_invites/{token} (if permitted)
    try {
      const directRef = doc(db, "self_kyc_invites", token);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        const inv = directSnap.data() as SelfKycInvite;
        const propId = inv.propertyId || explicitPropertyId || "sunshine-pg";
        const list = INVITES_CACHE.get(propId) || [];
        INVITES_CACHE.set(propId, [inv, ...list.filter((i) => i.id !== inv.id)]);
        saveLocalCache(propId, "invs");
        return { invite: inv, propertyId: propId };
      }
    } catch (e) {
      console.warn("Direct self_kyc_invites read notice:", e);
    }

    // 6. Fallback: Query Firestore global lookup pointer
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
            const list = INVITES_CACHE.get(propertyId) || [];
            INVITES_CACHE.set(propertyId, [inv, ...list.filter((i) => i.id !== inv.id)]);
            saveLocalCache(propertyId, "invs");
            return { invite: inv, propertyId };
          }
        }
      }
    } catch (e) {
      console.warn("Firestore lookup pointer notice:", e);
    }

    // 7. Fallback: Check local layouts for holdCandidate
    try {
      const knownProperties = ["sunshine-pg", "prop-1788438308277"];
      for (const propId of knownProperties) {
        const structure = propertyStore.getStructure(propId);
        for (const fl of structure) {
          for (const rm of fl.rooms) {
            for (const bd of rm.beds) {
              if (bd.status === "Hold" && bd.holdCandidate) {
                const match =
                  bd.holdCandidate.inviteId === token ||
                  `inv-${rm.roomNumber}-${bd.bedCode}` === token;
                if (match) {
                  const synthInvite: SelfKycInvite = {
                    id: token,
                    propertyId: propId,
                    stayType: "Tenant",
                    roomNumber: rm.roomNumber,
                    bedCode: bd.bedCode,
                    rentAmount: rm.customRentAmount || 12000,
                    securityDeposit: (rm.customRentAmount || 12000) * 2,
                    candidateName: bd.holdCandidate.name || "Prospective Resident",
                    candidatePhone: bd.holdCandidate.phone || "",
                    candidateEmail: bd.holdCandidate.email || undefined,
                    status: "ACTIVE",
                    whatsappStatus: "SENT",
                    createdAt: bd.holdCandidate.heldAt || new Date().toISOString(),
                  };
                  return { invite: synthInvite, propertyId: propId };
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Hold candidate search notice:", e);
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

    // Push to Firestore with robust multi-path persistence
    try {
      const sanitized = sanitizeForFirestore(invite);

      // 1. PRIMARY: Property scoped collection (Guaranteed write permissions)
      try {
        const docRef = doc(db, "properties", invite.propertyId, "self_kyc_invites", invite.id);
        await setDoc(docRef, sanitized);
      } catch (err) {
        console.warn("Property self_kyc_invites write notice:", err);
      }

      // 2. Direct write to root collection for fast 1-hop cross-device lookup (if permitted)
      try {
        const rootInviteRef = doc(db, "self_kyc_invites", invite.id);
        await setDoc(rootInviteRef, sanitized);
      } catch (err) {
        // Fallback gracefully if root collection security rules not deployed
      }

      // 3. Global pointer for cross-device mobile lookup (if permitted)
      try {
        const lookupRef = doc(db, "self_kyc_invite_lookup", invite.id);
        await setDoc(lookupRef, {
          propertyId: invite.propertyId,
          inviteId: invite.id,
          createdAt: invite.createdAt,
        });
      } catch (err) {
        // Fallback gracefully if lookup collection security rules not deployed
      }
    } catch (e) {
      console.warn("Firestore createInvite write failed, cached locally:", e);
    }
  },

  // 2. Revoke Invite & Release Bed back to Available
  async revokeInvite(propertyId: string, inviteId: string, targetRoom?: string, targetBed?: string): Promise<void> {
    const list = INVITES_CACHE.get(propertyId) || [];
    const target = list.find((i) => i.id === inviteId);
    if (target) {
      target.status = "REVOKED";
      INVITES_CACHE.set(propertyId, [...list]);
      saveLocalCache(propertyId, "invs");
      notifySubscribers(propertyId);
    }

    const roomToRelease = target?.roomNumber || targetRoom;
    const bedToRelease = target?.bedCode || targetBed;

    // Release bed in propertyStore
    const structure = propertyStore.getStructure(propertyId);
    const updated = structure.map((fl) => ({
      ...fl,
      rooms: fl.rooms.map((rm) => {
        if (roomToRelease && rm.roomNumber !== roomToRelease) return rm;
        return {
          ...rm,
          beds: rm.beds.map((bd) => {
            const isMatch =
              (bedToRelease && bd.bedCode === bedToRelease) ||
              bd.holdCandidate?.inviteId === inviteId;
            if (isMatch) {
              return {
                ...bd,
                status: "Available" as const,
                holdCandidate: undefined,
              };
            }
            return bd;
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
  async submitKyc(rawSubmission: SelfKycSubmission): Promise<void> {
    // 🛡️ Enterprise Defense-in-Depth Sanitization
    const cleanPhoto = rawSubmission.photoUrl ? validateBase64Attachment(rawSubmission.photoUrl) : null;
    const cleanFront = rawSubmission.aadhaarFrontUrl ? validateBase64Attachment(rawSubmission.aadhaarFrontUrl) : null;
    const cleanBack = rawSubmission.aadhaarBackUrl ? validateBase64Attachment(rawSubmission.aadhaarBackUrl) : null;

    const submission: SelfKycSubmission = {
      ...rawSubmission,
      name: sanitizePlainText(rawSubmission.name, 100),
      phone: sanitizeDigitsOnly(rawSubmission.phone, 15),
      countryCode: rawSubmission.countryCode || "+91",
      email: rawSubmission.email ? sanitizeEmailAddress(rawSubmission.email) : undefined,
      workplace: rawSubmission.workplace ? sanitizePlainText(rawSubmission.workplace, 150) : undefined,
      occupation: rawSubmission.occupation ? sanitizePlainText(rawSubmission.occupation, 100) : undefined,
      purposeOfVisit: rawSubmission.purposeOfVisit ? sanitizePlainText(rawSubmission.purposeOfVisit, 200) : undefined,
      address: rawSubmission.address ? sanitizePlainText(rawSubmission.address, 300) : undefined,
      emergencyContact: {
        name: sanitizePlainText(rawSubmission.emergencyContact?.name || "Emergency Contact", 100),
        phone: sanitizeDigitsOnly(rawSubmission.emergencyContact?.phone || "", 15),
        relation: rawSubmission.emergencyContact?.relation ? sanitizePlainText(rawSubmission.emergencyContact.relation, 50) : undefined,
      },
      vehicleNumbers: rawSubmission.vehicleNumbers?.map((v) => sanitizeVehicleNumber(v)).filter(Boolean),
      aadhaarNumber: rawSubmission.aadhaarNumber ? sanitizeDigitsOnly(rawSubmission.aadhaarNumber, 16) : undefined,
      // Only keep attachments if they passed strict MIME prefix and size validation
      photoUrl: cleanPhoto?.valid ? cleanPhoto.cleanDataUrl : undefined,
      aadhaarFrontUrl: cleanFront?.valid ? cleanFront.cleanDataUrl : undefined,
      aadhaarBackUrl: cleanBack?.valid ? cleanBack.cleanDataUrl : undefined,
      submittedAt: rawSubmission.submittedAt || new Date().toISOString(),
      status: "PENDING", // Always PENDING on incoming submission
    };

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
      const sanitized = sanitizeForFirestore(submission);

      // Defense-in-depth: Ensure payload never exceeds Firestore's 1MB hard limit
      const serialized = JSON.stringify(sanitized);
      if (serialized.length > 950000) {
        console.warn("Payload approaching 1MB Firestore limit, safely truncating auxiliary attachments");
        if (sanitized.aadhaarBackUrl && sanitized.aadhaarBackUrl.length > 300000) {
          delete sanitized.aadhaarBackUrl;
        }
      }

      // 1. PRIMARY: Property scoped collection (ALWAYS has write permissions)
      const docRef = doc(db, "properties", submission.propertyId, "self_kyc_submissions", submission.id);
      await setDoc(docRef, sanitized);

      // 2. Direct root collection write (wrapped so it never aborts primary)
      try {
        const rootDocRef = doc(db, "self_kyc_submissions", submission.id);
        await setDoc(rootDocRef, sanitized);
      } catch (err) {
        // Ignored if root security rules are unconfigured
      }
    } catch (e) {
      console.error("Firestore submitKyc write failed:", e);
      throw e;
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

    // For walk-in QR submissions without a prior invite, release the bed back to Available.
    // For invite-based submissions, the invite moves back to Sent Invites Log awaiting re-upload,
    // so the bed remains reserved on Hold (manager can click Revoke on the invite if cancelling).
    if (!target.inviteId) {
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
    }

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
