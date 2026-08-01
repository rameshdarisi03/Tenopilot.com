# Architecture Decision Record 001
# Enterprise Architecture Refinements

**Document ID:** ADR-001

**Version:** 1.0

**Status:** Accepted

---

# Purpose

This document records architectural refinements identified during the architecture review process.

These refinements strengthen scalability, reliability, security and operational resilience without modifying the existing business architecture defined in the DDS, TAS, TSS, PDS and FIN documents.

Business architecture remains unchanged.

---

# ADR-001
## Monthly Financial Snapshots

### Decision

Introduce immutable monthly financial snapshot documents.

Monthly snapshots contain pre-calculated financial summaries for completed accounting periods.

Examples

• Revenue Summary

• Expense Summary

• Net Profit

• Partner Settlement

• Outstanding Receivables

---

### Reason

Reading thousands of historical financial events directly from Firestore becomes increasingly expensive as organizations grow.

Monthly snapshots significantly reduce Firestore document reads while preserving the event-driven architecture.

Operational events remain the source of truth.

Snapshots act as optimized read models only.

---

# ADR-002
## Selective Real-Time Firestore Listeners

### Decision

Use Firestore realtime listeners only for operational modules requiring live synchronization.

Examples

• Floor Navigation

• Bed Allocation

• Tenant Directory

• Active Occupancy

Administrative modules continue using repository caching.

---

### Reason

Not every screen requires realtime synchronization.

Selective realtime updates reduce Firestore costs while ensuring operational consistency for concurrent users.

---

# ADR-003
## Personal Data Anonymization Policy

### Decision

Historical business records remain preserved.

Personally identifiable information may be anonymized after the legally required retention period.

Examples

• Name

• Mobile Number

• Aadhaar

• Profile Photo

Financial history and operational reports remain preserved.

---

### Reason

Supports future compliance with privacy regulations while maintaining financial audit history.

---

# ADR-004
## Critical Business Operations

### Decision

Critical multi-entity business operations execute through trusted backend services.

Examples

• Tenant Onboarding

• Guest Onboarding

• Room Transfers

• Booking Cancellation

• Settlement Finalization

Simple CRUD operations may continue using direct Firestore access.

---

### Reason

Critical workflows modify multiple business entities simultaneously.

Backend orchestration guarantees transactional consistency and prevents invalid business states.

---

# ADR-005
## Offline-First Mobile Experience

### Decision

Enable Firestore Offline Persistence for mobile and web clients.

Operational changes should synchronize automatically once connectivity is restored.

---

### Reason

Many PG owners operate in environments with intermittent internet connectivity.

Offline capability improves reliability without changing business workflows.

---

# ADR-006
## PDF Generation Strategy

### Decision

Use lightweight client-side document generation where appropriate.

Reserve Puppeteer-based server rendering for complex multi-page documents and reports.

---

### Reason

Reduces serverless cold starts, execution costs and infrastructure overhead while maintaining high-quality document generation.

---

# ADR-007
## Firestore Transaction Strategy

### Decision

Operations affecting multiple business entities must execute atomically.

Examples

• Occupant Creation

• Bed Allocation

• Room Transfer

• Booking Confirmation

• Occupancy Updates

---

### Reason

Prevents partial updates that could leave business data in an inconsistent state.

Business operations should either complete successfully or not execute at all.

---

# ADR-008
## Search Scalability

### Decision

Firestore indexes remain the primary search mechanism for MVP.

Future enterprise deployments may integrate dedicated search services when operational scale requires advanced searching.

Examples

• Occupant Search

• Global Search

• Property Search

---

### Reason

Keeps MVP infrastructure simple while allowing future scalability without redesigning business domains.

---

# Design Principles

These architectural refinements:

- Do not modify existing business domains.
- Do not change business workflows.
- Do not affect user experience.
- Improve scalability and operational reliability.
- Preserve the Single Source of Truth philosophy.
- Remain fully compatible with existing DDS, TAS, TSS, PDS and FIN documents.

---

# Conclusion

These Architecture Decision Records strengthen the implementation architecture while preserving the business architecture already established within TenoPilot.

Future implementation should follow these decisions unless superseded by a later ADR.

---
