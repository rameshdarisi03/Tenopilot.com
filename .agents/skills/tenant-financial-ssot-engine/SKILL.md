---
name: tenant-financial-ssot-engine
description: >
  Complete architectural blueprint and implementation runbook for precision real estate
  financial computing, dual-ledger accounting (Rent vs Security Deposit), dynamic pro-rata
  formulas, receipt generation, multi-category expense management, and full Firestore migration.
  Use when implementing or migrating real-time financial tracking for multi-tenant property SaaS.
---

# Tenant Financial SSOT & Dual-Ledger Engine

A production-grade architectural specification and migration runbook distilled from **TenoPilot's** financial calculation core.

---

## 1. Core Financial Philosophy: Zero Stored Dynamic State

### The SSOT Principle
Dynamic financial states (**`isFullyPaid`**, **`remainingRentDue`**, **`remainingDepositDue`**, **`netOutstandingBalance`**, **`daysRemainingText`**) must **NEVER** be stored as static values in Firestore or localStorage. 

* **Stored in Database (Contract Terms & Receipts Only)**:
  - `rentAmount` (Monthly contract tariff)
  - `securityDeposit` (Contract required deposit)
  - `dueDay` (e.g., 5th of each month)
  - `joiningDate` (ISO format e.g., "2026-08-15")
  - `paymentHistory` (Immutable array of recorded transaction receipts: `#REC-XXXXX`, `#DEP-XXXXX`)
* **Computed Dynamically at Runtime**:
  - `calculateOccupantFinancialStatement(occupant, propertySettings)` evaluates the contract against the immutable transaction ledger and atomic calendar clock on every render.

---

## 2. Core Calculation Formulas & Pro-Rata Math

### A. Pro-Rata Mid-Month Joining Formula
When a tenant moves in on a date other than the 1st of the month:

$$\text{Days In Month} = \text{Total days in the joining calendar month (28, 29, 30, or 31)}$$
$$\text{Days Active} = (\text{Days In Month} - \text{Joining Day}) + 1$$
$$\text{Pro-Rata Rent} = \text{Round}\left( \frac{\text{Monthly Rent}}{\text{Days In Month}} \times \text{Days Active} \right)$$

### B. Dual-Ledger Separation (Rent vs Security Deposit)
Payments must never be mixed into a generic pool without explicit purpose tagging:
1. **`RENT` Receipts (`#REC-XXXXX`)**: Count exclusively toward monthly rent tariffs and prior arrears.
2. **`DEPOSIT` Receipts (`#DEP-XXXXX`)**: Count exclusively toward the one-time security deposit requirement.
3. **`COMBINED` Receipts**: Atomically split into two separate receipts:
   - One `#REC-XXXXX` receipt for the rent portion.
   - One `#DEP-XXXXX` receipt for the deposit portion.

### C. Grace Period & Overdue Evaluation
```typescript
const dueDay = occupant.dueDay || propertySettings.dueDay || 5;
const graceDays = propertySettings.gracePeriodDays || 5;
const overdueThresholdDay = dueDay + graceDays;

if (currentDay > overdueThresholdDay && remainingRentDue > 0) {
  financialStatus = "OVERDUE";
  daysOverdue = currentDay - overdueThresholdDay;
} else if (remainingRentDue === 0) {
  financialStatus = "PAID";
} else {
  financialStatus = "DUE_SOON";
}
```

---

## 3. Operational Expense Categories & Indian Rupee (`₹`) Icon Architecture

### 9 Curated Default Categories (Zero Color Overlap)
The platform baselines with 9 distinctive operational categories:
1. ⚡ **Electricity** (`Zap` • `#d97706` Amber)
2. 💧 **Water Supply** (`Droplet` • `#1d4ed8` Royal Blue)
3. 👥 **Staff Salary** (`Users` • `#059669` Emerald Green)
4. 📶 **Internet / Wi-Fi** (`Wifi` • `#7e22ce` Purple)
5. 🔧 **Repairs & Maintenance** (`Wrench` • `#964407` Brown)
6. 🍽️ **Food & Kitchen Supplies** (`Utensils` • `#be123c` Crimson)
7. ⛽ **Gas Cylinders & Fuel** (`Fuel` • `#0f766e` Teal)
8. 🛡️ **Security & Housekeeping** (`Shield` • `#4338ca` Indigo)
9. 🏢 **Property Rent** (`Building2` • `#0f172a` Midnight Slate)

### Custom Categories & Rupee Receipt Icon (`₹`)
When users create custom categories (e.g., "Elevator AMC", "Diesel Generator"):
- They only provide the category name.
- The system automatically assigns a custom **Indian Rupee Receipt Icon (`ReceiptRupeeIcon`)** with the `₹` glyph inside the jagged receipt outline (avoiding foreign currency symbols like `$`).

---

## 4. 10-Day Hack-Proof Atomic Free Trial Engine

### Cloud Firestore Stamping (`lib/trialService.ts`)
When a property is initialized:
```typescript
export async function initializePropertyTrial(propertyId: string): Promise<TrialMetadata> {
  const metaRef = doc(db, "properties", propertyId, "settings", "trial_metadata");
  const nowMs = Date.now();
  const trialEndsAtMs = nowMs + 10 * 24 * 60 * 60 * 1000;

  const trialData: TrialMetadata = {
    propertyId,
    createdAt: serverTimestamp(),
    trialEndsAtMs,
    subscriptionStatus: "TRIAL",
  };

  await setDoc(metaRef, trialData, { merge: true });
  return trialData;
}
```

### Graceful Read-Only Expiration Pattern
- **Allowed after 10 Days**: View Dashboards, Tenant Histories, Ledgers, Reports, Room Layouts.
- **Restricted after 10 Days**: Writing new check-ins, logging new rent collections, or creating new expenses until an active subscription is purchased.

---

## 5. Migration & Environment Setup Checklist

### Step 1: Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
WHATSAPP_API_TOKEN=your_meta_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

### Step 2: Firestore Collections Schema Hierarchy
```
/properties/{propertyId}
   ├── /occupants/{occupantId}               (Tenant profiles & payment history ledger)
   ├── /floors/{floorId}                     (Floor, room, and bed layout matrix)
   ├── /expenses/{expenseId}                 (Operational ledger items)
   ├── /recurring_bills/{billId}             (Automated monthly bills)
   ├── /partners/config                      (Partners equity %, categories & accounts)
   ├── /settings/trial_metadata              (Atomic 10-day trial clock)
   └── /complaints/{complaintId}             (Tenant maintenance tickets)
```

### Step 3: Production Build & Deployment Verification
```bash
npm run build
# Expected: Next.js Turbopack build passing with 0 errors
```
