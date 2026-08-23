---
name: fasttrack-gemini-migration-engine
description: >
  Complete architectural blueprint and implementation guide for TenoPilot's FastTrack 1-Click
  AI Migration Engine. Uses Google Gemini Vision AI to ingest handwritten PG registers, diary
  ledgers, multi-page PDFs, Excel printouts, and unstructured spreadsheets into fully structured
  tenant profiles, room/bed layout matrices, and dual-ledger payment histories in seconds.
---

# FastTrack Gemini AI Migration & Ingestion Engine

A production-proven AI data migration skill distilled from **TenoPilot's FastTrack 1-Click Onboarding System**.

---

## 1. Architectural Overview

The FastTrack Migration Engine converts chaotic, unstructured physical registers and PDFs into structured property records in under 30 seconds.

```
[Handwritten Diary / Scanned Register / PDF / Spreadsheet]
                      │
                      ▼
       [FastTrack Import Modal (Client UI)]
                      │
                      ▼ (POST /api/fasttrack/ai-scan)
┌─────────────────────────────────────────────────────────┐
│ 1. PDF Sub-Chunk Splitter (pdf-lib: 5-page chunks)      │
│ 2. Multimodal Gemini Prompt with Domain Vocabularies    │
│ 3. Multi-Model Fallback:                                │
│    gemini-3.6-flash ➔ gemini-3.7-flash ➔ gemini-flash   │
│ 4. Heuristic Parser Fallback (Offline Regex & NLP)      │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
[Structured JSON Output: Occupants, Rooms, Beds, Tariffs]
                      │
                      ▼
[Interactive Review & Conflict Detection Grid]
                      │
                      ▼
[Atomic Cloud Firestore Batch Ingest: Floors, Rooms, Tenants]
```

---

## 2. Gemini Multimodal Vision API Integration

### Endpoint: `/api/fasttrack/ai-scan`
Supports processing multiple high-resolution photos and multi-page PDF documents simultaneously.

### Domain Vocabulary Prompting Matrix
The AI prompt includes specific domain vocabulary to accurately map colloquial Indian real estate terms:
* **Room Identifiers**: *"Room", "Rm", "Kholi", "Flat", "Unit", "R.No", "403", "501", "A01", "G02"*
* **Rent Terms**: *"Rent", "Tariff", "Monthly", "Bhadha", "Fee", "Amt", "Package", "10,500/-"*
* **Deposit Terms**: *"Security Deposit", "Advance", "Dep", "Caution", "Sec", "Token", "5,000"*
* **Date Terms**: *"DOJ", "Joining", "Join Date", "Move In", "Admit", "Check-in", "Date of Entry"*
* **Sharing Terms**: *"Sharing", "1", "2", "3", "4", "Single", "Double", "Triple", "Quad"*
* **Bed Slots**: *"Bed No", "Cot A", "Upper", "Lower", "Berth", "Bed 1"*

### Indian Anchor-Date Heuristic
Indian registers strictly use `DD/MM/YYYY` format (e.g. `21/3/2026` or `04/12/2025`). The ingestion prompt enforces an **Anchor-Date Heuristic**:
* If any date on the document has the first number $> 12$ (e.g. `21/3/2026`), all ambiguous dates (e.g. `04/05/2026`) on that document are parsed as `DD/MM/YYYY` (`4th May 2026`), never `MM/DD/YYYY`.
* Normalizes all output dates to standard ISO `YYYY-MM-DD`.

---

## 3. Heuristic & Offline Fallback Engine (`lib/fastTrackHeuristicParser.ts`)

When no Gemini API key is configured or when the user pastes raw clipboard text from WhatsApp/Excel:
* **Table Column Detection**: Detects column boundaries in TSV, CSV, pipe-separated, or whitespace-separated lines.
* **Smart Phone Normalizer**: Strips `+91`, leading `0`, spaces, and hyphens; validates 10 digits starting with `6/7/8/9`.
* **Automatic Sharing & Bed Allocation**: Auto-generates Bed codes (`Bed A`, `Bed B`, `Bed C`) when unassigned, and calculates room capacity automatically.

---

## 4. Conflict Resolution & Interactive Review Grid

Before committing data to Firestore, FastTrack presents an interactive preview grid:
* **Duplicate Phone Flagging**: Flags tenants sharing identical mobile numbers.
* **Room Capacity Overflow**: Warns if a 2-sharing room has 3 tenants assigned.
* **Auto-Creation of Missing Rooms**: Automatically calculates floor numbers from room codes (e.g. `Room 304` ➔ `Floor 3`, `Room 102` ➔ `Floor 1`) and provisions the physical layout matrix.

---

## 5. Batch Ingestion Runbook (`lib/fastTrackBatchIngest.ts`)

Once approved by the user, `executeFastTrackBatchIngest()` commits all records in an atomic Firestore transaction:
1. **Creates Missing Floors & Rooms** in `/properties/{propertyId}/floors`.
2. **Creates Occupant Documents** in `/properties/{propertyId}/occupants`.
3. **Emits Initial Financial Receipts** (`#REC-XXXXX` and `#DEP-XXXXX`) into each tenant's `paymentHistory` ledger.
4. **Calculates Initial Live Revenue & Occupancy** instantly via `domainSSOT.ts`.

---

## 6. Verification & API Key Configuration

To enable Gemini Vision FastTrack Ingestion in any environment, ensure the following environment variable is configured in `.env.local`:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```
