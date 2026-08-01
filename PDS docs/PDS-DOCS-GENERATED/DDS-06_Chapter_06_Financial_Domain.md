# DDS Chapter 06
# Financial Domain

**Document ID:** DDS-06

**Version:** 1.0

**Status:** Approved

---

# Purpose

The Financial Domain manages all financial operations performed within a Property.

The Financial Domain records financial events, automates calculations, and provides business insights while remaining independent from traditional accounting systems.

The Financial Domain is designed to eliminate manual spreadsheets and repetitive calculations.

---

# Core Philosophy

Users record financial events.

The system performs financial calculations.

Financial reports are generated automatically.

Every financial event should be recorded only once.

---

# Financial Structure

The Financial Domain consists of four independent subdomains.

• Revenue Operations

• Expense Management

• Settlement Engine

• Financial Reporting

Each subdomain owns a single responsibility.

---

# Revenue Operations

Revenue Operations manages all incoming business income.

Examples

• Monthly Rent

• Guest Stay Charges

• Security Deposits

• Advance Payments

Revenue originates from operational activities.

Revenue should never be entered manually as summary values.

---

# Revenue Principles

Revenue belongs to an Occupant.

Revenue belongs to a Property.

Revenue belongs to a collection period.

Revenue remains historically preserved.

Deleting financial history should never occur during normal operations.

---

# Expense Management

Expense Management records operational expenses.

Examples

• Electricity

• Water

• Staff Salary

• Maintenance

• Laundry

• Internet

Every expense belongs to one Property.

---

# Expense Categories

Expense categories remain customizable.

Organizations define their own categories.

Historical expenses remain linked to their original category even if category names are modified later.

---

# Expense Accounts

Every expense records its payment source.

Examples

• Business Account

• Petty Cash

• Current Account

• Reserve Fund

Expense Accounts track money movement.

Expense Accounts do not participate in profit sharing.

---

# Expense Ownership

Every expense records:

• Amount

• Category

• Paid By

Optional

• Receipt

• Notes

Expense recording should remain simple.

---

# Settlement Engine

Settlement is the financial intelligence layer of TenoPilot.

The Settlement Engine never requires manual calculations.

Settlement is automatically generated from recorded financial events.

---

# Settlement Inputs

Settlement calculations use:

Revenue

+

Expenses

+

Ownership Structure

↓

Partner Settlement

---

# Partner Settlement

Partner Settlement automatically calculates:

• Total Revenue

• Total Expenses

• Net Profit

• Ownership Percentage

• Partner Share

• Final Receivable

The system recalculates automatically whenever financial events change.

---

# Expense Accounts

Settlement also tracks operational payment accounts.

Examples

Business Account

Petty Cash

Reserve Fund

Current Account

These accounts provide operational visibility but never affect ownership percentages.

---

# Ownership Structure

Each Property may define multiple owners.

Examples

Partner A

50%

Partner B

30%

Partner C

20%

Ownership percentages drive settlement calculations.

Changing ownership affects future settlements only.

Historical settlements remain unchanged.

---

# Financial Reporting

Reports visualize existing financial information.

Examples

Monthly Revenue

Expense Summary

Settlement Report

Profit Summary

Occupancy Revenue

Financial reports never become the source of truth.

Reports derive information from operational events.

---

# Financial Timeline

Financial events occur naturally.

Rent Collected

↓

Expense Recorded

↓

Settlement Updated

↓

Reports Updated

No manual synchronization should be required.

---

# Guest Revenue

Guests generate operational revenue.

Guest revenue follows the same financial model as tenant rent.

Only the billing period differs.

The Financial Domain should not distinguish between occupant types when calculating income.

---

# Property Independence

Every Property maintains independent financial records.

Organizations may later view consolidated reports across multiple properties.

Operational calculations remain property-specific.

---

# Financial History

Historical financial information should always remain preserved.

Examples

Rent History

Expense History

Settlement History

Payment History

Historical information should never be modified by future calculations.

---

# Automation

Financial calculations should occur automatically after:

Rent Collection

Guest Payment

Expense Recording

Expense Modification

Expense Deletion

Ownership Changes

Manual recalculation should never be required.

---

# Future Expansion

The Financial Domain should support future enhancements.

Examples

Partner Withdrawals

Capital Contributions

Investment Tracking

Budget Planning

Forecasting

Annual Reports

Future capabilities should extend existing structures rather than introducing duplicate financial models.

---

# Design Principles

Financial events should be recorded once.

Calculations should occur automatically.

Reports should remain read-only.

Settlement should eliminate manual spreadsheets.

Expenses should remain simple.

Revenue should originate from operational activities.

Historical financial information should always be preserved.

The Financial Domain should remain independent while integrating naturally with Occupants, Properties, Agreements and Reporting.

---
