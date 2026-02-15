# BillScan AI

### Intelligent Billing Document OCR & Data Extraction Platform

> **Version 2.0** · FastAPI + React · Enterprise SaaS

BillScan AI automates data extraction from billing documents — invoices, receipts, and purchase orders. Upload a document, run OCR, select fields, and export structured data to Excel in seconds.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Running with Docker](#running-with-docker)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [OCR & Extraction Pipeline](#ocr--extraction-pipeline)
- [Supported Extraction Fields](#supported-extraction-fields)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BillScan AI Platform                        │
│                                                                     │
│  ┌──────────────┐    HTTP/REST     ┌──────────────────────────────┐ │
│  │   Frontend    │ ◄─────────────► │          Backend             │ │
│  │   (React)     │   JSON + JWT    │        (FastAPI)             │ │
│  │              │                  │                              │ │
│  │  • Auth Page  │                  │  ┌────────┐  ┌───────────┐ │ │
│  │  • Upload     │                  │  │  Auth   │  │   Routes  │ │ │
│  │  • Dashboard  │                  │  │  (JWT)  │  │  (CRUD)   │ │ │
│  │  • Job Detail │                  │  └────────┘  └─────┬─────┘ │ │
│  └──────────────┘                  │                     │       │ │
│                                    │         ┌───────────┤       │ │
│                                    │         ▼           ▼       │ │
│                                    │  ┌──────────┐ ┌──────────┐ │ │
│                                    │  │ EasyOCR  │ │Extractor │ │ │
│                                    │  │  Engine   │ │(Regex/LLM)│ │ │
│                                    │  └──────────┘ └──────────┘ │ │
│                                    │         │           │       │ │
│                                    │         ▼           ▼       │ │
│                                    │  ┌──────────────────────┐  │ │
│                                    │  │   SQLite Database     │  │ │
│                                    │  │ (Users, Jobs, Docs,   │  │ │
│                                    │  │  Extractions, Exports)│  │ │
│                                    │  └──────────────────────┘  │ │
│                                    │         │                   │ │
│                                    │         ▼                   │ │
│                                    │  ┌──────────────────────┐  │ │
│                                    │  │  Excel Export Engine  │  │ │
│                                    │  │     (openpyxl)        │  │ │
│                                    │  └──────────────────────┘  │ │
│                                    └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

| Category | Feature | Details |
|----------|---------|---------|
| **Document Handling** | Multi-format upload | PDF, PNG, JPG, TIFF, BMP, WebP |
| | Drag-and-drop | Intuitive upload zone with file validation |
| | File deduplication | SHA-256 content hashing per document |
| **OCR** | Text extraction | EasyOCR with 95%+ accuracy on clear scans |
| | Confidence scoring | Per-document confidence percentage |
| | Performance tracking | Processing time recorded per job |
| **Extraction** | 12+ billing fields | Invoice #, dates, amounts, vendor, tax, etc. |
| | Dual engine | Regex patterns + optional Ollama LLM fallback |
| | Selective extraction | Choose which fields to extract per job |
| | Re-extraction | Edit field selection and re-run anytime |
| **Export** | Excel reports | Styled `.xlsx` with data + confidence sheets |
| | Export history | Every export tracked with metadata |
| | Direct download | One-click download from the browser |
| **Auth & Security** | JWT tokens | 72-hour tokens with Bearer authentication |
| | SHA-256 hashing | Salted password hashing (timing-safe) |
| | User isolation | Users can only access their own jobs |
| **Infrastructure** | Docker support | Multi-stage build, single-command deployment |
| | Persistent storage | Named volumes for DB, uploads, exports |
| | Environment config | All secrets/URLs configurable via env vars |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Runtime** | Python | 3.11+ |
| **API Framework** | FastAPI | 0.115.x |
| **ASGI Server** | Uvicorn | 0.34.x |
| **ORM** | SQLAlchemy | 2.0.x |
| **Database** | SQLite | Built-in |
| **OCR Engine** | EasyOCR | 1.7.x |
| **Excel** | openpyxl | 3.1.x |
| **JWT** | python-jose | 3.3.x |
| **Frontend** | React | 19.x |
| **Build Tool** | Vite | 7.x |
| **Routing** | React Router | 7.x |
| **Container** | Docker | Multi-stage |

---

## Project Structure

```
OCR Application/
│
├── server/                        # ── Backend (FastAPI) ──
│   ├── main.py                    # App entry point, CORS, static serving
│   ├── auth.py                    # JWT auth: signup, login, token verify
│   ├── routes.py                  # REST API: upload, OCR, extract, export
│   ├── database.py                # SQLAlchemy models + session management
│   ├── ocr_engine.py              # EasyOCR wrapper
│   ├── extractor.py               # Field detection + extraction (regex/LLM)
│   ├── excel_export.py            # Styled Excel generation
│   ├── requirements.txt           # Python dependencies
│   ├── uploads/                   # Uploaded document storage (gitignored)
│   └── exports/                   # Generated Excel files (gitignored)
│
├── client/                        # ── Frontend (React + Vite) ──
│   ├── index.html                 # HTML entry point
│   ├── vite.config.js             # Vite configuration (proxy to :3001)
│   ├── package.json               # Node dependencies
│   └── src/
│       ├── main.jsx               # React DOM mount
│       ├── App.jsx                # Layout: sidebar, routing, toasts
│       ├── api.js                 # HTTP client: JWT injection, API calls
│       ├── index.css              # Enterprise design system
│       └── pages/
│           ├── AuthPage.jsx       # Split-screen login/signup
│           ├── UploadPage.jsx     # Drag-and-drop file upload
│           ├── JobsDashboard.jsx  # Metrics + job table
│           └── JobDetail.jsx      # OCR → Extract → Export workflow
│
├── Dockerfile                     # Multi-stage build (Node → Python)
├── docker-compose.yml             # Production deployment config
├── .dockerignore                  # Docker build context filter
├── .gitignore                     # Git ignore rules
└── README.md                      # This documentation
```

---

## Local Development Setup

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10+ | [python.org](https://www.python.org/downloads/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

### Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd "OCR Application"
```

### Step 2 — Backend Setup

Open a terminal and run:

```bash
# Navigate to server
cd server

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

**Expected output:**
```
✅ Database initialized (billscan.db)

⚡ BillScan AI Server v2.0
🌐 API: http://localhost:3001
📖 Docs: http://localhost:3001/docs
```

> **First run note:** EasyOCR downloads the English language model (~100 MB) automatically. This is a one-time download.

### Step 3 — Frontend Setup

Open a **second terminal** and run:

```bash
# Navigate to client
cd client

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Expected output:**
```
VITE v7.x.x  ready in 200ms

➜  Local:   http://localhost:5173/
```

### Step 4 — Use the Application

1. Open **http://localhost:5173** in your browser
2. **Sign up** with email, name, and password
3. **Upload** billing documents (invoices, receipts, PDFs, images)
4. **Run OCR** to extract raw text
5. **Select fields** — checkboxes for each billing field you want
6. **Extract** — the engine parses key-value pairs with confidence scores
7. **Export Excel** — download a styled `.xlsx` spreadsheet

### Development URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React dev server (hot reload) |
| Backend API | http://localhost:3001/api | REST API base |
| Swagger Docs | http://localhost:3001/docs | Interactive API documentation |
| Health Check | http://localhost:3001/api/health | Server status |

---

## Running with Docker

Docker bundles both frontend and backend into a single container. One port, one command.

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) (includes Docker Compose)

### Option A — Docker Compose (Recommended)

```bash
# Build and start in background
docker compose up --build -d

# Check logs
docker compose logs -f billscan

# Stop
docker compose down

# Stop and remove volumes (caution: deletes data)
docker compose down -v
```

Access the application at **http://localhost:3001**

### Option B — Docker CLI

```bash
# Build
docker build -t billscan-ai .

# Run
docker run -d \
  --name billscan-ai \
  -p 3001:3001 \
  -e BILLSCAN_SECRET_KEY=your-secure-key-here \
  -v billscan-data:/app/data \
  -v billscan-uploads:/app/server/uploads \
  -v billscan-exports:/app/server/exports \
  billscan-ai

# Stop
docker stop billscan-ai

# Remove
docker rm billscan-ai
```

### Docker Volumes

Data persists across container restarts via named volumes:

| Volume | Container Path | Purpose |
|--------|---------------|---------|
| `billscan-data` | `/app/data` | SQLite database |
| `billscan-uploads` | `/app/server/uploads` | Uploaded documents |
| `billscan-exports` | `/app/server/exports` | Generated Excel files |

### Docker Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BILLSCAN_SECRET_KEY` | `change-me-in-production` | JWT signing secret (use a strong random key) |
| `DATABASE_URL` | `sqlite:////app/data/billscan.db` | Database connection string |

---

## Database Schema

BillScan uses SQLite with 5 tables. The database is auto-created on first server start.

### Entity Relationship

```
┌──────────┐       ┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  users   │ 1───N │   jobs   │ 1───N │  documents   │ 1───N │ extractions  │
│          │       │          │       │              │       │              │
│ id (PK)  │       │ id (PK)  │       │ id (PK)      │       │ id (PK)      │
│ email    │       │ user_id  │       │ job_id       │       │ document_id  │
│ name     │       │ status   │       │ original_name│       │ field_key    │
│ pass_hash│       │ created  │       │ stored_path  │       │ field_label  │
│ created  │       │ updated  │       │ file_size    │       │ value        │
│ last_log │       │ error    │       │ file_hash    │       │ confidence   │
│ is_active│       │ excel_pth│       │ mime_type    │       │ method       │
│          │       │ total_doc│       │ ocr_text     │       │ extracted_at │
│          │       │ proc_time│       │ ocr_conf     │       └──────────────┘
└──────────┘       │          │       │ ocr_engine   │
                   │          │       │ ocr_proc_at  │
                   │     1───N│       │ page_count   │
                   │          │       └──────────────┘
                   │          │
                   │          │       ┌──────────────┐
                   │          │ 1───N │export_records│
                   │          │       │              │
                   └──────────┘       │ id (PK)      │
                                      │ job_id       │
                                      │ file_path    │
                                      │ file_size    │
                                      │ doc_count    │
                                      │ field_count  │
                                      │ exported_at  │
                                      └──────────────┘
```

### Table Details

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment user ID |
| `email` | VARCHAR(255) | Unique email address (indexed) |
| `name` | VARCHAR(255) | Display name |
| `password_hash` | VARCHAR(255) | SHA-256 hash with salt |
| `created_at` | DATETIME | Account creation timestamp |
| `last_login_at` | DATETIME | Last successful login |
| `is_active` | BOOLEAN | Account active status |

#### `jobs`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID job identifier |
| `user_id` | INTEGER FK | Owner reference → `users.id` |
| `status` | VARCHAR(20) | `pending` · `processing` · `completed` · `failed` |
| `created_at` | DATETIME | Job creation timestamp |
| `updated_at` | DATETIME | Last modification (auto-updated) |
| `error` | TEXT | Error message if failed |
| `excel_path` | VARCHAR(500) | Path to latest Excel export |
| `total_documents` | INTEGER | Number of documents in job |
| `total_pages` | INTEGER | Total page count |
| `processing_time_ms` | INTEGER | OCR processing duration |

#### `documents`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID document identifier |
| `job_id` | VARCHAR(36) FK | Parent job → `jobs.id` |
| `original_name` | VARCHAR(255) | Original uploaded filename |
| `stored_path` | VARCHAR(500) | Filesystem storage path |
| `file_size` | INTEGER | File size in bytes |
| `mime_type` | VARCHAR(100) | MIME type (image/png, etc.) |
| `file_hash` | VARCHAR(64) | SHA-256 content hash |
| `upload_timestamp` | DATETIME | When the file was uploaded |
| `ocr_text` | TEXT | Extracted raw text |
| `ocr_confidence` | FLOAT | OCR confidence (0–100) |
| `ocr_engine` | VARCHAR(50) | Engine used (`easyocr`) |
| `ocr_processed_at` | DATETIME | When OCR was run |
| `page_count` | INTEGER | Number of pages |

#### `extractions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment ID |
| `document_id` | VARCHAR(36) FK | Parent document → `documents.id` |
| `field_key` | VARCHAR(100) | Field identifier (e.g. `invoice_number`) |
| `field_label` | VARCHAR(100) | Display label (e.g. `Invoice Number`) |
| `value` | TEXT | Extracted value |
| `confidence` | FLOAT | Confidence score (0–100) |
| `extraction_method` | VARCHAR(20) | `regex` or `llm` |
| `extracted_at` | DATETIME | Extraction timestamp |

#### `export_records`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment ID |
| `job_id` | VARCHAR(36) FK | Parent job → `jobs.id` |
| `file_path` | VARCHAR(500) | Excel file path |
| `file_size` | INTEGER | Export file size in bytes |
| `document_count` | INTEGER | Documents included |
| `field_count` | INTEGER | Total fields exported |
| `exported_at` | DATETIME | Export timestamp |

---

## API Reference

**Base URL:** `http://localhost:3001/api`

All endpoints except `/api/auth/*` and `/api/health` require:
```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### `POST /api/auth/signup`
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "user@example.com", "name": "John Doe" }
}
```

#### `POST /api/auth/login`
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):** Same as signup response.

### Document & Job Endpoints

#### `POST /api/upload`
Upload billing documents and create a processing job.

**Request:** `multipart/form-data` with `documents` field (one or more files).

**Allowed file types:** `.pdf`, `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.tif`, `.webp`

**Response (200):**
```json
{
  "id": "a1b2c3d4-...",
  "status": "pending",
  "document_count": 2,
  "documents": [
    {
      "id": "e5f6g7h8-...",
      "original_name": "invoice.png",
      "file_size": 245678
    }
  ]
}
```

#### `GET /api/jobs`
List all jobs for the authenticated user.

#### `GET /api/jobs/{id}`
Get detailed job with documents, OCR text, and extracted fields.

#### `POST /api/jobs/{id}/ocr`
Run OCR on all documents in the job. Populates `ocr_text` and `ocr_confidence` on each document.

#### `POST /api/jobs/{id}/extract`
Extract selected fields from OCR text.

**Request:**
```json
{
  "selectedFields": ["invoice_number", "total_amount", "vendor_name", "invoice_date"]
}
```

#### `POST /api/jobs/{id}/export`
Generate a styled Excel report with extracted data and confidence scores.

#### `GET /api/jobs/{id}/download`
Download the generated `.xlsx` file.

#### `POST /api/jobs/{id}/retry`
Reset a failed job to `pending` status (clears OCR and extraction data).

#### `DELETE /api/jobs/{id}`
Delete a job and all associated files from disk.

#### `GET /api/documents/{job_id}/{doc_id}/preview`
Preview uploaded document image. Accepts JWT via `?token=` query parameter for `<img>` src compatibility.

### Utility Endpoints

#### `GET /api/health`
```json
{ "status": "ok", "version": "2.0.0" }
```

#### `GET /api/fields`
Lists all available extraction field definitions.

---

## Authentication

BillScan uses **JWT (JSON Web Tokens)** for stateless authentication.

### Flow

```
1. User signs up or logs in     POST /api/auth/signup or /login
2. Server returns JWT token     { access_token: "eyJ..." }
3. Client stores token          localStorage
4. All API calls include        Authorization: Bearer <token>
5. Token expires after          72 hours
6. On 401 response              Client clears token → redirects to login
```

### Password Security

- Passwords are hashed using **SHA-256** with a 16-byte random salt
- Stored as `{salt_hex}${hash_hex}`
- Verified using `secrets.compare_digest()` (timing-safe comparison)
- No plaintext passwords are ever stored or logged

### Token Details

| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| Expiry | 72 hours |
| Payload | `{ sub: user_id, exp: timestamp }` |
| Secret | `BILLSCAN_SECRET_KEY` env var |

---

## OCR & Extraction Pipeline

### Processing Workflow

```
Upload → [Pending] → Run OCR → [Processing] → OCR Complete → [Completed]
                                                      │
                                            Select Fields → Extract → Export Excel
                                                      │
                                            Edit Fields → Re-Extract (optional)
```

### Stage 1: OCR (Text Extraction)

- **Engine:** EasyOCR (English)
- **Input:** Uploaded image or PDF
- **Output:** Raw text + confidence score (0–100%)
- **Processing time:** Tracked in `jobs.processing_time_ms`

### Stage 2: Field Detection

After OCR, the system analyzes the raw text and pre-selects fields that appear to be present. Fields with detected patterns are marked with a green dot in the UI.

### Stage 3: Field Extraction

The extraction engine uses a hybrid approach:

1. **Regex Engine (default):** Pattern matching for each field type with confidence scoring
2. **LLM Engine (optional):** Ollama integration for improved accuracy (if available)

Each extracted field includes: key, label, value, confidence (0–100%), and extraction method.

### Stage 4: Excel Export

Generates a styled `.xlsx` workbook with:
- **Sheet 1 — Extracted Data:** Document names, field labels, and values
- **Sheet 2 — Confidence Scores:** Same layout with confidence percentages
- **Styling:** Color-coded headers, alternating row colors, auto-fit columns

---

## Supported Extraction Fields

| Key | Label | Detection Pattern |
|-----|-------|-------------------|
| `invoice_number` | Invoice Number | INV-XXXX, #XXXX, Invoice No. |
| `invoice_date` | Invoice Date | Date of issue, invoice date |
| `due_date` | Due Date | Due date, payment due |
| `total_amount` | Total Amount | Total, amount due, grand total |
| `subtotal` | Subtotal | Subtotal, sub-total |
| `tax_amount` | Tax Amount | Tax, GST, VAT, sales tax |
| `vendor_name` | Vendor Name | From, billed by, company name |
| `customer_name` | Customer Name | Bill to, ship to, customer |
| `payment_terms` | Payment Terms | NET 30, due on receipt |
| `currency` | Currency | $, €, £, USD, EUR, GBP |
| `po_number` | PO Number | PO#, purchase order |
| `address` | Address | Street, city, state, zip patterns |

---

## Configuration

### Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `BILLSCAN_SECRET_KEY` | Dev fallback | **Yes (prod)** | JWT signing key — use a random 32+ char string |
| `DATABASE_URL` | `sqlite:///./billscan.db` | No | Database connection URL |

### Application Ports

| Service | Port | Configurable In |
|---------|------|-----------------|
| Backend API | 3001 | `server/main.py` → `uvicorn.run(port=...)` |
| Frontend Dev | 5173 | Auto-assigned by Vite |
| Docker (combined) | 3001 | `docker-compose.yml` → `ports` |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| EasyOCR download slow | First-run model download (~100 MB) | Wait for download to complete |
| `ModuleNotFoundError` | Virtual env not activated | Run `venv\Scripts\activate` then `pip install -r requirements.txt` |
| Port 3001 already in use | Another process on the port | Change port in `main.py` or stop the other process |
| `.xlsx` file won't open | No spreadsheet app installed | Install LibreOffice, Excel, or WPS Office |
| Docker build fails | No internet or Docker not running | Ensure Docker Desktop is running with internet access |
| OCR returns empty text | Poor image quality or PDF without embedded text | Use clear scans at 300+ DPI; convert PDFs to images first |
| JWT token expired | Token older than 72 hours | Log out and log back in |
| CORS error in browser | Frontend URL not in allowed origins | Add URL to `allow_origins` in `main.py` |

---

## License

This project is for educational and internal use. See individual dependency licenses for third-party terms.
