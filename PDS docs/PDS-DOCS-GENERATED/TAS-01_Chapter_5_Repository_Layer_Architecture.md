# TAS-01 — Technical Architecture Specification

# Chapter 5 — Repository Layer Architecture

## Version

Version: 1.0

Status: APPROVED

---

# Objective

This chapter defines the Repository Layer architecture for TenoPilot.

The Repository Layer acts as the data access boundary between the Service Layer and Firebase.

Its purpose is to isolate database implementation details from business logic, ensuring that Services remain independent of the underlying storage technology.

---

# Business Context

TenoPilot uses Firebase Firestore as its primary database.

However, business logic should never directly depend on Firestore APIs.

If the underlying database implementation changes in the future, business logic should remain unaffected.

The Repository Layer provides this separation.

---

# Scope

This chapter defines:

- Repository responsibilities
- Repository ownership
- Communication flow
- Data access rules
- Naming conventions

This chapter does NOT define:

- Firestore collections
- Firestore queries
- Security rules
- Cloud Functions

These will be covered in later specifications.

---

# Problem Statement

Many applications allow Services to directly interact with Firestore.

This creates:

- Tight coupling
- Difficult testing
- Duplicate queries
- Database logic spread throughout the application
- Expensive migrations

TenoPilot avoids these issues by introducing a dedicated Repository Layer.

---

# Repository Layer Philosophy

Repositories answer one question:

"How is the data stored and retrieved?"

Services answer:

"What business operation should happen?"

This separation keeps both layers simple and maintainable.

---

# Architecture Flow

Every request follows this architecture.

```text
User

↓

UI

↓

Feature

↓

Service

↓

Repository

↓

Firebase SDK

↓

Firestore
```

Services never directly communicate with Firebase.

Repositories never contain business rules.

---

# Repository Responsibilities

Repositories own:

- Database reads
- Database writes
- Query execution
- Document mapping
- Firebase SDK interaction

Repositories must NOT own:

- Business validation
- Business rules
- Workflow coordination
- Permission decisions
- Subscription logic

---

# Official Repositories

```text
AuthRepository

OrganizationRepository

BuildingRepository

FloorRepository

RoomRepository

BedRepository

TenantRepository

PaymentRepository

FinancialRepository

ExpenseRepository

ComplaintRepository

MaintenanceRepository

StaffRepository

NotificationRepository

ReportRepository

SubscriptionRepository
```

Every repository owns exactly one data domain.

---

# Repository Methods

Methods should clearly describe data operations.

Examples

```text
getBuilding()

getBuildings()

createBuilding()

updateBuilding()

deleteBuilding()

getTenantById()

getVacancySummary()

getRentHistory()
```

Avoid vague method names such as:

```text
save()

process()

execute()

handle()
```

---

# Repository Responsibilities Example

BuildingRepository

Responsible for:

- Reading building documents
- Writing building documents
- Updating building information
- Querying building statistics

Not responsible for:

- Business validation
- Subscription limits
- Permission checks

Those belong inside Services.

---

# Data Transformation

Repositories may convert raw Firebase documents into application models.

Example

Firestore Document

↓

Repository

↓

Building Model

↓

Service

Repositories should never expose raw database structures directly to the application.

---

# Repository Independence

Repositories should remain independent of one another.

A Repository should not directly call another Repository.

If multiple repositories are required for one workflow, coordination belongs inside the Service Layer.

---

# Error Handling

Repositories should return consistent responses.

Unexpected Firebase errors should be translated into meaningful application errors before reaching the Service Layer.

---

# Why This Architecture Was Chosen

The Repository Layer provides:

- Database independence
- Easier testing
- Cleaner Services
- Better maintainability
- Better code organization
- Easier future migration
- Consistent database access

Business logic becomes completely independent of Firestore implementation.

---

# Alternatives Considered

## Services Directly Using Firestore

Rejected

Reason

Creates tight coupling.

Makes testing difficult.

Duplicates database logic.

---

## Generic Database Utility

Rejected

Reason

Becomes a dumping ground.

Violates domain ownership.

---

## Massive Repository

Rejected

Reason

Violates Single Responsibility Principle.

Becomes difficult to maintain.

---

# Trade-offs

Advantages

- Cleaner architecture
- Easier testing
- Easier migration
- Better maintainability
- Clear separation of responsibilities

Trade-offs

- Slightly more files
- Additional architectural layer

These trade-offs are acceptable because they significantly improve long-term maintainability.

---

# Performance Considerations

Repositories should:

- Execute efficient queries
- Minimize Firestore reads
- Batch related operations where appropriate
- Avoid duplicate requests

Repositories should never perform unnecessary queries.

---

# Security Considerations

Repositories do not make authorization decisions.

Security belongs to:

- Services
- Cloud Functions
- Firestore Security Rules

Repositories only perform data access.

---

# Cloud Cost Considerations

Well-designed repositories reduce:

- Duplicate Firestore reads
- Duplicate writes
- Redundant queries
- Inefficient data retrieval

Efficient repositories directly contribute to lower operational costs.

---

# Scalability Strategy

Repositories should support:

- Millions of Firestore documents
- Large collections
- Efficient pagination
- Optimized querying

Future storage optimizations should occur within repositories without affecting business logic.

---

# Future Expansion

Adding a new business module requires:

New Feature

↓

New Service

↓

New Repository

↓

Existing Firebase Infrastructure

Existing Services remain unchanged.

---

# Things We Explicitly Avoid

- Firestore inside Components
- Firestore inside Features
- Firestore inside Services
- Generic Database Helpers
- Shared Repository Logic without ownership
- Business Rules inside Repositories

---

# Red Flag Checklist

Before creating a Repository ask:

- Does it own one data domain?
- Does it contain business logic?
- Is it directly communicating with Firestore?
- Does another Repository already own this data?
- Can it be tested independently?

If any answer raises concern, redesign before implementation.

---

# Principal Architect Review

Architecture Evaluation

Maintainability

★★★★★

Scalability

★★★★★

Performance

★★★★★

Cloud Cost

★★★★★

Testability

★★★★★

Developer Experience

★★★★★

Overall Recommendation

APPROVED

---

# Final Architecture Decision

TenoPilot adopts a dedicated Repository Layer.

Repositories own all database interactions.

Services own business logic.

Firebase implementation remains isolated from the rest of the application.

This architectural boundary is permanently LOCKED.

---

# Architecture Status

Status

APPROVED

Version

1.0

Architecture

LOCKED
