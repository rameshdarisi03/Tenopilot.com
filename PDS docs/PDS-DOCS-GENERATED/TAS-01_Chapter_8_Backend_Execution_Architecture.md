# TAS-01 — Technical Architecture Specification

# Chapter 8 — Backend Execution Architecture

## Version

Version: 1.0

Status: APPROVED

---

# Objective

This chapter defines the Backend Execution Architecture for TenoPilot.

Its purpose is to establish where every operation should execute and which application layer is responsible for it.

The architecture ensures that sensitive operations execute securely on the server while lightweight operations remain efficient on the client.

Every business operation must follow the execution strategy defined in this document.

---

# Business Context

TenoPilot is a cloud-native SaaS platform built using:

- Next.js
- Firebase Authentication
- Firestore
- Firebase Storage
- Firebase Cloud Functions

The application must support thousands of organizations while remaining secure, responsive and cost-efficient.

Choosing the correct execution location is critical for long-term scalability.

---

# Scope

This chapter defines:

- Client execution
- Server execution
- Firestore communication
- Cloud Functions
- Secure operations
- Background jobs
- Report generation
- Import execution
- Notification execution

This chapter does NOT define:

- Database collections
- Security rules
- API contracts

These are covered in later specifications.

---

# Backend Execution Philosophy

Every operation should execute in the simplest location capable of performing it securely.

Never execute server-side operations in the browser.

Never execute lightweight operations in Cloud Functions without justification.

Choose the smallest execution boundary possible.

---

# Execution Layers

The application consists of six execution layers.

```text
Browser

↓

Feature Layer

↓

Service Layer

↓

Repository Layer

↓

Firebase Services

↓

Firestore / Storage
```

Some operations additionally execute through:

```text
Cloud Functions
```

when server-side execution is required.

---

# Execution Decision Rules

Before implementing any operation ask:

1.

Does it require secret credentials?

↓

Cloud Function

---

2.

Does it require payment verification?

↓

Cloud Function

---

3.

Does it generate reports?

↓

Cloud Function

---

4.

Does it process thousands of records?

↓

Cloud Function

---

5.

Is it a simple Firestore read?

↓

Repository

↓

Firestore

---

6.

Is it a standard CRUD operation?

↓

Repository

↓

Firestore

---

# Direct Firestore Operations

The following operations may execute directly through the Repository Layer.

Examples

- Read Buildings
- Read Tenants
- Read Complaints
- Read Reports
- Create Tenant
- Update Tenant
- Create Complaint
- Update Maintenance Status
- Update Staff
- Upload Documents

All operations remain protected by Firestore Security Rules.

---

# Cloud Function Operations

Cloud Functions are mandatory for:

- Razorpay Payment Verification
- Subscription Validation
- Report Generation
- Email Sending
- Scheduled Tasks
- Batch Imports
- WhatsApp Integration
- Backup Automation
- Portfolio Analytics
- Daily Summary Jobs

These operations should never execute inside the browser.

---

# Report Generation

Report execution flow.

```text
User

↓

Generate Report

↓

Cloud Function

↓

Fetch Data

↓

Generate PDF / CSV

↓

Temporary File

↓

Download

↓

Delete Temporary File
```

Reports should never be permanently stored unless explicitly requested by the user.

---

# Import Execution

Import workflow.

```text
CSV

↓

Upload

↓

Cloud Function

↓

Validation

↓

Preview

↓

Confirmation

↓

Batch Processing

↓

Firestore
```

Large imports should never execute entirely inside the browser.

---

# Notification Execution

Notification workflow.

```text
Business Event

↓

Cloud Function

↓

Notification Service

↓

Email

↓

WhatsApp

↓

Future Push Notification
```

The browser should never directly communicate with third-party notification providers.

---

# Subscription Enforcement

Every protected business action should verify subscription status.

Example

```text
Create Tenant

↓

Subscription Service

↓

Subscription Active?

↓

Yes

↓

Continue

↓

No

↓

Reject Operation
```

Read-only access remains available after subscription expiry.

---

# Background Jobs

Scheduled Cloud Functions are responsible for:

- Daily Analytics
- Subscription Expiry Checks
- Reminder Notifications
- Backup Operations
- Future Scheduled Reports

Background processing should never rely on active user sessions.

---

# Execution Matrix

| Operation | Direct Firestore | Cloud Function | Reason |
|------------|------------------|----------------|--------|
| Read Dashboard Data | ✅ | ❌ | Lightweight read |
| Read Tenant Data | ✅ | ❌ | Standard query |
| Create Tenant | ✅ | ❌ | Protected by Security Rules |
| Update Tenant | ✅ | ❌ | Standard CRUD |
| Delete Tenant | ✅ | ❌ | Repository controlled |
| Upload Documents | ✅ | ❌ | Firebase Storage |
| Generate Reports | ❌ | ✅ | Heavy processing |
| Export PDF | ❌ | ✅ | Server-side generation |
| Export CSV | ❌ | ✅ | Large dataset processing |
| Verify Razorpay Payment | ❌ | ✅ | Secret credentials |
| Send Email | ❌ | ✅ | API keys required |
| WhatsApp Notification | ❌ | ✅ | Secure integration |
| Batch Import | ❌ | ✅ | High-volume processing |
| Subscription Validation | ❌ | ✅ | Prevent client manipulation |
| Daily Scheduled Jobs | ❌ | ✅ | Automated execution |

---

# Why This Architecture Was Chosen

This execution model provides:

- Strong security
- Low cloud costs
- Better scalability
- Clear responsibility boundaries
- Better maintainability
- Easier testing
- Faster client performance

Each operation executes in its most appropriate location.

---

# Alternatives Considered

## Everything Through Cloud Functions

Rejected

Reason

Higher cloud costs.

Slower response times.

Unnecessary complexity.

---

## Everything Directly From Browser

Rejected

Reason

Poor security.

Secret exposure.

Business rule manipulation.

---

## Mixed Without Standards

Rejected

Reason

Inconsistent architecture.

Difficult maintenance.

---

# Trade-offs

Advantages

- Predictable execution
- Better performance
- Stronger security
- Lower infrastructure cost
- Easier debugging

Trade-offs

- Requires clear architectural discipline
- Some operations involve additional server execution

These trade-offs are acceptable.

---

# Performance Considerations

The execution strategy should:

- Minimize Cloud Function invocations
- Minimize Firestore reads
- Batch expensive operations
- Execute lightweight operations directly
- Avoid unnecessary network requests

---

# Security Considerations

Sensitive operations must never execute exclusively on the client.

Examples

- Payment verification
- Subscription validation
- Email sending
- Report generation
- Notification processing

Secrets must never be exposed to the browser.

---

# Cloud Cost Considerations

Cloud Functions should only be used when they provide measurable value.

Avoid unnecessary server execution.

Simple CRUD operations should remain direct Firestore operations whenever safely possible.

---

# Scalability Strategy

The execution architecture should comfortably support:

- Thousands of organizations
- Millions of documents
- Concurrent users
- Large report generation
- High-volume imports

without architectural redesign.

---

# Future Expansion

Future integrations should follow the same execution model.

Examples

- AI Recommendations
- OCR Document Processing
- Voice Assistant
- Smart Analytics
- Predictive Occupancy

All should execute through dedicated Cloud Functions where server-side processing is required.

---

# Things We Explicitly Avoid

- Secret API keys in the browser
- Payment verification on the client
- Massive browser-side processing
- Direct third-party integrations from UI
- Business rule enforcement in components
- Unnecessary Cloud Function usage

---

# Red Flag Checklist

Before implementing a new operation ask:

- Does this require secret credentials?
- Is server-side validation required?
- Can this execute safely on the client?
- Is Cloud Function actually necessary?
- Can Firestore handle this directly?
- Does this increase cloud cost unnecessarily?

If uncertain, review the execution strategy before implementation.

---

# Principal Architect Review

Architecture Evaluation

Security

★★★★★

Performance

★★★★★

Scalability

★★★★★

Cloud Cost

★★★★★

Maintainability

★★★★★

Developer Experience

★★★★★

Overall Recommendation

APPROVED

---

# Final Architecture Decision

TenoPilot adopts a hybrid backend execution architecture.

Simple CRUD operations execute directly through the Repository Layer using Firestore.

Sensitive, computationally expensive and integration-based operations execute through Firebase Cloud Functions.

Every future backend feature must follow this execution model.

---

# Architecture Status

Status

APPROVED

Version

1.0

Architecture

LOCKED
