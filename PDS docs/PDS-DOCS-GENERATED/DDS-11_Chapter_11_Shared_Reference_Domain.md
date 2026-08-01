# DDS Chapter 11
# Shared Reference Domain

**Document ID:** DDS-11

**Version:** 1.0

**Status:** Approved

---

# Purpose

The Shared Reference Domain manages reusable business reference information shared across multiple domains.

Reference information provides consistency throughout the application while eliminating duplicate configuration.

The Shared Reference Domain does not own operational business records.

Instead, it provides standardized information used by other domains.

---

# Core Philosophy

Reference information should be defined once.

Business domains should reuse reference information.

Duplicate configuration should never exist.

---

# Scope

The Shared Reference Domain manages reusable information including:

• Master Lists

• Categories

• Lookup Values

• Configuration Lists

• Enumerations

• Reusable Templates

Future shared resources should extend this domain.

---

# Organization-Owned References

Some reference information belongs to an Organization.

Examples

Expense Categories

Expense Accounts

Partner List

Property Types

Room Types

Notice Reasons

Occupation Types

Payment Methods

Organizations may customize these values according to their business requirements.

---

# System References

Some reference information is maintained by the system.

Examples

Countries

States

Cities

Currencies

Time Zones

Languages

Date Formats

These values remain globally available.

---

# Room References

The Room & Bed Domain may reuse shared references.

Examples

Room Types

Single Sharing

Double Sharing

Triple Sharing

Dormitory

Future room classifications should extend shared references.

---

# Occupant References

The Occupant Domain may reuse shared values.

Examples

Gender

Occupation

Identity Document Type

Emergency Contact Relationship

Notice Reason

Stay Type

Reference values improve consistency while reducing duplicate data entry.

---

# Financial References

The Financial Domain may reuse shared values.

Examples

Expense Categories

Expense Accounts

Payment Methods

Financial Year

Tax Types

Organizations may configure these values according to business needs.

---

# Maintenance References

Maintenance may reuse:

Maintenance Categories

Priority Levels

Issue Types

Vendor Types

Reference values simplify operational workflows.

---

# Communication References

Communication may reuse:

Message Templates

Notification Types

Reminder Types

Communication Channels

Reference values should remain reusable across all properties.

---

# Property Independence

Organization-owned references automatically become available across every Property belonging to that Organization.

Properties should reuse shared references rather than creating duplicate lists.

---

# Historical Integrity

Operational records should preserve historical reference values.

Examples

Changing Expense Category Name

Updating Room Type Definition

Modifying Notice Reason List

Historical transactions and records retain their original reference values without corruption.
