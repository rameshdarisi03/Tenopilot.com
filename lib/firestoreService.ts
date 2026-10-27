// TenoPilot Firebase Cloud Firestore Service (TAS Chapter 4 & 9)
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
  query,
} from "firebase/firestore";
import { Occupant } from "@/constants/mockOccupants";

/**
 * Recursively sanitizes an object for Firebase Cloud Firestore by stripping all `undefined` values.
 * Firestore throws unsupported error if any object property is `undefined`.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as unknown as T;
  if (typeof obj !== "object") return obj;
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (value === undefined ? null : value))
  ) as T;
}

/**
 * Save or update an occupant record in Firebase Cloud Firestore
 * Collection Path: properties/{propertyId}/occupants/{occupantId}
 */
export async function saveOccupantToFirestore(
  propertyId: string,
  occupant: Occupant
): Promise<boolean> {
  try {
    const occupantRef = doc(
      db,
      "properties",
      propertyId,
      "occupants",
      occupant.id
    );
    const sanitizedOccupant = sanitizeForFirestore(occupant);
    await setDoc(occupantRef, sanitizedOccupant, { merge: true });

    // 📱 Multi-tenant Phone Index: Fast O(1) lookup for WhatsApp Webhooks & Inbound Routing
    if (occupant.phone) {
      const cleanPhone = occupant.phone.replace(/\D/g, "").slice(-10);
      if (cleanPhone.length === 10) {
        try {
          const phoneIndexRef = doc(db, "occupants_by_phone", cleanPhone);
          await setDoc(
            phoneIndexRef,
            {
              phone: cleanPhone,
              occupantId: occupant.id,
              occupantName: occupant.name,
              propertyId: propertyId,
              roomNumber: occupant.roomNumber || null,
              bedCode: occupant.bedCode || null,
              rentAmount: occupant.rentAmount || 0,
              lifecycleStatus: occupant.lifecycleStatus || "Active",
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn("Notice updating phone index:", e);
        }
      }
    }

    return true;
  } catch (error) {
    console.warn("Firestore save fallback to in-memory store:", error);
    return false;
  }
}

/**
 * Update specific fields of an occupant record in Firebase Cloud Firestore
 */
export async function updateOccupantInFirestore(
  propertyId: string,
  occupantId: string,
  updates: Partial<Occupant>
): Promise<boolean> {
  try {
    const occupantRef = doc(
      db,
      "properties",
      propertyId,
      "occupants",
      occupantId
    );
    const sanitizedUpdates = sanitizeForFirestore(updates);
    await updateDoc(occupantRef, sanitizedUpdates);

    // Update phone index if phone was modified
    if (updates.phone) {
      const cleanPhone = updates.phone.replace(/\D/g, "").slice(-10);
      if (cleanPhone.length === 10) {
        try {
          const phoneIndexRef = doc(db, "occupants_by_phone", cleanPhone);
          await setDoc(
            phoneIndexRef,
            {
              phone: cleanPhone,
              occupantId: occupantId,
              occupantName: updates.name,
              propertyId: propertyId,
              roomNumber: updates.roomNumber || null,
              bedCode: updates.bedCode || null,
              rentAmount: updates.rentAmount,
              lifecycleStatus: updates.lifecycleStatus,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {}
      }
    }

    return true;
  } catch (error) {
    console.warn("Firestore update fallback to in-memory store:", error);
    return false;
  }
}

/**
 * Delete occupant record permanently from Firebase Cloud Firestore
 * Collection Path: properties/{propertyId}/occupants/{occupantId}
 */
export async function deleteOccupantFromFirestore(
  propertyId: string,
  occupantId: string
): Promise<boolean> {
  try {
    const occupantRef = doc(db, "properties", propertyId, "occupants", occupantId);
    await deleteDoc(occupantRef);
    return true;
  } catch (error) {
    console.warn("Firestore delete occupant error:", error);
    return false;
  }
}

/**
 * Standardized identification helpers for Mock vs Genuine Onboarded Occupants
 * - Mock IDs: mock-tenant-*, mock-guest-*, tera*, *test-*, demo-*
 * - Genuine Onboarded IDs: tenant-timestamp, guest-timestamp, occ-timestamp
 */
export function isMockOccupantId(id: string): boolean {
  if (!id) return false;
  return (
    id.startsWith("mock-") ||
    id.startsWith("tera") ||
    id.includes("test-") ||
    id.startsWith("demo-")
  );
}

export function isGenuineOccupantId(id: string): boolean {
  if (!id) return false;
  return !isMockOccupantId(id);
}

/**
 * Purge all mock/demo occupants permanently from Firebase Cloud Firestore
 * Keeps ONLY real onboarded tenants and guests
 */
export async function purgeAllMockOccupantsFromFirestore(
  propertyId: string = "sunshine-pg"
): Promise<number> {
  try {
    const occupantsRef = collection(db, "properties", propertyId, "occupants");
    const snapshot = await getDocs(occupantsRef);
    let deletedCount = 0;

    for (const docSnap of snapshot.docs) {
      const id = docSnap.id;

      if (isMockOccupantId(id)) {
        await deleteDoc(doc(db, "properties", propertyId, "occupants", id));
        deletedCount++;
      }
    }
    return deletedCount;
  } catch (error) {
    console.warn("Error purging mock occupants from Firestore:", error);
    return 0;
  }
}

/**
 * Fetch all occupants for a property from Firebase Cloud Firestore
 */
export async function fetchOccupantsFromFirestore(
  propertyId: string
): Promise<Occupant[]> {
  try {
    const occupantsRef = collection(db, "properties", propertyId, "occupants");
    const snapshot = await getDocs(occupantsRef);
    const occupants: Occupant[] = [];
    snapshot.forEach((doc) => {
      occupants.push(doc.data() as Occupant);
    });
    return occupants;
  } catch (error) {
    console.warn("Firestore fetch fallback to in-memory store:", error);
    return [];
  }
}

/**
 * Subscribe to real-time Cloud Firestore updates for a property
 */
export function subscribeOccupantsFromFirestore(
  propertyId: string,
  onUpdate: (occupants: Occupant[]) => void
): () => void {
  try {
    const occupantsRef = collection(db, "properties", propertyId, "occupants");
    const q = query(occupantsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const occupants: Occupant[] = [];
        snapshot.forEach((doc) => {
          occupants.push(doc.data() as Occupant);
        });
        onUpdate(occupants);
      },
      (error) => {
        console.warn("Firestore real-time listener error:", error);
      }
    );

    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Automatically cascades global vehicle parking charges to all residents with registered vehicles.
 * If resident has an explicit custom exception (isParkingException = true), their custom fee is preserved.
 * Occupants without vehicles will have their parking charges set to 0.
 */
export async function syncVehicleParkingChargesToOccupants(
  propertyId: string,
  newParkingFee: number
): Promise<{ updatedCount: number; totalVehicles: number }> {
  try {
    const occupants = await fetchOccupantsFromFirestore(propertyId);
    let updatedCount = 0;
    let totalVehicles = 0;
    const batchUpdates: Promise<any>[] = [];

    for (const occ of occupants) {
      const single = occ.vehicleNumber ? String(occ.vehicleNumber).trim() : "";
      const hasVeh = single.length > 0 || (Array.isArray(occ.vehicleNumbers) && occ.vehicleNumbers.some((v) => v && String(v).trim().length > 0));

      if (hasVeh) {
        totalVehicles++;
        // If resident does NOT have a custom exception, update to new global fee
        if (!occ.isParkingException) {
          const targetCharge = newParkingFee > 0 ? newParkingFee : 0;
          if (occ.parkingCharges !== targetCharge) {
            const occRef = doc(db, "properties", propertyId, "occupants", occ.id);
            batchUpdates.push(
              updateDoc(occRef, {
                parkingCharges: targetCharge,
                updatedAt: new Date().toISOString(),
              })
            );
            occ.parkingCharges = targetCharge;
            updatedCount++;
          }
        }
      } else if (occ.parkingCharges && occ.parkingCharges > 0 && !occ.isParkingException) {
        // Resident without vehicle should not have a parking charge
        const occRef = doc(db, "properties", propertyId, "occupants", occ.id);
        batchUpdates.push(
          updateDoc(occRef, {
            parkingCharges: 0,
            updatedAt: new Date().toISOString(),
          })
        );
        occ.parkingCharges = 0;
        updatedCount++;
      }
    }

    if (batchUpdates.length > 0) {
      await Promise.all(batchUpdates);
    }

    return { updatedCount, totalVehicles };
  } catch (err) {
    console.error("Error syncing vehicle parking charges to occupants:", err);
    return { updatedCount: 0, totalVehicles: 0 };
  }
}

/**
 * Save or update full property layout structure in Firebase Cloud Firestore
 * Document Path: properties/{propertyId}/layout/structure
 */
export async function savePropertyLayoutToFirestore(
  propertyId: string = "sunshine-pg",
  structure: any
): Promise<boolean> {
  try {
    const layoutRef = doc(db, "properties", propertyId, "layout", "structure");
    await setDoc(layoutRef, { floors: structure, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Firestore save layout fallback:", error);
    return false;
  }
}

/**
 * Cloud Firestore Expenses Operations
 * Collection Path: properties/{propertyId}/expenses/{expenseId}
 */
export async function saveExpenseToFirestore(
  propertyId: string,
  expense: any
): Promise<boolean> {
  try {
    const expenseRef = doc(db, "properties", propertyId, "expenses", expense.id);
    const sanitizedExpense = sanitizeForFirestore(expense);
    await setDoc(expenseRef, sanitizedExpense, { merge: true });
    return true;
  } catch (error) {
    console.warn("Firestore save expense fallback:", error);
    return false;
  }
}

export async function fetchExpensesFromFirestore(
  propertyId: string
): Promise<any[]> {
  try {
    const expensesRef = collection(db, "properties", propertyId, "expenses");
    const snapshot = await getDocs(expensesRef);
    const expenses: any[] = [];
    snapshot.forEach((doc) => {
      expenses.push(doc.data());
    });
    return expenses;
  } catch (error) {
    console.warn("Firestore fetch expenses fallback:", error);
    return [];
  }
}

export async function deleteExpenseFromFirestore(
  propertyId: string,
  expenseId: string
): Promise<boolean> {
  try {
    const expenseRef = doc(db, "properties", propertyId, "expenses", expenseId);
    await deleteDoc(expenseRef);
    return true;
  } catch (error) {
    console.warn("Firestore delete expense fallback:", error);
    return false;
  }
}

export function subscribeExpensesFromFirestore(
  propertyId: string,
  onUpdate: (expenses: any[]) => void
): () => void {
  try {
    const expensesRef = collection(db, "properties", propertyId, "expenses");
    const q = query(expensesRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const expenses: any[] = [];
        snapshot.forEach((doc) => {
          expenses.push(doc.data());
        });
        onUpdate(expenses);
      },
      (error) => {
        console.warn("Firestore expenses listener error:", error);
      }
    );

    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Cloud Firestore Recurring Bills Operations
 * Collection Path: properties/{propertyId}/recurring_bills/{billId}
 */
export async function saveRecurringBillToFirestore(
  propertyId: string,
  bill: any
): Promise<boolean> {
  try {
    const billRef = doc(db, "properties", propertyId, "recurring_bills", bill.id);
    await setDoc(billRef, bill, { merge: true });
    return true;
  } catch (error) {
    console.warn("Firestore save recurring bill fallback:", error);
    return false;
  }
}

export async function fetchRecurringBillsFromFirestore(
  propertyId: string
): Promise<any[]> {
  try {
    const billsRef = collection(db, "properties", propertyId, "recurring_bills");
    const snapshot = await getDocs(billsRef);
    const bills: any[] = [];
    snapshot.forEach((doc) => {
      bills.push(doc.data());
    });
    return bills;
  } catch (error) {
    console.warn("Firestore fetch recurring bills fallback:", error);
    return [];
  }
}

export async function deleteRecurringBillFromFirestore(
  propertyId: string,
  billId: string
): Promise<boolean> {
  try {
    const billRef = doc(db, "properties", propertyId, "recurring_bills", billId);
    await deleteDoc(billRef);
    return true;
  } catch (error) {
    console.warn("Firestore delete recurring bill fallback:", error);
    return false;
  }
}

export function subscribeRecurringBillsFromFirestore(
  propertyId: string,
  onUpdate: (bills: any[]) => void
): () => void {
  try {
    const billsRef = collection(db, "properties", propertyId, "recurring_bills");
    const q = query(billsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bills: any[] = [];
        snapshot.forEach((doc) => {
          bills.push(doc.data());
        });
        onUpdate(bills);
      },
      (error) => {
        console.warn("Firestore recurring bills listener error:", error);
      }
    );

    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * 📝 FastTrack Migration AI Draft Persistence (Cloud Firestore SSOT)
 * Preserves draft across logout, device changes, and browser restarts.
 * Collection Path: properties/{propertyId}/drafts/fasttrack
 */
export async function saveFastTrackDraftToFirestore(
  propertyId: string,
  draftData: any
): Promise<boolean> {
  try {
    const draftRef = doc(db, "properties", propertyId, "drafts", "fasttrack");
    const sanitized = sanitizeForFirestore(draftData);
    await setDoc(draftRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.warn("Firestore save fasttrack draft fallback:", error);
    return false;
  }
}

export async function getFastTrackDraftFromFirestore(
  propertyId: string
): Promise<any | null> {
  try {
    const draftRef = doc(db, "properties", propertyId, "drafts", "fasttrack");
    const snap = await getDoc(draftRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.warn("Firestore get fasttrack draft fallback:", error);
    return null;
  }
}

export async function deleteFastTrackDraftFromFirestore(
  propertyId: string
): Promise<boolean> {
  try {
    const draftRef = doc(db, "properties", propertyId, "drafts", "fasttrack");
    await deleteDoc(draftRef);
    return true;
  } catch (error) {
    console.warn("Firestore delete fasttrack draft fallback:", error);
    return false;
  }
}
