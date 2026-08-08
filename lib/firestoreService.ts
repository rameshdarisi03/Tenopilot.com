// TenoPilot Firebase Cloud Firestore Service (TAS Chapter 4 & 9)
import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
} from "firebase/firestore";
import { Occupant } from "@/constants/mockOccupants";

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
    await setDoc(occupantRef, occupant, { merge: true });
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
    await updateDoc(occupantRef, updates);
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
 * Purge all mock/demo occupants permanently from Firebase Cloud Firestore
 */
export async function purgeAllMockOccupantsFromFirestore(
  propertyId: string = "sunshine-pg"
): Promise<number> {
  try {
    const occupantsRef = collection(db, "properties", propertyId, "occupants");
    const snapshot = await getDocs(occupantsRef);
    let deletedCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const id = docSnap.id;
      const name = data.name || "";

      // Regex matching short mock IDs like occ-001 to occ-200, occ-1 to occ-999
      const isShortMockId = /^occ-\d{1,3}$/.test(id);
      const isMockPattern =
        id.startsWith("occ-test") ||
        id.startsWith("tera") ||
        id.startsWith("mock-") ||
        id === "occ-987";
      const isMockName =
        name === "Jasprit Bumrah" ||
        name === "Karan Johar" ||
        name === "Shubman Gill" ||
        name === "Rohan Gupta" ||
        name === "KL Rahul" ||
        name === "Meera Iyer" ||
        name === "Ranbir Kapoor" ||
        name === "Ravindra Jadeja" ||
        name === "Ananya Reddy" ||
        name.includes("Ananya") ||
        name.includes("Future Guest") ||
        name === "sora" ||
        name === "sora2" ||
        name === "soraguest";

      if (isShortMockId || isMockPattern || isMockName) {
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
    await setDoc(expenseRef, expense, { merge: true });
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
