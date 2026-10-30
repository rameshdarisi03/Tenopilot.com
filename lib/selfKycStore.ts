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
  deleteField,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
import { portfolioStore } from "@/constants/portfolioStore";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { saveOccupantToFirestore, sanitizeForFirestore } from "@/lib/firestoreService";
import {
  sanitizePlainText,
  sanitizeDigitsOnly,
  sanitizeEmailAddress,
  sanitizeVehicleNumber,
  validateBase64Attachment,
  normalizePhoneNumber,
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
  occupantId?: string;
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
  candidatePhone?: string;
  candidateEmail?: string;
  status: "ACTIVE" | "COMPLETED" | "REVOKED";
  whatsappStatus?: "SENT" | "DELIVERED" | "FAILED" | "PENDING" | "SKIPPED";
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
    if (!propertyId) return () => {};
    if (!SUBMISSION_LISTENERS.has(propertyId)) {
      SUBMISSION_LISTENERS.set(propertyId, new Set());
    }
    SUBMISSION_LISTENERS.get(propertyId)!.add(callback);

    loadLocalCache(propertyId);
    callback(SUBMISSIONS_CACHE.get(propertyId) || []);

    const colRef = collection(db, "properties", propertyId, "self_kyc_submissions");

    // 1. Proactive fresh getDocs query from Firestore to guarantee zero-latency fresh data on mount
    getDocs(colRef)
      .then((snap) => {
        const fetched: SelfKycSubmission[] = snap.docs.map((d) => d.data() as SelfKycSubmission);
        fetched.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        SUBMISSIONS_CACHE.set(propertyId, fetched);
        saveLocalCache(propertyId, "subs");
        notifySubscribers(propertyId);
      })
      .catch((err) => {
        console.warn("Direct submissions fetch notice:", err);
      });

    // 2. Setup real-time Firestore listener
    if (!ACTIVE_UNSUBS.has(`subs_${propertyId}`)) {
      try {
        const unsub = onSnapshot(colRef, (snap) => {
          const fetched: SelfKycSubmission[] = snap.docs.map((d) => d.data() as SelfKycSubmission);
          // Sort newest first
          fetched.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          SUBMISSIONS_CACHE.set(propertyId, fetched);
          saveLocalCache(propertyId, "subs");
          notifySubscribers(propertyId);
        }, (err) => {
          console.warn("Firestore submissions listener error:", err);
          ACTIVE_UNSUBS.delete(`subs_${propertyId}`);
        });
        ACTIVE_UNSUBS.set(`subs_${propertyId}`, unsub);
      } catch (e) {
        console.warn("Firestore offline, using local self-kyc subs:", e);
      }
    }

    return () => {
      const set = SUBMISSION_LISTENERS.get(propertyId);
      set?.delete(callback);
      // Clean up Firestore listener when no active subscribers remain
      if (set && set.size === 0) {
        const unsub = ACTIVE_UNSUBS.get(`subs_${propertyId}`);
        if (unsub) {
          try { unsub(); } catch {}
          ACTIVE_UNSUBS.delete(`subs_${propertyId}`);
        }
      }
    };
  },

  subscribeInvites(propertyId: string, callback: (invs: SelfKycInvite[]) => void) {
    if (!propertyId) return () => {};
    if (!INVITE_LISTENERS.has(propertyId)) {
      INVITE_LISTENERS.set(propertyId, new Set());
    }
    INVITE_LISTENERS.get(propertyId)!.add(callback);

    loadLocalCache(propertyId);
    const initialList = INVITES_CACHE.get(propertyId) || [];
    callback([...initialList]);

    const colRef = collection(db, "properties", propertyId, "self_kyc_invites");

    // 1. Proactive fresh getDocs query to guarantee zero-latency fresh invites on mount
    getDocs(colRef)
      .then((snap) => {
        const fetched: SelfKycInvite[] = snap.docs.map((d) => d.data() as SelfKycInvite);
        const local = INVITES_CACHE.get(propertyId) || [];
        const map = new Map<string, SelfKycInvite>();
        local.forEach((i) => map.set(i.id, i));
        fetched.forEach((i) => map.set(i.id, i));
        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        INVITES_CACHE.set(propertyId, merged);
        saveLocalCache(propertyId, "invs");
        notifySubscribers(propertyId);
      })
      .catch((err) => {
        console.warn("Direct invites fetch notice:", err);
      });

    // 2. Setup Firestore listener to synchronize cloud invites without destructive mutation
    if (!ACTIVE_UNSUBS.has(`invs_${propertyId}`)) {
      try {
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
          ACTIVE_UNSUBS.delete(`invs_${propertyId}`);
        });
        ACTIVE_UNSUBS.set(`invs_${propertyId}`, unsub);
      } catch (e) {
        console.warn("Firestore offline, using local self-kyc invs:", e);
      }
    }

    return () => {
      const set = INVITE_LISTENERS.get(propertyId);
      set?.delete(callback);
      // Clean up Firestore listener when no active subscribers remain
      if (set && set.size === 0) {
        const unsub = ACTIVE_UNSUBS.get(`invs_${propertyId}`);
        if (unsub) {
          try { unsub(); } catch {}
          ACTIVE_UNSUBS.delete(`invs_${propertyId}`);
        }
      }
    };
  },

  // Direct manual refresh to guarantee 100% cloud sync on demand without requiring Ctrl+F5
  async refreshSubmissions(propertyId: string): Promise<SelfKycSubmission[]> {
    if (!propertyId) return [];
    try {
      const colRef = collection(db, "properties", propertyId, "self_kyc_submissions");
      const snap = await getDocs(colRef);
      const fetched: SelfKycSubmission[] = snap.docs.map((d) => d.data() as SelfKycSubmission);
      fetched.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      SUBMISSIONS_CACHE.set(propertyId, fetched);
      saveLocalCache(propertyId, "subs");
      notifySubscribers(propertyId);
      return fetched;
    } catch (e) {
      console.warn("Manual refresh submissions failed:", e);
      return SUBMISSIONS_CACHE.get(propertyId) || [];
    }
  },

  async refreshInvites(propertyId: string): Promise<SelfKycInvite[]> {
    if (!propertyId) return [];
    try {
      const colRef = collection(db, "properties", propertyId, "self_kyc_invites");
      const snap = await getDocs(colRef);
      const fetched: SelfKycInvite[] = snap.docs.map((d) => d.data() as SelfKycInvite);
      const local = INVITES_CACHE.get(propertyId) || [];
      const map = new Map<string, SelfKycInvite>();
      local.forEach((i) => map.set(i.id, i));
      fetched.forEach((i) => map.set(i.id, i));
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      INVITES_CACHE.set(propertyId, merged);
      saveLocalCache(propertyId, "invs");
      notifySubscribers(propertyId);
      return merged;
    } catch (e) {
      console.warn("Manual refresh invites failed:", e);
      return INVITES_CACHE.get(propertyId) || [];
    }
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
            const pId = data.propertyId || data.invite.propertyId || explicitPropertyId || "";
            if (pId) {
              const list = INVITES_CACHE.get(pId) || [];
              INVITES_CACHE.set(pId, [data.invite, ...list.filter((i) => i.id !== data.invite.id)]);
              saveLocalCache(pId, "invs");
            }
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
        const propId = inv.propertyId || explicitPropertyId || "";
        if (propId) {
          const list = INVITES_CACHE.get(propId) || [];
          INVITES_CACHE.set(propId, [inv, ...list.filter((i) => i.id !== inv.id)]);
          saveLocalCache(propId, "invs");
        }
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
      const knownProperties = portfolioStore.getProperties().map((p) => p.id).filter(Boolean);
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
                phone: invite.candidatePhone || "",
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

    const cleanPhone = normalizePhoneNumber(rawSubmission.phone) || sanitizeDigitsOnly(rawSubmission.phone, 10);
    const cleanCountryCode = (rawSubmission.countryCode || "+91").trim();
    const normalizedCc = cleanCountryCode.startsWith("+") ? cleanCountryCode : `+${cleanCountryCode}`;

    const submission: SelfKycSubmission = {
      ...rawSubmission,
      name: sanitizePlainText(rawSubmission.name, 100),
      phone: cleanPhone,
      countryCode: normalizedCc,
      email: rawSubmission.email ? sanitizeEmailAddress(rawSubmission.email) : undefined,
      workplace: rawSubmission.workplace ? sanitizePlainText(rawSubmission.workplace, 150) : undefined,
      occupation: rawSubmission.occupation ? sanitizePlainText(rawSubmission.occupation, 100) : undefined,
      purposeOfVisit: rawSubmission.purposeOfVisit ? sanitizePlainText(rawSubmission.purposeOfVisit, 200) : undefined,
      address: rawSubmission.address ? sanitizePlainText(rawSubmission.address, 300) : undefined,
      emergencyContact: {
        name: sanitizePlainText(rawSubmission.emergencyContact?.name || "Emergency Contact", 100),
        phone: normalizePhoneNumber(rawSubmission.emergencyContact?.phone || "") || sanitizeDigitsOnly(rawSubmission.emergencyContact?.phone || "", 10),
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
    const cleanPrimaryPhone = normalizePhoneNumber(submission.phone);
    const cleanCountryCode = (submission.countryCode || "+91").trim();
    const normalizedCc = cleanCountryCode.startsWith("+") ? cleanCountryCode : `+${cleanCountryCode}`;

    const newResident: Occupant = {
      id: newOccupantId,
      name: submission.name.trim(),
      avatar: submission.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(submission.name)}`,
      phone: `${normalizedCc} ${cleanPrimaryPhone}`,
      countryCode: normalizedCc,
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
        phone: normalizePhoneNumber(submission.emergencyContact?.phone || "") || submission.emergencyContact?.phone || "",
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

    let structure = propertyStore.getStructure(submission.propertyId);
    if (!structure || structure.length === 0) {
      try {
        const structSnap = await getDoc(doc(db, "properties", submission.propertyId, "layout", "structure"));
        if (structSnap.exists()) {
          structure = (structSnap.data()?.floors || []) as FloorConfig[];
        }
      } catch (e) {
        console.warn("Layout fetch fallback in approveSubmission:", e);
      }
    }

    const cleanSubRoom = (submission.roomNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanSubBed = (submission.bedCode || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const updatedStructure = (structure || []).map((fl) => ({
      ...fl,
      rooms: fl.rooms.map((rm) => {
        const cleanRm = (rm.roomNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanRm !== cleanSubRoom) return rm;
        return {
          ...rm,
          beds: rm.beds.map((bd) => {
            const cleanBd = (bd.bedCode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanBd !== cleanSubBed) return bd;
            return {
              ...bd,
              status: targetBedStatus,
              occupant: {
                ...newResident,
                avatar: newResident.avatar?.startsWith("data:")
                  ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newResident.name)}`
                  : newResident.avatar,
                kycDocs: undefined,
              },
              holdCandidate: null as any,
              vacatingDate: null as any,
            };
          }),
        };
      }),
    }));

    await propertyStore.updateStructure(updatedStructure, submission.propertyId);

    // Direct Firestore Layout SSOT Sync
    try {
      const docRef = doc(db, "properties", submission.propertyId, "layout", "structure");
      const sanitizedFloors = sanitizeForFirestore(updatedStructure);
      await setDoc(docRef, {
        floors: sanitizedFloors,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (fsLayoutErr) {
      console.warn("Direct Firestore layout sync in approveSubmission:", fsLayoutErr);
    }

    // Update submission record
    submission.status = "APPROVED";
    submission.reviewedAt = new Date().toISOString();
    submission.reviewedBy = reviewerName;
    submission.occupantId = newOccupantId;

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
        occupantId: newOccupantId,
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

    // Clean up large image data from memory cache so garbage does not pile up
    delete target.photoUrl;
    delete target.aadhaarFrontUrl;
    delete target.aadhaarBackUrl;

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
        photoUrl: deleteField(),
        aadhaarFrontUrl: deleteField(),
        aadhaarBackUrl: deleteField(),
      });
    } catch (e) {
      console.warn("Firestore rejection cleanup notice:", e);
    }
  },

  // 6. Fetch Latest Prior Submission for Invite (Pre-fills correction forms so residents don't re-type or re-upload)
  async fetchLatestSubmissionForInviteAsync(
    propertyId: string,
    inviteId: string,
    candidatePhone?: string
  ): Promise<SelfKycSubmission | null> {
    if (!inviteId && !candidatePhone) return null;

    let match: SelfKycSubmission | null = null;
    const cleanPhoneDigits = candidatePhone ? candidatePhone.replace(/\D/g, "").slice(-10) : "";

    // 1. Check local cache
    const cached = SUBMISSIONS_CACHE.get(propertyId) || [];
    if (inviteId) {
      match = cached
        .filter((s) => s.inviteId === inviteId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0] || null;
    }
    if (!match && cleanPhoneDigits) {
      match = cached
        .filter((s) => (s.phone || "").replace(/\D/g, "").slice(-10) === cleanPhoneDigits)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0] || null;
    }

    // 2. Check localStorage
    if (!match && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`tenopilot_self_kyc_subs_${propertyId}`);
        if (raw) {
          const list: SelfKycSubmission[] = JSON.parse(raw);
          if (inviteId) {
            match = list
              .filter((s) => s.inviteId === inviteId)
              .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0] || null;
          }
          if (!match && cleanPhoneDigits) {
            match = list
              .filter((s) => (s.phone || "").replace(/\D/g, "").slice(-10) === cleanPhoneDigits)
              .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0] || null;
          }
        }
      } catch (e) {}
    }

    // 3. Query Firestore properties/{propertyId}/self_kyc_submissions
    if (!match && inviteId) {
      try {
        const q = query(
          collection(db, "properties", propertyId, "self_kyc_submissions"),
          where("inviteId", "==", inviteId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docs = snap.docs.map((d) => d.data() as SelfKycSubmission);
          docs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          match = docs[0];
        }
      } catch (e) {
        console.warn("Firestore latest submission query notice:", e);
      }
    }

    // 4. Secondary lookup by candidate phone if still not found
    if (!match && cleanPhoneDigits) {
      try {
        const snap = await getDocs(collection(db, "properties", propertyId, "self_kyc_submissions"));
        if (!snap.empty) {
          const phoneDocs = snap.docs
            .map((d) => d.data() as SelfKycSubmission)
            .filter((s) => (s.phone || "").replace(/\D/g, "").slice(-10) === cleanPhoneDigits)
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          if (phoneDocs.length > 0) {
            match = phoneDocs[0];
          }
        }
      } catch (e) {
        console.warn("Firestore phone-based submission query notice:", e);
      }
    }

    // 5. Smart Image Back-fill: If match exists but images are missing, check if candidate uploaded them previously
    if (match && cleanPhoneDigits && (!match.photoUrl || !match.aadhaarFrontUrl || !match.aadhaarBackUrl)) {
      try {
        const snap = await getDocs(collection(db, "properties", propertyId, "self_kyc_submissions"));
        if (!snap.empty) {
          const withImages = snap.docs
            .map((d) => d.data() as SelfKycSubmission)
            .filter((s) => (s.phone || "").replace(/\D/g, "").slice(-10) === cleanPhoneDigits)
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

          for (const s of withImages) {
            if (!match.photoUrl && s.photoUrl) match.photoUrl = s.photoUrl;
            if (!match.aadhaarFrontUrl && s.aadhaarFrontUrl) match.aadhaarFrontUrl = s.aadhaarFrontUrl;
            if (!match.aadhaarBackUrl && s.aadhaarBackUrl) match.aadhaarBackUrl = s.aadhaarBackUrl;
            if (!match.aadhaarNumber && s.aadhaarNumber) match.aadhaarNumber = s.aadhaarNumber;
          }
        }
      } catch (e) {
        console.warn("Smart image recovery query notice:", e);
      }
    }

    return match;
  },
};
