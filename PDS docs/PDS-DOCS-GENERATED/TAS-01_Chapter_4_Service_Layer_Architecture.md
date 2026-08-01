# TAS-01 — Technical Architecture Specification

# Chapter 4 — Service Layer Architecture

## Version

Version: 1.0

Status: APPROVED

---

# Objective

This chapter defines the Service Layer architecture of TenoPilot.

The Service Layer is the heart of the application.

Every business rule, workflow and operational decision must pass through this layer.

The purpose of this architecture is to keep:

- UI clean
- Business logic centralized
- Firebase isolated
- Code reusable
- Testing easier
- Security easier to implement
- Cloud costs predictable

---

# Business Context

TenoPilot is a Rental Operating System.

Every action performed by users represents a business operation.

Examples:

- Create Building
- Configure Floors
- Add Room
- Assign Bed
- Add Tenant
- Collect Rent
- Raise Complaint
- Resolve Complaint
- Generate Report
- Upgrade Subscription

These are business operations.

Business operations belong inside Services.

Never inside UI.

---

# Scope

This chapter defines

- Service Layer
- Service Responsibilities
- Service Communication
- Business Rule Ownership
- Service Boundaries
- Service Naming

This chapter does NOT define

- Firestore Collections
- Cloud Functions
- Security Rules

Those will be defined later.

---

# Problem Statement

Many applications place business logic inside:

- Components
- Hooks
- Firebase
- API Routes

This creates:

- Duplicate logic
- Difficult testing
- Security issues
- Tight coupling
- Expensive maintenance

TenoPilot avoids these problems through a dedicated Service Layer.

---

# Service Layer Philosophy

The Service Layer is the application's Business Brain.

The UI asks:

"What should happen?"

The Service decides:

"How it happens."

---

# Request Flow

Every request follows the same architecture.

```text
User

↓

UI

↓

Feature

↓

Service

↓

Cloud Function (if required)

↓

Firebase

↓

Database
```

No layer may skip the Service Layer.

---

# Service Responsibilities

Services own:

- Business Rules
- Validation
- Workflow
- Data Transformation
- Calculations
- Coordinating multiple operations

Services never:

- Render UI
- Display dialogs
- Handle animations
- Perform layout work

---

# Official Services

TenoPilot officially defines the following services.

```text
AuthService

OrganizationService

BuildingService

FloorService

RoomService

BedService

TenantService

PaymentService

FinancialService

ExpenseService

ComplaintService

MaintenanceService

StaffService

NotificationService

ReportService

SubscriptionService

ImportService

ExportService

DashboardService
```

Each service owns exactly one business domain.

---

# Service Responsibilities

Example

BuildingService

Responsible for

- Create Building
- Update Building
- Delete Building
- Building Statistics
- Building Validation

Nothing else.

---

TenantService

Responsible for

- Add Tenant
- Update Tenant
- Remove Tenant
- Tenant History
- Bed Assignment

Not responsible for

Payments.

---

PaymentService

Responsible for

- Rent Collection
- Receipts
- Payment History
- Outstanding Payments

Not responsible for

Tenant Details.

---

# Service Communication

Services may communicate with other Services.

Example

```text
PaymentService

↓

TenantService

↓

NotificationService
```

This is allowed.

However,

Services should never become tightly coupled.

Communication should remain intentional.

---

# Service Rules

Every Service should

- Own one business responsibility
- Be reusable
- Be testable
- Be predictable

Every Service should expose clear methods.

Example

```text
createTenant()

updateTenant()

archiveTenant()

assignBed()
```

Avoid generic names like

```text
save()

update()

process()
```

Method names should clearly express intent.

---

# Business Rule Ownership

Example

Rule

One Bed

↓

One Active Tenant

This rule belongs inside

BedService

Not

UI.

---

Rule

Trial Expired

↓

Read Only

Belongs inside

SubscriptionService

---

Rule

Rent Paid

↓

Generate Receipt

↓

Update Financial Summary

↓

Notify User

Belongs inside

PaymentService

---

# Service Independence

Every Service should remain independently understandable.

Developers should understand any Service without reading the entire application.

---

# Error Handling

Services should return predictable results.

Example

Success

↓

Standard Success Response

Failure

↓

Standard Error Response

Never return inconsistent data structures.

---

# Validation

Validation belongs inside Services.

Never trust UI validation.

Example

UI

↓

Basic User Feedback

Service

↓

Business Validation

---

# Why This Architecture Was Chosen

Centralized business logic provides

- Better maintainability
- Better testing
- Better scalability
- Easier AI code generation
- Easier security
- Lower duplication
- Predictable architecture

Every business rule exists only once.

---

# Alternatives Considered

Business Logic Inside Components

Rejected

Reason

Poor maintainability.

---

Business Logic Inside Firebase

Rejected

Reason

Frontend becomes thin but backend becomes monolithic.

---

Massive Global Service

Rejected

Reason

Violates Single Responsibility Principle.

Creates God Objects.

---

# Trade-offs

Advantages

- Cleaner UI
- Better testing
- Easier debugging
- Better scalability

Trade-offs

- More files
- More architectural discipline

These trade-offs are acceptable.

---

# Performance Considerations

Services should

- Prevent duplicate queries
- Reuse existing data
- Minimize Firestore operations
- Batch related operations where appropriate

Efficient Services reduce cloud costs.

---

# Security Considerations

The Service Layer acts as the first architectural security boundary.

Future authorization checks can be added here without changing UI components.

Security enforcement will become progressively stricter during later phases.

---

# Cloud Cost Considerations

A properly designed Service Layer reduces

- Duplicate Reads
- Duplicate Writes
- Duplicate Queries
- Duplicate Cloud Function calls

Efficient architecture directly lowers infrastructure costs.

---

# Scalability Strategy

The Service Layer should comfortably support

- Thousands of Buildings
- Hundreds of thousands of Tenants
- Millions of records

without requiring redesign.

Future business modules should simply introduce new Services.

---

# Future Expansion

Example

Visitor Management

↓

VisitorService

Inventory

↓

InventoryService

Parking

↓

ParkingService

No existing Service should require modification unless its own business domain changes.

---

# Things We Explicitly Avoid

- God Services
- Business Logic inside Components
- Business Logic inside Firebase Config
- Duplicate Validation
- Circular Service Dependencies
- Generic Utility Services

---

# Red Flag Checklist

Before creating a Service ask

- Does this own one business domain?
- Does this duplicate another Service?
- Can another developer understand it quickly?
- Does it expose clear methods?
- Does it contain unrelated logic?
- Can it be tested independently?

If any answer is No,

reconsider the design.

---

# Principal Architect Review

Architecture Evaluation

Maintainability

★★★★★

Scalability

★★★★★

Performance

★★★★★

Security

★★★★★

Cloud Cost

★★★★★

Developer Experience

★★★★★

Overall Recommendation

APPROVED

---

# Final Architecture Decision

TenoPilot adopts a dedicated Service Layer.

Every business operation must pass through the Service Layer.

Business logic shall never exist inside UI Components.

Services own business rules.

Components own presentation.

This architectural boundary is permanently LOCKED.

---

# Architecture Status

Status

APPROVED

Version

1.0

Architecture

LOCKED
