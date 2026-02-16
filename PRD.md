# OpenOCR v3.0 — Enterprise Upgrade PRD

**Product Requirements Document (PRD)**
**Version:** 3.0.0
**Date:** 2026-02-16
**Status:** DRAFT

---

## 1. Executive Summary
OpenOCR v3.0 aims to evolve the platform from a single-user local tool into a scalable, enterprise-grade SaaS platform. The upgrade focuses on three pillars: **Scalability** (PostgreSQL, Async Queues), **Intelligence** (Native PDF extraction, Multi-language), and **Enterprise Control** (RBAC, Audit Logs, Analytics).

## 2. Goals & Objectives
- **Scalability:** Move from SQLite/Sync to PostgreSQL/Redis/Celery to handle concurrent batch processing.
- **Accuracy:** Implement best-in-class extraction using Native PDF parsing (no OCR for digital files) + Templates.
- **User Experience:** Real-time feedback via WebSockets, Analytics Dashboard, and Dark/Light Mode.
- **Security:** Role-Based Access Control (RBAC), Audit Logging, and API Keys.

## 3. Feature Specifications

### 3.1. Core Experience & Dashboard
- **[Feature] Dashboard Analytics:**
  - Charts: Documents processed over time, Average confidence score, Processing time trends.
  - Stats: Total pages, API usage count, Success/Failure rates.
- **[Feature] Dark/Light Theme Toggle:**
  - System-aware default with manual toggle.
  - Persisted in user preferences.
- **[Feature] Search & Filter:**
  - Full-text search across all extracted data and filenames.
  - Advanced filtering by status, date range, and confidence score.

### 3.2. Advanced OCR & Processing
- **[Feature] Native PDF Extraction:**
  - Detect if a PDF has embedded text.
  - Use `PyMuPDF` or `pdfplumber` to extract text directly (100% accuracy, <100ms) instead of OCR.
  - Fallback to EasyOCR only for scanned images within PDFs.
- **[Feature] Multi-language OCR:**
  - User-selectable languages per job (English, Spanish, French, Hindi, etc.).
  - Pass language codes to EasyOCR engine.
- **[Feature] Template Learning:**
  - "Save as Template" option for successful extractions.
  - Auto-match document layout to templates for fixed-coordinate extraction.
- **[Feature] Batch Processing:**
  - Upload N files at once.
  - Process in parallel using background workers.
- **[Feature] Document Comparison View:**
  - Side-by-side comparison of extracted data against the original document.

### 3.3. Architecture & Infrastructure
- **[Infra] PostgreSQL Database:**
  - Migrate `users`, `jobs`, `documents`, `export_records` to Postgres.
  - Required for concurrent writes and complex analytics queries.
- **[Infra] Asynchronous Job Queue:**
  - Implement **Celery** + **Redis**.
  - Offload OCR and Extraction tasks from the main API thread.
  - Enable retry logic and timeout handling.
- **[Infra] WebSocket Live Updates:**
  - Server pushes `job_progress`, `job_completed`, `job_failed` events.
  - Frontend updates progress bars in real-time without polling.
- **[Infra] Cloud Storage (S3/GCS):**
  - Integration with AWS S3 / Google Cloud Storage for file persistence.
  - Configurable via environment variables (keeping local as default).

### 3.4. Enterprise Security & Governance
- **[Security] Role-Based Access Control (RBAC):**
  - Roles: `Admin` (Manage users, system config), `Editor` (Upload, Edit, Export), `Viewer` (Read-only).
  - Middleware permission checks.
- **[Security] Audit Logging:**
  - Track: Who did what, when.
  - Events: `LOGIN`, `UPLOAD`, `EXPORT`, `DELETE_JOB`, `USER_CREATE`.
  - Viewable in Admin Dashboard.
- **[Integration] API Keys:**
  - Generate long-lived API keys for external integrations.
  - Scope keys to specific actions.
- **[Integration] Webhooks:**
  - User-defined callback URLs.
  - POST payload sent on `JOB_COMPLETED`.
- **[Security] Rate Limiting:**
  - Protect API endpoints from abuse using Redis-based rate limiting.

### 3.5. Developer Experience
- **[DevOps] CI/CD Pipeline:**
  - GitHub Actions for automated testing and linting.
- **[Docs] API Documentation:**
  - Enhanced Swagger/ReDoc with detailed examples.

## 4. Technical Architecture Schema

### Current (v2.0)
`Client (React)` <-> `FastAPI (Sync)` <-> `SQLite` + `Local Disk`

### Proposed (v3.0)
```mermaid
graph TD
    Client[React Frontend] <-->|HTTP/REST| API[FastAPI Server]
    Client <-->|WebSocket| API
    API -->|Tasks| Redis[Redis Queue]
    Redis -->|Consume| Worker[Celery Worker]
    Worker -->|OCR/Extract| Engine[OCR Engine]
    API -->|Read/Write| DB[(PostgreSQL)]
    Worker -->|Read/Write| DB
    Worker -->|Save| Storage[File Storage (Local/S3)]
```

## 5. Implementation Roadmap

### Phase 1: Foundation (Architecture)
- **Goal:** Enable async processing and robust storage.
- **Actions:**
  - Docker Compose: Add Postgres & Redis.
  - Backend: Migrate ORM to Postgres.
  - Backend: Setup Celery for async tasks.
  - Config: Update `requirements.txt` and Environment variables.

### Phase 2: Core Intelligence (OCR Upgrade)
- **Goal:** Improve accuracy and speed.
- **Actions:**
  - Implement Native PDF extraction (PyMuPDF).
  - Add Multi-language support to `ocr_engine`.
  - Create Batch Upload endpoints.

### Phase 3: Real-time & Analytics (Frontend)
- **Goal:** Interactive user experience.
- **Actions:**
  - WebSocket host setup.
  - Dashboard Analytics components.
  - Dark/Light mode toggle.

### Phase 4: Enterprise (Security)
- **Goal:** Control and Compliance.
- **Actions:**
  - RBAC Middleware.
  - Audit Log table and API.
  - API Key generation.
  - Webhooks dispatch system.

---

## 6. Success Metrics
- **Performance:** Batch of 10 docs processed in < 30s (async).
- **Scale:** DB handles 100k+ records.
- **Accuracy:** 100% on digital PDFs (via native extraction).
