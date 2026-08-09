---
name: tenopilot-property-management-os
description: >
  Comprehensive architecture, design system, and business logic directives for building
  cloud-native Property Management OS applications (Hostels, PGs, Hotels, Co-Living, Rental SaaS).
  Includes Firebase Cloud Firestore SSOT real-time sync, formal tenant checkout & deposit settlement,
  unified live camera KYC verification, multi-timeline bed scheduling, and dual-channel financial accounting.
---

# TenoPilot Property Management OS Architecture & Engineering Skill

Use this skill when designing, building, or modifying property management software, hostel/PG reservation engines, co-living portals, or tenant directory systems.

---

## 🏛️ 1. Cloud-Native SSOT Architecture (Firebase Cloud Firestore)

### Direct Cloud Operations
- Never rely on browser `localStorage` as a primary store for business data.
- Every create, update, or delete operation MUST write directly to Firebase Cloud Firestore (`properties/{propertyId}/occupants/{id}`) using `setDoc`, `updateDoc`, or `deleteDoc`.

### Race-Condition-Proof Real-Time Listener (`setOccupantsFromFirestore`)
When subscribing to Firestore collection snapshots (`onSnapshot`), implement an **ID-based Map Merge** to prevent snapshot updates from wiping out newly created local records before cloud write confirmation finishes:

```typescript
setOccupantsFromFirestore(newList: Occupant[]) {
  const current = loadOccupants();
  const map = new Map<string, Occupant>();

  // 1. Preserve current in-flight local items
  current.forEach((o) => map.set(o.id, o));
  // 2. Merge items broadcast from Cloud Firestore
  newList.forEach((o) => map.set(o.id, o));

  const mergedList = Array.from(map.values());
  GLOBAL_OCCUPANTS_CACHE = mergedList;
}
```

### Identifier Naming Conventions
- Genuine Onboarded Tenant: `og-tenant-${Date.now()}`
- Genuine Onboarded Guest: `og-guest-${Date.now()}`
- Mock Testing Records: `mock-tenant-${Date.now()}`, `mock-guest-${Date.now()}`
- Mock Data Purge: Purge utilities must ONLY target IDs starting with `mock-`, preserving all `og-` genuine records.

---

## 🔑 2. Formal Tenant Check-Out & Security Deposit Settlement Engine

### Room & Asset Handover Checklist
Before completing checkout, enforce checklist verification:
1. Room Main Key Handed Over
2. Closet / Drawer Keys Returned
3. AC Remote & Access Card Returned
4. Room Condition Inspection Verified

### Dynamic Settlement Calculator Formula
$$\text{Net Refundable Deposit} = \text{Initial Deposit} - (\text{Unpaid Rent Dues} + \text{Repair Deductions} + \text{Maintenance Expenses})$$

- **Maintenance Expenses**: Dedicated deduction field covering room cleaning, deep-sanitize, and repainting fees.

### State & Category Recycling Rules
- **Bed Status**: Re-set bed status to `"Available"` (reusing the standard `Available` category powering maps and filters).
- **Tenant Lifecycle**: Update tenant `lifecycleStatus` to `"Past"` (reusing standard `Past` category; full profile, KYC, and payment receipts remain permanently stored for audit).
- **Financial Outflow**: Log net deposit refund in `expenseStore` under category `Deposit Refund` matching the exact payment channel selected (`Online payments (UPI)` or `Cash Desk`).

---

## 📷 3. Unified Camera & Document Verification System

### Unified Action Button (`UnifiedPhotoUploadSlot`)
Use a single universal action button labeled `[ 📸 Take Live Photo / Choose File ]` for every photo slot:
- **Mobile Browsers (iOS/Android)**: Triggers native OS camera/gallery bottom sheet directly (`accept="image/*"`).
- **Desktop Browsers**: Toggles choice popover: `📸 Take Snapshot with Webcam` vs `📁 Choose Photo File from Device`.

### Web Camera Viewfinder Modal (`WebcamCaptureModal`)
- Uses `navigator.mediaDevices.getUserMedia`.
- Includes oval face alignment guide for profile headshots and rectangular card alignment guide for ID cards.
- Provides a Flip Camera toggle, snapshot preview, retake, and confirm controls.

### Aadhaar / Govt ID Vertical Layout
- **Front & Back Photos Mode**: Stack `💳 ID Card Front Photo *` vertically on top, and `💳 ID Card Back Photo *` directly underneath.
- **Single PDF Mode**: Full-width slot for identity PDFs capped at 1MB limit.

---

## 🛌 4. Multi-Timeline Bed Occupancy & Scheduling Engine

### Sequential Non-Overlapping Stays
- Allow multiple guest bookings to occupy the same physical bed slot on non-overlapping date ranges.

### Overdue Move-Out Visual Alert
When `vacatingDate < today`, display a prominent amber/red pulsing badge:
`🚨 OVERDUE MOVE-OUT (Promised Date Passed)` to prompt the manager to perform formal check-out settlement.

---

## 💰 5. Financial Ledger & Dual-Channel Accounting Rules

### Simplified Payment Channels
1. **`Online payments (UPI)`**: PhonePe, GPay, Bank UPI credits.
2. **`Cash Desk`**: Front desk cash receipts.

### Revenue Streams & Outflows
- Income Streams: Monthly Room Rent Collections + Security Deposit Intake.
- Expense Ledger: Category weightages (% of spend), Base64/PDF receipt dropzone, and Lightbox receipt viewer.
- Interactive Date Selector: Date timeline filter (`This Month`, `Last Month`, `This Quarter`, `This Year`, `All Time`).

---

## 🎨 6. Responsive UI/UX & Navigation Standards

- **Mobile Navigation**: Mobile hamburger drawer (☰) toggle bound across all workspace routes.
- **Header Search Control**: Top search input rendered using `showSearch={true}` strictly on directory pages (`/tenants`).
- **Notification Bell Popover**: Dynamic alert drawer connected to unresolved complaints, overdue rent/tariff dues, and pending KYC verification.
- **User Profile Dropdown**: Interactive avatar dropdown (`RD`) displaying property owner details, role, and settings shortcuts.
