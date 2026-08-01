# DDS Chapter 03
# Property Domain

**Document ID:** DDS-03

**Version:** 1.0

**Status:** Approved

---

# Purpose

The Property Domain represents every physical property managed by an Organization.

A Property serves as the primary operational unit within TenoPilot.

All day-to-day operations including room management, occupant management, financial activities, maintenance, and reporting are performed within the context of a Property.

---

# Property Ownership

Every Property belongs to exactly one Organization.

An Organization may own:

• One Property

or

• Multiple Properties

Properties remain operationally independent while inheriting common organizational settings.

---

# Property Responsibilities

A Property is responsible for managing:

• Floors

• Rooms

• Beds

• Occupants

• Rent Collection

• Expenses

• Maintenance

• Reports

Each Property operates as an independent business unit.

---

# Property Hierarchy

Every Property follows the same ownership structure.

Organization

↓

Property

↓

Floor

↓

Room

↓

Bed

↓

Occupant

This hierarchy must remain consistent throughout the system.

---

# Property Identity

Each Property maintains its own identity.

Typical information includes:

• Property Name

• Property Code

• Property Address

• City

• State

• Postal Code

• Contact Number

• Email Address

• Property Manager

• Property Status

This information belongs exclusively to the Property.

---

# Property Status

Each Property maintains one operational status.

Examples

• Active

• Inactive

• Archived

Only Active properties participate in daily operations.

Archived properties preserve historical business information while remaining inaccessible for operational activities.

---

# Property Capacity

A Property derives its capacity from its physical structure.

Capacity is determined by:

Floors

↓

Rooms

↓

Beds

The Property should never store manually entered capacity values.

Capacity must always be calculated from the underlying room and bed structure.

---

# Property Configuration

Each Property maintains its own operational configuration.

Examples

• Check-in Time

• Check-out Time

• Default Joining Rules

• Notice Period Rules

• Local Property Policies

Property-specific configuration should override organizational defaults whenever required.

---

# Payment Configuration

Each Property may optionally override Organization payment settings.

Examples

• Property QR Code

• Property Bank Account

• Payment Instructions

If no property-specific configuration exists, the system should automatically use Organization-level settings.

---

# Property Documents

Each Property may maintain operational documents.

Examples

• Property Images

• Registration Documents

• Licenses

• Internal Documents

Documents belong exclusively to the Property.

---

# Property Relationships

A Property owns:

Floors

↓

Rooms

↓

Beds

↓

Occupants

↓

Financial Activity

↓

Maintenance Records

↓

Reports

No child entity should exist without belonging to a Property.

---

# Property Lifecycle

A Property follows a simple lifecycle.

Created

↓

Configured

↓

Operational

↓

Archived

Archived properties preserve all historical information.

Historical business records should never be deleted simply because a property is no longer operational.

---

# Property Removal

Organizations may decide to stop managing a property.

Examples

• Property Sold

• Lease Ended

• Business Closed

In such cases, the Property should be archived instead of permanently deleted.

Archiving preserves:

• Occupant History

• Financial Records

• Agreements

• Reports

• Audit History

Permanent deletion should only be performed through controlled administrative processes.

---

# Multi-Property Operations

Organizations managing multiple properties should be able to:

• View individual property information

• Switch between properties

• View consolidated organizational reports

Each Property continues operating independently.

---

# Property Independence

Operational activities remain isolated within a Property.

Examples

Occupants

Expenses

Room Allocation

Maintenance

Daily Operations

should never affect another Property unless explicitly transferred by the user.

---

# Property Transfer Support

Future versions may support:

• Property Ownership Transfer

• Property Merge

• Property Split

The Property Domain should support these possibilities without structural redesign.

---

# Property Design Principles

A Property represents a complete operational business unit.

Properties own operational data.

Organizations provide governance.

Capacity should always be derived rather than manually maintained.

Historical information should always be preserved through archiving rather than deletion.

Property configuration should remain flexible while maintaining consistency with organizational standards.

---
