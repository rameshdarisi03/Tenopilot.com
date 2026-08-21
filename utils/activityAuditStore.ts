// TenoPilot Centralized Property Activity & Staff Audit Store
import { doc, setDoc, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ActivityType =
  | "PAYMENT"
  | "EXPENSE"
  | "ONBOARDING"
  | "CHECKIN"
  | "TRANSFER"
  | "COMPLAINT"
  | "SETTINGS"
  | "STAFF";

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  title: string;        // e.g. "Rent Collected: ₹14,500"
  subtitle: string;     // e.g. "Ramesh Darisi (Room 202)"
  staffName?: string;   // e.g. "Rajesh K."
  staffRole?: string;   // e.g. "Receptionist"
  staffEmail?: string;
  timestamp: string;    // ISO string
  propertyId: string;
}

// Initial Seed Activities for fresh or demo properties
const INITIAL_DEMO_ACTIVITIES: ActivityLogEntry[] = [
  {
    id: "act_init_1",
    type: "PAYMENT",
    title: "Rent Collected: ₹14,500",
    subtitle: "Ramesh Darisi (Room 202)",
    staffName: "Rajesh K.",
    staffRole: "Receptionist",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2m ago
    propertyId: "sunshine-pg",
  },
  {
    id: "act_init_2",
    type: "EXPENSE",
    title: "Expense Logged: ₹12,500",
    subtitle: "EB Commercial Electricity Bill",
    staffName: "Pooja M.",
    staffRole: "Admin",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15m ago
    propertyId: "sunshine-pg",
  },
  {
    id: "act_init_3",
    type: "CHECKIN",
    title: "Check-In Completed",
    subtitle: "Aarav Sengupta (Room 101)",
    staffName: "Pooja M.",
    staffRole: "Admin",
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
    propertyId: "sunshine-pg",
  },
  {
    id: "act_init_4",
    type: "COMPLAINT",
    title: "Complaint Resolved",
    subtitle: "Water Heater Issue (Room 305)",
    staffName: "Santosh R.",
    staffRole: "Property Manager",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
    propertyId: "sunshine-pg",
  },
  {
    id: "act_init_5",
    type: "SETTINGS",
    title: "Settings Updated",
    subtitle: "Due date set to 5th with 5d grace",
    staffName: "Master Admin",
    staffRole: "Master Admin",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1d ago
    propertyId: "sunshine-pg",
  },
];

class ActivityAuditStore {
  private inMemoryLogs: Map<string, ActivityLogEntry[]> = new Map();
  private subscribers: Map<string, Array<(logs: ActivityLogEntry[]) => void>> = new Map();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("tenopilot_activity_logs");
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.entries(parsed).forEach(([propId, logs]) => {
            this.inMemoryLogs.set(propId, logs as ActivityLogEntry[]);
          });
        }
      } catch {}
    }
  }

  private persistLocal() {
    if (typeof window !== "undefined") {
      try {
        const obj: Record<string, ActivityLogEntry[]> = {};
        this.inMemoryLogs.forEach((val, key) => {
          obj[key] = val;
        });
        localStorage.setItem("tenopilot_activity_logs", JSON.stringify(obj));
      } catch {}
    }
  }

  public getActivities(propertyId: string): ActivityLogEntry[] {
    const list = this.inMemoryLogs.get(propertyId);
    if (!list || list.length === 0) {
      const seeds = INITIAL_DEMO_ACTIVITIES.map((a) => ({ ...a, propertyId }));
      this.inMemoryLogs.set(propertyId, seeds);
      this.persistLocal();
      return seeds;
    }
    return list;
  }

  public async logActivity(
    propertyId: string,
    entry: Omit<ActivityLogEntry, "id" | "timestamp" | "propertyId"> & {
      id?: string;
      timestamp?: string;
    }
  ): Promise<ActivityLogEntry> {
    const completeEntry: ActivityLogEntry = {
      id: entry.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: entry.type,
      title: entry.title,
      subtitle: entry.subtitle,
      staffName: entry.staffName || "Staff Member",
      staffRole: entry.staffRole || "Admin",
      staffEmail: entry.staffEmail,
      timestamp: entry.timestamp || new Date().toISOString(),
      propertyId,
    };

    const currentList = this.getActivities(propertyId);
    const updatedList = [completeEntry, ...currentList.filter((a) => a.id !== completeEntry.id)].slice(0, 50);
    this.inMemoryLogs.set(propertyId, updatedList);
    this.persistLocal();

    // Broadcast to subscribers
    const propSubs = this.subscribers.get(propertyId) || [];
    propSubs.forEach((cb) => cb(updatedList));

    // Firestore async persist
    try {
      const docRef = doc(db, "properties", propertyId, "activity_logs", completeEntry.id);
      await setDoc(docRef, completeEntry, { merge: true });
    } catch (e) {
      console.warn("Activity log Firestore write note:", e);
    }

    return completeEntry;
  }

  public subscribe(propertyId: string, callback: (logs: ActivityLogEntry[]) => void): () => void {
    if (!this.subscribers.has(propertyId)) {
      this.subscribers.set(propertyId, []);
    }
    this.subscribers.get(propertyId)!.push(callback);

    // Initial trigger with current state
    callback(this.getActivities(propertyId));

    // Firestore live snapshot listener
    let unsubFirestore = () => {};
    try {
      const q = query(
        collection(db, "properties", propertyId, "activity_logs"),
        orderBy("timestamp", "desc"),
        limit(50)
      );
      unsubFirestore = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const remoteLogs: ActivityLogEntry[] = [];
            snap.forEach((d) => remoteLogs.push(d.data() as ActivityLogEntry));
            this.inMemoryLogs.set(propertyId, remoteLogs);
            this.persistLocal();
            callback(remoteLogs);
          }
        },
        (err) => console.warn("Firestore activity snapshot note:", err)
      );
    } catch {}

    return () => {
      const list = this.subscribers.get(propertyId) || [];
      this.subscribers.set(
        propertyId,
        list.filter((cb) => cb !== callback)
      );
      unsubFirestore();
    };
  }
}

export const activityAuditStore = new ActivityAuditStore();
