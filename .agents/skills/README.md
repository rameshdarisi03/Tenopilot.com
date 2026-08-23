# TenoPilot Production Agent Skills Pack

This directory contains the production-proven architecture skills, specifications, and migration blueprints for **TenoPilot.com**.

---

## 📦 Packaged Skills Index

| Skill Name | Location | Description |
| :--- | :--- | :--- |
| **`fasttrack-gemini-migration-engine`** | [fasttrack-gemini-migration-engine/SKILL.md](./fasttrack-gemini-migration-engine/SKILL.md) | Gemini Vision AI multimodal document ingestion for handwritten PG registers, PDF splitters, Indian Anchor-Date heuristics, and 1-click batch onboarding. |
| **`tenant-financial-ssot-engine`** | [tenant-financial-ssot-engine/SKILL.md](./tenant-financial-ssot-engine/SKILL.md) | Single Source of Truth dual-ledger calculations (Rent vs Deposit), pro-rata math, 9-category expense engine with Indian Rupee icons, and 10-day trial service. |
| **`saas-property-operating-system`** | [saas-property-operating-system/SKILL.md](./saas-property-operating-system/SKILL.md) | Multi-tenant room/bed layout engines, partner equity sharing, Firestore sync, and tenant lifecycle state machine. |
| **`whatsapp-cloud-credit-gateway`** | [whatsapp-cloud-credit-gateway/SKILL.md](./whatsapp-cloud-credit-gateway/SKILL.md) | Centralized Meta WhatsApp Cloud API integration, credit wallet monetization, dynamic reminder templates, and zero-config sandbox. |

---

## 🚀 Migration & Deployment Quickstart

1. **Copy `.agents/skills/`** into the new repository or target environment.
2. **Configure `.env.local`** with Firebase, Google Gemini, and Meta WhatsApp Cloud API credentials.
3. **Execute Build Verification**:
   ```bash
   npm run build
   ```
4. **Deploy** to Vercel / Cloudflare / AWS.
