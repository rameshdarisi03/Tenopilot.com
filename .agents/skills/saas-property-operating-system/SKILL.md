---
name: saas-property-operating-system
description: >
  Comprehensive architectural blueprint and implementation guide for building multi-tenant
  property, PG, hostel, and rental operating systems (SaaS). Use when building or scaling
  real estate management platforms with dynamic room/bed layouts, SSOT financial calculation
  matrices, partner equity profit-sharing, 2-step PIN security, real-time Firestore sync,
  and tenant lifecycle management.
---

# SaaS Property Operating System Architecture & Runbook

A production-proven architectural skill distilled from building **TenoPilot** (Precision Rental Operating System for PGs, Hostels & Multi-Tenant Estates).

---

## 1. Core Architectural Pillars

### A. Multi-Tenant Single Source of Truth (SSOT) Store Pattern
- **Principle**: State must be isolated by `propertyId` with dual-layer synchronization (in-memory Map cache + browser cache + Cloud Firestore snapshot listeners).
- **Initialization**: Every new property must baseline with clean structures (0 floors, 0 occupants) while auto-provisioning the active creator as **100% Owner Partner** and default business accounts ("Main Business Account", "Petty Cash").
- **Reactive Subscriptions**: Use custom Pub/Sub listener arrays with `notify()` triggers to instantly sync UI components across tabs and routes without full page reloads.

```typescript
// Pattern: Multi-Tenant In-Memory Map with Firestore OnSnapshot Sync
const PROPERTY_STATE_MAP = new Map<string, T[]>();
const ACTIVE_UNSUBSCRIBES = new Map<string, () => void>();

export const entityStore = {
  initFirebaseListener(propertyId: string) {
    if (!propertyId || typeof window === "undefined" || !db) return;
    if (ACTIVE_UNSUBSCRIBES.has(propertyId)) return;

    const docRef = doc(db, `properties/${propertyId}/entity/config`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        PROPERTY_STATE_MAP.set(propertyId, data.items || []);
        notify();
      }
    });
    ACTIVE_UNSUBSCRIBES.set(propertyId, unsub);
  },
  getEntities(propertyId: string): T[] {
    return PROPERTY_STATE_MAP.get(propertyId) || getStoredArray(`tenopilot_items_${propertyId}`, DEFAULT_FALLBACK);
  }
};
```

---

## 2. Dynamic Room & Bed Allocation Engine

### Floor/Room/Slot Structure
- Model properties hierarchically: `Property` ➔ `Floors` ➔ `Rooms` ➔ `Beds / Slots`.
- Real-time occupancy state machine:
  - `AVAILABLE` (Empty slot, ready for check-in)
  - `BOOKED` (Advance token received, move-in scheduled)
  - `OCCUPIED` (Active checked-in tenant with ongoing billing)
  - `NOTICE` (Tenant in 30-day notice period, bed available for future booking)
  - `MAINTENANCE` (Blocked for repairs/painting)
- **Automatic Move-In Engine**: Background worker that matches `joiningDate <= today` to automatically transition `BOOKED` tenants to `Active` occupancy.

---

## 3. Banking-Grade Financial Hub & Partner Settlement Engine

### Revenue & Expense Calculation Formulae
1. **Total Expected Rent**: Sum of all occupied bed monthly tariffs.
2. **Gross Collections**: Actual cash + UPI + bank transfers recorded in current billing cycle.
3. **Occupancy Rate**: `(Occupied Beds + Notice Beds) / Total Available Beds * 100`.
4. **Collection Rate**: `Gross Rent Collected / Total Expected Rent * 100`.
5. **Net Distributable Profit**: `Gross Inflows - Operating Expenses - Capital Reserves`.
6. **Partner Equity Distributions**:
   $$\text{Partner Share (₹)} = \text{Net Profit} \times \frac{\text{Ownership Percentage}}{100}$$

```typescript
// Partner Equity SSOT Rule: Total ownership must strictly equal 100%
const totalShare = partners.reduce((acc, p) => acc + (p.ownershipPercentage || 0), 0);
if (totalShare !== 100) {
  throw new Error("Partner ownership equity must strictly equal 100%");
}
```

---

## 4. Banking-Grade Auth & Multi-Device Security

### Instant Multi-Device Session Invalidation (Epoch Versioning)
- Store a numeric `sessionVersion` in the user's Firestore security profile (`/users/{uid}`).
- Store `sessionVersion` in local session cookies/storage upon login.
- Attach an active `onSnapshot` listener to the user document in `AuthProvider`.
- When PIN or credentials are reset on one device, increment `sessionVersion = Date.now()` in Firestore. All other connected devices will receive the revocation event and instantly redirect to login.

### Cross-Tab Broadcast Channel
```typescript
const authChannel = typeof window !== "undefined" ? new BroadcastChannel("tenopilot_auth_sync") : null;
authChannel?.postMessage({ type: "ROLE_SWITCH", newRole });
authChannel?.addEventListener("message", (e) => {
  if (e.data.type === "SESSION_REVOKED") handleLogout();
});
```

---

## 5. Audit Logging & Compliance Standards
- **Activity Audit Trail**: Record every check-in, rent collection, room swap, checkout, and settings change with `actorName`, `actorRole`, and UTC ISO timestamps.
- **Police & Legal Register**: Maintain searchable digital records containing Tenant Full Name, Aadhaar/ID number, Emergency Contact, Permanent Address, and Check-In Date for local law enforcement compliance.
