# TAS-07 Revision Log

## Version

Revision: 1.1

Status: APPROVED

Applies To:

- TAS-01 Chapter 7 – Routing & Navigation Architecture

---

# Purpose

This revision updates the routing architecture to align with the approved Workspace-Centric business model.

The application no longer uses "Building Context" as the primary navigation concept.

Instead, every authenticated session operates within a Workspace.

---

# Change 01

## Terminology Update

Replace all occurrences of:

- Building Context

With:

- Workspace Context

---

# Change 02

## Workspace Definition

Every authenticated session operates inside an Active Workspace.

A Workspace represents the operational context of the application.

Two Workspace types are officially supported.

### Property Workspace

Represents one individual property.

All operational modules work only with data belonging to the selected property.

---

### Portfolio Workspace

Represents all properties owned by the organization.

Provides consolidated operational and analytical information across every property.

---

# Change 03

## Authentication Flow

Replace the previous authentication flow with:

Application Launch

↓

Landing Page

↓

Google Authentication

↓

Home Workspace

↓

Select Workspace

↓

Property Workspace

OR

Portfolio Workspace

↓

Dashboard

---

# Change 04

## Home Screen Responsibilities

The Home screen becomes the application's Workspace Selector.

Responsibilities include:

- Display all registered properties
- Display Portfolio Workspace
- Add Property
- Open selected Workspace

The Home screen does not display operational dashboards.

---

# Change 05

## Property Workspace Rules

Property Workspace enables access to:

- Dashboard
- Property Setup
- Tenants
- Financial Hub
- Maintenance
- Reports
- Staff
- Settings

All data displayed belongs only to the selected property.

---

# Change 06

## Portfolio Workspace Rules

Portfolio Workspace provides aggregated information across all properties.

Supported modules:

- Portfolio Dashboard
- Portfolio Financial Hub
- Portfolio Reports
- Portfolio Tenant Directory
- Portfolio Maintenance Overview

Modules requiring a specific property's configuration are unavailable.

Examples:

- Property Setup
- Floor Management
- Room Management
- Bed Management

These require a Property Workspace.

---

# Change 07

## Active Workspace Principle

The selected Workspace remains active throughout the session.

Every business module automatically uses the currently active Workspace.

Users are never asked to repeatedly select a property while navigating between modules.

Workspace changes occur only from the Home screen.

---

# Change 08

## Navigation Philosophy

Navigation should remain intentionally simple.

Users always know:

- Which Workspace is active
- What data they are viewing
- How to return to the Home screen
- How to switch to another Workspace

Workspace switching should be an intentional action rather than an always-visible control.

---

# Change 09

## Route Philosophy

The application has a single operational entry point after authentication.

Authentication

↓

Home Workspace

↓

Workspace Selection

↓

Business Modules

This replaces the previous Dashboard-first navigation model.

---

# Change 10

## Final Routing Decision

TenoPilot officially adopts a Workspace-Centric Routing Architecture.

Home is the operational entry point.

Users intentionally choose their Workspace before performing business operations.

This routing model becomes the standard for all future architectural and development decisions.

---

Status

APPROVED

Version

1.1

Architecture Decision

LOCKED
