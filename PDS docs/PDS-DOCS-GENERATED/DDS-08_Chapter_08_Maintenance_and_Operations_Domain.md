# DDS Chapter 08
# Maintenance & Operations Domain

**Document ID:** DDS-08

**Version:** 1.0

**Status:** Approved

---

# Purpose

The Maintenance & Operations Domain manages operational activities performed to maintain Properties and provide a comfortable living environment for occupants.

The domain is responsible for recording issues, assigning work, tracking progress and maintaining operational history.

Operational records should remain independent from Occupants and Financial data while remaining connected through shared business relationships.

---

# Core Philosophy

Maintenance activities represent operational events.

The system records operational work.

The system tracks progress automatically.

Historical operational records should always remain preserved.

---

# Scope

The domain includes:

• Maintenance Requests

• Property Issues

• Room Issues

• Bed Issues

• Utility Issues

• Work Orders

• Staff Assignment

• Resolution History

Future operational activities should extend this domain.

---

# Maintenance Ownership

Every maintenance record belongs to:

One Organization

↓

One Property

↓

One Operational Location

Maintenance records should never exist independently.

---

# Maintenance Sources

Maintenance requests may originate from:

• Owner

• Manager

• Receptionist

• Occupant (Future)

Every request should record its origin.

---

# Operational Location

Maintenance may be associated with:

Entire Property

↓

Specific Floor

↓

Specific Room

↓

Specific Bed

The operational location should always be clearly identifiable.

---

# Maintenance Categories

Organizations may define their own maintenance categories.

Examples

• Electrical

• Plumbing

• Furniture

• Internet

• Cleaning

• Appliance

• Water Supply

• Security

Categories should remain customizable.

Historical records should not change when categories are modified.

---

# Priority

Every maintenance request maintains one priority.

Low

Medium

High

Critical

Priority assists operational planning.

Priority does not affect historical information.

---

# Work Status

Each maintenance request follows one operational status.

Open

↓

Assigned

↓

In Progress

↓

Resolved

↓

Closed

Status progression should remain chronological.

Historical statuses should remain traceable.

---

# Assignment

Maintenance requests may be assigned.

Examples

Property Manager

Internal Staff

External Vendor

Future Contractor

Assignments should remain flexible.

---

# Resolution

Every completed request may record:

Resolution Notes

Completion Date

Completed By

Completion Images (Future)

Resolution information becomes part of maintenance history.

---

# Property Relationship

Maintenance belongs to the Property.

Occupants may report issues.

Rooms may contain issues.

Beds may contain issues.

Property remains the operational owner.

---

# Financial Relationship

Maintenance may generate expenses.

Maintenance itself should never own financial records.

Expenses remain managed by the Financial Domain.

Future integrations should automatically connect maintenance work with expense recording without duplicating information.

---

# Communication Relationship

Future versions may automatically notify occupants when:

Maintenance Assigned

↓

Maintenance Started

↓

Maintenance Completed

Communication should remain handled by the Communication Domain.

---

# Operational History

Every maintenance request maintains complete history.

Examples

Issue Created

↓

Assigned

↓

Work Started

↓

Resolved

↓

Closed

Historical information should never be deleted.

---

# Future Expansion

The domain should support future capabilities.

Examples

Preventive Maintenance

Cleaning Schedules

AMC Contracts

Vendor Management

Asset Maintenance

Inspection Checklists

Future capabilities should extend the existing operational model.

---

# Design Principles

Maintenance records operational work.

Properties own maintenance activities.

Historical records remain preserved.

Financial information remains independent.

Communication remains independent.

Assignments remain flexible.

The domain should support both small PG owners and large property operators without structural redesign.

---
