# TAS-01 — Technical Architecture Specification

# Chapter 3 — Component Architecture

## Version

Version: 1.0

Status: APPROVED

---

# Objective

This chapter defines the official component architecture for TenoPilot.

Its objective is to ensure that every React component has a clear responsibility, remains reusable, easy to understand, and easy to maintain as the application grows.

The component architecture must prevent oversized components, duplicated UI, and business logic leakage.

---

# Business Context

TenoPilot is expected to grow continuously with new modules and features.

A consistent component architecture enables:

- Faster development
- Easier maintenance
- Better code reuse
- Predictable project structure
- Improved developer onboarding
- Better AI-generated code quality

---

# Scope

This chapter defines:

- Component categories
- Component responsibilities
- Component communication
- Component ownership
- Naming conventions
- Reusability principles

This chapter does NOT define:

- State Management
- Business Logic
- Backend Services

These are covered in later chapters.

---

# Problem Statement

Many React applications become difficult to maintain because:

- Components become excessively large
- Business logic exists inside UI
- Components are duplicated
- Components become tightly coupled
- Developers create inconsistent structures

TenoPilot will avoid these problems through a layered component architecture.

---

# Component Categories

TenoPilot defines five official component types.

1. Layout Components

2. Page Components

3. Feature Components

4. Shared UI Components

5. Composite Components

No additional categories should be introduced without architectural review.

---

# Layout Components

Purpose

Application layout.

Responsibilities

- Sidebar
- Header
- Navigation
- Footer
- Route Layouts
- Content Wrapper

Examples

```text
DashboardLayout

AuthLayout

MarketingLayout
```

Must NOT contain:

- Business Logic
- Firestore Calls
- Feature Logic

---

# Page Components

Purpose

Represent application routes.

Responsibilities

- Assemble feature components
- Configure page metadata
- Handle page composition

Page Components should remain intentionally small.

Ideal responsibility:

Compose

Never implement business logic.

Example

```text
DashboardPage

TenantsPage

ReportsPage
```

---

# Feature Components

Purpose

Business-specific user interface.

Examples

```text
TenantTable

VacancyMap

RentCollectionCard

ComplaintTimeline

FinancialSummary
```

Feature components may:

- Use feature hooks
- Use services
- Manage local UI state

Feature components must NOT:

- Access Firebase directly
- Duplicate business logic

---

# Shared UI Components

Purpose

Reusable visual building blocks.

Examples

```text
Button

Card

Input

Dialog

Table

Avatar

Badge

Tabs

Tooltip

Pagination
```

These components should never know anything about the business.

A Button should remain a Button.

Not

TenantButton

---

# Composite Components

Purpose

Combine multiple shared components into reusable business-independent layouts.

Examples

```text
SearchBar

DataTable

FilterPanel

EmptyState

ConfirmationDialog
```

Composite Components help reduce duplication across modules.

---

# Component Ownership

Every feature owns its own components.

Example

```text
features/

tenants/

components/

TenantTable.tsx

TenantCard.tsx

TenantFilters.tsx
```

Only reusable components belong inside

components/

---

# Component Responsibilities

Every component should perform one responsibility.

Examples

Good

```text
TenantCard

Displays tenant information.
```

Bad

```text
TenantCard

Displays

Creates

Deletes

Uploads

Prints

Navigates
```

Split responsibilities instead.

---

# Component Size Guidelines

Target

100–200 lines

Review Required

200–300 lines

Refactor Required

300+ lines

Large components should be decomposed into smaller components.

---

# Business Logic

Business logic belongs inside:

Services

Feature Hooks

Cloud Functions

Never inside presentation components.

---

# Component Communication

Allowed

Parent

↓

Child

Props

Shared State

↓

Hooks

Business Logic

↓

Services

Avoid deeply nested prop chains.

---

# State Ownership

Components should only own:

- UI State
- Animation State
- Temporary Form State

Business state belongs elsewhere.

---

# Reusability Principles

Before creating a component ask:

Will another module use this?

If YES

Shared Component

If NO

Feature Component

Avoid creating "shared" components that are used only once.

---

# Naming Standards

Components

PascalCase

Examples

```text
TenantCard.tsx

VacancyMap.tsx

BuildingOverview.tsx
```

Component folders

lowercase

Example

```text
components/

features/
```

---

# Why This Architecture Was Chosen

A layered component architecture provides:

- Better maintainability
- Lower duplication
- Easier testing
- Better readability
- Faster onboarding
- Cleaner AI-generated code

Every component has a clear purpose.

Developers should never wonder where a component belongs.

---

# Alternatives Considered

## Large Smart Components

Rejected

Reason

Too much responsibility.

Poor maintainability.

---

## Everything Inside components/

Rejected

Reason

Business ownership disappears.

Modules become tightly coupled.

---

## Feature Duplication

Rejected

Reason

Creates inconsistent UI.

Higher maintenance cost.

---

# Trade-offs

Advantages

- Predictable structure
- Easier debugging
- High reusability
- Better scalability

Trade-offs

- Slightly more files
- Requires architectural discipline

These trade-offs are acceptable.

---

# Performance Considerations

Smaller focused components:

- Render faster
- Easier memoization
- Better lazy loading
- Reduced unnecessary re-renders

Component architecture directly affects runtime performance.

---

# Security Considerations

UI Components should never:

- Validate permissions
- Verify subscriptions
- Execute secure operations

They display information only.

Security belongs to backend architecture.

---

# Maintainability Considerations

Every component should answer:

"What is my responsibility?"

If the answer contains multiple responsibilities,

split the component.

---

# Scalability Strategy

The component architecture should comfortably support:

- Hundreds of pages
- Thousands of components
- Multiple developers
- AI-assisted development

without requiring reorganization.

---

# Things We Explicitly Avoid

- God Components
- Massive JSX files
- Business logic in UI
- Duplicate components
- Shared components used once
- Components with multiple responsibilities

---

# Red Flag Checklist

Before creating a component ask:

- Can this component be split?
- Does it have one responsibility?
- Is this reusable?
- Does it belong inside this feature?
- Does it contain business logic?
- Can another developer understand it within two minutes?

If any answer is No,

reconsider the design.

---

# Principal Architect Review

Architecture Evaluation

Maintainability

★★★★★

Performance

★★★★★

Scalability

★★★★★

Developer Experience

★★★★★

Reusability

★★★★★

Overall Recommendation

APPROVED

---

# Final Architecture Decision

TenoPilot adopts a layered component architecture where every component has one clearly defined responsibility.

Shared components remain business-independent.

Business-specific components remain inside their owning feature.

---

# Architecture Status

Status

APPROVED

Version

1.0

Architecture

LOCKED
