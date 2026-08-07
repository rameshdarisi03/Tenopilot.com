import {
  saveRecurringBillToFirestore,
  fetchRecurringBillsFromFirestore,
  deleteRecurringBillFromFirestore,
  subscribeRecurringBillsFromFirestore,
} from "@/lib/firestoreService";

export interface RecurringBillRecord {
  id: string;
  propertyId: string;
  title: string;
  category: string;
  amount: number;
  dueDate: string; // e.g. "Monthly • 1st", "Variable • 15th", "Fixed • 5th"
  frequency: "Monthly" | "Quarterly" | "Annual";
  icon: string;
  status: "Paid" | "Due Soon" | "Pending";
  paidFrom: string;
  notes?: string;
  updatedAt?: string;
}

const INITIAL_RECURRING_BILLS: RecurringBillRecord[] = [
  {
    id: "rec-1",
    propertyId: "sunshine-pg",
    title: "Internet / Wi-Fi",
    category: "Internet / Wi-Fi",
    amount: 2499,
    dueDate: "Monthly • 1st",
    frequency: "Monthly",
    icon: "Wifi",
    status: "Paid",
    paidFrom: "Business Account",
    notes: "Airtel Broadband 300Mbps",
  },
  {
    id: "rec-2",
    propertyId: "sunshine-pg",
    title: "Electricity Bill",
    category: "Electricity",
    amount: 12400,
    dueDate: "Variable • 15th",
    frequency: "Monthly",
    icon: "Zap",
    status: "Due Soon",
    paidFrom: "Business Account",
    notes: "TSSPDCL Main Meter",
  },
  {
    id: "rec-3",
    propertyId: "sunshine-pg",
    title: "Water Supply",
    category: "Water Supply",
    amount: 3200,
    dueDate: "Fixed • 5th",
    frequency: "Monthly",
    icon: "Droplet",
    status: "Paid",
    paidFrom: "Business Account",
    notes: "Metro Water Tanker",
  },
  {
    id: "rec-4",
    propertyId: "sunshine-pg",
    title: "Staff Salary",
    category: "Staff Salary",
    amount: 18000,
    dueDate: "Monthly • 1st",
    frequency: "Monthly",
    icon: "Users",
    status: "Paid",
    paidFrom: "Suresh",
    notes: "Housekeeping & Security Payroll",
  },
];

class RecurringBillStore {
  private bills: RecurringBillRecord[] = INITIAL_RECURRING_BILLS;
  private listeners: Set<() => void> = new Set();
  private firebaseUnsubscribes: Map<string, () => void> = new Map();
  private initializedProperties: Set<string> = new Set();

  constructor() {
    // SSOT store initialized
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Initialize Cloud Firebase Listener for a specific property
   */
  public initPropertyFirebase(propertyId: string = "sunshine-pg"): void {
    if (this.initializedProperties.has(propertyId)) return;
    this.initializedProperties.add(propertyId);

    // Initial fetch from Cloud Firestore
    fetchRecurringBillsFromFirestore(propertyId).then((cloudData) => {
      if (cloudData && cloudData.length > 0) {
        const otherPropBills = this.bills.filter(
          (b) => b.propertyId !== propertyId
        );
        this.bills = [...otherPropBills, ...(cloudData as RecurringBillRecord[])];
        this.notify();
      } else {
        // Seed initial mock records to Cloud Firestore if empty
        const initialForProp = INITIAL_RECURRING_BILLS.filter(
          (b) => b.propertyId === propertyId
        );
        initialForProp.forEach((bill) => {
          saveRecurringBillToFirestore(propertyId, bill);
        });
      }
    });

    // Subscribe to live Cloud Firestore snapshot listener
    const unsub = subscribeRecurringBillsFromFirestore(propertyId, (updated) => {
      if (updated && updated.length > 0) {
        const otherPropBills = this.bills.filter(
          (b) => b.propertyId !== propertyId
        );
        this.bills = [...otherPropBills, ...(updated as RecurringBillRecord[])];
        this.notify();
      }
    });

    this.firebaseUnsubscribes.set(propertyId, unsub);
  }

  /**
   * Get all recurring bills for a propertyId
   */
  public getRecurringBills(
    propertyId: string = "sunshine-pg"
  ): RecurringBillRecord[] {
    return this.bills.filter((b) => b.propertyId === propertyId);
  }

  /**
   * Add a new recurring bill schedule
   */
  public async addRecurringBill(
    propertyId: string,
    billData: Omit<RecurringBillRecord, "id" | "propertyId">
  ): Promise<RecurringBillRecord> {
    const newBill: RecurringBillRecord = {
      ...billData,
      id: `rec-${Date.now()}`,
      propertyId,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic UI update
    this.bills = [...this.bills, newBill];
    this.notify();

    // Direct Cloud Firestore write
    await saveRecurringBillToFirestore(propertyId, newBill);

    return newBill;
  }

  /**
   * Update an existing recurring bill schedule (e.g. updating default amount)
   */
  public async updateRecurringBill(
    propertyId: string,
    billId: string,
    updates: Partial<RecurringBillRecord>
  ): Promise<boolean> {
    const idx = this.bills.findIndex((b) => b.id === billId);
    if (idx === -1) return false;

    const updated = {
      ...this.bills[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.bills[idx] = updated;
    this.notify();

    return await saveRecurringBillToFirestore(propertyId, updated);
  }

  /**
   * Delete a recurring bill schedule
   */
  public async deleteRecurringBill(
    propertyId: string,
    billId: string
  ): Promise<boolean> {
    this.bills = this.bills.filter((b) => b.id !== billId);
    this.notify();

    return await deleteRecurringBillFromFirestore(propertyId, billId);
  }
}

export const recurringBillStore = new RecurringBillStore();
