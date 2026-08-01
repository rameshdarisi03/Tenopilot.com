# TAS-01 — Technical Architecture Specification

# Chapter 9 — Environment Configuration Architecture

## Version

Version: 1.0

Status: DRAFT

---

# Objective

This chapter defines the official environment configuration strategy for TenoPilot.

The objective is to ensure that development, testing and production environments remain isolated, secure and predictable throughout the application's lifecycle.

Every deployment must follow the environment architecture defined in this specification.

---

# Business Context

TenoPilot is a production SaaS platform.

The application will evolve through multiple environments before reaching customers.

Proper environment separation prevents accidental data loss, improves testing quality and strengthens operational security.

---

# Scope

This chapter defines:

- Environment architecture
- Environment separation
- Environment variables
- Secret management
- Configuration strategy
- Deployment environments

This chapter does NOT define:

- CI/CD Pipelines
- Infrastructure Automation
- Monitoring

These are covered in later specifications.

---

# Environment Philosophy

Every environment must have a clearly defined purpose.

Development should never affect production.

Production should never expose development resources.

Configuration must be environment-driven rather than hardcoded.

---

# Official Environments

TenoPilot officially supports three environments.

Development

Staging

Production

No additional environments should be introduced without architectural review.

---

# Development Environment

Purpose

Local development.

Characteristics

- Local development server
- Firebase Development Project
- Test Data
- Debug Logging Enabled
- Fast iteration
- Hot Reload

Development exists only for engineers.

No production customers should access this environment.

---

# Staging Environment

Purpose

Pre-production validation.

Characteristics

- Production-like configuration
- Test payment gateway
- Test email service
- Production build
- Final QA testing

Staging should mirror Production as closely as possible.

No real customer data should exist here.

---

# Production Environment

Purpose

Customer-facing application.

Characteristics

- Live Firebase Project
- Live Razorpay
- Live Email Service
- Production Logging
- Monitoring Enabled
- Performance Optimized

Only stable and approved releases should reach Production.

---

# Environment Variables

All configuration must be provided through environment variables.

Never hardcode:

- Firebase Keys
- API URLs
- Third-party credentials
- Service endpoints
- Feature flags

Configuration should change without modifying application code.

---

# Environment Variable Categories

## Public Variables

Accessible by the browser.

Examples

- Firebase Client Configuration
- Public Application URL
- Public Feature Flags

Only values safe for public exposure belong here.

---

## Server Variables

Accessible only on the server.

Examples

- Razorpay Secret
- Resend API Key
- Internal Service Tokens
- Admin SDK Credentials

Server variables must never reach client-side code.

---

# Secret Management

Sensitive credentials must remain outside the codebase.

Examples

- API Secrets
- Payment Credentials
- Email Credentials
- Firebase Admin Credentials

Secrets should be stored using secure platform environment management.

Never commit secrets to GitHub.

---

# Firebase Projects

Each environment should use its own Firebase project.

Development

↓

Firebase Development

Staging

↓

Firebase Staging

Production

↓

Firebase Production

Cross-environment data sharing is prohibited.

---

# Deployment Strategy

Development

↓

Local Testing

↓

GitHub

↓

Vercel Preview Deployment

↓

Staging Validation

↓

Production Release

Every production deployment should originate from version-controlled code.

---

# Configuration Ownership

Configuration belongs to the environment.

Business logic should never determine configuration values.

Example

Good

Environment Variable

↓

Application

Bad

if (production) ...

Hardcoded environment checks should be avoided.

---

# Feature Flags

Feature availability should be configurable.

Examples

- AI Features
- Beta Modules
- Experimental Reports

Feature Flags should be controlled through configuration rather than source code modifications.

---

# Logging Strategy

Development

Verbose

Staging

Detailed

Production

Meaningful

Sensitive information should never appear in production logs.

---

# Why This Architecture Was Chosen

This environment strategy provides:

- Safe deployments
- Better testing
- Reduced production risk
- Cleaner configuration
- Easier maintenance
- Improved security

Environment behavior becomes predictable.

---

# Alternatives Considered

## Single Environment

Rejected

Reason

Development risks production data.

Poor testing.

---

## Hardcoded Configuration

Rejected

Reason

Difficult maintenance.

Unsafe deployments.

---

## Shared Firebase Project

Rejected

Reason

Risk of accidental production data modification.

---

# Trade-offs

Advantages

- Safer deployments
- Better testing
- Improved security
- Predictable configuration

Trade-offs

- Additional setup effort
- Multiple Firebase projects

These trade-offs are acceptable.

---

# Performance Considerations

Environment configuration should never affect runtime performance.

Configuration should be resolved during application startup.

---

# Security Considerations

Production secrets must never exist:

- Inside source code
- Inside GitHub
- Inside browser bundles

Secrets remain server-side only.

---

# Cloud Cost Considerations

Development and Staging environments should use free-tier resources whenever practical.

Production resources should scale according to business demand.

Environment separation prevents unnecessary production costs during development.

---

# Scalability Strategy

The environment architecture should support:

- Multiple developers
- Multiple deployments
- Safe feature testing
- Future infrastructure growth

without requiring architectural changes.

---

# Things We Explicitly Avoid

- Hardcoded configuration
- Shared production credentials
- Production testing
- Secrets inside source code
- Environment-specific business logic

---

# Red Flag Checklist

Before introducing configuration ask:

- Can this be an environment variable?
- Is this secret?
- Should the browser know this?
- Does this belong only on the server?
- Will changing this require code changes?

If yes, redesign the configuration.

---

# Principal Architect Review

Architecture Evaluation

Security

★★★★★

Maintainability

★★★★★

Deployment Safety

★★★★★

Scalability

★★★★★

Developer Experience

★★★★★

Overall Recommendation

APPROVED

---

# Final Architecture Decision

TenoPilot adopts a three-environment deployment strategy.

Development, Staging and Production remain completely isolated.

All configuration is environment-driven.

Secrets remain server-side.

This environment architecture is permanently LOCKED.

---

# Architecture Status

Status

APPROVED

Version

1.0

Architecture

LOCKED
