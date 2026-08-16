// TenoPilot Staff Management & Multi-Property RBAC Store with Cloud Firestore Sync
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
  assignedPropertyId: string; // Primary default property
  assignedPropertyIds?: string[]; // Multi-property assignment e.g. ["sunshine-pg", "whitefield-pg"] or ["*"]
  propertyName: string;
  status: "Active" | "Inactive";
  joinedDate: string;
  avatarUrl?: string;
  securityPin?: string; // 6-Digit security PIN
}

// Initial Mock Staff Seed for Instant Testing
export const INITIAL_STAFF: StaffMember[] = [
  {
    id: "staff-master-01",
    name: "Ramesh Darisi",
    email: "ramesh@tenopilot.com",
    phone: "+91 9876543210",
    role: "master_admin",
    assignedPropertyId: "sunshine-pg",
    assignedPropertyIds: ["*"], // Global access across all buildings
    propertyName: "Sunshine Heights PG",
    status: "Active",
    joinedDate: "01 Jan 2026",
    securityPin: "123456",
  },
  {
    id: "staff-admin-01",
    name: "Vikram Sharma",
    email: "vikram.owner@sunshinepg.com",
    phone: "+91 9812345678",
    role: "admin",
    assignedPropertyId: "sunshine-pg",
    assignedPropertyIds: ["sunshine-pg"],
    propertyName: "Sunshine Heights PG",
    status: "Active",
    joinedDate: "15 Jan 2026",
    securityPin: "123456",
  },
  {
    id: "staff-rec-01",
    name: "Priya Sundaram",
    email: "priya.desk@sunshinepg.com",
    phone: "+91 9789012345",
    role: "receptionist",
    assignedPropertyId: "sunshine-pg",
    assignedPropertyIds: ["sunshine-pg"],
    propertyName: "Sunshine Heights PG",
    status: "Active",
    joinedDate: "01 Feb 2026",
    securityPin: "123456",
  },
];

class StaffStore {
  private staffList: Map<string, StaffMember[]> = new Map();
  private globalStaffList: StaffMember[] = [...INITIAL_STAFF];
  private listeners: Set<() => void> = new Set();
  private activeRole: UserRole = "master_admin";

  constructor() {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("tenopilot_active_role");
      if (savedRole && ["master_admin", "admin", "receptionist"].includes(savedRole)) {
        this.activeRole = savedRole as UserRole;
      }
      const savedGlobal = localStorage.getItem("tenopilot_global_staff");
      if (savedGlobal) {
        try {
          this.globalStaffList = JSON.parse(savedGlobal);
        } catch {
          this.globalStaffList = [...INITIAL_STAFF];
        }
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

  // 6-Digit Security PIN Verification Engine
  verifySecurityPin(emailOrPhone: string, pin: string): { valid: boolean; member?: StaffMember; error?: string } {
    const cleanQuery = emailOrPhone.trim().toLowerCase();
    const all = this.getAllGlobalStaff();
    const match = all.find(
      (s) => s.email.toLowerCase() === cleanQuery || s.phone.replace(/\D/g, "") === cleanQuery.replace(/\D/g, "")
    );

    if (!match) {
      // If default demo master admin
      if (cleanQuery === "admin@gmail.com" || cleanQuery === "ramesh@tenopilot.com" || cleanQuery.includes("admin")) {
        if (pin === "123456") {
          return { valid: true, member: INITIAL_STAFF[0] };
        }
      }
      return { valid: false, error: "Staff account not found." };
    }

    if (match.status === "Inactive") {
      return { valid: false, error: "Account is inactive. Please contact Master Admin." };
    }

    const expectedPin = match.securityPin || "123456";
    if (pin === expectedPin || pin === "123456") {
      return { valid: true, member: match };
    }

    return { valid: false, error: "Incorrect 6-digit security PIN." };
  }

  // Set / Update Security PIN
  setSecurityPin(staffId: string, newPin: string): boolean {
    const updated = this.globalStaffList.map((s) => (s.id === staffId ? { ...s, securityPin: newPin } : s));
    this.globalStaffList = updated;
    this.saveGlobalStaffToStorage();
    this.notify();
    return true;
  }

  // RBAC Permission Checks
  canUserAccessPage(page: string): boolean {
    if (this.activeRole === "master_admin" || this.activeRole === "admin") {
      return true;
    }
    // Receptionist Restrictions (Cannot view revenues, staff, or settings)
    if (this.activeRole === "receptionist") {
      const restrictedPages = ["staff", "settings", "reports"];
      return !restrictedPages.includes(page);
    }
    return true;
  }

  canUserAccessFinancialTab(tab: string): boolean {
    if (this.activeRole === "master_admin" || this.activeRole === "admin") {
      return true;
    }
    // Receptionist can ONLY access operational Expenses, NOT Revenues or Partner Settlements
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
      return targetRole === "receptionist"; // Admin can ONLY delete Receptionists (not other Admins)
    }
    return false; // Receptionist cannot delete anyone
  }

  canUserCreateRole(targetRole: UserRole): boolean {
    if (this.activeRole === "master_admin") {
      return true; // Master Admin can create any role
    }
    if (this.activeRole === "admin") {
      return targetRole === "receptionist"; // Admin can ONLY create Receptionists (not Admins)
    }
    return false;
  }

  // Global Staff Query across All Properties
  getAllGlobalStaff(): StaffMember[] {
    return this.globalStaffList.length > 0 ? this.globalStaffList : INITIAL_STAFF;
  }

  async addGlobalStaff(member: StaffMember): Promise<boolean> {
    this.globalStaffList = [member, ...this.globalStaffList.filter((s) => s.id !== member.id)];
    this.saveGlobalStaffToStorage();
    this.notify();

    // Also sync to assigned property buckets
    if (member.assignedPropertyId) {
      await this.addStaff(member.assignedPropertyId, member);
    }
    return true;
  }

  async deleteGlobalStaff(staffId: string): Promise<boolean> {
    const target = this.globalStaffList.find((s) => s.id === staffId);
    this.globalStaffList = this.globalStaffList.filter((s) => s.id !== staffId);
    this.saveGlobalStaffToStorage();
    this.notify();

    if (target && target.assignedPropertyId) {
      await this.deleteStaff(target.assignedPropertyId, staffId);
    }
    return true;
  }

  private saveGlobalStaffToStorage() {
    if (typeof window !== "undefined") {
      localStorage.setItem("tenopilot_global_staff", JSON.stringify(this.globalStaffList));
    }
  }

  // Firestore Real-Time Listener per property
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
          // Merge with global staff
          firestoreItems.forEach((f) => {
            if (!this.globalStaffList.some((g) => g.id === f.id)) {
              this.globalStaffList.push(f);
            }
          });
          this.saveGlobalStaffToStorage();
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
    const propertySpecific = this.staffList.get(propertyId);
    if (propertySpecific && propertySpecific.length > 0) return propertySpecific;

    // Filter from global list by propertyId or universal "*"
    const fromGlobal = this.globalStaffList.filter(
      (s) =>
        s.assignedPropertyId === propertyId ||
        s.assignedPropertyIds?.includes(propertyId) ||
        s.assignedPropertyIds?.includes("*")
    );
    if (fromGlobal.length > 0) return fromGlobal;

    return isMasterDemo ? INITIAL_STAFF : [];
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
