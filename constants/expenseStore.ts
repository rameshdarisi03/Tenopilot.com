import {
  saveExpenseToFirestore,
  fetchExpensesFromFirestore,
  deleteExpenseFromFirestore,
  subscribeExpensesFromFirestore,
} from "@/lib/firestoreService";

export interface ExpenseRecord {
  id: string;
  propertyId: string;
  date: string;
  category: string;
  paidFrom: string; // "Business Account" | "Petty Cash" | Partner Name (e.g. Ramesh)
  property: string;
  amount: number;
  hasReceipt: boolean;
  receiptUrl?: string;
  receiptName?: string;
  notes?: string;
  vendorName?: string;
  paymentMethod?: string;
  createdAt?: string;
}

export interface CategoryWeightage {
  category: string;
  amount: number;
  percentage: number;
}

const INITIAL_EXPENSES: ExpenseRecord[] = [];

class ExpenseStore {
  private expenses: ExpenseRecord[] = INITIAL_EXPENSES;
  private listeners: Set<() => void> = new Set();
  private firebaseUnsubscribes: Map<string, () => void> = new Map();
  private initializedProperties: Set<string> = new Set();

  constructor() {
    // Global SSOT store initialized
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
    fetchExpensesFromFirestore(propertyId).then((cloudData) => {
      if (cloudData && cloudData.length > 0) {
        // Merge cloud expenses into in-memory SSOT
        const otherPropExpenses = this.expenses.filter(
          (e) => e.propertyId !== propertyId
        );
        this.expenses = [...otherPropExpenses, ...(cloudData as ExpenseRecord[])];
        this.notify();
      }
    });

    // Subscribe to live Cloud Firestore snapshot listener
    const unsub = subscribeExpensesFromFirestore(propertyId, (updated) => {
      if (updated && updated.length > 0) {
        const otherPropExpenses = this.expenses.filter(
          (e) => e.propertyId !== propertyId
        );
        this.expenses = [...otherPropExpenses, ...(updated as ExpenseRecord[])];
        this.notify();
      }
    });

    this.firebaseUnsubscribes.set(propertyId, unsub);
  }



  /**
   * Add a new expense record (Syncs to Firebase Cloud & SSOT)
   */
  public async addExpense(
    propertyId: string,
    expenseData: Omit<ExpenseRecord, "id" | "propertyId">
  ): Promise<ExpenseRecord> {
    const newRecord: ExpenseRecord = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      propertyId,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    this.expenses = [newRecord, ...this.expenses];
    this.notify();

    // Direct Cloud Firestore write
    await saveExpenseToFirestore(propertyId, newRecord);

    return newRecord;
  }

  /**
   * Delete an expense record (Syncs to Firebase Cloud & SSOT)
   */
  public async deleteExpense(
    propertyId: string,
    expenseId: string
  ): Promise<boolean> {
    // Optimistic UI delete
    this.expenses = this.expenses.filter((e) => e.id !== expenseId);
    this.notify();

    // Direct Cloud Firestore delete
    return await deleteExpenseFromFirestore(propertyId, expenseId);
  }

  /**
   * Get all expenses for a given propertyId, optionally filtered by date range
   */
  public getExpenses(
    propertyId: string = "sunshine-pg",
    startDate?: string,
    endDate?: string
  ): ExpenseRecord[] {
    let records = this.expenses.filter((e) => e.propertyId === propertyId);
    if (startDate && endDate) {
      records = records.filter((e) => {
        const rawDate = e.date || e.createdAt || "";
        let isoDate = "";

        if (rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = rawDate.slice(0, 10);
        } else {
          // Parse formats like "27 Aug 2026", "27/08/2026", "Aug 27, 2026"
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            isoDate = parsed.toISOString().slice(0, 10);
          }
        }

        if (!isoDate) return true; // If unparseable, keep in ledger rather than hiding
        return isoDate >= startDate && isoDate <= endDate;
      });
    }
    return records;
  }

  /**
   * RESOLVER: Total Spent In Date Range
   */
  public getTotalSpentThisMonth(
    propertyId: string = "sunshine-pg",
    startDate?: string,
    endDate?: string
  ): number {
    return this.getExpenses(propertyId, startDate, endDate).reduce(
      (acc, e) => acc + e.amount,
      0
    );
  }

  /**
   * RESOLVER: Category Weightages (% of Total Spend in Date Range)
   */
  public getCategoryWeightages(
    propertyId: string = "sunshine-pg",
    startDate?: string,
    endDate?: string
  ): CategoryWeightage[] {
    const records = this.getExpenses(propertyId, startDate, endDate);
    const total = records.reduce((acc, e) => acc + e.amount, 0);
    if (total === 0) return [];

    const catTotals: Record<string, number> = {};
    records.forEach((e) => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });

    const weightages: CategoryWeightage[] = Object.keys(catTotals).map((cat) => {
      const catAmount = catTotals[cat];
      const pct = (catAmount / total) * 100;
      return {
        category: cat,
        amount: catAmount,
        percentage: Number(pct.toFixed(1)),
      };
    });

    // Sort descending by amount
    return weightages.sort((a, b) => b.amount - a.amount);
  }

  /**
   * RESOLVER: Highest Category in Date Range
   */
  public getHighestCategory(
    propertyId: string = "sunshine-pg",
    startDate?: string,
    endDate?: string
  ): { category: string; amount: number } {
    const weightages = this.getCategoryWeightages(propertyId, startDate, endDate);
    if (weightages.length === 0)
      return { category: "None", amount: 0 };
    return { category: weightages[0].category, amount: weightages[0].amount };
  }

  /**
   * RESOLVER: Partner Personal Contributions in Date Range (Out-of-Pocket Expense Payments)
   */
  public getPartnerPersonalContributions(
    propertyId: string = "sunshine-pg",
    startDate?: string,
    endDate?: string
  ): Record<string, number> {
    const records = this.getExpenses(propertyId, startDate, endDate);
    const partnerTotals: Record<string, number> = {};

    records.forEach((e) => {
      // If paidFrom is not Business Account or Petty Cash, it's paid by a Partner out of pocket
      if (e.paidFrom !== "Business Account" && e.paidFrom !== "Petty Cash") {
        partnerTotals[e.paidFrom] = (partnerTotals[e.paidFrom] || 0) + e.amount;
      }
    });

    return partnerTotals;
  }

  /**
   * UTILITY: Export Expense Ledger to CSV File
   */
  public exportLedgerToCSV(
    propertyId: string = "sunshine-pg",
    startDate?: string,
    endDate?: string
  ): void {
    const records = this.getExpenses(propertyId, startDate, endDate);
    if (records.length === 0) return;

    const headers = [
      "ID",
      "Date",
      "Category",
      "Paid By",
      "Property",
      "Amount (INR)",
      "Vendor Name",
      "Payment Method",
      "Notes",
    ];

    const rows = records.map((r) => [
      r.id,
      `"${r.date}"`,
      `"${r.category}"`,
      `"${r.paidFrom}"`,
      `"${r.property}"`,
      r.amount,
      `"${r.vendorName || ""}"`,
      `"${r.paymentMethod || ""}"`,
      `"${r.notes || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Expenses_Ledger_${propertyId}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const expenseStore = new ExpenseStore();
