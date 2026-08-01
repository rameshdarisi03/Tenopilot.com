# DDS Chapter 05
# Occupant Domain

**Document ID:** DDS-05

**Version:** 1.0

**Status:** Approved

---

# Purpose

The Occupant Domain manages every individual residing within a Property.

An Occupant may be either a long-term Tenant or a short-term Guest.

The Occupant Domain is responsible for identity, accommodation, lifecycle management, room allocation, profile management, agreements, KYC, occupancy history and operational activities.

This domain represents people rather than accommodation.

---

# Core Philosophy

Every person residing in a Property is an Occupant.

Occupants share one unified business model.

Different stay types determine workflow behaviour rather than creating separate modules.

---

# Occupant Types

The system supports two occupant types.

Tenant

Long-term monthly resident.

Guest

Short-term paying guest.

Both types share the same profile structure whenever possible.

---

# Occupant Ownership

Every Occupant belongs to:

One Organization

↓

One Property

↓

One Bed

An Occupant cannot exist without an assigned Property.

---

# Occupant Identity

Every Occupant maintains a single identity.

Typical information includes:

• Full Name

• Mobile Number

• Alternate Contact

• Gender

• Date of Birth

• Emergency Contact

• Occupation

• Profile Photograph

Identity remains independent of room allocation.

---

# KYC Information

Occupants may maintain identification documents.

Supported documents include:

• Aadhaar PDF

OR

• Aadhaar Front Image

• Aadhaar Back Image

Document upload is optional during onboarding.

Documents may be uploaded later.

---

# Occupant Profile

Each Occupant maintains a dedicated profile.

The profile acts as the operational center for:

• Personal Information

• Accommodation

• Rent

• Timeline

• Documents

• Agreements

• Financial History

• Lifecycle Actions

Operational decisions should be performed from the Occupant Profile rather than list views.

---

# Tenant Lifecycle

Long-term occupants follow the lifecycle below.

Booked

↓

Active

↓

Notice

↓

Past

Each Occupant maintains exactly one lifecycle status.

---

# Guest Lifecycle

Short-term occupants follow a simplified lifecycle.

Guest

↓

Past

The transition occurs automatically when the configured check-out date is reached.

---

# Lifecycle Rules

Booked

Occupant has reserved accommodation.

No physical check-in has occurred.

---

Active

Occupant currently resides in the Property.

---

Notice

Occupant has submitted a notice period.

The configured vacating date determines automatic transition.

---

Past

Occupant no longer resides in the Property.

Historical information remains preserved.

---

# Booking

A booked occupant may perform one of the following actions.

Complete Check-in

Reschedule Move-in

Cancel Booking

Booking cancellation automatically restores bed availability.

---

# Check-In

Check-in activates occupancy.

After successful check-in:

Booked

↓

Active

The assigned bed becomes Occupied.

---

# Notice Period

Notice is initiated manually.

Owner specifies:

Vacating Date

Reason (Optional)

Notes (Optional)

The system automatically transitions:

Notice

↓

Past

once the vacating date is reached.

---

# Rent Collection & Payment Timestamping

When a Property Owner logs a rent payment using the `Collect Rent` action:

1. **Transaction Entry**: A new financial ledger record is created in the Financial Domain.
2. **`lastPaidDate` Update**: The occupant's `lastPaidDate` attribute is immediately set to the transaction payment date.
3. **Rent Status Transition**: `paymentStatus` transitions to `Paid` 🟢.
4. **Days Remaining Display**: Under the `Days Remaining` column in the Tenant Directory, paid occupants display a clean hyphen `—` (clearing any previous `DUE TODAY` or `OVERDUE` countdown tags).
5. **Dynamic Rent Recalculation**: The next `dueDate` is recalculated for the subsequent billing cycle based on the occupant's billing day.


---

# Guest Stay

Guests provide:

Check-in Date

Check-out Date

Stay Duration

Guest Agreement

The system automatically transitions:

Guest

↓

Past

after the configured check-out date.

---

# Room Transfer

Active occupants may transfer between rooms or properties.

Transfer automatically updates:

• Bed Status

• Room Allocation

• Occupancy

• Floor Navigation

• Room History

• Occupant Profile

Historical transfer information must remain preserved.

---

# Occupancy History

Every Occupant maintains historical accommodation information.

Examples

Initial Check-in

↓

Room Transfer

↓

Notice

↓

Vacated

History should never be overwritten.

---

# Timeline

Each Occupant profile maintains an operational timeline.

Examples

Profile Created

↓

Check-in

↓

Rent Collection

↓

Room Transfer

↓

Notice Logged

↓

Vacated

Timeline provides operational visibility rather than audit information.

---

# Agreements

Every Occupant maintains one active agreement.

Tenant

Rental Agreement

Guest

Guest Stay Agreement

Agreement versions should remain historically accessible.

---

# Occupant Directory

All occupants are managed through one unified directory.

Supported lifecycle filters:

• All

• Booked

• Active

• Guests

• Notice

• Past

Guests remain within the same directory.

Separate Guest modules should not exist.

---

# Guest Identification

Guests are visually distinguished using a Purple Guest badge.

The same visual language should remain consistent across:

• Directory

• Profile

• Floor Navigation

• Reports

---

# Room Relationship

Occupants own Beds.

Rooms organize Beds.

Occupants never own Rooms directly.

Changing rooms always updates bed ownership.

---

# Financial Relationship

Occupants generate operational financial events.

Examples

Rent Collection

Security Deposit

Advance Payment

Guest Stay Charges

Financial calculations remain independent of Occupant storage.

---

# Removal

Occupant records should never be permanently deleted during normal operations.

Past occupants preserve:

• Timeline

• Agreements

• Financial History

• Room History

Historical records remain available for reporting.

---

# Future Expansion

The Occupant Domain should support future stay models.

Examples

Corporate Stay

Student Stay

Staff Accommodation

Seasonal Stay

Future stay types should extend the existing Occupant model without structural redesign.

---

# Design Principles

People are modeled as Occupants.

Stay type defines workflow.

Lifecycle determines operational behaviour.

Profiles act as operational centers.

Historical information is preserved.

Room ownership occurs at the Bed level.

Operational actions automatically update occupancy.

The Occupant Domain should remain independent while integrating seamlessly with Financial, Agreement, Maintenance and Reporting domains.

---
