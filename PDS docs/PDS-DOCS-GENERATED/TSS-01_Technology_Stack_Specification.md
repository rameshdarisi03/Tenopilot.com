# TSS-01 — Technology Stack Specification

## Version

Version: 1.0

Status: LOCKED

---

# Objective

This document defines the official technology stack for TenoPilot.

Every technology selected for this project has been carefully evaluated based on:

- Scalability
- Maintainability
- Performance
- Security
- Cloud Cost
- Developer Experience
- Community Support
- Long-Term Sustainability

This document serves as the single source of truth for all technology decisions.

No technology should be introduced into the project unless it aligns with the engineering principles established in EPS-01.

---

# Business Context

TenoPilot is a SaaS Rental Operating System designed for:

- PG Owners
- Hostel Owners
- Co-living Spaces
- Student Housing
- Small Rental Buildings

The platform is expected to scale comfortably beyond 2,000 buildings while remaining simple to maintain and affordable to operate.

Our engineering philosophy prioritizes:

- Simplicity
- Maintainability
- Scalability
- Performance
- Security
- Low Operational Cost

---

# Technology Selection Criteria

Every technology introduced into TenoPilot must satisfy the following:

- Solves a real business problem
- Production proven
- Strong community support
- Excellent documentation
- Low operational complexity
- Easy onboarding for future developers
- Compatible with our architecture
- Cost effective
- Supports long-term scalability

Technologies that fail these criteria should not be adopted.

---

# Approved Technology Stack

---

# Frontend Framework

Technology

Next.js (App Router)

Purpose

Frontend Application

---

## Why This Technology Was Chosen

- Excellent SEO support
- Server Components
- Client Components when required
- Excellent Vercel integration
- High performance
- Mature ecosystem
- Long-term support
- Ideal for SaaS applications

---

## Alternatives Considered

React + Vite

---

## Why Rejected

- Additional SSR implementation required
- Inferior SEO workflow
- More setup required
- Less opinionated architecture

---

## Trade-offs

Advantages

- Excellent developer experience
- Outstanding performance
- Built-in routing
- Server-side rendering
- Static generation
- Metadata API

Trade-offs

- Slight learning curve
- App Router requires architectural discipline

---

Decision

APPROVED

Status

LOCKED

---

# Programming Language

Technology

TypeScript

Purpose

Application Development

---

## Why Chosen

- Static typing
- Better maintainability
- Fewer runtime bugs
- Excellent IDE support
- Industry standard

---

## Alternatives

JavaScript

---

## Why Rejected

- Higher risk of runtime errors
- Difficult maintenance as project grows

---

Decision

APPROVED

Status

LOCKED

---

# Styling

Technology

Tailwind CSS

Purpose

Application Styling

---

## Why Chosen

- Fast development
- Consistent design
- Excellent responsive utilities
- Easy maintenance
- Industry adoption

---

Decision

APPROVED

Status

LOCKED

---

# UI Component Library

Technology

shadcn/ui

Purpose

Reusable Components

---

## Why Chosen

- Accessible components
- Modern design
- Fully customizable
- No vendor lock-in
- Production ready

---

Decision

APPROVED

Status

LOCKED

---

# Authentication

Technology

Firebase Authentication

Purpose

User Authentication

---

## Why Chosen

- Google Login support
- Secure authentication
- Minimal maintenance
- Tight Firebase integration
- Automatic scaling

---

## Alternatives

Custom Authentication

---

## Why Rejected

- Increased complexity
- Higher maintenance
- Additional security risks

---

Decision

APPROVED

Status

LOCKED

---

# Database

Technology

Cloud Firestore

Purpose

Primary Database

---

## Why Chosen

- Serverless
- Automatic scaling
- Real-time capabilities
- Tight Firebase integration
- Excellent developer experience
- Low operational overhead

---

## Alternatives

PostgreSQL

MongoDB

Supabase

---

## Why Rejected

Current business requirements do not justify the additional operational complexity.

Firestore provides excellent scalability while significantly reducing infrastructure management.

---

## Trade-offs

Advantages

- Automatic scaling
- No server maintenance
- Excellent SDK
- Strong security model

Trade-offs

- Query modelling requires planning
- Relational queries require different thinking

These trade-offs are acceptable for TenoPilot.

---

Decision

APPROVED

Status

LOCKED

---

# File Storage

Technology

Firebase Storage

Purpose

Documents

Images

Attachments

---

## Why Chosen

- Tight Firebase integration
- Secure
- Scalable
- Simple API

---

Decision

APPROVED

Status

LOCKED

---

# Backend

Technology

Firebase Cloud Functions

Purpose

Business Logic

---

## Why Chosen

- Serverless
- Automatic scaling
- No server management
- Secure backend execution
- Perfect for SaaS workloads

---

## Responsibilities

- Subscription Validation
- Report Generation
- Notifications
- Payment Processing
- Email Processing
- Scheduled Jobs

---

Decision

APPROVED

Status

LOCKED

---

# Hosting

Technology

Vercel

Purpose

Frontend Hosting

---

## Why Chosen

- Native Next.js support
- Global CDN
- Fast deployments
- Preview deployments
- Excellent developer experience

---

Decision

APPROVED

Status

LOCKED

---

# State Management

Technology

Zustand

Purpose

Global UI State

---

## Why Chosen

- Lightweight
- Minimal boilerplate
- Excellent TypeScript support
- Easy maintenance

---

Decision

APPROVED

Status

LOCKED

---

# Server State

Technology

TanStack Query

Purpose

API & Firestore Data Management

---

## Why Chosen

- Smart caching
- Background updates
- Reduced Firestore reads
- Excellent performance
- Better user experience

---

Decision

APPROVED

Status

LOCKED

---

# Forms

Technology

React Hook Form

Purpose

Form Management

---

## Why Chosen

- Excellent performance
- Minimal re-renders
- Easy validation
- Production proven

---

Decision

APPROVED

Status

LOCKED

---

# Validation

Technology

Zod

Purpose

Schema Validation

---

## Why Chosen

- Type-safe validation
- Shared validation logic
- Excellent TypeScript support

---

Decision

APPROVED

Status

LOCKED

---

# Email Service

Technology

Resend

Purpose

Transactional Emails

---

## Why Chosen

- Modern API
- Excellent developer experience
- Suitable free tier
- Reliable delivery

---

Decision

APPROVED

Status

LOCKED

---

# Payments

Technology

Razorpay

Purpose

Subscription Payments

---

## Why Chosen

- Excellent India support
- Subscription billing
- Mature ecosystem
- Secure payment infrastructure

---

Decision

APPROVED

Status

LOCKED

---

# Error Monitoring

Technology

Sentry

Purpose

Production Error Monitoring

---

## Why Chosen

- Detailed stack traces
- Faster debugging
- Production monitoring
- Mature platform

---

Decision

APPROVED

Status

LOCKED

---

# Product Analytics

Technology

PostHog

Purpose

Product Analytics

---

## Why Chosen

- Feature usage tracking
- User journey analysis
- Product insights
- Excellent developer tools

---

Decision

APPROVED

Status

LOCKED

---

# Report Generation

Technology

Puppeteer

Purpose

PDF Generation

---

Decision

APPROVED

Status

LOCKED

---

Technology

PapaParse

Purpose

CSV Export

---

Decision

APPROVED

Status

LOCKED

---

Technology

ExcelJS

Purpose

Excel Export (Future)

---

Decision

APPROVED

Status

Future Implementation

---

# Source Code Management

Technology

GitHub

Purpose

- Source Code Repository
- Version Control
- Collaboration
- Pull Request Reviews
- Release Management
- CI/CD Integration
- Issue Tracking (Future)

---

## Why This Technology Was Chosen

- Industry standard
- Excellent Git workflow
- Native integration with Vercel
- Excellent collaboration features
- Supports branch protection
- Excellent ecosystem
- Large community support

---

## Repository Strategy

The official GitHub repository serves as the single source of truth for the TenoPilot codebase.

All production code must be committed through Git.

Direct edits to the production branch are prohibited.

Development should follow a structured branching strategy.

---

Decision

APPROVED

Status

LOCKED

---

# Development Tools

- GitHub
- ESLint
- Prettier

Purpose

Code Quality

Consistency

Version Control

---

Decision

APPROVED

Status

LOCKED

---

# Technologies We Explicitly Avoid

The following technologies are intentionally excluded from V1.

- Kubernetes
- Docker Orchestration
- Microservices
- Kafka
- RabbitMQ
- Redis
- GraphQL
- PostgreSQL Hybrid Architecture
- Elasticsearch

---

## Why We Avoid Them

These technologies introduce unnecessary operational complexity for the current scale of TenoPilot.

Good architecture is preferred over unnecessary infrastructure.

These technologies may be reconsidered only when supported by measurable business requirements.

---

# Cloud Cost Considerations

Technology decisions should minimize:

- Firestore Reads
- Firestore Writes
- Cloud Function Invocations
- Storage Usage
- Bandwidth

Efficient architecture is expected to keep operational costs predictable as customer adoption grows.

---

# Scalability Strategy

The selected technology stack is expected to comfortably support:

- Thousands of organizations
- Thousands of buildings
- Hundreds of thousands of tenants
- Millions of documents

without major architectural changes.

Scaling should occur through good software design rather than additional infrastructure.

---

# Revisit Criteria

Technology decisions should only be reconsidered if:

- Business requirements fundamentally change
- Platform scale exceeds architectural assumptions
- Cloud costs become unreasonable
- A technology reaches end-of-life
- A significantly better alternative becomes production proven

Otherwise the stack remains unchanged.

---

# Principal Architect Review

Architecture Review

PASSED

Reason

- Mature technologies
- Excellent scalability
- Low maintenance
- Cost effective
- Excellent developer experience
- Strong community support
- Production proven
- Ideal for SaaS architecture

Approved for production development.

---

# Final Technology Decision

Technology Stack

APPROVED

Status

LOCKED

This document serves as the official technology reference for the TenoPilot platform.

Future development should strictly follow the technologies approved in this specification.
