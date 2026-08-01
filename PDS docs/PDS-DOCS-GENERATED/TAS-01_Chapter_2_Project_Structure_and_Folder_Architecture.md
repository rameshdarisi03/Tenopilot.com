# TAS-01 — Technical Architecture Specification

# Chapter 2 — Project Structure & Folder Architecture

## Version

Version: 1.0

Status: APPROVED

---

# Objective

This chapter defines the official project structure for TenoPilot.

The objective is to create a clean, predictable and scalable codebase that remains maintainable as the application grows.

Every developer and AI coding assistant must follow this structure.

No folder should exist without a clearly defined responsibility.

---

# Business Context

TenoPilot is expected to evolve continuously over many years.

A well-organized project structure reduces:

- Technical debt
- Developer confusion
- Duplicate code
- Architecture violations
- Maintenance cost

A predictable structure allows new developers and AI coding assistants to understand the project immediately.

---

# Scope

This chapter defines:

- Project folder structure
- Folder responsibilities
- File organization
- Naming conventions
- Architectural boundaries

This chapter does NOT define:

- Firestore Collections
- Backend Services
- Security Rules

These are covered in later specifications.

---

# Problem Statement

Many projects eventually become difficult to maintain because:

- Files are placed randomly
- Business logic is scattered
- Utility folders become dumping grounds
- Components become duplicated
- Developers follow different structures

TenoPilot will avoid these problems by enforcing a single project structure.

---

# Recommended Project Structure

```text
app/
components/
features/
services/
lib/
providers/
hooks/
types/
utils/
constants/
styles/
public/
docs/
```

Every folder has one responsibility.

---

# Folder Responsibilities

## app/

Purpose

Application routing.

Responsibilities

- Pages
- Layouts
- Route Groups
- Metadata
- Loading UI
- Error Pages

Must NOT contain

- Business Logic
- Firebase Logic
- Database Queries

---

## components/

Purpose

Reusable UI Components.

Examples

- Button
- Card
- Modal
- Table
- Dialog
- Badge
- Avatar

Components should be reusable across multiple modules.

Must NOT contain business logic.

---

## features/

Purpose

Business Modules.

Each feature owns its UI.

Examples

```text
features/

dashboard/

buildings/

tenants/

financial/

maintenance/

reports/

staff/

subscription/
```

Each feature contains

- Components
- Feature Hooks
- Feature Utilities

A feature must never contain another feature.

---

## services/

Purpose

Business Logic.

Examples

```text
BuildingService

TenantService

PaymentService

ReportService

NotificationService
```

Responsibilities

- Validation
- Business Rules
- Data Transformation
- Workflow Logic

Services never render UI.

---

## lib/

Purpose

Framework configuration.

Examples

Firebase

Resend

Razorpay

Third-party initialization

No business logic belongs here.

---

## providers/

Purpose

Application Providers.

Examples

Theme

Authentication

Query Provider

Toast Provider

Only application-wide providers belong here.

---

## hooks/

Purpose

Reusable Custom Hooks.

Examples

```text
useCurrentBuilding()

usePagination()

useDebounce()

useMediaQuery()
```

Hooks should remain generic.

Feature-specific hooks belong inside their respective feature folders.

---

## types/

Purpose

Global TypeScript Types.

Examples

```text
Tenant

Building

Payment

Complaint

Subscription
```

Avoid duplicate type definitions.

---

## utils/

Purpose

Pure Utility Functions.

Examples

```text
formatCurrency()

formatDate()

calculateAge()
```

Utilities must be:

- Pure
- Reusable
- Independent

No Firebase.

No Business Logic.

---

## constants/

Purpose

Application Constants.

Examples

- Roles
- Status Values
- Subscription Types
- Application Limits

Avoid hardcoded values throughout the application.

---

## styles/

Purpose

Global styling.

Examples

Fonts

Animations

Theme

Global CSS

---

## public/

Purpose

Static Assets.

Examples

Images

Icons

Logos

Manifest

Robots.txt

---

## docs/

Purpose

Project Documentation.

Examples

BCS

EPS

TSS

PDS

UX

TAS

DDS

BAS

SAS

CDS

APS

The documentation should remain inside the repository.

---

# Naming Standards

Folders

lowercase

Example

```text
dashboard

financial

reports
```

Components

PascalCase

```text
TenantCard.tsx

BuildingTable.tsx
```

Hooks

camelCase

```text
useTenant()

useCurrentBuilding()
```

Services

PascalCase

```text
TenantService.ts

BuildingService.ts
```

Types

PascalCase

```text
Tenant.ts

Building.ts
```

Constants

UPPER_CASE

```text
USER_ROLES.ts

SUBSCRIPTION_STATUS.ts
```

---

# Import Rules

Allowed

```text
Page

↓

Feature

↓

Service

↓

Lib
```

Not Allowed

```text
Component

↓

Firestore
```

---

```text
Feature

↓

Firebase
```

---

Business logic should always pass through Services.

---

# Dependency Rules

Allowed

```text
app

↓

features

↓

services

↓

lib
```

Dependencies should always flow downward.

Circular dependencies are prohibited.

---

# Module Ownership

Every feature owns its own components.

Example

```text
features/

tenants/

components/

hooks/

pages/
```

Shared UI belongs inside

components/

Feature UI belongs inside

features/

---

# Future Expansion

New features should be added without modifying existing modules.

Example

```text
visitor-management/

inventory/

analytics/
```

Each new module follows the same structure.

---

# Why This Architecture Was Chosen

A modular folder structure:

- Reduces coupling
- Improves maintainability
- Simplifies onboarding
- Makes AI-generated code more consistent
- Supports long-term scalability

The architecture allows teams to grow without reorganizing the project.

---

# Alternatives Considered

Feature-less Architecture

Rejected

Reason

Business modules become scattered.

---

Massive Shared Components Folder

Rejected

Reason

Creates clutter.

Reduces discoverability.

---

Everything Inside app/

Rejected

Reason

Mixes routing with business logic.

Violates separation of concerns.

---

# Trade-offs

Advantages

- Predictable
- Easy navigation
- Modular
- Maintainable

Trade-offs

- More folders
- Requires discipline

These trade-offs are acceptable because long-term maintainability is significantly improved.

---

# Performance Considerations

A modular structure enables:

- Better code splitting
- Easier lazy loading
- Smaller bundles
- Faster builds

Performance benefits originate from proper organization.

---

# Security Considerations

Keeping Firebase configuration, business logic and UI separated reduces accidental exposure of sensitive logic.

This structure supports progressive security implementation.

---

# Cloud Cost Considerations

A clean architecture reduces unnecessary:

- Firestore Reads
- Duplicate Queries
- Redundant Cloud Function Calls

Efficient code organization contributes to lower operational costs.

---

# Scalability Strategy

The project structure should comfortably support:

- Hundreds of modules
- Thousands of components
- Multiple development teams

without requiring major reorganization.

---

# Things We Explicitly Avoid

- Misc folder
- Helpers folder used as dumping ground
- Random utilities
- Business logic inside components
- Firebase inside UI
- Duplicate types
- Circular imports

---

# Red Flag Checklist

Before adding a new file ask:

- Does this belong in the correct folder?
- Does this duplicate existing functionality?
- Does this violate module ownership?
- Can another developer easily locate it?
- Does it follow naming conventions?

If not, reconsider placement.

---

# Principal Architect Review

Architecture Evaluation

Maintainability

★★★★★

Scalability

★★★★★

Developer Experience

★★★★★

Performance

★★★★★

Cloud Cost

★★★★★

Overall Recommendation

APPROVED

---

# Final Architecture Decision

TenoPilot adopts a modular project structure with clearly defined responsibilities for every folder.

Every future implementation must follow this structure.

---

# Architecture Status

Status

APPROVED

Version

1.0

Architecture

LOCKED
