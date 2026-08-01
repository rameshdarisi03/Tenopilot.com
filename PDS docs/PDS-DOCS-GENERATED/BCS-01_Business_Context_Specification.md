# BCS-01 — Business Context Specification

## Version

Version: 1.0

Status: LOCKED

---

# Objective

This document establishes the complete business context of TenoPilot.

Every future Product Design Specification (PDS), UX Specification (UX), Technical Architecture Specification (TAS), Database Design Specification (DDS), Backend Architecture Specification (BAS), Security Architecture Specification (SAS), and development task must follow the business rules defined in this document.

This document should always be the first document read by developers and AI coding assistants before implementation begins.

---

# Business Overview

## Product Name

TenoPilot

Website

https://tenopilot.com

---

# What is TenoPilot?

TenoPilot is a cloud-based Rental Operating System designed specifically for managing:

- Paying Guest (PG) Accommodations
- Hostels
- Co-living Spaces
- Student Housing
- Small Rental Buildings

TenoPilot centralizes daily operations such as tenant management, occupancy tracking, rent collection, maintenance, financial reporting and operational insights into one unified platform.

---

# Product Vision

Our goal is not to build another management software.

Our goal is to build the most intuitive Rental Operating System that enables property owners to manage their entire rental business from a single modern platform.

The product must remain:

- Fast
- Reliable
- Easy to learn
- Highly scalable
- Low maintenance
- Secure
- Affordable

---

# Target Customers

Primary Customers

- PG Owners
- Hostel Owners
- Co-living Operators
- Student Accommodation Providers
- Small Rental Building Owners

Typical customer characteristics

- Not highly technical
- Prefer simple workflows
- Mostly operate using mobile phones and laptops
- Currently manage operations using Excel sheets, Google Sheets or physical registers
- Want to reduce manual work
- Expect software to save time immediately

---

# Problems We Solve

Traditional rental businesses commonly face:

- Manual rent tracking
- Excel sheet dependency
- Paper-based record keeping
- Difficulty tracking vacancies
- Poor complaint management
- No centralized tenant information
- Time-consuming reporting
- Lack of operational visibility

TenoPilot replaces disconnected workflows with one integrated operating system.

---

# Product Philosophy

TenoPilot is NOT:

- An ERP
- An Accounting Software
- A CRM
- A Real Estate Marketplace

TenoPilot IS:

A Rental Operating System focused on operational efficiency for rental accommodation businesses.

Every feature must contribute directly to simplifying rental operations.

---

# Business Hierarchy

Every organization follows this hierarchy.

Organization

↓

Building

↓

Floor

↓

Room

↓

Bed

↓

Tenant

This hierarchy is considered the core business structure of TenoPilot.

All future modules must respect this hierarchy.

---

# Subscription Model

TenoPilot follows a Software as a Service (SaaS) subscription model.

Pricing is based primarily on the number of Buildings managed by an organization.

Each organization may operate one or more buildings depending on their subscription plan.

---

# Trial Model

Every new organization receives:

10-Day Free Trial

During trial:

- Full access
- No feature restrictions

After trial expiration:

Users may continue accessing their account.

Allowed:

- View Dashboard
- View Buildings
- View Tenants
- View Reports
- View Existing Data

Restricted:

- Add Buildings
- Add Tenants
- Edit Operational Data
- Record Rent Collection
- Create Expenses
- Upload Documents
- Perform operational actions

The application transitions into Read-Only Mode until an active subscription is purchased.

---

# Authentication

Primary authentication:

Google Sign-In

Future authentication methods may include:

- Email & Password
- Phone Authentication

Authentication must remain simple for non-technical users.

---

# Data Ownership

Every organization owns only its own data.

Organizations must never have visibility into another organization's information.

Complete data isolation is mandatory.

---

# Data Migration

Switching from manual systems should be effortless.

Supported migration methods:

- Excel Import
- CSV Import

Future:

- Google Sheets Integration
- Assisted Migration Service

Every import must include:

- Validation
- Preview
- Error Reporting
- User Confirmation

before data is written into the database.

---

# Core Business Modules

Current product modules include:

- Dashboard
- Buildings
- Building Setup
- Vacancy Map
- Tenant Management
- Financial Hub
- Complaints & Maintenance
- Staff Management
- Reports
- Subscription Management

Each module owns a specific business responsibility.

Modules should never duplicate responsibilities.

---

# Business Principles

Every feature added to TenoPilot should satisfy at least one of the following:

- Reduce manual work
- Save owner time
- Improve operational visibility
- Reduce business mistakes
- Simplify decision making
- Increase occupancy management efficiency
- Improve financial tracking

If a feature does not create measurable business value, it should not be added.

---

# User Experience Principles

The application should always feel:

- Simple
- Fast
- Predictable
- Clean
- Professional

Avoid technical terminology whenever possible.

Interfaces should be understandable even for first-time software users.

---

# Performance Goals

The application should remain responsive even when organizations manage:

- 2,000+ Buildings
- Hundreds of thousands of tenants
- Large historical datasets

Performance should always be considered before introducing new functionality.

---

# Scalability Vision

TenoPilot should be capable of growing from:

Single Building

↓

Multiple Buildings

↓

Thousands of Buildings

without requiring major architectural rewrites.

Scalability should come from good architecture rather than unnecessary infrastructure complexity.

---

# Engineering Philosophy

Development should prioritize:

- Simplicity
- Maintainability
- Performance
- Security
- Modularity
- Scalability

Readable code is preferred over clever code.

Maintainable architecture is preferred over premature optimization.

---

# Why This Business Model Was Chosen

Rental accommodation businesses require an operational platform rather than a generic property management application.

Focusing on operational workflows enables TenoPilot to remain intuitive, efficient and highly specialized for its target market.

This specialization is a major competitive advantage.

---

# Things We Explicitly Avoid

TenoPilot will avoid becoming:

- A full accounting platform
- A payroll system
- A marketplace
- A real estate listing website
- A general ERP

Feature creep should be avoided.

The platform should remain focused on rental operations.

---

# Success Criteria

A successful TenoPilot implementation should enable customers to:

- Configure a building quickly
- Onboard tenants easily
- Track occupancy accurately
- Collect rent efficiently
- Monitor finances clearly
- Resolve complaints faster
- Generate reports instantly
- Operate multiple buildings from one platform

---

# Final Business Decision

Business Context

APPROVED

Status

LOCKED

This document serves as the foundation for every future engineering and product decision within TenoPilot.

No implementation should contradict the business rules defined in this specification.
