# DDS Chapter 02
# Organization Domain

**Document ID:** DDS-02

**Version:** 1.0

**Status:** Approved

---

# Purpose

The Organization Domain represents the highest level of ownership within TenoPilot.

Every business entity in the system belongs to exactly one Organization.

The Organization acts as the root container for all operational data including properties, occupants, finances, staff, settings, and reports.

No business data should exist outside an Organization.

---

# Organization Responsibilities

The Organization is responsible for:

• Business Identity

• Subscription Management

• User Management

• Property Ownership

• Financial Configuration

• Global Settings

• Security Configuration

• Business Preferences

---

# Organization Hierarchy

Every business entity follows the same ownership hierarchy.

Organization

↓

Properties

↓

Rooms

↓

Beds

↓

Occupants

↓

Financial Records

↓

Reports

Every record in the database must always belong to one Organization.

---

# Organization Identity

Every Organization maintains a unique business identity.

Typical information includes:

• Organization Name

• Business Logo

• Primary Contact Number

• Business Email

• GST Number (Optional)

• Business Registration Details (Optional)

• Time Zone

• Currency

This information represents the organization rather than individual properties.

---

# Subscription Ownership

Subscriptions belong to the Organization.

Examples

Starter Plan

Professional Plan

Enterprise Plan

Subscription determines system capabilities but does not alter business workflows.

Subscription information should never be duplicated elsewhere.

---

# User Ownership

Every application user belongs to exactly one Organization.

Examples

Owner

Admin

Manager

Receptionist

Future user roles should extend the Organization without architectural redesign.

Users should never exist independently of an Organization.

---

# Property Ownership

Organizations may own:

One Property

or

Multiple Properties

All properties remain independent while sharing the same Organization.

The Organization serves as the central management layer.

---

# Global Settings

Organization Settings apply across every property owned by the Organization.

Examples

Business Name

Business Logo

Default Currency

Time Zone

Date Format

Language

Notification Preferences

Global settings should automatically apply unless overridden by property-level configuration.

---

# Financial Settings

Financial configuration belongs to the Organization.

Examples

Settlement Configuration

Default Partner Ratios

Expense Categories

Expense Accounts

Financial Year

Tax Preferences

These settings provide defaults across all properties.

Individual properties may maintain operational independence where required.

---

# Payment Settings

Payment preferences belong to the Organization.

Examples

Default QR Code

Bank Details

Accepted Payment Methods

UPI Details

These settings are reused throughout the application whenever payment instructions are generated.

---

# Communication Settings

Organization-level communication settings define default messaging behaviour.

Examples

WhatsApp Templates

Email Templates

Reminder Preferences

Bulk Communication Defaults

Properties inherit these settings unless customized in future versions.

---

# Security Settings

Security configuration belongs to the Organization.

Examples

Password Policies

Two-Factor Authentication

Sensitive Action Confirmation

Session Timeout

Audit Preferences

Security should be managed centrally.

---

# Branding

Brand identity is managed at the Organization level.

Examples

Logo

Primary Brand Color

Business Name

Invoice Branding

Agreement Branding

Every generated document should automatically inherit Organization branding.

---

# Multi-Property Support

Organizations may operate multiple properties.

Examples

Sunshine Heights

Palm Residency

Green View Homes

Each property remains operationally independent while sharing common organizational settings.

---

# Organization Isolation

Organizations must remain completely isolated from one another.

An Organization should never access:

• Properties

• Occupants

• Financial Data

• Reports

• Settings

belonging to another Organization.

Data isolation is a mandatory architectural requirement.

---

# Scalability

The Organization Domain should support:

Single Property Owners

↓

Small Chains

↓

Regional Operators

↓

Enterprise Organizations

No redesign should be required as organizations grow.

---

# Future Expansion

The Organization Domain should support future capabilities without structural redesign.

Examples

Corporate Groups

Franchise Networks

Regional Offices

Multi-Country Operations

These capabilities should extend the Organization rather than replacing it.

---

# Design Principles

The Organization is the root owner of all business information.

Every business record belongs to exactly one Organization.

Global settings should be configured once and reused automatically.

Properties operate independently while inheriting common organizational behaviour.

The Organization Domain should remain stable regardless of future feature additions.

---
