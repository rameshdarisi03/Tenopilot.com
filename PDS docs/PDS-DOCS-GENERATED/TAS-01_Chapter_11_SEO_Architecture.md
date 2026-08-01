# TAS-01 — Technical Architecture Specification

# Chapter 11 — SEO Architecture

## Version

Version: 1.0

Status: DRAFT

---

# Objective

This chapter defines the Search Engine Optimization (SEO) architecture for TenoPilot.

The objective is to maximize discoverability of the public marketing website while ensuring authenticated application pages remain secure, performant and excluded from search engine indexing.

SEO should be treated as a business acquisition strategy rather than an application feature.

---

# Business Context

TenoPilot consists of two distinct experiences.

1. Public Marketing Website

2. Authenticated SaaS Application

These two areas have completely different SEO requirements.

The public website exists to acquire customers.

The application exists to help customers manage their business.

---

# Scope

This chapter defines:

- Public SEO
- Private Route Strategy
- Metadata
- Structured Data
- Sitemap
- Robots
- Social Sharing
- Performance considerations for SEO

This chapter does NOT define:

- Blog Content Strategy
- Marketing Copy
- Advertisement Strategy

---

# SEO Philosophy

Only pages that help acquire customers should be indexed.

Business application pages should never appear in search results.

SEO should improve discoverability without affecting application performance.

---

# Public Pages

The following pages should be indexable.

- Landing Page
- Features
- Pricing
- About
- Contact
- Blog
- Help Center
- Privacy Policy
- Terms of Service

Each page should have unique metadata.

---

# Private Pages

The following pages must never be indexed.

- Dashboard
- Home Workspace
- Property Workspace
- Portfolio Workspace
- Tenants
- Financial Hub
- Reports
- Maintenance
- Staff
- Settings
- Subscription
- Profile

Authenticated application pages are operational interfaces, not marketing content.

---

# Metadata Strategy

Every public page should define:

- Title
- Description
- Keywords (where appropriate)
- Canonical URL
- Open Graph Tags
- Twitter Card Metadata

Metadata should accurately represent page content.

---

# Open Graph

All public pages should support rich previews when shared.

Examples:

- Landing Page
- Blog Articles
- Pricing
- Feature Pages

Social previews should include:

- Title
- Description
- Preview Image

---

# Sitemap Strategy

Automatically generate:

sitemap.xml

Include only:

- Public Pages
- Blog Articles
- Marketing Content

Exclude all authenticated routes.

---

# Robots Strategy

Provide:

robots.txt

Allow:

Marketing Pages

Disallow:

- Dashboard
- Workspace Routes
- Authentication Pages
- Internal APIs
- Private Resources

---

# Structured Data

Public pages should use Schema.org structured data where appropriate.

Examples:

- Organization
- SoftwareApplication
- FAQ
- Article
- BreadcrumbList

Structured data improves search visibility.

---

# URL Strategy

URLs should remain:

- Short
- Readable
- Descriptive

Examples

Good

/features

/pricing

/blog/how-to-manage-pg-efficiently

Avoid unnecessary nesting.

---

# Performance & SEO

SEO performance depends on:

- Fast page loads
- Optimized images
- Server-side rendering where appropriate
- Static generation for marketing pages

Performance directly impacts search ranking.

---

# Internationalization

The architecture should allow future localization.

Examples:

/en/

/hi/

/te/

without requiring architectural redesign.

Localization is not part of Version 1.

---

# Why This Architecture Was Chosen

Separating marketing SEO from the application provides:

- Better search rankings
- Better security
- Cleaner architecture
- Faster application performance

The application focuses on productivity.

The website focuses on customer acquisition.

---

# Alternatives Considered

Index Everything

Rejected

Reason

Private business data should never be indexed.

Provides no SEO benefit.

---

No Metadata

Rejected

Reason

Poor search visibility.

Reduced click-through rates.

---

Dynamic Metadata Everywhere

Rejected

Reason

Unnecessary complexity for authenticated pages.

---

# Trade-offs

Advantages

- Better SEO
- Cleaner architecture
- Improved performance
- Better privacy

Trade-offs

- Additional metadata management
- Separate SEO strategy for public pages

These trade-offs are acceptable.

---

# Security Considerations

Authenticated routes must never appear in search engine indexes.

Sensitive business information must remain inaccessible to crawlers.

---

# Cloud Cost Considerations

SEO architecture has negligible impact on infrastructure cost.

Static generation for public pages reduces server workload.

---

# Scalability Strategy

The SEO architecture should support:

- Hundreds of landing pages
- Thousands of blog articles
- Future localization
- Marketing expansion

without affecting the SaaS application.

---

# Things We Explicitly Avoid

- Indexing dashboard pages
- Duplicate metadata
- Missing canonical URLs
- Missing Open Graph tags
- Large unoptimized images
- Client-side rendering for marketing pages

---

# Red Flag Checklist

Before publishing a page ask:

- Should this page be indexed?
- Does it have unique metadata?
- Does it need structured data?
- Is the URL readable?
- Is the page optimized for sharing?

If not, review before release.

---

# Principal Architect Review

Architecture Evaluation

SEO

★★★★★

Performance

★★★★★

Security

★★★★★

Scalability

★★★★★

Developer Experience

★★★★★

Overall Recommendation

APPROVED

---

# Final Architecture Decision

TenoPilot adopts a dual SEO strategy.

Public marketing pages are optimized for search engines.

Authenticated SaaS application pages remain private and excluded from indexing.

This architecture is permanently LOCKED.

---

# Architecture Status

Status

APPROVED

Version

1.0

Architecture

LOCKED
