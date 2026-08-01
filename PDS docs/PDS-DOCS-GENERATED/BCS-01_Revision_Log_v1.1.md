# BCS-01 Revision Log

## Version

Revision: 1.1

Status: APPROVED

Applies To:

- BCS-01 Business Context Specification

---

# Purpose

This document records business-level changes approved after the initial Business Context Specification (BCS-01).

These revisions supersede the corresponding sections in BCS-01 while keeping the original document intact.

All future architecture, design and implementation should follow the decisions documented here.

---

# Change 01

## Business Navigation Model

### Previous Decision

Users authenticated and entered the application through the Dashboard.

### Revised Decision

Users authenticate into the Home Workspace first.

The Home Workspace acts as the operational entry point of the application.

From there, users choose:

- Property Workspace
- Portfolio Workspace (All Properties)

The Dashboard is no longer the application's entry point.

---

# Change 02

## Workspace-Centric Architecture

TenoPilot officially adopts a Workspace-Centric business model.

Every authenticated session operates inside a Workspace.

Two Workspace types exist.

### Property Workspace

Represents one individual property.

Used for:

- Dashboard
- Property Setup
- Tenants
- Maintenance
- Financial Hub
- Reports
- Staff
- Settings

All data belongs only to the selected property.

---

### Portfolio Workspace

Represents all properties owned by the organization.

Used for:

- Portfolio Dashboard
- Consolidated Financial Hub
- Portfolio Reports
- Portfolio Tenant Directory
- Portfolio Maintenance Overview

Property configuration screens are unavailable in Portfolio Workspace.

---

# Change 03

## Revised User Journey

### First-Time User

1. Sign in using Google Authentication.
2. Create Organization.
3. Add the first Property.
4. Configure Floors, Rooms and Beds.
5. Begin onboarding tenants.
6. Start managing operations.

---

### Returning User

1. Login.
2. Open Home Workspace.
3. Select one of:

   - Property Workspace
   - Portfolio Workspace

4. Continue daily operations.

---

# Change 04

## Revised Business Workflow

Authentication

↓

Home Workspace

↓

Workspace Selection

↓

Property Workspace

OR

Portfolio Workspace

↓

Business Operations

↓

Reports

↓

Business Insights

---

# Change 05

## Workspace Philosophy

The application follows the natural working style of property owners.

Owners generally focus on operating one property at a time.

Whenever a complete business overview is required, they enter Portfolio Workspace.

This reduces cognitive load while still providing consolidated operational insights.

Workspace selection always occurs from the Home screen.

Business modules should never ask users to switch properties internally.

---

# Change 06

## Portfolio Mode Rules

Portfolio Workspace provides aggregated information across all properties.

Supported modules include:

- Dashboard
- Financial Hub
- Reports
- Tenant Directory
- Maintenance Overview

Modules requiring property-specific configuration remain unavailable.

Examples:

- Property Setup
- Floor Management
- Room Management
- Bed Configuration

These modules require a Property Workspace.

---

# Change 07

## Home Screen Responsibility

The Home screen becomes the operational hub of the application.

Responsibilities include:

- Display all properties
- Display Portfolio Workspace
- Add new Property
- Enter selected Workspace

The Home screen should not display operational dashboards.

Its only responsibility is Workspace selection.

---

# Change 08

## Active Workspace Principle

The selected Workspace remains active throughout the user session.

Every business module automatically operates within the current Workspace.

Users should never be required to repeatedly choose the same Property while navigating between modules.

Changing Workspace always occurs by returning to the Home screen.

---

# Change 09

## Updated Core Principles

The following principles replace the previous navigation philosophy.

- Home is the application's operational entry point.
- Every session begins with Workspace selection.
- One Workspace equals one operational context.
- Portfolio Workspace provides consolidated business insights.
- Property Workspace focuses on day-to-day operations.
- Navigation should remain simple enough for non-technical users.
- Workspace switching should be intentional rather than frequent.
- Operational simplicity takes priority over feature density.

---

# Impact Assessment

Business Model

Updated

Navigation

Updated

Architecture

No Change Required

Database Design

No Change Required

Backend Design

No Change Required

Security Model

No Change Required

Technology Stack

No Change Required

User Experience

Improved

Scalability

Improved

Maintainability

Improved

---

# Final Business Decision

TenoPilot officially adopts a Workspace-Centric business model.

Users begin every authenticated session from the Home Workspace and intentionally choose the operational context in which they wish to work.

This decision replaces the previous Dashboard-first navigation model and becomes the new business standard for all future specifications.

---

Status

APPROVED

Version

1.1

Business Decision

LOCKED
