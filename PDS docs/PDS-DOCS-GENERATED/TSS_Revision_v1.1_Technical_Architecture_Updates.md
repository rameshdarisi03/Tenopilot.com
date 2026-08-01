# TSS Revision 1.1
# Technical Architecture Updates

**Document ID:** TSS-REV-01

**Version:** 1.1

**Status:** Approved

**Applies To:** Original Technical System Specification (TSS)

---

# Purpose

This revision documents all approved technical architecture updates introduced after the initial Technical System Specification.

These updates extend the existing technical architecture and should be interpreted together with the original TSS.

Unless explicitly mentioned below, the original TSS remains unchanged.

---

# Update 01 — Unified Occupant Architecture

The system now supports a unified Occupant model.

Occupants may represent:

• Tenant

• Guest

The application should avoid maintaining separate modules for Tenants and Guests.

Shared business logic should be reused wherever possible.

---

# Update 02 — New Occupant Creation

The primary creation action becomes:

+ New

↓

New Tenant

New Guest

The onboarding workflow is selected before onboarding begins.

The onboarding process should never ask users to choose between Tenant and Guest after entering the workflow.

---

# Update 03 — Guest Workflow

Guest onboarding follows the same technical pipeline as Tenant onboarding.

Workflow

Personal Details

↓

Room Allocation

↓

Documents

↓

Agreement Preview

↓

Profile Creation

Only business-specific fields should differ.

The technical implementation should maximize component reuse.

---

# Update 04 — Room Allocation Engine

Room allocation becomes date-aware.

Tenant

Desired Joining Date

Guest

Check-in Date

Check-out Date

Availability calculations should be performed dynamically using selected dates.

No manual room availability management should exist.

---

# Update 05 — Bed Visibility Rules

During onboarding, only the following beds are displayed.

• Available

• Vacating

Occupied and Booked beds remain hidden.

The validation engine determines whether Vacating beds are selectable.

---

# Update 06 — Bed Status Standardization

The following status terminology becomes the official application standard.

• Available

• Booked

• Occupied

• Vacating

All modules should use identical terminology and color coding.

---

# Update 07 — Room Transfer Engine

Room Transfer becomes an official system operation.

Transfer automatically updates:

• Bed Status

• Occupancy

• Floor Navigation

• Occupant Profile

• Room History

• Occupancy Analytics

No manual synchronization should be required.

---

# Update 08 — Agreement Generation

Agreements become generated documents.

Agreement data originates from:

Organization

↓

Property

↓

Occupant

↓

Financial Information

↓

Generated Agreement

Operational data remains the source of truth.

Agreement modifications should never directly modify operational records.

---

# Update 09 — Agreement Preview

Before profile creation, the system generates an agreement preview.

Users review the generated agreement.

Final confirmation:

Agree & Continue

Profile creation occurs only after successful confirmation.

---

# Update 10 — Success Workflow

After successful onboarding:

Occupant Profile Created

↓

Success Dialog

↓

Confetti Animation

↓

Available Actions

• View Profile

• Back to Directory

The onboarding transaction completes only after successful profile creation.

---

# Update 11 — Guest Lifecycle Automation

Guest lifecycle becomes fully automated.

Guest

↓

Past

Transition occurs automatically after Check-out Date.

No manual business action should be required.

---

# Update 12 — Notice Automation

Tenant lifecycle now supports automatic completion.

Notice

↓

Past

Transition occurs automatically when the configured Vacating Date is reached.

---

# Update 13 — Property Lifecycle

Property removal should use archiving.

Property

↓

Archived

Historical business records remain preserved.

Permanent deletion should only occur through controlled administrative processes.

---

# Update 14 — Communication Integration

Business domains should never communicate directly with external messaging providers.

Business Event

↓

Communication Domain

↓

Delivery Channel

Supported channels include:

• WhatsApp

• Email (Future)

• SMS (Future)

Communication remains independent from business logic.

---

# Update 15 — Bulk Communication

Bulk messaging operates using business filters.

Examples

Rent Due

↓

Select Matching Occupants

↓

Compose Message

↓

Optional QR Attachment

↓

Send

Bulk communication should reuse existing filtering infrastructure.

---

# Update 16 — Financial Automation

Financial calculations become event-driven.

Rent Collected

↓

Settlement Updated

↓

Reports Updated

Expense Recorded

↓

Settlement Updated

↓

Reports Updated

Manual recalculation should never be required.

---

# Update 17 — Timeline Integration

Every important business operation generates timeline events.

Examples

Occupant Created

Room Transfer

Agreement Generated

Rent Collected

Notice Logged

Guest Check-in

Guest Check-out

Timeline information remains read-only.

---

# Update 18 — Audit Integration

Important business operations generate audit history.

Audit should preserve:

• Previous State

• New State

• Timestamp

• Initiating User

Audit information supports accountability without modifying business records.

---

# Update 19 — Shared Domain Integration

Operational modules should reuse shared reference information.

Examples

Expense Categories

Payment Methods

Room Types

Notice Reasons

Reference information should never be duplicated across modules.

---

# Update 20 — Technical Design Principles

The revised technical architecture follows these principles.

• Single Source of Truth

• Domain Ownership

• Automatic Business Workflows

• Event-Driven Communication

• Generated Agreements

• Automated Lifecycle Management

• Shared Reference Reuse

• Historical Preservation

• Multi-Organization Isolation

• Component Reusability

Every future implementation should remain consistent with these principles.

---

# Revision Summary

This revision introduces:

• Unified Occupant Architecture

• Guest Support

• Split New Occupant Workflow

• Date-Aware Room Allocation

• Smart Bed Availability

• Room Transfer Engine

• Generated Agreement Workflow

• Agreement Preview

• Success Confirmation Workflow

• Automated Guest Lifecycle

• Automated Notice Lifecycle

• Property Archiving

• Event-Driven Communication

• Financial Automation

• Timeline Integration

• Audit Integration

• Shared Reference Architecture

These updates extend the original Technical System Specification without replacing it.

---
