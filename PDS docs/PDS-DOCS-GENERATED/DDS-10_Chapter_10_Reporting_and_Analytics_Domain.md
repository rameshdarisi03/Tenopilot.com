# DDS Chapter 10
# Reporting & Analytics Domain

**Document ID:** DDS-10

**Version:** 1.0

**Status:** Approved

---

# Purpose

The Reporting & Analytics Domain provides meaningful business insights by transforming operational data into reports, dashboards and analytics.

Reports should help users understand business performance without requiring manual calculations.

The Reporting Domain never owns business information.

Reports are generated from operational data maintained by other domains.

---

# Core Philosophy

Business Domains

↓

Operational Data

↓

Analytics Engine

↓

Reports

Operational data remains the single source of truth.

Reports should never become editable business records.

---

# Scope

The Reporting Domain includes:

• Dashboard Analytics

• Occupancy Reports

• Financial Reports

• Settlement Reports

• Occupant Reports

• Maintenance Reports

• Communication Reports

• Export Services

Future reports should extend this domain.

---

# Data Sources

Reports derive information from:

Organization Domain

↓

Property Domain

↓

Room & Bed Domain

↓

Occupant Domain

↓

Financial Domain

↓

Maintenance Domain

↓

Communication Domain

The Reporting Domain does not own operational data.

---

# Dashboard Analytics

Dashboard metrics provide a real-time overview of business performance.

Examples

• Total Properties

• Total Occupants

• Active Guests

• Available Beds

• Occupied Beds

• Vacating Beds

• Revenue Summary

• Outstanding Rent

Dashboard metrics should refresh automatically whenever operational data changes.

---

# Occupancy Reports

Occupancy Reports provide visibility into accommodation usage.

Examples

• Occupancy Percentage

• Available Beds

• Occupied Beds

• Booked Beds

• Vacating Beds

• Room Utilization

• Property Utilization

Occupancy should always be calculated from current room and bed information.

---

# Occupant Reports

Occupant Reports provide visibility into resident activity.

Examples

• Active Tenants

• Active Guests

• Booked Occupants

• Notice Period Occupants

• Past Occupants

• New Admissions

• Vacated Occupants

Reports should support filtering by:

Property

Date

Occupant Type

Lifecycle Status

---

# Financial Reports

Financial Reports summarize business performance.

Examples

• Monthly Revenue

• Expense Summary

• Profit Summary

• Settlement Summary

• Outstanding Payments

• Collection Report

Reports should derive information directly from Financial Domain events.

---

# Maintenance Reports

Maintenance Reports summarize operational activities.

Examples

• Open Requests

• Assigned Requests

• Completed Requests

• Pending Requests

• Resolution Time

• Category Summary

Maintenance reports should assist operational planning.

---

# Communication Reports

Communication Reports summarize messaging activity.

Examples

• Messages Sent

• Delivery Status

• Failed Messages

• Reminder History

• Campaign Performance

Communication reports should remain informational.

---

# Property Reports

Organizations managing multiple properties should be able to view:

Individual Property Reports

or

Consolidated Organization Reports

Property reports remain operationally independent.

Consolidated reports aggregate information across selected properties.

---

# Time-Based Reporting

Reports should support common reporting periods.

Examples

Today

This Week

This Month

Last Month

Financial Year

Custom Date Range

Time filtering should remain consistent throughout the application.

---

# Export Services

Reports may be exported.

Supported formats include:

• PDF

• Excel

• CSV

Future export formats should extend the existing reporting architecture.

Exporting should never modify report data.

---

# Historical Reporting

Historical reports should remain reproducible.

Reports generated for previous periods should continue to reflect historical operational data.

Future changes should never alter historical report accuracy.

---

# Performance

Frequently accessed reports should prioritize fast loading.

Complex calculations should occur efficiently without affecting operational workflows.

Reporting should never interfere with day-to-day business activities.

---

# Future Expansion

The Reporting Domain should support future analytics.

Examples

Trend Analysis

Occupancy Forecasting

Revenue Forecasting

Partner Performance

Property Comparison

Business Growth Analytics

Future reporting capabilities should extend existing operational data.

---

# Design Principles

Reports visualize business information.

Operational domains own business information.

Reports remain read-only.

Historical accuracy should always be preserved.

Reports should require no manual calculations.

Every report should answer a meaningful business question.

The Reporting Domain should scale naturally as additional business modules are introduced.

---
