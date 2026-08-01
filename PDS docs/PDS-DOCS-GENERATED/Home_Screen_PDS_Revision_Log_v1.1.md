# Home Screen PDS Revision Log

## Version

Revision: 1.1

Status: APPROVED

Applies To:

- Home Screen Product Design Specification (PDS)

---

# Purpose

This revision updates the Home Screen to align with the approved Workspace-Centric architecture.

The Home Screen is the operational entry point after user authentication.

Its only responsibility is helping users choose the workspace they wish to operate in.

---

# Change 01

## Home Screen Responsibility

The Home Screen acts as the Workspace Selector for the application.

It is responsible for:

- Displaying all registered properties
- Displaying the Portfolio Workspace
- Creating new properties
- Opening the selected workspace

The Home Screen does not display operational dashboards or business metrics.

---

# Change 02

## Workspace Types

The Home Screen provides access to two official workspace types.

### Property Workspace

Represents one individual property.

Selecting a property opens its complete operational workspace.

Examples:

- Dashboard
- Property Setup
- Tenants
- Financial Hub
- Maintenance
- Reports
- Staff
- Settings

---

### Portfolio Workspace

Represents all registered properties.

Selecting Portfolio Workspace opens consolidated business insights across every property.

Examples:

- Portfolio Dashboard
- Portfolio Financial Hub
- Portfolio Reports
- Portfolio Tenant Directory
- Portfolio Maintenance Overview

---

# Change 03

## Home Screen Layout

The Home Screen should contain:

### Welcome Section

Display:

- User Name
- Organization Name

Purpose:

Provide a friendly entry point into the application.

---

### Portfolio Workspace Card

Displayed at the top of the property list.

Purpose:

Provide quick access to consolidated business insights.

This card should be visually distinguished from individual property cards.

---

### Property Cards

Display one card for each registered property.

Each card should display:

- Property Name
- Property Address
- Occupancy Percentage
- Vacant Beds
- Active Tenants
- Monthly Collection Status

Primary Action:

Manage Property

Selecting the card opens the Property Workspace.

---

### Add Property Card

Always displayed after the property list.

Purpose:

Create a new property.

---

# Change 04

## Property Card Philosophy

Each property card should provide enough operational information for owners to identify the correct property immediately.

Cards should remain clean and uncluttered.

Avoid displaying excessive operational statistics.

The purpose is selection, not analysis.

---

# Change 05

## Portfolio Card Philosophy

Portfolio Workspace is intended for owners managing multiple properties.

The Portfolio card should communicate that it provides consolidated insights rather than property configuration.

Suggested content includes:

- Total Properties
- Total Occupancy
- Total Active Tenants

Avoid displaying detailed operational metrics.

---

# Change 06

## Navigation Rules

Selecting a Property Card opens the corresponding Property Workspace.

Selecting the Portfolio Card opens the Portfolio Workspace.

Workspace switching always begins from the Home Screen.

The application should never ask users to switch workspaces from within business modules.

---

# Change 07

## User Experience Principles

The Home Screen should answer three questions immediately.

1.

Which property do I want to work on?

2.

Do I want to see my overall business?

3.

Do I need to add another property?

Nothing else should distract the user.

---

# Change 08

## Simplicity Principles

The Home Screen should remain intentionally minimal.

Avoid:

- Dashboard widgets
- Financial charts
- Large analytics panels
- Activity feeds
- Notifications
- Configuration controls

Operational work begins only after entering a Workspace.

---

# Change 09

## Scalability Principles

The Home Screen should comfortably support organizations operating:

- One Property
- Five Properties
- Fifty Properties
- Hundreds of Properties

The layout should scale naturally without changing the navigation model.

Future enhancements such as search, filtering and sorting may be added without changing the overall architecture.

---

# Change 10

## Home Screen Philosophy

The Home Screen is not an operational workspace.

It is a decision screen.

Its responsibility is helping users choose where they want to work.

Once a workspace is selected, the Home Screen's responsibility ends.

---

# Impact Assessment

Navigation

Updated

Architecture

No Change

Database

No Change

Backend

No Change

Business Logic

No Change

User Experience

Significantly Improved

Scalability

Improved

---

# Final Home Screen Decision

The Home Screen becomes the official Workspace Selector for TenoPilot.

Every authenticated session begins here.

Users intentionally choose either:

- Property Workspace
- Portfolio Workspace

before performing any business operation.

This behavior becomes the official navigation standard for all future development.

---

Status

APPROVED

Version

1.1

Product Decision

LOCKED
