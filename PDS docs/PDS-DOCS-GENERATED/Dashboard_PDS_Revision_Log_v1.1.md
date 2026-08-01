# Dashboard PDS Revision Log

## Version

Revision: 1.1

Status: APPROVED

Applies To:

- Dashboard Product Design Specification (PDS)

---

# Purpose

This revision aligns the Dashboard with the approved Workspace-Centric business model.

The Dashboard is no longer the application's entry point.

Instead, it functions as the operational overview for the currently selected Workspace.

---

# Change 01

## Dashboard Responsibility

### Previous

The Dashboard served as the primary landing page after user authentication.

### Revised

The Dashboard is the operational overview of the currently selected Workspace.

Users always arrive at the Dashboard only after selecting a Workspace from the Home screen.

---

# Change 02

## Workspace Awareness

The Dashboard automatically adapts to the active Workspace.

Two Workspace types are supported.

### Property Workspace

Displays operational information for one selected property.

Examples:

- Occupancy
- Vacancies
- Rent Collection
- Pending Payments
- Maintenance Requests
- Recent Activities

All information belongs only to the selected property.

---

### Portfolio Workspace

Displays consolidated operational information across all properties.

Examples:

- Total Occupancy
- Portfolio Revenue
- Total Vacancies
- Overall Collection Rate
- Upcoming Move-outs
- Open Maintenance Requests
- Portfolio Insights

All metrics are aggregated across every registered property.

---

# Change 03

## Dashboard Scope

The Dashboard is responsible for providing operational insights only.

It is not responsible for:

- Property Configuration
- Floor Configuration
- Room Configuration
- Bed Configuration

These operations belong to dedicated management modules.

---

# Change 04

## Navigation Rules

The Dashboard should never request the user to choose another property.

Workspace selection always occurs from the Home screen.

If users wish to operate on another property, they return to Home and select another Workspace.

---

# Change 05

## Context Persistence

The selected Workspace remains active throughout the session.

Every dashboard widget automatically displays information belonging to the active Workspace.

The Dashboard should never ask users to repeatedly confirm or reselect the current Workspace.

---

# Change 06

## Portfolio Restrictions

Portfolio Workspace provides business insights only.

Configuration modules remain unavailable.

Examples:

Unavailable:

- Property Setup
- Floor Management
- Room Management
- Bed Management

Available:

- Dashboard
- Financial Hub
- Reports
- Tenant Directory
- Maintenance Overview

---

# Change 07

## User Experience Principles

The Dashboard should answer the following questions immediately:

- How is my business performing today?
- What requires my attention?
- What actions are pending?
- Are there vacant beds?
- Are rents being collected?
- Are maintenance issues increasing?

The Dashboard should focus on operational awareness rather than configuration.

---

# Change 08

## Dashboard Philosophy

The Dashboard is designed for quick decision-making.

Users should understand the health of their property or portfolio within a few seconds of opening the page.

Operational insights should always take priority over administrative controls.

---

# Impact Assessment

Navigation

Updated

Business Logic

No Change

Database

No Change

Backend

No Change

Architecture

No Change

User Experience

Improved

Scalability

Improved

---

# Final Dashboard Decision

The Dashboard serves as the operational command center for the active Workspace.

It is no longer the application's entry point.

Workspace selection is handled exclusively by the Home screen.

This behavior becomes the official Dashboard standard for all future development.

---

Status

APPROVED

Version

1.1

Product Decision

LOCKED
