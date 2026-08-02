# DDS Chapter 13
# Domain Dependencies & Dynamic Cascading Architecture Matrix

**Document ID:** DDS-13

**Version:** 1.0

**Status:** Approved

**Applies To:** All DDS Chapters (01 to 12), TAS (Chapters 1 to 13), EPS-01

---

# Purpose

This document provides a dedicated, formal specification of all **Domain Dependencies, Inter-Module Connections, and Dynamic Cascading Rules** across the TenoPilot platform.

It guarantees that any state mutation, layout change, or operational update performed in one module instantly and deterministically cascades across all dependent screens without data drift or silent UI desynchronization.

---

# Architectural Principles

1. **Single Source of Truth (SSOT)**: Every domain entity (Floor, Room, Bed, Occupant, Rent Ledger) maintains exactly one authoritative reactive data source.
2. **Reactive Event Propagation**: Any mutation in an upstream domain automatically notifies and updates all downstream subscribers in real-time.
3. **Zero Hardcoded References**: UI screens, filters, status pills, and charts MUST dynamically derive their state from domain repositories/stores rather than static lists.
4. **Guaranteed Cascade Integrity**: Modifying physical capacity, occupant status, or financial timestamps MUST update all dependent views synchronously.

---

# Domain Dependency & Dynamic Cascading Matrix

| Upstream Source Domain | Mutation Action | Downstream Dependency Target | Dynamic Cascading Effect |
| :--- | :--- | :--- | :--- |
| **Room & Bed Domain (`DDS-04`)** | Add / Remove Floor or Room | **Property Map (`/property-map`)** | • Reflows floor navigation grid & room cards<br>• Recalculates total bed count<br>• Updates SVG Donut Ring Chart arcs<br>• Updates Floor & Room dropdown filters |
| **Room & Bed Domain (`DDS-04`)** | Change Bed Sharing Capacity (1 to 26 Beds) | **Property Map (`/property-map`)** | • Dynamically resizes bed slot grid columns (2 to 5 cols)<br>• Updates alphabetic bed codes (`BED A` to `BED Z`) |
| **Room & Bed Domain (`DDS-04`)** | Add / Remove Room | **Tenant Directory (`/tenants`)** | • Dynamically populates `Room` filter dropdown list (`Room 101`, `102`...) |
| **Room & Bed Domain (`DDS-04`)** | Add / Remove Room | **Overview Dashboard (`/overview`)** | • Updates Total Property Capacity metric<br>• Recalculates Live Occupancy Percentage (%) |
| **Occupant Domain (`DDS-05`)** | Onboard New Tenant / Guest | **Property Map (`/property-map`)** | • Changes Bed status from `Available` 🟢 to `Occupied` 🟤 / `Guest` 🟣<br>• Renders occupant photo & name inside bed slot card<br>• Recalculates SVG Donut Ring Chart status arcs |
| **Occupant Domain (`DDS-05`)** | Log Notice / Vacating Date | **Property Map (`/property-map`)** | • Changes Bed status to `Vacating` 🟧<br>• Displays `Vacating [Date]` badge on bed card<br>• Updates quick-view drawer notice node |
| **Occupant Domain (`DDS-05`)** | Transfer Occupant to New Bed | **Property Map & Setup** | • Vacates old Bed slot (`Available` 🟢)<br>• Occupies target Bed slot (`Occupied` 🟤)<br>• Updates Tenant Profile room location card |
| **Financial Domain (`DDS-06`)** | Collect Rent Payment | **Tenant Directory (`/tenants`)** | • Updates Payment Status to `Paid` 🟢<br>• Sets `Last Paid Date` & replaces days remaining with hyphen `—`<br>• Prepends receipt `#REC-[XXXXX]` |
| **Financial Domain (`DDS-06`)** | Collect Rent Payment | **Tenant Profile (`/tenants/[id]`)** | • Decreases Outstanding Balance to `₹0`<br>• Prepends payment row to Payment History table<br>• Updates Next Due Date |
| **Financial Domain (`DDS-06`)** | Collect Rent Payment | **Overview & Financial Hub** | • Updates `Collected This Month` metric<br>• Appends credit entry to Financial Hub Ledger |
| **Agreement Domain (`DDS-07`)** | Generate Agreement | **Tenant Profile (`/tenants/[id]`)** | • Activates PDF download link (`Download Agreement PDF`) |

---

# Execution & Wiring Pattern

## 1. Reactive Store Architecture (`constants/propertyLayoutStore.ts`)
The `propertyStore` singleton manages real-time subscriptions and layout state:

```typescript
// Any component mutating layout calls:
propertyStore.updateStructure(newStructure);

// Dependent pages subscribe via useEffect:
useEffect(() => {
  const unsubscribe = propertyStore.subscribe(() => {
    setState(propertyStore.getStructure());
  });
  return unsubscribe;
}, []);
```

## 2. Protected Deletion Shield Execution Path
When attempting to delete a Floor, Room, or Bed:
1. `Property Setup` queries `propertyStore` for active bed allocations.
2. If any bed within the entity is `Occupied`, `Vacating`, or `Booked`, deletion is intercepted.
3. Triggers the **Protective Warning Modal** containing the occupant's name and direct link to `/p/[propertyId]/tenants/[tenantId]`.
