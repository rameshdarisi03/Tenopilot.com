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
        if (occupants.length > 0) {
          onUpdate(occupants);
        }
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
