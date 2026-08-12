// TenoPilot Staff Management & RBAC Store with Cloud Firestore Sync
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { sanitizeForFirestore } from "./firestoreService";

export type UserRole = "master_admin" | "admin" | "receptionist";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  assignedPropertyId: string;
  propertyName: string;
  status: "Active" | "Inactive";
  joinedDate: string;
  avatarUrl?: string;
}

// Initial Mock Staff Seed for Instant Testing
const INITIAL_STAFF: StaffMember[] = [
  {
    id: "staff-master-01",
    name: "Ramesh Darisi",
    email: "ramesh@tenopilot.com",
    phone: "+91 9876543210",
    role: "master_admin",
    assignedPropertyId: "sunshine-pg",
    propertyName: "Sunshine Heights PG",
    status: "Active",
    joinedDate: "01 Jan 2026",
  },
  {
    id: "staff-admin-01",
    name: "Vikram Sharma",
    email: "vikram.owner@sunshinepg.com",
    phone: "+91 9812345678",
    role: "admin",
    assignedPropertyId: "sunshine-pg",
    propertyName: "Sunshine Heights PG",
    status: "Active",
    joinedDate: "15 Jan 2026",
  },
  {
    id: "staff-rec-01",
    name: "Priya Sundaram",
    email: "priya.desk@sunshinepg.com",
    phone: "+91 9789012345",
    role: "receptionist",
    assignedPropertyId: "sunshine-pg",
    propertyName: "Sunshine Heights PG",
    status: "Active",
    joinedDate: "01 Feb 2026",
  },
];

class StaffStore {
  private staffList: Map<string, StaffMember[]> = new Map();
  private listeners: Set<() => void> = new Set();
  private activeRole: UserRole = "master_admin";

  constructor() {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("tenopilot_active_role");
      if (savedRole && ["master_admin", "admin", "receptionist"].includes(savedRole)) {
        this.activeRole = savedRole as UserRole;
      }
    }
  }

  // Active Role Management
  getActiveRole(): UserRole {
    return this.activeRole;
  }

  setActiveRole(role: UserRole) {
    this.activeRole = role;
    if (typeof window !== "undefined") {
      localStorage.setItem("tenopilot_active_role", role);
    }
    this.notify();
  }

  // RBAC Permission Checks
  canUserAccessPage(page: string): boolean {
    if (this.activeRole === "master_admin" || this.activeRole === "admin") {
      return true;
    }
    // Receptionist Restrictions
    if (this.activeRole === "receptionist") {
      const restrictedPages = ["staff", "settings"];
      return !restrictedPages.includes(page);
    }
    return true;
  }

  canUserAccessFinancialTab(tab: string): boolean {
    if (this.activeRole === "master_admin" || this.activeRole === "admin") {
      return true;
    }
    // Receptionist can ONLY access Expenses, NOT Revenue or Settlements
    if (this.activeRole === "receptionist") {
      return tab === "Expenses" || tab === "all";
    }
    return true;
  }

  canUserDeleteStaff(targetRole: UserRole): boolean {
    if (this.activeRole === "master_admin") {
      return true; // Master Admin can delete anyone
    }
    if (this.activeRole === "admin") {
      return targetRole === "receptionist"; // Admin can ONLY delete Receptionists
    }
    return false; // Receptionist cannot delete anyone
  }

  canUserCreateRole(targetRole: UserRole): boolean {
    if (this.activeRole === "master_admin") {
      return true;
    }
    if (this.activeRole === "admin") {
      return targetRole === "admin" || targetRole === "receptionist";
    }
    return false;
  }

  // Firestore Real-Time Listener
  initFirebaseListener(propertyId: string) {
    if (typeof window === "undefined") return;
    const isMasterDemo = propertyId === "sunshine-pg";

    if (!this.staffList.has(propertyId)) {
      this.staffList.set(propertyId, isMasterDemo ? [...INITIAL_STAFF] : []);
    }

    try {
      const staffRef = collection(db, "properties", propertyId, "staff");
      onSnapshot(staffRef, (snapshot) => {
        const firestoreItems: StaffMember[] = [];
        snapshot.forEach((docSnap) => {
          firestoreItems.push(docSnap.data() as StaffMember);
        });

        if (firestoreItems.length > 0) {
          this.staffList.set(propertyId, firestoreItems);
          this.notify();
        } else if (!isMasterDemo) {
          this.staffList.set(propertyId, []);
          this.notify();
        }
      });
    } catch (e) {
      console.warn("Firestore staff listener fallback to in-memory store:", e);
    }
  }

  getStaff(propertyId: string): StaffMember[] {
    const isMasterDemo = propertyId === "sunshine-pg";
    return this.staffList.get(propertyId) || (isMasterDemo ? INITIAL_STAFF : []);
  }

  async addStaff(propertyId: string, member: StaffMember): Promise<boolean> {
    const current = this.getStaff(propertyId);
    const updated = [member, ...current.filter((s) => s.id !== member.id)];
    this.staffList.set(propertyId, updated);
    this.notify();

    try {
      const docRef = doc(db, "properties", propertyId, "staff", member.id);
      await setDoc(docRef, sanitizeForFirestore(member), { merge: true });
      return true;
    } catch (e) {
      console.warn("Firestore save staff fallback:", e);
      return false;
    }
  }

  async deleteStaff(propertyId: string, staffId: string): Promise<boolean> {
    const current = this.getStaff(propertyId);
    const updated = current.filter((s) => s.id !== staffId);
    this.staffList.set(propertyId, updated);
    this.notify();

    try {
      const docRef = doc(db, "properties", propertyId, "staff", staffId);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.warn("Firestore delete staff fallback:", e);
      return false;
    }
  }

  async toggleStatus(propertyId: string, staffId: string): Promise<boolean> {
    const current = this.getStaff(propertyId);
    const updated = current.map((s) => {
      if (s.id === staffId) {
        return {
          ...s,
          status: s.status === "Active" ? ("Inactive" as const) : ("Active" as const),
        };
      }
      return s;
    });
    this.staffList.set(propertyId, updated);
    this.notify();

    const target = updated.find((s) => s.id === staffId);
    if (target) {
      try {
        const docRef = doc(db, "properties", propertyId, "staff", staffId);
        await setDoc(docRef, sanitizeForFirestore(target), { merge: true });
      } catch (e) {
        console.warn("Firestore toggle status fallback:", e);
      }
    }
    return true;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const staffStore = new StaffStore();
