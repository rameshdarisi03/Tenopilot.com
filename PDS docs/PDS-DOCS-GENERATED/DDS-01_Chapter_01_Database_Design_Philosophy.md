# DDS Chapter 01
# Database Design Philosophy

**Document ID:** DDS-01

**Version:** 1.0

**Status:** Approved

---

# Purpose

This document defines the core database philosophy for TenoPilot.

Every future database decision must follow the principles established in this chapter.

The goal is to build a database architecture that is scalable, maintainable, secure, and capable of supporting thousands of organizations without requiring structural redesign.

This chapter defines architectural principles rather than individual collections or database schemas.

---

# Core Philosophy

The database should represent the real-world business structure of a PG management company.

The database should organize information naturally rather than around application screens.

Business entities should own their own data.

Every piece of information should have a single source of truth.

---

# Design Goals

The database must be designed to achieve the following goals.

• Scalability

• Simplicity

• Maintainability

• Data Integrity

• Performance

• Security

• Multi-Organization Isolation

Every future database decision should support these goals.

---

# Single Source of Truth

Information should never be duplicated unnecessarily.

Each business entity owns its own information.

Examples

Tenant Information

↓

Owned by Tenant

Room Information

↓

Owned by Room

Property Information

↓

Owned by Property

Expense Information

↓

Owned by Expense

Financial calculations should always be derived from stored business events rather than duplicated values.

---

# Business Driven Design

Database structure should follow business concepts rather than user interface layouts.

Examples

Property

Room

Bed

Occupant

Agreement

Expense

Settlement

These are business entities.

Screens should read from business entities rather than defining database structure.

---

# Independent Business Modules

Every major business module should remain logically independent.

Examples

Property Management

Occupant Management

Financial Hub

Maintenance

Reports

Changes within one module should not require redesigning another module.

---

# Multi-Tenant Architecture

TenoPilot is designed as a multi-tenant SaaS platform.

Every organization owns its own completely isolated business data.

Organizations should never have visibility into another organization's information.

Data isolation is a foundational architectural requirement.

---

# Hierarchical Ownership

Business information follows a natural ownership hierarchy.

Organization

↓

Property

↓

Room

↓

Bed

↓

Occupant

Every level owns only information relevant to itself.

Lower levels should not duplicate parent information unless absolutely necessary.

---

# Event Driven Data

The database stores business events.

Examples

Rent Collected

Expense Recorded

Room Transfer

Notice Logged

Guest Check-in

Guest Check-out

Business intelligence should be generated from these recorded events.

Derived information should never become the primary source of truth.

---

# Lifecycle Based Design

Every business entity follows a lifecycle.

Examples

Occupant

Booked

↓

Active

↓

Notice

↓

Past

Guest

Active

↓

Past

The database should preserve lifecycle history rather than overwrite previous states whenever historical tracking is required.

---

# Extensibility

Every module should allow future expansion without structural redesign.

Examples

Future Property Types

Additional Occupant Types

New Financial Modules

Additional Reports

Maintenance Enhancements

Future requirements should extend existing structures rather than replacing them.

---

# Data Consistency

The same terminology must be used throughout the database.

Examples

Property

Room

Bed

Occupant

Expense

Settlement

Agreement

Terminology should remain consistent with BCS, TAS, TSS and PDS documentation.

---

# Performance Philosophy

The database should prioritize efficient reads for everyday business operations.

Common business activities should require minimal database operations.

Examples

Opening Dashboard

Viewing Property

Collecting Rent

Opening Tenant Profile

Viewing Floor Navigation

Database design should optimize these high-frequency operations.

---

# Security Philosophy

Every organization owns its own private business data.

Data ownership must always be verified before allowing read or write operations.

Security should be enforced by architecture rather than relying solely on application logic.

---

# Audit Philosophy

Important business operations should remain traceable.

Examples

Room Transfer

Rent Collection

Expense Recording

Notice Period

Agreement Creation

The system should preserve meaningful operational history whenever appropriate.

---

# Automation Philosophy

The database stores business events.

The application performs calculations.

Examples

Expenses

↓

Settlement

Rent Collection

↓

Reports

Guest Checkout

↓

Past Guest

Notice Expiry

↓

Past Tenant

Automation should always be derived from recorded business events.

---

# Long-Term Vision

The database architecture should support the long-term growth of TenoPilot.

The system should comfortably scale from:

• Single Property Owners

to

• Organizations managing thousands of properties

without requiring architectural redesign.

Scalability should be achieved through good data organization rather than database complexity.

---

# Guiding Principle

The database exists to accurately represent the business.

The application exists to present that information.

The database should remain simple, predictable, and stable while allowing the application to evolve independently.

---
