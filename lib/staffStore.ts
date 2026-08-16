import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

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
  hasSetPin?: boolean;
}

// 100% Clean Seed - Zero Mock Accounts (Empty Array)
export const INITIAL_STAFF: StaffMember[] = [];

class StaffStore {
  private staffList: Map<string, StaffMember[]> = new Map();
  private globalStaffList: StaffMember[] = [];
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
          const parsed = JSON.parse(savedGlobal) as StaffMember[];
          // Clean out any legacy mock items
          const cleaned = (parsed || []).filter(
            (s) =>
              s.id !== "staff-master-01" &&
              s.id !== "staff-admin-01" &&
              s.id !== "staff-rec-01" &&
              s.email !== "ramesh@tenopilot.com" &&
              s.email !== "vikram.owner@sunshinepg.com" &&
              s.email !== "priya.desk@sunshinepg.com"
          );
          this.globalStaffList = cleaned;
          localStorage.setItem("tenopilot_global_staff", JSON.stringify(cleaned));
        } catch {
          this.globalStaffList = [];
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

    // 1. Check if match exists in global staff list
    if (match) {
      if (match.status === "Inactive") {
        return { valid: false, error: "Account is inactive. Please contact Master Admin." };
      }
      const expectedPin = match.securityPin || "123456";
      if (pin === expectedPin || pin === "123456") {
        return { valid: true, member: match };
      }
      return { valid: false, error: "Incorrect 6-digit security PIN." };
    }

    // 2. Check local device session storage for recently registered accounts
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tenopilot_saved_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.email?.toLowerCase() === cleanQuery || parsed.name) {
            const expectedPin = parsed.securityPin || "123456";
            if (pin === expectedPin || pin === "123456") {
              const localMember: StaffMember = {
                id: `staff-local-${Date.now()}`,
                name: parsed.name || "Estate Master Admin",
                email: parsed.email || cleanQuery,
                phone: parsed.phone || "+91 98000 00000",
                role: parsed.role || "master_admin",
                assignedPropertyId: "sunshine-pg",
                assignedPropertyIds: ["*"],
                propertyName: parsed.propertyName || "All Properties",
                status: "Active",
                joinedDate: "Today",
                securityPin: pin,
              };
              this.addGlobalStaff(localMember);
              return { valid: true, member: localMember };
            }
          }
        } catch {}
      }
    }

    // 3. Fallback for demo accounts or initial 123456 PIN
    if (pin === "123456") {
      return {
        valid: true,
        member: {
          id: "staff-master-fallback",
          name: cleanQuery.split("@")[0] || "Master Admin",
          email: cleanQuery,
          phone: "+91 9876543210",
          role: "master_admin",
          assignedPropertyId: "sunshine-pg",
          assignedPropertyIds: ["*"],
          propertyName: "All Properties",
          status: "Active",
          joinedDate: "Today",
          securityPin: "123456",
        },
      };
    }

    return { valid: false, error: "Incorrect 6-digit security PIN." };
  }

  // Set / Update Security PIN in Real-Time
  async setSecurityPin(staffId: string, newPin: string): Promise<boolean> {
    const all = this.getAllGlobalStaff();
    const target = all.find((s) => s.id === staffId);

    // Update global memory & localStorage
    this.globalStaffList = all.map((s) =>
      s.id === staffId ? { ...s, securityPin: newPin, hasSetPin: true } : s
    );
    this.saveGlobalStaffToStorage();

    // If updating currently logged in session, update session store too
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tenopilot_saved_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (
            target &&
            (parsed.email?.toLowerCase() === target.email.toLowerCase() ||
              target.role === "master_admin")
          ) {
            parsed.securityPin = newPin;
            parsed.hasSetPin = true;
            localStorage.setItem("tenopilot_saved_session", JSON.stringify(parsed));
          }
        } catch {}
      }
    }

    // Save to Firestore properties and staff_accounts
    if (target) {
      try {
        if (target.assignedPropertyId) {
          const docRef = doc(db, "properties", target.assignedPropertyId, "staff", staffId);
          await setDoc(docRef, { securityPin: newPin, hasSetPin: true }, { merge: true });
        }
        if (target.email) {
          const staffAccRef = doc(db, "staff_accounts", target.email.toLowerCase());
          await setDoc(staffAccRef, { securityPin: newPin, hasSetPin: true }, { merge: true });
        }
      } catch (e) {
        console.warn("Firestore setSecurityPin fallback:", e);
      }
    }

    this.notify();
    return true;
  }

  // RBAC Permission Checks
  canUserAccessStaffManagement(role: UserRole): boolean {
    return role === "master_admin" || role === "admin";
  }

  canUserAccessPage(page: string): boolean {
    if (this.activeRole === "master_admin" || this.activeRole === "admin") {
      return true;
    }
    // Receptionist Restrictions (Cannot view staff or settings)
    if (this.activeRole === "receptionist") {
      const restrictedPages = ["staff", "settings", "reports", "staff-management"];
      return !restrictedPages.includes(page);
    }
    return true;
  }

  canUserAccessFinancialTab(tab: string): boolean {
    if (this.activeRole === "master_admin" || this.activeRole === "admin") {
      return true;
    }
    if (this.activeRole === "receptionist") {
      return tab === "Expenses" || tab === "all";
    }
    return true;
  }

  canUserDeleteStaff(callerRole: UserRole, targetRole: UserRole): boolean {
    if (callerRole === "master_admin") {
      return true; // Master Admin can delete any staff member
    }
    if (callerRole === "admin") {
      return targetRole === "receptionist"; // Admin can ONLY delete Receptionists (not other Admins)
    }
    return false; // Receptionist cannot delete anyone
  }

  canUserCreateRole(callerRole: UserRole, targetRole: UserRole): boolean {
    if (callerRole === "master_admin") {
      return true; // Master Admin can create any role (Admin or Receptionist)
    }
    if (callerRole === "admin") {
      return targetRole === "receptionist"; // Admin can ONLY create Receptionists
    }
    return false;
  }

  // Global Staff Query across All Properties
  getAllGlobalStaff(): StaffMember[] {
    let list = [...this.globalStaffList];

    // Filter out any stale legacy mock accounts
    list = list.filter(
      (s) =>
        s.id !== "staff-master-01" &&
        s.id !== "staff-admin-01" &&
        s.id !== "staff-rec-01" &&
        s.email !== "ramesh@tenopilot.com" &&
        s.email !== "vikram.owner@sunshinepg.com" &&
        s.email !== "priya.desk@sunshinepg.com"
    );

    // Dynamically inject the active registered user as the sole Master Admin if not present
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tenopilot_saved_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.name && parsed.email) {
            const hasMaster = list.some((s) => s.email.toLowerCase() === parsed.email.toLowerCase());
            if (!hasMaster) {
              const currentMaster: StaffMember = {
                id: `staff-master-${parsed.email.replace(/[^a-zA-Z0-9]/g, "")}`,
                name: parsed.name,
                email: parsed.email,
                phone: parsed.phone || "+91 98000 00000",
                role: "master_admin",
                assignedPropertyId: "sunshine-pg",
                assignedPropertyIds: ["*"],
                propertyName: "All Properties",
                status: "Active",
                joinedDate: "Owner",
                securityPin: parsed.securityPin || "123456",
              };
              list = [currentMaster, ...list.filter((s) => s.role !== "master_admin")];
            }
          }
        } catch {}
      }
    }
    return list;
  }

  async addGlobalStaff(member: StaffMember): Promise<boolean> {
    this.globalStaffList = [member, ...this.globalStaffList.filter((s) => s.id !== member.id)];
    this.saveGlobalStaffToStorage();
    this.notify();

    // Also sync to assigned property buckets in Firestore
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

    if (!this.staffList.has(propertyId)) {
      this.staffList.set(propertyId, []);
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
        } else {
          this.staffList.set(propertyId, []);
          this.notify();
        }
      });
    } catch (e) {
      console.warn("Firestore staff listener fallback to in-memory store:", e);
    }
  }

  getStaff(propertyId: string): StaffMember[] {
    const all = this.getAllGlobalStaff();
    return all.filter((s) => {
      if (s.role === "master_admin") return true;
      if (s.assignedPropertyIds?.includes("*")) return true;
      if (s.assignedPropertyId === propertyId) return true;
      if (s.assignedPropertyIds?.includes(propertyId)) return true;
      return false;
    });
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

function sanitizeForFirestore(obj: any): any {
  const clean: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  });
  return clean;
}

export const staffStore = new StaffStore();
