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

# Update 17 — Booked Tenant Check-In & Postpone Workflow

Tenants onboarded with a future move-in date are tagged with lifecycle status `"Booked"` (`🔵 BOOKED`).

For all profiles tagged as `"BOOKED"`, an interactive **`Check In ▼`** dropdown menu is rendered on both the Tenant Profile page and Directory table action menus:

1. **`Complete Check-In`**:
   - Displays confirmation popup: `"Confirm Check-In for [Tenant Name] into Room [Room] ([Bed]). Move-in Date will be set to today."`
   - Upon confirmation:
     - `lifecycleStatus` updates from `"Booked"` to `"Active"`.
     - Badge styling transitions to Emerald (`🟢 ACTIVE TENANT`).
     - Occupant moves from **Booked** tab to **Active** tab in real-time across `occupantStore` and `localStorage`.

2. **`Postpone Check-In`**:
   - Opens a date selection modal: `"Enter New Postponed Move-in Date"`.
   - Upon confirmation:
     - `joiningDate` / `checkInDate` updates to the new postponed date.
     - Profile remains in the **Booked** tab (`lifecycleStatus: "Booked"`) with the updated future move-in date.

---

# Update 18 — Profile Context Hygiene for Booked Occupants and Short-Term Guests

Profile views (`/p/[propertyId]/tenants/[tenantId]`) enforce strict context hygiene across both Tenants and Guests:

1. **Booked Occupants (`lifecycleStatus: "Booked"`)**:
   - **Payment History**: Renders `"No payment history recorded yet (Pending Check-In)"` instead of dummy historical transactions.
   - **Timeline Milestones**: `Booked` milestone is completed (Green). `Checked In` milestone is rendered as `Pending Check-In` (Grey Outline).
   - **Check-In Actions**: Render **`🔑 Complete Check-In`** and **`📅 Postpone Check-In`** controls for both Tenants and Guests.

2. **Short-Term Guests (`stayType: "Guest"`)**:
   - **Agreement Card**: Displays `"Short-Term Guest Stay — No Long-Term Lease Agreement Required"` unless promoted.
   - **Promote Action**: Renders **`👔 Promote to Long-Term Tenant`** action button.

---

# Update 19 — Pending KYC Card Policy & Brand New Profile Financial Isolation

Profile views (`/p/[propertyId]/tenants/[tenantId]`) enforce strict data hygiene for newly created profiles and pending KYC documents:

1. **Brand New Profiles (Newly Onboarded Tenants & Guests)**:
   - Payment history starts empty (0 transactions). Does NOT inherit dummy mock historical transactions.
   - Total Rent Paid KPI starts at ₹0 until actual rent payments are submitted.

2. **Pending KYC Document Policy (`kycVerified: false`)**:
   - Unverified KYC document cards are hidden from display.
   - A clean privacy status banner renders: `"🟡 KYC Documents Pending Verification — Upload KYC documents during onboarding to enable secure view-only cards."`
   - Applies to both Tenants and Guests!

---

# Update 20 — Automatic Date-Driven Booked Classification Engine

Onboarding workflows (`/onboard-tenant` & `/onboard-guest`) automatically evaluate the desired move-in date (`joiningDate`) against the present onboarding date (`new Date()`):

$$\text{Days Until Check-In} = \text{joiningDate} - \text{onboardingDate}$$

1. **Future Move-In Date (`joiningDate > onboardingDate`)**:
   - `lifecycleStatus` automatically becomes **`"Booked"`** (`🔵 BOOKED`).
   - `paymentStatus` is set to `"Due"` / `daysRemainingText` reads `"Due on Check-In"`.
   - Occupant enters the system in the **Booked** tab with active **`Check In ▼`** controls (`Complete Check-In` & `Postpone Check-In`).

2. **Immediate Move-In Date (`joiningDate <= onboardingDate`)**:
   - `lifecycleStatus` automatically becomes **`"Active"`** (`🟢 ACTIVE TENANT`).

---

# Update 21 — Silent Automated Move-In Date Auto-Checkin Engine

TenoPilot includes a 100% silent automated move-in date evaluator engine (`utils/autoCheckInEngine.ts`):

$$\text{Auto-Transition Trigger: Today} \ge \text{occupant.joiningDate}$$

1. **Scheduled Date Reached**:
   - For all occupants with `lifecycleStatus === "Booked"`, when `today >= parseDate(occupant.joiningDate)`, the engine silently converts `lifecycleStatus` from `"Booked"` $\rightarrow$ `"Active"` (`🟢 ACTIVE TENANT`).
   - Occupant automatically transitions from the **Booked** tab to the **Active** tab across all portal views in real time.

2. **Owner Postponement Override**:
   - If the property manager explicitly postpones a move-in date via **`Postpone Check-In`**, `occupant.joiningDate` updates to a future date.
   - The evaluator respects the new date ($\text{Today} < \text{joiningDate}$) and holds the profile in `"Booked"` status until the postponed date arrives.

---

# Update 22 — Firebase Cloud Firestore Single Source of Truth Engine

TenoPilot uses Firebase Cloud Firestore (`lib/firebase.ts`) as the primary cloud database source of truth:

1. **Cloud Collection Structure**:
   - `properties/{propertyId}/occupants/{occupantId}`
2. **Real-Time Data Sync (`onSnapshot`)**:
   - Component state subscribes to Firestore real-time listeners (`subscribeOccupantsFromFirestore`), enabling instant multi-device synchronization.
3. **Cloud Storage**:
   - Uploaded KYC documents and photo headshots stream directly to Firebase Cloud Storage bucket `properties/{propertyId}/tenants/{occupantId}/kyc/`.

---

# Update 23 — Edit Check-In Date Workflow & Removal of Manual Check-In

To eliminate manual owner overhead during tenant check-ins, manual "Complete Check-In" action controls have been replaced by **`📅 Edit Check-In Date`**:

1. **Automated Transition Dependency**:
   - Check-ins transition 100% automatically on the scheduled move-in date via `utils/autoCheckInEngine.ts`.
2. **`📅 Edit Check-In Date` Control**:
   - Renders on both Tenant Directory action menus and Tenant Profile hero bars for any profile in `"Booked"` status (`lifecycleStatus: "Booked"`).
   - Opens a calendar datepicker modal asking for the new target move-in date (`joiningDate`).
   - Updates `joiningDate` across state, `occupantStore`, and Cloud Firestore.

---

# Update 24 — Short-Term Guest Timeline Exemption Policy

Short-term guests (`stayType === "Guest"`) do not follow long-term 11-month lease lifecycle milestones:

1. **Timeline Card Exemption**:
   - The **Tenant Timeline & Milestones** card is hidden for all profiles with `stayType === "Guest"`.
2. **Promote Re-Activation**:
   - When a short-term guest is promoted to a long-term tenant (`stayType === "Tenant"`), the timeline card automatically unlocks and renders full milestone progression.

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
- Booked Tenant Check-In & Postpone Workflow (`Complete Check-In` & `Postpone Check-In`)
- Profile Context Hygiene for Booked Occupants and Short-Term Guests
- Pending KYC Card Policy & Brand New Profile Financial Isolation
- Automatic Date-Driven Booked Classification Engine
- Silent Automated Move-In Date Auto-Checkin Engine
- Firebase Cloud Firestore Single Source of Truth Engine
- Edit Check-In Date Workflow & Removal of Manual Check-In
- Short-Term Guest Timeline Exemption Policy

All other workflows defined in TAS Chapter 07 remain unchanged.

---
