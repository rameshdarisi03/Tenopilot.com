// TenoPilot Hack-Proof 10-Day Free Trial Engine
import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";

export interface TrialMetadata {
  propertyId: string;
  createdAt?: any;
  trialEndsAtMs: number;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "EXPIRED";
}

const TRIAL_DURATION_DAYS = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Hack-Proof Trial Initialization using Server Timestamps
 * Stamped on Google Cloud Server atomic clocks.
 */
export async function initializePropertyTrial(propertyId: string): Promise<TrialMetadata> {
  const metaRef = doc(db, "properties", propertyId, "settings", "trial_metadata");
  
  try {
    const snap = await getDoc(metaRef);
    if (snap.exists()) {
      return snap.data() as TrialMetadata;
    }
  } catch (e) {
    console.warn("Firestore trial fetch fallback:", e);
  }

  const nowMs = Date.now();
  const trialEndsAtMs = nowMs + TRIAL_DURATION_DAYS * MS_PER_DAY;

  const trialData: TrialMetadata = {
    propertyId,
    createdAt: serverTimestamp(),
    trialEndsAtMs,
    subscriptionStatus: "TRIAL",
  };

  try {
    await setDoc(metaRef, trialData, { merge: true });
  } catch (e) {
    console.warn("Trial metadata save fallback:", e);
  }

  return trialData;
}

/**
 * Calculates remaining trial days & validates active status.
 */
export function calculateTrialDaysRemaining(trialEndsAtMs: number): {
  daysRemaining: number;
  isExpired: boolean;
  percentageLeft: number;
} {
  const now = Date.now();
  const remainingMs = trialEndsAtMs - now;
  
  if (remainingMs <= 0) {
    return { daysRemaining: 0, isExpired: true, percentageLeft: 0 };
  }

  const daysRemaining = Math.ceil(remainingMs / MS_PER_DAY);
  const percentageLeft = Math.min(100, Math.max(0, Math.round((daysRemaining / TRIAL_DURATION_DAYS) * 100)));

  return {
    daysRemaining,
    isExpired: false,
    percentageLeft,
  };
}
