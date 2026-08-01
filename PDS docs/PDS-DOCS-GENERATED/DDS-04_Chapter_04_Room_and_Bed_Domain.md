# DDS Chapter 04
# Room & Bed Domain

**Document ID:** DDS-04

**Version:** 1.0

**Status:** Approved

---

# Purpose

The Room & Bed Domain manages the physical accommodation structure within every Property.

This domain is responsible for organizing Floors, Rooms and Beds while maintaining real-time occupancy information.

The Room & Bed Domain serves as the operational foundation for onboarding, room allocation, floor navigation, transfers, occupancy analytics and maintenance.

---

# Domain Hierarchy

Every Property follows the same physical hierarchy.

Organization

↓

Property

↓

Floor

↓

Room

↓

Bed

Each level owns only the information relevant to itself.

---

# Floor

A Floor represents a physical level inside a Property.

Examples

Ground Floor

First Floor

Second Floor

Third Floor

Each Floor owns one or more Rooms.

---

# Room

A Room represents a physical accommodation unit.

A Room belongs to exactly one Floor.

Typical Room Information

• Room Number

• Room Type

• Floor

• Capacity

• Description (Optional)

Room capacity is always derived from the number of Beds contained within the Room.

---

# Bed

A Bed is the smallest allocatable accommodation unit.

Occupants are always assigned to Beds.

Rooms themselves are never allocated directly.

Examples

Bed A

Bed B

Bed C

Bed D

Each Bed belongs to exactly one Room.

---

# Bed Status

Every Bed maintains one operational status.

Available

Booked

Occupied

Vacating

These status names must remain consistent throughout the entire application.

---

# Status Definitions

## Available

The Bed is immediately available for allocation.

No occupant currently owns the bed.

---

## Booked

The Bed has been reserved.

The occupant has not completed check-in.

The Bed cannot be assigned to another occupant.

---

## Occupied

An active Tenant or Guest currently occupies the Bed.

The Bed is unavailable for allocation.

---

## Vacating

The current occupant has submitted notice.

The Bed will become available after the configured vacating date.

The vacating date should always be displayed together with the status.

Example

Vacating

15 Aug 2026

---

# Room Allocation

Room allocation always occurs at the Bed level.

The system should never allocate entire rooms.

Allocation is based on:

Tenant

Desired Joining Date

Guest

Check-in Date

Check-out Date

---

# Smart Room Allocation

During onboarding, the Room Allocation screen displays only:

• Available Beds

• Vacating Beds

Occupied and Booked Beds remain hidden.

This minimizes decision complexity for users.

---

# Vacating Beds

Vacating Beds remain selectable only when the selected joining date occurs after the configured vacating date.

Example

Joining Date

15 Aug

Bed Vacates

12 Aug

Selectable

Example

Joining Date

15 Aug

Bed Vacates

20 Aug

Not Selectable

The system performs this validation automatically.

---

# Floor Navigation

Floor Navigation provides a real-time visual representation of every Bed.

Each Bed displays its operational status using standard status colors and indicators.
