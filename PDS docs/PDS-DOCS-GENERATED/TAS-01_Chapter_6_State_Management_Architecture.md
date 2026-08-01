# TAS-01 — Technical Architecture Specification

# Chapter 6 — State Management Architecture

## Version

Version: 1.0

Status: APPROVED

---

# Objective

This chapter defines the official state management strategy for TenoPilot.

The objective is to ensure every piece of application state has a clearly defined owner, preventing duplicated state, unnecessary re-renders, inconsistent data and difficult maintenance.

State should always exist in the most appropriate location.

---

# Business Context

TenoPilot is a large SaaS platform consisting of multiple independent business modules.

As the application grows, uncontrolled state management leads to:

- Duplicate data
- Difficult debugging
- Poor performance
- Inconsistent UI
- Higher Firestore reads
- Difficult maintenance

To avoid these problems, TenoPilot adopts a layered state management strategy.

---

# Scope

This chapter defines:

- State ownership
- State categories
- Global state
- Server state
- Local state
- Form state
- Shared state
- State management technologies

This chapter does NOT define:

- Database
- Backend
- Business Logic
- Authentication Rules

---

# State Management Philosophy

Every piece of state should have exactly one owner.

Never duplicate the same state across multiple stores.

Choose the smallest scope necessary.

Local state should remain local.

Global state should only be used when truly required.

---

# Official State Technologies

TenoPilot officially uses:

- React useState
- React Context
- Zustand
- TanStack Query
- React Hook Form

No additional state management libraries should be introduced.

---

# State Categories

The application defines five official state categories.

1. Local UI State

2. Global Application State

3. Server State

4. Form State

5. Session State

---

# Local UI State

Technology

React useState

Purpose

Temporary UI behavior.

Examples

- Dialog Open
- Selected Tab
- Current Step
- Expanded Card
- Search Input
- Toggle Button

Local state belongs only inside its component.

Never place temporary UI state inside Zustand.

---

# Global Application State

Technology

Zustand

Purpose

Application-wide shared state.

Examples

- Current Building
- Selected Organization
- Sidebar Collapse
- Theme
- User Preferences
- Active Filters

Only truly shared state belongs here.

Avoid storing server data.

---

# Server State

Technology

TanStack Query

Purpose

Data retrieved from Firebase.

Examples

- Buildings
- Tenants
- Reports
- Financial Summary
- Complaints
- Staff

TanStack Query owns:

- Fetching
- Caching
- Background Refetching
- Cache Invalidation
- Loading States

Never duplicate server data inside Zustand.

---

# Form State

Technology

React Hook Form

Purpose

User Input.

Examples

- Tenant Form
- Building Form
- Complaint Form
- Staff Form
- Expense Form

React Hook Form owns all temporary form state.

Validation will use Zod.

---

# Session State

Technology

React Context

Purpose

Application-wide providers.

Examples

- Theme Provider
- Query Provider
- Authentication Context
- Toast Provider

React Context should not become a global state manager.

Only application providers belong here.

---

# State Ownership Rules

Question

Is this temporary UI?

↓

useState

---

Question

Is this server data?

↓

TanStack Query

---

Question

Is this application-wide shared state?

↓

Zustand

---

Question

Is this form data?

↓

React Hook Form

---

Question

Is this application provider?

↓

React Context

---

# State Communication

Allowed

```text
UI

↓

Hook

↓

Service

↓

Repository
```

State should never bypass the architecture.

---

# Caching Strategy

Only TanStack Query owns server caching.

Never manually cache Firestore data.

TanStack Query should manage:

- Cache Lifetime
- Background Refresh
- Refetch
- Query Invalidation

---

# Zustand Responsibilities

Zustand should remain intentionally small.

Examples

```text
Current Building

Current Organization

Sidebar

Theme

Filters

View Preferences
```

Never place Firestore collections inside Zustand.

---

# TanStack Query Responsibilities

TanStack Query owns

- Firebase Reads
- Cache
- Refetch
- Synchronization
- Loading State

Business logic remains inside Services.

---

# React Context Responsibilities

React Context is reserved for Providers only.

Examples

```text
ThemeProvider

QueryProvider

AuthProvider

ToastProvider
```

Avoid using Context for frequently changing application state.

---

# Why This Architecture Was Chosen

Each technology specializes in one type of state.

This provides:

- Better performance
- Cleaner architecture
- Easier maintenance
- Fewer re-renders
- Reduced Firestore reads
- Easier debugging

---

# Alternatives Considered

Everything Inside Zustand

Rejected

Reason

Becomes difficult to maintain.

Duplicates server state.

---

Everything Inside Context

Rejected

Reason

Frequent unnecessary re-renders.

Poor scalability.

---

Everything Inside useState

Rejected

Reason

Impossible to share application state.

---

# Trade-offs

Advantages

- Predictable state ownership
- Better performance
- Cleaner architecture
- Lower cloud cost
- Easier testing

Trade-offs

- Multiple state technologies
- Developers must understand responsibilities

These trade-offs are acceptable because every technology has a clearly defined role.

---

# Performance Considerations

Proper state ownership reduces:

- Component re-renders
- Firestore reads
- Duplicate fetches
- Memory usage

State architecture directly affects application responsiveness.

---

# Security Considerations

Sensitive business data should never rely solely on client-side state.

All authorization decisions belong to backend services.

State managers are responsible only for UI representation.

---

# Cloud Cost Considerations

Using TanStack Query correctly significantly reduces duplicate Firestore reads through intelligent caching.

Efficient cache management contributes directly to lower operational costs.

---

# Scalability Strategy

The state architecture should comfortably support:

- Hundreds of pages
- Thousands of components
- Multiple developers

without requiring architectural changes.

---

# Things We Explicitly Avoid

- Server data inside Zustand
- Business logic inside Zustand
- Firestore collections inside Context
- Global state for temporary UI
- Duplicate state ownership
- Multiple sources of truth

---

# Red Flag Checklist

Before creating state ask:

- Is this temporary?
- Is this shared?
- Is this server data?
- Is this form data?
- Does another store already own it?
- Can the scope be reduced?

If unsure, choose the smaller scope.

---

# Principal Architect Review

Architecture Evaluation

Performance

★★★★★

Maintainability

★★★★★

Scalability

★★★★★

Developer Experience

★★★★★

Cloud Cost

★★★★★

Overall Recommendation

APPROVED

---

# Final Architecture Decision

TenoPilot adopts a layered state management architecture.

Every category of state has one clearly defined owner.

No state duplication is permitted.

This architecture is permanently LOCKED.

---

# Architecture Status

Status

APPROVED

Version

1.0

Architecture

LOCKED
