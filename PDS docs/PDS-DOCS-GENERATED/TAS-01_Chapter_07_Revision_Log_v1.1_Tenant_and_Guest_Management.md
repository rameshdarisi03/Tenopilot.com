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

Guest Onboarding

↓

Personal Details

↓

Room Allocation

↓

Documents & KYC

↓

Agreement Preview

↓

Guest Profile Created

The Guest onboarding experience should reuse the Tenant onboarding interface wherever possible while displaying only fields relevant to short-term stays.

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

# Update 07 — Agreement Preview

Before creating the record, the system should generate an agreement preview using the entered information.

Tenant

Rental Agreement

Guest

Guest Stay Agreement

The final action becomes

Agree & Continue

Only after confirmation should the profile be created.

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

All other workflows defined in TAS Chapter 07 remain unchanged.

---
