# TAS-01 — Technical Architecture Specification

# Chapter 1 — Overall Application Architecture

## Version

Version: 1.0

Status: APPROVED

---

# Objective

This chapter defines the overall software architecture for TenoPilot.

It establishes the architectural layers, responsibilities, communication flow and module boundaries that every future implementation must follow.

No future module should violate the architecture defined in this document.

---

# Business Context

TenoPilot is a cloud-native SaaS Rental Operating System designed for:

- PG Owners
- Hostel Owners
- Co-living Spaces
- Student Housing
- Rental Building Operators

The platform is expected to scale comfortably beyond **2,000 buildings** while maintaining:

- High Performance
- Low Cloud Costs
- Strong Maintainability
- Modular Development
- Simple Deployment
- Excellent User Experience

---

# Scope

This chapter defines:

- Overall application architecture
- Layer separation
- Module responsibilities
- Communication flow
- Architectural boundaries

This chapter does NOT define:

- Firestore collections
- Folder structure
- Coding standards
- Backend implementation
- Security rules

Those are covered in later specifications.

---

# Problem Statement

Many SaaS products become difficult to maintain because business logic, UI logic and database operations become tightly coupled.

This results in:

- Difficult debugging
- Expensive maintenance
- Duplicate logic
- Poor scalability
- Security issues
- Slow development

TenoPilot will avoid these problems through strict architectural separation.

---

# Recommended Architecture

TenoPilot follows a **Layered Modular Architecture**.

Each layer has a single responsibility.

Every request must flow through the approved architecture.

```text
User
    │
    ▼
Next.js UI
    │
    ▼
Feature Module
    │
    ▼
Service Layer
    │
    ▼
Cloud Functions (when required)
    │
    ▼
Firebase Services
    │
    ▼
Firestore / Storage
```

Each layer must only communicate with the layer directly below it.

Layers must never bypass the architecture.

---

# Architectural Layers

## Layer 1 — Presentation Layer

Responsibilities

- User Interface
- User Interaction
- Form Rendering
- Loading States
- Error Display

Must NOT contain:

- Business Logic
- Database Logic
- Permission Logic
- Subscription Logic

---

## Layer 2 — Feature Layer

Responsibilities

Each business module owns its own functionality.

Examples

- Dashboard
- Buildings
- Tenants
- Financial Hub
- Reports
- Maintenance
- Staff

Feature modules coordinate UI and services.

They do not directly communicate with Firebase.

---

## Layer 3 — Service Layer

Responsibilities

- Business Logic
- Validation
- Workflow Coordination
- Data Transformation
- Business Rules

Examples

- Tenant Service
- Building Service
- Report Service
- Payment Service
- Notification Service

The Service Layer acts as the application's business brain.

---

## Layer 4 — Backend Layer

Responsibilities

Firebase Cloud Functions

Used for:

- Secure Operations
- Report Generation
- Subscription Validation
- Scheduled Jobs
- Email Processing
- Payment Verification

Heavy business operations should execute here.

---

## Layer 5 — Data Layer

Responsibilities

- Firestore
- Firebase Storage
- Firebase Authentication

This layer stores and retrieves data only.

No business logic belongs here.

---

# Communication Rules

Allowed

```text
UI
↓

Feature

↓

Service

↓

Backend

↓

Database
```

Not Allowed

```text
UI
↓

Firestore
```

---

```text
UI
↓

Cloud Function

↓

Ignoring Services
```

---

```text
Feature

↓

Database
```

---

Every request should respect the approved architecture.

---

# Module Independence

Each business module should remain independent.

Example

Tenant Module

does not contain

Payment Logic.

Payment Module

does not contain

Complaint Logic.

Shared functionality belongs in reusable services.

---

# Separation of Responsibilities

Every layer owns one responsibility.

Presentation

↓

Interaction

Feature

↓

Business Flow

Service

↓

Business Logic

Backend

↓

Secure Operations

Database

↓

Persistence

This separation significantly improves maintainability.

---

# Why This Architecture Was Chosen

Layered Modular Architecture provides:

- Clear responsibilities
- Easier debugging
- Easier onboarding
- Better scalability
- Lower maintenance cost
- Reusable business logic
- Better testing
- Cleaner codebase

This architecture is widely used in successful SaaS applications because it scales well as teams and products grow.

---

# Alternatives Considered

## Direct Firebase from Components

Advantages

- Faster initial development

Rejected Because

- Business logic becomes duplicated
- Difficult testing
- Tight coupling
- Poor maintainability

---

## Massive Global Services

Rejected Because

- Large service files
- Difficult debugging
- Poor scalability
- Violates Single Responsibility Principle

---

## Microservices

Rejected Because

- Unnecessary complexity
- Higher operational cost
- Current business scale does not justify distributed architecture

May be reconsidered only if future business requirements demand it.

---

# Trade-offs

Advantages

- Easy maintenance
- Excellent scalability
- Clear architecture
- Low technical debt
- Modular development
- Easier testing

Trade-offs

- Slightly more planning
- More files than tightly coupled applications

These trade-offs are acceptable because maintainability is a long-term business advantage.

---

# Performance Considerations

The architecture should minimize:

- Unnecessary Firestore Reads
- Duplicate API Calls
- Excessive Rendering
- Business Logic Duplication

Performance improvements should originate from architecture rather than later optimizations.

---

# Security Considerations

The architecture separates business logic from the user interface.

Future security policies can therefore be introduced without requiring architectural rewrites.

Security enforcement will be progressively enabled during later development stages.

---

# Scalability Strategy

The architecture is expected to support:

- Thousands of organizations
- Thousands of buildings
- Hundreds of thousands of tenants

without requiring significant architectural changes.

Future scaling should primarily involve infrastructure and optimization rather than redesign.

---

# Maintainability Considerations

Future developers should understand:

- where code belongs
- where logic belongs
- where data belongs

within minutes.

Predictable architecture significantly reduces future maintenance cost.

---

# Future Expansion Strategy

New modules should plug into the existing architecture without modifying existing modules.

Example

Future:

Visitor Management

↓

New Feature Module

↓

New Service

↓

Existing Backend

↓

Existing Database

No existing architecture should require redesign.

---

# Things We Explicitly Avoid

- Business logic inside UI
- Direct database access from components
- God Components
- God Services
- Circular dependencies
- Duplicate business logic
- Tight coupling between modules

---

# Red Flag Checklist

Before implementing any feature ask:

- Does this bypass the Service Layer?
- Does this mix UI and business logic?
- Does this duplicate an existing responsibility?
- Does this increase coupling?
- Does this violate module independence?
- Does this make future maintenance harder?

If yes, redesign before implementation.

---

# Principal Architect Review

Architecture Evaluation

Performance

★★★★★

Scalability

★★★★★

Maintainability

★★★★★

Cloud Cost

★★★★★

Developer Experience

★★★★★

Security Foundation

★★★★★

Overall Recommendation

APPROVED

---

# Final Architecture Decision

TenoPilot adopts a **Layered Modular Architecture**.

Every future implementation must respect the layer boundaries defined in this chapter.

No module may bypass the approved architectural flow.

---

# Architecture Status

Status

APPROVED

Version

1.0

Architecture

LOCKED
