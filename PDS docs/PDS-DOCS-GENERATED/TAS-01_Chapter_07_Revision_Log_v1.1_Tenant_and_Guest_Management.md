# TAS Chapter 07 - Revision 1.1
## Tenant & Guest Management Updates

**Status:** Approved  
**Revision:** 1.1  
**Applies To:** TAS Chapter 07 - Tenant Management

---

# Purpose

This revision introduces approved workflow enhancements requested after the initial release of TAS Chapter 07.

These updates extend the existing Tenant Management workflow without replacing the original chapter.

Unless explicitly mentioned below, all existing TAS Chapter 07 workflows remain unchanged.

---

# Update 01 — New Occupant Creation

The primary creation button has been updated.

Previous Workflow

```
+ Add New Tenant
```

Updated Workflow

```
+ New ▼

• New Tenant

• New Guest
```

The system should launch the appropriate onboarding workflow based on the selected option.

The onboarding process should not ask users whether they are creating a Tenant or Guest.

The selection is made before entering the onboarding flow.

---

# Update 02 — Guest Onboarding Workflow

A dedicated Guest onboarding workflow has been introduced.

Guest Onboarding (Streamlined 3-Step Flow)

↓

Personal Details

↓

Room Allocation

↓

Documents & KYC

↓

Guest Profile Created (Confetti Dialog)

The Guest onboarding experience reuses the Tenant onboarding interface while removing unnecessary steps (such as Agreement Preview, since short-term guests do not require formal lease agreements).

---

# Update 03 — Personal Details

Guest onboarding excludes the following fields.

• Office Name

• Office Address

These fields remain available only for Tenant onboarding.

---

# Update 04 — Room Allocation

Tenant

Room allocation uses

Desired Joining Date

Guest

Room allocation uses

Check-in Date

Check-out Date

The room allocation screen continues to reuse the existing Floor Navigation interface.

Only the following room states should be displayed during onboarding.

• Available

• Vacating

Occupied and Booked beds should remain hidden during room allocation.

Room terminology must remain consistent with the Floor Navigation module.

---

# Update 05 — Vacating Bed Display

Vacating beds should display:

Vacating

<Date>

Example

```
Vacating

12 Aug 2026
```

The displayed date helps owners determine whether the bed becomes available before the selected joining/check-in date.

---

# Update 06 — Documents & KYC

The onboarding flow now supports:

• Latest Profile Photo

• Aadhaar PDF Upload

OR

• Aadhaar Front Image

• Aadhaar Back Image

Uploading Aadhaar remains optional.

Users may continue onboarding using:

Skip & Proceed

Documents can be uploaded later from the occupant profile.

---

# Update 07 — Agreement Preview (Tenants Only)

Before creating a long-term Tenant record, the system generates a Rental Agreement preview using the entered information.

Tenant

Rental Agreement

The final action becomes: Agree & Onboard Tenant.

Short-term Guests skip the Agreement Preview step entirely and complete onboarding directly after Step 3 (Documents & KYC).

---

# Update 08 — Success Confirmation

After successful creation, the system displays a centered confirmation dialog.

The dialog should include:

• Success message

• Confetti animation

• Created occupant name

Actions

• View Profile

• Back to Directory

The onboarding process ends after confirmation.

---

# Update 09 — Guest Identification

Guests remain inside the existing Tenant Directory.

No separate Guest module should be created.

Guest records must display a prominent Purple Guest badge throughout the application.

This badge should remain consistent across:

• Tenant Directory

• Tenant Profile

• Room Allocation

• Floor Navigation (where applicable)

---

# Update 10 — Guest Lifecycle

Guest

↓

Past

When the configured Check-out Date is reached, the Guest automatically transitions to Past.

No manual action is required.

---

# Update 11 — Tenant Profile Actions

The Tenant Profile remains the operational center for lifecycle actions.

Booked

• Complete Check-in

• Reschedule Move-in

• Cancel Booking

Active

• Edit Profile

• Transfer Room

• Log Notice

• Collect Rent

Notice

• Cancel Notice

• Collect Rent

Past

• View History

• Download Agreement

---

# Update 12 — Room Transfer

Room Transfer is now an official Tenant lifecycle operation.

The feature allows owners to move an active occupant to another available room or property.

After confirmation, the system automatically updates:

• Bed Occupancy

• Room Allocation

• Floor Navigation

• Occupancy Statistics

• Room History

No manual synchronization should be required.

---

# Update 13 — Existing Occupant Phone Number Lookup Engine

When entering a 10-digit mobile number in the primary contact field of onboarding forms (`onboard-tenant` or `onboard-guest`), the system automatically performs an instant search against `occupantStore`.

If a matching profile is found (Active, Notice, Past, or Guest):

- An instant alert banner is rendered: `"⚠️ Profile already exists with this mobile number: [Tenant Name] ([StayType] - [LifecycleStatus])."`
- Applies strictly to the primary contact number field (NOT emergency contact).

---

# Update 14 — Promote Short-Term Guest to Long-Term Tenant

A short-term guest (`stayType: "Guest"`) can settle and transition into a long-term tenant (`stayType: "Tenant"`).

On the Guest Profile page (`/p/[propertyId]/tenants/[tenantId]`), a dedicated **`👔 Promote to Long-Term Tenant`** action is available.

Upon confirmation:

- `stayType` updates from `"Guest"` to `"Tenant"`.
- Badge styling updates from Purple (`🟣 SHORT-TERM GUEST`) to Emerald (`🟢 ACTIVE TENANT`).
- Lease agreement PDF controls are enabled (`hasPdfAgreement: true`).
- Real-time updates cascade across frontend state, `occupantStore`, `localStorage`, and Firebase.

---

# Update 15 — Past Tenant Room Display Policy

Past tenants who have checked out no longer occupy an active room. In the **Past Tenants** tab view (`lifecycleStatus: "Past"`), the `ROOM & BED` column displays `— (Vacated)` instead of an active room assignment. Historical room stay data is preserved inside individual profile timeline records.

---

# Update 16 — Interactive Table Column Sorting

Directory table column headers `PAYMENT DUE` and `DAYS REMAINING` are interactive sort controls.

Clicking a header toggles sorting:

- `PAYMENT DUE`: Sorts by payment due date (Earliest $\leftrightarrow$ Latest).
- `DAYS REMAINING`: Sorts by days remaining or overdue status (Most Overdue $\leftrightarrow$ Most Days Remaining).
- Displays visual sort indicators (`▲`/`▼`) on the active sorted header.

---

# Revision Summary

This revision introduces:

- Split "New" creation menu (Tenant / Guest)
- Dedicated Guest onboarding workflow
- Simplified Guest personal details
- Date-driven room allocation
- Improved Vacating bed display
- Profile photo upload
- Flexible Aadhaar upload
- Agreement Preview step
- Success confirmation dialog
- Unified Tenant Directory with Guest support
- Guest lifecycle automation
- Room Transfer lifecycle action
- Instant Existing Occupant Phone Lookup Engine
- Promote Short-Term Guest to Long-Term Tenant Lifecycle Transition
- Past Tenant Room Display Policy (`— (Vacated)`)
- Interactive Table Column Sorting (`PAYMENT DUE` and `DAYS REMAINING`)

All other workflows defined in TAS Chapter 07 remain unchanged.

---
